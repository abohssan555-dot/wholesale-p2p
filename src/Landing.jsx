import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
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
  LogIn,
} from "lucide-react";

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

    const style = document.createElement("style");
    style.textContent = `
      @keyframes ticker-scroll {
        0% { transform: translateX(-100vw); }
        100% { transform: translateX(100vw); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
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
  { title: "انطلاق أصناف الجملة رسمياً في المدينة المنورة", tag: "إطلاق" },
  { title: "برنامج نقاط الولاء لعملاء المؤسسات قريباً", tag: "قريباً" },
  { title: "إضافة قسم توصيل الخضار والفواكه الطازجة", tag: "تطوير" },
];

const STATS_META = [
  { key: "approved_traders", icon: Store, label: "تاجر معتمد" },
  { key: "business_customers", icon: Building2, label: "عميل مؤسسة" },
  { key: "approved_drivers", icon: Truck, label: "سائق نشط" },
  { key: "cities", icon: MapPin, label: "مدينة مُغطّاة" },
];

function StatsStrip({ stats }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {STATS_META.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}>
            <Icon size={13} style={{ color: T.sealDeep }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats?.[s.key] ?? "—"}</span>
            <span style={{ color: T.sub }}>{s.label}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}>
        <Package size={13} style={{ color: T.sealDeep }} />
        <span style={{ color: T.sub }}>منتج على المنصة: قريباً</span>
      </div>
    </div>
  );
}

function RoleModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(20,33,59,0.55)" }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ background: "#fff", border: `1px solid ${T.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: T.ink }}>اختر دورك</span>
          <button onClick={onClose}><X size={16} style={{ color: T.sub }} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <a
                key={r.id}
                href={r.href}
                className="rounded-lg p-4 flex flex-col items-center text-center gap-2"
                style={{ background: T.paper, border: `1px solid ${T.line}`, textDecoration: "none" }}
              >
                <Icon size={20} style={{ color: T.sealDeep }} />
                <span className="text-xs font-medium" style={{ color: T.ink }}>{r.title}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
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
  const [showRoles, setShowRoles] = useState(false);
  const [ads, setAds] = useState([]);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    supabase.rpc("public_platform_stats").then(({ data }) => setStats(data));
    supabase.rpc("get_active_ads", { p_placement: "landing_page" }).then(({ data }) => {
      setAds(data || []);
      const displayedSlots = ["banner_large", "banner_square", "ticker"];
      (data || []).filter((a) => displayedSlots.includes(a.slot_id)).forEach((a) => supabase.rpc("log_ad_view", { p_booking_id: a.id }));
    });
    const t = setTimeout(() => setShowPopup(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const adFor = (slotId) => {
    const b = ads.find((a) => a.slot_id === slotId);
    if (!b) return null;
    return { ...b, url: b.media_path ? supabase.storage.from("ad-creatives").getPublicUrl(b.media_path).data.publicUrl : null };
  };
  const largeAd = adFor("banner_large");
  const squareAd = adFor("banner_square");
  const tickerAds = ads
    .filter((a) => a.slot_id === "ticker")
    .map((a) => ({ ...a, url: a.media_path ? supabase.storage.from("ad-creatives").getPublicUrl(a.media_path).data.publicUrl : null }));

  useEffect(() => {
    if (tickerAds.length < 2) return;
    const interval = setInterval(() => {
      setTickerIndex((i) => (i + 1) % tickerAds.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [tickerAds.length]);

  const currentTickerAd = tickerAds[tickerIndex % Math.max(tickerAds.length, 1)];

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper, minHeight: "100vh" }}>
      {/* Header */}
      <header className="px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-40" style={{ background: T.ink }}>
        <div className="flex items-center gap-2">
          {/* عند توفر ملف الشعار، استبدل هذا الصندوق بـ <img src="/logo.png" className="w-9 h-9 rounded-md object-contain" /> */}
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[15px]" style={{ color: "#fff" }}>أصناف الجملة</span>
        </div>
        <a
          href="/login"
          className="text-xs font-semibold flex items-center gap-1.5 px-4 py-2 rounded-full transition-transform hover:-translate-y-0.5"
          style={{ background: T.seal, color: T.ink, textDecoration: "none" }}
        >
          <LogIn size={13} /> تسجيل الدخول
        </a>
      </header>

      {currentTickerAd && (
        <div style={{ background: T.paper, borderBottom: `1px solid ${T.line}`, overflow: "hidden", position: "relative", height: 56 }}>
          <a
            key={currentTickerAd.id + "-" + tickerIndex}
            href={currentTickerAd.link_url || "#"}
            className="inline-flex items-center gap-2"
            style={{
              position: "absolute",
              top: "50%",
              whiteSpace: "nowrap",
              textDecoration: "none",
              animation: "ticker-scroll 9s linear 1",
              transform: "translateY(-50%)",
            }}
          >
            {currentTickerAd.content_type === "text" ? (
              <span className="text-sm font-medium" style={{ color: T.sealDeep }}>{currentTickerAd.text_content}</span>
            ) : (
              <img src={currentTickerAd.url} alt="إعلان" className="rounded object-cover align-middle" style={{ height: 48, width: 192 }} />
            )}
          </a>
        </div>
      )}

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
          تصفّح، اطلب، واستلم من أي تاجر جملة معتمد — بفاتورة واحدة وتجربة شراء موحّدة، بغض النظر عن عدد التجّار الذين تطلب منهم.
        </p>
        <button onClick={() => setShowRoles(true)} className="inline-flex items-center gap-1 text-sm font-medium px-5 py-2.5 rounded-lg" style={{ background: T.ink, color: "#fff", border: "none", cursor: "pointer" }}>
          ابدأ من هنا <ArrowLeft size={14} />
        </button>
      </section>

      {/* Stats */}
      

      <section className="px-6 md:px-10 pb-10 max-w-5xl mx-auto">
        <StatsStrip stats={stats} />
      </section>

      {/* الإعلانات — المساحة الرئيسية المستغلة من دمج قسم الأدوار */}
      <section className="px-6 md:px-10 pb-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={16} style={{ color: T.sealDeep }} />
          <span className="text-sm font-semibold" style={{ color: T.ink }}>إعلانات التجّار</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {largeAd ? (
            <a
              href={largeAd.link_url || "#"}
              className="md:col-span-2 rounded-xl overflow-hidden block"
              style={{ border: `1px solid ${T.line}`, aspectRatio: "1200 / 300" }}
            >
              <img src={largeAd.url} alt="إعلان" className="w-full h-full object-cover" />
            </a>
          ) : (
            <div
              className="md:col-span-2 rounded-xl p-6 flex items-center gap-4"
              style={{ background: "linear-gradient(90deg, #FBF1DD, #F6F3EC)", border: `1px dashed ${T.seal}` }}
            >
              <Megaphone size={24} style={{ color: T.sealDeep }} className="shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: T.ink }}>مساحة إعلانية مميزة — بانر كبير</div>
                <div className="text-xs mt-1" style={{ color: T.sub }}>يُحجز من لوحة تحكم التاجر بمقاسات وأسعار مختلفة، ويظهر هنا لكل زوار المنصة.</div>
              </div>
              <a href="/trader" className="text-xs font-medium px-3 py-2 rounded-lg shrink-0" style={{ background: T.ink, color: "#fff", textDecoration: "none" }}>
                احجز مساحتك
              </a>
            </div>
          )}
          {squareAd ? (
            <a href={squareAd.link_url || "#"} className="rounded-xl overflow-hidden block" style={{ border: `1px solid ${T.line}`, aspectRatio: "1 / 1" }}>
              <img src={squareAd.url} alt="إعلان" className="w-full h-full object-cover" />
            </a>
          ) : (
            <div className="rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2" style={{ background: T.paperDeep, border: `1px dashed ${T.line}` }}>
              <Megaphone size={20} style={{ color: T.sub }} />
              <div className="text-xs" style={{ color: T.sub }}>مساحة إعلانية مربّعة — متاحة للحجز</div>
            </div>
          )}
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
        أصناف الجملة © 2026
      </footer>

      {showPopup && <PopupBanner onClose={() => setShowPopup(false)} />}
      {showRoles && <RoleModal onClose={() => setShowRoles(false)} />}
    </div>
  );
}
