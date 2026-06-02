import { ModalWrapper } from "./ModalWrapper";

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelSelectionModal(props: ModelSelectionModalProps) {
  return (
    <ModalWrapper
      id="model-modal-overlay"
      isOpen={props.isOpen}
      title="Select Model"
      onClose={props.onClose}
    >
      <div class="search-container">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" class="search-input" id="model-search-input" placeholder="Search models..." />
      </div>
      <div class="results-list" id="model-results-list" />
    </ModalWrapper>
  );
}
