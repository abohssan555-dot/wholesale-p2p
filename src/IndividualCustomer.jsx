import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, setRememberMe } from "./supabaseClient.js";
import { Package, Loader2, CheckCircle2, Mail, ArrowRight, Home } from "lucide-react";

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

function Shell({ children }) {
  const navigate = useNavigate();
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
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>دخول عميل فردي</div>
          </div>
        </div>
        <div className="rounded-xl p-7" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function IndividualCustomer() {
  useFonts();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [registering, setRegistering] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // بمجرد ما تصير جلسة حقيقية (بعد ما يدوس رابط التأكيد بالبريد)،
  // نسجّله تلقائياً كعميل فردي — بدون أي خطوة اعتماد.
  useEffect(() => {
    if (session && !ready) {
      setRegistering(true);
      supabase.rpc("register_as_individual_customer").then(() => {
        setRegistering(false);
        setReady(true);
      });
    }
  }, [session, ready]);

  const sendLink = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    setRememberMe(false); // نفس القاعدة: بدون خيار "تذكرني" ظاهر، الجلسة لا تُحفظ دائمة بصمت
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/individual" },
    });
    setLoading(false);
    if (error) {
      setErr("تعذّر إرسال الرابط، تأكد من البريد.");
      return;
    }
    setSent(true);
  };

  if (checking) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
        </div>
      </Shell>
    );
  }

  if (session) {
    return (
      <Shell>
        <div className="text-center py-4">
          {registering ? (
            <Loader2 className="mx-auto mb-3 animate-spin" size={26} style={{ color: T.sealDeep }} />
          ) : (
            <CheckCircle2 className="mx-auto mb-3" size={28} style={{ color: T.good }} />
          )}
          <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>
            {registering ? "جارٍ تجهيز حسابك..." : "تم تسجيل دخولك"}
          </div>
          {ready && (
            <div className="text-xs" style={{ color: T.sub }}>
              حسابك جاهز كعميل فردي. تقدر تتصفح المتاجر وتبدأ الطلب.
            </div>
          )}
        </div>
      </Shell>
    );
  }

  if (sent) {
    return (
      <Shell>
        <div className="text-center py-4">
          <Mail className="mx-auto mb-3" size={28} style={{ color: T.sealDeep }} />
          <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>تحقق من بريدك</div>
          <div className="text-xs" style={{ color: T.sub }}>
            تم إرسال رابط الدخول إلى {email}. يرجى الضغط عليه من نفس الجهاز لإتمام تسجيل الدخول.
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-xs mb-4" style={{ color: T.sub }}>
        تسجيل دخول سريع بدون كلمة مرور — يكفي إدخال بريدك الإلكتروني وسنرسل لك رابط تسجيل الدخول.
        <span className="block mt-1" style={{ color: T.sealDeep }}>(نسخة مؤقتة عبر البريد الإلكتروني إلى حين تفعيل الدخول برقم الجوال)</span>
      </div>
      <form onSubmit={sendLink}>
        <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>البريد الإلكتروني</label>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          إرسال رابط الدخول
        </button>
      </form>
    </Shell>
  );
}
