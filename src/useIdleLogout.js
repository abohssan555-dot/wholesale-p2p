import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient.js";

/**
 * يسجّل خروج المستخدم تلقائياً بعد فترة خمول (بدون تحريك ماوس أو ضغط لوحة مفاتيح).
 * timeoutMinutes: مدة الخمول قبل تسجيل الخروج (افتراضي 30 دقيقة).
 */
export function useIdleLogout(timeoutMinutes = 30) {
  const timerRef = useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        supabase.auth.signOut();
      }, timeoutMinutes * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMinutes]);
}
