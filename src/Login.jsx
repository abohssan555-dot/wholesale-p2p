import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { supabase, setRememberMe, ROLE_ROUTES, ROLE_LABELS } from "./supabaseClient.js";

const T = {
  ink: "#14213B",
  paper: "#F6F3EC",
  line: "#DCD5C4",
  seal: "#B8862B",
  bad: "#A23B2E",
  sub: "#5B5748",
};

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("site_manager");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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

    // نتأكد إن الحساب فعلاً عنده الدور اللي اختاره من القائمة
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", data.user.id);

    const hasRole = (roles || []).some((r) => r.role_id === role);
    setLoading(false);

    if (!hasRole) {
      setErr(`هذا الحساب ما عنده دور "${ROLE_LABELS[role]}". تأكد من اختيار الدور الصحيح.`);
      await supabase.auth.signOut();
      return;
    }

    navigate(ROLE_ROUTES[role] || "/");
  };

  return (
    <div
      dir="rtl"
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}
    >
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>منصة الجملة</div>
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
          {Object.entries(ROLE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>البريد الإلكتروني</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-sm rounded-lg py-2 px-3 mb-4 outline-none"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
        />

        <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>كلمة المرور</label>
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
    </div>
  );
}
