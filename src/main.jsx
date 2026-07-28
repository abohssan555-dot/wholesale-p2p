import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ManagerDashboard from "./ManagerDashboard.jsx";
import OnboardingFlow from "./OnboardingFlow.jsx";
import IndividualCustomer from "./IndividualCustomer.jsx";
import Landing from "./Landing.jsx";
import Login from "./Login.jsx";
import TraderDashboard from "./TraderDashboard.jsx";
import ProductBrowse from "./ProductBrowse.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
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
        <Route path="/trader/dashboard" element={<TraderDashboard />} />
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
        <Route path="/business/shop" element={<ProductBrowse />} />
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
        <Route path="/individual" element={<IndividualCustomer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
