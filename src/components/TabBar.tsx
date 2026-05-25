import { For, createSignal } from "solid-js";
import { styled } from "solid-styled-components";
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
    <SidebarContainer class={isCollapsed() ? "collapsed" : ""}>
      <TopNav>
        <LogoArea onClick={() => setIsCollapsed(!isCollapsed())}>
          <LogoWrapper>
            <BrandLogo>
              <img src={logoSvg} alt="Swaram Logo" class="logo-img" />
              <div class="collapse-icon">
                {isCollapsed() ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </div>
            </BrandLogo>
            <LogoText class={isCollapsed() ? "hidden" : ""}>Swaram</LogoText>
          </LogoWrapper>
        </LogoArea>

        <TabList>
          <For each={topTabs()}>
            {(tab) => {
              const IconComponent = icons[tab.icon];
              return (
                <TabButton
                  class={`${props.activeTab === tab.id ? "active" : ""} tab-${tab.id}`}
                  onClick={() => props.onTabChange(tab.id)}
                  title={isCollapsed() ? tab.label : ""}
                >
                  <IconWrapper>
                    <IconComponent size={20} />
                  </IconWrapper>
                  <TabLabel class={isCollapsed() ? "hidden" : ""}>{tab.label}</TabLabel>
                </TabButton>
              );
            }}
          </For>
        </TabList>
      </TopNav>
      
      <BottomNav>
        {settingsTab() && (() => {
          const tab = settingsTab()!;
          const IconComponent = icons[tab.icon];
          return (
            <TabButton
              class={`${props.activeTab === tab.id ? "active" : ""} tab-${tab.id}`}
              onClick={() => props.onTabChange(tab.id)}
              title={isCollapsed() ? tab.label : ""}
            >
              <IconWrapper>
                <IconComponent size={20} />
              </IconWrapper>
              <TabLabel class={isCollapsed() ? "hidden" : ""}>{tab.label}</TabLabel>
            </TabButton>
          );
        })()}
      </BottomNav>
    </SidebarContainer>
  );
}

// --- CSS LOGIC ---
const SidebarContainer = styled("aside")`
  width: 220px;
  background: var(--alabaster-base);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: width 0.3s var(--transition);
  padding: 24px 16px;
  
  &.collapsed {
    width: 72px;
    padding: 24px 10px;
  }
`;

const TopNav = styled("div")``;
const BottomNav = styled("div")``;

const LogoArea = styled("div")`
  padding: 8px 10px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(var(--hover-rgb), 0.04);
  }
`;

const LogoWrapper = styled("div")`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BrandLogo = styled("div")`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  
  .logo-img {
    width: 28px;
    height: 28px;
    transition: opacity 0.2s, transform 0.2s;
  }
  
  .collapse-icon {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.2s, transform 0.2s;
    color: var(--ink);
  }

  &:hover .logo-img {
    opacity: 0;
    transform: scale(0.8);
  }
  
  &:hover .collapse-icon {
    opacity: 1;
    transform: scale(1);
  }
`;

const LogoText = styled("h1")`
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.5px;
  transition: opacity 0.2s;
  white-space: nowrap;
  
  &.hidden {
    opacity: 0;
    pointer-events: none;
    width: 0;
  }
`;



const TabList = styled("div")`
  display: flex;
  flex-direction: column;
  list-style: none;
`;

const TabButton = styled("button")`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  gap: 14px;
  font-weight: 500;
  color: var(--ink-muted);
  font-family: 'Inter', sans-serif;
  text-align: left;
  white-space: nowrap;
  
  &:hover {
    color: var(--ink);
    background: var(--alabaster-light);
  }

  &.active {
    font-weight: 600;
    color: var(--ink);
    background: var(--alabaster-deep);
  }
`;

const IconWrapper = styled("div")`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
`;

const TabLabel = styled("span")`
  font-size: 14px;
  transition: opacity 0.2s;
  
  &.hidden {
    opacity: 0;
    width: 0;
  }
`;


