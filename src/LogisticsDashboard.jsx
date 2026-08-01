import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import { Package, LogOut, Loader2, ShieldCheck, AlertTriangle, Image as ImageIcon, Truck } from "lucide-react";

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

const STAGE_LABELS = { pending: "قيد المراجعة", docs_review: "مراجعة المستندات", approved: "معتمد", rejected: "مرفوض" };

function Approvals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    supabase
      .from("verification_requests")
      .select("*, profiles!applicant_id(full_name)")
      .neq("stage", "approved")
      .neq("stage", "rejected")
      .order("submitted_at", { ascending: false })
      .then(({ data }) => {
        setRequests(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const decide = async (id, stage) => {
    await supabase.from("verification_requests").update({ stage }).eq("id", id);
    load();
  };

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-2">
      {requests.length === 0 ? (
        <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لا توجد طلبات بانتظار المراجعة.</div>
      ) : requests.map((r) => (
        <div key={r.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium" style={{ color: T.ink }}>{r.profiles?.full_name || "—"}</div>
            <div className="text-[11px]" style={{ color: T.sub }}>{r.applicant_type} · {STAGE_LABELS[r.stage] || r.stage}</div>
          </div>
          <button onClick={() => decide(r.id, "rejected")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.badBg, color: T.bad }}>رفض</button>
          <button onClick={() => decide(r.id, "approved")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.good, color: "#fff" }}>اعتماد</button>
        </div>
      ))}
    </div>
  );
}

function DeliveryIssues() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    supabase
      .from("orders")
      .select("id, status, delivery_city, delivery_issue_note, driver_id, profiles!driver_id(full_name)")
      .not("delivery_issue_note", "is", null)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const clearIssue = async (id) => {
    await supabase.from("orders").update({ delivery_issue_note: null }).eq("id", id);
    load();
  };

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-2">
      {orders.length === 0 ? (
        <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لا توجد مشاكل توصيل مصعّدة حالياً.</div>
      ) : orders.map((o) => (
        <div key={o.id} className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #EEC9C2" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.ink }}>
              <Truck size={13} style={{ color: T.bad }} /> طلب #{o.id.slice(0, 8)} — السائق: {o.profiles?.full_name || "—"}
            </span>
            <button onClick={() => clearIssue(o.id)} className="text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ background: T.goodBg, color: T.good }}>
              تم الحل
            </button>
          </div>
          <div className="text-xs" style={{ color: T.bad }}>{o.delivery_issue_note}</div>
          <div className="text-[11px] mt-1" style={{ color: T.sub }}>{o.delivery_city}</div>
        </div>
      ))}
    </div>
  );
}

function AdReviews() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [mediaUrls, setMediaUrls] = useState({});

  const load = () => {
    setLoading(true);
    supabase
      .from("ad_bookings")
      .select("*, profiles!trader_id(store_name, full_name), ad_slots(name_ar, recommended_width, recommended_height)")
      .in("status", ["pending_payment", "pending_review"])
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        setBookings(data || []);
        setLoading(false);
        const urls = {};
        for (const b of data || []) {
          if (b.media_path) {
            const { data: signed } = await supabase.storage.from("ad-creatives").createSignedUrl(b.media_path, 3600);
            if (signed) urls[b.id] = signed.signedUrl;
          }
        }
        setMediaUrls(urls);
      });
  };

  useEffect(load, []);

  const approve = async (id) => {
    setBusyId(id);
    await supabase.rpc("approve_ad_booking", { p_booking_id: id });
    setBusyId(null);
    load();
  };
  const reject = async (id) => {
    setBusyId(id);
    await supabase.rpc("reject_ad_booking", { p_booking_id: id });
    setBusyId(null);
    load();
  };

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-2">
      {bookings.length === 0 ? (
        <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لا توجد طلبات إعلانية بانتظار المراجعة.</div>
      ) : bookings.map((b) => (
        <div key={b.id} className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          {b.content_type === "text" ? (
            <div className="rounded-lg p-3 mb-3" style={{ background: "#FBF1DD", color: T.sealDeep }}>{b.text_content}</div>
          ) : mediaUrls[b.id] && (
            <div className="rounded-lg overflow-hidden mb-3" style={{ background: T.paper, border: `1px solid ${T.line}`, aspectRatio: `${b.ad_slots?.recommended_width || 16} / ${b.ad_slots?.recommended_height || 9}`, maxHeight: 220 }}>
              <img src={mediaUrls[b.id]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium" style={{ color: T.ink }}>{b.profiles?.store_name || b.profiles?.full_name} · {b.ad_slots?.name_ar}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => reject(b.id)} disabled={busyId === b.id} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.badBg, color: T.bad }}>رفض</button>
              <button onClick={() => approve(b.id)} disabled={busyId === b.id} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.good, color: "#fff" }}>اعتماد</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LogisticsDashboard() {
  useFonts();
  useIdleLogout(30);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("approvals");

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
    supabase.from("user_roles").select("role_id").eq("user_id", session.user.id).eq("role_id", "logistics_supervisor").maybeSingle()
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

  const TABS = [
    { id: "approvals", label: "طلبات الاعتماد", icon: ShieldCheck },
    { id: "issues", label: "مشاكل التوصيل", icon: AlertTriangle },
    { id: "ads", label: "الإعلانات", icon: ImageIcon },
  ];

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
              {profile?.full_name ? `أهلاً بك، ${profile.full_name}` : "لوحة المشرف اللوجستي"}
            </div>
          </div>
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.sub }}>
          <LogOut size={14} /> خروج
        </button>
      </header>

      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="flex gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5"
              style={{ background: tab === t.id ? T.ink : "#fff", color: tab === t.id ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "approvals" && <Approvals />}
        {tab === "issues" && <DeliveryIssues />}
        {tab === "ads" && <AdReviews />}
      </div>
    </div>
  );
}
