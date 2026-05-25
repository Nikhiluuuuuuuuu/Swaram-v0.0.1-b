use serde::Serialize;
use sysinfo::System;

#[derive(Serialize, Debug)]
pub struct SystemSpecs {
    pub ram_gb: f64,
    pub cpu_cores: usize,
    pub gpu_name: String,
}

#[tauri::command]
pub async fn get_system_specs() -> Result<SystemSpecs, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let total_ram_bytes = sys.total_memory();
    let ram_gb = total_ram_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let cpu_cores = sys.cpus().len();
    
    // Quick async fetch of default GPU via wgpu
    let instance = wgpu::Instance::default();
    let gpu_name = match instance.request_adapter(&wgpu::RequestAdapterOptions::default()).await {
        Some(adapter) => adapter.get_info().name,
        None => "Unknown".to_string(),
    };

    Ok(SystemSpecs {
        ram_gb,
        cpu_cores,
        gpu_name,
    })
}
