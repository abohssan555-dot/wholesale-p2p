import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Upload, FileText, Loader2, CheckCircle2, Clock, XCircle, Package } from "lucide-react";

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
  return (
    <div
      dir="rtl"
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>منصة الجملة</div>
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

function AccountStep({ onDone }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", city: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, phone: form.phone, city: form.city } },
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
            بعتنالك رابط تأكيد على {form.email}. بعد ما تفعّل، رجّع سجّل دخول من نفس الصفحة عشان تكمّل رفع المستندات.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <Field label="الاسم الكامل" required value={form.full_name} onChange={set("full_name")} />
        <Field label="رقم الجوال" required value={form.phone} onChange={set("phone")} placeholder="05xxxxxxxx" />
        <Field label="المدينة" required value={form.city} onChange={set("city")} />
        <Field label="البريد الإلكتروني" type="email" required value={form.email} onChange={set("email")} />
        <Field label="كلمة المرور" type="password" required value={form.password} onChange={set("password")} />
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
      setErr(`ناقص: ${missing.join("، ")}`);
      return;
    }
    setLoading(true);
    try {
      const uploaded = [];
      for (const label of requiredDocs) {
        const file = files[label];
        const path = `${session.user.id}/${label}-${Date.now()}-${file.name}`;
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
      setErr("صار خطأ وقت الرفع، حاول مرة ثانية.");
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
            <div className="text-[11px] truncate" style={{ color: T.sub }}>{files[label]?.name || "دوس لاختيار ملف"}</div>
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

  useEffect(() => {
    supabase
      .from("verification_requests")
      .select("*")
      .eq("applicant_id", session.user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setReq(data));
  }, [session]);

  const stageMeta = {
    submitted: { icon: Clock, label: "طلبك مُقدَّم، بانتظار المراجعة", tone: T.seal },
    logistics_review: { icon: Clock, label: "قيد مراجعة المشرف اللوجستي", tone: T.seal },
    final_review: { icon: Clock, label: "بانتظار الاعتماد النهائي", tone: T.seal },
    approved: { icon: CheckCircle2, label: "تم اعتماد حسابك!", tone: T.good },
    rejected: { icon: XCircle, label: "للأسف تم رفض الطلب", tone: T.bad },
  };

  const meta = req ? stageMeta[req.stage] : null;
  const Icon = meta?.icon || Clock;

  return (
    <Card>
      <div className="text-center py-4">
        <Icon className="mx-auto mb-3" size={28} style={{ color: meta?.tone || T.sub }} />
        <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>{meta?.label || "جارٍ التحميل..."}</div>
        <div className="text-xs" style={{ color: T.sub }}>راح نبلغك بأي تحديث. تقدر تسكّر الصفحة وترجع لاحقاً تتأكد من الحالة.</div>
      </div>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (data.session) setStep(1);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) setStep((prev) => (prev === 0 ? 1 : prev));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
      {step === 0 && <AccountStep onDone={() => setStep(1)} />}
      {step === 1 && session && (
        <DocumentsStep session={session} applicantType={applicantType} requiredDocs={requiredDocs} onDone={() => setStep(2)} />
      )}
      {step === 2 && session && <StatusStep session={session} />}
      {step >= 1 && !session && (
        <Card>
          <div className="text-xs text-center" style={{ color: T.sub }}>
            فعّل بريدك الإلكتروني ثم سجّل دخول من جديد عشان تكمّل رفع المستندات.
          </div>
        </Card>
      )}
    </Shell>
  );
}
