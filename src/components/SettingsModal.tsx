import { createResource, createSignal, Show, For } from "solid-js";

import { ModalOverlay, ToggleSwitch, MonoValue } from "./SharedStyles";
import { invoke } from "@tauri-apps/api/core";
import { Cloud, Sliders, Monitor, Mic, Keyboard } from "lucide-solid";
import { registerAppShortcuts, unregisterAppShortcuts } from "../dictation";
import { DEFAULT_SHORTCUTS, validateShortcut } from "../shortcuts";

// --- Types ---
type HardwareOptions = {
  whisper_acceleration: string[];
  onnx_acceleration: string[];
};

// --- Subcomponents ---

export function MicrophoneSelector(props: { value: string, onChange: (val: string) => void }) {
  const [mics] = createResource<string[]>(async () => {
    return await invoke<string[]>("get_microphones");
  });

  const handleChange = (e: Event & { currentTarget: HTMLSelectElement }) => {
    const val = e.currentTarget.value;
    props.onChange(val);
    invoke("set_microphone", { micName: val });
  };

  const currentMic = () => props.value || (mics() && mics()![0]) || "";

  return (
    <RefSelect value={currentMic()} onChange={handleChange}>
      <For each={mics() || ["Loading..."]}>
        {(m) => <option value={m}>{m}</option>}
      </For>
    </RefSelect>
  );
}

export function MicrophoneVolume(props: { value: number, onChange: (val: number) => void }) {
  const handleInput = (e: Event & { currentTarget: HTMLInputElement }) => {
    const val = Number(e.currentTarget.value);
    props.onChange(val);
    invoke("set_volume", { volume: val });
  };

  return (
    <input
      type="range"
      min="0"
      max="100"
      value={props.value}
      onInput={handleInput}
      style={{ "accent-color": "#2d2d2d", width: "150px", cursor: "pointer" }}
    />
  );
}

function formatKey(key: string): string {
  // basic detection for macOS vs Windows/Linux
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.includes('Mac');
  
  if (key === 'CommandOrControl') {
    return isMac ? 'Cmd' : 'Ctrl';
  }
  if (key === 'Super' || key === 'Meta') {
    return isMac ? 'Cmd' : 'Win';
  }
  if (key === 'Control') {
    return 'Ctrl';
  }
  if (key === 'Alt') {
    return isMac ? 'Option' : 'Alt';
  }
  return key;
}

export function ShortcutItem(props: { label: string; shortcut: string; onChange: (val: string) => Promise<boolean> }) {
  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");

  const KEY_MAPPING: Record<string, string> = {
    "Space": "Space",
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
    "Escape": "Esc",
    "Enter": "Enter",
    "Backspace": "Backspace",
    "Tab": "Tab",
  };

  const finishEditing = () => {
    setEditing(false);
    registerAppShortcuts().catch((error) => {
      console.error("Failed to restore app shortcuts:", error);
    });
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (!editing()) return;
    e.preventDefault();
    e.stopPropagation();

    // Only cancel if Esc is pressed without modifiers
    if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      finishEditing();
      return;
    }
    
    const modifiers = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Super"); // Changed Meta to Super for Tauri global shortcuts
    
    // Ignore pure modifier key presses (wait for actual key)
    if (["Control", "Alt", "Shift", "Meta", "Super"].includes(e.key)) return;
    
    let baseKey = e.code;
    if (baseKey.startsWith("Key")) baseKey = baseKey.slice(3);
    else if (baseKey.startsWith("Digit")) baseKey = baseKey.slice(5);
    else if (KEY_MAPPING[baseKey]) baseKey = KEY_MAPPING[baseKey];
    else if (e.key.length === 1) baseKey = e.key.toUpperCase();
    
    const newShortcut = [...modifiers, baseKey].join("+");
    const validationError = validateShortcut(newShortcut);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    const saved = await props.onChange(newShortcut);
    if (saved) {
      setEditing(false);
    }
  };

  return (
    <RefCardRow>
      <span>{props.label}</span>
      <ShortcutButton 
        class={editing() ? "editing" : ""}
        onClick={() => {
          setError("");
          unregisterAppShortcuts()
            .catch((error) => console.error("Failed to pause app shortcuts:", error))
            .finally(() => setEditing(true));
        }}
        onKeyDown={handleKeyDown}
        onBlur={finishEditing}
      >
        <Show when={editing()} fallback={
          <For each={props.shortcut.split('+')}>
            {(key) => <Keycap>{formatKey(key)}</Keycap>}
          </For>
        }>
          <Keycap style={{ "border-color": "#5e5e5e", "box-shadow": "0 2px 0 #5e5e5e" }}>Listening...</Keycap>
        </Show>
      </ShortcutButton>
      <Show when={error()}>
        <ShortcutError>{error()}</ShortcutError>
      </Show>
    </RefCardRow>
  );
}

