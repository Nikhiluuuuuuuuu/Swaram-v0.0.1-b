use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    str::FromStr,
    sync::Mutex,
};

use tauri::{command, AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};

use crate::{commands::dictation, database::Database, system::dictation::DictationState};

const TOGGLE_KEY: &str = "shortcut_toggle";
const HOLD_KEY: &str = "shortcut_hold";
const CANCEL_KEY: &str = "shortcut_cancel";

const DEFAULT_TOGGLE_SHORTCUT: &str = "CommandOrControl+Shift+R";
const DEFAULT_HOLD_SHORTCUT: &str = "CommandOrControl+Shift+Space";
const DEFAULT_CANCEL_SHORTCUT: &str = "CommandOrControl+Alt+X";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ShortcutAction {
    Toggle,
    Hold,
    Cancel,
}

impl ShortcutAction {
    fn label(self) -> &'static str {
        match self {
            Self::Toggle => "toggle",
            Self::Hold => "hold",
            Self::Cancel => "cancel",
        }
    }
}

#[derive(Clone, Copy)]
struct ShortcutDefinition {
    action: ShortcutAction,
    config_key: &'static str,
    default_shortcut: &'static str,
}

const SHORTCUT_DEFINITIONS: [ShortcutDefinition; 3] = [
    ShortcutDefinition {
        action: ShortcutAction::Toggle,
        config_key: TOGGLE_KEY,
        default_shortcut: DEFAULT_TOGGLE_SHORTCUT,
    },
    ShortcutDefinition {
        action: ShortcutAction::Hold,
        config_key: HOLD_KEY,
        default_shortcut: DEFAULT_HOLD_SHORTCUT,
    },
    ShortcutDefinition {
        action: ShortcutAction::Cancel,
        config_key: CANCEL_KEY,
        default_shortcut: DEFAULT_CANCEL_SHORTCUT,
    },
];

#[derive(Default)]
pub struct ShortcutRegistry {
    actions_by_id: Mutex<HashMap<u32, ShortcutAction>>,
    pressed_ids: Mutex<HashSet<u32>>,
    registered_shortcuts: Mutex<Vec<Shortcut>>,
}

#[derive(Clone, serde::Serialize)]
pub struct RegisteredShortcut {
    action: String,
    shortcut: String,
}

#[derive(Clone, serde::Serialize)]
pub struct ShortcutRegistrationReport {
    pub registered: Vec<RegisteredShortcut>,
    pub warnings: Vec<String>,
}

impl ShortcutRegistry {
    fn action_for_id(&self, id: u32) -> Option<ShortcutAction> {
        self.actions_by_id.lock().ok()?.get(&id).copied()
    }

    fn mark_pressed(&self, id: u32) -> bool {
        self.pressed_ids
            .lock()
            .map(|mut pressed| pressed.insert(id))
            .unwrap_or(false)
    }

    fn mark_released(&self, id: u32) {
        if let Ok(mut pressed) = self.pressed_ids.lock() {
            pressed.remove(&id);
        }
    }

    fn is_pressed(&self, id: u32) -> bool {
        self.pressed_ids
            .lock()
            .map(|pressed| pressed.contains(&id))
            .unwrap_or(false)
    }

    fn replace_registered(&self, shortcuts: Vec<Shortcut>, actions: HashMap<u32, ShortcutAction>) {
        if let Ok(mut registered) = self.registered_shortcuts.lock() {
            *registered = shortcuts;
        }
        if let Ok(mut actions_by_id) = self.actions_by_id.lock() {
            *actions_by_id = actions;
        }
        if let Ok(mut pressed) = self.pressed_ids.lock() {
            pressed.clear();
        }
    }

    fn clear(&self) -> Vec<Shortcut> {
        let shortcuts = self
            .registered_shortcuts
            .lock()
            .map(|mut registered| std::mem::take(&mut *registered))
            .unwrap_or_default();

        if let Ok(mut actions_by_id) = self.actions_by_id.lock() {
            actions_by_id.clear();
        }
        if let Ok(mut pressed) = self.pressed_ids.lock() {
            pressed.clear();
        }

        shortcuts
    }
}

