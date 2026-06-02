use super::engine::TranscriberEngine;
use super::ModelArchitecture;
use std::sync::Once;
use std::time::Instant;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const MIN_TRANSCRIPTION_CHARS: usize = 2;
const MIN_CONTENT_WORDS_FOR_ARTICLE: usize = 2;
const LOW_INFORMATION_WORDS: &[&str] = &[
    "a", "an", "the", "and", "or", "you", "i", "uh", "um", "hmm", "mmm",
];
static WHISPER_LOG_HOOK: Once = Once::new();

pub struct WhisperEngine {
    id: String,
    last_used: Instant,
    context: Option<WhisperContext>,
}

impl WhisperEngine {
    pub fn new(id: &str) -> Self {
        WHISPER_LOG_HOOK.call_once(whisper_rs::install_logging_hooks);

        Self {
            id: id.to_string(),
            last_used: Instant::now(),
            context: None,
        }
    }
}

fn is_probable_hallucination(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.len() < MIN_TRANSCRIPTION_CHARS {
        return true;
    }

    let mut word_count = 0;
    let mut first_word = String::new();

    for word in trimmed.split_whitespace() {
        let cleaned = word
            .trim_matches(|c: char| !c.is_alphanumeric())
            .to_ascii_lowercase();

        if cleaned.is_empty() {
            continue;
        }

        if word_count == 0 {
            first_word = cleaned;
        }
        word_count += 1;
    }

    if word_count == 0 {
        return true;
    }

    word_count < MIN_CONTENT_WORDS_FOR_ARTICLE
        && LOW_INFORMATION_WORDS.contains(&first_word.as_str())
}

impl TranscriberEngine for WhisperEngine {
    fn load_model(&mut self, model_path: &str) -> Result<(), String> {
        self.last_used = Instant::now();

        let path = std::path::Path::new(model_path);
        if !path.is_file() {
            return Err(format!("Model file does not exist: {}", path.display()));
        }

        // Verify magic bytes
        let mut file =
            std::fs::File::open(path).map_err(|e| format!("Failed to open model file: {}", e))?;
        let mut magic = [0u8; 4];
        use std::io::Read;
        if file.read_exact(&mut magic).is_ok() && &magic == b"GGUF" {
            return Err(
                "Unsupported model format: GGUF. Only GGML (.bin) models are supported."
                    .to_string(),
            );
        }

        let context =
            WhisperContext::new_with_params(model_path, WhisperContextParameters::default())
                .map_err(|e| format!("Failed to load whisper context: {}", e))?;

        self.context = Some(context);
        Ok(())
    }

    fn transcribe(&mut self, audio_data: &[f32]) -> Result<String, String> {
        self.last_used = Instant::now();

        let context = self.context.as_mut().ok_or("Whisper model not loaded")?;

        let mut state = context
            .create_state()
            .map_err(|e| format!("Failed to create state: {}", e))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("en"));
        params.set_print_progress(false);
        params.set_print_special(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_no_context(true);
        params.set_single_segment(true);
        params.set_suppress_blank(true);
        params.set_suppress_nst(true);
        params.set_temperature(0.0);
        params.set_temperature_inc(0.0);

        params.set_entropy_thold(2.4);
        params.set_logprob_thold(-0.75);
        params.set_no_speech_thold(0.45);

        state
            .full(params, audio_data)
            .map_err(|e| format!("Transcription failed: {}", e))?;

        let num_segments = state.full_n_segments();
        let mut transcription = String::new();
        let mut content_token_count = 0;
        let mut token_probability_sum = 0.0_f32;

        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                match segment.to_str_lossy() {
                    Ok(text) => {
                        transcription.push_str(&text);
                    }
                    Err(e) => eprintln!("Failed to decode segment: {}", e),
                }

                for token_idx in 0..segment.n_tokens() {
                    if let Some(token) = segment.get_token(token_idx) {
                        if token.token_id() < 50_000 {
                            content_token_count += 1;
                            token_probability_sum += token.token_probability();
                        }
                    }
                }
            }
        }

        let mut cleaned = transcription.trim().to_string();

        if cleaned.starts_with('[') && cleaned.ends_with(']') {
            cleaned.clear();
        }
        if cleaned.starts_with('(') && cleaned.ends_with(')') {
            cleaned.clear();
        }
        if cleaned.starts_with('*') && cleaned.ends_with('*') {
            cleaned.clear();
        }

        cleaned = crate::system::text_filters::filter_transcription_output(&cleaned, "en", &None);

        if is_probable_hallucination(&cleaned) {
            eprintln!(
                "Rejected low-information Whisper output: {:?} (content_tokens={})",
                cleaned, content_token_count
            );
            return Ok(String::new());
        }

        if content_token_count > 0 {
            let avg_token_probability = token_probability_sum / content_token_count as f32;
            if avg_token_probability < 0.20 {
                eprintln!(
                    "Rejected low-confidence Whisper output: {:?} (avg_token_probability={:.3})",
                    cleaned, avg_token_probability
                );
                return Ok(String::new());
            }
        }

        Ok(cleaned)
    }

    fn unload(&mut self) {
        self.context = None;
    }

    fn last_used(&self) -> Instant {
        self.last_used
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn architecture(&self) -> ModelArchitecture {
        ModelArchitecture::WhisperGgml
    }
}

#[cfg(test)]
mod tests {
    use super::is_probable_hallucination;

    #[test]
    fn rejects_single_low_information_words() {
        assert!(is_probable_hallucination("the"));
        assert!(is_probable_hallucination(" um "));
    }

    #[test]
    fn keeps_short_meaningful_dictation() {
        assert!(!is_probable_hallucination("yes"));
        assert!(!is_probable_hallucination("open settings"));
    }
}
