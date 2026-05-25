use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HfModelFile {
    pub r#type: String, // "file" or "directory"
    pub path: String,
    pub size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HfTreeFile {
    pub r#type: String,
    pub path: String,
    pub size: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HfModel {
    pub _id: String,
    pub id: String,
    pub tags: Vec<String>,
    pub downloads: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelManifestItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub file_size_gb: f64,
    pub download_url: String,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelManifest {
    pub last_updated: String,
    pub models: Vec<ModelManifestItem>,
}

pub async fn search_huggingface(query: &str, filters: &str, limit: u32, skip: u32) -> Result<Vec<HfModel>, Box<dyn std::error::Error>> {
    // Simple URL encoding for spaces and common characters to prevent reqwest from panicking
    let encoded_query = query.replace(" ", "%20").replace("+", "%2B");
    
    let url = if filters.is_empty() {
        format!("https://huggingface.co/api/models?search={}&limit={}&skip={}&siblings=true", encoded_query, limit, skip)
    } else {
        format!("https://huggingface.co/api/models?search={}&filter={}&limit={}&skip={}&siblings=true", encoded_query, filters, limit, skip)
    };
    
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .header("User-Agent", "Swaram-Desktop")
        .send()
        .await?;
    
    if response.status().is_success() {
        let models: Vec<HfModel> = response.json().await?;
        Ok(models)
    } else {
        Err(format!("Failed to search HF models: {}", response.status()).into())
    }
}

pub async fn get_model_tree(model_id: &str) -> Result<Vec<HfTreeFile>, Box<dyn std::error::Error>> {
    let url = format!("https://huggingface.co/api/models/{}/tree/main", model_id);
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .header("User-Agent", "Swaram-Desktop")
        .send()
        .await?;
    
    if response.status().is_success() {
        let tree: Vec<HfTreeFile> = response.json().await?;
        Ok(tree)
    } else {
        Err(format!("Failed to fetch tree: {}", response.status()).into())
    }
}

pub fn get_fallback_manifest() -> ModelManifest {
    let fallback_bytes = include_bytes!("../fallback_models.json");
    serde_json::from_slice(fallback_bytes).expect("Invalid fallback_models.json")
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HfLanguageTag {
    pub id: String,
    pub label: String,
}

pub async fn get_huggingface_languages() -> Result<Vec<HfLanguageTag>, Box<dyn std::error::Error>> {
    let url = "https://huggingface.co/api/models-tags-by-type";
    let client = reqwest::Client::new();
    let response = client.get(url)
        .header("User-Agent", "Swaram-Desktop")
        .send()
        .await?;
    
    if response.status().is_success() {
        let tags: serde_json::Value = response.json().await?;
        if let Some(languages) = tags.get("language").and_then(|l| l.as_array()) {
            let mut result = Vec::new();
            for lang in languages {
                if let (Some(id), Some(label)) = (lang.get("id").and_then(|i| i.as_str()), lang.get("label").and_then(|l| l.as_str())) {
                    result.push(HfLanguageTag {
                        id: id.to_string(),
                        label: label.to_string(),
                    });
                }
            }
            // Sort alphabetically by label
            result.sort_by(|a, b| a.label.cmp(&b.label));
            Ok(result)
        } else {
            Ok(vec![])
        }
    } else {
        Err(format!("Failed to fetch tags: {}", response.status()).into())
    }
}
