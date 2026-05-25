use tauri::{command, AppHandle, Manager};
use crate::models_registry::{search_huggingface, HfModel, HfTreeFile, get_model_tree, HfLanguageTag, get_huggingface_languages};
use crate::download::download_model_file;
use crate::database::{Database, ModelRecord};
use std::path::PathBuf;

#[command]
pub async fn search_huggingface_models(query: String, filters: String, limit: u32, skip: u32) -> Result<Vec<HfModel>, String> {
    match search_huggingface(&query, &filters, limit, skip).await {
        Ok(models) => Ok(models),
        Err(e) => {
            println!("HF API fetch failed: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_hf_languages() -> Result<Vec<HfLanguageTag>, String> {
    match get_huggingface_languages().await {
        Ok(tags) => Ok(tags),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn get_huggingface_model_tree(model_id: String) -> Result<Vec<HfTreeFile>, String> {
    match get_model_tree(&model_id).await {
        Ok(tree) => Ok(tree),
        Err(e) => Err(e.to_string()),
    }
}


#[command]
pub async fn download_model(app: AppHandle, url: String, model_id: String) -> Result<(), String> {
    println!("Starting download for: {}", model_id);
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    
    let db = Database::new(&app_dir).map_err(|e| e.to_string())?;
    
    // Mark as downloading
    db.insert_or_update_model(&ModelRecord {
        id: model_id.clone(),
        name: model_id.clone(), // using ID as name fallback
        status: "downloading".to_string(),
        local_path: None,
    }).map_err(|e| e.to_string())?;

    let target_path = app_dir.join("models").join(format!("{}.bin", model_id));
    
    match download_model_file(app, url, model_id.clone(), target_path.clone()).await {
        Ok(_) => {
            // Update to installed
            db.insert_or_update_model(&ModelRecord {
                id: model_id.clone(),
                name: model_id,
                status: "installed".to_string(),
                local_path: Some(target_path.to_string_lossy().to_string()),
            }).map_err(|e| e.to_string())?;
            Ok(())
        },
        Err(e) => {
            // Mark failed
            db.insert_or_update_model(&ModelRecord {
                id: model_id.clone(),
                name: model_id,
                status: "failed".to_string(),
                local_path: None,
            }).map_err(|e| e.to_string())?;
            Err(e.to_string())
        }
    }
}

#[command]
pub fn get_installed_models(app: AppHandle) -> Result<Vec<ModelRecord>, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let db = Database::new(&app_dir).map_err(|e| e.to_string())?;
    db.get_installed_models().map_err(|e| e.to_string())
}

#[command]
pub fn load_model(model_name: String) -> Result<(), String> {
    println!("Loading AI model: {}", model_name);
    // In a real app, this would initialize whisper.cpp or similar
    Ok(())
}

#[command]
pub fn set_language(lang: String) -> Result<(), String> {
    println!("Setting language to: {}", lang);
    Ok(())
}
