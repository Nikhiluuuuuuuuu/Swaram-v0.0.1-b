import { styled } from "solid-styled-components";
import { ButtonProps } from "./Button.interface";

const NativeButton = styled("button")`
  /* 1. FORCES the engine to draw the component using the OS's native toolkit */
  appearance: auto; 
  -webkit-appearance: auto;
  
  /* 2. Inherit the zero-hardcoded typography (font: caption) */
  font: inherit;
  
  /* Reset margins */
  margin: 0;
`;

export default function Button(props: ButtonProps) {
  return <NativeButton {...props}>{props.children}</NativeButton>;
}
