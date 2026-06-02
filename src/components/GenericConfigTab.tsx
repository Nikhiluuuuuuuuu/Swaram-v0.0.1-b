import { createResource, createSignal, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { 
  TabContainer, Title, Description, 
  EmptyStateContainer, BannerImage, BannerTitle, BannerText, 
  Input, PrimaryButton, 
  ListIconButton, ItemGrid, ItemCard, ItemCardHeader, ItemCardTitle, ItemCardContent, ItemCardActions,
  ModalOverlay, SplitModalContent, SplitModalLeft, SplitModalTitle, SplitModalDescription, SplitModalRight,
  SplitModalHeader, FormGroup, FormLabel, HeaderTextButton, AutoResizeTextArea
} from "./SharedStyles";
import { Trash2, Edit2, Plus, X, Check, ArrowRight } from "lucide-solid";

export interface GenericEntry {
  id: number;
  [key: string]: string | number;
}

export interface GenericConfigTabProps {
  title: string;
  description: string;
  bannerImage: string;
  bannerTitle: string;
  bannerText: string;
  isGrid: boolean;
  f1Key: string;
  f2Key: string;
  f1Placeholder: string;
  f2Placeholder: string;
  getCmd: string;
  addCmd: string;
  updateCmd: string;
  deleteCmd: string;
  defaultData?: Record<string, string | number>[];
  f2Type?: "text" | "textarea";
  modalDescription?: string;
}

export default function GenericConfigTab(props: GenericConfigTabProps) {
  const [entries, { refetch }] = createResource<GenericEntry[]>(async () => {
    return await invoke(props.getCmd);
  });

  // State for Grid (Modal Editing)
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [modalMode, setModalMode] = createSignal<"add" | "edit">("add");
  const [currentId, setCurrentId] = createSignal<number | null>(null);
  
  // Unified State for fields
  const [f1, setF1] = createSignal("");
  const [f2, setF2] = createSignal("");

  const openAdd = () => {
    setModalMode("add");
    setCurrentId(null);
    setF1("");
    setF2("");
    setIsModalOpen(true);
  };

  const openEdit = (entry: GenericEntry) => {
    setModalMode("edit");
    setCurrentId(entry.id);
    setF1(String(entry[props.f1Key] ?? ""));
    setF2(String(entry[props.f2Key] ?? ""));
    setIsModalOpen(true);
  };

  const closeEdit = () => {
    setIsModalOpen(false);
    setCurrentId(null);
    setF1("");
    setF2("");
  };

  const [isSaving, setIsSaving] = createSignal(false);

  const handleSave = async () => {
    if (!f1().trim() || !f2().trim() || isSaving()) return;
    
    // Prevent manual duplicates
    const isDuplicate = entries()?.some(e => 
       e.id !== currentId() && 
       String(e[props.f1Key]).toLowerCase() === f1().trim().toLowerCase()
    );
    if (isDuplicate) {
        console.error("Entry already exists!");
        return;
    }

    setIsSaving(true);
    try {
      if (modalMode() === "add") {
        await invoke(props.addCmd, {
          [props.f1Key]: f1().trim(),
          [props.f2Key]: f2().trim(),
        });
      } else if (modalMode() === "edit" && currentId() !== null) {
        await invoke(props.updateCmd, {
          id: currentId(),
          [props.f1Key]: f1().trim(),
          [props.f2Key]: f2().trim(),
        });
      }
      closeEdit();
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const [isLoadingDefaults, setIsLoadingDefaults] = createSignal(false);

  const loadDefaults = async () => {
    if (!props.defaultData || isLoadingDefaults()) return;
    setIsLoadingDefaults(true);
    try {
      for (const item of props.defaultData) {
        await invoke(props.addCmd, item);
      }
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoke(props.deleteCmd, { id });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <TabContainer>
      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "flex-start", "margin-bottom": "24px" }}>
        <div>
          <Title>{props.title}</Title>
          <Description style={{ "margin-bottom": "0" }}>{props.description}</Description>
        </div>
        <Show when={true}>
          <div style={{ display: "flex", gap: "12px" }}>
            <Show when={props.defaultData && entries() && entries()!.length === 0}>
              <HeaderTextButton onClick={loadDefaults} disabled={isLoadingDefaults()}>
                {isLoadingDefaults() ? "Loading..." : "Load Defaults"}
              </HeaderTextButton>
            </Show>
            <PrimaryButton onClick={openAdd}>
              <Plus size={16} /> Add New
            </PrimaryButton>
          </div>
        </Show>
      </div>

      <Show when={entries() && entries()!.length === 0}>
        <EmptyStateContainer>
          <BannerImage src={props.bannerImage} alt="Empty State Banner" />
          <BannerTitle>{props.bannerTitle}</BannerTitle>
          <BannerText>{props.bannerText}</BannerText>
        </EmptyStateContainer>
      </Show>

      <Show when={entries() && entries()!.length > 0}>
        {props.isGrid ? (
          <ItemGrid>
            <For each={entries()}>
              {(entry) => (
                <ItemCard>
                  <ItemCardHeader>
                    <ItemCardTitle>{entry[props.f1Key]}</ItemCardTitle>
                    <ItemCardActions>
                      <ListIconButton onClick={() => openEdit(entry)} title="Edit">
                        <Edit2 size={16} />
                      </ListIconButton>
                      <ListIconButton class="danger" onClick={() => handleDelete(entry.id)} title="Delete">
                        <Trash2 size={16} />
                      </ListIconButton>
                    </ItemCardActions>
                  </ItemCardHeader>
                  <ItemCardContent>{entry[props.f2Key]}</ItemCardContent>
                </ItemCard>
              )}
            </For>
          </ItemGrid>
        ) : (
          <div style={{ display: "flex", "flex-direction": "column", gap: "12px", "padding-bottom": "32px" }}>
              <For each={entries()}>
                {(entry) => (
                    <div style={{
                       display: "flex",
                       "align-items": "center",
                       background: "var(--card-bg)",
                       border: "1px solid var(--alabaster-shadow)",
                       "border-radius": "12px",
                       padding: "16px 20px",
                       gap: "16px"
                    }}>
                      <div style={{ "font-weight": "600", color: "var(--ink)", "background": "var(--bg-main)", padding: "6px 12px", "border-radius": "6px", "border": "1px solid var(--alabaster-shadow)" }}>
                        {entry[props.f1Key]}
                      </div>
                      <ArrowRight size={18} color="var(--ink-muted)" />
                      <div style={{ flex: 1, color: "var(--ink-muted)" }}>
                        {entry[props.f2Key]}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <ListIconButton onClick={() => openEdit(entry)} title="Edit">
                          <Edit2 size={16} />
                        </ListIconButton>
                        <ListIconButton class="danger" onClick={() => handleDelete(entry.id)} title="Delete">
                          <Trash2 size={16} />
                        </ListIconButton>
                      </div>
                    </div>
                )}
              </For>
          </div>
        )}
      </Show>

      {/* Modal for All Layouts */}
      <Show when={isModalOpen()}>
        <ModalOverlay onClick={(e: any) => {
          if (e.target === e.currentTarget) closeEdit();
        }}>
          <SplitModalContent>
            <SplitModalLeft>
              <SplitModalTitle>{modalMode() === "add" ? "Add New" : "Edit Item"}</SplitModalTitle>
              <SplitModalDescription>
                {props.modalDescription || `Define the ${props.f1Key} and the corresponding ${props.f2Key} instruction.`}
              </SplitModalDescription>
            </SplitModalLeft>
            <SplitModalRight>
              <SplitModalHeader>
                <div style={{ flex: 1 }} />
                <ListIconButton onClick={closeEdit} title="Close">
                  <X size={20} />
                </ListIconButton>
              </SplitModalHeader>
              
              <FormGroup>
                <FormLabel>{props.f1Placeholder.toUpperCase()}</FormLabel>
                <Input 
                  type="text" 
                  value={f1()} 
                  onInput={(e: any) => setF1(e.currentTarget.value)} 
                  placeholder={`e.g. ${props.title.toLowerCase().slice(0, -1)} name`}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{props.f2Placeholder.toUpperCase()}</FormLabel>
                {props.f2Type === "text" ? (
                  <Input 
                    type="text" 
                    value={f2()} 
                    onInput={(e: any) => setF2(e.currentTarget.value)} 
                    placeholder={props.f2Placeholder}
                  />
                ) : (
                  <AutoResizeTextArea 
                    value={f2()} 
                    onInput={(e: any) => setF2(e.currentTarget.value)} 
                    placeholder={props.f2Placeholder}
                    style={{ "min-height": "160px" }}
                  />
                )}
              </FormGroup>

              <div style={{ display: "flex", "justify-content": "flex-end", gap: "12px", "margin-top": "32px" }}>
                <PrimaryButton onClick={closeEdit} style={{ background: "transparent", color: "var(--ink)", border: "1px solid var(--alabaster-shadow)" }}>
                  Cancel
                </PrimaryButton>
                <PrimaryButton onClick={handleSave} disabled={!f1().trim() || !f2().trim()}>
                  <Check size={16} /> Save
                </PrimaryButton>
              </div>
            </SplitModalRight>
          </SplitModalContent>
        </ModalOverlay>
      </Show>
    </TabContainer>
  );
}
