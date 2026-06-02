use super::engine::TranscriberEngine;
use super::ModelArchitecture;
use std::path::Path;
use std::time::Instant;

pub struct SherpaEngine {
    id: String,
    last_used: Instant,
}

impl SherpaEngine {
    pub fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            last_used: Instant::now(),
        }
    }
}

impl TranscriberEngine for SherpaEngine {
    fn load_model(&mut self, model_path: &str) -> Result<(), String> {
        self.last_used = Instant::now();
        let path = Path::new(model_path);
        if !path.exists() {
            return Err(format!(
                "Sherpa-ONNX model path does not exist: {}",
                path.display()
            ));
        }
        if path.is_file() && path.extension().and_then(|ext| ext.to_str()) != Some("onnx") {
            return Err(format!(
                "Sherpa-ONNX requires an .onnx model file or model directory, got: {}",
                path.display()
            ));
        }
        Err("Sherpa-ONNX runtime is not linked in this build. Install/link sherpa-rs or sherpa-onnx before selecting ONNX models.".to_string())
    }

    fn transcribe(&mut self, _audio_data: &[f32]) -> Result<String, String> {
        self.last_used = Instant::now();
        Err("Sherpa-ONNX transcription is unavailable in this build.".to_string())
    }

    fn unload(&mut self) {
        println!("Unloading Sherpa-ONNX model");
        // Drop the Sherpa context
    }

    fn last_used(&self) -> Instant {
        self.last_used
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn architecture(&self) -> ModelArchitecture {
        ModelArchitecture::SherpaOnnx
    }
}
