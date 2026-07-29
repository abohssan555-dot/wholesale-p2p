import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, setRememberMe } from "./supabaseClient.js";
import { Upload, FileText, Loader2, CheckCircle2, Clock, XCircle, Package, ArrowRight, Home } from "lucide-react";

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

function Shell({ subtitle, children }) {
  const navigate = useNavigate();
  return (
    <div
      dir="rtl"
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg"
            style={{ color: T.sub }}
          >
            <ArrowRight size={14} /> رجوع
          </button>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg"
            style={{ color: T.sub, textDecoration: "none" }}
          >
            الصفحة الرئيسية <Home size={14} />
          </Link>
        </div>
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      {children}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>{label}</label>
      <input
        {...props}
        className="w-full text-sm rounded-lg py-2 px-3 outline-none"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
      />
    </div>
  );
}

function Steps({ step }) {
  const labels = ["بيانات الحساب", "رفع المستندات", "قيد المراجعة"];
  return (
    <div className="flex items-center gap-2 mb-6 justify-center">
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={{ background: i <= step ? T.seal : T.paperDeep, color: i <= step ? T.ink : T.sub }}
            >
              {i + 1}
            </div>
            <span className="text-[11px]" style={{ color: i <= step ? T.ink : T.sub }}>{l}</span>
          </div>
          {i < labels.length - 1 && <div className="w-6 h-px" style={{ background: T.line }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

const VEHICLE_LABELS = {
  motorcycle: "دراجة نارية",
  small_car: "سيارة صغيرة",
  pickup: "وانيت",
  van: "حافلة",
  truck: "دينا",
};

const STORE_CATEGORIES = [
  { id: "general_food", label: "مواد غذائية متكاملة" },
  { id: "sweets", label: "حلويات وشوكولاتة" },
  { id: "household_plastics", label: "مستلزمات منزلية وبلاستيكات" },
  { id: "produce", label: "خضار وفواكه" },
  { id: "bakery", label: "مخابز" },
  { id: "nuts_coffee", label: "محامص ومكسرات" },
  { id: "other", label: "أخرى" },
];

const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الظهران", "الطائف", "تبوك", "بريدة", "عنيزة",
  "خميس مشيط", "أبها", "نجران", "جازان", "ينبع", "الجبيل",
  "حائل", "الأحساء", "الباحة", "عرعر", "سكاكا", "القنفذة", "بدر", "أخرى",
];

function AccountStep({ onDone, applicantType }) {
  const [form, setForm] = useState({
    store_name: "",
    store_category: "general_food",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    city: "الرياض",
    vehicle_type: "motorcycle",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (form.password !== form.confirm_password) {
      setErr("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }
    if (form.password.length < 6) {
      setErr("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }

    setLoading(true);
    setRememberMe(false); // التسجيل من هذي الشاشة لا يفترض "تذكرني" الدائم بصمت
    const meta = { full_name: form.full_name, phone: form.phone, city: form.city };
    if (applicantType === "driver") meta.vehicle_type = form.vehicle_type;
    if (applicantType === "trader") {
      meta.store_name = form.store_name;
      meta.store_category = form.store_category;
    }
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: meta },
    });
    setLoading(false);
    if (error) {
      setErr(error.message.includes("already registered") ? "البريد مسجّل مسبقاً." : "تعذّر إنشاء الحساب، تأكد من البيانات.");
      return;
    }
    if (!data.session) {
      setNeedsConfirm(true);
      return;
    }
    onDone();
  };

  if (needsConfirm) {
    return (
      <Card>
        <div className="text-center py-4">
          <CheckCircle2 className="mx-auto mb-3" size={28} style={{ color: T.good }} />
          <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>تحقق من بريدك</div>
          <div className="text-xs" style={{ color: T.sub }}>
            تم إرسال رابط تأكيد إلى {form.email}. بعد التفعيل، يرجى تسجيل الدخول من نفس الصفحة لإكمال رفع المستندات.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit}>
        {applicantType === "trader" && (
          <>
            <Field label="اسم المتجر" required value={form.store_name} onChange={set("store_name")} />
            <div className="mb-4">
              <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>فئة المتجر</label>
              <select
                value={form.store_category}
                onChange={set("store_category")}
                className="w-full text-sm rounded-lg py-2 px-3 outline-none"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
              >
                {STORE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <Field label="رقم الجوال" required value={form.phone} onChange={set("phone")} placeholder="05xxxxxxxx" />
        <div className="mb-4">
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>المدينة</label>
          <select
            value={form.city}
            onChange={set("city")}
            className="w-full text-sm rounded-lg py-2 px-3 outline-none"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
          >
            {SAUDI_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {applicantType === "driver" && (
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>نوع المركبة</label>
            <select
              value={form.vehicle_type}
              onChange={set("vehicle_type")}
              className="w-full text-sm rounded-lg py-2 px-3 outline-none"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
            >
              {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}
        <Field label="البريد الإلكتروني" type="email" required value={form.email} onChange={set("email")} />
        <Field label="اسم صاحب الحساب" required value={form.full_name} onChange={set("full_name")} />
        <Field label="كلمة المرور" type="password" required value={form.password} onChange={set("password")} />
        <Field label="تأكيد كلمة المرور" type="password" required value={form.confirm_password} onChange={set("confirm_password")} />
        {err && <div className="text-xs mb-3" style={{ color: T.bad }}>{err}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
          style={{ background: T.ink, color: "#fff" }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          إنشاء الحساب ومتابعة
        </button>
      </form>
    </Card>
  );
}

function DocumentsStep({ session, applicantType, requiredDocs, onDone }) {
  const [files, setFiles] = useState({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = (label) => (e) => {
    const f = e.target.files?.[0];
    if (f) setFiles((s) => ({ ...s, [label]: f }));
  };

  const submit = async () => {
    setErr("");
    const missing = requiredDocs.filter((l) => !files[l]);
    if (missing.length) {
      setErr(`الحقول الناقصة: ${missing.join("، ")}`);
      return;
    }
    setLoading(true);
    try {
      const uploaded = [];
      for (let i = 0; i < requiredDocs.length; i++) {
        const label = requiredDocs[i];
        const file = files[label];
        const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
        const path = `${session.user.id}/doc-${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("verification-docs").upload(path, file);
        if (upErr) throw upErr;
        uploaded.push({ label, path });
      }
      const { error: reqErr } = await supabase.from("verification_requests").insert({
        applicant_id: session.user.id,
        applicant_type: applicantType,
        documents: uploaded,
      });
      if (reqErr) throw reqErr;
      onDone();
    } catch (e) {
      setErr(`حدث خطأ: ${e?.message || "غير معروف"} — يرجى المحاولة مرة أخرى أو التواصل مع الدعم.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>رفع المستندات المطلوبة</div>
      <div className="text-xs mb-4" style={{ color: T.sub }}>الملفات المسموحة: PDF أو صورة، بحد أقصى 10 ميجا لكل ملف.</div>

      {requiredDocs.map((label) => (
        <label
          key={label}
          className="flex items-center gap-3 rounded-lg p-3 mb-3 cursor-pointer"
          style={{ background: T.paper, border: `1px dashed ${T.line}` }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: files[label] ? T.goodBg : T.paperDeep }}>
            {files[label] ? <FileText size={16} style={{ color: T.good }} /> : <Upload size={16} style={{ color: T.sealDeep }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: T.ink }}>{label}</div>
            <div className="text-[11px] truncate" style={{ color: T.sub }}>{files[label]?.name || "اختيار ملف"}</div>
          </div>
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={pick(label)} />
        </label>
      ))}

      {err && <div className="text-xs mb-3" style={{ color: T.bad }}>{err}</div>}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full mt-2 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
        style={{ background: T.ink, color: "#fff" }}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        إرسال الطلب للمراجعة
      </button>
    </Card>
  );
}

function StatusStep({ session }) {
  const [req, setReq] = useState(null);
  const [emailVerified, setEmailVerified] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase
      .from("verification_requests")
      .select("*")
      .eq("applicant_id", session.user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setReq(data));

    supabase
      .from("profiles")
      .select("email_verified")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setEmailVerified(data?.email_verified ?? false));
  }, [session]);

  // إذا وصل المستخدم عبر رابط تأكيد البريد (magiclink)، نُحدّث الحالة تلقائياً
  useEffect(() => {
    if (window.location.hash.includes("type=magiclink")) {
      supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", session.user.id)
        .then(() => setEmailVerified(true));
    }
  }, [session]);

  const sendVerification = async () => {
    setSending(true);
    await supabase.auth.signInWithOtp({
      email: session.user.email,
      options: { emailRedirectTo: window.location.href },
    });
    setSending(false);
    setSent(true);
  };

  const stageMeta = {
    submitted: { icon: Clock, label: "طلبك مُقدَّم، بانتظار المراجعة", tone: T.seal },
    logistics_review: { icon: Clock, label: "قيد مراجعة المشرف اللوجستي", tone: T.seal },
    final_review: { icon: Clock, label: "بانتظار الاعتماد النهائي", tone: T.seal },
    approved: { icon: CheckCircle2, label: "تم اعتماد حسابك!", tone: T.good },
    rejected: { icon: XCircle, label: "للأسف تم رفض الطلب", tone: T.bad },
  };

  const meta = req ? stageMeta[req.stage] : null;
  const Icon = meta?.icon || Clock;
  const showVerification = req?.stage === "approved" && emailVerified === false;

  return (
    <Card>
      <div className="text-center py-4">
        <Icon className="mx-auto mb-3" size={28} style={{ color: meta?.tone || T.sub }} />
        <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>{meta?.label || "جارٍ التحميل..."}</div>
        <div className="text-xs" style={{ color: T.sub }}>سيتم إبلاغك بأي تحديث. يمكنك إغلاق الصفحة والعودة لاحقاً للاطلاع على الحالة.</div>
      </div>

      {showVerification && !sent && (
        <div className="mt-4 pt-4 flex flex-col items-center gap-2" style={{ borderTop: `1px solid ${T.line}` }}>
          <div className="text-xs text-center" style={{ color: T.sub }}>
            خطوة تفعيل إضافية: يرجى تأكيد بريدك الإلكتروني حتى نتمكن من التواصل معك عند الحاجة.
          </div>
          <button
            onClick={sendVerification}
            disabled={sending}
            className="text-xs font-medium px-4 py-2 rounded-lg mt-1"
            style={{ background: T.ink, color: "#fff" }}
          >
            {sending ? "جارٍ الإرسال..." : "إرسال رابط تأكيد البريد"}
          </button>
        </div>
      )}

      {sent && (
        <div className="mt-4 pt-4 text-xs text-center" style={{ borderTop: `1px solid ${T.line}`, color: T.sub }}>
          تم إرسال رابط التأكيد إلى بريدك. يرجى الضغط عليه لإتمام التفعيل.
        </div>
      )}

      {req?.stage === "approved" && emailVerified === true && (
        <div className="mt-4 pt-4 flex items-center justify-center gap-1.5 text-xs" style={{ borderTop: `1px solid ${T.line}`, color: T.good }}>
          <CheckCircle2 size={13} /> تم تأكيد البريد الإلكتروني
        </div>
      )}
    </Card>
  );
}

/**
 * مكوّن عام لمسار تسجيل واعتماد أي طرف يحتاج توثيق (تاجر، عميل مؤسسة، سائق).
 * props: applicantType ('trader' | 'business_customer' | 'driver'), title, requiredDocs
 */
export default function OnboardingFlow({ applicantType, title, requiredDocs }) {
  useFonts();
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [existingRequest, setExistingRequest] = useState(undefined); // undefined = لم يُفحص، null = لا يوجد، object = موجود

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // لما تصير جلسة، نتأكد هل هذا الحساب أصلاً قدّم طلب "بنفس نوع الدور" هذا
  // من قبل — بدل ما نفترض "فيه جلسة إذن كمّل من خطوة المستندات"، لأن
  // نفس الحساب ممكن يكون مسجّل دخول من اختبار دور مختلف تماماً
  useEffect(() => {
    if (!session) {
      setExistingRequest(undefined);
      return;
    }
    supabase
      .from("verification_requests")
      .select("*")
      .eq("applicant_id", session.user.id)
      .eq("applicant_type", applicantType)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setExistingRequest(data || null);
        if (data) setStep(2); // له طلب سابق بنفس الدور — روح مباشرة لحالة المتابعة
        else setStep((prev) => (prev === 0 ? 1 : prev)); // جلسة موجودة وما له طلب سابق — كمّل رفع المستندات بنفس الحساب
      });
  }, [session, applicantType]);

  if (checking) {
    return (
      <Shell subtitle={title}>
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell subtitle={title}>
      <Steps step={step} />
      {step === 0 && <AccountStep onDone={() => setStep(1)} applicantType={applicantType} />}
      {step === 1 && session && (
        <>
          {existingRequest === null && (
            <div
              className="rounded-lg p-3 mb-3 flex items-center justify-between gap-2 text-xs"
              style={{ background: "#FBF1DD", color: T.sealDeep }}
            >
              <span>أنت مسجّل دخول حالياً بحساب: {session.user.email}. المستندات ستُرفع لهذا الحساب.</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="font-medium underline shrink-0"
                style={{ color: T.sealDeep }}
              >
                تسجيل حساب آخر
              </button>
            </div>
          )}
          <DocumentsStep session={session} applicantType={applicantType} requiredDocs={requiredDocs} onDone={() => setStep(2)} />
        </>
      )}
      {step === 2 && session && <StatusStep session={session} />}
      {step >= 1 && !session && (
        <Card>
          <div className="text-xs text-center" style={{ color: T.sub }}>
            يرجى تفعيل بريدك الإلكتروني ثم تسجيل الدخول من جديد لإكمال رفع المستندات.
          </div>
        </Card>
      )}
    </Shell>
  );
}
