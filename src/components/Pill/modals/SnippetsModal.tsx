import { createSignal } from "solid-js";
import { ModalWrapper } from "./ModalWrapper";

interface SnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnippetsModal(props: SnippetsModalProps) {
  const [activeTab, setActiveTab] = createSignal<"snippets" | "dictionary">("snippets");

  return (
    <ModalWrapper
      id="snippets-modal-overlay"
      isOpen={props.isOpen}
      title="Snippets & Dictionary"
      onClose={props.onClose}
      width="500px"
    >
      <div style={{ display: "flex", gap: "10px", "margin-bottom": "10px" }}>
        <button 
          class="ai-save-btn" 
          id="show-snippets-tab" 
          style={{ flex: 1, margin: 0, background: activeTab() === "snippets" ? "rgba(255,255,255,0.1)" : "transparent", color: activeTab() === "snippets" ? "#fff" : "#aaa" }}
          onClick={() => setActiveTab("snippets")}
        >
          Snippets
        </button>
        <button 
          class="ai-save-btn" 
          id="show-dictionary-tab" 
          style={{ flex: 1, margin: 0, background: activeTab() === "dictionary" ? "rgba(255,255,255,0.1)" : "transparent", color: activeTab() === "dictionary" ? "#fff" : "#aaa" }}
          onClick={() => setActiveTab("dictionary")}
        >
          Dictionary
        </button>
      </div>
      
      <div id="snippets-tab-content" style={{ display: activeTab() === "snippets" ? "block" : "none" }}>
        <div class="search-container" style={{ "margin-bottom": "10px" }}>
          <input type="text" class="search-input" id="new-snippet-trigger" placeholder="Trigger (e.g. IDK)" style={{ "padding-left": "12px" }} />
          <input type="text" class="search-input" id="new-snippet-expansion" placeholder="Expansion (e.g. I don't know)" style={{ "padding-left": "12px", "margin-top": "5px" }} />
          <button class="ai-save-btn" id="add-snippet-btn" style={{ width: "100%", "margin-top": "8px" }}>Add Snippet</button>
        </div>
        <div class="results-list" id="snippets-list" style={{ "max-height": "200px" }} />
      </div>

      <div id="dictionary-tab-content" style={{ display: activeTab() === "dictionary" ? "block" : "none" }}>
        <div class="search-container" style={{ "margin-bottom": "10px" }}>
          <input type="text" class="search-input" id="new-dict-word" placeholder="Word (e.g. Swaram)" style={{ "padding-left": "12px" }} />
          <input type="text" class="search-input" id="new-dict-replacement" placeholder="Replacement (e.g. Swaram)" style={{ "padding-left": "12px", "margin-top": "5px" }} />
          <button class="ai-save-btn" id="add-dict-btn" style={{ width: "100%", "margin-top": "8px" }}>Add to Dictionary</button>
        </div>
        <div class="results-list" id="dictionary-list" style={{ "max-height": "200px" }} />
      </div>
    </ModalWrapper>
  );
}
