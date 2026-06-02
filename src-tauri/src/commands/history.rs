use crate::database::{Database, HistoryEntry};
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|e| e.to_string())
}

#[command]
pub fn get_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let db = get_db(&app)?;
    db.get_history().map_err(|e| e.to_string())
}

#[command]
pub fn add_history(
    app: AppHandle,
    text: String,
    timestamp: String,
    duration: Option<String>,
    failed: Option<bool>,
    audio_path: Option<String>,
    model: Option<String>,
) -> Result<i64, String> {
    let db = get_db(&app)?;
    db.add_history_entry(
        &text,
        &timestamp,
        duration.as_deref(),
        failed,
        audio_path.as_deref(),
        model.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[command]
pub fn delete_history_item(app: AppHandle, id: i64) -> Result<(), String> {
    let db = get_db(&app)?;
    db.delete_history_entry(id).map_err(|e| e.to_string())
}

#[command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    let db = get_db(&app)?;
    db.clear_history().map_err(|e| e.to_string())
}

#[command]
pub fn extract_history_audio(app: AppHandle, id: i64) -> Result<(), String> {
    let db = get_db(&app)?;
    let history = db.get_history().map_err(|e| e.to_string())?;
    let entry = history
        .into_iter()
        .find(|e| e.id == id)
        .ok_or("Not found")?;

    if let Some(audio_path) = entry.audio_path {
        let path = std::path::PathBuf::from(audio_path);
        if !path.exists() {
            return Err("Audio file not found on disk".into());
        }

        // Show save dialog using rfd
        if let Some(dest) = rfd::FileDialog::new()
            .set_title("Extract Audio")
            .set_file_name("dictation.wav")
            .add_filter("WAV audio", &["wav"])
            .save_file()
        {
            std::fs::copy(path, dest).map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err("No audio saved for this entry".into())
    }
}
