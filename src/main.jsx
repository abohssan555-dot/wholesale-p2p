import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ManagerDashboard from "./ManagerDashboard.jsx";
import OnboardingFlow from "./OnboardingFlow.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* مؤقت: يحول الصفحة الرئيسية لدخول المدير لين نبني صفحة هبوط حقيقية */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<ManagerDashboard />} />
        <Route
          path="/trader"
          element={
            <OnboardingFlow
              applicantType="trader"
              title="تسجيل تاجر جديد"
              requiredDocs={["السجل التجاري", "رخصة بلدية"]}
            />
          }
        />
        <Route
          path="/business"
          element={
            <OnboardingFlow
              applicantType="business_customer"
              title="تسجيل عميل مؤسسة"
              requiredDocs={["السجل التجاري", "هوية المفوّض"]}
            />
          }
        />
        <Route
          path="/driver"
          element={
            <OnboardingFlow
              applicantType="driver"
              title="تسجيل سائق جديد"
              requiredDocs={["رخصة القيادة", "استمارة المركبة"]}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
