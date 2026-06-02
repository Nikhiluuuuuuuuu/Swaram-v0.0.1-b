import { render } from "solid-js/web";
import "./index.css";
import "./pill.css";
import { Pill } from "./components/Pill/Pill";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error("Root element not found.");
}

// Disable right-click context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

render(() => <Pill />, root!);
