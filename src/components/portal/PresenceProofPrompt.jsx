import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BellRing, CheckCircle2, Fingerprint, Loader2 } from "lucide-react";
import { usePortalI18n, usePortalT, portalDir } from "@/lib/portalI18n";
import { registerPasskey, toBytes, fromBytes } from "@/lib/passkey";

const fmtRemaining = (ms) => {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

export default function PresenceProofPrompt({ session }) {
  const { lang } = usePortalI18n();
  const t = usePortalT("presence");
  // نصوص تأكيد البصمة (مع بديل عربي/إنجليزي إن لم تكن الترجمة متوفرة للغة الموظف)
  const isArabic = lang === "ar";
  const L = {
    enroll: t.enroll || (isArabic ? "تفعيل بصمة الجهاز" : "Enable device biometrics"),
    enrolling: t.enrolling || (isArabic ? "جارٍ التفعيل..." : "Enabling..."),
    enrollHint: t.enrollHint || (isArabic
      ? "تأكيد الحضور يتطلب بصمة جهازك (وجه/أصبع). فعّلها مرة واحدة على هذا الجوال ثم أكّد بالبصمة — البصمة نفسها دليل وجودك على رأس العمل."
      : "Presence confirmation requires your device biometrics (face/fingerprint). Enable once on this phone, then confirm with it — the biometric is the proof you are at work."),
    failedEnroll: t.failedEnroll || (isArabic ? "تعذّر تفعيل بصمة الجهاز — أعد المحاولة." : "Could not enable device biometrics — please retry."),
    cancelled: t.cancelled || (isArabic ? "لم يتم تأكيد البصمة — أعد المحاولة قبل نهاية المهلة." : "Biometric confirmation was cancelled — retry before the deadline."),
  };
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [enrolled, setEnrolled] = useState(false);
  const alarmCtx = useRef(null);
  const alarmTimer = useRef(null);

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
      if (data?.national_id) setNationalId(String(data.national_id));
      const next = data?.ok ? data.active || null : null;
      setActive((prev) => {
        if (next && (!prev || prev.id !== next.id) && typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate([400, 100, 400, 100, 700]); } catch {}
        }
        return next;
      });
      if (next) setError("");
    } catch {}
  }, [session]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    // عودة التطبيق من الخلفية: جلب فوري حتى يظهر التنبيه لحظتها.
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const stopAlarm = () => {
    try { if (alarmTimer.current) clearInterval(alarmTimer.current); } catch {}
    alarmTimer.current = null;
  };
  // منبه قوي: صفارة مربعة عالية متناوبة (700/950Hz) بأربع دورات متتالية.
  const playAlarmBurst = async () => {
    try {
      if (typeof window === "undefined") return false;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!alarmCtx.current) alarmCtx.current = new AC();
      const ctx = alarmCtx.current;
      if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      const at = ctx.currentTime + 0.02;
      const cycles = 4;
      const half = 0.22;
      for (let i = 0; i < cycles; i++) {
        [700, 950].forEach((freq, k) => {
          const t0 = at + i * half * 2 + k * half;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(1.0, t0 + 0.02);
          gain.gain.setValueAtTime(1.0, t0 + half - 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + half);
          osc.connect(gain);
          gain.connect(master);
          osc.start(t0);
          osc.stop(t0 + half + 0.02);
        });
      }
      try { navigator.vibrate?.([400, 100, 400, 100, 700]); } catch {}
      return true;
    } catch { return false; }
  };
  const enableSound = async () => {
    const ok = await playAlarmBurst();
    setSoundBlocked(!ok);
  };
  useEffect(() => {
    if (!active || active.confirmed) { stopAlarm(); return; }
    let cancelled = false;
    playAlarmBurst().then((ok) => { if (!ok && !cancelled) setSoundBlocked(true); });
    try { if (alarmTimer.current) clearInterval(alarmTimer.current); } catch {}
    alarmTimer.current = setInterval(() => {
      playAlarmBurst().then((ok) => { if (!ok) setSoundBlocked(true); });
    }, 4000);
    return () => { cancelled = true; stopAlarm(); };
  }, [active?.id, active?.confirmed]);
  useEffect(() => () => { try { if (alarmTimer.current) clearInterval(alarmTimer.current); } catch {} try { alarmCtx.current?.close(); } catch {} }, []);

  // وميض عنوان التبويب أثناء وجود طلب نشط — يلفت الانتباه والتبويب في الخلفية.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const original = document.title;
    if (!active || active.confirmed) { document.title = original; return; }
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? "🚨 إثبات الحضور الآن — افتح التطبيق" : original;
    }, 1500);
    return () => { clearInterval(id); document.title = original; };
  }, [active?.id, active?.confirmed]);

  useEffect(() => {
    if (!active || active.confirmed) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // تفعيل بصمة الجهاز من داخل تنبيه الحضور (من لم يسجل بصمته بعد).
  const enrollPasskey = async () => {
    if (enrollBusy) return;
    setEnrollBusy(true);
    setError("");
    try {
      const out = await registerPasskey({
        base44,
        portalToken: session.token,
        nationalId: nationalId || "",
      });
      if (out?.ok) {
        setEnrolled(true);
        setActive((prev) => (prev ? { ...prev, has_passkey: true } : prev));
      } else {
        setError(out?.message || L.failedEnroll);
      }
    } catch (e) {
      const name = String(e?.name || "");
      setError(name === "NotAllowedError" ? L.cancelled : (e?.message || L.failedEnroll));
    } finally {
      setEnrollBusy(false);
    }
  };

  /** تأكيد الحضور: من سجّل بصمة جهازه لا يمكنه التأكيد إلا بالبصمة نفسها */
  const confirm = async () => {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    try {
      let passkey = null;
      const needsPasskey = active.has_passkey !== false;
      if (needsPasskey) {
        const chRes = await base44.functions.invoke("presenceProof", {
          token: session.token,
          employee_id: session.employee_id,
          action: "proof_challenge",
        });
        const ch = chRes?.data || chRes;
        if (ch?.ok && ch.has_passkey) {
          const o = ch.options || {};
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: toBytes(o.challenge),
              timeout: o.timeout || 60000,
              userVerification: o.userVerification || "required",
              rpId: ch.rp_id,
              allowCredentials: (ch.allow_credentials || []).map((c) => ({ type: "public-key", id: toBytes(c.id) })),
            },
          });
          const r = assertion.response;
          passkey = {
            challenge_token: ch.challenge_token,
            client_data_json: fromBytes(new Uint8Array(r.clientDataJSON)),
            authenticator_data: fromBytes(new Uint8Array(r.authenticatorData)),
            signature: fromBytes(new Uint8Array(r.signature)),
          };
        }
      }
      const res = await base44.functions.invoke("presenceProof", {
        token: session.token,
        employee_id: session.employee_id,
        action: "confirm",
        passkey,
      });
      const data = res?.data || res;
      if (data?.ok) {
        setActive(data.active || { ...active, confirmed: true, confirmed_at: Date.now() });
        stopAlarm();
      } else {
        setError(data?.message || t.failed);
        load();
      }
    } catch (e) {
      const name = String(e?.name || "");
      const srv = e?.response?.data || {};
      setError(
        name === "NotAllowedError"
          ? L.cancelled
          : (srv?.message || (name ? t.failed : "") || t.failed)
      );
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
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600">
              <BellRing size={20} />
            </span>
          </span>
          <div className="font-bold text-sm leading-tight">{t.urgent}</div>
          <div className="ms-auto text-xs font-bold tabular-nums bg-white/20 rounded-full px-2.5 py-1 shrink-0">
            {fmtRemaining(remaining)}
          </div>
        </div>
        <div className="px-4 py-3" dir={portalDir(lang)}>
          <p className="text-sm leading-relaxed text-slate-700">{t.instruction}</p>
          {t.soundHint && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t.soundHint}</p>}
          {soundBlocked && (
            <Button onClick={enableSound} variant="outline" className="w-full mt-2 h-10 font-bold">{t.sound || "Enable sound"}</Button>
          )}
          {/* من لم يسجل بصمة جهازه بعد: يُعرض له التفعيل ثم يؤكد بالبصمة نفسها للتأكد من وجوده على رأس العمل. */}
          {active.has_passkey === false && !enrolled && (
            <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
              <p className="text-[11px] leading-relaxed text-emerald-900">{L.enrollHint}</p>
              <Button onClick={enrollPasskey} disabled={enrollBusy} variant="outline" className="w-full mt-2 h-9 font-bold gap-2 border-emerald-300 text-emerald-800 bg-white">
                {enrollBusy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                {enrollBusy ? L.enrolling : L.enroll}
              </Button>
            </div>
          )}
          {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
          <Button onClick={confirm} disabled={busy || remaining <= 0} className="w-full mt-3 h-11 text-base font-bold bg-rose-600 hover:bg-rose-700 gap-2">
            {busy ? (<><Loader2 size={18} className="animate-spin" /> {t.confirming}</>) : (<><Fingerprint size={18} /> {t.confirm}</>)}
          </Button>
          <div className="mt-2 text-center text-[11px] text-muted-foreground tabular-nums">
            {t.remaining}: {fmtRemaining(remaining)}
          </div>
        </div>
      </div>
    </div>
  );
}
