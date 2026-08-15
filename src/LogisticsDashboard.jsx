import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import { Package, LogOut, Loader2, ShieldCheck, AlertTriangle, Image as ImageIcon, Truck, Store } from "lucide-react";

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

function StoreLaunchRequests() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, store_name, city")
      .eq("store_launch_status", "pending")
      .then(async ({ data }) => {
        setRequests(data || []);
        setLoading(false);
        const c = {};
        for (const t of data || []) {
          const { count } = await supabase.from("trader_listings").select("id", { count: "exact", head: true }).eq("trader_id", t.id);
          c[t.id] = count || 0;
        }
        setCounts(c);
      });
  };

  useEffect(load, []);

  const approve = async (traderId) => {
    setBusyId(traderId);
    await supabase.rpc("approve_store_launch", { p_trader_id: traderId });
    setBusyId(null);
    load();
  };

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;
  if (requests.length === 0) return null;

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: T.ink }}>
        <Store size={15} style={{ color: T.sealDeep }} /> طلبات انطلاق بيع جديدة ({requests.length})
      </div>
      <div className="flex flex-col gap-2">
        {requests.map((t) => (
          <div key={t.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
            <div>
              <div className="text-xs font-medium" style={{ color: T.ink }}>{t.store_name || t.full_name}</div>
              <div className="text-[11px]" style={{ color: T.sub }}>{t.city || "—"} · {counts[t.id] ?? "..."} منتج مرفوع</div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/trader/dashboard" target="_blank" rel="noreferrer" className="text-[11px] font-medium underline" style={{ color: T.sealDeep }}>
                معاينة (سجّل دخول التاجر لو احتجت)
              </a>
              <button onClick={() => approve(t.id)} disabled={busyId === t.id} className="text-[11px] font-medium px-3 py-1.5 rounded-lg" style={{ background: T.good, color: "#fff" }}>
                {busyId === t.id ? "..." : "اعتماد الانطلاق"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Approvals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoneInput, setZoneInput] = useState({});
  const [distInput, setDistInput] = useState({});

  const load = () => {
    setLoading(true);
    supabase
      .from("verification_requests")
      .select("*, profiles!applicant_id(full_name, location_link, delivery_zone, distance_km)")
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

  const saveDistance = async (applicantId) => {
    const zone = zoneInput[applicantId];
    const dist = distInput[applicantId];
    if (!zone || !dist) return;
    await supabase.rpc("assign_customer_distance", { p_user_id: applicantId, p_zone: zone, p_distance_km: Number(dist) });
    load();
  };

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-2">
      {requests.length === 0 ? (
        <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لا توجد طلبات بانتظار المراجعة.</div>
      ) : requests.map((r) => (
        <div key={r.id} className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: T.ink }}>{r.profiles?.full_name || "—"}</div>
              <div className="text-[11px]" style={{ color: T.sub }}>{r.applicant_type} · {STAGE_LABELS[r.stage] || r.stage}</div>
            </div>
            <button onClick={() => decide(r.id, "rejected")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.badBg, color: T.bad }}>رفض</button>
            <button onClick={() => decide(r.id, "approved")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.good, color: "#fff" }}>اعتماد</button>
          </div>

          {r.applicant_type === "business_customer" && (
            <div className="rounded-lg p-3 mt-2" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
              <div className="text-[11px] font-medium mb-2" style={{ color: T.sub }}>تحديد منطقة ومسافة التوصيل (للرسوم — مرة وحدة بس)</div>
              {r.profiles?.location_link ? (
                <a href={r.profiles.location_link} target="_blank" rel="noreferrer" className="text-[11px] font-medium block mb-2" style={{ color: T.sealDeep }}>
                  📍 فتح موقع العميل على خرائط قوقل
                </a>
              ) : (
                <div className="text-[11px] mb-2" style={{ color: T.bad }}>العميل لم يرفق رابط موقع.</div>
              )}
              {r.profiles?.delivery_zone ? (
                <div className="text-[11px]" style={{ color: T.good }}>
                  محدَّد مسبقاً: {r.profiles.delivery_zone === "inside_city" ? "داخل المدينة" : "خارج المدينة"} — {r.profiles.distance_km} كم
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={zoneInput[r.applicant_id] || ""}
                    onChange={(e) => setZoneInput((s) => ({ ...s, [r.applicant_id]: e.target.value }))}
                    className="text-xs rounded-lg py-1.5 px-2 outline-none"
                    style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
                  >
                    <option value="">المنطقة</option>
                    <option value="inside_city">داخل المدينة</option>
                    <option value="outside_city">خارج المدينة</option>
                  </select>
                  <input
                    type="number"
                    placeholder="المسافة (كم)"
                    value={distInput[r.applicant_id] || ""}
                    onChange={(e) => setDistInput((s) => ({ ...s, [r.applicant_id]: e.target.value }))}
                    className="text-xs rounded-lg py-1.5 px-2 outline-none w-28"
                    style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
                  />
                  <button
                    onClick={() => saveDistance(r.applicant_id)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
                    style={{ background: T.ink, color: "#fff" }}
                  >
                    حفظ
                  </button>
                </div>
              )}
            </div>
          )}
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

        {tab === "approvals" && (
          <>
            <StoreLaunchRequests />
            <Approvals />
          </>
        )}
        {tab === "issues" && <DeliveryIssues />}
        {tab === "ads" && <AdReviews />}
      </div>
    </div>
  );
}
