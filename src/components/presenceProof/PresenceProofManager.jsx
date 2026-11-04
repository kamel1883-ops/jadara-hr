import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlarmCheck, BellRing, Loader2, ShieldCheck, Timer } from "lucide-react";
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
    desc: "تنبيه عاجل للموجودين في الدوام حالياً فقط — للتأكيد خلال 5 دقائق. يصل لحساب التطبيق المرتبط بهوية الموظف في نفس المنشأة فقط، ويظهر أعلى بوابة الموظف عند فتحها. عدم التأكيد يظهر في تقرير المتابعة فقط ولا يُحتسب غياباً أو خصماً.",
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
    pushSent: (sent, total) => `تم إرسال تنبيه التطبيق إلى ${sent} من ${total} موظفاً مستهدفاً.`,
    pushPartial: (sent, failed, skipped) => `تم إرسال تنبيه التطبيق إلى ${sent} وتعذّر ${failed}${skipped ? ` — ${skipped} بلا حساب تطبيق مرتبط بهويته` : ""}. من لا يملك حساباً مرتبطاً يرى التنبيه أعلى بوابة الموظف عند فتحها.`,
    pushFailed: "تعذّر إرسال تنبيه التطبيق للموظفين — تحقق من نسخة المتجر وتفعيل الإشعارات وربط حسابات التطبيق بالهويات.",
    pushNoUser: "لم يُرسل تنبيه التطبيق لأن حسابات الموظفين المستهدفين غير مرتبطة بهوياتهم بعد — يرى الموظفون التنبيه أعلى بوابة الموظف عند فتحها برقم الهوية.",
  } : {
    title: "Instant presence proof",
    desc: "An urgent check for employees currently on shift only — confirm within 5 minutes. It reaches only the app account linked to the employee identity in the same organization, and appears at the top of the employee portal when opened. A missed confirmation appears only in follow-up; it is never automatic absence or deduction.",
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
    pushSent: (sent, total) => `App alerts were sent to ${sent} of ${total} targeted employees.`,
    pushPartial: (sent, failed, skipped) => `App alerts reached ${sent} but failed for ${failed}${skipped ? ` — ${skipped} have no app account linked to their identity` : ""}. Employees without a linked account still see the alert at the top of the employee portal when opened.`,
    pushFailed: "App alerts could not be sent — check the store build, notification settings, and identity-linked app accounts.",
    pushNoUser: "App alerts were not sent because the targeted employees have no app account linked to their identities yet — they still see the alert at the top of the employee portal when opened with their national ID.",
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

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

  const proofDisabled = org && org.presence_proof_enabled === false;
  const active = request && request.status === "active";
  const remaining = active ? Math.max(0, Number(request.deadline_at || 0) - nowMs) : 0;
  const pushStatus = String(request?.push_status || "");
  const pushSentCount = Number(request?.push_sent_count || 0);
  const pushFailedCount = Number(request?.push_failed_count || 0);
  const pushSkippedCount = Number(request?.push_skipped_count || 0);
  const pushTargetTotal = Number(request?.target_count || 0);
  const pushDetail = !pushStatus
    ? ""
    : pushStatus === "sent"
      ? t.pushSent(pushSentCount, pushTargetTotal)
      : pushStatus === "partial"
        ? t.pushPartial(pushSentCount, pushFailedCount, pushSkippedCount)
        : pushStatus === "failed"
          ? t.pushFailed
          : t.pushNoUser;
  const pushWarn = pushStatus === "partial" || pushStatus === "failed" || pushStatus === "skipped_no_user";

  return (
    <div className="bg-white rounded-2xl border border-border p-4 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <BellRing size={18} className="text-rose-600" /> {t.title}
          </h3>
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
        <Button onClick={sendRequest} disabled={busy || active || proofDisabled} className="gap-2 shrink-0">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <AlarmCheck size={16} />}
          {busy ? t.requesting : t.request}
        </Button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          <div>{error}</div>
          {errorCode && <div className="mt-1 text-xs text-rose-600/90 tabular-nums">{t.diagCode}: {errorCode}</div>}
        </div>
      )}
      {proofDisabled && !error && (
        <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{t.disabled}</div>
      )}

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
    </div>
  );
}
