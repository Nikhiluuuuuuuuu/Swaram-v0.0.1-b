use tauri::{command, AppHandle, Manager};
use std::collections::HashMap;
use std::path::PathBuf;
use crate::database::Database;

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|e| e.to_string())
}

#[command]
pub fn save_config(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let db = get_db(&app)?;
    db.save_config(&key, &value).map_err(|e| e.to_string())
}

#[command]
pub fn load_config(app: AppHandle, key: String) -> Result<String, String> {
    let db = get_db(&app)?;
    let all = db.get_all_config().map_err(|e| e.to_string())?;
    Ok(all.get(&key).cloned().unwrap_or_default())
}

#[command]
pub fn get_all_config(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let db = get_db(&app)?;
    db.get_all_config().map_err(|e| e.to_string())
}
