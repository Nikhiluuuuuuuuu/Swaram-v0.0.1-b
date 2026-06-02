use rusqlite::{Connection, Result};
use std::fs;

pub struct Database {
    conn: Connection,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ModelRecord {
    pub id: String,
    pub name: String,
    pub status: String, // "installed", "downloading", "failed"
    pub local_path: Option<String>,
    pub architecture: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct HistoryEntry {
    pub id: i64,
    pub text: String,
    pub timestamp: String,
    pub duration: Option<String>,
    pub failed: Option<bool>,
    pub audio_path: Option<String>,
    pub model: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DictionaryEntry {
    pub id: i64,
    pub word: String,
    pub replacement: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct SnippetEntry {
    pub id: i64,
    pub keyword: String,
    pub text: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ModeEntry {
    pub id: i64,
    pub name: String,
    pub prompt: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ToneEntry {
    pub id: i64,
    pub name: String,
    pub prompt: String,
}

impl Database {
    pub fn new(app_dir: &std::path::Path) -> Result<Self> {
        let db_dir = app_dir.join("database");
        if !db_dir.exists() {
            fs::create_dir_all(&db_dir).expect("Failed to create database directory");
        }

        let db_path = db_dir.join("swaram.db");
        let conn = Connection::open(db_path)?;

        Ok(Database { conn })
    }

    pub fn init(&self) -> Result<()> {
        // Initialize schema
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                local_path TEXT,
                architecture TEXT
            )",
            (),
        )?;
        let _ = self
            .conn
            .execute("ALTER TABLE models ADD COLUMN architecture TEXT", ());

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                duration TEXT,
                failed BOOLEAN,
                audio_path TEXT,
                model TEXT
            )",
            (),
        )?;

        // Migration to add model column if it doesn't exist
        let _ = self
            .conn
            .execute("ALTER TABLE history ADD COLUMN model TEXT", ());

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            (),
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS dictionary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                replacement TEXT NOT NULL
            )",
            (),
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                text TEXT NOT NULL
            )",
            (),
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS modes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL
            )",
            (),
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS tones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL
            )",
            (),
        )?;

        // Deduplication Migration: Remove duplicate entries keeping the lowest ID
        let _ = self.conn.execute(
            "DELETE FROM modes WHERE id NOT IN (SELECT MIN(id) FROM modes GROUP BY name)",
            (),
        );
        let _ = self.conn.execute(
            "DELETE FROM tones WHERE id NOT IN (SELECT MIN(id) FROM tones GROUP BY name)",
            (),
        );
        let _ = self.conn.execute(
            "DELETE FROM snippets WHERE id NOT IN (SELECT MIN(id) FROM snippets GROUP BY keyword)",
            (),
        );
        let _ = self.conn.execute(
            "DELETE FROM dictionary WHERE id NOT IN (SELECT MIN(id) FROM dictionary GROUP BY word)",
            (),
        );

        Ok(())
    }

    pub fn get_installed_models(&self) -> Result<Vec<ModelRecord>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, status, local_path, architecture FROM models")?;
        let model_iter = stmt.query_map([], |row| {
            Ok(ModelRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                status: row.get(2)?,
                local_path: row.get(3)?,
                architecture: row.get(4).unwrap_or(None),
            })
        })?;

        let mut models = Vec::new();
        for model in model_iter {
            models.push(model?);
        }
        Ok(models)
    }

    pub fn insert_or_update_model(&self, model: &ModelRecord) -> Result<()> {
        self.conn.execute(
            "INSERT INTO models (id, name, status, local_path, architecture)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                local_path = excluded.local_path,
                architecture = excluded.architecture",
            (
                &model.id,
                &model.name,
                &model.status,
                &model.local_path,
                &model.architecture,
            ),
        )?;
        Ok(())
    }

    pub fn get_history(&self) -> Result<Vec<HistoryEntry>> {
        let mut stmt = self.conn.prepare("SELECT id, text, timestamp, duration, failed, audio_path, model FROM history ORDER BY id DESC")?;
        let history_iter = stmt.query_map([], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                text: row.get(1)?,
                timestamp: row.get(2)?,
                duration: row.get(3)?,
                failed: row.get(4)?,
                audio_path: row.get(5)?,
                model: row.get(6)?,
            })
        })?;

        let mut history = Vec::new();
        for item in history_iter {
            history.push(item?);
        }
        Ok(history)
    }

    pub fn add_history_entry(
        &self,
        text: &str,
        timestamp: &str,
        duration: Option<&str>,
        failed: Option<bool>,
        audio_path: Option<&str>,
        model: Option<&str>,
    ) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO history (text, timestamp, duration, failed, audio_path, model)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (text, timestamp, duration, failed, audio_path, model),
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn delete_history_entry(&self, id: i64) -> Result<()> {
        self.conn
            .execute("DELETE FROM history WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn clear_history(&self) -> Result<()> {
        self.conn.execute("DELETE FROM history", [])?;
        Ok(())
    }

    pub fn get_all_config(&self) -> Result<std::collections::HashMap<String, String>> {
        let mut stmt = self.conn.prepare("SELECT key, value FROM config")?;
        let config_iter = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        let mut config_map = std::collections::HashMap::new();
        for item in config_iter {
            let (key, value) = item?;
            config_map.insert(key, value);
        }
        Ok(config_map)
    }

    pub fn save_config(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO config (key, value)
             VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET
                value = excluded.value",
            (key, value),
        )?;
        Ok(())
    }
}

