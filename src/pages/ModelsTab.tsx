import { createSignal, onMount, For, Show } from "solid-js";

import { TabContainer, Title, Description, PrimaryButton } from "../components/SharedStyles";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { activateModel, loadModel } from "../dictation";

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
  architecture?: string | null;
}

interface DownloadProgress {
  id: string;
  bytes_downloaded: number;
  total_bytes: number;
}

// --- LOGIC: Model Marketplace ---
export default function ModelsTab(props: { searchQuery?: string; activeView?: "marketplace" | "downloaded" }) {
  const [hfModels, setHfModels] = createSignal<HfModel[]>([]);
  const [modelSizes, setModelSizes] = createSignal<Record<string, number>>({});
  const [installedModels, setInstalledModels] = createSignal<Record<string, ModelRecord>>({});
  const [progress, setProgress] = createSignal<Record<string, number>>({});
  const [preparing, setPreparing] = createSignal<Record<string, boolean>>({});
  const [loading, setLoading] = createSignal(true);
  const [activeModel, setActiveModel] = createSignal<string | null>(null);
  const [systemSpecs, setSystemSpecs] = createSignal<SystemSpecs | null>(null);
  
  const [skip, setSkip] = createSignal(0);
  const [localSearch, setLocalSearch] = createSignal("");
  
  const limit = 10;
  const selectableModelFile = (files: HfTreeFile[]) => {
    const supported = files.filter((file) => {
      const path = file.path.toLowerCase();
      return (
        file.type === "file" &&
        !path.includes("gguf") &&
        (
          path.endsWith(".bin") ||
          path.endsWith(".onnx") ||
          path.endsWith(".safetensors") ||
          path.endsWith(".pt") ||
          path.endsWith(".pth")
        )
      );
    });

    supported.sort((a, b) => {
      const rank = (path: string) => {
        const lower = path.toLowerCase();
        if (lower.endsWith(".bin")) return 0;
        if (lower.endsWith(".onnx")) return 1;
        if (lower.endsWith(".safetensors")) return 2;
        return 3;
      };
      return rank(a.path) - rank(b.path) || a.size - b.size;
    });

    return supported[0];
  };

  const fetchHfModels = async (queryStr: string, currentSkip: number) => {
    try {
      setLoading(true);
      
      const filters = ["automatic-speech-recognition"];
      const filterStr = filters.join(",");
      
      const q = queryStr.trim() || "whisper ggml";
      
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
          const file = selectableModelFile(tree);
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
      const newSizes: Record<string, number> = {};
      
      for (const m of localModels) {
        installedMap[m.id] = m;
      }

      const fetchPromises = localModels.map(async (model) => {
        try {
          const tree = await invoke<HfTreeFile[]>("get_huggingface_model_tree", { modelId: model.id });
          const file = selectableModelFile(tree);
          if (file && file.size) {
            newSizes[model.id] = file.size;
          }
        } catch (e) {
          console.error("Tree fetch failed for local model", model.id, e);
        }
      });

      const savedInstalledModel = localModels.find(
        (m) => m.status === "installed" && m.id === savedModel
      );
      const fallbackInstalledModel = localModels.find((m) => m.status === "installed");
      const nextActiveModel = savedInstalledModel?.id ?? fallbackInstalledModel?.id ?? null;

      if (nextActiveModel) {
        setActiveModel(nextActiveModel);
        const loadPromise = savedInstalledModel
          ? loadModel(nextActiveModel)
          : activateModel(nextActiveModel);
        loadPromise.catch((error) => {
          console.error("Failed to load active model into memory", error);
        });
      }
      setInstalledModels(installedMap);
      
      await Promise.all(fetchPromises);
      setModelSizes(prev => ({...prev, ...newSizes}));

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

  const getFileSizeGb = (modelId: string) => {
    const sizeBytes = modelSizes()[modelId];
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

  const getSpeedScore = (modelId: string, overrideSize?: number) => {
    const specs = systemSpecs();
    if (!specs) return "Unknown";
    
    const sizeBytes = overrideSize || modelSizes()[modelId];
    const sizeGb = sizeBytes ? (sizeBytes / (1024 * 1024 * 1024)) : 2.0; // fallback to 2GB
    
    // Improved heuristic
    const score = (specs.ram_gb * 1.0) + (specs.cpu_cores * 2.0) - (sizeGb * 4.0);
    if (score >= 20) return "Fast";
    if (score >= 10) return "Balanced";
    return "Slow";
  };

  const handleDownload = async (model: HfModel) => {
    try {
      setPreparing(prev => ({ ...prev, [model.id]: true }));
      // Find the file name from tree again or construct it.
      // Easiest is to just fetch the tree again to be safe.
      const tree = await invoke<HfTreeFile[]>("get_huggingface_model_tree", { modelId: model.id });
      const file = selectableModelFile(tree);
      
      if (!file) {
        setPreparing(prev => {
          const next = { ...prev };
          delete next[model.id];
          return next;
        });
        alert("No downloadable speech-to-text model file found in this repository.");
        return;
      }
      
      const download_url = `https://huggingface.co/${model.id}/resolve/main/${file.path}`;

      setPreparing(prev => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      setProgress(prev => ({ ...prev, [model.id]: 0 }));
      const safeModelId = model.id.replace(new RegExp("[^a-zA-Z0-9\\-/:_]", "g"), '_');
      const unlisten = await listen<DownloadProgress>(
        `download_progress_${safeModelId}`,
        (event) => {
          const percent = event.payload.total_bytes > 0
            ? (event.payload.bytes_downloaded / event.payload.total_bytes) * 100
            : 0;
          setProgress(prev => ({ ...prev, [model.id]: percent }));
        }
      );

      await invoke("download_model", { url: download_url, modelId: model.id });

      unlisten();

      if (!activeModel()) {
        await activateModel(model.id);
        setActiveModel(model.id);
      }
      await loadState();
    } catch (e) {
      console.error("Download failed:", e);
      setPreparing(prev => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      setProgress(prev => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      alert(`Failed to download ${model.id}. Error: ${e}`);
    }
  };

  const handleSelect = async (modelId: string) => {
    try {
      await activateModel(modelId);
      setActiveModel(modelId);
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
            placeholder="Search Hugging Face models (e.g. whisper ggml)" 
            value={localSearch()}
            onInput={(e: any) => setLocalSearch(e.currentTarget.value)}
            onKeyDown={(e: any) => { if (e.key === "Enter") handleSearch(); }}
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
          <Show when={props.activeView === "marketplace" || !props.activeView} fallback={
            <Show when={Object.values(installedModels()).length > 0} fallback={<div style={{ padding: "16px", color: "var(--ink-muted)", "font-size": "14px", "text-align": "center" }}>No downloaded models.</div>}>
              <For each={Object.values(installedModels())}>
                {(record) => {
                  const isActive = () => activeModel() === record.id;
                  return (
                    <ModelCard class={isActive() ? "active" : ""}>
                      <ModelInfo>
                        <ModelName>{record.id}</ModelName>
                        <ModelDesc>{record.status === "installed" ? "Local file available" : "Downloading..."}</ModelDesc>
                        <ModelMeta>Size: {getFileSizeGb(record.id)} &nbsp;&bull;&nbsp; Estimated Speed: <span style={{"font-weight": 600, "color": "var(--ink)"}}>{getSpeedScore(record.id)}</span></ModelMeta>
                      </ModelInfo>
                      
                      <ModelActions>
                        <StatusBadge>{record.status}</StatusBadge>
                        <PrimaryButton 
                          class={isActive() ? "active" : ""}
                          onClick={() => handleSelect(record.id)}
                          disabled={isActive() || record.status !== "installed"}
                          style={{ "opacity": (isActive() || record.status !== "installed") ? 0.5 : 1, "cursor": (isActive() || record.status !== "installed") ? "not-allowed" : "pointer" }}
                        >
                          {isActive() ? "Active" : "Select"}
                        </PrimaryButton>
                      </ModelActions>
                    </ModelCard>
                  );
                }}
              </For>
            </Show>
          }>
            <Show when={hfModels().filter(m => !installedModels()[m.id]).length > 0} fallback={<div style={{ padding: "16px", color: "var(--ink-muted)", "font-size": "14px", "text-align": "center" }}>No uninstalled models found. Try another search.</div>}>
              <For each={hfModels().filter(m => !installedModels()[m.id])}>
                {(model) => {
                  const record = () => installedModels()[model.id];
                  const isInstalled = () => record()?.status === "installed";
                  const isDownloading = () => progress()[model.id] !== undefined && progress()[model.id] < 100;
                  const isPreparing = () => preparing()[model.id] === true;
                  const isActive = () => activeModel() === model.id;

                  return (
                    <ModelCard class={isActive() ? "active" : ""}>
                      <ModelInfo>
                        <ModelName>{model.id}</ModelName>
                        <ModelDesc>Downloads: {model.downloads}</ModelDesc>
                        <ModelMeta>Size: {getFileSizeGb(model.id)} &nbsp;&bull;&nbsp; Estimated Speed: <span style={{"font-weight": 600, "color": "var(--ink)"}}>{getSpeedScore(model.id)}</span></ModelMeta>
                      </ModelInfo>
                      
                      <ModelActions>
                        <Show when={isInstalled()}>
                          <StatusBadge>Installed</StatusBadge>
                          <PrimaryButton 
                            class={isActive() ? "active" : ""}
                            onClick={() => handleSelect(model.id)}
                            disabled={isActive()}
                            style={{ "opacity": isActive() ? 0.5 : 1, "cursor": isActive() ? "not-allowed" : "pointer" }}
                          >
                            {isActive() ? "Active" : "Select"}
                          </PrimaryButton>
                        </Show>
                        
                        <Show when={!isInstalled() && !isDownloading() && !isPreparing()}>
                          <PrimaryButton onClick={() => handleDownload(model)}>
                            Download
                          </PrimaryButton>
                        </Show>

                        <Show when={!isInstalled() && isPreparing() && !isDownloading()}>
                          <PrimaryButton disabled style={{ "opacity": 0.7, "cursor": "wait" }}>
                            Preparing...
                          </PrimaryButton>
                        </Show>

                        <Show when={!isInstalled() && isDownloading()}>
                          <ProgressBarContainer>
                            <ProgressBarFill style={{ width: `${progress()[model.id] || 0}%` }} />
                            <ProgressText>{Math.round(progress()[model.id] || 0)}%</ProgressText>
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
          </Show>
        </RegistryList>
      </Show>
    </TabContainer>
  );
}

// --- CSS LOGIC ---
function RegistryList(props: any) {
  const local = props;
  return <div class={"registry-list " + (local.class || "")} {...props}>{local.children}</div>;
}


function ModelCard(props: any) {
  const local = props;
  return <div class={"model-card " + (local.class || "")} {...props}>{local.children}</div>;
}


function ModelInfo(props: any) {
  const local = props;
  return <div class={"model-info " + (local.class || "")} {...props}>{local.children}</div>;
}


function ModelName(props: any) {
  const local = props;
  return <h3 class={"model-name " + (local.class || "")} {...props}>{local.children}</h3>;
}


function ModelDesc(props: any) {
  const local = props;
  return <p class={"model-desc " + (local.class || "")} {...props}>{local.children}</p>;
}


function ModelMeta(props: any) {
  const local = props;
  return <span class={"model-meta " + (local.class || "")} {...props}>{local.children}</span>;
}


function ModelActions(props: any) {
  const local = props;
  return <div class={"model-actions " + (local.class || "")} {...props}>{local.children}</div>;
}




function StatusBadge(props: any) {
  const local = props;
  return <span class={"status-badge " + (local.class || "")} {...props}>{local.children}</span>;
}


function ProgressBarContainer(props: any) {
  const local = props;
  return <div class={"progress-bar-container " + (local.class || "")} {...props}>{local.children}</div>;
}


function ProgressBarFill(props: any) {
  const local = props;
  return <div class={"progress-bar-fill " + (local.class || "")} {...props}>{local.children}</div>;
}


function ProgressText(props: any) {
  const local = props;
  return <span class={"progress-text " + (local.class || "")} {...props}>{local.children}</span>;
}


function SearchContainer(props: any) {
  const local = props;
  return <div class={"search-container " + (local.class || "")} {...props}>{local.children}</div>;
}


function SearchInput(props: any) {
  const local = props;
  return <input class={"search-input " + (local.class || "")} {...props}>{local.children}</input>;
}


function PaginationControls(props: any) {
  const local = props;
  return <div class={"pagination-controls " + (local.class || "")} {...props}>{local.children}</div>;
}


function ClearButton(props: any) {
  const local = props;
  return <button class={"clear-button " + (local.class || "")} {...props}>{local.children}</button>;
}




function SkeletonCard(props: any) {
  const local = props;
  return <div class={"skeleton-card " + (local.class || "")} {...props}>{local.children}</div>;
}


function SkeletonBlock(props: any) {
  const local = props;
  return <div class={"skeleton-block " + (local.class || "")} {...props}>{local.children}</div>;
}

