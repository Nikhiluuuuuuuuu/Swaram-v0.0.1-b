/// Information about the currently focused OS window.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct ActiveWindowInfo {
    /// OS process ID.
    pub pid: u32,
    /// Process / application name (file stem of exe path).
    pub name: String,
    /// Window title bar text.
    pub title: String,
    /// Full path to the executable.
    pub exe_path: String,
    /// Platform handle: HWND on Windows, pid alias on macOS/Linux.
    pub window_handle: usize,
}

/// Payload emitted via the `active-app-changed` Tauri event.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppIconPayload {
    /// Application / process name.
    pub app_name: String,
    /// Full URL of the active browser tab, if any.
    pub url: Option<String>,
    /// Hostname extracted from `url`.
    pub domain: Option<String>,
    /// PNG icon, base-64 encoded (always present — falls back to a 1×1 transparent PNG).
    pub icon_base64: String,
    /// Which fetch tier produced the icon.
    pub icon_source: IconSource,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum IconSource {
    /// Resolved via Google / DDG / direct /favicon.ico CDN.
    WebFavicon,
    /// Windows `.exe` embedded icon.
    ExeIcon,
    /// 1×1 transparent PNG fallback.
    Default,
}
