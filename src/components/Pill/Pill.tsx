import { MainPill } from "./components/MainPill";
import { onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

export function Pill() {
  onMount(() => {
    let lastWidth = 0;
    let resizeTimeout: number;
    let isAnimating = false;

    const updateRect = () => {
      const pill = document.querySelector('.pill');
      if (pill) {
        const rect = pill.getBoundingClientRect();
        // Give 40px padding for the glow (20px on each side)
        const paddingX = 40;
        const targetWidth = Math.round(rect.width + paddingX);
        
        if (targetWidth !== lastWidth) {
          lastWidth = targetWidth;

          if (!isAnimating) {
            isAnimating = true;
            // Instantly expand native window to full screen width during animation
            // This prevents the OS window manager from jittering frame-by-frame (shaking)
            // AND prevents any cropping if the text is very long.
            const expandWidth = window.screen.availWidth || 2560;
            invoke("update_pill_region", { 
               width: expandWidth, 
               height: 80 
            }).catch(console.error);
          }

          clearTimeout(resizeTimeout);
          resizeTimeout = window.setTimeout(() => {
            isAnimating = false;
            const finalPill = document.querySelector('.pill');
            if (finalPill) {
              const finalRect = finalPill.getBoundingClientRect();
              const finalWidth = Math.round(finalRect.width + paddingX);
              lastWidth = finalWidth;
              // Wrap tightly after animation settles to allow click-through on sides
              invoke("update_pill_region", { 
                 width: finalWidth, 
                 height: 80 
              }).catch(console.error);
            }
          }, 150); // wait 150ms after the last resize event to ensure animation is fully complete
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
        updateRect();
    });

    setTimeout(() => {
        const pill = document.querySelector('.pill');
        if (pill) {
            resizeObserver.observe(pill);
            updateRect();
        }
    }, 100);

    onCleanup(() => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
    });
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
