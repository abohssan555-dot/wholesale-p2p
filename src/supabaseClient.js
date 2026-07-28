import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://euiuybhgdzcrdrfjjrut.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YcAYaChM0-SEGkLTFmElbQ_PsS1m3YM";

// تخزين الجلسة يعتمد على خيار "تذكرني" وقت تسجيل الدخول:
// لو مفعّل → localStorage (تفضل الجلسة بعد إغلاق المتصفح)
// لو مو مفعّل → sessionStorage (تنمسح لما يسكّر المتصفح)
const rememberAwareStorage = {
  getItem: (key) => {
    const remember = localStorage.getItem("wp2p-remember") === "true";
    return (remember ? localStorage : sessionStorage).getItem(key);
  },
  setItem: (key, value) => {
    const remember = localStorage.getItem("wp2p-remember") === "true";
    (remember ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: rememberAwareStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function setRememberMe(remember) {
  localStorage.setItem("wp2p-remember", remember ? "true" : "false");
}

// خريطة الدور → المسار اللي يوديه له بعد تسجيل الدخول
export const ROLE_ROUTES = {
  site_manager: "/admin",
  financial_supervisor: "/admin", // نفس لوحة الإدارة حالياً، هتنفصل لاحقاً
  logistics_supervisor: "/admin",
  customer_support: "/admin",
  trader: "/trader/dashboard",
  business_customer: "/business/shop",
  driver: "/driver/dashboard",
  individual_customer: "/individual",
};

export const ROLE_LABELS = {
  site_manager: "مدير الموقع",
  financial_supervisor: "مشرف مالي",
  logistics_supervisor: "مشرف لوجستي",
  customer_support: "خدمة عملاء",
  trader: "تاجر",
  business_customer: "عميل مؤسسة",
  driver: "سائق",
  individual_customer: "عميل فردي",
};

// الأدوار الإدارية الأربعة تظهر للزوار كخيار واحد "الإدارة" بدل
// ما تكشف مسمّيات داخلية (مدير/مالي/لوجستي/دعم) في شاشة دخول عامة.
export const ADMIN_ROLE_IDS = ["site_manager", "financial_supervisor", "logistics_supervisor", "customer_support"];

export const LOGIN_OPTIONS = [
  { id: "admin", label: "الإدارة" },
  { id: "trader", label: "تاجر" },
  { id: "business_customer", label: "عميل مؤسسة" },
  { id: "driver", label: "سائق" },
  { id: "individual_customer", label: "عميل فردي" },
];
