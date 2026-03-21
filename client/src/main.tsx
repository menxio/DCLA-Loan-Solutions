import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AuthBootstrap from "./features/auth/AuthBootstrap";
import AppRouter from "./routes/index";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthBootstrap>
        <AppRouter />
      </AuthBootstrap>
    </BrowserRouter>
  </React.StrictMode>
);
