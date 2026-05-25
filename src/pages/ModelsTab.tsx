import { createSignal, onMount, For, Show } from "solid-js";
import { styled, keyframes } from "solid-styled-components";
import { TabContainer, Title, Description, PrimaryButton } from "../components/SharedStyles";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// --- TYPES ---
interface HfTreeFile {
  type: string;
  path: string;
  size: number;
}

interface HfModel {
  _id: string;
  id: string;
  tags: string[];
  downloads: number;
}

interface SystemSpecs {
  ram_gb: number;
  cpu_cores: number;
  gpu_name: string;
}

interface ModelRecord {
  id: string;
  name: string;
  status: string; // "installed", "downloading", "failed"
  local_path: string | null;
}

interface DownloadProgress {
  id: string;
  bytes_downloaded: number;
  total_bytes: number;
}

// --- LOGIC: Model Marketplace ---
export default function ModelsTab(props: { searchQuery?: string }) {
  const [hfModels, setHfModels] = createSignal<HfModel[]>([]);
  const [modelSizes, setModelSizes] = createSignal<Record<string, number>>({});
  const [installedModels, setInstalledModels] = createSignal<Record<string, ModelRecord>>({});
  const [progress, setProgress] = createSignal<Record<string, number>>({});
  const [loading, setLoading] = createSignal(true);
  const [activeModel, setActiveModel] = createSignal<string | null>(null);
  const [systemSpecs, setSystemSpecs] = createSignal<SystemSpecs | null>(null);
  
  const [skip, setSkip] = createSignal(0);
  const [localSearch, setLocalSearch] = createSignal("");
  
  const limit = 10;

  const fetchHfModels = async (queryStr: string, currentSkip: number) => {
    try {
      setLoading(true);
      
      const filters = ["automatic-speech-recognition"];
      const filterStr = filters.join(",");
      
      let q = `${queryStr} gguf`.trim();
      if (q === "gguf") q = "whisper gguf";
      
      const models = await invoke<HfModel[]>("search_huggingface_models", { 
        query: q, 
        filters: filterStr,
        limit, 
        skip: currentSkip 
      });
      
      setHfModels(models);

      // Fetch sizes in background for Estimated Speed display
      const newSizes: Record<string, number> = {};
      const fetchPromises = models.map(async (model) => {
        try {
          const tree = await invoke<HfTreeFile[]>("get_huggingface_model_tree", { modelId: model.id });
          const file = tree.find(f => f.path.endsWith('.gguf') || f.path.endsWith('.bin'));
          if (file && file.size) {
            newSizes[model.id] = file.size;
          }
        } catch (e) {
          console.error("Tree fetch failed for", model.id, e);
        }
      });
      
      await Promise.all(fetchPromises);
      setModelSizes(prev => ({...prev, ...newSizes}));
      
    } catch (e) {
      console.error("Failed to fetch HF models:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadState = async () => {
    try {
      setLoading(true);
      
      try {
        const specs = await invoke<SystemSpecs>("get_system_specs");
        setSystemSpecs(specs);
      } catch (e) {
        console.error("Failed to get system specs", e);
      }

      const config = await invoke<Record<string, string>>("get_all_config");
      const savedModel = config["active_model"];

      const localModels = await invoke<ModelRecord[]>("get_installed_models");
      const installedMap: Record<string, ModelRecord> = {};
      
      let hasSetDefault = false;
      for (const m of localModels) {
        installedMap[m.id] = m;
        if (m.status === "installed" && m.id === savedModel) {
          setActiveModel(m.id);
          hasSetDefault = true;
        }
      }

      if (!hasSetDefault) {
        for (const m of localModels) {
          if (m.status === "installed") {
            setActiveModel(m.id);
            invoke("save_config", { key: "active_model", value: m.id });
            break;
          }
        }
      }
      setInstalledModels(installedMap);

      await fetchHfModels(props.searchQuery || "", skip());
    } catch (e) {
      console.error("Failed to load models state:", e);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadState();
  });

  const handleSearch = () => {
    setSkip(0);
    fetchHfModels(localSearch(), 0);
  };

  const handleNextPage = () => {
    const next = skip() + limit;
    setSkip(next);
    fetchHfModels(localSearch(), next);
  };

  const handlePrevPage = () => {
    if (skip() === 0) return;
    const prev = Math.max(0, skip() - limit);
    setSkip(prev);
    fetchHfModels(localSearch(), prev);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    setSkip(0);
    fetchHfModels("", 0);
  };

  const getFileSizeGb = (model: HfModel) => {
    const sizeBytes = modelSizes()[model.id];
    if (sizeBytes) {
      if (sizeBytes < 1024 * 1024) {
        return (sizeBytes / 1024).toFixed(2) + " KB";
      } else if (sizeBytes < 1024 * 1024 * 1024) {
        return (sizeBytes / (1024 * 1024)).toFixed(2) + " MB";
      }
      return (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    return "?";
  };

  const getSpeedScore = (model: HfModel, overrideSize?: number) => {
    const specs = systemSpecs();
    if (!specs) return "Unknown";
    
    const sizeBytes = overrideSize || modelSizes()[model.id];
    const sizeGb = sizeBytes ? (sizeBytes / (1024 * 1024 * 1024)) : 2.0; // fallback to 2GB
    
    // Improved heuristic
    const score = (specs.ram_gb * 1.0) + (specs.cpu_cores * 2.0) - (sizeGb * 4.0);
    if (score >= 20) return "Fast";
    if (score >= 10) return "Balanced";
    return "Slow";
  };

  const handleDownload = async (model: HfModel) => {
    try {
      // Find the file name from tree again or construct it.
      // Easiest is to just fetch the tree again to be safe.
      const tree = await invoke<HfTreeFile[]>("get_huggingface_model_tree", { modelId: model.id });
      const file = tree.find(f => f.path.endsWith('.gguf') || f.path.endsWith('.bin'));
      
      if (!file) {
        alert("No suitable .gguf or .bin file found in this model repository.");
        return;
      }
      
      const download_url = `https://huggingface.co/${model.id}/resolve/main/${file.path}`;

      setProgress(prev => ({ ...prev, [model.id]: 0 }));
      const unlisten = await listen<DownloadProgress>(
        `download_progress_${model.id}`,
        (event) => {
          const percent = (event.payload.bytes_downloaded / event.payload.total_bytes) * 100;
          setProgress(prev => ({ ...prev, [model.id]: percent }));
        }
      );

      await invoke("download_model", { url: download_url, modelId: model.id });
      
      unlisten();
      await loadState();
      
      if (!activeModel()) {
        setActiveModel(model.id);
        invoke("save_config", { key: "active_model", value: model.id });
      }
    } catch (e) {
      console.error("Download failed:", e);
      setProgress(prev => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      alert(`Failed to download ${model.id}. Error: ${e}`);
    }
  };

  const handleSelect = async (modelId: string) => {
    setActiveModel(modelId);
    invoke("save_config", { key: "active_model", value: modelId });
    try {
      await invoke("load_model", { modelName: modelId });
    } catch (e) {
      console.error("Failed to load model into memory", e);
    }
  };

  return (
    <TabContainer>
      <Title>MODELS CONFIGURATION</Title>
      <Description>Search and download speech-to-text models directly from Hugging Face.</Description>

      <SearchContainer>
        <div style={{ position: "relative", flex: 1, display: "flex", "align-items": "center" }}>
          <SearchInput 
            type="text" 
            placeholder="Search Hugging Face models (e.g. whisper gguf)" 
            value={localSearch()}
            onInput={(e) => setLocalSearch(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          />
          <Show when={localSearch().length > 0}>
            <ClearButton onClick={handleClearSearch}>✕</ClearButton>
          </Show>
        </div>
        <PrimaryButton onClick={handleSearch}>Search</PrimaryButton>
      </SearchContainer>

      <Show when={!loading()} fallback={
        <RegistryList>
          <For each={Array(5).fill(0)}>
            {() => (
              <SkeletonCard>
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <SkeletonBlock style={{ width: "200px", height: "20px" }} />
                  <SkeletonBlock style={{ width: "120px", height: "14px" }} />
                  <SkeletonBlock style={{ width: "250px", height: "14px", "margin-top": "4px" }} />
                </div>
                <div>
                  <SkeletonBlock style={{ width: "90px", height: "36px", "border-radius": "8px" }} />
                </div>
              </SkeletonCard>
            )}
          </For>
        </RegistryList>
      }>
        <RegistryList>
          <Show when={hfModels().length > 0} fallback={<div style={{ padding: "16px", color: "var(--ink-muted)", "font-size": "14px", "text-align": "center" }}>No models found.</div>}>
            <For each={hfModels()}>
              {(model) => {
                const record = installedModels()[model.id];
                const isInstalled = record?.status === "installed";
                const isDownloading = progress()[model.id] !== undefined && progress()[model.id] < 100;
                const isActive = activeModel() === model.id;

                return (
                  <ModelCard class={isActive ? "active" : ""}>
                    <ModelInfo>
                      <ModelName>{model.id}</ModelName>
                      <ModelDesc>Downloads: {model.downloads}</ModelDesc>
                      <ModelMeta>Size: {getFileSizeGb(model)} &nbsp;&bull;&nbsp; Estimated Speed: <span style={{"font-weight": 600, "color": "var(--ink)"}}>{getSpeedScore(model)}</span></ModelMeta>
                    </ModelInfo>
                    
                    <ModelActions>
                      <Show when={isInstalled}>
                        <StatusBadge>Installed</StatusBadge>
                        <PrimaryButton 
                          class={isActive ? "active" : ""}
                          onClick={() => handleSelect(model.id)}
                          disabled={isActive}
                          style={{ "opacity": isActive ? 0.5 : 1, "cursor": isActive ? "not-allowed" : "pointer" }}
                        >
                          {isActive ? "Active" : "Select"}
                        </PrimaryButton>
                      </Show>
                      
                      <Show when={!isInstalled && !isDownloading}>
                        <PrimaryButton onClick={() => handleDownload(model)}>
                          Download
                        </PrimaryButton>
                      </Show>

                      <Show when={!isInstalled && isDownloading}>
                        <ProgressBarContainer>
                          <ProgressBarFill style={{ width: `${progress()[model.id]}%` }} />
                          <ProgressText>{Math.round(progress()[model.id])}%</ProgressText>
                        </ProgressBarContainer>
                      </Show>
                    </ModelActions>
                  </ModelCard>
                );
              }}
            </For>
            
            <PaginationControls>
              <PrimaryButton onClick={handlePrevPage} disabled={skip() === 0}>Previous</PrimaryButton>
              <span style={{ "font-size": "13px", "color": "var(--ink-muted)" }}>Showing offset {skip()}</span>
              <PrimaryButton onClick={handleNextPage}>Next</PrimaryButton>
            </PaginationControls>
          </Show>
        </RegistryList>
      </Show>
    </TabContainer>
  );
}

// --- CSS LOGIC ---
const RegistryList = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModelCard = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--alabaster-light);
  border-radius: 12px;
  border: 1px solid var(--alabaster-deep);
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  transition: var(--transition);
  margin-bottom: 4px;

  &.active {
    background: var(--alabaster-base);
    border-color: var(--accent);
    box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.04);
  }
`;

const ModelInfo = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ModelName = styled("h3")`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
`;

const ModelDesc = styled("p")`
  margin: 0;
  font-size: 13px;
  color: var(--ink-muted);
`;

const ModelMeta = styled("span")`
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-muted);
  margin-top: 4px;
`;

const ModelActions = styled("div")`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 140px;
  justify-content: flex-end;
`;



const StatusBadge = styled("span")`
  font-size: 12px;
  font-weight: 600;
  color: #43a047;
  background-color: #eeffee;
  padding: 4px 8px;
  border-radius: 12px;
`;

const ProgressBarContainer = styled("div")`
  width: 120px;
  height: 28px;
  background-color: var(--alabaster-deep);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--alabaster-shadow);
`;

const ProgressBarFill = styled("div")`
  height: 100%;
  background-color: var(--ink-muted);
  transition: width 0.1s linear;
`;

const ProgressText = styled("span")`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  mix-blend-mode: difference;
`;

const SearchContainer = styled("div")`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const SearchInput = styled("input")`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--alabaster-shadow);
  border-radius: 8px;
  font-size: 14px;
  background: var(--alabaster-base);
  color: var(--ink);
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--shadow-rgb), 0.05);
  }
`;

const PaginationControls = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-bottom: 24px;
`;

const ClearButton = styled("button")`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--accent);
  }
`;

const shimmer = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const SkeletonCard = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--alabaster-light);
  border-radius: 12px;
  border: 1px solid var(--alabaster-deep);
  margin-bottom: 4px;
  animation: ${shimmer} 1.5s ease-in-out infinite;
`;

const SkeletonBlock = styled("div")`
  background: var(--alabaster-deep);
  border-radius: 4px;
`;
