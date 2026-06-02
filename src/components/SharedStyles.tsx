import { splitProps } from "solid-js";

export function TabContainer(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"tab-container " + (local.class || "")} {...others}>{local.children}</div>;
}

export function Title(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <h2 class={"title " + (local.class || "")} {...others}>{local.children}</h2>;
}

export function Description(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <p class={"description " + (local.class || "")} {...others}>{local.children}</p>;
}

export function DashboardHeader(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <header class={"dashboard-header " + (local.class || "")} {...others}>{local.children}</header>;
}

export function HeaderTitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <h2 class={"header-title " + (local.class || "")} {...others}>{local.children}</h2>;
}

export function HeaderSubtitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <p class={"header-subtitle " + (local.class || "")} {...others}>{local.children}</p>;
}

export function HeaderControls(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"header-controls " + (local.class || "")} {...others}>{local.children}</div>;
}

export function IconButton(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <button class={"icon-button " + (local.class || "")} {...others}>{local.children}</button>;
}

export function SettingsGrid(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <section class={"settings-grid " + (local.class || "")} {...others}>{local.children}</section>;
}

export function Card(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"card " + (local.class || "")} {...others}>{local.children}</div>;
}

export function CardTitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"card-title " + (local.class || "")} {...others}>{local.children}</div>;
}

export function SettingRow(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"setting-row " + (local.class || "")} {...others}>{local.children}</div>;
}

export function SettingLabel(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <span class={"setting-label " + (local.class || "")} {...others}>{local.children}</span>;
}

export function MonoValue(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <span class={"mono-value " + (local.class || "")} {...others}>{local.children}</span>;
}

function ToggleContainer(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"toggle-container " + (local.class || "")} {...others}>{local.children}</div>;
}

export function EmptyStateContainer(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"empty-state-container " + (local.class || "")} {...others}>{local.children}</div>;
}

export function BannerImage(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <img class={"banner-image " + (local.class || "")} {...others}>{local.children}</img>;
}

export function BannerTitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <h2 class={"banner-title " + (local.class || "")} {...others}>{local.children}</h2>;
}

export function BannerText(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <p class={"banner-text " + (local.class || "")} {...others}>{local.children}</p>;
}

export function AddSection(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"add-section " + (local.class || "")} {...others}>{local.children}</div>;
}

export function InputRow(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"input-row " + (local.class || "")} {...others}>{local.children}</div>;
}

export function Input(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <input class={"input " + (local.class || "")} {...others}>{local.children}</input>;
}

export function InputColumn(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"input-column " + (local.class || "")} {...others}>{local.children}</div>;
}

export function TextArea(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <textarea class={"text-area " + (local.class || "")} {...others}>{local.children}</textarea>;
}

export function PrimaryButton(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <button class={"primary-button " + (local.class || "")} {...others}>{local.children}</button>;
}

export function ListContainer(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"list-container " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ListHeader(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"list-header " + (local.class || "")} {...others}>{local.children}</div>;
}

export function HeaderCell(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"header-cell " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ListBody(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"list-body " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ListItem(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"list-item " + (local.class || "")} {...others}>{local.children}</div>;
}

export function Cell(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"cell " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ListIconButton(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <button class={"list-icon-button " + (local.class || "")} {...others}>{local.children}</button>;
}

export function EditRow(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"edit-row " + (local.class || "")} {...others}>{local.children}</div>;
}

export function EditActions(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"edit-actions " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ItemGrid(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"item-grid " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ItemCard(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"item-card " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ItemCardHeader(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"item-card-header " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ItemCardTitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <h3 class={"item-card-title " + (local.class || "")} {...others}>{local.children}</h3>;
}

export function ItemCardContent(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <p class={"item-card-content " + (local.class || "")} {...others}>{local.children}</p>;
}

export function ItemCardActions(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"item-card-actions " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ModalOverlay(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"modal-overlay " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ModalContent(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"modal-content " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ModalHeader(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"modal-header " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ModalTitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <h2 class={"modal-title " + (local.class || "")} {...others}>{local.children}</h2>;
}

export function ModalBody(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"modal-body " + (local.class || "")} {...others}>{local.children}</div>;
}

export function ModalFooter(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"modal-footer " + (local.class || "")} {...others}>{local.children}</div>;
}

export function CloseIconButton(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <button class={"close-icon-button " + (local.class || "")} {...others}>{local.children}</button>;
}

export function SplitModalContent(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"split-modal-content " + (local.class || "")} {...others}>{local.children}</div>;
}

export function SplitModalLeft(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"split-modal-left " + (local.class || "")} {...others}>{local.children}</div>;
}

export function SplitModalTitle(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <h2 class={"split-modal-title " + (local.class || "")} {...others}>{local.children}</h2>;
}

export function SplitModalDescription(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <p class={"split-modal-description " + (local.class || "")} {...others}>{local.children}</p>;
}

export function SplitModalRight(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"split-modal-right " + (local.class || "")} {...others}>{local.children}</div>;
}

export function SplitModalHeader(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"split-modal-header " + (local.class || "")} {...others}>{local.children}</div>;
}

export function FormGroup(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div class={"form-group " + (local.class || "")} {...others}>{local.children}</div>;
}

export function FormLabel(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <label class={"form-label " + (local.class || "")} {...others}>{local.children}</label>;
}

export function HeaderTextButton(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <button class={"header-text-button " + (local.class || "")} {...others}>{local.children}</button>;
}

export function AutosaveText(props: any) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <span class={"autosave-text " + (local.class || "")} {...others}>{local.children}</span>;
}


export function ToggleSwitch(props: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <ToggleContainer 
      class={props.checked ? "on" : ""} 
      onClick={() => props.onChange(!props.checked)}
    />
  );
}

export function AutoResizeTextArea(props: import("solid-js").JSX.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const handleInput = (e: InputEvent & { currentTarget: HTMLTextAreaElement; target: Element }) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
    
    if (typeof props.onInput === "function") {
      (props.onInput as (e: InputEvent) => void)(e as unknown as InputEvent);
    } else if (Array.isArray(props.onInput)) {
      (props.onInput[0] as (data: unknown, e: InputEvent) => void)(props.onInput[1], e as unknown as InputEvent);
    }
  };

  return (
    <TextArea
      {...props}
      onInput={handleInput}
      style={{
        ...((props.style as object) || {}),
        "max-height": "400px",
        overflow: "auto"
      }}
    />
  );
}
