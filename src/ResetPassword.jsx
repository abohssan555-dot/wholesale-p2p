import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "./supabaseClient.js";

const T = {
  ink: "#14213B",
  paper: "#F6F3EC",
  line: "#DCD5C4",
  seal: "#B8862B",
  good: "#2F6F4E",
  bad: "#A23B2E",
  sub: "#5B5748",
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // رابط الاسترجاع ينشئ جلسة مؤقتة تلقائياً (Supabase يكتشف التوكن بالرابط)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) {
      setErr("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }
    if (password !== confirm) {
      setErr("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErr("تعذّر تحديث كلمة المرور. جرّب طلب رابط جديد.");
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  return (
    <div
      dir="rtl"
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}
    >
      <div className="w-full max-w-sm rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>تعيين كلمة مرور جديدة</div>
          </div>
        </div>

        {!ready && !done && (
          <div className="text-center py-6">
            <Loader2 className="mx-auto mb-3 animate-spin" size={22} style={{ color: T.sub }} />
            <div className="text-xs" style={{ color: T.sub }}>
              جارٍ التحقق من الرابط... إذا استمر الانتظار طويلاً، فالرابط منتهي الصلاحية — يرجى طلب رابط جديد من شاشة الدخول.
            </div>
          </div>
        )}

        {ready && !done && (
          <form onSubmit={submit}>
            <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm rounded-lg py-2 px-3 mb-4 outline-none"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
            />
            <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>تأكيد كلمة المرور</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none"
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
              حفظ كلمة المرور الجديدة
            </button>
          </form>
        )}

        {done && (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto mb-3" size={26} style={{ color: T.good }} />
            <div className="text-sm font-medium" style={{ color: T.ink }}>تم تحديث كلمة المرور بنجاح</div>
            <div className="text-xs mt-1" style={{ color: T.sub }}>جارٍ تحويلك لتسجيل الدخول...</div>
          </div>
        )}
      </div>
    </div>
  );
}
