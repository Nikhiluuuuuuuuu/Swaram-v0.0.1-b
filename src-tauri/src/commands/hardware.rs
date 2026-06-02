use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Serialize, Deserialize, Debug)]
pub struct HardwareOptions {
    whisper_acceleration: Vec<String>,
    onnx_acceleration: Vec<String>,
}

#[command]
pub async fn get_hardware_options() -> Result<HardwareOptions, String> {
    let mut whisper_acceleration = vec!["Auto".to_string()];
    let onnx_acceleration = vec![
        "Auto".to_string(),
        "CPU".to_string(),
        "DirectML".to_string(),
    ];

    // Create wgpu instance to detect hardware GPUs
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::all(),
        ..Default::default()
    });

    // Use request_adapter as a fallback since enumerate_adapters may not be available
    if let Some(adapter) = instance
        .request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            ..Default::default()
        })
        .await
    {
        let info = adapter.get_info();
        if !whisper_acceleration.contains(&info.name) {
            whisper_acceleration.push(info.name);
        }
    }

    whisper_acceleration.push("CPU".to_string());

    Ok(HardwareOptions {
        whisper_acceleration,
        onnx_acceleration,
    })
}
