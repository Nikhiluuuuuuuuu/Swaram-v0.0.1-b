use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct HardwareOptions {
    whisper_acceleration: Vec<String>,
    onnx_acceleration: Vec<String>,
}

#[command]
pub async fn get_hardware_options() -> Result<HardwareOptions, String> {
    let mut whisper_acceleration = vec!["Auto".to_string()];
    let onnx_acceleration = vec!["Auto".to_string(), "CPU".to_string(), "DirectML".to_string()];
    
    // Create wgpu instance to detect hardware GPUs
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::all(),
        ..Default::default()
    });
    
    let mut gpus = Vec::new();
    for adapter in instance.enumerate_adapters(wgpu::Backends::all()) {
        let info = adapter.get_info();
        if !gpus.contains(&info.name) {
            gpus.push(info.name);
        }
    }
    
    for gpu in gpus {
        whisper_acceleration.push(gpu);
    }
    whisper_acceleration.push("CPU".to_string());
    
    Ok(HardwareOptions {
        whisper_acceleration,
        onnx_acceleration,
    })
}
