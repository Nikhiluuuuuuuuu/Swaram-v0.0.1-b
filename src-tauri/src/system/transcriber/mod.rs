pub mod engine;
pub mod python_engine;
pub mod sherpa_engine;
pub mod whisper_engine;

use engine::TranscriberEngine;
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ModelArchitecture {
    WhisperGgml,
    SherpaOnnx,
    PythonTransformers,
}

impl ModelArchitecture {
    pub fn from_hint(hint: &str) -> Option<Self> {
        let hint = hint.to_ascii_lowercase();
        if hint.contains("ggml") || hint.ends_with(".bin") {
            Some(Self::WhisperGgml)
        } else if hint.contains("sherpa") || hint.ends_with(".onnx") {
            Some(Self::SherpaOnnx)
        } else if hint.contains("transformers")
            || hint.contains("pytorch")
            || hint.ends_with(".safetensors")
            || hint.ends_with(".pt")
            || hint.ends_with(".pth")
        {
            Some(Self::PythonTransformers)
        } else {
            None
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::WhisperGgml => "whisper",
            Self::SherpaOnnx => "sherpa",
            Self::PythonTransformers => "transformers",
        }
    }
}

#[derive(Clone)]
pub struct RouterState {
    pub active_engine: Arc<Mutex<Option<Box<dyn TranscriberEngine>>>>,
}

impl Default for RouterState {
    fn default() -> Self {
        Self {
            active_engine: Arc::new(Mutex::new(None)),
        }
    }
}

pub fn load_model(
    state: &RouterState,
    model_id: &str,
    model_path: &str,
    arch: ModelArchitecture,
) -> Result<(), String> {
    if model_id.trim().is_empty() {
        return Err("Model name cannot be empty".to_string());
    }
    if model_path.trim().is_empty() {
        return Err("Model local path is empty".to_string());
    }
    if !Path::new(model_path).exists() {
        return Err(format!("Model path does not exist: {}", model_path));
    }

    let mut guard = state
        .active_engine
        .lock()
        .map_err(|_| "Router state lock is poisoned".to_string())?;

    if let Some(engine) = guard.as_ref() {
        if engine.id() == model_id && engine.architecture() == arch {
            return Ok(());
        }
    }

    let mut new_engine: Box<dyn TranscriberEngine> = match arch {
        ModelArchitecture::WhisperGgml => Box::new(whisper_engine::WhisperEngine::new(model_id)),
        ModelArchitecture::SherpaOnnx => Box::new(sherpa_engine::SherpaEngine::new(model_id)),
        ModelArchitecture::PythonTransformers => {
            Box::new(python_engine::PythonEngine::new(model_id))
        }
    };

    new_engine.load_model(model_path)?;
    *guard = Some(new_engine);

    Ok(())
}

pub fn resample_audio(
    audio_data: &[f32],
    original_sample_rate: u32,
    target_sample_rate: u32,
) -> Vec<f32> {
    if original_sample_rate == target_sample_rate || audio_data.is_empty() {
        return audio_data.to_vec();
    }

    if original_sample_rate == 0 || target_sample_rate == 0 {
        return audio_data.to_vec();
    }

    let ratio = target_sample_rate as f64 / original_sample_rate as f64;
    let output_len = ((audio_data.len() as f64) * ratio).round().max(1.0) as usize;
    let step = original_sample_rate as f64 / target_sample_rate as f64;
    let mut output = Vec::with_capacity(output_len);

    for out_idx in 0..output_len {
        let src_pos = out_idx as f64 * step;
        let src_idx = src_pos.floor() as usize;
        let frac = (src_pos - src_idx as f64) as f32;
        let a = audio_data.get(src_idx).copied().unwrap_or(0.0);
        let b = audio_data.get(src_idx + 1).copied().unwrap_or(a);
        output.push(a + (b - a) * frac);
    }

    output
}

pub fn transcribe_audio(audio_data: &[f32], state: &RouterState) -> Result<String, String> {
    let mut guard = state
        .active_engine
        .lock()
        .map_err(|_| "Router state lock is poisoned".to_string())?;

    let engine = guard.as_mut().ok_or("No model loaded")?;
    engine.transcribe(audio_data)
}

pub fn start_unload_tracker(state: tauri::State<'_, RouterState>) {
    let state_arc = state.active_engine.clone();

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(60));

            let mut guard = match state_arc.lock() {
                Ok(g) => g,
                Err(_) => continue,
            };

            let should_unload = if let Some(engine) = guard.as_ref() {
                engine.last_used().elapsed().as_secs() > 5 * 60 // 5 minutes
            } else {
                false
            };

            if should_unload {
                println!("Unloading model due to inactivity");
                if let Some(mut engine) = guard.take() {
                    engine.unload();
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resample_returns_input_for_matching_rates() {
        let audio = vec![0.0, 0.5, -0.25];
        assert_eq!(resample_audio(&audio, 16000, 16000), audio);
    }

    #[test]
    fn resample_uses_target_rate_length() {
        let audio = vec![0.0; 48000];
        assert_eq!(resample_audio(&audio, 48000, 16000).len(), 16000);
    }

    #[test]
    fn detects_architecture_from_hints() {
        assert_eq!(
            ModelArchitecture::from_hint("ggml-base.bin"),
            Some(ModelArchitecture::WhisperGgml)
        );
        assert_eq!(
            ModelArchitecture::from_hint("encoder.onnx"),
            Some(ModelArchitecture::SherpaOnnx)
        );
        assert_eq!(
            ModelArchitecture::from_hint("model.safetensors"),
            Some(ModelArchitecture::PythonTransformers)
        );
    }
}
