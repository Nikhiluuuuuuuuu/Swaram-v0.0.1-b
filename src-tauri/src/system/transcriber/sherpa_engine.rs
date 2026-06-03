use super::engine::TranscriberEngine;
use super::ModelArchitecture;
use std::path::Path;
use std::time::Instant;

pub struct SherpaEngine {
    id: String,
    last_used: Instant,
    model_path: String,
}

impl SherpaEngine {
    pub fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            last_used: Instant::now(),
            model_path: String::new(),
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
        self.model_path = model_path.to_string();
        Ok(())
    }

    fn transcribe(&mut self, audio_data: &[f32]) -> Result<String, String> {
        self.last_used = Instant::now();
        
        let temp_dir = std::env::temp_dir();
        let audio_path = temp_dir.join(format!("sherpa_input_{}.wav", std::process::id()));
        
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        
        let mut writer = hound::WavWriter::create(&audio_path, spec)
            .map_err(|e| format!("Failed to create wav: {}", e))?;
            
        for &sample in audio_data {
            writer.write_sample(sample).unwrap();
        }
        writer.finalize().unwrap();

        let output = std::process::Command::new("sherpa-onnx")
            .arg(format!("--model={}", self.model_path))
            .arg(audio_path.to_string_lossy().to_string())
            .output();

        let _ = std::fs::remove_file(&audio_path);

        match output {
            Ok(output) => {
                if output.status.success() {
                    let text = String::from_utf8_lossy(&output.stdout).to_string();
                    Ok(text.trim().to_string())
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    Err(format!("Sherpa inference failed: {}", error))
                }
            }
            Err(_) => {
                Err("Sherpa-ONNX sidecar executable not found in PATH. Please install sherpa-onnx to use Parakeet models.".to_string())
            }
        }
    }

    fn unload(&mut self) {
        println!("Unloading Sherpa-ONNX model");
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
