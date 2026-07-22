import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
const strictEnabled = env?.PROD === true || env?.VITE_TAURI_UI_STRICT === "1";

root.render(strictEnabled ? (
  <React.StrictMode>
    <App />
  </React.StrictMode>
) : <App />);
