import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Package,
  Store,
  Building2,
  Truck,
  User,
  ArrowLeft,
  TrendingUp,
  MapPin,
  Star,
  Megaphone,
  X,
  ShieldCheck,
} from "lucide-react";

const SUPABASE_URL = "https://euiuybhgdzcrdrfjjrut.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YcAYaChM0-SEGkLTFmElbQ_PsS1m3YM";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const T = {
  ink: "#14213B",
  paper: "#F6F3EC",
  paperDeep: "#EFE9DA",
  line: "#DCD5C4",
  seal: "#B8862B",
  sealDeep: "#8C6018",
  good: "#2F6F4E",
  goodBg: "#E7F1EA",
  bad: "#A23B2E",
  sub: "#5B5748",
};

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

const ROLES = [
  { id: "trader", icon: Store, title: "تاجر جملة", desc: "اعرض متجرك ومنتجاتك لآلاف العملاء", href: "/trader" },
  { id: "business", icon: Building2, title: "عميل مؤسسة", desc: "أسعار جملة، آجل، وعروض مخصصة", href: "/business" },
  { id: "driver", icon: Truck, title: "سائق توصيل", desc: "اقبل طلبات التوصيل بجدولك الخاص", href: "/driver" },
  { id: "individual", icon: User, title: "عميل فردي", desc: "دخول سريع بدون تعقيد", href: "/individual" },
];

// أخبار مؤقتة — هتتحول لجدول حقيقي (news) لاحقاً
const NEWS = [
  { title: "انطلاق منصة الجملة رسمياً في المدينة المنورة", tag: "إطلاق" },
  { title: "برنامج نقاط الولاء لعملاء المؤسسات قريباً", tag: "قريباً" },
  { title: "إضافة قسم توصيل الخضار والفواكه الطازجة", tag: "تطوير" },
];

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paperDeep }}>
        <Icon size={18} style={{ color: T.sealDeep }} />
      </div>
      <div>
        <div className="text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>{value}</div>
        <div className="text-[11px]" style={{ color: T.sub }}>{label}</div>
      </div>
    </div>
  );
}

function RoleCard({ role }) {
  const Icon = role.icon;
  return (
    <a
      href={role.href}
      className="rounded-xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
      style={{ background: "#fff", border: `1px solid ${T.line}`, textDecoration: "none" }}
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: T.paperDeep }}>
        <Icon size={20} style={{ color: T.sealDeep }} />
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: T.ink }}>{role.title}</div>
        <div className="text-xs mt-1" style={{ color: T.sub }}>{role.desc}</div>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium mt-1" style={{ color: T.sealDeep }}>
        ابدأ الآن <ArrowLeft size={13} />
      </div>
    </a>
  );
}

function PopupBanner({ onClose }) {
  return (
    <div
      className="fixed bottom-5 left-5 z-50 rounded-xl p-4 flex items-start gap-3 max-w-xs shadow-lg"
      style={{ background: T.ink, color: "#F6F3EC" }}
    >
      <Megaphone size={18} style={{ color: T.seal, marginTop: 2 }} className="shrink-0" />
      <div className="flex-1">
        <div className="text-xs font-semibold mb-1">مساحتك الإعلانية هنا</div>
        <div className="text-[11px]" style={{ color: "#B9B4A2" }}>
          تجّار المنصة يقدرون يحجزون بانر زي هذا من لوحة التحكم الخاصة فيهم.
        </div>
      </div>
      <button onClick={onClose} className="shrink-0">
        <X size={14} style={{ color: "#B9B4A2" }} />
      </button>
    </div>
  );
}

