import { styled } from "solid-styled-components";

export const TabContainer = styled("div")`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 24px;
  color: var(--ink);
  transition: all 0.3s var(--transition);
  position: relative;
`;

export const Title = styled("h2")`
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.2px;
  margin-bottom: 6px;
  margin-top: 0;
`;

export const Description = styled("p")`
  font-size: 14px;
  color: var(--ink-muted);
  margin-bottom: 32px;
  line-height: 1.6;
`;

export const DashboardHeader = styled("header")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
`;

export const HeaderTitle = styled("h2")`
  font-size: 24px;
  font-weight: 600;
  margin: 0;
`;

export const HeaderSubtitle = styled("p")`
  color: var(--ink-muted);
  font-size: 14px;
  margin: 4px 0 0 0;
`;

export const HeaderControls = styled("div")`
  display: flex;
  gap: 16px;
`;

export const IconButton = styled("button")`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--alabaster-light);
  border: 1px solid var(--alabaster-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  transition: var(--transition);
  color: var(--ink);

  &:hover {
    transform: translateY(-2px);
    background: var(--alabaster-base);
    border-color: var(--alabaster-shadow);
  }

  &:active {
    transform: translateY(0);
    background: var(--alabaster-deep);
  }
`;

export const SettingsGrid = styled("section")`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;

export const Card = styled("div")`
  background: var(--alabaster-light);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  border: 1px solid var(--alabaster-deep);
  transition: var(--transition);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--shadow-rgb), 0.04);
  }
`;

export const CardTitle = styled("div")`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SettingRow = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SettingLabel = styled("span")`
  font-size: 15px;
  font-weight: 400;
`;

export const MonoValue = styled("span")`
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: var(--alabaster-deep);
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: inset 1px 1px 2px var(--alabaster-shadow);
  color: var(--ink);
`;

const ToggleContainer = styled("div")`
  width: 44px;
  height: 24px;
  background: var(--alabaster-base);
  border: 1px solid var(--alabaster-shadow);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: var(--transition);

  &.on {
    background: var(--ink);
    border-color: var(--ink);
  }

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    background: var(--ink-muted);
    border-radius: 50%;
    transition: var(--transition);
  }

  &.on::after {
    left: 23px;
    background: var(--alabaster-base);
  }
`;

export function ToggleSwitch(props: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <ToggleContainer 
      class={props.checked ? "on" : ""} 
      onClick={() => props.onChange(!props.checked)}
    />
  );
}

export const EmptyStateContainer = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  margin-top: 40px;
`;

export const BannerImage = styled("img")`
  width: 100%;
  max-width: 600px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(var(--shadow-rgb), 0.08);
  margin-bottom: 24px;
`;

export const BannerTitle = styled("h2")`
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 8px;
`;

export const BannerText = styled("p")`
  font-size: 15px;
  color: var(--ink-muted);
  text-align: center;
  max-width: 400px;
  line-height: 1.5;
`;

export const AddSection = styled("div")`
  margin-bottom: 24px;
  background: var(--alabaster-light);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  border: 1px solid var(--alabaster-deep);
`;

export const InputRow = styled("div")`
  display: flex;
  gap: 12px;
  align-items: center;
`;

export const Input = styled("input")`
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

export const InputColumn = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const TextArea = styled("textarea")`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--alabaster-shadow);
  border-radius: 8px;
  font-size: 14px;
  background: var(--alabaster-base);
  color: var(--ink);
  outline: none;
  transition: all 0.2s;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  
  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--shadow-rgb), 0.05);
  }
`;

export const PrimaryButton = styled("button")`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--ink);
  color: var(--alabaster-base);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: var(--accent);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ListContainer = styled("div")`
  background: var(--alabaster-light);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  border: 1px solid var(--alabaster-deep);
  overflow: hidden;
`;

