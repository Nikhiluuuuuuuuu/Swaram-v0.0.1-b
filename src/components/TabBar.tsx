import { For, createSignal } from "solid-js";
import { Keyboard, Cpu, Settings, Clock, ChevronLeft, ChevronRight, LayoutDashboard, Book, Code, Music, Sliders } from "lucide-solid";
import logoSvg from "../assets/logo.svg";

export interface TabItem {
  id: string;
  label: string;
  icon: "keyboard" | "cpu" | "settings" | "clock" | "layout-dashboard" | "book" | "code" | "music" | "sliders";
}

const icons = {
  keyboard: Keyboard,
  cpu: Cpu,
  settings: Settings,
  clock: Clock,
  "layout-dashboard": LayoutDashboard,
  book: Book,
  code: Code,
  music: Music,
  sliders: Sliders,
};

export default function TabBar(props: {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const topTabs = () => props.tabs.filter(t => t.id !== "settings");
  const settingsTab = () => props.tabs.find(t => t.id === "settings");

  return (
    <aside class={`sidebar-container ${isCollapsed() ? "collapsed" : ""}`}>
      <div class="top-nav">
        <div class="logo-area" onClick={() => setIsCollapsed(!isCollapsed())}>
          <div class="logo-wrapper">
            <div class="brand-logo">
              <img src={logoSvg} alt="Swaram Logo" class="logo-img" />
              <div class="collapse-icon">
                {isCollapsed() ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </div>
            </div>
            <h1 class={`logo-text ${isCollapsed() ? "hidden" : ""}`}>Swaram</h1>
          </div>
        </div>

        <div class="tab-list">
          <For each={topTabs()}>
            {(tab) => {
              const IconComponent = icons[tab.icon];
              return (
                <button
                  class={`tab-button ${props.activeTab === tab.id ? "active" : ""} tab-${tab.id}`}
                  onClick={() => props.onTabChange(tab.id)}
                  title={isCollapsed() ? tab.label : ""}
                >
                  <div class="icon-wrapper">
                    <IconComponent size={20} />
                  </div>
                  <span class={`tab-label ${isCollapsed() ? "hidden" : ""}`}>{tab.label}</span>
                </button>
              );
            }}
          </For>
        </div>
      </div>
      
      <div class="bottom-nav">
        {settingsTab() && (() => {
          const tab = settingsTab()!;
          const IconComponent = icons[tab.icon];
          return (
            <button
              class={`tab-button ${props.activeTab === tab.id ? "active" : ""} tab-${tab.id}`}
              onClick={() => props.onTabChange(tab.id)}
              title={isCollapsed() ? tab.label : ""}
            >
              <div class="icon-wrapper">
                <IconComponent size={20} />
              </div>
              <span class={`tab-label ${isCollapsed() ? "hidden" : ""}`}>{tab.label}</span>
            </button>
          );
        })()}
      </div>
    </aside>
  );
}

// removed styled definitions



