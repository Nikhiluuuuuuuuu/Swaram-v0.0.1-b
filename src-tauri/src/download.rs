use futures_util::StreamExt;
use reqwest::Client;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub id: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
}

pub async fn download_model_file(
    app: AppHandle,
    url: String,
    model_id: String,
    target_path: PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client.get(&url).send().await?;
    let total_bytes = res.content_length().unwrap_or(0);

    // Create directory if it doesn't exist
    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await?;
        }
    }

    let mut file = File::create(&target_path).await?;
    let mut stream = res.bytes_stream();
    let mut downloaded: u64 = 0;

    let event_name = format!("download_progress_{}", model_id);

    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        // Emit progress to frontend
        let _ = app.emit(&event_name, DownloadProgress {
            id: model_id.clone(),
            bytes_downloaded: downloaded,
            total_bytes,
        });
    }

    Ok(())
}
