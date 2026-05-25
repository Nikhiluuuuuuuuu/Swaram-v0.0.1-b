import { createSignal, onMount, onCleanup, createResource, Show, For } from "solid-js";
import { styled } from "solid-styled-components";
import { Mic, Copy, Star, RotateCcw, Trash2, Play } from "lucide-solid";
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

// --- History Item Component ---
function HistoryItem(props: { item: HistoryEntry, onDelete: (id: number) => void }) {
  return (
    <ItemContainer>
      <ItemHeader>
        <ItemTime>{props.item.timestamp}</ItemTime>
        <ActionIcons>
          <IconButton title="Copy"><Copy size={18} /></IconButton>
          <IconButton title="Star"><Star size={18} /></IconButton>
          <Show when={props.item.failed}>
            <IconButton title="Retry"><RotateCcw size={18} /></IconButton>
          </Show>
          <IconButton title="Delete" onClick={() => props.onDelete(props.item.id)}><Trash2 size={18} /></IconButton>
        </ActionIcons>
      </ItemHeader>
      
      <ItemText class={props.item.failed ? "failed" : ""}>
        {props.item.text}
      </ItemText>
      
      <AudioPlayer>
        <PlayButton>
          <Play size={20} fill="currentColor" />
        </PlayButton>
        <TimeLabel>0:00</TimeLabel>
        <ProgressBarContainer>
          <ProgressBarHandle />
        </ProgressBarContainer>
        <TimeLabel>{props.item.duration || "0:00"}</TimeLabel>
      </AudioPlayer>
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
                        <StartButton>
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
            <HistoryList>
              <For each={filteredHistory()}>
                {(item) => <HistoryItem item={item} onDelete={handleDelete} />}
              </For>
            </HistoryList>
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

const DashboardLayout = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 32px;
  animation: fadeIn 0.4s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const StatsColumn = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 260px;
  flex-shrink: 0;
`;

const MainColumn = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 32px;
  flex-grow: 1;
`;

const HeroSection = styled("div")`
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(var(--shadow-rgb), 0.05);
  display: flex;
  align-items: center;
  min-height: 220px;
`;

const CarouselContainer = styled("div")`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 220px;
`;

const Slide = styled("div")`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 40px;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.97) translateY(10px);
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1), transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 0;

  &.active {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1) translateY(0);
    z-index: 1;
  }
`;

const SlideBackground = styled("div")`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  opacity: 0.8;
  z-index: 0;
  
  &::after {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.4);
  }
`;

const CarouselDots = styled("div")`
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  z-index: 2;
`;

const Dot = styled("button")`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(var(--hover-rgb), 0.15);
  cursor: pointer;
  padding: 0;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  
  &.active {
    background: rgba(var(--hover-rgb), 0.1);
    width: 32px;
    border-radius: 4px;
  }
  
  &:hover {
    background: rgba(var(--hover-rgb), 0.3);
  }
`;

const DotProgress = styled("div")`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: var(--ink);
  transform: scaleX(0);
  transform-origin: left;
  
  .active & {
    animation: fillProgress 10.0s linear forwards;
  }

  @keyframes fillProgress {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
`;

const HeroContent = styled("div")`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Greeting = styled("h1")`
  font-size: 32px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.5px;
  margin: 0;
`;

const HeroSubtext = styled("p")`
  font-size: 16px;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0 0 16px 0;
`;

const StartButton = styled("button")`
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ink);
  color: var(--alabaster-base);
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  width: fit-content;
  box-shadow: 0 4px 14px rgba(var(--shadow-rgb), 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(var(--shadow-rgb), 0.15);
    background: var(--accent);
  }
  
  &:active {
    transform: translateY(0);
  }
`;



const StatsWindow = styled("div")`
  background: var(--alabaster-light);
  border-radius: 12px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  border: 1px solid var(--alabaster-deep);
`;

const StatBlock = styled("div")`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const StatNum = styled("span")`
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 32px;
  color: var(--ink);
`;

const StatText = styled("span")`
  font-size: 16px;
  color: var(--ink-muted);
  font-weight: 400;
`;

const ModelStatBlock = styled("div")`
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid var(--alabaster-deep);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModelName = styled("div")`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ink-muted);
  font-weight: 600;
`;



const HistoryList = styled("div")`
  display: flex;
  flex-direction: column;
  background: var(--alabaster-base);
  border-radius: var(--surface-radius);
  box-shadow: 4px 4px 10px var(--alabaster-shadow), 
              -4px -4px 10px var(--alabaster-light);
  padding: 8px;
`;

const ItemContainer = styled("div")`
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-bottom: 1px solid var(--alabaster-deep);
  
  &:last-child {
    border-bottom: none;
  }
`;

const ItemHeader = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ItemTime = styled("span")`
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
`;

const ActionIcons = styled("div")`
  display: flex;
  gap: 16px;
`;

const IconButton = styled("button")`
  background: none;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  
  &:hover {
    color: var(--ink);
  }
`;

const ItemText = styled("p")`
  font-size: 15px;
  color: var(--ink);
  font-style: italic;
  margin: 0 0 20px 0;
  line-height: 1.5;
  
  &.failed {
    color: #e53935;
  }
`;

const AudioPlayer = styled("div")`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const PlayButton = styled("button")`
  background: none;
  border: none;
  color: var(--ink);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--ink-muted);
  }
`;

const TimeLabel = styled("span")`
  font-size: 13px;
  color: var(--ink-muted);
  min-width: 32px;
`;

const ProgressBarContainer = styled("div")`
  flex-grow: 1;
  height: 4px;
  background-color: var(--alabaster-deep);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  box-shadow: inset 1px 1px 2px var(--alabaster-shadow);
`;

const ProgressBarHandle = styled("div")`
  width: 14px;
  height: 14px;
  background-color: var(--ink);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  box-shadow: 0 1px 3px rgba(var(--shadow-rgb), 0.2);
`;

const EmptyState = styled("div")`
  padding: 20px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`;

const EmptyStateImage = styled("img")`
  width: 100%;
  max-width: 650px;
  border-radius: 20px; /* Smooth corners */
  object-fit: cover;
  box-shadow: 0 10px 40px rgba(var(--shadow-rgb), 0.1);
`;

const EmptyStateText = styled("h2")`
  margin-top: 8px;
  font-family: 'Outfit', 'Inter', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.5;
  max-width: 500px;
  letter-spacing: -0.5px;
`;
