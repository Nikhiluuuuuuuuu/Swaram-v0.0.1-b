import { createSignal, Match, Switch, onMount } from "solid-js";
import { styled, createGlobalStyles } from "solid-styled-components";
import TabBar, { TabItem } from "./components/TabBar";
import TitleBar from "./components/TitleBar";
import { invoke } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

// Tabs imports
import DashboardTab from "./pages/DashboardTab";
import ModelsTab from "./pages/ModelsTab";
import DictionaryTab from "./pages/DictionaryTab";
import SnippetsTab from "./pages/SnippetsTab";
import TonesTab from "./pages/TonesTab";
import ModesTab from "./pages/ModesTab";
import SettingsModal from "./components/SettingsModal";
import tabsData from "./data/tabs.json";

// --- GLOBAL CSS ---
const GlobalStyles = createGlobalStyles`
  :root {
    color-scheme: light;
    
    --alabaster-base: #f4f2ef;
    --alabaster-light: #ffffff;
    --alabaster-shadow: #d1cfcc;
    --alabaster-deep: #e8e6e3;
    --ink: #2d2d2d;
    --ink-muted: #6e6e6e;
    --accent: #5e5e5e;
    --shadow-rgb: 0, 0, 0;
    --hover-rgb: 0, 0, 0;
    --surface-radius: 24px;
    --inner-radius: 12px;
    --transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  [data-theme="dark"] {
    color-scheme: dark;
    --alabaster-base: #1c2128;
    --alabaster-light: #22272e;
    --alabaster-shadow: #2d333b;
    --alabaster-deep: #373e47;
    --ink: #adbac7;
    --ink-muted: #768390;
    --accent: #539bf5;
    --shadow-rgb: 15, 18, 22;
    --hover-rgb: 173, 186, 199;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    background-color: var(--alabaster-base);
    overflow: hidden; 
    user-select: none;
    color: var(--ink);
    cursor: default;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--alabaster-base); 
  }
  ::-webkit-scrollbar-thumb {
    background: var(--alabaster-deep); 
    border-radius: 10px;
  }
`;

// --- LOGIC A: Main Application Shell ---
const TABS = tabsData as TabItem[];

const TextureOverlay = styled("div")`
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3ExternalIcon %3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
`;

export default function App() {
  const [activeTab, setActiveTabSignal] = createSignal("dashboard");
  const [tabHistory, setTabHistory] = createSignal<string[]>(["dashboard"]);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  onMount(async () => {
    try {
      const config = await invoke<Record<string, string>>("get_all_config");
      const savedTheme = config?.theme?.toLowerCase() || 'system';
      
      const applyTheme = (theme: string) => {
        if (theme === 'dark' || theme === 'light') {
          document.documentElement.setAttribute('data-theme', theme);
        } else {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        }
      };

      applyTheme(savedTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // Re-read config or just assume if it's 'system', we update
        invoke<Record<string, string>>("get_all_config").then(cfg => {
          const t = cfg?.theme?.toLowerCase() || 'system';
          if (t === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
          }
        });
      });
    } catch (e) {
      console.error("Failed to load config for theme", e);
    }
    
    // Global Shortcut Registration
    try {
      const config = await invoke<Record<string, string>>("get_all_config");
      await unregisterAll(); // Clear any existing
      
      const toggleShortcut = config["shortcut_toggle"] || "Ctrl+Shift+R";
      if (toggleShortcut) {
        await register(toggleShortcut, (event) => {
          if (event.state === "Pressed") {
            // Trigger start/stop logic
            console.log("Toggle Dictation Shortcut triggered!");
            // E.g., dispatch custom event or call a global store
            window.dispatchEvent(new CustomEvent("toggle_dictation"));
          }
        });
      }
      
      const holdShortcut = config["shortcut_hold"] || "Alt+Space";
      if (holdShortcut) {
        await register(holdShortcut, (event) => {
           if (event.state === "Pressed") {
             window.dispatchEvent(new CustomEvent("hold_dictation_start"));
           } else if (event.state === "Released") {
             window.dispatchEvent(new CustomEvent("hold_dictation_stop"));
           }
        });
      }
      
      const cancelShortcut = config["shortcut_cancel"] || "Esc";
      if (cancelShortcut) {
        await register(cancelShortcut, (event) => {
           if (event.state === "Pressed") {
             window.dispatchEvent(new CustomEvent("cancel_dictation"));
           }
        });
      }
    } catch (e) {
      console.error("Failed to register global shortcuts:", e);
    }
  });

  const setActiveTab = (tab: string) => {
    if (tab === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    if (tab === activeTab()) return;
    setTabHistory((prev) => [...prev, tab]);
    setActiveTabSignal(tab);
  };

  const goBack = () => {
    setTabHistory((prev) => {
      if (prev.length <= 1) return prev;
      const newHistory = [...prev];
      newHistory.pop(); // remove current tab
      setActiveTabSignal(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  };

  const activeTabLabel = () => TABS.find(t => t.id === activeTab())?.label || "Settings";
  const canGoBack = () => tabHistory().length > 1;

  return (
    <AppLayout>
      <TextureOverlay />
      <GlobalStyles />
      <TitleBar 
        activeTabLabel={activeTabLabel()} 
        canGoBack={canGoBack()} 
        onBack={goBack} 
      />
      <MainContainer>
        <TabBar tabs={TABS} activeTab={activeTab()} onTabChange={setActiveTab} />
        <ContentArea>
        <Switch fallback={<div>Not Found</div>}>
          <Match when={activeTab() === "dashboard"}><DashboardTab /></Match>
          <Match when={activeTab() === "models"}><ModelsTab /></Match>
          <Match when={activeTab() === "dictionary"}><DictionaryTab /></Match>
          <Match when={activeTab() === "snippets"}><SnippetsTab /></Match>
          <Match when={activeTab() === "tones"}><TonesTab /></Match>
          <Match when={activeTab() === "modes"}><ModesTab /></Match>
        </Switch>
      </ContentArea>
      </MainContainer>
      
      <SettingsModal isOpen={isSettingsOpen()} onClose={() => setIsSettingsOpen(false)} />
    </AppLayout>
  );
}

// --- CSS LOGIC A ---
const AppLayout = styled("div")`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--alabaster-base);
`;

const MainContainer = styled("div")`
  display: flex;
  flex-grow: 1;
  overflow: hidden;
`;

const ContentArea = styled("main")`
  flex-grow: 1;
  padding: 24px;
  overflow-y: auto;
  position: relative;
  background-color: var(--alabaster-light);
  border-radius: 16px;
  margin: 0 16px 16px 0;
  box-shadow: 0 8px 30px rgba(var(--shadow-rgb), 0.03);
`;
