import { createRoot } from "react-dom/client";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import App from "./App.tsx";
import "./index.css";

// Suppress hostname errors from browser extensions (e.g. content.js)
window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message ?? String(event.reason ?? "");
  if (msg.includes("hostname")) {
    event.preventDefault();
  }
});
window.addEventListener("error", (event) => {
  if (event.message?.includes?.("hostname")) {
    event.preventDefault();
    return true;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
