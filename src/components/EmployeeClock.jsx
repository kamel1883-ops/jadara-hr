import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, LogIn, LogOut, MapPin, CheckCircle2, Coffee, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalI18n, usePortalT, portalDir } from "@/lib/portalI18n";
import { resolveWorkHours } from "@/lib/branchHours";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const R = 6371e3;
const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
// التقاط عدة قراءات GPS متتالية لتمييز الموقع الحقيقي عن الموقع المُزيَّف:
// قراءات GPS الحقيقية تتذبذب دائماً بأمتار قليلة بين القراءات، أما المُزيّف
// فيُعيد نفس الإحداثيات تماماً بدقة مثالية. نُرجع مصفوفة القراءات للتحليل.
// نستخدم watchPosition لتتابع القراءات لحظياً (أسرع بكثير من طلبات متتالية)،
// ونتوقف فوراً عند أول قراءة تُثبت وجود الموظف داخل نطاق المقر، أو بعد 8 ثوانٍ كحد أقصى.
const captureGPS = (t, isInside) =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ error: t.noGeo, readings: [] });
    const readings = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(id);
      clearTimeout(timer);
      resolve({ readings });
    };
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        readings.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        const last = readings[readings.length - 1];
        if (isInside(last) || readings.length >= 4) finish();
      },
      () => finish(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
    const timer = setTimeout(finish, 8000);
  });

// يحدد نطاق البصمة من فرع الموظف إن وُجد، ويعود للمقر الرئيسي للمنشأة كبدیل.
// الفروع تختزن الموقع في lat/lng، أما المنشأة فتختزنه في workplace_lat/workplace_lng.
function resolveWorkplace(org, branch) {
  const hasBranch = branch && branch.lat != null && branch.lat !== "" && branch.lng != null && branch.lng !== "";
  if (hasBranch) {
    return { lat: Number(branch.lat), lng: Number(branch.lng), radius: Number(branch.radius) || Number(org?.workplace_radius) || 50, name: branch.name, isBranch: true };
  }
  const hasOrg = org && org.workplace_lat != null && org.workplace_lat !== "" && org.workplace_lng != null && org.workplace_lng !== "";
  if (hasOrg) {
    return { lat: Number(org.workplace_lat), lng: Number(org.workplace_lng), radius: Number(org.workplace_radius) || 50, name: org?.name || "", isBranch: false };
  }
  return null;
}

