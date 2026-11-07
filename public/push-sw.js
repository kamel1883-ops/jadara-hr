/* خدمة إشعارات الجوال — تعمل والتطبيق/المتصفح مغلق.
   تصل الدفعة من الخادم عبر Web Push، وتُعرض على شاشة القفل بصوت النظام. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try { data = { body: event.data ? event.data.text() : "" }; } catch { data = {}; }
  }
  const title = String(data.title || "تنبيه من جداره");
  const options = {
    body: String(data.body || ""),
    tag: String(data.tag || "presence-proof"),
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 120, 400, 120, 700],
    dir: String(data.dir || "rtl"),
    lang: String(data.lang || "ar"),
    data: { url: String(data.url || "/portal") },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// المتصفح ألغى الاشتراك أو جدّده (تحديث النظام مثلاً): نعيد الاشتراك بنفس مفتاح
// التطبيق فوراً، وصفحة البوابة تُعيد ربطه بسجل الموظف عند أول فتح تلقائياً.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const options = (event.oldSubscription && event.oldSubscription.options) || { userVisibleOnly: true };
        await self.registration.pushManager.subscribe(options);
      } catch {}
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/portal";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) await client.navigate(target);
            return;
          } catch {}
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
