import React, { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import CatalogImportPanel from "./CatalogImportPanel.jsx";
import {
  LayoutGrid,
  ShieldCheck,
  Users,
  ScrollText,
  Store,
  Building2,
  Truck,
  TrendingUp,
  Package,
  Wallet,
  Check,
  X,
  ChevronLeft,
  Home,
  Database,
  FileText,
  LogOut,
  Loader2,
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

const TYPE_META = {
  trader: { label: "تاجر", icon: Store },
  business_customer: { label: "عميل مؤسسة", icon: Building2 },
  driver: { label: "سائق", icon: Truck },
};

const STAGE_LABEL = {
  submitted: "مُقدَّم",
  logistics_review: "ترشيح المشرف اللوجستي",
  final_review: "اعتماد نهائي",
  approved: "معتمد",
  rejected: "مرفوض",
};

function Badge({ children, tone = "seal" }) {
  const map = {
    seal: { bg: "#FBF1DD", fg: T.sealDeep },
    good: { bg: T.goodBg, fg: T.good },
    bad: { bg: T.badBg, fg: T.bad },
  };
  const c = map[tone];
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg }}>
      {children}
    </span>
  );
}

function Stamp({ label, tone }) {
  const color = tone === "good" ? T.good : T.bad;
  return (
    <div
      className="inline-flex items-center gap-1 border-2 rounded-md px-2 py-1 -rotate-3 select-none"
      style={{ borderColor: color, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
    >
      {tone === "good" ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}

const NAV = [
  { id: "overview", label: "نظرة عامة", icon: LayoutGrid },
  { id: "approvals", label: "طلبات الاعتماد", icon: ShieldCheck },
  { id: "accounts", label: "الحسابات والأدوار", icon: Users },
  { id: "catalog", label: "الكتالوج المرجعي", icon: Database },
  { id: "settlements", label: "التسويات المالية", icon: Wallet },
  { id: "audit", label: "سجل التدقيق", icon: ScrollText },
];

function Sidebar({ active, setActive, pendingCount, me, onLogout }) {
  return (
    <aside className="w-64 shrink-0 h-full flex flex-col" style={{ background: T.ink, color: "#F1EEE4" }}>
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: `1px solid rgba(246,243,236,0.12)` }}>
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: "none", color: "inherit" }} title="الصفحة الرئيسية">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px] leading-tight">أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: "#B9B4A2" }}>لوحة مدير الموقع</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const badge = item.id === "approvals" ? pendingCount : 0;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                background: isActive ? "rgba(184,134,43,0.18)" : "transparent",
                color: isActive ? "#F6F3EC" : "#C7C2B0",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={17} style={{ color: isActive ? T.seal : "#8B8674" }} />
                {item.label}
              </span>
              {badge > 0 ? (
                <span className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center" style={{ background: T.seal, color: T.ink, fontWeight: 700 }}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pb-5 pt-3" style={{ borderTop: `1px solid rgba(246,243,236,0.12)` }}>
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: "rgba(246,243,236,0.06)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: T.seal, color: T.ink }}>
            {(me?.full_name || "؟").slice(0, 2)}
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{me?.full_name || "..."}</div>
            <div className="text-[11px]" style={{ color: "#8B8674" }}>مدير الموقع</div>
          </div>
          <button onClick={onLogout} title="تسجيل خروج">
            <LogOut size={15} style={{ color: "#8B8674" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------
   Overview — KPI cards stay illustrative (mock) since orders/
   products tables don't exist yet; approvals count is real.
---------------------------------------------------------- */
function Overview({ pendingCount }) {
  const KPIS = [
    { label: "إجمالي المبيعات (٣٠ يوم)", value: "—", unit: "قريباً", icon: TrendingUp },
    { label: "طلبات قيد التنفيذ", value: "—", unit: "قريباً", icon: Package },
    { label: "طلبات اعتماد مفتوحة", value: String(pendingCount), unit: "طلب", icon: ShieldCheck, real: true },
    { label: "عمولة المنصة (٣٠ يوم)", value: "—", unit: "قريباً", icon: Wallet },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: T.paperDeep }}>
                <Icon size={16} style={{ color: T.sealDeep }} />
              </div>
              <div>
                <div className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: k.real ? T.ink : "#B7B2A0" }}>
                  {k.value}
                  <span className="text-xs font-normal ms-1" style={{ color: T.sub }}>{k.unit}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: T.sub }}>{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs rounded-lg p-4" style={{ background: T.paperDeep, color: T.sub }}>
        باقي المؤشرات (المبيعات، الطلبات، العمولة) هتشتغل فعلياً لما نبني جداول المنتجات والطلبات في الخطوة الجاية.
      </div>
    </div>
  );
}

