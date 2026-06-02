use crate::database::{Database, ModelRecord};
use crate::download::download_model_file;
use crate::models_registry::{
    get_huggingface_languages, get_model_tree, search_huggingface, HfLanguageTag, HfModel,
    HfTreeFile,
};
use crate::system::transcriber::{self, ModelArchitecture, RouterState};
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

const ACTIVE_MODEL_CONFIG_KEY: &str = "active_model";
const MODEL_STATUS_INSTALLED: &str = "installed";

fn sanitize_model_filename(model_id: &str) -> String {
    let sanitized = model_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    if sanitized.is_empty() {
        "model".to_string()
    } else {
        sanitized
    }
}

fn file_extension_from_url(url: &str) -> &str {
    let path = url
        .split(['?', '#'])
        .next()
        .unwrap_or(url)
        .rsplit('/')
        .next()
        .unwrap_or(url)
        .to_ascii_lowercase();

    for ext in ["bin", "onnx", "safetensors", "pt", "pth", "json"] {
        if path.ends_with(&format!(".{}", ext)) {
            return ext;
        }
    }

    "bin"
}

fn infer_architecture(record: &ModelRecord) -> ModelArchitecture {
    let db_arch = record
        .architecture
        .as_deref()
        .and_then(ModelArchitecture::from_hint);
    let path_arch = record
        .local_path
        .as_deref()
        .and_then(ModelArchitecture::from_hint);
    let id_arch = ModelArchitecture::from_hint(&record.id);

    db_arch
        .or(path_arch)
        .or(id_arch)
        .unwrap_or(ModelArchitecture::PythonTransformers)
}

fn app_data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn get_db(app: &AppHandle) -> Result<Database, String> {
    Database::new(&app_data_dir(app)).map_err(|e| e.to_string())
}

fn load_model_from_records(
    state: &RouterState,
    model_name: &str,
    models: Vec<ModelRecord>,
) -> Result<String, String> {
    let model_record = models
        .into_iter()
        .find(|m| m.id == model_name || m.name == model_name)
        .ok_or_else(|| format!("Model '{}' is not installed", model_name))?;

    if model_record.status != MODEL_STATUS_INSTALLED {
        return Err(format!(
            "Model '{}' is not ready yet (status: {})",
            model_record.id, model_record.status
        ));
    }

    let local_path = model_record.local_path.as_deref().ok_or_else(|| {
        format!(
            "Model '{}' does not have a local file path",
            model_record.id
        )
    })?;

    let arch = infer_architecture(&model_record);

    transcriber::load_model(state, &model_record.id, local_path, arch)?;
    Ok(model_record.id)
}

pub(crate) fn load_model_by_name(
    app: &AppHandle,
    state: &RouterState,
    model_name: &str,
) -> Result<String, String> {
    let db = get_db(app)?;
    let models = db.get_installed_models().map_err(|e| e.to_string())?;
    load_model_from_records(state, model_name, models)
}

pub(crate) fn load_active_model(app: &AppHandle, state: &RouterState) -> Result<String, String> {
    let db = get_db(app)?;
    let config = db.get_all_config().map_err(|e| e.to_string())?;
    let models = db.get_installed_models().map_err(|e| e.to_string())?;

    let configured_model = config
        .get(ACTIVE_MODEL_CONFIG_KEY)
        .map(String::as_str)
        .filter(|model_name| !model_name.trim().is_empty());

    let mut model_name = if let Some(name) = configured_model {
        name.to_string()
    } else {
        String::new()
    };

    let mut should_save_as_active = false;

    if model_name.is_empty() {
        let fallback_model = models
            .iter()
            .find(|model| model.status == MODEL_STATUS_INSTALLED)
            .ok_or_else(|| "No active speech-to-text model is selected".to_string())?;
        model_name = fallback_model.id.clone();
        should_save_as_active = true;
    }

    let mut loaded_model_result = load_model_from_records(state, &model_name, models.clone());

    // If the configured model fails (e.g. corrupted file), try to fallback
    if loaded_model_result.is_err() && configured_model.is_some() {
        eprintln!(
            "Failed to load configured model '{}', attempting fallback...",
            model_name
        );
        if let Some(fallback_model) = models
            .iter()
            .find(|m| m.status == MODEL_STATUS_INSTALLED && m.id != model_name)
        {
            model_name = fallback_model.id.clone();
            should_save_as_active = true;
            loaded_model_result = load_model_from_records(state, &model_name, models);
        }
    }

    let loaded_model = loaded_model_result?;

    if should_save_as_active {
        db.save_config(ACTIVE_MODEL_CONFIG_KEY, &loaded_model)
            .map_err(|e| e.to_string())?;
    }

    Ok(loaded_model)
}

