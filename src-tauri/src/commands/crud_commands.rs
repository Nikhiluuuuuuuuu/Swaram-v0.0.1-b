use crate::database::Database;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|e| e.to_string())
}

macro_rules! impl_tauri_crud {
    (
        $get_cmd:ident,
        $add_cmd:ident,
        $update_cmd:ident,
        $delete_cmd:ident,
        $db_get:ident,
        $db_add:ident,
        $db_update:ident,
        $db_delete:ident,
        $entry_type:ident,
        $f1:ident,
        $f2:ident
    ) => {
        #[tauri::command]
        pub fn $get_cmd(
            app: tauri::AppHandle,
        ) -> Result<Vec<crate::database::$entry_type>, String> {
            let db = get_db(&app)?;
            db.$db_get().map_err(|e| e.to_string())
        }

        #[tauri::command]
        pub fn $add_cmd(app: tauri::AppHandle, $f1: String, $f2: String) -> Result<i64, String> {
            let db = get_db(&app)?;
            db.$db_add(&$f1, &$f2).map_err(|e| e.to_string())
        }

        #[tauri::command]
        pub fn $update_cmd(
            app: tauri::AppHandle,
            id: i64,
            $f1: String,
            $f2: String,
        ) -> Result<(), String> {
            let db = get_db(&app)?;
            db.$db_update(id, &$f1, &$f2).map_err(|e| e.to_string())
        }

        #[tauri::command]
        pub fn $delete_cmd(app: tauri::AppHandle, id: i64) -> Result<(), String> {
            let db = get_db(&app)?;
            db.$db_delete(id).map_err(|e| e.to_string())
        }
    };
}

impl_tauri_crud!(
    get_dictionary,
    add_dictionary_entry,
    update_dictionary_entry,
    delete_dictionary_entry,
    get_dictionary,
    add_dictionary_entry,
    update_dictionary_entry,
    delete_dictionary_entry,
    DictionaryEntry,
    word,
    replacement
);

impl_tauri_crud!(
    get_snippets,
    add_snippet_entry,
    update_snippet_entry,
    delete_snippet_entry,
    get_snippets,
    add_snippet_entry,
    update_snippet_entry,
    delete_snippet_entry,
    SnippetEntry,
    keyword,
    text
);

impl_tauri_crud!(
    get_modes,
    add_mode_entry,
    update_mode_entry,
    delete_mode_entry,
    get_modes,
    add_mode_entry,
    update_mode_entry,
    delete_mode_entry,
    ModeEntry,
    name,
    prompt
);

impl_tauri_crud!(
    get_tones,
    add_tone_entry,
    update_tone_entry,
    delete_tone_entry,
    get_tones,
    add_tone_entry,
    update_tone_entry,
    delete_tone_entry,
    ToneEntry,
    name,
    prompt
);
