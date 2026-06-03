use crate::system::dictation::{start_audio_capture, stop_audio_capture, DictationState};
use crate::system::text_inserter::insert_text;
use crate::system::transcriber::RouterState;
use std::sync::atomic::Ordering;
use tauri::{command, AppHandle, Emitter, Manager, State};

#[derive(Clone, serde::Serialize)]
struct TranscriptionResult {
    text: String,
}

const TARGET_SAMPLE_RATE: u32 = 16_000;
const MIN_VOICED_AUDIO_MS: usize = 240;
const MIN_AUDIO_RMS: f32 = 0.008;
const SAVE_RECORDINGS_CONFIG_KEY: &str = "save_recordings";

fn audio_rms(audio: &[f32]) -> f32 {
    if audio.is_empty() {
        return 0.0;
    }

    let sum_squares = audio
        .iter()
        .map(|sample| {
            let clamped = sample.clamp(-1.0, 1.0);
            clamped * clamped
        })
        .sum::<f32>();

    (sum_squares / audio.len() as f32).sqrt()
}

fn has_enough_signal(audio: &[f32]) -> bool {
    audio.len() >= (TARGET_SAMPLE_RATE as usize * MIN_VOICED_AUDIO_MS) / 1000
        && audio_rms(audio) >= MIN_AUDIO_RMS
}

fn should_save_recordings(app: &AppHandle) -> bool {
    let app_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));

    crate::database::Database::new(&app_dir)
        .and_then(|db| db.get_all_config())
        .map(|config| {
            config
                .get(SAVE_RECORDINGS_CONFIG_KEY)
                .map(|value| matches!(value.as_str(), "true" | "1" | "yes" | "on"))
                .unwrap_or(false)
        })
        .unwrap_or(false)
}

fn compact_voiced_audio(audio: &[f32]) -> Vec<f32> {
    if audio.is_empty() {
        return Vec::new();
    }

    let config = silero_vad::VadConfig::new(TARGET_SAMPLE_RATE as usize);
    let mut session = match silero_vad::VadSession::new(config) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to load Silero VAD session: {}", e);
            return audio.to_vec();
        }
    };

    let chunk_size = 512; // 32ms at 16kHz
    let mut voice_only = Vec::with_capacity(audio.len());
    
    // Configurable padding to capture trailing consonants (e.g., 15 chunks = 480ms)
    let padding_chunks = 15;
    let mut padding_countdown = 0;

    for chunk in audio.chunks(chunk_size) {
        let mut process_chunk = chunk.to_vec();
        // Pad the last chunk with zeros if it's smaller than 512
        if process_chunk.len() < chunk_size {
            process_chunk.resize(chunk_size, 0.0);
        }

        let is_speech = match session.process(&process_chunk) {
            Ok(_) => session.is_speaking(),
            Err(e) => {
                eprintln!("VAD processing error: {}", e);
                false
            }
        };

        if is_speech {
            voice_only.extend_from_slice(chunk);
            padding_countdown = padding_chunks;
        } else if padding_countdown > 0 {
            voice_only.extend_from_slice(chunk);
            padding_countdown -= 1;
        }
    }

    voice_only.shrink_to_fit();
    voice_only
}