#[command]
pub fn register_app_shortcuts(
    app: AppHandle,
    registry: State<'_, ShortcutRegistry>,
) -> Result<ShortcutRegistrationReport, String> {
    let db = get_db(&app)?;
    let config = db.get_all_config().map_err(|error| error.to_string())?;

    unregister_app_shortcuts(app.clone(), registry.clone())?;

    let mut registered = Vec::new();
    let mut registered_shortcuts = Vec::new();
    let mut actions = HashMap::new();
    let mut warnings = Vec::new();

    for definition in SHORTCUT_DEFINITIONS {
        let requested = config
            .get(definition.config_key)
            .map(String::as_str)
            .filter(|shortcut| !shortcut.trim().is_empty())
            .unwrap_or(definition.default_shortcut);

        let (shortcut_text, shortcut) =
            match parse_configured_shortcut(&db, definition, requested, &mut warnings) {
                Ok(shortcut) => shortcut,
                Err(error) => {
                    warnings.push(error);
                    continue;
                }
            };

        let shortcut_id = shortcut.id();
        if actions.contains_key(&shortcut_id) {
            warnings.push(format!(
                "Shortcut '{}' is already assigned; skipped {} shortcut.",
                shortcut_text,
                definition.action.label()
            ));
            continue;
        }

        match app.global_shortcut().register(shortcut) {
            Ok(()) => {
                eprintln!(
                    "[Shortcuts] Registered {} shortcut: '{}' (id={})",
                    definition.action.label(),
                    shortcut_text,
                    shortcut_id
                );
                actions.insert(shortcut_id, definition.action);
                registered_shortcuts.push(shortcut);
                registered.push(RegisteredShortcut {
                    action: definition.action.label().to_string(),
                    shortcut: shortcut_text,
                });
            }
            Err(error) => {
                let msg = format!(
                    "Could not register {} shortcut '{}': {}",
                    definition.action.label(),
                    shortcut_text,
                    error
                );
                eprintln!("[Shortcuts] Error: {}", msg);
                warnings.push(msg);
            }
        }
    }

    registry.replace_registered(registered_shortcuts, actions);

    let report = ShortcutRegistrationReport {
        registered,
        warnings,
    };

    let _ = app.emit("shortcut-registration-report", report.clone());
    Ok(report)
}

#[command]
pub fn unregister_app_shortcuts(
    app: AppHandle,
    registry: State<'_, ShortcutRegistry>,
) -> Result<(), String> {
    let shortcuts = registry.clear();
    if shortcuts.is_empty() {
        return Ok(());
    }

    app.global_shortcut()
        .unregister_multiple(shortcuts)
        .map_err(|error| error.to_string())
}

pub fn handle_global_shortcut_event(app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    let registry = app.state::<ShortcutRegistry>();
    let shortcut_id = shortcut.id();
    let Some(action) = registry.action_for_id(shortcut_id) else {
        eprintln!(
            "[Shortcuts] No action found for shortcut id {}",
            shortcut_id
        );
        return;
    };

    eprintln!(
        "[Shortcuts] Event: action={:?}, state={:?}, id={}",
        action, event.state, shortcut_id
    );

    match event.state {
        ShortcutState::Pressed => {
            if !registry.mark_pressed(shortcut_id) {
                return;
            }
            run_shortcut_action(app.clone(), action, shortcut_id, true);
        }
        ShortcutState::Released => {
            registry.mark_released(shortcut_id);
            if action == ShortcutAction::Hold {
                run_shortcut_action(app.clone(), action, shortcut_id, false);
            }
        }
    }
}

