import { createSignal, onMount, onCleanup, Show, untrack } from "solid-js";
import { AppWindow } from "lucide-solid";

import { listen } from "@tauri-apps/api/event";
import { formatTauriError, toggleDictation } from "../../../dictation";

function MainPillContainer(props: any) {
  const local = props;
  return <div class={"main-pill-container " + (local.class || "")} {...props}>{local.children}</div>;
}


export function MainPill(props: { onClick?: () => void }) {
  const [isHovered, setIsHovered] = createSignal(false);
  const [status, setStatus] = createSignal("stopped");
  const [isCommandPending, setIsCommandPending] = createSignal(false);
  const [activeIcon, setActiveIcon] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [audioLevel, setAudioLevel] = createSignal(0);

  const isRecording = () => status() === "recording";
  const isBusy = () => isCommandPending() || status() === "loading-model" || status() === "transcribing";
  const pillText = () => {
    if (status() === "loading-model") return "Loading model";
    if (status() === "transcribing") return "Transcribing";
    return message();
  };

  const handleClick = async () => {
    if (isBusy()) return;

    props.onClick?.();
    setIsCommandPending(true);
    setMessage("");
    try {
      await toggleDictation();
    } catch (error) {
      const errorMessage = formatTauriError(error);
      console.error("Dictation toggle failed:", errorMessage);
      setMessage(errorMessage);
    } finally {
      setIsCommandPending(false);
    }
  };

  onMount(() => {
    let statusTimeout: number | undefined;
    const unlistenDictationState = listen<string>("dictation-state", (event) => {
      const newState = event.payload;
      
      if (newState === "stopped" && untrack(status) === "recording") {
        // Debounce the 'stopped' state just in case we are transitioning to 'transcribing'
        // This prevents the pill from flickering to its 'mini' state.
        clearTimeout(statusTimeout);
        statusTimeout = window.setTimeout(() => {
          setStatus(newState);
        }, 200);
      } else {
        clearTimeout(statusTimeout);
        setStatus(newState);
        if (newState === "recording") {
          setMessage("");
          setAudioLevel(0);
        }
      }
    });

    const unlistenTranscription = listen<{ text: string }>("transcription-result", () => {
      // Don't show transcribed text on the pill
    });

    const unlistenError = listen<string>("dictation-error", (event) => {
      setMessage(event.payload);
    });

    const unlistenAudioLevel = listen<{ level: number }>("audio-level", (event) => {
      const val = Math.min(1, event.payload.level * 12.0); // Boost level sensitivity further
      setAudioLevel(val);
    });

    // Listen for active window / browser icon updates from the backend tracker.
    // Payload shape (AppIconPayload from src-tauri/src/window/types.rs):
    //   app_name:    string
    //   url:         string | null
    //   domain:      string | null
    //   icon_base64: string  — true base64 PNG (or already a full data URI for exe icons)
    //   icon_source: "webFavicon" | "exeIcon" | "default"
    const unlistenIcon = listen<{
      app_name:    string;
      url:         string | null;
      domain:      string | null;
      icon_base64: string;
      icon_source: "webFavicon" | "exeIcon" | "default";
    }>("active-app-changed", (event) => {
      const { icon_base64 } = event.payload;
      if (!icon_base64) {
        setActiveIcon("");
        return;
      }
      // Both exeIcon and webFavicon payloads now carry a full "data:image/...;base64,..." URI.
      if (icon_base64) {
        if (icon_base64.startsWith("data:")) {
          setActiveIcon(icon_base64);
        } else {
          setActiveIcon(`data:image/png;base64,${icon_base64}`);
        }
      } else {
        setActiveIcon("");
      }
    });

    onCleanup(() => {
      unlistenDictationState.then(f => f());
      unlistenTranscription.then(f => f());
      unlistenError.then(f => f());
      unlistenAudioLevel.then(f => f());
      unlistenIcon.then(f => f());
    });
  });

  return (
    <MainPillContainer>
      <div
        class={`pill ${!isHovered() && !isRecording() && !isBusy() && !pillText() ? 'mini' : ''} ${isRecording() ? 'recording' : ''} ${pillText() ? 'has-text' : ''} ${status() === 'transcribing' ? 'transcribing' : ''}`}
        id="pill-container"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div class="pill-aurora" />
        <div class="pill-content">
          <Show when={status() === 'recording'}>
            <Show when={activeIcon()} fallback={
              <AppWindow class="active-icon" size={20} color="rgba(255,255,255,0.7)" style={{ padding: "2px" }} />
            }>
              <img class="active-icon" src={activeIcon()} alt="App Icon" />
            </Show>
          </Show>
          <Show when={pillText()}>
            <div class={`pill-label ${status() === 'transcribing' ? 'glowing' : ''}`} id="model-label" title={pillText()}>
              {pillText()}
            </div>
          </Show>
          <Show when={status() === 'recording'}>
            <div class="visualizer">
              <div class="bar" style={{ transform: `scaleY(${Math.max(0.15, audioLevel() * (0.3 + Math.random() * 0.3))})` }} />
              <div class="bar" style={{ transform: `scaleY(${Math.max(0.15, audioLevel() * (0.5 + Math.random() * 0.4))})` }} />
              <div class="bar" style={{ transform: `scaleY(${Math.max(0.15, audioLevel() * (0.7 + Math.random() * 0.5))})` }} />
              <div class="bar" style={{ transform: `scaleY(${Math.max(0.15, audioLevel() * (0.5 + Math.random() * 0.4))})` }} />
              <div class="bar" style={{ transform: `scaleY(${Math.max(0.15, audioLevel() * (0.3 + Math.random() * 0.3))})` }} />
            </div>
          </Show>
        </div>
      </div>
    </MainPillContainer>
  );
}

