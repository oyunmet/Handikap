import React from "react";
import { createRoot } from "react-dom/client";
import RoyalGameApp from "./RoyalGameApp.jsx";
import "./royal-root.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RoyalGameApp />
  </React.StrictMode>,
);
