import { invoke } from "@tauri-apps/api/core";

const ACTIVE_MODEL_CONFIG_KEY = "active_model";

export function formatTauriError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function loadModel(modelName: string) {
  await invoke<void>("load_model", { modelName });
}

export async function loadConfiguredModel() {
  const modelName = await invoke<string>("load_config", {
    key: ACTIVE_MODEL_CONFIG_KEY,
  });

  if (!modelName.trim()) {
    return false;
  }

  await loadModel(modelName);
  return true;
}

export async function activateModel(modelName: string) {
  await loadModel(modelName);
  await invoke<void>("save_config", {
    key: ACTIVE_MODEL_CONFIG_KEY,
    value: modelName,
  });
}

export async function toggleDictation() {
  await invoke<void>("toggle_dictation");
}

export interface ShortcutRegistrationReport {
  registered: { action: string; shortcut: string }[];
  warnings: string[];
}

export async function registerAppShortcuts(): Promise<ShortcutRegistrationReport> {
  const report = await invoke<ShortcutRegistrationReport>("register_app_shortcuts");
  if (report.warnings && report.warnings.length > 0) {
    console.warn("Shortcut registration warnings:", report.warnings);
  }
  if (report.registered && report.registered.length > 0) {
    console.log("Registered shortcuts:", report.registered.map(s => `${s.action}: ${s.shortcut}`).join(", "));
  }
  return report;
}

export async function unregisterAppShortcuts() {
  await invoke<void>("unregister_app_shortcuts");
}
