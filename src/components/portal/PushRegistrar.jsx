import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

// صيانة صامتة لاشتراك إشعارات الجوال — بلا أي واجهة.
// الهدف: يبقى جهاز الموظف مشتركاً باستمرار فيصل تنبيه إثبات الحضور والتطبيق مغلق،
// حتى لو أعاد المتصفح إنشاء الاشتراك أو أُلغي من الخادم. لا يطلب الإذن أبداً
// (طلب الإذن يحتاج ضغطة المستخدم) — يتدخل فقط بعد أن يكون الإذن ممنوحاً.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushRegistrar({ session }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    let stopped = false;
    const portalToken = session?.token || "";
    const portalEmployeeId = session?.employee_id || "";

    const sync = async () => {
      if (stopped) return;
      try {
        if (Notification.permission !== "granted") return;
        const registration = await navigator.serviceWorker.register("/push-sw.js");
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const identity = portalToken && portalEmployeeId ? { token: portalToken, employee_id: portalEmployeeId } : {};
          const keyRes = await base44.functions.invoke("presenceProof", { ...identity, action: "push_key" });
          const keyData = keyRes?.data || keyRes;
          const publicKey = String(keyData?.public_key || "");
          if (!keyData?.ok || !publicKey) return;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        const payload = subscription.toJSON ? subscription.toJSON() : subscription;
        const identity = portalToken && portalEmployeeId ? { token: portalToken, employee_id: portalEmployeeId } : {};
        await base44.functions.invoke("presenceProof", {
          ...identity,
          action: "push_subscribe",
          subscription: { endpoint: payload.endpoint, keys: payload.keys },
          user_agent: navigator.userAgent,
        });
      } catch {}
    };

    sync();
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    const timer = setInterval(sync, 30 * 60 * 1000);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
      clearInterval(timer);
    };
  }, [session?.token, session?.employee_id]);

  return null;
}