#[command]
pub async fn start_dictation(
    app: AppHandle,
    state: State<'_, DictationState>,
) -> Result<(), String> {
    if state.is_recording.load(Ordering::SeqCst) {
        return Ok(());
    }

    let _ = app.emit("dictation-state", "loading-model");
    let app_clone = app.clone();

    let load_res = tauri::async_runtime::spawn_blocking(move || {
        let whisper_state = app_clone.state::<RouterState>();
        crate::commands::models::load_active_model(&app_clone, whisper_state.inner())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?;

    if let Err(error) = load_res {
        let _ = app.emit("dictation-state", "stopped");
        let _ = app.emit("dictation-error", &error);
        return Err(error);
    }

    let app_clone2 = app.clone();
    std::thread::spawn(move || {
        crate::system::audio_feedback::play_feedback_sound(
            &app_clone2,
            crate::system::audio_feedback::SoundType::Start,
        );
    });
    start_audio_capture(&app, state)
}

#[command]
pub async fn stop_dictation(
    app: AppHandle,
    state: State<'_, DictationState>,
) -> Result<(), String> {
    let sample_rate = *state.sample_rate.lock().unwrap();
    let audio_data = stop_audio_capture(&app, state)?;

    let app_clone3 = app.clone();
    std::thread::spawn(move || {
        crate::system::audio_feedback::play_feedback_sound(
            &app_clone3,
            crate::system::audio_feedback::SoundType::Stop,
        );
    });

    if audio_data.is_empty() {
        return Ok(());
    }

    let _ = app.emit("dictation-state", "transcribing");

    let mut resampled_audio =
        crate::system::transcriber::resample_audio(&audio_data, sample_rate, TARGET_SAMPLE_RATE);

    if !has_enough_signal(&resampled_audio) {
        eprintln!(
            "Captured audio is too quiet or too short (samples={}, rms={:.5}), skipping transcription.",
            resampled_audio.len(),
            audio_rms(&resampled_audio)
        );
        let _ = app.emit("dictation-state", "stopped");
        return Ok(());
    }

    let filtered_data = compact_voiced_audio(&resampled_audio);
    if has_enough_signal(&filtered_data) {
        resampled_audio = filtered_data;
    } else {
        eprintln!(
            "Only silence/noise detected after VAD (voiced_samples={}, rms={:.5}).",
            filtered_data.len(),
            audio_rms(&filtered_data)
        );
        let _ = app.emit("dictation-state", "stopped");
        return Ok(());
    }

    let duration_secs = resampled_audio.len() as f32 / TARGET_SAMPLE_RATE as f32;
    let should_save_audio = should_save_recordings(&app);
    let audio_for_history = should_save_audio.then(|| resampled_audio.clone());
    let app_clone = app.clone();
    let transcription_res = tauri::async_runtime::spawn_blocking(move || {
        let whisper_state = app_clone.state::<RouterState>();
        crate::system::transcriber::transcribe_audio(&resampled_audio, whisper_state.inner())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?;

    let transcription = transcription_res.map_err(|error| {
        eprintln!("Transcription error: {}", error);
        let _ = app.emit("dictation-state", "stopped");
        let _ = app.emit("dictation-error", &error);
        error
    })?;

    if !transcription.is_empty() {
        let app_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."));

        let mut final_transcription = transcription.clone();

        // LLM Post-Processing (Tones & Modes)
        if let Ok(db) = crate::database::Database::new(&app_dir) {
            if let Ok(config) = db.get_all_config() {
                let active_mode_id = config.get("active_mode").and_then(|id| id.parse::<i64>().ok());
                let active_tone_id = config.get("active_tone").and_then(|id| id.parse::<i64>().ok());
                let llm_api_key = config.get("llm_api_key").cloned().unwrap_or_default();
                let llm_provider = config.get("llm_provider").cloned().unwrap_or_else(|| "openai".to_string());
                let llm_model = config.get("llm_model").cloned().unwrap_or_else(|| "gpt-4o".to_string());
                let llm_base_url = config.get("llm_base_url").cloned().unwrap_or_else(|| "https://api.openai.com/v1".to_string());

                if !llm_api_key.is_empty() && (active_mode_id.is_some() || active_tone_id.is_some()) {
                    let mut system_prompt = String::new();
                    if let Some(id) = active_mode_id {
                        if let Ok(modes) = db.get_modes() {
                            if let Some(mode) = modes.into_iter().find(|m| m.id == id) {
                                system_prompt.push_str(&format!("Apply this mode to the text: {}\n", mode.prompt));
                            }
                        }
                    }
                    if let Some(id) = active_tone_id {
                        if let Ok(tones) = db.get_tones() {
                            if let Some(tone) = tones.into_iter().find(|t| t.id == id) {
                                system_prompt.push_str(&format!("Apply this tone to the text: {}\n", tone.prompt));
                            }
                        }
                    }

                    if !system_prompt.is_empty() {
                        let provider = crate::system::llm_post_process::PostProcessProvider {
                            id: llm_provider,
                            base_url: llm_base_url,
                        };
                        
                        if crate::system::llm_post_process::is_llm_available(&provider, &llm_api_key).await {
                            match crate::system::llm_post_process::send_chat_completion_with_schema(
                                &provider,
                                llm_api_key,
                                &llm_model,
                                final_transcription.clone(),
                                Some(system_prompt),
                                None,
                                None,
                                None
                            ).await {
                                Ok(Some(processed_text)) => {
                                    final_transcription = processed_text;
                                }
                                Ok(None) => {}
                                Err(e) => {
                                    eprintln!("LLM Post-processing failed: {}", e);
                                }
                            }
                        } else {
                            eprintln!("LLM provider is not available, skipping post-processing to avoid delay.");
                        }
                    }
                }
            }
        }

        let _ = app.emit(
            "transcription-result",
            TranscriptionResult {
                text: final_transcription.clone(),
            },
        );
        if let Err(e) = insert_text(&final_transcription, &app) {
            eprintln!("Failed to insert text: {}", e);
            let _ = app.emit("dictation-error", format!("Failed to insert text: {}", e));
        }


        let app_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."));

        let timestamp_sec = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs().to_string())
            .unwrap_or_else(|_| "0".to_string());

        let wav_path = audio_for_history.as_ref().and_then(|audio| {
            let recordings_dir = app_dir.join("recordings");
            if std::fs::create_dir_all(&recordings_dir).is_err() {
                return None;
            }

            let path = recordings_dir.join(format!("{}.wav", timestamp_sec));
            let spec = hound::WavSpec {
                channels: 1,
                sample_rate: TARGET_SAMPLE_RATE,
                bits_per_sample: 32,
                sample_format: hound::SampleFormat::Float,
            };

            let mut writer = hound::WavWriter::create(&path, spec).ok()?;
            for &sample in audio {
                writer.write_sample(sample).ok()?;
            }
            writer.finalize().ok()?;
            Some(path.to_string_lossy().to_string())
        });

        let minutes = (duration_secs / 60.0).floor() as i32;
        let seconds = (duration_secs % 60.0) as i32;
        let duration_str = format!("{}:{:02}", minutes, seconds);

        if let Ok(db) = crate::database::Database::new(&app_dir) {
            if let Err(e) = db.add_history_entry(
                &final_transcription,
                &timestamp_sec,
                Some(&duration_str),
                None,
                wav_path.as_deref(),
                None,
            ) {
                eprintln!("[Dictation] Failed to save history: {}", e);
            }
        }
    }
    let _ = app.emit("dictation-state", "stopped");

    Ok(())
}

#[command]
pub async fn cancel_dictation(
    app: AppHandle,
    state: State<'_, DictationState>,
) -> Result<(), String> {
    if !state.is_recording.load(Ordering::SeqCst) {
        let _ = app.emit("dictation-state", "stopped");
        return Ok(());
    }

    let _ = stop_audio_capture(&app, state)?;
    let app_clone4 = app.clone();
    std::thread::spawn(move || {
        crate::system::audio_feedback::play_feedback_sound(
            &app_clone4,
            crate::system::audio_feedback::SoundType::Stop,
        );
    });
    let _ = app.emit("dictation-state", "stopped");
    Ok(())
}

#[command]
pub async fn toggle_dictation(
    app: AppHandle,
    state: State<'_, DictationState>,
) -> Result<(), String> {
    if state.is_recording.load(Ordering::SeqCst) {
        stop_dictation(app.clone(), app.state::<DictationState>()).await
    } else {
        start_dictation(app.clone(), app.state::<DictationState>()).await
    }
}

#[cfg(test)]
mod tests {
    use super::{audio_rms, has_enough_signal, TARGET_SAMPLE_RATE};

    #[test]
    fn rejects_short_audio() {
        let audio = vec![0.5; 100];
        assert!(!has_enough_signal(&audio));
    }

    #[test]
    fn rejects_quiet_audio() {
        let audio = vec![0.001; TARGET_SAMPLE_RATE as usize];
        assert!(!has_enough_signal(&audio));
    }

    #[test]
    fn accepts_sustained_signal() {
        let audio = vec![0.05; TARGET_SAMPLE_RATE as usize];
        assert!(audio_rms(&audio) > 0.0);
        assert!(has_enough_signal(&audio));
    }
}
