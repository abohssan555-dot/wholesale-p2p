import React, { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import {
  Package, Truck, LogOut, Home, Loader2, MapPin, Store, Wallet,
  CheckCircle2, Clock, Navigation, AlertTriangle, Star,
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
};

const NEXT_LABEL = {
  preparing: "بدء التوصيل",
};

function OrderCard({ order, mode, onClaim, onAdvance, onConfirmPin, onReportIssue, busy }) {
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const traderNames = [...new Set((order.order_items || []).map((i) => i.trader_id))];

  const submitPin = async () => {
    setPinErr("");
    const ok = await onConfirmPin(order.id, pin);
    if (!ok) setPinErr("الرمز غير صحيح — تأكد منه مع العميل وحاول مرة أخرى.");
  };

  return (
    <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
          طلب #{order.id.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1.5">
          {order.delivery_speed === "express" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: T.badBg, color: T.bad }}>سريع منفرد</span>
          )}
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
      </div>

      <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.ink }}>
        <MapPin size={12} style={{ color: T.sealDeep }} />
        {order.delivery_city || "بدون مدينة محددة"} {order.delivery_address ? `— ${order.delivery_address}` : ""}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] mb-3" style={{ color: T.sub }}>
        <Store size={11} /> {traderNames.length} تاجر · {(order.order_items || []).length} صنف
      </div>

      {mode === "mine" && order.status === "out_for_delivery" && (
        <div className="rounded-lg p-3 mb-3" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
          <label className="text-[11px] font-medium block mb-1" style={{ color: T.sub }}>
            اطلب رمز التسليم من العميل (4 أرقام) لإتمام التسليم
          </label>
          <div className="flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              className="flex-1 text-sm text-center rounded-lg py-2 px-3 outline-none"
              style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em" }}
            />
            <button
              onClick={submitPin}
              disabled={busy || pin.length !== 4}
              className="text-xs font-medium px-3 rounded-lg"
              style={{ background: T.good, color: "#fff" }}
            >
              تأكيد
            </button>
          </div>
          {pinErr && <div className="text-[11px] mt-1.5" style={{ color: T.bad }}>{pinErr}</div>}
          {!showIssue ? (
            <button onClick={() => setShowIssue(true)} className="text-[11px] font-medium mt-2" style={{ color: T.bad }}>
              العميل لا يتجاوب / رفض إعطاء الرمز
            </button>
          ) : (
            <div className="mt-2">
              <textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="اكتب وصفاً موجزاً للمشكلة..."
                className="w-full text-xs rounded-lg py-2 px-3 outline-none mb-2"
                style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
                rows={2}
              />
              <button
                onClick={() => onReportIssue(order.id, issueNote)}
                disabled={busy || !issueNote.trim()}
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: T.bad, color: "#fff" }}
              >
                تصعيد للمشرف اللوجستي
              </button>
            </div>
          )}
        </div>
      )}

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

function StarRatingMini({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} style={{ lineHeight: 0 }}>
          <Star size={18} fill={(hover || value) >= n ? T.seal : "none"} color={T.seal} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

function RateCustomerButton({ orderId, customerId }) {
  const [rated, setRated] = useState(null);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("ratings").select("id").eq("order_id", orderId).eq("rated_id", customerId).maybeSingle()
      .then(({ data }) => setRated(!!data));
  }, [orderId, customerId]);

  const submit = async () => {
    if (stars === 0) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_rating", { p_order_id: orderId, p_rated_id: customerId, p_stars: stars, p_comment: comment.trim() || null });
    setBusy(false);
    if (!error) { setRated(true); setOpen(false); }
  };

  if (!customerId || rated === null) return null;
  if (rated) return <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ background: T.goodBg, color: T.good }}>✓ قيّمت العميل</span>;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "#FBF1DD", color: T.sealDeep, border: "1px solid #E8D5A8" }}>
        <Star size={10} /> قيّم العميل
      </button>
      {open && (
        <div className="absolute z-10 mt-1 p-3 rounded-lg" style={{ background: "#fff", border: `1px solid ${T.line}`, width: 220, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div className="mb-2"><StarRatingMini value={stars} onChange={setStars} /></div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="تعليق (اختياري)" className="w-full text-xs rounded-lg py-1.5 px-2 mb-2 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          <button onClick={submit} disabled={busy} className="w-full text-xs font-medium py-1.5 rounded-lg" style={{ background: T.ink, color: "#fff" }}>{busy ? "..." : "إرسال"}</button>
        </div>
      )}
    </div>
  );
}

