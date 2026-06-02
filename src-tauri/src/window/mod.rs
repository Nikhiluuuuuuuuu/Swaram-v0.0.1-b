//! Cross-platform active-window abstraction.
//!
//! Each platform module is compiled only on its target OS via `#[cfg]`.
//! Call sites use `get_active_window` without any platform awareness.

mod types;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;

pub use types::{ActiveWindowInfo, AppIconPayload, IconSource};

/// Returns information about the currently focused OS window.
/// Returns `None` when there is no focused window (e.g. lock screen).
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    #[cfg(target_os = "windows")]
    {
        windows::get_active_window()
    }
    #[cfg(target_os = "macos")]
    {
        macos::get_active_window()
    }
    #[cfg(target_os = "linux")]
    {
        linux::get_active_window()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        None
    }
}
