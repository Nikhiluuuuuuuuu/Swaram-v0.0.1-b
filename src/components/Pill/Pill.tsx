import { MainPill } from "./components/MainPill";
import { onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

export function Pill() {
  // We no longer dynamically resize the OS window frame. 
  // We use a fixed-size transparent window (like Handy) to completely 
  // bypass Windows OS resizing glitches (shaking/flashing).
  
  onMount(() => {
    // Position the 800x80 window at the bottom center of the screen ONCE.
    invoke("update_pill_region", { 
       width: 800, 
       height: 80 
    }).catch(console.error);
  });

  return (
    <>
      <div class="pill-anchor" id="pill-anchor">
        <div class="main-row">
          <div class="goo-wrapper" id="goo-wrapper">
            <MainPill />
          </div>
        </div>
      </div>
    </>
  );
}
