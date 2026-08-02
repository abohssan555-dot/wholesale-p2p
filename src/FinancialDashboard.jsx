import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import { Package, LogOut, Loader2, Wallet, TrendingUp } from "lucide-react";

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

function Settlements() {
  const [mode, setMode] = useState("traders");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [refInput, setRefInput] = useState({});

  const load = () => {
    setLoading(true);
    const query =
      mode === "traders"
        ? supabase.from("trader_invoices").select("*, profiles!trader_id(store_name, full_name)")
        : mode === "drivers"
        ? supabase.from("driver_earnings").select("*, profiles!driver_id(full_name)")
        : supabase.from("return_settlements").select("*, profiles!trader_id(store_name, full_name)");

    query
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInvoices(data || []);
        setLoading(false);
      });
  };

  useEffect(load, [mode]);

  const settle = async (id) => {
    setBusyId(id);
    const rpcName = mode === "traders" ? "settle_trader_invoice" : mode === "drivers" ? "settle_driver_earning" : "settle_return";
    const paramName = mode === "traders" ? "p_invoice_id" : mode === "drivers" ? "p_earning_id" : "p_settlement_id";
    await supabase.rpc(rpcName, { [paramName]: id, p_reference: refInput[id] || null });
    setBusyId(null);
    load();
  };

  const amountField = mode === "traders" ? "net_payable" : mode === "drivers" ? "driver_payable" : "amount_owed";
  const pending = invoices.filter((i) => i.status === "pending");
  const totalPending = pending.reduce((s, i) => s + Number(i[amountField]), 0);

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button onClick={() => setMode("traders")} className="flex-1 text-xs font-medium py-2 rounded-lg" style={{ background: mode === "traders" ? T.ink : "#fff", color: mode === "traders" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}>التجّار</button>
        <button onClick={() => setMode("drivers")} className="flex-1 text-xs font-medium py-2 rounded-lg" style={{ background: mode === "drivers" ? T.ink : "#fff", color: mode === "drivers" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}>السائقون</button>
        <button onClick={() => setMode("returns")} className="flex-1 text-xs font-medium py-2 rounded-lg" style={{ background: mode === "returns" ? T.ink : "#fff", color: mode === "returns" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}>مرتجعات مستحقة</button>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="text-xs" style={{ color: T.sub }}>
          {mode === "returns" ? "إجمالي المستحق على التجّار من مرتجعات (يُخصم من مستحقاتهم القادمة)" : `إجمالي المستحقات قيد التحويل (${mode === "traders" ? "كل التجّار" : "كل السائقين"})`}
        </div>
        <div className="text-2xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sealDeep }}>
          {totalPending.toFixed(2)} <span className="text-xs font-normal" style={{ color: T.sub }}>ر.س</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {invoices.length === 0 ? (
          <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لا توجد بيانات بعد.</div>
        ) : invoices.map((inv) => (
          <div key={inv.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: T.ink }}>
                {mode === "drivers" ? (inv.profiles?.full_name || "—") : (inv.profiles?.store_name || inv.profiles?.full_name || "—")}
              </div>
              <div className="text-[11px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
                {mode === "traders"
                  ? `طلب #${inv.order_id?.slice(0, 8)} · إجمالي: ${inv.subtotal} ر.س · عمولة: ${inv.commission_amount} ر.س · صافي: ${inv.net_payable} ر.س`
                  : mode === "drivers"
                  ? `طلب #${inv.order_id?.slice(0, 8)} · رسوم توصيل: ${inv.delivery_fee} ر.س · مستحق: ${inv.driver_payable} ر.س`
                  : `مبلغ مستحق على التاجر (مرتجع): ${inv.amount_owed} ر.س`}
              </div>
            </div>
            {inv.status === "settled" ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ background: T.goodBg, color: T.good }}>
                تم التحويل {inv.settlement_reference ? `— ${inv.settlement_reference}` : ""}
              </span>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <input placeholder="رقم التحويل (اختياري)" value={refInput[inv.id] || ""} onChange={(e) => setRefInput((r) => ({ ...r, [inv.id]: e.target.value }))} className="text-xs rounded-lg py-1.5 px-2 outline-none w-32" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
                <button onClick={() => settle(inv.id)} disabled={busyId === inv.id} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.ink, color: "#fff" }}>
                  {busyId === inv.id ? "..." : "تأكيد الخصم/التحصيل"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinancialDashboard() {
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
    supabase.from("user_roles").select("role_id").eq("user_id", session.user.id).eq("role_id", "financial_supervisor").maybeSingle()
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
              {profile?.full_name ? `أهلاً بك، ${profile.full_name}` : "لوحة المشرف المالي"}
            </div>
          </div>
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.sub }}>
          <LogOut size={14} /> خروج
        </button>
      </header>

      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ background: T.goodBg, border: "1px solid #BFE0CE" }}>
          <TrendingUp size={20} style={{ color: T.good }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>لوحة التحكم الخاصة بالمشرف المالي</div>
            <div className="text-[11px]" style={{ color: T.sub }}>اعتماد تسويات التجّار والسائقين على منصة أصناف الجملة</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Wallet size={15} style={{ color: T.sealDeep }} />
          <span className="text-sm font-semibold" style={{ color: T.ink }}>التسويات المالية</span>
        </div>

        <Settlements />
      </div>
    </div>
  );
}
