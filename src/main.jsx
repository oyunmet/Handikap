import React from "react";
import { createRoot } from "react-dom/client";
import AuthApp from "./shafak/auth/AuthApp.tsx";
import "./shafak/tokens.css";
import "./shafak/App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthApp />
  </React.StrictMode>,
);
