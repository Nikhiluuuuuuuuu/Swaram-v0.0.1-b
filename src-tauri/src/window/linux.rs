use super::types::ActiveWindowInfo;
use x11rb::{
    connection::Connection,
    protocol::xproto::{AtomEnum, ConnectionExt},
    rust_connection::RustConnection,
};

// ── Active Window ─────────────────────────────────────────────────────────────

pub fn get_active_window() -> Option<ActiveWindowInfo> {
    let (conn, screen_num) = x11rb::connect(None).ok()?;
    let root = conn.setup().roots[screen_num].root;

    let atom_active = intern_atom(&conn, b"_NET_ACTIVE_WINDOW")?;
    let atom_pid = intern_atom(&conn, b"_NET_WM_PID")?;
    let atom_name = intern_atom(&conn, b"_NET_WM_NAME")?;
    let atom_utf8 = intern_atom(&conn, b"UTF8_STRING")?;

    // Active window XID
    let active_reply = conn
        .get_property(false, root, atom_active, AtomEnum::WINDOW, 0, 1)
        .ok()?
        .reply()
        .ok()?;
    let wid = u32::from_ne_bytes(active_reply.value.as_slice().try_into().ok()?);
    if wid == 0 {
        return None;
    }

    // PID attached to that window
    let pid_reply = conn
        .get_property(false, wid, atom_pid, AtomEnum::CARDINAL, 0, 1)
        .ok()?
        .reply()
        .ok()?;
    let pid = u32::from_ne_bytes(pid_reply.value.as_slice().try_into().ok()?);

    // Window title
    let name_reply = conn
        .get_property(false, wid, atom_name, atom_utf8, 0, u32::MAX)
        .ok()?
        .reply()
        .ok()?;
    let title = String::from_utf8_lossy(&name_reply.value).into_owned();

    // Executable from /proc
    let exe_path = std::fs::read_link(format!("/proc/{pid}/exe"))
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();

    let name = std::path::Path::new(&exe_path)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();

    Some(ActiveWindowInfo {
        pid,
        name,
        title,
        exe_path,
        window_handle: wid as usize,
    })
}

/// Interns an X11 atom — returns `None` on failure.
fn intern_atom(conn: &RustConnection, name: &[u8]) -> Option<u32> {
    conn.intern_atom(false, name)
        .ok()?
        .reply()
        .ok()
        .map(|r| r.atom)
}
