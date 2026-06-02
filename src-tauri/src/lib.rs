pub mod commands;
pub mod database;
pub mod download;
pub mod models_registry;
pub mod system;
pub mod tracker;
pub mod window;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ──────────────────────────────────────────────────────────
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    system::shortcuts::handle_global_shortcut_event(app, shortcut, event);
                })
                .build(),
        )
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        // ── Managed state ────────────────────────────────────────────────────
        .manage(system::dictation::DictationState::default())
        .manage(system::shortcuts::ShortcutRegistry::default())
        .manage(system::transcriber::RouterState::default())
        // ── Setup ────────────────────────────────────────────────────────────
        .setup(move |app| {
            // Platform-specific window chrome.
            #[cfg(desktop)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    {
                        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                        let _ =
                            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
                    }
                    #[cfg(target_os = "windows")]
                    {
                        use window_vibrancy::apply_mica;
                        let _ = apply_mica(&window, Some(true));
                    }
                }
            }

            // Database schema initialisation.
            if let Ok(app_dir) = app.path().app_data_dir() {
                if let Ok(db) = crate::database::Database::new(&app_dir) {
                    if let Err(e) = db.init() {
                        eprintln!("[Setup] Failed to initialise database: {e}");
                    }
                }
            }

            // System tray.
            system::tray::setup_tray(app)?;

            // Spawn the background active-window tracker.
            system::active_window::start_tracking(app.handle().clone());

            // Start the Whisper model inactivity auto-unloader
            system::transcriber::start_unload_tracker(
                app.state::<system::transcriber::RouterState>(),
            );

            // Global keyboard shortcuts.
            match system::shortcuts::register_app_shortcuts(
                app.handle().clone(),
                app.state::<system::shortcuts::ShortcutRegistry>(),
            ) {
                Ok(report) => {
                    eprintln!("[Setup] Shortcuts registered: {}", report.registered.len());
                    for w in &report.warnings {
                        eprintln!("[Setup] Shortcut warning: {w}");
                    }
                }
                Err(e) => eprintln!("[Setup] FAILED to register shortcuts: {e}"),
            }

            Ok(())
        })
        // ── Window events ────────────────────────────────────────────────────
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        // ── Tauri commands ───────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::audio::get_microphones,
            commands::audio::set_microphone,
            commands::audio::set_volume,
            commands::models::search_huggingface_models,
            commands::models::get_hf_languages,
            commands::models::get_huggingface_model_tree,
            commands::models::download_model,
            commands::models::get_installed_models,
            commands::models::load_model,
            commands::models::set_language,
            commands::config::save_config,
            commands::config::load_config,
            commands::config::get_all_config,
            commands::hardware::get_hardware_options,
            system::system_specs::get_system_specs,
            system::shortcuts::register_app_shortcuts,
            system::shortcuts::unregister_app_shortcuts,
            commands::history::get_history,
            commands::history::add_history,
            commands::history::delete_history_item,
            commands::history::clear_history,
            commands::history::extract_history_audio,
            commands::crud_commands::get_dictionary,
            commands::crud_commands::add_dictionary_entry,
            commands::crud_commands::update_dictionary_entry,
            commands::crud_commands::delete_dictionary_entry,
            commands::crud_commands::get_snippets,
            commands::crud_commands::add_snippet_entry,
            commands::crud_commands::update_snippet_entry,
            commands::crud_commands::delete_snippet_entry,
            commands::crud_commands::get_modes,
            commands::crud_commands::add_mode_entry,
            commands::crud_commands::update_mode_entry,
            commands::crud_commands::delete_mode_entry,
            commands::crud_commands::get_tones,
            commands::crud_commands::add_tone_entry,
            commands::crud_commands::update_tone_entry,
            commands::crud_commands::delete_tone_entry,
            commands::dictation::start_dictation,
            commands::dictation::stop_dictation,
            commands::dictation::cancel_dictation,
            commands::dictation::toggle_dictation,
            system::window_region::update_pill_region,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