#[command]
pub async fn search_huggingface_models(
    query: String,
    filters: String,
    limit: u32,
    skip: u32,
) -> Result<Vec<HfModel>, String> {
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
    let app_dir = app_data_dir(&app);

    let db = Database::new(&app_dir).map_err(|e| e.to_string())?;
    let ext = file_extension_from_url(&url);
    let architecture = ModelArchitecture::from_hint(&format!("{}.{}", model_id, ext))
        .unwrap_or(ModelArchitecture::PythonTransformers);
    let architecture_name = architecture.as_str().to_string();

    // Mark as downloading
    db.insert_or_update_model(&ModelRecord {
        id: model_id.clone(),
        name: model_id.clone(), // using ID as name fallback
        status: "downloading".to_string(),
        local_path: None,
        architecture: Some(architecture_name.clone()),
    })
    .map_err(|e| e.to_string())?;

    let target_path =
        app_dir
            .join("models")
            .join(format!("{}.{}", sanitize_model_filename(&model_id), ext));

    match download_model_file(app, url, model_id.clone(), target_path.clone()).await {
        Ok(_) => {
            // Verify magic bytes to prevent saving GGUF files
            let is_gguf = if let Ok(mut file) = std::fs::File::open(&target_path) {
                let mut magic = [0u8; 4];
                use std::io::Read;
                file.read_exact(&mut magic).is_ok() && &magic == b"GGUF"
            } else {
                false
            };

            if is_gguf {
                let _ = std::fs::remove_file(&target_path);
                db.insert_or_update_model(&ModelRecord {
                    id: model_id.clone(),
                    name: model_id,
                    status: "failed".to_string(),
                    local_path: None,
                    architecture: Some(architecture_name),
                })
                .map_err(|e| e.to_string())?;
                return Err(
                    "Downloaded model is in GGUF format, which is not supported by this version."
                        .to_string(),
                );
            }

            // Update to installed
            db.insert_or_update_model(&ModelRecord {
                id: model_id.clone(),
                name: model_id,
                status: "installed".to_string(),
                local_path: Some(target_path.to_string_lossy().to_string()),
                architecture: Some(architecture_name),
            })
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            // Mark failed
            db.insert_or_update_model(&ModelRecord {
                id: model_id.clone(),
                name: model_id,
                status: "failed".to_string(),
                local_path: None,
                architecture: Some(architecture_name),
            })
            .map_err(|e| e.to_string())?;
            Err(e.to_string())
        }
    }
}

#[command]
pub fn get_installed_models(app: AppHandle) -> Result<Vec<ModelRecord>, String> {
    let db = get_db(&app)?;
    db.get_installed_models().map_err(|e| e.to_string())
}

#[command]
pub fn load_model(
    app: AppHandle,
    state: tauri::State<'_, RouterState>,
    model_name: String,
) -> Result<(), String> {
    println!("Loading AI model: {}", model_name);
    let loaded_model = load_model_by_name(&app, state.inner(), &model_name)?;
    println!("Successfully loaded whisper context for {}", loaded_model);

    Ok(())
}

#[command]
pub fn set_language(lang: String) -> Result<(), String> {
    println!("Setting language to: {}", lang);
    Ok(())
}