// Macro to eliminate duplicated CRUD operations
macro_rules! impl_crud {
    ($struct_name:ident, $table_name:expr, $get_fn:ident, $add_fn:ident, $update_fn:ident, $delete_fn:ident, $f1:ident, $f2:ident) => {
        impl Database {
            pub fn $get_fn(&self) -> Result<Vec<$struct_name>> {
                let sql = format!(
                    "SELECT id, {}, {} FROM {} ORDER BY {} ASC",
                    stringify!($f1),
                    stringify!($f2),
                    $table_name,
                    stringify!($f1)
                );
                let mut stmt = self.conn.prepare(&sql)?;
                let iter = stmt.query_map([], |row| {
                    Ok($struct_name {
                        id: row.get(0)?,
                        $f1: row.get(1)?,
                        $f2: row.get(2)?,
                    })
                })?;
                let mut entries = Vec::new();
                for item in iter {
                    entries.push(item?);
                }
                Ok(entries)
            }

            pub fn $add_fn(&self, f1_val: &str, f2_val: &str) -> Result<i64> {
                let sql = format!(
                    "INSERT INTO {} ({}, {}) VALUES (?1, ?2)",
                    $table_name,
                    stringify!($f1),
                    stringify!($f2)
                );
                self.conn.execute(&sql, (f1_val, f2_val))?;
                Ok(self.conn.last_insert_rowid())
            }

            pub fn $update_fn(&self, id: i64, f1_val: &str, f2_val: &str) -> Result<()> {
                let sql = format!(
                    "UPDATE {} SET {} = ?1, {} = ?2 WHERE id = ?3",
                    $table_name,
                    stringify!($f1),
                    stringify!($f2)
                );
                self.conn.execute(&sql, (f1_val, f2_val, id))?;
                Ok(())
            }

            pub fn $delete_fn(&self, id: i64) -> Result<()> {
                let sql = format!("DELETE FROM {} WHERE id = ?1", $table_name);
                self.conn.execute(&sql, [id])?;
                Ok(())
            }
        }
    };
}

impl_crud!(
    DictionaryEntry,
    "dictionary",
    get_dictionary,
    add_dictionary_entry,
    update_dictionary_entry,
    delete_dictionary_entry,
    word,
    replacement
);
impl_crud!(
    SnippetEntry,
    "snippets",
    get_snippets,
    add_snippet_entry,
    update_snippet_entry,
    delete_snippet_entry,
    keyword,
    text
);
impl_crud!(
    ModeEntry,
    "modes",
    get_modes,
    add_mode_entry,
    update_mode_entry,
    delete_mode_entry,
    name,
    prompt
);
impl_crud!(
    ToneEntry,
    "tones",
    get_tones,
    add_tone_entry,
    update_tone_entry,
    delete_tone_entry,
    name,
    prompt
);

// Implementations generated by macro