export default function Landing() {
  useFonts();
  const [stats, setStats] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    supabase.rpc("public_platform_stats").then(({ data }) => setStats(data));
    const t = setTimeout(() => setShowPopup(true), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper, minHeight: "100vh" }}>
      {/* Header */}
      <header className="px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-40" style={{ background: T.paper, borderBottom: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[15px]" style={{ color: T.ink }}>منصة الجملة</span>
        </div>
        <a
          href="/login"
          className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ color: T.sub, border: `1px solid ${T.line}`, textDecoration: "none" }}
        >
          <ShieldCheck size={13} /> تسجيل الدخول
        </a>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-10 pt-14 pb-10 max-w-5xl mx-auto text-center">
        <div
          className="inline-block text-[11px] font-medium px-3 py-1 rounded-full mb-4"
          style={{ background: "#FBF1DD", color: T.sealDeep }}
        >
          بوابة عبور تجّار الجملة إلى عملائهم
        </div>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4" style={{ color: T.ink }}>
          كل تجّار الجملة، تحت سقف واحد
        </h1>
        <p className="text-sm md:text-base max-w-xl mx-auto mb-8" style={{ color: T.sub }}>
          تصفّح، اطلب، واستلم من أي تاجر جملة معتمد — بفاتورة واحدة وتجربة شراء موحّدة، بغض النظر عن عدد التجّار اللي تطلب منهم.
        </p>
        <a href="#roles" className="inline-flex items-center gap-1 text-sm font-medium px-5 py-2.5 rounded-lg" style={{ background: T.ink, color: "#fff", textDecoration: "none" }}>
          ابدأ من هنا <ArrowLeft size={14} />
        </a>
      </section>

      {/* Stats */}
      <section className="px-6 md:px-10 pb-10 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Store} value={stats?.approved_traders ?? "—"} label="تاجر معتمد" />
          <StatCard icon={Building2} value={stats?.business_customers ?? "—"} label="عميل مؤسسة" />
          <StatCard icon={Truck} value={stats?.approved_drivers ?? "—"} label="سائق نشط" />
          <StatCard icon={MapPin} value={stats?.cities ?? "—"} label="مدينة مُغطّاة" />
          <StatCard icon={Package} value="قريباً" label="منتج على المنصة" />
        </div>
      </section>

      {/* Role cards */}
      <section id="roles" className="px-6 md:px-10 pb-12 max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold mb-1" style={{ color: T.ink }}>وش دورك؟</h2>
        <p className="text-xs mb-5" style={{ color: T.sub }}>اختر المسار المناسب لك وابدأ التسجيل.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map((r) => <RoleCard key={r.id} role={r} />)}
        </div>
      </section>

      {/* Ad banner strip */}
      <section className="px-6 md:px-10 pb-12 max-w-5xl mx-auto">
        <div
          className="rounded-xl p-5 flex items-center gap-4 -rotate-[0.3deg]"
          style={{ background: "linear-gradient(90deg, #FBF1DD, #F6F3EC)", border: `1px dashed ${T.seal}` }}
        >
          <Megaphone size={22} style={{ color: T.sealDeep }} className="shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: T.ink }}>مساحة إعلانية مميزة</div>
            <div className="text-xs" style={{ color: T.sub }}>هنا تظهر إعلانات التجّار المدفوعة — تُحجز من لوحة تحكم التاجر بمقاسات وأسعار مختلفة.</div>
          </div>
          <a href="/trader" className="text-xs font-medium px-3 py-2 rounded-lg shrink-0" style={{ background: T.ink, color: "#fff", textDecoration: "none" }}>
            احجز مساحتك
          </a>
        </div>
      </section>

      {/* News + Ratings */}
      <section className="px-6 md:px-10 pb-16 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 rounded-xl p-5" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: T.sealDeep }} />
            <span className="text-sm font-semibold" style={{ color: T.ink }}>آخر الأخبار</span>
          </div>
          <div className="flex flex-col gap-3">
            {NEWS.map((n, i) => (
              <div key={i} className="flex items-center gap-3 pb-3" style={{ borderBottom: i < NEWS.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: T.paperDeep, color: T.sealDeep }}>{n.tag}</span>
                <span className="text-[13px]" style={{ color: T.ink }}>{n.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} style={{ color: T.sealDeep }} />
            <span className="text-sm font-semibold" style={{ color: T.ink }}>تقييم المنصة</span>
          </div>
          <div className="text-center py-2">
            <div className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>—</div>
            <div className="flex justify-center gap-0.5 my-2">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} style={{ color: T.line }} />)}
            </div>
            <div className="text-[11px]" style={{ color: T.sub }}>لسه ما فيه تقييمات — يبدأ يتفعّل بعد أول طلبات فعلية</div>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-6 text-center text-[11px]" style={{ color: T.sub, borderTop: `1px solid ${T.line}` }}>
        منصة الجملة © 2026
      </footer>

      {showPopup && <PopupBanner onClose={() => setShowPopup(false)} />}
    </div>
  );
}
