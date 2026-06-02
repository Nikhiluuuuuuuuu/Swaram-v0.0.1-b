use super::ModelArchitecture;
use std::time::Instant;

pub trait TranscriberEngine: Send + Sync {
    fn load_model(&mut self, model_path: &str) -> Result<(), String>;
    fn transcribe(&mut self, audio_data: &[f32]) -> Result<String, String>;
    fn unload(&mut self);
    fn last_used(&self) -> Instant;
    fn id(&self) -> &str;
    fn architecture(&self) -> ModelArchitecture;
}
