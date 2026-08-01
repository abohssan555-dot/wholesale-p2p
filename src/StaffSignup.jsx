import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase, setRememberMe } from "./supabaseClient.js";
import { Package, Loader2, CheckCircle2, Home } from "lucide-react";

const T = {
  ink: "#14213B",
  paper: "#F6F3EC",
  line: "#DCD5C4",
  seal: "#B8862B",
  good: "#2F6F4E",
  bad: "#A23B2E",
  sub: "#5B5748",
};

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

export default function StaffSignup() {
  useFonts();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (form.password.length < 6) {
      setErr("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }
    if (form.password !== form.confirm) {
      setErr("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }
    setLoading(true);

    const { data: phoneAvailable } = await supabase.rpc("is_phone_available", { p_phone: form.phone });
    if (phoneAvailable === false) {
      setLoading(false);
      setErr("رقم الجوال هذا مستخدم بحساب آخر مسبقاً.");
      return;
    }

    setRememberMe(false);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, phone: form.phone } },
    });
    setLoading(false);
    if (error) {
      setErr(error.message.includes("already registered") ? "البريد مسجّل مسبقاً." : "تعذّر إنشاء الحساب، تأكد من البيانات.");
      return;
    }
    setDone(true);
  };

  return (
    <div dir="rtl" className="w-full min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <Link to="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
            <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
              <Package size={18} color={T.ink} strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: T.sub, border: `1px solid ${T.line}`, textDecoration: "none" }}>
            <Home size={13} /> الرئيسية
          </Link>
        </div>

        <div className="rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto mb-3" size={30} style={{ color: T.good }} />
              <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>تم إنشاء الحساب بنجاح</div>
              <div className="text-xs" style={{ color: T.sub }}>
                حسابك الآن بانتظار مراجعة الإدارة وتحديد صلاحياتك. سيتم تفعيله وإخطارك بمجرد الاعتماد.
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>تسجيل حساب إداري جديد</div>
              <div className="text-xs mb-5" style={{ color: T.sub }}>
                لموظفي الإشراف المالي واللوجستي وخدمة العملاء — بدون حاجة لرفع مستندات. يحدد فريق الإدارة صلاحياتك بعد المراجعة.
              </div>
              <form onSubmit={submit}>
                <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>الاسم الكامل</label>
                <input required value={form.full_name} onChange={set("full_name")} className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />

                <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>رقم الجوال</label>
                <input required value={form.phone} onChange={set("phone")} placeholder="05xxxxxxxx" className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />

                <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>البريد الإلكتروني</label>
                <input type="email" name="email" autoComplete="email" required value={form.email} onChange={set("email")} className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />

                <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>كلمة المرور</label>
                <input type="password" required value={form.password} onChange={set("password")} className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />

                <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>تأكيد كلمة المرور</label>
                <input type="password" required value={form.confirm} onChange={set("confirm")} className="w-full text-sm rounded-lg py-2 px-3 mb-4 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />

                {err && <div className="text-xs mb-3" style={{ color: T.bad }}>{err}</div>}

                <button type="submit" disabled={loading} className="w-full text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2" style={{ background: T.ink, color: "#fff" }}>
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  إنشاء الحساب
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
