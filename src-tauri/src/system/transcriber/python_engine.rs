use super::engine::TranscriberEngine;
use super::ModelArchitecture;
use std::path::Path;
use std::time::Instant;

pub struct PythonEngine {
    id: String,
    last_used: Instant,
}

impl PythonEngine {
    pub fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            last_used: Instant::now(),
        }
    }
}

impl TranscriberEngine for PythonEngine {
    fn load_model(&mut self, model_path: &str) -> Result<(), String> {
        self.last_used = Instant::now();
        let path = Path::new(model_path);
        if !path.exists() {
            return Err(format!(
                "Transformers model path does not exist: {}",
                path.display()
            ));
        }
        Err("Transformers/Python transcription runtime is not packaged in this build. Add a sidecar runtime before selecting Transformers models.".to_string())
    }

    fn transcribe(&mut self, _audio_data: &[f32]) -> Result<String, String> {
        self.last_used = Instant::now();
        Err("Transformers/Python transcription is unavailable in this build.".to_string())
    }

    fn unload(&mut self) {
        println!("Unloading Python Transformers model");
        // Kill python sidecar process if running
    }

    fn last_used(&self) -> Instant {
        self.last_used
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn architecture(&self) -> ModelArchitecture {
        ModelArchitecture::PythonTransformers
    }
}
