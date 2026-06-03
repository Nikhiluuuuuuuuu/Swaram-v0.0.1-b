use super::engine::TranscriberEngine;
use super::ModelArchitecture;
use std::sync::Once;
use std::time::Instant;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

static WHISPER_LOG_HOOK: Once = Once::new();

pub struct WhisperEngine {
    id: String,
    last_used: Instant,
    context: Option<WhisperContext>,
}

impl WhisperEngine {
    pub fn new(id: &str) -> Self {
        WHISPER_LOG_HOOK.call_once(whisper_rs::install_logging_hooks);

        Self {
            id: id.to_string(),
            last_used: Instant::now(),
            context: None,
        }
    }
}

impl TranscriberEngine for WhisperEngine {
    fn load_model(&mut self, model_path: &str) -> Result<(), String> {
        self.last_used = Instant::now();

        let path = std::path::Path::new(model_path);
        if !path.is_file() {
            return Err(format!("Model file does not exist: {}", path.display()));
        }

        // Verify magic bytes
        let mut file =
            std::fs::File::open(path).map_err(|e| format!("Failed to open model file: {}", e))?;
        let mut magic = [0u8; 4];
        use std::io::Read;
        if file.read_exact(&mut magic).is_ok() && &magic == b"GGUF" {
            return Err(
                "Unsupported model format: GGUF. Only GGML (.bin) models are supported."
                    .to_string(),
            );
        }

        let context =
            WhisperContext::new_with_params(model_path, WhisperContextParameters::default())
                .map_err(|e| format!("Failed to load whisper context: {}", e))?;

        self.context = Some(context);
        Ok(())
    }

    fn transcribe(&mut self, audio_data: &[f32]) -> Result<String, String> {
        self.last_used = Instant::now();

        let context = self.context.as_mut().ok_or("Whisper model not loaded")?;

        let mut state = context
            .create_state()
            .map_err(|e| format!("Failed to create state: {}", e))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("en"));
        params.set_print_progress(false);
        params.set_print_special(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_no_context(true);
        params.set_single_segment(true);
        params.set_suppress_blank(true);
        params.set_suppress_nst(true);
        params.set_temperature(0.0);
        params.set_temperature_inc(0.0);

        params.set_entropy_thold(2.4);
        params.set_logprob_thold(-0.75);
        params.set_no_speech_thold(0.45);

        state
            .full(params, audio_data)
            .map_err(|e| format!("Transcription failed: {}", e))?;

        let num_segments = state.full_n_segments();
        let mut transcription = String::new();

        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                match segment.to_str_lossy() {
                    Ok(text) => {
                        transcription.push_str(&text);
                    }
                    Err(e) => eprintln!("Failed to decode segment: {}", e),
                }
            }
        }

        let cleaned = transcription.trim().to_string();

        Ok(cleaned)
    }

    fn unload(&mut self) {
        self.context = None;
    }

    fn last_used(&self) -> Instant {
        self.last_used
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn architecture(&self) -> ModelArchitecture {
        ModelArchitecture::WhisperGgml
    }
}

