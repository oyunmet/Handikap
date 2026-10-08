import React from "react";
import { createRoot } from "react-dom/client";
import ShafakApp from "./shafak/App.tsx";
import "./shafak/tokens.css";
import "./shafak/App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ShafakApp />
  </React.StrictMode>,
);
