use std::path::PathBuf;
use std::thread;
use tauri::{AppHandle, Manager};

pub enum SoundType {
    Start,
    Stop,
}

fn get_sound_path(app: &AppHandle, sound_type: SoundType) -> PathBuf {
    let base_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    // Default to marimba
    let filename = match sound_type {
        SoundType::Start => "marimba_start.wav",
        SoundType::Stop => "marimba_stop.wav",
    };

    base_dir.join("resources").join(filename)
}

pub fn play_feedback_sound(app: &AppHandle, sound_type: SoundType) {
    let mut audio_feedback = true;
    let mut volume = 1.0;

    if let Ok(db) = crate::database::Database::new(&app.path().app_data_dir().unwrap_or_default()) {
        if let Ok(config) = db.get_all_config() {
            if let Some(af) = config.get("audio_feedback") {
                audio_feedback = af == "true";
            }
            if let Some(vol) = config.get("audio_feedback_volume") {
                volume = vol.parse::<f32>().unwrap_or(1.0);
            }
        }
    }

    if !audio_feedback {
        return;
    }

    let path = get_sound_path(app, sound_type);
    play_sound_async(path, volume);
}

fn play_sound_async(path: PathBuf, volume: f32) {
    thread::spawn(move || {
        if let Err(e) = play_audio_file(&path, volume) {
            eprintln!("Failed to play sound '{}': {}", path.display(), e);
        }
    });
}

fn play_audio_file(path: &std::path::Path, _volume: f32) -> Result<(), Box<dyn std::error::Error>> {
    let path_str = path.to_str().unwrap_or_default();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("powershell")
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .arg("-c")
            .arg(format!(
                "(New-Object Media.SoundPlayer '{}').PlaySync()",
                path_str
            ))
            .output();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("afplay")
            .arg("-v")
            .arg(_volume.to_string())
            .arg(path_str)
            .output();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("paplay")
            .arg(format!("--volume={}", (_volume * 65536.0) as u32))
            .arg(path_str)
            .output();
    }

    Ok(())
}
