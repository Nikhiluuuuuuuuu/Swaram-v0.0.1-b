import { createSignal, onMount, onCleanup, createResource, Show, For } from "solid-js";

import { Mic, Copy, Trash2, MoreVertical, Flag, Undo, RefreshCw, FileAudio } from "lucide-solid";
import { TabContainer } from "../components/SharedStyles";
import { invoke } from "@tauri-apps/api/core";
import noHistoryBanner from "../assets/images/No_History_Banner.png";

// --- Types ---
type HistoryEntry = {
  id: number;
  text: string;
  timestamp: string;
  duration?: string;
  failed?: boolean;
  model?: string;
};

function HistoryItem(props: { item: HistoryEntry, onDelete: (id: number) => void, onExtract: (id: number) => void }) {
  const [showMenu, setShowMenu] = createSignal(false);
  
  const formattedTime = () => {
    const d = new Date(parseInt(props.item.timestamp) * 1000);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <ItemContainer>
      <ItemTime>{formattedTime()}</ItemTime>
      <ItemText class={props.item.failed ? "failed" : ""}>{props.item.text}</ItemText>
      <ActionsGroup class="actions">
        <ActionBtn title="Copy" onClick={() => navigator.clipboard.writeText(props.item.text)}>
          <Copy size={18} />
        </ActionBtn>
        <ActionBtn title="Flag">
          <Flag size={18} />
        </ActionBtn>
        <div style={{ position: "relative" }}>
          <ActionBtn class="more-btn" title="More options" onClick={() => setShowMenu(!showMenu())}>
            <MoreVertical size={18} />
          </ActionBtn>
          <Show when={showMenu()}>
            <>
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, "z-index": 99 }} onClick={() => setShowMenu(false)} />
              <ContextMenuPopup onClick={() => setShowMenu(false)}>
                <MenuItem onClick={() => {}}>
                  <Undo size={16} /> Undo AI edit
                </MenuItem>
                <MenuItem onClick={() => {}}>
                  <RefreshCw size={16} /> Retry transcript
                </MenuItem>
                <MenuItem class="danger" onClick={() => props.onDelete(props.item.id)}>
                  <Trash2 size={16} /> Delete transcript
                </MenuItem>
                <MenuItem onClick={() => props.onExtract(props.item.id)}>
                  <FileAudio size={16} /> Extract audio
                </MenuItem>
              </ContextMenuPopup>
            </>
          </Show>
        </div>
      </ActionsGroup>
    </ItemContainer>
  );
}

import carouselData from "../data/carousel.json";

const CAROUSEL_SLIDES = carouselData.map(slide => ({
  ...slide,
  subtitle: (time: string) => slide.subtitle.replace("{time}", time)
}));

