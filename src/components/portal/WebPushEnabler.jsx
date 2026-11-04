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
    try {
      if (!supported) {
        setState("unsupported");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const keyRes = await base44.functions.invoke("presenceProof", {
        token: session.token,
        employee_id: session.employee_id,
        action: "push_key",
      });
      const keyData = keyRes?.data || keyRes;
      const publicKey = String(keyData?.public_key || "");
      if (!keyData?.ok || !publicKey) {
        setNote(t.failed);
        return;
      }
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const payload = subscription.toJSON ? subscription.toJSON() : subscription;
      const saved = await base44.functions.invoke("presenceProof", {
        token: session.token,
        employee_id: session.employee_id,
        action: "push_subscribe",
        subscription: { endpoint: payload.endpoint, keys: payload.keys },
        user_agent: navigator.userAgent,
      });
      const savedData = saved?.data || saved;
      if (!savedData?.ok) {
        setNote(t.failed);
        return;
      }
      setState("on");
    } catch {
      setNote(t.failed);
    } finally {
      setBusy(false);
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