function DriverWalletPanel({ session }) {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemErr, setRedeemErr] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const loadPoints = () => {
    supabase.from("profiles").select("loyalty_points").eq("id", session.user.id).single()
      .then(({ data }) => setPoints(data?.loyalty_points || 0));
  };

  useEffect(() => {
    supabase
      .from("driver_earnings")
      .select("*, orders(customer_id, profiles!customer_id(business_name, full_name))")
      .eq("driver_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEarnings(data || []);
        setLoading(false);
      });
    loadPoints();
  }, [session]);

  const redeem = async () => {
    setRedeemErr("");
    const p = Number(redeemPoints);
    if (!p || p <= 0 || p > points) {
      setRedeemErr("أدخل عدد نقاط صحيح ومتوفر برصيدك.");
      return;
    }
    setRedeemBusy(true);
    const { error } = await supabase.rpc("redeem_points_to_wallet", { p_points: p });
    setRedeemBusy(false);
    if (error) {
      setRedeemErr(error.message || "تعذّر التحويل.");
      return;
    }
    setRedeemPoints("");
    setRedeemSuccess(true);
    setTimeout(() => setRedeemSuccess(false), 2500);
    loadPoints();
  };

  if (loading) return <div className="text-sm text-center py-10" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  const pending = earnings.filter((e) => e.status === "pending");
  const settled = earnings.filter((e) => e.status === "settled");
  const pendingTotal = pending.reduce((s, e) => s + Number(e.driver_payable), 0);
  const settledTotal = settled.reduce((s, e) => s + Number(e.driver_payable), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="text-[11px]" style={{ color: T.sub }}>مستحق قيد التحويل</div>
          <div className="text-xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sealDeep }}>
            {pendingTotal.toFixed(2)} <span className="text-xs font-normal">ر.س</span>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="text-[11px]" style={{ color: T.sub }}>تم تحويله سابقاً</div>
          <div className="text-xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.good }}>
            {settledTotal.toFixed(2)} <span className="text-xs font-normal">ر.س</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#FBF1DD", border: "1px solid #E8D5A8" }}>
        <div className="text-[11px]" style={{ color: T.sealDeep }}>نقاط الولاء</div>
        <div className="text-2xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sealDeep }}>
          {points} <span className="text-xs font-normal">نقطة</span>
        </div>
        <div className="text-[10px] mt-1 mb-2" style={{ color: T.sealDeep }}>تكسب نقطة عن كل 10 ريال رسوم توصيل — 10 نقاط = 1 ريال</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
            placeholder="عدد النقاط"
            className="flex-1 text-xs rounded-lg py-1.5 px-2 outline-none"
            style={{ background: "#fff", border: "1px solid #E8D5A8", color: T.ink }}
          />
          <button onClick={redeem} disabled={redeemBusy} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.ink, color: "#fff" }}>
            {redeemBusy ? "..." : redeemSuccess ? "تم ✓" : "تحويل لرصيد"}
          </button>
        </div>
        {redeemErr && <div className="text-[11px] mt-1.5" style={{ color: T.bad }}>{redeemErr}</div>}
      </div>

      <div className="flex flex-col gap-2">
        {earnings.length === 0 ? (
          <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
            لا توجد مستحقات بعد — تظهر تلقائياً بعد كل عملية تسليم مكتملة.
          </div>
        ) : earnings.map((e) => (
          <div key={e.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <div>
              <div className="text-xs font-medium flex items-center gap-2" style={{ color: T.ink }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>طلب #{e.order_id.slice(0, 8)}</span>
                <span style={{ color: T.sub, fontWeight: 400, fontSize: 11 }}>{new Date(e.created_at).toLocaleDateString("ar-SA")}</span>
              </div>
              {e.settlement_reference && (
                <div className="text-[11px] mt-1" style={{ color: T.good }}>مرجع التحويل: {e.settlement_reference}</div>
              )}
              <div className="text-[10px] mt-1" style={{ color: T.sub }}>
                رسوم التوصيل: {e.delivery_fee} ر.س − عمولة المنصة (10%) = {e.driver_payable} ر.س
              </div>
              {e.orders?.customer_id && (
                <div className="mt-1.5">
                  <RateCustomerButton orderId={e.order_id} customerId={e.orders.customer_id} />
                </div>
              )}
            </div>
            <div className="text-left shrink-0">
              <div className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>{e.driver_payable} ر.س</div>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={e.status === "settled" ? { background: T.goodBg, color: T.good } : { background: "#FBF1DD", color: T.sealDeep }}
              >
                {e.status === "settled" ? "تم التحويل" : "قيد الانتظار"}
              </span>
            </div>
          </div>
        ))}
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
  const [availableReturns, setAvailableReturns] = useState([]);
  const [myReturns, setMyReturns] = useState([]);

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

  const ORDER_COLS = "id, status, delivery_city, delivery_address, subtotal, delivery_speed, requested_vehicle_type, delivery_issue_note, driver_id, created_at, order_items(trader_id)";

  const RETURN_COLS = "id, status, reason, refund_amount, return_delivery_fee, driver_id, created_at, orders(delivery_city, delivery_address), customer:profiles!customer_id(full_name, business_name, phone), trader:profiles!trader_id(store_name, city)";

  const loadReturns = useCallback(async () => {
    if (!session) return;
    const { data: avail } = await supabase
      .from("return_requests")
      .select(RETURN_COLS)
      .is("driver_id", null)
      .eq("status", "approved")
      .order("decided_at", { ascending: true });
    setAvailableReturns(avail || []);

    const { data: mineData } = await supabase
      .from("return_requests")
      .select(RETURN_COLS)
      .eq("driver_id", session.user.id)
      .in("status", ["approved", "picked_up"])
      .order("decided_at", { ascending: false });
    setMyReturns(mineData || []);
  }, [session]);

  const loadOrders = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data: avail } = await supabase
      .from("orders")
      .select(ORDER_COLS)
      .is("driver_id", null)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });
    setAvailable(avail || []);

    const { data: myOrders } = await supabase
      .from("orders")
      .select(ORDER_COLS)
      .eq("driver_id", session.user.id)
      .order("created_at", { ascending: false });
    setMine(myOrders || []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (authorized) { loadOrders(); loadReturns(); }
  }, [authorized, loadOrders, loadReturns]);

  const claim = async (orderId) => {
    setErr("");
    setBusyId(orderId);

    const { data: canClaim } = await supabase.rpc("can_driver_claim_order", { p_order_id: orderId });
    if (!canClaim) {
      setBusyId(null);
      setErr("لا يمكنك استلام هذا الطلب حالياً — إما لديك طلب \"سريع\" شغّال، أو هذا الطلب سريع ولديك طلبات أخرى قيد التنفيذ.");
      return;
    }

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

  const confirmWithPin = async (orderId, pin) => {
    setErr("");
    setBusyId(orderId);
    const { data: ok, error } = await supabase.rpc("confirm_delivery", { p_order_id: orderId, p_entered_pin: pin });
    setBusyId(null);
    if (error || !ok) {
      return false;
    }
    loadOrders();
    return true;
  };

  const reportIssue = async (orderId, note) => {
    setBusyId(orderId);
    await supabase.rpc("report_delivery_issue", { p_order_id: orderId, p_note: note });
    setBusyId(null);
    setErr("تم تصعيد المشكلة للمشرف اللوجستي.");
    loadOrders();
  };

  const claimReturn = async (returnId) => {
    setErr("");
    setBusyId(returnId);
    const { error } = await supabase
      .from("return_requests")
      .update({ driver_id: session.user.id })
      .eq("id", returnId)
      .is("driver_id", null)
      .eq("status", "approved");
    setBusyId(null);
    if (error) setErr("تعذّر استلام هذا المرتجع — يُحتمل أن سائقاً آخر استلمه قبلك.");
    loadReturns();
  };

  const advanceReturn = async (returnId, nextStatus) => {
    setBusyId(returnId);
    const { error } = await supabase
      .from("return_requests")
      .update({ status: nextStatus })
      .eq("id", returnId)
      .eq("driver_id", session.user.id);
    setBusyId(null);
    if (error) setErr("تعذّر تحديث حالة المرتجع.");
    loadReturns();
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
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: "none" }} title="الصفحة الرئيسية">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              {profile?.full_name ? `أهلاً بك، ${profile.full_name}` : "لوحة السائق"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setTab("wallet")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            style={{ background: tab === "wallet" ? T.good : T.goodBg, color: tab === "wallet" ? "#fff" : T.good, border: "1px solid #BFE0CE" }}
          >
            <Wallet size={13} /> المحفظة
          </button>
          <button
            onClick={() => setTab("returns")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            style={{ background: tab === "returns" ? T.seal : "#FBF1DD", color: tab === "returns" ? T.ink : T.sealDeep, border: "1px solid #E8D5A8" }}
          >
            <Package size={13} /> المرتجعات {availableReturns.length > 0 && `(${availableReturns.length})`}
          </button>
        </div>

        {tab === "wallet" && <DriverWalletPanel session={session} />}

        {err && tab !== "wallet" && tab !== "returns" && (
          <div className="flex items-center gap-2 text-xs mb-3 p-3 rounded-lg" style={{ background: T.badBg, color: T.bad }}>
            <AlertTriangle size={13} /> {err}
          </div>
        )}

        {tab === "returns" && (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-medium" style={{ color: T.sub }}>مرتجعات بانتظار الاستلام</div>
            {availableReturns.length === 0 ? (
              <div className="text-xs text-center py-8 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لا توجد مرتجعات متاحة حالياً.</div>
            ) : availableReturns.map((r) => (
              <div key={r.id} className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
                <div className="text-xs font-medium mb-1" style={{ color: T.ink }}>استلام من: {r.customer?.business_name || r.customer?.full_name}</div>
                <div className="text-[11px] mb-1" style={{ color: T.sub }}>{r.orders?.delivery_city} — {r.orders?.delivery_address}</div>
                <div className="text-[11px] mb-2" style={{ color: T.sub }}>تسليم إلى: {r.trader?.store_name}</div>
                <button onClick={() => claimReturn(r.id)} disabled={busyId === r.id} className="text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: T.ink, color: "#fff" }}>
                  {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />} استلام هذا المرتجع
                </button>
              </div>
            ))}

            <div className="text-xs font-medium mt-2" style={{ color: T.sub }}>مرتجعاتي الحالية</div>
            {myReturns.length === 0 ? (
              <div className="text-xs text-center py-8 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>ما عندك مرتجعات شغّالة حالياً.</div>
            ) : myReturns.map((r) => (
              <div key={r.id} className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
                <div className="text-xs font-medium mb-1" style={{ color: T.ink }}>من: {r.customer?.business_name || r.customer?.full_name}</div>
                <div className="text-[11px] mb-2" style={{ color: T.sub }}>
                  {r.status === "approved" ? "بالطريق للاستلام من العميل" : "بالطريق لتسليم التاجر"}
                </div>
                {r.status === "approved" ? (
                  <button onClick={() => advanceReturn(r.id, "picked_up")} disabled={busyId === r.id} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: T.ink, color: "#fff" }}>
                    تم الاستلام من العميل
                  </button>
                ) : (
                  <button onClick={() => advanceReturn(r.id, "completed")} disabled={busyId === r.id} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: T.good, color: "#fff" }}>
                    تم التسليم للتاجر
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab !== "wallet" && tab !== "returns" && (loading ? (
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
                {activeMine.map((o) => <OrderCard key={o.id} order={o} mode="mine" onAdvance={advance} onConfirmPin={confirmWithPin} onReportIssue={reportIssue} busy={busyId === o.id} />)}
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
        ))}
      </div>
    </div>
  );
}
