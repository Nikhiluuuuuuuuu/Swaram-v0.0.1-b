import { createSignal, onMount, onCleanup, Show, Switch, Match } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import TabBar, { TabItem } from "./components/TabBar";
import TitleBar from "./components/TitleBar";
import { invoke } from "@tauri-apps/api/core";

// Tabs imports
import DashboardTab from "./pages/DashboardTab";
import ModelsTab from "./pages/ModelsTab";
import DictionaryTab from "./pages/DictionaryTab";
import SnippetsTab from "./pages/SnippetsTab";
import TonesTab from "./pages/TonesTab";
import ModesTab from "./pages/ModesTab";
import SettingsModal from "./components/SettingsModal";
import tabsData from "./data/tabs.json";
import {
  formatTauriError,
  loadConfiguredModel,
  registerAppShortcuts,
  toggleDictation,
} from "./dictation";

// --- GLOBAL CSS ---

// --- LOGIC A: Main Application Shell ---
const TABS = tabsData as TabItem[];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const activeTabId = () => {
    const path = location.pathname.replace(/^\//, "");
    return path || "dashboard";
  };
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [modelView, setModelView] = createSignal<"marketplace" | "downloaded">("marketplace");
  let mediaQuery: MediaQueryList | null = null;

  const applyTheme = (theme: string) => {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
      return;
    }

    const isDark = typeof window.matchMedia === "function"
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };

  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    invoke<Record<string, string>>("get_all_config").then(cfg => {
      const theme = cfg?.theme?.toLowerCase() || 'system';
      if (theme === 'system') {
        document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
      }
    });
  };

  const handleToggleDictation = () => {
    toggleDictation().catch((error) => {
      alert(`Dictation Error: ${formatTauriError(error)}`);
    });
  };

  onMount(async () => {
    try {
      const config = await invoke<Record<string, string>>("get_all_config");
      const savedTheme = config?.theme?.toLowerCase() || 'system';
      applyTheme(savedTheme);

      if (typeof window.matchMedia === "function") {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      }
    } catch (e) {
      console.error("Failed to load config for theme", e);
    }

    registerAppShortcuts().catch((error) => {
      console.error("Failed to register app shortcuts:", error);
    });
    loadConfiguredModel().catch((error) => {
      console.warn("Active model preload failed:", error);
    });

    // Listen for shortcut reload events from SettingsModal
    window.addEventListener("reload_shortcuts", registerAppShortcuts);
    window.addEventListener("toggle_dictation", handleToggleDictation);
  });

  onCleanup(() => {
    mediaQuery?.removeEventListener('change', handleSystemThemeChange);
    window.removeEventListener("reload_shortcuts", registerAppShortcuts);
    window.removeEventListener("toggle_dictation", handleToggleDictation);
  });

  const setActiveTab = (tab: string) => {
    if (tab === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    navigate(`/${tab}`);
  };

  const goBack = () => {
    navigate(-1);
  };

  const activeTabLabel = () => TABS.find(t => t.id === activeTabId())?.label || "Settings";
  const canGoBack = () => window.history.length > 1;

  return (
    <div class="app-layout">
      <div class="texture-overlay" />
      <TitleBar 
        activeTabLabel={activeTabLabel()} 
        canGoBack={canGoBack()} 
        onBack={goBack} 
        centerContent={
          <Show when={activeTabId() === "models"}>
            <div class="pill-nav">
              <button 
                class={`pill-button ${modelView() === "marketplace" ? "active" : ""}`} 
                onClick={() => setModelView("marketplace")}
              >
                Marketplace
              </button>
              <button 
                class={`pill-button ${modelView() === "downloaded" ? "active" : ""}`} 
                onClick={() => setModelView("downloaded")}
              >
                Downloaded
              </button>
            </div>
          </Show>
        }
      />
      <div class="main-container">
        <TabBar tabs={TABS} activeTab={activeTabId()} onTabChange={setActiveTab} />
        <main class="content-area">
          <Switch fallback={<DashboardTab />}>
            <Match when={activeTabId() === "dashboard"}><DashboardTab /></Match>
            <Match when={activeTabId() === "models"}><ModelsTab activeView={modelView()} /></Match>
            <Match when={activeTabId() === "dictionary"}><DictionaryTab /></Match>
            <Match when={activeTabId() === "snippets"}><SnippetsTab /></Match>
            <Match when={activeTabId() === "tones"}><TonesTab /></Match>
            <Match when={activeTabId() === "modes"}><ModesTab /></Match>
          </Switch>
        </main>
      </div>
      
      <SettingsModal isOpen={isSettingsOpen()} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