function ShortcutButton(props: any) {
  const local = props;
  return <button class={"shortcut-button " + (local.class || "")} {...props}>{local.children}</button>;
}


function Keycap(props: any) {
  const local = props;
  return <kbd class={"keycap " + (local.class || "")} {...props}>{local.children}</kbd>;
}


function ShortcutError(props: any) {
  const local = props;
  return <span class={"shortcut-error " + (local.class || "")} {...props}>{local.children}</span>;
}


export function ToggleFeature(props: { title: string; on: boolean; onChange: (val: boolean) => void }) {
  return (
    <RefCardRow>
      <span>{props.title}</span>
      <ToggleSwitch checked={props.on} onChange={props.onChange} />
    </RefCardRow>
  );
}

export function DropdownFeature(props: { title: string; options: string[]; value: string; onChange: (val: string) => void }) {
  return (
    <RefCardRow>
      <span>{props.title}</span>
      <RefSelect value={props.value} onChange={(e: any) => props.onChange(e.target.value)}>
        <For each={props.options}>
          {(opt) => <option value={opt}>{opt}</option>}
        </For>
      </RefSelect>
    </RefCardRow>
  );
}

function RefSelect(props: any) {
  const local = props;
  return <select class={"ref-select " + (local.class || "")} {...props}>{local.children}</select>;
}


// --- Main Modal ---

export default function SettingsModal(props: { isOpen: boolean; onClose: () => void }) {
  const [activeSection, setActiveSection] = createSignal("General");

  const [hardware] = createResource<HardwareOptions>(async () => {
    return await invoke("get_hardware_options");
  });

  const [config, { mutate }] = createResource<Record<string, string>>(async () => {
    return await invoke("get_all_config");
  });

  const saveConfig = async (k: string, v: string) => {
    if (k.startsWith("shortcut_")) {
      const validationError = validateShortcut(v);
      if (validationError) {
        alert(validationError);
        return false;
      }
    }

    if (config()) {
      mutate((prev) => prev ? { ...prev, [k]: v } : { [k]: v });
    }

    try {
      await invoke("save_config", { key: k, value: v });

      if (k.startsWith("shortcut_")) {
        await registerAppShortcuts();
      }
      return true;
    } catch (error) {
      console.error("Failed to save config:", error);
      alert(`Failed to save setting: ${error}`);
      return false;
    }
  };

  const SHORTCUT_CONFIGS = [
    { id: "shortcut_toggle", label: "Start/Stop Recording", default: DEFAULT_SHORTCUTS.shortcut_toggle },
    { id: "shortcut_hold", label: "Hold to Record", default: DEFAULT_SHORTCUTS.shortcut_hold },
    { id: "shortcut_cancel", label: "Cancel Recording", default: DEFAULT_SHORTCUTS.shortcut_cancel },
  ];

  return (
    <Show when={props.isOpen && config()}>
      <ModalOverlay onClick={(e: any) => { if (e.target === e.currentTarget) props.onClose(); }} style={{ "z-index": 10001, "background-color": "rgba(0,0,0,0.2)" }}>
        <RefModalContent>
          {/* LEFT SIDEBAR */}
          <RefSidebar>
            <RefSidebarSection>
              <RefSidebarSubhead>SETTINGS</RefSidebarSubhead>
              <RefSidebarItem 
                class={activeSection() === "General" ? "active" : ""} 
                onClick={() => setActiveSection("General")}
              >
                <Sliders size={16} /> General
              </RefSidebarItem>
              <RefSidebarItem 
                class={activeSection() === "System" ? "active" : ""} 
                onClick={() => setActiveSection("System")}
              >
                <Monitor size={16} /> System
              </RefSidebarItem>
              <RefSidebarItem 
                class={activeSection() === "Audio" ? "active" : ""} 
                onClick={() => setActiveSection("Audio")}
              >
                <Mic size={16} /> Audio
              </RefSidebarItem>
              <RefSidebarItem 
                class={activeSection() === "Shortcuts" ? "active" : ""} 
                onClick={() => setActiveSection("Shortcuts")}
              >
                <Keyboard size={16} /> Shortcuts
              </RefSidebarItem>
            </RefSidebarSection>

            <div style={{ flex: 1 }} />
            
            <RefSidebarFooter>
              <span>Swaram v0.0.1</span>
              <Cloud size={16} color="#6e6e6e" />
            </RefSidebarFooter>
          </RefSidebar>

          {/* RIGHT PANE */}
          <RefContentArea>
            <RefTitle>{activeSection()}</RefTitle>

            <Show when={activeSection() === "General"}>
              <RefSectionTitle>Appearance</RefSectionTitle>
              <RefCardGroup>
                <DropdownFeature 
                  title="Application Theme" 
                  options={["System", "Light", "Dark"]} 
                  value={config()!["theme"] || "System"}
                  onChange={(v) => {
                    saveConfig("theme", v);
                    if (v === "System") {
                      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                    } else {
                      document.documentElement.setAttribute('data-theme', v.toLowerCase());
                    }
                  }}
                />
              </RefCardGroup>

            </Show>

            <Show when={activeSection() === "System"}>
              <RefSectionTitle>Engine Acceleration</RefSectionTitle>
              <RefCardGroup>
                <DropdownFeature 
                  title="Whisper Acceleration" 
                  options={hardware()?.whisper_acceleration || ["Auto", "CPU"]} 
                  value={config()!["whisper_acceleration"] || "Auto"}
                  onChange={(v) => saveConfig("whisper_acceleration", v)}
                />
                <DropdownFeature 
                  title="ONNX Acceleration" 
                  options={hardware()?.onnx_acceleration || ["Auto", "CPU", "DirectML"]} 
                  value={config()!["onnx_acceleration"] || "Auto"}
                  onChange={(v) => saveConfig("onnx_acceleration", v)}
                />
              </RefCardGroup>

              <RefSectionTitle>Behavior</RefSectionTitle>
              <RefCardGroup>
                <ToggleFeature 
                  title="Post Processing" 
                  on={config()!["post_processing"] !== "false"} 
                  onChange={(v) => saveConfig("post_processing", v.toString())}
                />
              </RefCardGroup>
            </Show>

            <Show when={activeSection() === "Audio"}>
              <RefSectionTitle>Input Settings</RefSectionTitle>
              <RefCardGroup>
                <RefCardRow>
                  <span>Input Device</span>
                  <MicrophoneSelector 
                    value={config()!["active_microphone"] || ""} 
                    onChange={(val) => saveConfig("active_microphone", val)} 
                  />
                </RefCardRow>
                <RefCardRow>
                  <span>Input Volume</span>
                  <div style={{ display: "flex", "align-items": "center", gap: "16px" }}>
                    <MicrophoneVolume 
                      value={config()!["microphone_volume"] !== undefined ? Number(config()!["microphone_volume"]) : 75} 
                      onChange={(val: any) => saveConfig("microphone_volume", val.toString())} 
                    />
                    <MonoValue style={{ width: "40px", "text-align": "right", color: "#2d2d2d" }}>
                      {config()!["microphone_volume"] !== undefined ? Number(config()!["microphone_volume"]) : 75}%
                    </MonoValue>
                  </div>
                </RefCardRow>
              </RefCardGroup>

              <RefSectionTitle>Recording</RefSectionTitle>
              <RefCardGroup>
                <ToggleFeature 
                  title="Keep Mic Open" 
                  on={config()!["keep_mic_open"] !== "false"} 
                  onChange={(v) => saveConfig("keep_mic_open", v.toString())}
                />
              </RefCardGroup>
            </Show>

            <Show when={activeSection() === "Shortcuts"}>
              <RefSectionTitle>Global Shortcuts</RefSectionTitle>
              <RefCardGroup>
                <For each={SHORTCUT_CONFIGS}>
                  {(s) => (
                    <ShortcutItem 
                      label={s.label} 
                      shortcut={config()![s.id] || s.default} 
                      onChange={(newVal) => saveConfig(s.id, newVal)} 
                    />
                  )}
                </For>
              </RefCardGroup>
            </Show>

          </RefContentArea>
        </RefModalContent>
      </ModalOverlay>
    </Show>
  );
}