export const ListHeader = styled("div")`
  display: flex;
  background: var(--alabaster-deep);
  padding: 12px 20px;
  border-bottom: 1px solid var(--alabaster-shadow);
  font-weight: 600;
  font-size: 13px;
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const HeaderCell = styled("div")`
  flex: 1;
  &.actions {
    flex: 0 0 80px;
    text-align: right;
  }
`;

export const ListBody = styled("div")`
  display: flex;
  flex-direction: column;
`;

export const ListItem = styled("div")`
  display: flex;
  padding: 12px 20px;
  border-bottom: 1px solid var(--alabaster-deep);
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--alabaster-base);
  }
`;

export const Cell = styled("div")`
  flex: 1;
  font-size: 14px;
  color: var(--ink);
  
  &.actions {
    flex: 0 0 80px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
`;

export const ListIconButton = styled("button")`
  background: transparent;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(var(--hover-rgb), 0.05);
    color: var(--ink);
  }
  
  &.danger:hover {
    background: #ffeeee;
    color: #e53935;
  }
  
  &.success:hover {
    background: #eeffee;
    color: #43a047;
  }
`;

export const EditRow = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: var(--alabaster-base);
  border-bottom: 1px solid var(--alabaster-deep);
  box-shadow: inset 0 2px 4px rgba(var(--shadow-rgb), 0.02);
`;

export const EditActions = styled("div")`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
`;

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

export const ItemGrid = styled("div")`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 24px;
`;

export const ItemCard = styled("div")`
  background: var(--alabaster-light);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 15px rgba(var(--shadow-rgb), 0.02);
  border: 1px solid var(--alabaster-deep);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: var(--transition);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--shadow-rgb), 0.04);
  }
`;

export const ItemCardHeader = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const ItemCardTitle = styled("h3")`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--ink);
`;

export const ItemCardContent = styled("p")`
  font-size: 14px;
  color: var(--ink-muted);
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
  flex-grow: 1;
`;

export const ItemCardActions = styled("div")`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--alabaster-deep);
`;

export const ModalOverlay = styled("div")`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

export const ModalContent = styled("div")`
  background: var(--alabaster-base);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(var(--shadow-rgb), 0.15);
  border: 1px solid var(--alabaster-deep);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

export const ModalHeader = styled("div")`
  padding: 20px 24px;
  border-bottom: 1px solid var(--alabaster-deep);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const ModalTitle = styled("h2")`
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
`;

export const ModalBody = styled("div")`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const ModalFooter = styled("div")`
  padding: 16px 24px;
  border-top: 1px solid var(--alabaster-deep);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--alabaster-light);
`;

export const CloseIconButton = styled("button")`
  background: transparent;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(var(--hover-rgb), 0.05);
    color: var(--ink);
  }
`;

export const SplitModalContent = styled("div")`
  background: var(--alabaster-light);
  border-radius: 20px;
  width: 90%;
  max-width: 850px;
  height: 80vh;
  max-height: 600px;
  box-shadow: 0 10px 30px rgba(var(--shadow-rgb), 0.08);
  border: 1px solid var(--alabaster-deep);
  display: flex;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const SplitModalLeft = styled("div")`
  flex: 1;
  padding: 40px;
  background: var(--alabaster-base);
  border-right: 1px solid var(--alabaster-deep);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const SplitModalTitle = styled("h2")`
  font-size: 24px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.2px;
  margin: 0;
`;

export const SplitModalDescription = styled("p")`
  font-size: 14px;
  color: var(--ink-muted);
  line-height: 1.6;
  margin: 0;
`;

export const SplitModalRight = styled("div")`
  flex: 1.6;
  background: var(--alabaster-light);
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  position: relative;
`;

export const SplitModalHeader = styled("div")`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
`;

export const FormGroup = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const FormLabel = styled("label")`
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
`;

export const HeaderTextButton = styled("button")`
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(var(--hover-rgb), 0.05);
  }
`;

export const AutosaveText = styled("span")`
  font-size: 12px;
  color: var(--ink-muted);
`;


