use tauri::command;

#[command]
pub fn register_shortcut(shortcut: String) -> Result<(), String> {
    println!("Registering global shortcut: {}", shortcut);
    // Real implementation would use tauri::GlobalShortcutManager
    Ok(())
}

#[command]
pub fn unregister_shortcut(shortcut: String) -> Result<(), String> {
    println!("Unregistering global shortcut: {}", shortcut);
    Ok(())
}
