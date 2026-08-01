import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import { Package, LogOut, Loader2, Search, MapPin, Store, HelpCircle } from "lucide-react";

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
  badBg: "#F6E8E5",
  sub: "#5B5748",
};

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

const STATUS_LABELS = {
  pending: "معلَّق", confirmed: "قيد التنفيذ", preparing: "قيد التحضير",
  out_for_delivery: "بالطريق للعميل", delivered: "تم التسليم", cancelled: "ملغى",
};

function OrderLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSelected(null);
    // بحث برقم الطلب (جزء منه) أو باسم العميل
    const { data: byId } = await supabase
      .from("orders")
      .select("*, profiles!customer_id(full_name, business_name, city), driver:profiles!driver_id(full_name)")
      .ilike("id", `%${query.trim()}%`)
      .limit(10);

    let combined = byId || [];
    if (combined.length === 0) {
      const { data: byCustomer } = await supabase
        .from("orders")
        .select("*, profiles!customer_id(full_name, business_name, city), driver:profiles!driver_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      combined = (byCustomer || []).filter((o) =>
        (o.profiles?.full_name || "").includes(query.trim()) || (o.profiles?.business_name || "").includes(query.trim())
      );
    }
    setResults(combined);
    setLoading(false);
  };

  const openOrder = async (o) => {
    setSelected(o);
    const { data } = await supabase.from("order_items").select("product_name, quantity, unit_price, line_total, trader_id, profiles!trader_id(store_name)").eq("order_id", o.id);
    setItems(data || []);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: T.sub }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم الطلب أو اسم العميل..."
            className="w-full text-sm rounded-lg py-2 pe-9 ps-3 outline-none"
            style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
          />
        </div>
        <button type="submit" className="text-xs font-medium px-4 py-2 rounded-lg" style={{ background: T.ink, color: "#fff" }}>بحث</button>
      </form>

      {loading && <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={18} style={{ color: T.sealDeep }} /></div>}

      {!loading && results.length > 0 && !selected && (
        <div className="flex flex-col gap-2">
          {results.map((o) => (
            <button key={o.id} onClick={() => openOrder(o)} className="text-right rounded-xl p-3 flex items-center justify-between" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <div>
                <div className="text-xs font-medium" style={{ color: T.ink, fontFamily: "'JetBrains Mono', monospace" }}>#{o.id.slice(0, 8)}</div>
                <div className="text-[11px]" style={{ color: T.sub }}>{o.profiles?.business_name || o.profiles?.full_name}</div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FBF1DD", color: T.sealDeep }}>{STATUS_LABELS[o.status] || o.status}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-xl p-5" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <button onClick={() => setSelected(null)} className="text-[11px] font-medium mb-3" style={{ color: T.sealDeep }}>← رجوع للنتائج</button>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: T.ink, fontFamily: "'JetBrains Mono', monospace" }}>طلب #{selected.id.slice(0, 8)}</span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: "#FBF1DD", color: T.sealDeep }}>{STATUS_LABELS[selected.status] || selected.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mb-4" style={{ color: T.sub }}>
            <div><span className="font-medium" style={{ color: T.ink }}>العميل:</span> {selected.profiles?.business_name || selected.profiles?.full_name}</div>
            <div className="flex items-center gap-1"><MapPin size={11} /> {selected.delivery_city} {selected.zone === "outside_city" ? "(خارج المدينة)" : ""}</div>
            <div><span className="font-medium" style={{ color: T.ink }}>السائق:</span> {selected.driver?.full_name || "لم يُستلم بعد"}</div>
            <div><span className="font-medium" style={{ color: T.ink }}>الإجمالي:</span> {selected.total} ر.س (منتجات {selected.subtotal} + توصيل {selected.delivery_fee})</div>
          </div>

          <div className="text-xs font-medium mb-2" style={{ color: T.ink }}>المنتجات</div>
          <div className="flex flex-col gap-1.5">
            {items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-xs" style={{ color: T.ink }}>
                <span className="flex items-center gap-1"><Store size={10} style={{ color: T.sealDeep }} /> {it.product_name} × {it.quantity} <span style={{ color: T.sub }}>({it.profiles?.store_name})</span></span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sub }}>{it.line_total} ر.س</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerServiceDashboard() {
  useFonts();
  useIdleLogout(30);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("user_roles").select("role_id").eq("user_id", session.user.id).eq("role_id", "customer_support").maybeSingle()
      .then(({ data }) => setAuthorized(!!data));
    supabase.from("profiles").select("full_name").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  if (checking || (session && authorized === null)) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
      </div>
    );
  }
  if (!session || authorized === false) return <Navigate to="/login" replace />;

  return (
    <div dir="rtl" className="w-full min-h-screen" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}>
      <header className="px-6 md:px-10 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.line}` }}>
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: "none" }} title="الصفحة الرئيسية">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              {profile?.full_name ? `أهلاً بك، ${profile.full_name}` : "لوحة خدمة العملاء"}
            </div>
          </div>
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.sub }}>
          <LogOut size={14} /> خروج
        </button>
      </header>

      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ background: T.goodBg, border: "1px solid #BFE0CE" }}>
          <HelpCircle size={20} style={{ color: T.good }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>لوحة التحكم الخاصة بخدمة العملاء</div>
            <div className="text-[11px]" style={{ color: T.sub }}>ابحث عن أي طلب لمساعدة العميل بسرعة أثناء المكالمة أو المحادثة</div>
          </div>
        </div>

        <OrderLookup />
      </div>
    </div>
  );
}
