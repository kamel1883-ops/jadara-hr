import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BellRing, BellOff, Loader2, ShieldCheck } from "lucide-react";
import { usePortalI18n } from "@/lib/portalI18n";

const COPY = {
  ar: {
    title: "إشعارات الجوال على هذا الجهاز",
    desc: "فعّل الإشعارات ليصلك تنبيه إثبات الحضور حتى لو كان التطبيق مغلقاً. يُربط الجهاز بسجلك الوظيفي مباشرة — بلا بريد ولا حساب إضافي.",
    enable: "تفعيل الإذن والإشعارات",
    working: "جارٍ التفعيل...",
    on: "الإشعارات مفعّلة على هذا الجهاز — يصلك التنبيه حتى والتطبيق مقفل.",
    denied: "الإشعارات مرفوضة من إعدادات المتصفح. افتح إعدادات الموقع في المتصفح واسمح بالإشعارات، ثم أعد المحاولة.",
    unsupported: "هذا المتصفح لا يدعم إشعارات الجوال. افتح بوابة الموظف من كروم على أندرويد أو سفاري على آيفون.",
    iosHint: "على آيفون: اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية»، وافتح البوابة من الأيقونة، ثم فعّل الإشعارات من هنا.",
    failed: "تعذّر تفعيل الإشعارات. أعد المحاولة.",
    errSession: "انتهت جلسة الدخول — اخرج وادخل برقم الهوية من جديد، ثم فعّل الإشعارات.",
    errOldBuild: "التطبيق المنشور على الخادم أقدم من دعم الإشعارات — انشر التطبيق من لوحة Base44 (النشر) ثم أعد المحاولة.",
    errRegister: "تعذّر تحميل خدمة الإشعارات من النسخة المنشورة — تأكد من نشر آخر نسخة من Base44 ثم أعد المحاولة.",
    errKey: "تعذّر إنشاء مفاتيح الإشعارات في الخادم — أعد المحاولة، وإن تكرر أرسل هذه الرسالة للدعم.",
    errSubscribe: (name) =>
      name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "المتصفح رفض الإذن — افتح إعدادات الموقع في المتصفح واسمح بالإشعارات ثم أعد المحاولة."
        : name === "NotSupportedError"
          ? "هذا المتصفح لا يدعم إشعارات الجوال. افتح بوابة الموظف من كروم على أندرويد أو سفاري على آيفون."
          : name === "InvalidAccessError" || name === "InvalidStateError"
            ? "مفتاح التشفير لا يطابق النسخة المنشورة — انشر التطبيق من Base44 من جديد ثم أعد المحاولة."
            : `تعذّر الاشتراك في الإشعارات (${name || "؟"}) — أعد المحاولة، وإن تكرر أرسل هذه الرسالة للدعم.`,
    errServer: (code) => `خلل في الخادم أثناء التفعيل (${code}) — انسخ هذه الرسالة وأرسلها للدعم.`,
  },
  en: {
    title: "Phone notifications on this device",
    desc: "Enable notifications so the presence alert reaches you even when the app is closed. The device is linked to your own employment record — no email and no extra account.",
    enable: "Allow notifications",
    working: "Enabling...",
    on: "Notifications are on for this device — the alert arrives even with the app closed.",
    denied: "Notifications are blocked in your browser settings. Allow notifications for this site, then try again.",
    unsupported: "This browser does not support phone notifications. Open the employee portal from Chrome on Android or Safari on iPhone.",
    iosHint: "On iPhone: tap Share, choose “Add to Home Screen”, open the portal from that icon, then enable notifications here.",
    failed: "Could not enable notifications. Please try again.",
    errSession: "Your session expired — sign out and sign back in with your national ID, then enable notifications.",
    errOldBuild: "The published backend is older than notification support — publish the app from the Base44 dashboard, then retry.",
    errRegister: "Could not load the notification service from the published build — publish the latest version from Base44, then retry.",
    errKey: "Could not create notification keys on the server — retry, and if it repeats send this message to support.",
    errSubscribe: (name) =>
      name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "The browser refused permission — allow notifications for this site in the browser settings, then retry."
        : name === "NotSupportedError"
          ? "This browser does not support phone notifications. Open the portal from Chrome on Android or Safari on iPhone."
          : name === "InvalidAccessError" || name === "InvalidStateError"
            ? "The encryption key does not match the published build — republish the app from Base44, then retry."
            : `Could not subscribe to notifications (${name || "?"}) — retry, and if it repeats send this message to support.`,
    errServer: (code) => `Server error while enabling (${code}) — copy this message and send it to support.`,
  },
};

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export default function WebPushEnabler({ session }) {
  const { lang } = usePortalI18n();
  const t = COPY[lang] || COPY.ar;
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const isIos = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  const isStandalone =
    typeof window !== "undefined" &&
    (window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches);

  const registerAndCheck = useCallback(async () => {
    if (!supported || !session?.token || !session?.employee_id) {
      setState(supported ? "off" : "unsupported");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setState(existing && Notification.permission === "granted" ? "on" : Notification.permission === "denied" ? "denied" : "off");
    } catch {
      setState("off");
    }
  }, [session, supported]);

  useEffect(() => {
    registerAndCheck();
  }, [registerAndCheck]);

  const enable = async () => {
    setBusy(true);
    setNote("");
    const fail = (message, err) => {
      try { console.error("[WebPushEnabler]", message, err || ""); } catch {}
      setNote(message);
      setBusy(false);
    };
    try {
      if (!supported) {
        setState("unsupported");
        setBusy(false);
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        setBusy(false);
        return;
      }
      let permission = Notification.permission;
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        return fail(t.failed, e);
      }
      if (permission !== "granted") {
        setState("denied");
        setBusy(false);
        return;
      }
      let keyData = null;
      try {
        const keyRes = await base44.functions.invoke("presenceProof", {
          token: session.token,
          employee_id: session.employee_id,
          action: "push_key",
        });
        keyData = keyRes?.data || keyRes;
      } catch (e) {
        const hint = String(e?.message || e || "");
        if (/401|invalid_session/i.test(hint)) return fail(t.errSession, e);
        if (/unknown_action|404/i.test(hint)) return fail(t.errOldBuild, e);
        return fail(t.errServer("push_key"), e);
      }
      if (!keyData?.ok) {
        const err = String(keyData?.error || "");
        if (err === "invalid_session") return fail(t.errSession);
        if (err === "unknown_action") return fail(t.errOldBuild);
        if (err === "vapid_failed") return fail(t.errKey);
        return fail(t.errServer(`push_key:${err || "?"}`), keyData);
      }
      const publicKey = String(keyData?.public_key || "");
      if (!publicKey) return fail(t.errKey, keyData);
      let registration = null;
      try {
        registration = await navigator.serviceWorker.register("/push-sw.js");
        await navigator.serviceWorker.ready;
      } catch (e) {
        return fail(t.errRegister, e);
      }
      let subscription = null;
      try {
        subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
      } catch (e) {
        return fail(t.errSubscribe(String(e?.name || "")), e);
      }
      const payload = subscription.toJSON ? subscription.toJSON() : subscription;
      let savedData = null;
      try {
        const saved = await base44.functions.invoke("presenceProof", {
          token: session.token,
          employee_id: session.employee_id,
          action: "push_subscribe",
          subscription: { endpoint: payload.endpoint, keys: payload.keys },
          user_agent: navigator.userAgent,
        });
        savedData = saved?.data || saved;
      } catch (e) {
        const hint = String(e?.message || e || "");
        if (/401|invalid_session/i.test(hint)) return fail(t.errSession, e);
        if (/unknown_action|404/i.test(hint)) return fail(t.errOldBuild, e);
        return fail(t.errServer("push_subscribe"), e);
      }
      if (!savedData?.ok) {
        const err = String(savedData?.error || "");
        if (err === "invalid_session") return fail(t.errSession);
        if (err === "unknown_action") return fail(t.errOldBuild);
        if (err === "invalid_subscription") return fail(t.errSubscribe("InvalidAccessError"));
        return fail(t.errServer(`push_subscribe:${err || "?"}`), savedData);
      }
      setState("on");
      setBusy(false);
    } catch (e) {
      return fail(t.failed, e);
    }
  };

  if (!session?.token || !session?.employee_id) return null;

  const icon = state === "on" ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : state === "denied" ? <BellOff className="w-5 h-5 text-amber-500" /> : <BellRing className="w-5 h-5 text-primary" />;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-sm">{t.title}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {state === "on" ? t.on : state === "denied" ? t.denied : state === "unsupported" ? t.unsupported : t.desc}
        </p>
        {isIos && !isStandalone && state !== "on" ? (
          <p className="text-xs text-amber-600 leading-relaxed">{t.iosHint}</p>
        ) : null}
        {note ? <p className="text-xs text-destructive">{note}</p> : null}
      </div>
      {state !== "on" && state !== "unsupported" ? (
        <Button size="sm" onClick={enable} disabled={busy || state === "loading"} className="gap-2 shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
          {busy ? t.working : t.enable}
        </Button>
      ) : null}
    </div>
  );
}
