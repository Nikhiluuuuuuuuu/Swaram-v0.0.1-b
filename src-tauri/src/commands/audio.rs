use tauri::command;
use cpal::traits::{DeviceTrait, HostTrait};

#[command]
pub fn get_microphones() -> Vec<String> {
    let host = cpal::default_host();
    let mut mics = Vec::new();
    let mut seen = std::collections::HashSet::new();
    
    if let Ok(devices) = host.input_devices() {
        for device in devices {
            let mut name = String::new();
            
            // Try to use name() first as recommended by cpal
            #[allow(deprecated)]
            if let Ok(desc) = device.name() {
                name = desc;
            } else if let Ok(n) = device.name() {
                name = n;
            }

            if name.trim().is_empty() {
                name = "Unknown Microphone".to_string();
            }

            if seen.insert(name.clone()) {
                mics.push(name);
            }
        }
    }
    
    if mics.is_empty() {
        mics.push("Default Microphone".to_string());
    }
    
    mics
}

#[command]
pub fn set_microphone(mic_name: String) -> Result<(), String> {
    println!("Selected microphone: {}", mic_name);
    Ok(())
}

#[command]
pub fn set_volume(volume: u32) -> Result<(), String> {
    println!("Set volume to: {}", volume);
    Ok(())
}
