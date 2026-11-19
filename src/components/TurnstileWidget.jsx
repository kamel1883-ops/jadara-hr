import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

// مفتاح موقع حقيقي من Cloudflare Turnstile (قطعة: Jadara Employee Portal) — المفتاح السري المطابق في TURNSTILE_SECRET_KEY.
const TURNSTILE_SITE_KEY = "0x4AAAAAAEMIP2HAccXXBa2n";

let scriptPromise = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script-load-failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// لا يوجد أي رمز تخطٍّ للتحقق البشري: عند تعذّر تحميل الودجة لا يُرسَل رمز،
// فيرفض الخادم الطلب ويُطلب من المستخدم إعادة المحاولة بعد التحقق من الاتصال.
export default function TurnstileWidget({ onToken, className }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const ref = useRef(null);
  const widgetId = useRef(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    onToken && onToken("");
    const fail = () => {
      if (cancelled) return;
      setFailed(true);
      onToken && onToken("");
    };
    const timer = setTimeout(fail, 12000);

    loadScript()
      .then(() => {
        if (cancelled || !ref.current) return;
        clearTimeout(timer);
        const tryRender = () => {
          if (cancelled || !ref.current) return;
          if (window.turnstile && window.turnstile.render) {
            try {
              widgetId.current = window.turnstile.render(ref.current, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: (token) => { if (!cancelled) { setFailed(false); onToken && onToken(token); } },
                "expired-callback": () => onToken && onToken(""),
                "error-callback": fail,
              });
            } catch (_e) {
              setTimeout(tryRender, 300);
            }
          } else {
            setTimeout(tryRender, 200);
          }
        };
        tryRender();
      })
      .catch(fail);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      try {
        if (window.turnstile && widgetId.current != null) window.turnstile.remove(widgetId.current);
      } catch (_e) {}
      widgetId.current = null;
    };
  }, [onToken, attempt]);

  if (failed) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <span>
            {isAr
              ? "تعذّر تحميل التحقق البشري. تحقّق من الاتصال ثم أعد المحاولة."
              : "Could not load the human verification. Check your connection and retry."}
          </span>
          <button
            type="button"
            className="shrink-0 font-semibold underline"
            onClick={() => { setFailed(false); setAttempt((a) => a + 1); }}
          >
            {isAr ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  return <div ref={ref} className={className} style={{ minHeight: 65 }} />;
}