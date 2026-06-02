pub mod active_window;
pub mod audio_feedback;
pub mod dictation;
pub mod llm_post_process;
pub mod shortcuts;
pub mod system_specs;
pub mod text_filters;
pub mod text_inserter;
pub mod transcriber;
pub mod tray;
pub mod window_region;

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
pub mod apple_intelligence;
