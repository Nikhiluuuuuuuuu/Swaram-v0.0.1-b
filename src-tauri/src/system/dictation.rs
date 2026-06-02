use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct DictationState {
    pub is_recording: Arc<AtomicBool>,
    pub audio_data: Arc<Mutex<Vec<f32>>>,
    // Store the stream so it doesn't get dropped
    pub stream: Mutex<Option<cpal::Stream>>,
    pub sample_rate: Arc<Mutex<u32>>,
    pub selected_device: Mutex<Option<String>>,
}

impl Default for DictationState {
    fn default() -> Self {
        Self {
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_data: Arc::new(Mutex::new(Vec::new())),
            stream: Mutex::new(None),
            sample_rate: Arc::new(Mutex::new(16000)),
            selected_device: Mutex::new(None),
        }
    }
}

fn process_audio_chunk<T>(
    data: &[T],
    channels: u16,
    is_recording: &AtomicBool,
    audio_data: &Mutex<Vec<f32>>,
    sample_count: &mut u32,
    max_vol: &mut f32,
    emit_threshold: u32,
    app: &AppHandle,
    converter: impl Fn(&T) -> f32,
) {
    if is_recording.load(Ordering::SeqCst) {
        let mut buf = audio_data.lock().unwrap();
        for chunk in data.chunks(channels as usize) {
            let sum: f32 = chunk.iter().map(&converter).sum();
            let sample = sum / channels as f32;
            buf.push(sample);

            *max_vol = max_vol.max(sample.abs());
            *sample_count += 1;
            if *sample_count >= emit_threshold {
                #[derive(serde::Serialize, Clone)]
                struct AudioLevel {
                    level: f32,
                }
                let _ = app.emit("audio-level", AudioLevel { level: *max_vol });
                *sample_count = 0;
                *max_vol = 0.0;
            }
        }
    }
}

pub fn start_audio_capture(
    app: &AppHandle,
    state: tauri::State<'_, DictationState>,
) -> Result<(), String> {
    if state.is_recording.load(Ordering::SeqCst) {
        return Ok(());
    }

    let host = cpal::default_host();
    let selected_name = state.selected_device.lock().unwrap().clone();
    let device = match selected_name {
        Some(ref name) => host
            .input_devices()
            .map_err(|e| e.to_string())?
            .find(|d| {
                #[allow(deprecated)]
                let d_name = d.name();
                d_name.ok().as_deref() == Some(name.as_str())
            })
            .or_else(|| host.default_input_device())
            .ok_or("No input device found")?,
        None => host.default_input_device().ok_or("No input device found")?,
    };
    let config = device.default_input_config().map_err(|e| e.to_string())?;

    let is_recording = state.is_recording.clone();
    let audio_data = state.audio_data.clone();

    *state.sample_rate.lock().unwrap() = config.sample_rate();

    state.audio_data.lock().unwrap().clear();
    is_recording.store(true, Ordering::SeqCst);
    let _ = app.emit("dictation-state", "recording");

    let err_fn = move |err| {
        eprintln!("an error occurred on stream: {}", err);
    };

    let channels = config.channels();
    let app_clone = app.clone();
    let emit_threshold = config.sample_rate() / 20;

    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            let mut sample_count = 0;
            let mut max_vol: f32 = 0.0;
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    process_audio_chunk(
                        data,
                        channels,
                        &is_recording,
                        &audio_data,
                        &mut sample_count,
                        &mut max_vol,
                        emit_threshold,
                        &app_clone,
                        |&s| s,
                    );
                },
                err_fn,
                None,
            )
        }
        cpal::SampleFormat::I16 => {
            let mut sample_count = 0;
            let mut max_vol: f32 = 0.0;
            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &_| {
                    process_audio_chunk(
                        data,
                        channels,
                        &is_recording,
                        &audio_data,
                        &mut sample_count,
                        &mut max_vol,
                        emit_threshold,
                        &app_clone,
                        |&s| s as f32 / i16::MAX as f32,
                    );
                },
                err_fn,
                None,
            )
        }
        _ => return Err("Unsupported sample format".to_string()),
    }
    .map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;

    *state.stream.lock().unwrap() = Some(stream);

    Ok(())
}

pub fn stop_audio_capture(
    app: &AppHandle,
    state: tauri::State<'_, DictationState>,
) -> Result<Vec<f32>, String> {
    if !state.is_recording.load(Ordering::SeqCst) {
        return Err("Not recording".to_string());
    }

    state.is_recording.store(false, Ordering::SeqCst);
    let _ = app.emit("dictation-state", "stopped");

    if let Some(stream) = state.stream.lock().unwrap().take() {
        let _ = stream.pause();
    }

    let mut data = {
        let mut guard = state.audio_data.lock().unwrap();
        std::mem::take(&mut *guard)
    };

    if data.is_empty() {
        return Ok(data);
    }

    // Avoid turning quiet room noise into loud "speech" before VAD/Whisper.
    let mut max_abs = 0.0_f32;
    for &sample in &data {
        if sample.abs() > max_abs {
            max_abs = sample.abs();
        }
    }

    if max_abs > 0.02 && max_abs < 0.95 {
        let gain = 0.95 / max_abs;
        for sample in &mut data {
            *sample *= gain;
        }
    }

    Ok(data)
}

pub fn set_selected_device(state: &DictationState, name: Option<String>) {
    *state.selected_device.lock().unwrap() = name;
}
