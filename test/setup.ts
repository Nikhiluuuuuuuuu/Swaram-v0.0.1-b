import { vi } from "vitest";

const noopWindow = {
  close: vi.fn(),
  minimize: vi.fn(),
  outerSize: vi.fn(async () => ({ width: 480, height: 140 })),
  setPosition: vi.fn(),
  show: vi.fn(),
  setFocus: vi.fn(),
  toggleMaximize: vi.fn(),
};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string) => {
    if (command === "get_all_config") return {};
    if (command === "load_config") return "";
    if (command === "get_installed_models") return [];
    if (command === "register_app_shortcuts") return { registered: [], warnings: [] };
    return undefined;
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => vi.fn()),
}));

vi.mock("@tauri-apps/api/window", () => ({
  availableMonitors: vi.fn(async () => []),
  getCurrentWindow: vi.fn(() => noopWindow),
}));

vi.mock("@tauri-apps/plugin-global-shortcut", () => ({
  register: vi.fn(async () => undefined),
  unregisterAll: vi.fn(async () => undefined),
}));
