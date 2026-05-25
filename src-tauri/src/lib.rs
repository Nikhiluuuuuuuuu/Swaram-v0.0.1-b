pub mod commands;
pub mod system;
pub mod database;
pub mod models_registry;
pub mod download;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    {
                        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
                    }

                    #[cfg(target_os = "windows")]
                    {
                        use window_vibrancy::apply_mica;
                        let _ = apply_mica(&window, Some(true));
                    }
                }
            }
            system::tray::setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
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
            commands::history::get_history,
            commands::history::add_history,
            commands::history::delete_history_item,
            commands::history::clear_history,
            commands::dictionary::get_dictionary,
            commands::dictionary::add_dictionary_entry,
            commands::dictionary::update_dictionary_entry,
            commands::dictionary::delete_dictionary_entry,
            commands::snippets::get_snippets,
            commands::snippets::add_snippet_entry,
            commands::snippets::update_snippet_entry,
            commands::snippets::delete_snippet_entry,
            commands::modes::get_modes,
            commands::modes::add_mode_entry,
            commands::modes::update_mode_entry,
            commands::modes::delete_mode_entry,
            commands::tones::get_tones,
            commands::tones::add_tone_entry,
            commands::tones::update_tone_entry,
            commands::tones::delete_tone_entry,
            system::shortcuts::register_shortcut,
            system::shortcuts::unregister_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