// --- Styled Components (Reference Aesthetic) ---

function RefModalContent(props: any) {
  const local = props;
  return <div class={"ref-modal-content " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefSidebar(props: any) {
  const local = props;
  return <div class={"ref-sidebar " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefSidebarSection(props: any) {
  const local = props;
  return <div class={"ref-sidebar-section " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefSidebarSubhead(props: any) {
  const local = props;
  return <div class={"ref-sidebar-subhead " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefSidebarItem(props: any) {
  const local = props;
  return <button class={"ref-sidebar-item " + (local.class || "")} {...props}>{local.children}</button>;
}


function RefSidebarFooter(props: any) {
  const local = props;
  return <div class={"ref-sidebar-footer " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefContentArea(props: any) {
  const local = props;
  return <div class={"ref-content-area " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefTitle(props: any) {
  const local = props;
  return <h1 class={"ref-title " + (local.class || "")} {...props}>{local.children}</h1>;
}


function RefSectionTitle(props: any) {
  const local = props;
  return <h3 class={"ref-section-title " + (local.class || "")} {...props}>{local.children}</h3>;
}


function RefCardGroup(props: any) {
  const local = props;
  return <div class={"ref-card-group " + (local.class || "")} {...props}>{local.children}</div>;
}


function RefCardRow(props: any) {
  const local = props;
  return <div class={"ref-card-row " + (local.class || "")} {...props}>{local.children}</div>;
}

