import { createResource, createSignal, Show, For } from "solid-js";
import { styled } from "solid-styled-components";
import { ModalOverlay, ToggleSwitch, MonoValue } from "./SharedStyles";
import { invoke } from "@tauri-apps/api/core";
import { unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { Cloud, Sliders, Monitor, Mic, Keyboard } from "lucide-solid";

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

export function ShortcutItem(props: { label: string; shortcut: string; onChange: (val: string) => void }) {
  const [editing, setEditing] = createSignal(false);

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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!editing()) return;
    e.preventDefault();
    e.stopPropagation();

    // Only cancel if Esc is pressed without modifiers
    if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      setEditing(false);
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
    
    props.onChange(newShortcut);
    setEditing(false);
  };

  return (
    <RefCardRow>
      <span>{props.label}</span>
      <ShortcutButton 
        class={editing() ? "editing" : ""}
        onClick={() => {
          // Temporarily unregister all global shortcuts while editing so they don't intercept!
          unregisterAll().catch(e => console.error(e)).finally(() => setEditing(true));
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setEditing(false);
          // Reload shortcuts in App.tsx by dispatching an event
          window.dispatchEvent(new CustomEvent("reload_shortcuts"));
        }}
      >
        <Show when={editing()} fallback={
          <For each={props.shortcut.split('+')}>
            {(key) => <Keycap>{key}</Keycap>}
          </For>
        }>
          <Keycap style={{ "border-color": "#5e5e5e", "box-shadow": "0 2px 0 #5e5e5e" }}>Listening...</Keycap>
        </Show>
      </ShortcutButton>
    </RefCardRow>
  );
}

const ShortcutButton = styled("button")`
  display: flex;
  gap: 6px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0,0,0,0.03);
  }
  &.editing {
    background-color: rgba(0,0,0,0.03);
  }
`;

const Keycap = styled("kbd")`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #d1cfcc;
  box-shadow: 0 1px 1px rgba(0,0,0,0.05), 0 2px 0 #d1cfcc;
  border-radius: 6px;
  padding: 4px 8px;
  min-width: 28px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #2d2d2d;
`;

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
      <RefSelect value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <For each={props.options}>
          {(opt) => <option value={opt}>{opt}</option>}
        </For>
      </RefSelect>
    </RefCardRow>
  );
}

const RefSelect = styled("select")`
  background-color: #ffffff;
  color: #2d2d2d;
  border: 1px solid #e0dfdc;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 14px;
  outline: none;
  min-width: 140px;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 200px;

  &:focus {
    border-color: #5e5e5e;
  }
`;

// --- Main Modal ---

export default function SettingsModal(props: { isOpen: boolean; onClose: () => void }) {
  const [activeSection, setActiveSection] = createSignal("General");

  const [hardware] = createResource<HardwareOptions>(async () => {
    return await invoke("get_hardware_options");
  });

  const [config, { mutate }] = createResource<Record<string, string>>(async () => {
    return await invoke("get_all_config");
  });

  const saveConfig = (k: string, v: string) => {
    if (config()) {
      mutate((prev) => prev ? { ...prev, [k]: v } : { [k]: v });
    }
    invoke("save_config", { key: k, value: v });
  };

  const SHORTCUT_CONFIGS = [
    { id: "shortcut_toggle", label: "Start/Stop Recording", default: "Ctrl+Shift+R" },
    { id: "shortcut_hold", label: "Hold to Record", default: "Alt+Space" },
    { id: "shortcut_cancel", label: "Cancel Recording", default: "Esc" },
  ];

  return (
    <Show when={props.isOpen && config()}>
      <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }} style={{ "z-index": 10001, "background-color": "rgba(0,0,0,0.2)" }}>
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

              <RefSectionTitle>Keyboard</RefSectionTitle>
              <RefCardGroup>
                <DropdownFeature 
                  title="Keyboard Implementation" 
                  options={["Handy Keys", "Tauri Global Shortcut"]} 
                  value={config()!["keyboard_implementation"] || "Handy Keys"}
                  onChange={(v) => saveConfig("keyboard_implementation", v)}
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
                      onChange={(val) => saveConfig("microphone_volume", val.toString())} 
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

const RefModalContent = styled("div")`
  display: flex;
  width: 90%;
  max-width: 900px;
  height: 80vh;
  max-height: 650px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #2d2d2d;
`;

const RefSidebar = styled("div")`
  width: 240px;
  background-color: #f8f7f5;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #e0dfdc;
`;

const RefSidebarSection = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RefSidebarSubhead = styled("div")`
  font-size: 11px;
  font-weight: 700;
  color: #8c8b88;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-left: 12px;
`;

const RefSidebarItem = styled("button")`
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  text-align: left;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  color: #2d2d2d;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: #ecebe9;
  }
  &.active {
    background: #ecebe9;
    font-weight: 600;
  }
`;

const RefSidebarFooter = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: #8c8b88;
`;

const RefContentArea = styled("div")`
  flex: 1;
  background-color: #ffffff;
  padding: 48px;
  overflow-y: auto;
`;

const RefTitle = styled("h1")`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 28px;
  font-weight: 500;
  color: #2d2d2d;
  margin: 0 0 40px 0;
`;

const RefSectionTitle = styled("h3")`
  font-size: 13px;
  font-weight: 600;
  color: #2d2d2d;
  margin: 0 0 12px 4px;
`;

const RefCardGroup = styled("div")`
  background: #f4f3f1;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  margin-bottom: 32px;
  overflow: hidden;
`;

const RefCardRow = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  font-size: 14px;
  font-weight: 500;

  &:last-child {
    border-bottom: none;
  }
`;
