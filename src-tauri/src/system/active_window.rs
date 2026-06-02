//! Thin shim kept for backwards-compatibility with `lib.rs` call sites.
//!
//! All real logic has moved to `crate::tracker::AppTracker` and
//! `crate::window`.  This module now only exposes `start_tracking`, which
//! simply creates the tracker and spawns it.

use tauri::AppHandle;

use crate::tracker::AppTracker;

/// Spawns the background active-window tracker.
///
/// The tracker polls the OS every 250 ms and emits `active-app-changed`
/// Tauri events whenever the focused window or tab URL changes.
///
/// Returns immediately — the tracker runs on the Tokio async runtime.
pub fn start_tracking(handle: AppHandle) {
    let tracker = AppTracker::new(handle);
    tauri::async_runtime::spawn(async move { tracker.run().await });
}