// --- Main Dashboard Tab ---
export default function DashboardTab(props: { searchQuery?: string }) {
  const [time, setTime] = createSignal(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [currentSlide, setCurrentSlide] = createSignal(0);

  let timer: number;
  let slideTimer: number;
  onMount(() => {
    timer = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    
    slideTimer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 10000);
  });
  
  onCleanup(() => {
    if (timer) window.clearInterval(timer);
    if (slideTimer) window.clearInterval(slideTimer);
  });

  // History Logic
  const fetchHistory = async () => {
    return await invoke<HistoryEntry[]>("get_history");
  };

  const [history, { refetch }] = createResource<HistoryEntry[]>(fetchHistory);

  const handleDelete = async (id: number) => {
    try {
      await invoke("delete_history_item", { id });
      refetch();
    } catch (e) {
      console.error("Failed to delete history item", e);
    }
  };

  const filteredHistory = () => {
    const list = history() || [];
    if (!props.searchQuery) return list;
    const q = props.searchQuery.toLowerCase();
    return list.filter(item => item.text.toLowerCase().includes(q));
  };

  const groupedHistory = () => {
    const list = filteredHistory();
    const groups: Record<string, HistoryEntry[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    list.forEach(item => {
      const date = new Date(parseInt(item.timestamp) * 1000);
      let dayLabel = date.toLocaleDateString();
      if (date.toDateString() === today.toDateString()) {
        dayLabel = "TODAY";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dayLabel = "YESTERDAY";
      }
      
      if (!groups[dayLabel]) {
        groups[dayLabel] = [];
      }
      groups[dayLabel].push(item);
    });
    
    return Object.entries(groups).sort((a, b) => {
      const dateA = parseInt(a[1][0].timestamp);
      const dateB = parseInt(b[1][0].timestamp);
      return dateB - dateA; // descending
    });
  };

  const handleExtract = async (id: number) => {
    try {
      await invoke("extract_history_audio", { id });
    } catch (e) {
      console.error("Failed to extract audio", e);
      alert(e);
    }
  };

  const statsByModel = () => {
    const list = history() || [];
    const stats: Record<string, number> = {};
    let totalWords = 0;

    list.forEach(item => {
      const w = item.text.trim() ? item.text.trim().split(/\s+/).length : 0;
      totalWords += w;
      const m = item.model || "Unknown Model";
      stats[m] = (stats[m] || 0) + w;
    });

    return {
      totalWords,
      totalTimeSaved: Math.round(totalWords / 40),
      models: Object.entries(stats).map(([name, words]) => ({
        name,
        words,
        timeSaved: Math.round(words / 40)
      }))
    };
  };

  const formatNum = (num: number) => {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toString();
  };

  return (
    <TabContainer style={{ padding: "0" }}>
      <DashboardLayout>
        <MainColumn>
          {/* Hero Section */}
          <HeroSection>
            <CarouselContainer>
              <For each={CAROUSEL_SLIDES}>
                {(slide, index) => (
                  <Slide class={currentSlide() === index() ? "active" : ""}>
                    <SlideBackground style={{ background: slide.bg }} />
                    <HeroContent>
                      <Greeting>{slide.title}</Greeting>
                      <HeroSubtext>{slide.subtitle(time())}</HeroSubtext>
                      <Show when={slide.showButton}>
                        <StartButton onClick={() => {
                          window.dispatchEvent(new CustomEvent("toggle_dictation"));
                        }}>
                          <Mic size={18} />
                          <span>Start Dictation</span>
                        </StartButton>
                      </Show>
                    </HeroContent>
                  </Slide>
                )}
              </For>
            </CarouselContainer>
            
            <CarouselDots>
              <For each={CAROUSEL_SLIDES}>
                {(_, index) => (
                  <Dot 
                    class={currentSlide() === index() ? "active" : ""} 
                    onClick={() => setCurrentSlide(index())} 
                  >
                    <DotProgress />
                  </Dot>
                )}
              </For>
            </CarouselDots>
          </HeroSection>

          <Show when={filteredHistory().length > 0} fallback={
            <EmptyState>
              <EmptyStateImage src={noHistoryBanner} alt="No history available" />
              <EmptyStateText>
                Are you still using a traditional typing method? <br/>
                Haven't used our application yet?
              </EmptyStateText>
            </EmptyState>
          }>
            <div style={{ display: "flex", "flex-direction": "column", gap: "24px" }}>
              <For each={groupedHistory()}>
                {([dateLabel, items]) => (
                  <div>
                    <DateHeader>{dateLabel}</DateHeader>
                    <HistoryList>
                      <For each={items}>
                        {(item) => <HistoryItem item={item} onDelete={handleDelete} onExtract={handleExtract} />}
                      </For>
                    </HistoryList>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </MainColumn>

        <StatsColumn>
          <StatsWindow>
            <StatBlock>
              <StatNum>{formatNum(statsByModel().totalWords)}</StatNum>
              <StatText>total words</StatText>
            </StatBlock>
            <StatBlock>
              <StatNum>{statsByModel().totalTimeSaved}</StatNum>
              <StatText>mins saved</StatText>
            </StatBlock>
            
            <For each={statsByModel().models}>
              {(modelStat) => (
                <ModelStatBlock>
                  <ModelName>{modelStat.name}</ModelName>
                  <StatBlock>
                    <StatNum>{formatNum(modelStat.words)}</StatNum>
                    <StatText>words</StatText>
                  </StatBlock>
                  <StatBlock>
                    <StatNum>{modelStat.timeSaved}</StatNum>
                    <StatText>mins saved</StatText>
                  </StatBlock>
                </ModelStatBlock>
              )}
            </For>
          </StatsWindow>
        </StatsColumn>
      </DashboardLayout>
    </TabContainer>
  );
}

// --- CSS STYLES ---

function DashboardLayout(props: any) {
  const local = props;
  return <div class={"dashboard-layout " + (local.class || "")} {...props}>{local.children}</div>;
}


function StatsColumn(props: any) {
  const local = props;
  return <div class={"stats-column " + (local.class || "")} {...props}>{local.children}</div>;
}


function MainColumn(props: any) {
  const local = props;
  return <div class={"main-column " + (local.class || "")} {...props}>{local.children}</div>;
}


function HeroSection(props: any) {
  const local = props;
  return <div class={"hero-section " + (local.class || "")} {...props}>{local.children}</div>;
}


function CarouselContainer(props: any) {
  const local = props;
  return <div class={"carousel-container " + (local.class || "")} {...props}>{local.children}</div>;
}


function Slide(props: any) {
  const local = props;
  return <div class={"slide " + (local.class || "")} {...props}>{local.children}</div>;
}


function SlideBackground(props: any) {
  const local = props;
  return <div class={"slide-background " + (local.class || "")} {...props}>{local.children}</div>;
}


function CarouselDots(props: any) {
  const local = props;
  return <div class={"carousel-dots " + (local.class || "")} {...props}>{local.children}</div>;
}


function Dot(props: any) {
  const local = props;
  return <button class={"dot " + (local.class || "")} {...props}>{local.children}</button>;
}


function DotProgress(props: any) {
  const local = props;
  return <div class={"dot-progress " + (local.class || "")} {...props}>{local.children}</div>;
}


function HeroContent(props: any) {
  const local = props;
  return <div class={"hero-content " + (local.class || "")} {...props}>{local.children}</div>;
}


function Greeting(props: any) {
  const local = props;
  return <h1 class={"greeting " + (local.class || "")} {...props}>{local.children}</h1>;
}


function HeroSubtext(props: any) {
  const local = props;
  return <p class={"hero-subtext " + (local.class || "")} {...props}>{local.children}</p>;
}


function StartButton(props: any) {
  const local = props;
  return <button class={"start-button " + (local.class || "")} {...props}>{local.children}</button>;
}




function StatsWindow(props: any) {
  const local = props;
  return <div class={"stats-window " + (local.class || "")} {...props}>{local.children}</div>;
}


function StatBlock(props: any) {
  const local = props;
  return <div class={"stat-block " + (local.class || "")} {...props}>{local.children}</div>;
}


function StatNum(props: any) {
  const local = props;
  return <span class={"stat-num " + (local.class || "")} {...props}>{local.children}</span>;
}


function StatText(props: any) {
  const local = props;
  return <span class={"stat-text " + (local.class || "")} {...props}>{local.children}</span>;
}


function ModelStatBlock(props: any) {
  const local = props;
  return <div class={"model-stat-block " + (local.class || "")} {...props}>{local.children}</div>;
}


function ModelName(props: any) {
  const local = props;
  return <div class={"model-name " + (local.class || "")} {...props}>{local.children}</div>;
}




function DateHeader(props: any) {
  const local = props;
  return <div class={"date-header " + (local.class || "")} {...props}>{local.children}</div>;
}


function HistoryList(props: any) {
  const local = props;
  return <div class={"history-list " + (local.class || "")} {...props}>{local.children}</div>;
}


function ItemContainer(props: any) {
  const local = props;
  return <div class={"item-container " + (local.class || "")} {...props}>{local.children}</div>;
}


function ItemTime(props: any) {
  const local = props;
  return <div class={"item-time " + (local.class || "")} {...props}>{local.children}</div>;
}


function ItemText(props: any) {
  const local = props;
  return <div class={"item-text " + (local.class || "")} {...props}>{local.children}</div>;
}


function ActionsGroup(props: any) {
  const local = props;
  return <div class={"actions-group " + (local.class || "")} {...props}>{local.children}</div>;
}


function ActionBtn(props: any) {
  const local = props;
  return <button class={"action-btn " + (local.class || "")} {...props}>{local.children}</button>;
}


function ContextMenuPopup(props: any) {
  const local = props;
  return <div class={"context-menu-popup " + (local.class || "")} {...props}>{local.children}</div>;
}


function MenuItem(props: any) {
  const local = props;
  return <button class={"menu-item " + (local.class || "")} {...props}>{local.children}</button>;
}


function EmptyState(props: any) {
  const local = props;
  return <div class={"empty-state " + (local.class || "")} {...props}>{local.children}</div>;
}


function EmptyStateImage(props: any) {
  const local = props;
  return <img class={"empty-state-image " + (local.class || "")} {...props}>{local.children}</img>;
}


function EmptyStateText(props: any) {
  const local = props;
  return <h2 class={"empty-state-text " + (local.class || "")} {...props}>{local.children}</h2>;
}

