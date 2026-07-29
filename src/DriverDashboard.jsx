import React, { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import {
  Package, Truck, LogOut, Home, Loader2, MapPin, Store,
  CheckCircle2, Clock, Navigation, AlertTriangle,
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
  badBg: "#F6E8E5",
  sub: "#5B5748",
};

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

const STATUS_LABELS = {
  confirmed: "بانتظار سائق",
  preparing: "قيد التحضير",
  out_for_delivery: "بالطريق للعميل",
  delivered: "تم التسليم",
};

const NEXT_STATUS = {
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_LABEL = {
  preparing: "بدء التوصيل",
  out_for_delivery: "تأكيد التسليم",
};

function OrderCard({ order, mode, onClaim, onAdvance, busy }) {
  const traderNames = [...new Set((order.order_items || []).map((i) => i.trader_id))];
  return (
    <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
          طلب #{order.id.slice(0, 8)}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: order.status === "delivered" ? T.goodBg : "#FBF1DD",
            color: order.status === "delivered" ? T.good : T.sealDeep,
          }}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.ink }}>
        <MapPin size={12} style={{ color: T.sealDeep }} />
        {order.delivery_city || "بدون مدينة محددة"} {order.delivery_address ? `— ${order.delivery_address}` : ""}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] mb-3" style={{ color: T.sub }}>
        <Store size={11} /> {traderNames.length} تاجر · {(order.order_items || []).length} صنف
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>
          {order.subtotal} ر.س
        </span>

        {mode === "available" && (
          <button
            onClick={() => onClaim(order.id)}
            disabled={busy}
            className="text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5"
            style={{ background: T.ink, color: "#fff" }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
            استلام الطلب
          </button>
        )}

        {mode === "mine" && NEXT_STATUS[order.status] && (
          <button
            onClick={() => onAdvance(order.id, NEXT_STATUS[order.status])}
            disabled={busy}
            className="text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5"
            style={{ background: T.ink, color: "#fff" }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
            {NEXT_LABEL[order.status]}
          </button>
        )}

        {mode === "mine" && order.status === "delivered" && (
          <span className="text-xs font-medium flex items-center gap-1" style={{ color: T.good }}>
            <CheckCircle2 size={13} /> منتهي
          </span>
        )}
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  useFonts();
  useIdleLogout(30);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(null);
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

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
    supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", session.user.id)
      .eq("role_id", "driver")
      .maybeSingle()
      .then(({ data }) => setAuthorized(!!data));
    supabase.from("profiles").select("full_name").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  const loadOrders = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data: avail } = await supabase
      .from("orders")
      .select("*, order_items(trader_id)")
      .is("driver_id", null)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });
    setAvailable(avail || []);

    const { data: myOrders } = await supabase
      .from("orders")
      .select("*, order_items(trader_id)")
      .eq("driver_id", session.user.id)
      .order("created_at", { ascending: false });
    setMine(myOrders || []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (authorized) loadOrders();
  }, [authorized, loadOrders]);

  const claim = async (orderId) => {
    setErr("");
    setBusyId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ driver_id: session.user.id, status: "preparing" })
      .eq("id", orderId)
      .is("driver_id", null)
      .eq("status", "confirmed");
    setBusyId(null);
    if (error) {
      setErr("تعذّر استلام الطلب — يُحتمل أن سائقاً آخر استلمه قبلك.");
    }
    loadOrders();
  };

  const advance = async (orderId, nextStatus) => {
    setBusyId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("driver_id", session.user.id);
    setBusyId(null);
    if (error) setErr("تعذّر تحديث حالة الطلب.");
    loadOrders();
  };

  if (checking || (session && authorized === null)) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
      </div>
    );
  }
  if (!session || authorized === false) return <Navigate to="/login" replace />;

  const activeMine = mine.filter((o) => o.status !== "delivered");
  const doneMine = mine.filter((o) => o.status === "delivered");

  return (
    <div dir="rtl" className="w-full min-h-screen" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}>
      <header className="px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-10" style={{ background: T.paper, borderBottom: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              {profile?.full_name ? `أهلاً بك، ${profile.full_name}` : "لوحة السائق"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: T.sub, border: `1px solid ${T.line}`, textDecoration: "none" }}>
            <Home size={13} /> الرئيسية
          </Link>
          <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.sub }}>
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ background: T.goodBg, border: `1px solid #BFE0CE` }}>
          <Truck size={20} style={{ color: T.good }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>
              أهلاً بك، {profile?.full_name || "..."}
            </div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              هذه لوحة التحكم الخاصة بالسائق {profile?.full_name || ""} على منصة أصناف الجملة
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("available")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            style={{ background: tab === "available" ? T.ink : "#fff", color: tab === "available" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            <Clock size={13} /> طلبات متاحة {available.length > 0 && `(${available.length})`}
          </button>
          <button
            onClick={() => setTab("mine")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            style={{ background: tab === "mine" ? T.ink : "#fff", color: tab === "mine" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            <Truck size={13} /> طلباتي {activeMine.length > 0 && `(${activeMine.length})`}
          </button>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-xs mb-3 p-3 rounded-lg" style={{ background: T.badBg, color: T.bad }}>
            <AlertTriangle size={13} /> {err}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={18} style={{ color: T.sealDeep }} /></div>
        ) : (
          <div className="flex flex-col gap-3">
            {tab === "available" && (
              available.length === 0 ? (
                <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
                  لا توجد طلبات متاحة حالياً.
                </div>
              ) : available.map((o) => <OrderCard key={o.id} order={o} mode="available" onClaim={claim} busy={busyId === o.id} />)
            )}

            {tab === "mine" && (
              <>
                {activeMine.map((o) => <OrderCard key={o.id} order={o} mode="mine" onAdvance={advance} busy={busyId === o.id} />)}
                {activeMine.length === 0 && doneMine.length === 0 && (
                  <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
                    لا توجد طلبات مسندة إليك حالياً.
                  </div>
                )}
                {doneMine.length > 0 && (
                  <>
                    <div className="text-xs font-medium mt-2" style={{ color: T.sub }}>الطلبات المكتملة</div>
                    {doneMine.map((o) => <OrderCard key={o.id} order={o} mode="mine" busy={false} />)}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
