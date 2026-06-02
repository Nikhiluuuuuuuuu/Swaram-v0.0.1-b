use super::types::ActiveWindowInfo;

/// Returns the frontmost application's PID and name via `osascript`.
/// One-shot call; the caller deduplicates on window change.
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    let output = std::process::Command::new("osascript")
        .args([
            "-e",
            r#"tell application "System Events"
                set p to first application process whose frontmost is true
                return (unix id of p as text) & "|||" & (name of p)
            end tell"#,
        ])
        .output()
        .ok()?;

    let raw = String::from_utf8_lossy(&output.stdout);
    let mut parts = raw.trim().splitn(2, "|||");
    let pid: u32 = parts.next()?.trim().parse().ok()?;
    let name = parts.next()?.trim().to_owned();

    Some(ActiveWindowInfo {
        pid,
        name: name.clone(),
        title: name,
        exe_path: String::new(),
        window_handle: pid as usize,
    })
}
