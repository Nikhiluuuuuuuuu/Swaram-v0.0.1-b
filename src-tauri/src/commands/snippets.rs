use tauri::{command, AppHandle, Manager};
use std::path::PathBuf;
use crate::database::{Database, SnippetEntry};

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|e| e.to_string())
}

#[command]
pub fn get_snippets(app: AppHandle) -> Result<Vec<SnippetEntry>, String> {
    let db = get_db(&app)?;
    db.get_snippets().map_err(|e| e.to_string())
}

#[command]
pub fn add_snippet_entry(app: AppHandle, keyword: String, text: String) -> Result<i64, String> {
    let db = get_db(&app)?;
    db.add_snippet_entry(&keyword, &text).map_err(|e| e.to_string())
}

#[command]
pub fn update_snippet_entry(app: AppHandle, id: i64, keyword: String, text: String) -> Result<(), String> {
    let db = get_db(&app)?;
    db.update_snippet_entry(id, &keyword, &text).map_err(|e| e.to_string())
}

#[command]
pub fn delete_snippet_entry(app: AppHandle, id: i64) -> Result<(), String> {
    let db = get_db(&app)?;
    db.delete_snippet_entry(id).map_err(|e| e.to_string())
}
