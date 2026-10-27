import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/theme.css";
import { AuthProvider } from "./state/AuthContext";
import { CampaignProvider } from "./state/CampaignContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CampaignProvider>
          <App />
        </CampaignProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
