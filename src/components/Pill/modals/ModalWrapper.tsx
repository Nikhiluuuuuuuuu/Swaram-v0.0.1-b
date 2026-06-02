
import { JSX } from "solid-js";

function ModalWrapperContainer(props: any) {
  const local = props;
  return <div class={"modal-wrapper-container " + (local.class || "")} {...props}>{local.children}</div>;
}


interface ModalWrapperProps {
  id: string;
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: JSX.Element;
  width?: string;
}

export function ModalWrapper(props: ModalWrapperProps) {
  return (
    <ModalWrapperContainer class={`modal-overlay ${props.isOpen ? "visible" : ""}`} id={props.id}>
      <div class="modal-container" style={{ width: props.width || "400px" }}>
        <div class="modal-header">
          <span class="modal-title">{props.title}</span>
          <span class="modal-close" onClick={() => props.onClose()}>&times;</span>
        </div>
        <div class="modal-body">
          {props.children}
        </div>
      </div>
    </ModalWrapperContainer>
  );
}
