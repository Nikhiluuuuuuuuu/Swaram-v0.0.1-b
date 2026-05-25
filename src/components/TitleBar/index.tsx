import { styled } from "solid-styled-components";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeft } from "lucide-solid";
import { Show } from "solid-js";

const TitleBarContainer = styled("div")`
  position: relative;
  height: 40px;
  background: var(--alabaster-base);
  user-select: none;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  flex-direction: row;
  z-index: 9999;
  justify-content: space-between;
`;

const TitleBarDragRegion = styled("div")`
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
`;



const NavContainer = styled("div")`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
`;

const BackButton = styled("button")`
  background: none;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: rgba(var(--hover-rgb), 0.05);
    color: var(--ink);
  }
`;

const TabLabel = styled("span")`
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
`;

const ControlsWrapper = styled("div")`
  display: flex;
  height: 100%;
`;

const ControlButton = styled("div")`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all var(--transition) 0.2s;
  width: 48px;
  height: 100%;
  color: var(--ink-muted);
  
  &:hover {
    background-color: rgba(var(--hover-rgb), 0.05);
    color: var(--ink);
  }
  &.close:hover {
    background-color: #ef4444;
    color: white;
  }
  
  svg {
    pointer-events: none;
  }
`;

interface TitleBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeTabLabel?: string;
  canGoBack?: boolean;
  onBack?: () => void;
}

export default function TitleBar(props: TitleBarProps) {
  const appWindow = getCurrentWindow();

  return (
    <TitleBarContainer>
      <TitleBarDragRegion data-tauri-drag-region="true" style={{ "justify-content": "flex-start", "padding-left": "16px" }}>
        <NavContainer>
          <Show when={props.canGoBack}>
            <BackButton onClick={() => props.onBack?.()} title="Go Back">
              <ArrowLeft size={14} />
            </BackButton>
          </Show>
          <TabLabel>{props.activeTabLabel || ""}</TabLabel>
        </NavContainer>
      </TitleBarDragRegion>
      
      <TitleBarDragRegion data-tauri-drag-region="true" style={{ "flex": 1, "justify-content": "center" }} />
      <TitleBarDragRegion data-tauri-drag-region="true" style={{ "justify-content": "flex-end" }} />

      <ControlsWrapper>
        <ControlButton class="minimize" onClick={() => appWindow.minimize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 5H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </ControlButton>
        <ControlButton class="maximize" onClick={() => appWindow.toggleMaximize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" stroke-width="1.5" rx="1"/>
          </svg>
        </ControlButton>
        <ControlButton class="close" onClick={() => appWindow.close()}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </ControlButton>
      </ControlsWrapper>
    </TitleBarContainer>
  );
}
