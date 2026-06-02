
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeft } from "lucide-solid";
import { Show } from "solid-js";

// removed styled definitions

interface TitleBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeTabLabel?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  centerContent?: import("solid-js").JSX.Element;
}

export default function TitleBar(props: TitleBarProps) {
  const appWindow = getCurrentWindow();

  return (
    <div class="title-bar-container">
      <div class="title-bar-drag-region" data-tauri-drag-region="true" style={{ "flex": 1, "justify-content": "flex-start", "padding-left": "16px" }}>
        <div class="nav-container">
          <Show when={props.canGoBack}>
            <button class="back-button" onClick={() => props.onBack?.()} title="Go Back">
              <ArrowLeft size={14} />
            </button>
          </Show>
          <span class="tab-label">{props.activeTabLabel || ""}</span>
        </div>
      </div>
      
      <Show when={props.centerContent}>
        <div class="center-content-wrapper">
          <div data-tauri-drag-region="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", "z-index": -1 }} />
          {props.centerContent}
        </div>
      </Show>

      <div class="controls-wrapper">
        <div class="control-button minimize" onClick={() => appWindow.minimize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 5H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="control-button maximize" onClick={() => appWindow.toggleMaximize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" stroke-width="1.5" rx="1"/>
          </svg>
        </div>
        <div class="control-button close" onClick={() => appWindow.close()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