fn run_shortcut_action(app: AppHandle, action: ShortcutAction, event_id: u32, is_press: bool) {
    tauri::async_runtime::spawn(async move {
        let result = match (action, is_press) {
            (ShortcutAction::Toggle, true) => {
                let dictation_state = app.state::<DictationState>();
                dictation::toggle_dictation(app.clone(), dictation_state).await
            }
            (ShortcutAction::Hold, true) => {
                let start_result = {
                    let dictation_state = app.state::<DictationState>();
                    dictation::start_dictation(app.clone(), dictation_state).await
                };
                let registry = app.state::<ShortcutRegistry>();
                if start_result.is_ok() && !registry.is_pressed(event_id) {
                    let dictation_state = app.state::<DictationState>();
                    dictation::stop_dictation(app.clone(), dictation_state).await
                } else {
                    start_result
                }
            }
            (ShortcutAction::Hold, false) => {
                let dictation_state = app.state::<DictationState>();
                if dictation_state
                    .is_recording
                    .load(std::sync::atomic::Ordering::SeqCst)
                {
                    dictation::stop_dictation(app.clone(), dictation_state).await
                } else {
                    Ok(())
                }
            }
            (ShortcutAction::Cancel, true) => {
                let dictation_state = app.state::<DictationState>();
                dictation::cancel_dictation(app.clone(), dictation_state).await
            }
            _ => Ok(()),
        };

        report_shortcut_result(&app, result);
    });
}

fn report_shortcut_result(app: &AppHandle, result: Result<(), String>) {
    if let Err(error) = result {
        let _ = app.emit("dictation-error", &error);
        eprintln!("Shortcut action failed: {}", error);
    }
}

fn parse_configured_shortcut(
    db: &Database,
    definition: ShortcutDefinition,
    requested: &str,
    warnings: &mut Vec<String>,
) -> Result<(String, Shortcut), String> {
    match parse_safe_shortcut(requested) {
        Ok(shortcut) => Ok((requested.trim().to_string(), shortcut)),
        Err(error) => {
            if requested == definition.default_shortcut {
                return Err(error);
            }

            warnings.push(format!(
                "Shortcut '{}' for {} is not safe or valid: {} Using '{}'.",
                requested,
                definition.action.label(),
                error,
                definition.default_shortcut
            ));
            db.save_config(definition.config_key, definition.default_shortcut)
                .map_err(|error| error.to_string())?;
            parse_safe_shortcut(definition.default_shortcut)
                .map(|shortcut| (definition.default_shortcut.to_string(), shortcut))
        }
    }
}

fn parse_safe_shortcut(shortcut: &str) -> Result<Shortcut, String> {
    validate_shortcut(shortcut)?;
    Shortcut::from_str(shortcut.trim()).map_err(|error| error.to_string())
}

fn validate_shortcut(shortcut: &str) -> Result<(), String> {
    let parts = shortcut
        .split('+')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();

    if parts.is_empty() {
        return Err("Shortcut cannot be empty".to_string());
    }

    let key = parts[parts.len() - 1];
    let modifiers = &parts[..parts.len() - 1];
    let has_non_shift_modifier = modifiers.iter().any(|modifier| {
        matches!(
            modifier.to_ascii_uppercase().as_str(),
            "ALT"
                | "OPTION"
                | "CTRL"
                | "CONTROL"
                | "SUPER"
                | "CMD"
                | "COMMAND"
                | "COMMANDORCONTROL"
                | "COMMANDORCTRL"
                | "CMDORCTRL"
                | "CMDORCONTROL"
        )
    });

    if is_text_input_key(key) && !has_non_shift_modifier {
        return Err(
            "Use Ctrl, Alt, Super/Command, or CommandOrControl with text keys. Shift-only shortcuts still type into the active app.".to_string(),
        );
    }

    Ok(())
}

fn is_text_input_key(key: &str) -> bool {
    let key = key.trim();
    let upper = key.to_ascii_uppercase();

    if upper == "SPACE" {
        return true;
    }

    if key.len() == 1 {
        return key.chars().all(|ch| ch.is_ascii_alphanumeric());
    }

    upper.strip_prefix("KEY").is_some_and(|suffix| {
        suffix.len() == 1 && suffix.chars().all(|ch| ch.is_ascii_alphabetic())
    }) || upper
        .strip_prefix("DIGIT")
        .is_some_and(|suffix| suffix.len() == 1 && suffix.chars().all(|ch| ch.is_ascii_digit()))
}

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    Database::new(&app_dir).map_err(|error| error.to_string())
}
