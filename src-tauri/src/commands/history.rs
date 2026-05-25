use tauri::{command, AppHandle, Manager};
use crate::database::{Database, HistoryEntry};
use std::path::PathBuf;

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
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
    model: Option<String>
) -> Result<i64, String> {
    let db = get_db(&app)?;
    db.add_history_entry(
        &text, 
        &timestamp, 
        duration.as_deref(), 
        failed, 
        audio_path.as_deref(),
        model.as_deref()
    ).map_err(|e| e.to_string())
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
