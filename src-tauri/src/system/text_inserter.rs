use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

/// Enum representing the configured paste method
#[derive(PartialEq)]
pub enum PasteMethod {
    CtrlV,
    ShiftInsert,
    Direct,
    None,
}

impl PasteMethod {
    fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "shift_insert" => PasteMethod::ShiftInsert,
            "direct" => PasteMethod::Direct,
            "none" => PasteMethod::None,
            _ => PasteMethod::CtrlV, // Default
        }
    }
}

/// Enum for auto submit keys
pub enum AutoSubmitKey {
    Enter,
    CtrlEnter,
    CmdEnter,
}

impl AutoSubmitKey {
    fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "ctrl_enter" => AutoSubmitKey::CtrlEnter,
            "cmd_enter" => AutoSubmitKey::CmdEnter,
            _ => AutoSubmitKey::Enter, // Default
        }
    }
}

pub fn insert_text(text: &str, app: &AppHandle) -> Result<(), String> {
    // 1. Fetch config settings
    let mut paste_method = PasteMethod::CtrlV;
    let mut auto_submit = false;
    let mut auto_submit_key = AutoSubmitKey::Enter;
    let mut paste_delay_ms = 50;
    let mut preserve_clipboard = true;

    if let Ok(db) = crate::database::Database::new(&app.path().app_data_dir().unwrap_or_default()) {
        if let Ok(config) = db.get_all_config() {
            if let Some(pm) = config.get("paste_method") {
                paste_method = PasteMethod::from_str(pm);
            }
            if let Some(asub) = config.get("auto_submit") {
                auto_submit = asub == "true";
            }
            if let Some(ak) = config.get("auto_submit_key") {
                auto_submit_key = AutoSubmitKey::from_str(ak);
            }
            if let Some(delay) = config.get("paste_delay_ms") {
                paste_delay_ms = delay.parse::<u64>().unwrap_or(50);
            }
            if let Some(pc) = config.get("clipboard_handling") {
                preserve_clipboard = pc == "dont_modify";
            }
        }
    }

    if paste_method == PasteMethod::None {
        return Ok(());
    }

    let mut enigo =
        Enigo::new(&Settings::default()).map_err(|e| format!("Failed to init enigo: {:?}", e))?;

    if paste_method == PasteMethod::Direct {
        enigo
            .text(text)
            .map_err(|e| format!("Failed to type direct text: {:?}", e))?;
    } else {
        // Paste via clipboard
        let mut clipboard =
            arboard::Clipboard::new().map_err(|e| format!("Failed to init clipboard: {:?}", e))?;

        let previous_clipboard = if preserve_clipboard {
            clipboard.get_text().ok()
        } else {
            None
        };

        clipboard
            .set_text(text)
            .map_err(|e| format!("Failed to set clipboard text: {:?}", e))?;

        // Give the OS a tiny moment to process the clipboard change
        thread::sleep(Duration::from_millis(paste_delay_ms));

        match paste_method {
            PasteMethod::CtrlV => {
                #[cfg(target_os = "macos")]
                let modifier = Key::Meta;
                #[cfg(not(target_os = "macos"))]
                let modifier = Key::Control;

                let _ = enigo.key(modifier, Direction::Press);
                let _ = enigo.key(Key::Unicode('v'), Direction::Click);
                let _ = enigo.key(modifier, Direction::Release);
            }
            PasteMethod::ShiftInsert => {
                let _ = enigo.key(Key::Shift, Direction::Press);
                #[cfg(target_os = "windows")]
                let insert = Key::Other(0x2D);
                #[cfg(not(target_os = "windows"))]
                let insert = Key::Other(0x76);
                let _ = enigo.key(insert, Direction::Click);
                let _ = enigo.key(Key::Shift, Direction::Release);
            }
            _ => {}
        }

        thread::sleep(Duration::from_millis(50));

        // Restore clipboard if enabled
        if let Some(prev) = previous_clipboard {
            let _ = clipboard.set_text(&prev);
        }
    }

    if auto_submit {
        thread::sleep(Duration::from_millis(50));
        match auto_submit_key {
            AutoSubmitKey::Enter => {
                let _ = enigo.key(Key::Return, Direction::Click);
            }
            AutoSubmitKey::CtrlEnter => {
                let _ = enigo.key(Key::Control, Direction::Press);
                let _ = enigo.key(Key::Return, Direction::Click);
                let _ = enigo.key(Key::Control, Direction::Release);
            }
            AutoSubmitKey::CmdEnter => {
                let _ = enigo.key(Key::Meta, Direction::Press);
                let _ = enigo.key(Key::Return, Direction::Click);
                let _ = enigo.key(Key::Meta, Direction::Release);
            }
        }
    }

    Ok(())
}
