import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import NieStyleApp from "./NieStyleApp.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NieStyleApp />
  </StrictMode>
);
