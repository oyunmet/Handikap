import React from "react";
import { createRoot } from "react-dom/client";
import AuthEntry from "./shafak/auth/EnvironmentRouter.tsx";
import "./shafak/tokens.css";
import "./shafak/App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthEntry />
  </React.StrictMode>,
);