export default function EmployeeClock({ employee, org, branch, onChanged, clockApi, initialToday }) {
  const { lang } = usePortalI18n();
  const t = usePortalT("clock");

  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const loadToday = async () => {
    if (initialToday != null) { setToday(initialToday); setLoading(false); return; }
    setLoading(true);
    try {
      if (clockApi?.today) {
        const tt = await clockApi.today();
        setToday(tt || null);
      } else {
        const recs = await base44.entities.Attendance.filter({ employee_id: employee.id, date: localToday() }, "-created_date", 5);
        setToday(recs[0] || null);
      }
    } catch {
      setToday(null);
    }
    setLoading(false);
  };
  useEffect(() => { if (employee?.id) loadToday(); }, [employee?.id, clockApi, initialToday]);

  const wp = resolveWorkplace(org, branch);
  const radius = wp?.radius || 50;
  // ساعات العمل المعتمدة: دوام فرع الموظف إن كان الفرع له دوام خاص، وإلا دوام المنشأة العام
  const hours = resolveWorkHours(org, branch);

  const run = async (kind) => {
    setMsg({ type: "", text: "" });
    if (!wp) { setMsg({ type: "err", text: t.noWorkplace }); return; }
    setBusy(true);
    try {
      const inRange = (r) =>
        distanceMeters(r.lat, r.lng, wp.lat, wp.lng) <= radius + Math.min(Number(r.acc) || 25, 150) + 15;
      const { readings, error } = await captureGPS(t, inRange);
      if (error) { setMsg({ type: "err", text: error }); setBusy(false); return; }
      if (!readings.length) { setMsg({ type: "err", text: t.noAccess }); setBusy(false); return; }
      // ترتيب القراءات حسب الدقة واتخاذ الوسيط كموقع معتمد
      const sorted = [...readings].sort((a, b) => a.acc - b.acc);
      const median = readings.length >= 3 ? sorted[Math.floor(readings.length / 2)] : sorted[0];
      const minAcc = sorted[0].acc;
      // مدى التذبذب (أقصى مسافة بين أي قراءتين بالأمتار) — GPS حقيقي يتذبذب ولا يثبت
      let spread = 0;
      for (let i = 0; i < readings.length; i++)
        for (let j = i + 1; j < readings.length; j++)
          spread = Math.max(spread, distanceMeters(readings[i].lat, readings[i].lng, readings[j].lat, readings[j].lng));
      // كشف تزييف الموقع: قراءات متطابقة تماماً (تذبذب ≈ 0) أو دقة مستحيلة (< 3م) → موقع مُزيّف
      if (readings.length >= 2 && spread < 0.2 && minAcc < 3) {
        setMsg({ type: "err", text: lang === "ar"
          ? "تعذّر التحقق من موقعك الفعلي. أغلق أي تطبيق لتغيير الموقع (تزييف GPS) ثم أعد المحاولة."
          : "Couldn't verify your real location. Close any GPS-spoofing app and try again." });
        setBusy(false); return;
      }
      // نعتمد أقرب قراءة للمقر (تذبذب GPS الطبيعي يجعل بعض القراءات أبعد بأمتار)
      const best = readings.reduce((a, r) =>
        distanceMeters(r.lat, r.lng, wp.lat, wp.lng) < distanceMeters(a.lat, a.lng, wp.lat, wp.lng) ? r : a, readings[0]);
      const chosen = best;
      const dist = distanceMeters(chosen.lat, chosen.lng, wp.lat, wp.lng);
      // هامش تسامح = دقة القراءة (حتى 150م) + 15م لتجاوز خطأ التحديد على الهواتف
      const tolerance = Math.min(Number(chosen.acc) || 25, 150) + 15;
      if (dist > radius + tolerance) {
        setMsg({ type: "err", text: `${t.outRange(Math.round(dist), radius)} ${lang === "ar" ? `(دقة الموقع ±${Math.round(chosen.acc)}م)` : `(location accuracy ±${Math.round(chosen.acc)}m)`}` });
        setBusy(false); return;
      }
      if (kind === "in") {
        if (today && today.check_in) { setMsg({ type: "err", text: t.alreadyIn }); setBusy(false); return; }
        if (clockApi?.clockIn) {
          await clockApi.clockIn(chosen.lat, chosen.lng, chosen.acc);
        } else {
          const name = `${employee.employee_number} - ${employee.position}`;
          const bId = branch?.id || employee.branch_id || null;
          const bName = branch?.name || employee.branch_name || "";
          // حساب حالة التأخير من دوام الفرع المعتمد لموظفيه (وإلا دوام المنشأة)
          const checkInTime = nowHM();
          let arrivalStatus = "present";
          const ws = hours.work_start_time;
          const grace = hours.late_grace_minutes;
          if (ws && checkInTime) {
            const toMin = (hm) => { const m = /^(\d{1,2}):(\d{2})/.exec(hm); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
            const startMin = toMin(ws), checkMin = toMin(checkInTime);
            if (startMin !== null && checkMin !== null && checkMin > startMin + grace) arrivalStatus = "late";
          }
          if (today) {
            await base44.entities.Attendance.update(today.id, { check_in: checkInTime, status: arrivalStatus, source: "portal", employee_user_id: employee.user_id, branch_id: bId, branch_name: bName });
          } else {
            await base44.entities.Attendance.create({ employee_id: employee.id, employee_user_id: employee.user_id, employee_name: name, emp_ref: employee.emp_ref || "", date: localToday(), check_in: checkInTime, status: arrivalStatus, source: "portal", work_hours: 0, branch_id: bId, branch_name: bName });
          }
        }
        setMsg({ type: "ok", text: t.doneIn });
      } else if (kind === "break") {
        if (!today || !today.check_in) { setMsg({ type: "err", text: t.needIn }); setBusy(false); return; }
        if (today.check_out) { setMsg({ type: "err", text: t.alreadyOut }); setBusy(false); return; }
        if (onBreak) { setMsg({ type: "err", text: t.alreadyOnBreak }); setBusy(false); return; }
        if (clockApi?.breakStart) { await clockApi.breakStart(); }
        else { await base44.entities.Attendance.update(today.id, { break_start: nowHM(), source: "portal" }); }
        setMsg({ type: "ok", text: t.breakDone });
      } else if (kind === "resume") {
        if (!onBreak) { setMsg({ type: "err", text: t.notOnBreak }); setBusy(false); return; }
        if (clockApi?.breakEnd) { await clockApi.breakEnd(); }
        else {
          const [bs, bsm] = today.break_start.split(":").map(Number);
          const d = new Date();
          let mins = d.getHours() * 60 + d.getMinutes() - (bs * 60 + bsm); if (mins < 0) mins += 24 * 60;
          const total = (Number(today.break_minutes) || 0) + Math.max(0, mins);
          await base44.entities.Attendance.update(today.id, { break_start: "", break_minutes: total, source: "portal" });
        }
        setMsg({ type: "ok", text: t.resumeDone });
      } else { // out
        if (!today || !today.check_in) { setMsg({ type: "err", text: t.needIn }); setBusy(false); return; }
        if (today.check_out) { setMsg({ type: "err", text: t.alreadyOut }); setBusy(false); return; }
        if (onBreak) { setMsg({ type: "err", text: t.breakOnOut }); setBusy(false); return; }
        const [h, m] = today.check_in.split(":").map(Number);
        const d = new Date();
        let mins = d.getHours() * 60 + d.getMinutes() - (h * 60 + m); if (mins < 0) mins += 24 * 60;
        const net = Math.max(0, mins - (Number(today.break_minutes) || 0));
        const wh = Math.max(0, Math.round((net / 60) * 100) / 100);
        if (clockApi?.clockOut) { await clockApi.clockOut(wh); }
        else { await base44.entities.Attendance.update(today.id, { check_out: nowHM(), work_hours: wh, source: "portal" }); }
        setMsg({ type: "ok", text: t.doneOut });
      }
      await loadToday(); onChanged?.();
    } catch (e) {
      setMsg({ type: "err", text: e?.message || t.fail });
    } finally {
      setBusy(false);
    }
  };

  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;
  const onBreak = !!today?.break_start;
  const isRtl = portalDir(lang) === "rtl";

  return (
    <div className="bg-white rounded-2xl border border-border p-5 mb-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Fingerprint size={22} className="text-violet-600" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{t.title}</h3>
          <p className="text-xs text-muted-foreground">
            {wp?.isBranch && t.subBranch ? t.subBranch(radius, localToday(), wp.name) : t.sub(radius, localToday())}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 rounded-xl bg-muted/60 border border-border px-3 py-2">
        <div className="text-xs">
          <span className="text-muted-foreground">{t.nowLabel}: </span>
          <span className="font-semibold tabular-nums">
            {now.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")} · {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}:{String(now.getSeconds()).padStart(2,"0")}
          </span>
        </div>
        {hours.work_start_time && hours.work_end_time && (
          <div className="text-xs text-muted-foreground">
            {t.schedLabel(hours.work_start_time, hours.work_end_time)}
            {hours.custom && wp?.isBranch && (
              <span className="ms-1 text-violet-600 font-medium">
                · {lang === "ar" ? `دوام فرع ${wp.name}` : `Branch ${wp.name}`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
          <div className="text-xs text-muted-foreground">{t.in}</div>
          <div className="text-lg font-bold tabular-nums">{today?.check_in || "—"}</div>
        </div>
        <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3">
          <div className="text-xs text-muted-foreground">{t.out}</div>
          <div className="text-lg font-bold tabular-nums">{today?.check_out || "—"}</div>
        </div>
      </div>

      {checkedIn && !checkedOut && (onBreak || (today?.break_minutes || 0) > 0) && (
        <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3 mb-4 flex items-center gap-2">
          <Coffee size={16} className="text-amber-600 shrink-0" />
          <div className="text-sm font-medium text-amber-700">
            {onBreak ? t.breakSince(today.break_start) : t.breakTotal(today.break_minutes || 0)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!checkedOut ? (
          <>
            <Button onClick={() => run("in")} disabled={busy || loading || checkedIn} className="gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} {t.btnIn}
            </Button>
            {checkedIn && !onBreak && (
              <Button onClick={() => run("break")} disabled={busy || loading} variant="secondary" className="gap-2">
                <Coffee size={16} /> {t.btnBreak}
              </Button>
            )}
            {checkedIn && onBreak && (
              <Button onClick={() => run("resume")} disabled={busy || loading} className="gap-2">
                <Play size={16} /> {t.btnResume}
              </Button>
            )}
            <Button onClick={() => run("out")} disabled={busy || loading || !checkedIn || onBreak} variant="outline" className="gap-2">
              <LogOut size={16} /> {t.btnOut}
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
            <CheckCircle2 size={18} /> {t.complete(today?.work_hours || 0)}
          </div>
        )}
      </div>

      {!wp && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <MapPin size={14} /> {t.noWorkplace2}
        </div>
      )}
      {msg.text && (
        <div className={cn("mt-3 text-sm rounded-lg p-3", msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
          {msg.text}
        </div>
      )}
    </div>
  );
}