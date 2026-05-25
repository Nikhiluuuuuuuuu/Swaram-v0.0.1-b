use tauri::{command, AppHandle, Manager};
use std::path::PathBuf;
use crate::database::{Database, ToneEntry};

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|e| e.to_string())
}

#[command]
pub fn get_tones(app: AppHandle) -> Result<Vec<ToneEntry>, String> {
    let db = get_db(&app)?;
    db.get_tones().map_err(|e| e.to_string())
}

#[command]
pub fn add_tone_entry(app: AppHandle, name: String, prompt: String) -> Result<i64, String> {
    let db = get_db(&app)?;
    db.add_tone_entry(&name, &prompt).map_err(|e| e.to_string())
}

#[command]
pub fn update_tone_entry(app: AppHandle, id: i64, name: String, prompt: String) -> Result<(), String> {
    let db = get_db(&app)?;
    db.update_tone_entry(id, &name, &prompt).map_err(|e| e.to_string())
}

#[command]
pub fn delete_tone_entry(app: AppHandle, id: i64) -> Result<(), String> {
    let db = get_db(&app)?;
    db.delete_tone_entry(id).map_err(|e| e.to_string())
}
