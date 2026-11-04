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

export default function PresenceProofManager({ org }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إثبات الحضور الفوري",
    desc: "تنبيه عاجل للموجودين في الدوام حالياً فقط — للتأكيد خلال 5 دقائق. عدم التأكيد يظهر في تقرير المتابعة فقط ولا يُحتسب غياباً أو خصماً.",
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
    failed: "تعذّر إرسال الطلب",
    loading: "جارٍ التحميل...",
    payrollNote: "تنبيه: هذا الإجراء لا يغيّر سجلات الحضور ولا مسير الرواتب.",
  } : {
    title: "Instant presence proof",
    desc: "An urgent check for employees currently on shift only — confirm within 5 minutes. A missed confirmation appears only in follow-up; it is never automatic absence or deduction.",
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
    failed: "Could not send the request",
    loading: "Loading...",
    payrollNote: "Note: this action does not change attendance records or payroll.",
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

  const sendRequest = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("presenceProof", { ...portalArgs, action: "request" });
      const data = res?.data || res;
      if (data?.ok) {
        setRequest(data.request || null);
      } else if (data?.error === "active_exists") {
        setRequest(data.request || request);
        setError(t.activeExists);
      } else if (data?.error === "no_targets") {
        setError(t.noTargets);
      } else if (data?.error === "proof_disabled") {
        setError(t.disabled);
      } else {
        setError(t.failed);
      }
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
      load(true);
    }
  };

  const proofDisabled = org && org.presence_proof_enabled === false;
  const active = request && request.status === "active";
  const remaining = active ? Math.max(0, Number(request.deadline_at || 0) - nowMs) : 0;

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
        </div>
        <Button onClick={sendRequest} disabled={busy || active || proofDisabled} className="gap-2 shrink-0">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <AlarmCheck size={16} />}
          {busy ? t.requesting : t.request}
        </Button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
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
