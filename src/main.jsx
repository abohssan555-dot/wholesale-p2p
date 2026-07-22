import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ManagerDashboard from "./ManagerDashboard.jsx";
import TraderOnboarding from "./TraderOnboarding.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<ManagerDashboard />} />
        <Route path="/trader" element={<TraderOnboarding />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