function Approvals({ requests, loading, onDecide }) {
  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;
  if (requests.length === 0) return <div className="text-sm" style={{ color: T.sub }}>لا توجد طلبات اعتماد حالياً.</div>;

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => {
        const meta = TYPE_META[r.applicant_type] || {};
        const Icon = meta.icon || FileText;
        const decided = r.stage === "approved" || r.stage === "rejected";
        return (
          <div key={r.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paperDeep }}>
              <Icon size={19} style={{ color: T.sealDeep }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: T.ink }}>
                  {r.profiles?.full_name || "بدون اسم"}
                </span>
                <span className="text-[10px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
                  {r.id.slice(0, 8)}
                </span>
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: T.sub }}>
                {meta.label} · قُدّم {new Date(r.submitted_at).toLocaleDateString("ar-SA")}
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {(r.documents || []).map((d, i) => (
                  <span key={i} className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: T.paper, color: T.sub, border: `1px solid ${T.line}` }}>
                    <FileText size={11} />
                    {d.label || d}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-left shrink-0">
              {decided ? (
                <Stamp label={STAGE_LABEL[r.stage]} tone={r.stage === "approved" ? "good" : "bad"} />
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => onDecide(r.id, "rejected")} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.badBg, color: T.bad }}>
                    <X size={16} />
                  </button>
                  <button onClick={() => onDecide(r.id, "approved")} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.goodBg, color: T.good }}>
                    <Check size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Accounts({ accounts, loading }) {
  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: T.paper, color: T.sub }}>
            <th className="text-start font-medium px-5 py-3">الاسم</th>
            <th className="text-start font-medium px-5 py-3">الدور</th>
            <th className="text-start font-medium px-5 py-3">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 ? (
            <tr><td colSpan={3} className="px-5 py-4 text-sm" style={{ color: T.sub }}>لا يوجد حسابات مسجّلة بعد.</td></tr>
          ) : accounts.map((a, i) => (
            <tr key={a.id} style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <td className="px-5 py-3.5 font-medium" style={{ color: T.ink }}>{a.full_name}</td>
              <td className="px-5 py-3.5" style={{ color: T.sub }}>
                {(a.user_roles || []).map((ur) => ur.roles?.name_ar).filter(Boolean).join("، ") || "بدون دور"}
              </td>
              <td className="px-5 py-3.5">
                <Badge tone={a.status === "active" ? "good" : "bad"}>{a.status === "active" ? "نشط" : "معلّق"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Settlements() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [refInput, setRefInput] = useState({});

  const load = () => {
    setLoading(true);
    supabase
      .from("trader_invoices")
      .select("*, profiles!trader_id(store_name, full_name)")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInvoices(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const settle = async (invoiceId) => {
    setBusyId(invoiceId);
    await supabase.rpc("settle_trader_invoice", { p_invoice_id: invoiceId, p_reference: refInput[invoiceId] || null });
    setBusyId(null);
    load();
  };

  const pending = invoices.filter((i) => i.status === "pending");
  const totalPending = pending.reduce((s, i) => s + Number(i.net_payable), 0);

  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="text-xs" style={{ color: T.sub }}>إجمالي المستحقات قيد التحويل لكل التجّار</div>
        <div className="text-2xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sealDeep }}>
          {totalPending.toFixed(2)} <span className="text-xs font-normal" style={{ color: T.sub }}>ر.س</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {invoices.length === 0 ? (
          <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
            لا توجد فواتير تجّار بعد.
          </div>
        ) : invoices.map((inv) => (
          <div key={inv.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: T.ink }}>
                {inv.profiles?.store_name || inv.profiles?.full_name || "—"}
              </div>
              <div className="text-[11px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
                إجمالي: {inv.subtotal} ر.س · عمولة: {inv.commission_amount} ر.س · صافي: {inv.net_payable} ر.س
              </div>
            </div>
            {inv.status === "settled" ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ background: T.goodBg, color: T.good }}>
                تم التحويل {inv.settlement_reference ? `— ${inv.settlement_reference}` : ""}
              </span>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <input
                  placeholder="رقم التحويل (اختياري)"
                  value={refInput[inv.id] || ""}
                  onChange={(e) => setRefInput((r) => ({ ...r, [inv.id]: e.target.value }))}
                  className="text-xs rounded-lg py-1.5 px-2 outline-none w-32"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
                />
                <button
                  onClick={() => settle(inv.id)}
                  disabled={busyId === inv.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: T.ink, color: "#fff" }}
                >
                  {busyId === inv.id ? "..." : "تأكيد التحويل"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Audit({ entries, loading }) {
  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;
  return (
    <div className="rounded-xl p-5" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      {entries.length === 0 ? (
        <div className="text-sm" style={{ color: T.sub }}>لا توجد أحداث مسجّلة بعد.</div>
      ) : (
        <div className="flex flex-col">
          {entries.map((e, i) => (
            <div key={e.id} className="flex gap-4 pb-4 mb-4 relative" style={{ borderBottom: i < entries.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <div className="flex flex-col items-center pt-1">
                <div className="w-2 h-2 rounded-full" style={{ background: T.seal }} />
                {i < entries.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: T.line }} />}
              </div>
              <div>
                <div className="text-sm" style={{ color: T.ink }}>{e.action}</div>
                <div className="text-[12px] mt-1" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
                  {e.profiles?.full_name || "النظام"} · {new Date(e.created_at).toLocaleString("ar-SA")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  useFonts();
  useIdleLogout(30); // تسجيل خروج تلقائي بعد 30 دقيقة خمول
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState("overview");
  const [me, setMe] = useState(null);
  const [requests, setRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState({ requests: true, accounts: true, audit: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAll = useCallback(async () => {
    if (!session) return;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setMe(profile);

    setLoading((l) => ({ ...l, requests: true, accounts: true, audit: true }));

    const { data: reqs, error: reqsErr } = await supabase
      .from("verification_requests")
      .select("*, profiles!applicant_id(full_name)")
      .order("submitted_at", { ascending: false });
    if (reqsErr) console.error("verification_requests fetch error:", reqsErr);
    setRequests(reqs || []);
    setLoading((l) => ({ ...l, requests: false }));

    const { data: accs } = await supabase
      .from("profiles")
      .select("*, user_roles(role_id, roles(name_ar))")
      .order("created_at", { ascending: false });
    setAccounts(accs || []);
    setLoading((l) => ({ ...l, accounts: false }));

    const { data: log } = await supabase
      .from("audit_log")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(30);
    setAudit(log || []);
    setLoading((l) => ({ ...l, audit: false }));
  }, [session]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const decide = async (id, stage) => {
    const patch = { stage };
    if (stage === "approved") patch.approved_by = session.user.id;
    const { error } = await supabase.from("verification_requests").update(patch).eq("id", id);
    if (!error) loadAll();
  };

  if (checking) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const pendingCount = requests.filter((r) => r.stage !== "approved" && r.stage !== "rejected").length;

  const PAGES = {
    overview: { title: "نظرة عامة", node: <Overview pendingCount={pendingCount} /> },
    approvals: { title: "طلبات الاعتماد", node: <Approvals requests={requests} loading={loading.requests} onDecide={decide} /> },
    accounts: { title: "الحسابات والأدوار", node: <Accounts accounts={accounts} loading={loading.accounts} /> },
    catalog: { title: "الكتالوج المرجعي", node: <CatalogImportPanel session={session} /> },
    settlements: { title: "التسويات المالية", node: <Settlements /> },
    audit: { title: "سجل التدقيق", node: <Audit entries={audit} loading={loading.audit} /> },
  };

  return (
    <div dir="rtl" className="w-full h-screen flex" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}>
      <Sidebar active={active} setActive={setActive} pendingCount={pendingCount} me={me} onLogout={() => supabase.auth.signOut()} />
      <main className="flex-1 h-full overflow-y-auto">
        <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10" style={{ background: T.paper, borderBottom: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: T.sub }}>
            <span>أصناف الجملة</span>
            <ChevronLeft size={14} />
            <span style={{ color: T.ink, fontWeight: 600 }}>{PAGES[active].title}</span>
          </div>
        </header>
        <div className="p-8">{PAGES[active].node}</div>
      </main>
    </div>
  );
}
