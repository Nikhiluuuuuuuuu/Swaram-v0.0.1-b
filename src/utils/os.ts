export function getOS(): "windows" | "macos" | "linux" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

export function initOSTheme() {
  const os = getOS();
  document.documentElement.setAttribute('data-os-layout', os);
}
