//! Background tracker: polls the OS every 250 ms for the active window,
//! diffs against the previous state, and emits `active-app-changed` Tauri
//! events when something changes.
//!
//! # Complexity
//! - Poll iteration: O(1) (dedup check).
//! - On change: O(n) UIAutomation scan.

use std::time::Duration;
use tauri::Emitter;

use crate::window;

const POLL_INTERVAL_MS: u64 = 250;

pub struct AppTracker {
    handle: tauri::AppHandle,
}

impl AppTracker {
    pub fn new(handle: tauri::AppHandle) -> Self {
        Self { handle }
    }

    pub async fn run(self) {
        let mut last_key = String::new();

        loop {
            tokio::time::sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;

            let Some(win_info) = window::get_active_window() else {
                continue;
            };

            // Dedup: only act on real focus changes.
            let key = format!("{}:{}", win_info.pid, win_info.title);
            if key == last_key {
                continue;
            }
            last_key = key;

            let handle = self.handle.clone();
            let win = win_info.clone();

            tokio::spawn(async move {
                let (icon_source, icon_base64) = resolve_icon(&win.exe_path);

                let payload = window::AppIconPayload {
                    app_name: win.name.clone(),
                    url: None,
                    domain: None,
                    icon_base64,
                    icon_source,
                };

                let _ = handle.emit("active-app-changed", &payload);
            });
        }
    }
}

// ── Icon resolution ───────────────────────────────────────────────────────────

fn resolve_icon(exe_path: &str) -> (window::IconSource, String) {
    // Non-browser app: extract the .exe's embedded icon.
    #[cfg(target_os = "windows")]
    if !exe_path.is_empty() {
        if let Ok(b64) = windows_icons::get_icon_base64_by_path(exe_path) {
            let full = if b64.starts_with("data:") {
                b64
            } else {
                format!("data:image/png;base64,{b64}")
            };
            return (window::IconSource::ExeIcon, full);
        }
    }

    let _ = exe_path; // suppress unused warning on non-Windows

    (window::IconSource::Default, String::new())
}
