import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlarmCheck, BellRing, ChevronDown, ChevronUp, Loader2, ShieldCheck, Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { portalSession } from "@/lib/portalSession";
import { cn } from "@/lib/utils";

const fmtDateTime = (ms, isAr) => {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(isAr ? "ar-EG" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const fmtRemaining = (ms, isAr) => {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return isAr ? `${m}:${s} دقيقة` : `${m}:${s} min`;
};

const presenceFailure = (err) => ({
  payload: err?.response?.data || {},
  status: err?.response?.status || err?.status || 0,
  code: err?.response?.data?.error || err?.code || err?.message || "",
});

export default function PresenceProofManager({ org }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إثبات الحضور الفوري",
    expand: "فتح",
    collapse: "إغلاق",
    desc: "تنبيه عاجل للموجودين في الدوام حالياً فقط — للتأكيد خلال 5 دقائق. يصل لجهاز الموظف نفسه بعد تفعيله إشعارات الجوال من بوابة الموظف برقم هويته (بلا بريد وبلا حساب إضافي)، ويصل أيضاً لحساب التطبيق إن وُجد، ويظهر أعلى بوابة الموظف عند فتحها. على آيفون: تُضاف البوابة إلى الشاشة الرئيسية أولاً ثم تُفعّل الإشعارات. استخدم زر «دفع تجريبي» للتأكد قبل الاعتماد عليه. عدم التأكيد يظهر في تقرير المتابعة فقط ولا يُحتسب غياباً أو خصماً.",
    request: "طلب إثبات الحضور الآن",
    requesting: "جارٍ إرسال التنبيه...",
    active: "طلب نشط الآن",
    latest: "آخر طلب",
    issuer: "أصدره",
    deadline: "نهاية المهلة",
    remaining: "المتبقي",
    targets: "المستهدفون",
    confirmed: "أكّدوا",
    pending: "لم يؤكدوا",
    pendingTitle: "بحاجة للمتابعة (لم يؤكدوا)",
    confirmedTitle: "أكّدوا وجودهم",
    noRequest: "لا يوجد طلب إثبات حضور حالياً.",
    noTargets: "لا يوجد موظفون في الدوام حالياً ضمن هذه المنشأة.",
    disabled: "طلبات إثبات الحضور الفوري موقوفة من إعدادات المنشأة.",
    activeExists: "يوجد طلب نشط بالفعل لهذه المنشأة — لا يمكن إصدار طلب آخر حتى تنتهي مهلته.",
    noCompany: "تعذّر تحديد منشأة الحساب الحالي — أعد تسجيل الدخول بحساب الشركة الصحيح.",
    unauthorized: "انتهت الجلسة أو لم يتم التعرف على المستخدم — أعد تسجيل الدخول ثم حاول مجدداً.",
    forbidden: "الحساب الحالي لا يملك صلاحية إرسال طلب إثبات الحضور.",
    notDeployed: "خدمة إثبات الحضور غير منشورة بعد على الخادم — انشر التطبيق من لوحة Base44 ثم أعد المحاولة.",
    serverError: "حدث خطأ في الخادم أثناء إنشاء الطلب — أعد المحاولة، وإن تكرر أرسل رمز التشخيص للدعم.",
    networkError: "تعذّر الاتصال بالخادم — تحقق من الإنترنت ثم أعد المحاولة.",
    failed: "تعذّر إرسال الطلب",
    diagCode: "رمز التشخيص",
    loading: "جارٍ التحميل...",
    payrollNote: "تنبيه: هذا الإجراء لا يغيّر سجلات الحضور ولا مسير الرواتب.",
    pushSent: (sent, total, web) => `وصل تنبيه الجوال إلى ${sent} من ${total} موظفاً مستهدفاً${web ? ` — ${web} منها عبر إشعارات الجوال التي تصل والتطبيق مغلق` : ""}.`,
    pushPartial: (sent, failed, skipped, firstError, web) => `وصل تنبيه الجوال إلى ${sent}${web ? ` (${web} منها عبر إشعارات الجوال والتطبيق مغلق)` : ""} وتعذّر ${failed}${skipped ? ` — ${skipped} بلا جهاز مفعّل ولا حساب تطبيق مرتبط بهويته` : ""}${firstError ? ` — التشخيص: ${firstError}` : ""}.`,
    pushNoDevice: "تنبيه: لا يوجد بين المستهدفين جهاز مفعّل لإشعارات الجوال — يظهر التنبيه داخل بوابة الموظف عند فتحها فقط، ولا يصل والجوال مقفل حتى يفعّل كل موظف الإشعارات من بوابة الموظف على جهازه (مرة واحدة).",
    pushFailed: "تعذّر إرسال تنبيه التطبيق للموظفين — تحقق من نسخة المتجر المحدّثة وتفعيل الإشعارات مع الصوت وربط الحسابات بالهويات، وأوقف الكتم وعدم الإزعاج.",
    pushNoUser: "لم يُرسل تنبيه التطبيق لأن حسابات الموظفين المستهدفين غير مرتبطة بهوياتهم بعد — يرى الموظفون التنبيه أعلى بوابة الموظف عند فتحها برقم الهوية.",
    testPush: "دفع تجريبي للحاضرين الآن",
    testing: "جارٍ إرسال الدفع التجريبي...",
    testSent: (sent, total, never, stale) => `الدفع التجريبي: أُرسل إلى ${sent} من ${total} موظفاً حاضراً الآن${never?.length ? ` — لم يفعّل الإشعارات على جواله: ${never.join("، ")}` : ""}${stale?.length ? ` — انتهى تفعيله ويحتاج إعادة فتح البوابة على جواله: ${stale.join("، ")}` : ""}. أقفل التطبيق تماماً وراقب شاشة إشعارات الجوال خلال ثوانٍ.`,
    testNone: (never, stale) => `الدفع التجريبي: لم يصل لأي جهاز بعد${never?.length ? ` — لم يفعّل الإشعارات: ${never.join("، ")}` : ""}${stale?.length ? ` — انتهى التفعيل ويحتاج إعادة فتح البوابة: ${stale.join("، ")}` : ""}. كل موظف حاضر يفتح بوابة الموظف برقم هويته على جواله — ومن كان مفعّلاً من قبل تكفيه إعادة الفتح لتجديد الاشتراك تلقائياً، ومن لم يفعّل يضغط «تفعيل الإذن والإشعارات» مرة واحدة — وعلى الآيفون تُفتح البوابة من أيقونة الشاشة الرئيسية — ثم أعد الضغط.`,
    testFail: "الدفع التجريبي: فشل الإرسال",
    testEmpty: "الدفع التجريبي: لا يوجد موظف في الدوام الآن — الزر يستهدف الحاضرين في هذه اللحظة فقط.",
    storeApp: (names) => `تنبيه تطبيق المتجر (Play/Apple) لن يصل هؤلاء لعدم ربط حساب التطبيق بهوياتهم: ${names.join("، ")} — الحل لكل موظف: يثبّت التطبيق ويسجّل الدخول بحسابه فيه، ثم يفتح بوابة الموظف برقم هويته على نفس الجوال مرة واحدة (يتم الربط تلقائياً)، ويفعّل الإشعارات مع الصوت للتطبيق من إعدادات الجوال ويوقف الكتم وعدم الإزعاج.`,
    phoneCoverage: (withPhone, total) => `وللعلم: ${withPhone} من ${total} من هؤلاء لديهم رقم جوال مسجّل في ملف الموظف.`,
  } : {
    title: "Instant presence proof",
    expand: "Open",
    collapse: "Close",
    desc: "An urgent check for employees currently on shift only — confirm within 5 minutes. It reaches the employee’s own device once they enable phone notifications from the portal with their national ID (no email, no extra account), and also the app account if one exists; the alert also appears at the top of the employee portal. On iPhone the portal must be added to the Home Screen first. Use “Test push” to verify it before relying on it. A missed confirmation appears only in follow-up; it is never automatic absence or deduction.",
    request: "Request presence proof now",
    requesting: "Sending the urgent alert...",
    active: "Active request",
    latest: "Latest request",
    issuer: "Issued by",
    deadline: "Deadline",
    remaining: "Remaining",
    targets: "Targeted",
    confirmed: "Confirmed",
    pending: "Not confirmed",
    pendingTitle: "Follow-up needed (not confirmed)",
    confirmedTitle: "Confirmed presence",
    noRequest: "There is no presence-proof request right now.",
    noTargets: "No employees are currently on shift in this organization.",
    disabled: "Instant presence-proof requests are disabled in organization settings.",
    activeExists: "This organization already has an active request — wait until its window ends before issuing another.",
    noCompany: "Could not determine this account's organization — sign in again with the correct company account.",
    unauthorized: "The session expired or the user was not recognized — sign in again and retry.",
    forbidden: "The current account does not have permission to send a presence-proof request.",
    notDeployed: "The presence-proof service is not published on the server yet — publish the app from the Base44 dashboard, then retry.",
    serverError: "The server failed while creating the request — retry, and send the diagnostic code to support if it repeats.",
    networkError: "Could not reach the server — check the internet connection and retry.",
    failed: "Could not send the request",
    diagCode: "Diagnostic code",
    loading: "Loading...",
    payrollNote: "Note: this action does not change attendance records or payroll.",
    pushSent: (sent, total, web) => `Phone alerts reached ${sent} of ${total} targeted employees${web ? ` — ${web} of them through phone notifications that arrive with the app closed` : ""}.`,
    pushPartial: (sent, failed, skipped, firstError, web) => `Phone alerts reached ${sent}${web ? ` (${web} through phone notifications with the app closed)` : ""} and failed for ${failed}${skipped ? ` — ${skipped} have no enabled device and no app account linked to their identity` : ""}${firstError ? ` — diagnostic: ${firstError}` : ""}.`,
    pushNoDevice: "Note: none of the targeted employees has notifications enabled on a device — the alert only appears inside the employee portal when opened, and never while the phone is locked, until each employee enables notifications from the portal on their own device (once).",
    pushFailed: "App alerts could not be sent — check the updated store build, notifications with sound, identity-linked app accounts, and turn off silent mode / Do Not Disturb.",
    pushNoUser: "App alerts were not sent because the targeted employees have no app account linked to their identities yet — they still see the alert at the top of the employee portal when opened with their national ID.",
    testPush: "Test push to on-shift staff",
    testing: "Sending the test push...",
    testSent: (sent, total, never, stale) => `Test push: delivered to ${sent} of ${total} employees currently on shift${never?.length ? ` — never enabled notifications: ${never.join(", ")}` : ""}${stale?.length ? ` — subscription expired, needs to reopen the portal on their phone: ${stale.join(", ")}` : ""}. Force-close the app and watch the phone notification shade within seconds.`,
    testNone: (never, stale) => `Test push: no device received it yet${never?.length ? ` — never enabled: ${never.join(", ")}` : ""}${stale?.length ? ` — expired subscriptions: ${stale.join(", ")}` : ""}. Each employee on shift opens the portal with their national ID on their phone — reopening auto-refreshes a previous subscription, otherwise tap “Allow notifications” once — on iPhone open it from the Home Screen icon — then retry.`,
    testFail: "Test push failed",
    testEmpty: "Test push: no employee is on shift right now — this button targets only those present at this moment.",
    storeApp: (names) => `Store-app alerts (Play/Apple) will never reach these employees — no app account linked to their identities: ${names.join(", ")}. Fix for each employee: install the app and sign in with their account, then open the employee portal with their national ID once on the same phone (linking is automatic), and enable notifications with sound for the app in the phone settings with silent/DND off.`,
    phoneCoverage: (withPhone, total) => `Note: ${withPhone} of ${total} of them have a phone number on file.`,
  };

  const portalArgs = useMemo(() => {
    try {
      const session = portalSession.load();
      const delegated = typeof window !== "undefined" && String(window.location.pathname || "").startsWith("/portal");
      if (delegated && session?.token && session?.employee_id) {
        return { token: session.token, employee_id: session.employee_id };
      }
    } catch {}
    return {};
  }, []);

  const [request, setRequest] = useState(null);
  const [pushInfo, setPushInfo] = useState(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testNote, setTestNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  // ستارة ذكية: مغلقة افتراضياً لتوفير المساحة، تُحفظ حالة الفتح/الإغلاق،
  // وتنفتح تلقائياً عند وصول طلب نشط جديد حتى لا يفوت التنبيه العاجل.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("presenceProof.open") === "1"; } catch { return false; }
  });
  const seenActiveId = useRef(null);
  const toggleOpen = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem("presenceProof.open", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await base44.functions.invoke("presenceProof", { ...portalArgs, action: "status" });
      const data = res?.data || res;
      if (data?.ok) {
        setRequest(data.request || null);
        setError("");
      }
    } catch {} finally {
      if (!silent) setLoading(false);
    }
  }, [portalArgs]);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!request || request.status !== "active") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [request]);

  useEffect(() => {
    if (request?.status === "active" && request?.id && seenActiveId.current !== String(request.id)) {
      seenActiveId.current = String(request.id);
      setOpen(true);
      try { localStorage.setItem("presenceProof.open", "1"); } catch {}
    }
  }, [request]);

  const failWith = (payload = {}, status = 0) => {
    const code = String(payload?.error || "");
    setErrorCode(code || (status ? `http_${status}` : "network"));
    if (code === "active_exists") {
      setRequest(payload.request || request);
      setError(t.activeExists);
    } else if (code === "no_targets") {
      const when = [payload.date, payload.clock].filter(Boolean).join(" ");
      setError(when ? `${t.noTargets} (${when})` : t.noTargets);
    } else if (code === "proof_disabled") {
      setError(t.disabled);
    } else if (code === "no_company") {
      setError(t.noCompany);
    } else if (code === "unauthorized" || code === "invalid_session") {
      setError(t.unauthorized);
    } else if (code === "forbidden") {
      setError(t.forbidden);
    } else if (status === 404) {
      setError(t.notDeployed);
    } else if (status >= 500) {
      setError(t.serverError);
    } else if (!status) {
      setError(t.networkError);
    } else {
      setError(t.failed);
    }
  };

  const sendRequest = async () => {
    setBusy(true);
    setError("");
    setErrorCode("");
    try {
      const res = await base44.functions.invoke("presenceProof", { ...portalArgs, action: "request" });
      const data = res?.data || res;
      if (data?.ok) {
        setRequest(data.request || null);
        setOpen(true);
        try { localStorage.setItem("presenceProof.open", "1"); } catch {}
        if (data.push) setPushInfo(data.push);
        setError("");
        setErrorCode("");
      } else {
        failWith(data, res?.status);
      }
    } catch (err) {
      const { payload, status } = presenceFailure(err);
      console.error("presenceProof request failed", { status, error: payload?.error || err?.message });
      failWith(payload, status);
    } finally {
      setBusy(false);
      load(true);
    }
  };

  const sendTestPush = async () => {
    setTestBusy(true);
    setTestNote("");
    try {
      const res = await base44.functions.invoke("presenceProof", { ...portalArgs, action: "test_push" });
      const data = res?.data || res;
      const test = data?.test || {};
      if (!data?.ok) {
        setTestNote(data?.error === "no_targets" ? t.testEmpty : t.testFail);
      } else {
        const details = Array.isArray(test.details) ? test.details : [];
        const total = details.length || (Number(test.sent || 0) + Number(test.failed || 0) + Number(test.skipped || 0));
        const namesOf = (statuses) => details
          .filter((d) => statuses.includes(d.status))
          .map((d) => String(d.name || ""))
          .filter(Boolean);
        const never = namesOf(["no_account", "missing"]);
        const stale = namesOf(["expired"]);
        const failed = details.find((d) => d.status === "failed");
        const sent = Number(test.sent || 0) + Number(test.web_sent || 0);
        // من بلا حساب تطبيق مرتبط لن يصله تنبيه المتجر (Play/Apple) أبداً —
        // يُعرضون بالاسم مع خطوات الربط حتى يُسمَع الصوت في التطبيق الأصلي.
        const noApp = details
          .filter((d) => d.app === false)
          .map((d) => String(d.name || ""))
          .filter(Boolean);
        const storeLine = noApp.length ? ` ${t.storeApp(noApp)}` : "";
        if (sent > 0) setTestNote(`${t.testSent(sent, total, never, stale)}${storeLine}`);
        else if (failed) setTestNote(`${t.testFail}${failed.error || test.first_error ? ` — ${failed.error || test.first_error}` : ""}${storeLine}`);
        else {
          const coverage = Number(test.total || 0) > 0 ? t.phoneCoverage(Number(test.with_phone || 0), Number(test.total || 0)) : "";
          setTestNote(`${t.testNone(never, stale)}${coverage ? ` ${coverage}` : ""}${storeLine}`);
        }
      }
    } catch (err) {
      const { payload } = presenceFailure(err);
      setTestNote(`${t.testFail}${payload?.error ? ` — ${payload.error}` : ""}`);
    } finally {
      setTestBusy(false);
    }
  };

  const proofDisabled = org && org.presence_proof_enabled === false;
  const active = request && request.status === "active";
  const remaining = active ? Math.max(0, Number(request.deadline_at || 0) - nowMs) : 0;
  const pushStatus = String(request?.push_status || "");
  const pushSentCount = Number(request?.push_sent_count || 0);
  const pushFailedCount = Number(request?.push_failed_count || 0);
  const pushSkippedCount = Number(request?.push_skipped_count || 0);
  const pushTargetTotal = Number(request?.target_count || 0);
  const pushWebCount = Number(request?.push_web_count || 0);
  const pushFirstError = String(pushInfo?.first_error || "");
  const pushDetail = !pushStatus
    ? ""
    : pushStatus === "sent"
      ? t.pushSent(pushSentCount, pushTargetTotal, pushWebCount)
      : pushStatus === "partial"
        ? `${t.pushPartial(pushSentCount, pushFailedCount, pushSkippedCount, pushFirstError, pushWebCount)}${pushWebCount === 0 ? ` ${t.pushNoDevice}` : ""}`
        : pushStatus === "failed"
          ? `${pushFirstError ? `${t.pushFailed} ${isAr ? "التشخيص" : "Diagnostic"}: ${pushFirstError}` : t.pushFailed}${pushWebCount === 0 ? ` ${t.pushNoDevice}` : ""}`
          : t.pushNoUser;
  const pushWarn = pushStatus === "partial" || pushStatus === "failed" || pushStatus === "skipped_no_user";

  const headerSummary = active
    ? `${t.active} • ${t.remaining}: ${fmtRemaining(remaining, isAr)}`
    : request
      ? `${t.latest} • ${t.confirmed}: ${Number(request.confirmed_count || 0)} • ${t.pending}: ${Number(request.pending_count || 0)}`
      : t.noRequest;

  return (
    <div className="bg-white rounded-2xl border border-border p-4 mb-5">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-start"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />}
            <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", active ? "bg-rose-600" : "bg-muted-foreground/30")} />
          </span>
          <BellRing size={18} className="text-rose-600 shrink-0" />
          <span className="min-w-0">
            <span className="font-semibold block">{t.title}</span>
            <span className="text-xs text-muted-foreground block truncate">{headerSummary}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {open ? t.collapse : t.expand}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
      <div className="mt-3 flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">{t.desc}</p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <ShieldCheck size={12} /> {t.payrollNote}
          </p>
          {pushDetail && (
            <p className={pushWarn ? "text-[11px] text-amber-700 mt-1" : "text-[11px] text-muted-foreground mt-1"}>
              {pushDetail}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={sendRequest} disabled={busy || active || proofDisabled} className="gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <AlarmCheck size={16} />}
            {busy ? t.requesting : t.request}
          </Button>
          <Button onClick={sendTestPush} disabled={testBusy || proofDisabled} variant="outline" className="gap-2">
            {testBusy ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
            {testBusy ? t.testing : t.testPush}
          </Button>
        </div>
      </div>
      )}

      {open && testNote && (
        <p className="mt-2 text-[11px] text-muted-foreground">{testNote}</p>
      )}

      {open && error && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          <div>{error}</div>
          {errorCode && <div className="mt-1 text-xs text-rose-600/90 tabular-nums">{t.diagCode}: {errorCode}</div>}
        </div>
      )}
      {open && proofDisabled && !error && (
        <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{t.disabled}</div>
      )}

      {open && (
      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">{t.loading}</div>
        ) : !request ? (
          <div className="text-sm text-muted-foreground">{t.noRequest}</div>
        ) : (
          <div className={cn("rounded-2xl border p-4", active ? "border-rose-200 bg-rose-50/60" : "border-border bg-muted/30")}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <Timer size={15} className={active ? "text-rose-600" : "text-muted-foreground"} />
                {active ? t.active : t.latest}
              </span>
              <span className="text-muted-foreground">{t.issuer}: <strong className="text-foreground">{request.requested_by_name || "—"}</strong></span>
              <span className="text-muted-foreground">{t.deadline}: <strong className="text-foreground tabular-nums">{fmtDateTime(request.deadline_at, isAr)}</strong></span>
              {active && (
                <span className="font-bold text-rose-700 tabular-nums">{t.remaining}: {fmtRemaining(remaining, isAr)}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-center">
              <div className="rounded-xl bg-white border border-border p-2.5">
                <div className="text-xl font-bold tabular-nums">{request.target_count || 0}</div>
                <div className="text-xs text-muted-foreground">{t.targets}</div>
              </div>
              <div className="rounded-xl bg-white border border-emerald-200 p-2.5">
                <div className="text-xl font-bold text-emerald-700 tabular-nums">{request.confirmed_count || 0}</div>
                <div className="text-xs text-muted-foreground">{t.confirmed}</div>
              </div>
              <div className="rounded-xl bg-white border border-rose-200 p-2.5">
                <div className="text-xl font-bold text-rose-700 tabular-nums">{request.pending_count || 0}</div>
                <div className="text-xs text-muted-foreground">{t.pending}</div>
              </div>
            </div>

            {(request.pending || []).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-rose-700 mb-2">{t.pendingTitle} ({request.pending.length})</div>
                <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {request.pending.map((p) => (
                        <tr key={p.employee_id}>
                          <td className="px-3 py-2 font-medium">{p.full_name || "—"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{p.employee_number || ""}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{p.branch_name || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(request.targets || []).filter((x) => x.confirmed).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-emerald-700 mb-2">{t.confirmedTitle} ({request.confirmed_count})</div>
                <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {request.targets.filter((x) => x.confirmed).map((p) => (
                        <tr key={p.employee_id}>
                          <td className="px-3 py-2 font-medium">{p.full_name || "—"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{p.employee_number || ""}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{fmtDateTime(p.confirmed_at, isAr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}