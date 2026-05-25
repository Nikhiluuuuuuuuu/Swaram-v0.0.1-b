use tauri::{command, AppHandle, Manager};
use std::path::PathBuf;
use crate::database::{Database, DictionaryEntry};

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|e| e.to_string())
}

#[command]
pub fn get_dictionary(app: AppHandle) -> Result<Vec<DictionaryEntry>, String> {
    let db = get_db(&app)?;
    db.get_dictionary().map_err(|e| e.to_string())
}

#[command]
pub fn add_dictionary_entry(
    app: AppHandle,
    word: String,
    replacement: String,
) -> Result<i64, String> {
    let db = get_db(&app)?;
    db.add_dictionary_entry(&word, &replacement).map_err(|e| e.to_string())
}

#[command]
pub fn update_dictionary_entry(
    app: AppHandle,
    id: i64,
    word: String,
    replacement: String,
) -> Result<(), String> {
    let db = get_db(&app)?;
    db.update_dictionary_entry(id, &word, &replacement).map_err(|e| e.to_string())
}

#[command]
pub fn delete_dictionary_entry(app: AppHandle, id: i64) -> Result<(), String> {
    let db = get_db(&app)?;
    db.delete_dictionary_entry(id).map_err(|e| e.to_string())
}
