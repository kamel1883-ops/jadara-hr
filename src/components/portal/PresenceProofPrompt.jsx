import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { usePortalI18n, usePortalT, portalDir } from "@/lib/portalI18n";

const fmtRemaining = (ms) => {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

export default function PresenceProofPrompt({ session }) {
  const { lang } = usePortalI18n();
  const t = usePortalT("presence");
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  const load = useCallback(async () => {
    if (!session?.token || !session?.employee_id) {
      setActive(null);
      return;
    }
    try {
      const res = await base44.functions.invoke("presenceProof", {
        token: session.token,
        employee_id: session.employee_id,
        action: "mine",
      });
      const data = res?.data || res;
      const next = data?.ok ? data.active || null : null;
      setActive((prev) => {
        if (next && (!prev || prev.id !== next.id) && typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate([180, 80, 180]); } catch {}
        }
        return next;
      });
      if (next) setError("");
    } catch {}
  }, [session]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!active || active.confirmed) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const confirm = async () => {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("presenceProof", {
        token: session.token,
        employee_id: session.employee_id,
        action: "confirm",
      });
      const data = res?.data || res;
      if (data?.ok) {
        setActive(data.active || { ...active, confirmed: true, confirmed_at: Date.now() });
      } else {
        setError(t.failed);
        load();
      }
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  if (!active || active.confirmed) {
    if (!active?.confirmed) return null;
    return (
      <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center gap-2">
        <CheckCircle2 size={18} /> {t.done}
      </div>
    );
  }

  const remaining = Math.max(0, Number(active.deadline_at || 0) - nowMs);

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]">
      <div className="rounded-2xl border-2 border-rose-500 bg-white shadow-2xl overflow-hidden animate-pulse">
        <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center gap-2">
          <BellRing size={18} className="shrink-0" />
          <div className="font-bold text-sm leading-tight">{t.urgent}</div>
          <div className="ms-auto text-xs font-bold tabular-nums bg-white/20 rounded-full px-2.5 py-1 shrink-0">
            {fmtRemaining(remaining)}
          </div>
        </div>
        <div className="px-4 py-3" dir={portalDir(lang)}>
          <p className="text-sm leading-relaxed text-slate-700">{t.instruction}</p>
          {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
          <Button onClick={confirm} disabled={busy || remaining <= 0} className="w-full mt-3 h-11 text-base font-bold bg-rose-600 hover:bg-rose-700">
            {busy ? (<><Loader2 size={18} className="animate-spin" /> {t.confirming}</>) : t.confirm}
          </Button>
          <div className="mt-2 text-center text-[11px] text-muted-foreground tabular-nums">
            {t.remaining}: {fmtRemaining(remaining)}
          </div>
        </div>
      </div>
    </div>
  );
}
