use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

#[cfg(target_os = "windows")]
use windows::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER, SWP_NOCOPYBITS},
};

#[tauri::command]
pub fn update_pill_region(app: AppHandle, width: f64, height: f64) {
    if let Some(window) = app.get_webview_window("pill") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let scale = monitor.scale_factor();
            let physical_width = (width * scale).round() as u32;
            let physical_height = (height * scale).round() as u32;

            let mon_size = monitor.size();
            let mon_pos = monitor.position();

            // Center horizontally on the current monitor
            let x = mon_pos.x + ((mon_size.width as i32 - physical_width as i32) / 2);

            // Position at the bottom of the current monitor
            let y = mon_pos.y + (mon_size.height as i32 - physical_height as i32);

            #[cfg(target_os = "windows")]
            {
                if let Ok(hwnd) = window.hwnd() {
                    unsafe {
                        let _ = SetWindowPos(
                            HWND(hwnd.0 as _),
                            HWND::default(),
                            x,
                            y,
                            physical_width as i32,
                            physical_height as i32,
                            SWP_NOZORDER | SWP_NOACTIVATE | SWP_NOCOPYBITS,
                        );
                    }
                }
            }

            #[cfg(not(target_os = "windows"))]
            {
                let _ = window.set_size(PhysicalSize::new(physical_width, physical_height));
                let _ = window.set_position(PhysicalPosition::new(x, y));
            }
        }
    }
}
