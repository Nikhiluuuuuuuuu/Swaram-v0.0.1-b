use windows::{
    core::PWSTR,
    Win32::{
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId},
    },
};

use super::types::ActiveWindowInfo;

// ── Active Window ─────────────────────────────────────────────────────────────

/// Returns information about the currently focused window.
/// Returns `None` only if no window is focused (e.g. the desktop / lock screen).
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut title_buf);
        let title = String::from_utf16_lossy(&title_buf[..len as usize]);

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let exe_path = exe_path_for_pid(pid).unwrap_or_default();
        let name = std::path::Path::new(&exe_path)
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();

        Some(ActiveWindowInfo {
            pid,
            name,
            title,
            exe_path,
            window_handle: hwnd.0 as usize,
        })
    }
}

fn exe_path_for_pid(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 1024];
        let mut size = buf.len() as u32;
        QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            PWSTR(buf.as_mut_ptr()),
            &mut size,
        )
        .ok()?;
        Some(String::from_utf16_lossy(&buf[..size as usize]))
    }
}
