import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, Loader2, ArrowRight, Home } from "lucide-react";
import { supabase, setRememberMe, ROLE_ROUTES, LOGIN_OPTIONS, ADMIN_ROLE_IDS } from "./supabaseClient.js";

const T = {
  ink: "#14213B",
  paper: "#F6F3EC",
  line: "#DCD5C4",
  seal: "#B8862B",
  sealDeep: "#8C6018",
  bad: "#A23B2E",
  sub: "#5B5748",
};

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [resetSent, setResetSent] = useState(false);

  const sendResetLink = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) {
      setErr("تعذّر إرسال رابط إعادة التعيين. تأكد من صحة البريد الإلكتروني.");
      return;
    }
    setResetSent(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    setRememberMe(remember);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setErr("بيانات الدخول غير صحيحة.");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", data.user.id);

    const userRoleIds = (roles || []).map((r) => r.role_id);

    // "الإدارة" يطابق أي دور من الأدوار الإدارية الأربعة، مو دور واحد بعينه
    const matched =
      role === "admin"
        ? userRoleIds.find((r) => ADMIN_ROLE_IDS.includes(r))
        : userRoleIds.find((r) => r === role);

    setLoading(false);

    if (!matched) {
      setErr("هذا الحساب لا يملك صلاحية الدخول بهذا الخيار. يرجى التأكد من اختيارك.");
      await supabase.auth.signOut();
      return;
    }

    navigate(ROLE_ROUTES[matched] || "/");
  };

  return (
    <div
      dir="rtl"
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}
    >
      <div className="w-full max-w-sm">
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
        {mode === "forgot" ? (
          <div className="rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
                <Package size={18} color={T.ink} strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
                <div className="text-[11px]" style={{ color: T.sub }}>استعادة كلمة المرور</div>
              </div>
            </div>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>تحقق من بريدك</div>
                <div className="text-xs" style={{ color: T.sub }}>
                  إذا كان البريد {email} مسجّلاً لدينا، ستصلك رسالة تحتوي رابط تعيين كلمة مرور جديدة خلال دقائق.
                </div>
                <button
                  onClick={() => { setMode("login"); setResetSent(false); }}
                  className="text-xs font-medium mt-4"
                  style={{ color: T.sealDeep }}
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            ) : (
              <form onSubmit={sendResetLink}>
                <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm rounded-lg py-2 px-3 mb-4 outline-none"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
                />
                {err && <div className="text-xs mb-3" style={{ color: T.bad }}>{err}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
                  style={{ background: T.ink, color: "#fff" }}
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  إرسال رابط إعادة التعيين
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full text-xs font-medium mt-3"
                  style={{ color: T.sub }}
                >
                  العودة لتسجيل الدخول
                </button>
              </form>
            )}
          </div>
        ) : (
        <form onSubmit={submit} className="rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>تسجيل الدخول</div>
          </div>
        </div>

        <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>الدور</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full text-sm rounded-lg py-2 px-3 mb-4 outline-none"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
        >
          {LOGIN_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>البريد الإلكتروني</label>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-sm rounded-lg py-2 px-3 mb-4 outline-none"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
        />

        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium" style={{ color: T.sub }}>كلمة المرور</label>
          <button
            type="button"
            onClick={() => { setMode("forgot"); setErr(""); }}
            className="text-xs font-medium"
            style={{ color: T.sealDeep }}
          >
            نسيت كلمة السر؟
          </button>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
        />

        <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer" style={{ color: T.sub }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          تذكرني على هذا الجهاز
        </label>

        {err && <div className="text-xs mb-3" style={{ color: T.bad }}>{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
          style={{ background: T.ink, color: "#fff" }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          دخول
        </button>
      </form>
      )}
      </div>
    </div>
  );
}
