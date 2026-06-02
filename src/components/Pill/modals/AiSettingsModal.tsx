import { ModalWrapper } from "./ModalWrapper";

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSettingsModal(props: AiSettingsModalProps) {
  return (
    <ModalWrapper
      id="ai-modal-overlay"
      isOpen={props.isOpen}
      title="AI Provider Settings"
      onClose={props.onClose}
    >
      <div class="ai-input-group">
        <label class="ai-label">Base URL</label>
        <input id="ai-url-input" class="ai-input" type="text" placeholder="http://localhost:11434/v1" />
      </div>
      <div class="ai-input-group">
        <label class="ai-label">API Key</label>
        <input id="ai-key-input" class="ai-input" type="password" placeholder="sk-..." />
      </div>
      <div class="ai-input-group">
        <label class="ai-label">Model Name</label>
        <input id="ai-model-input" class="ai-input" type="text" placeholder="gemma3:4b" />
      </div>
      <button class="ai-save-btn" id="ai-save-btn">Save Settings</button>
    </ModalWrapper>
  );
}
