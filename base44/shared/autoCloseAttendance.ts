// الإغلاق التلقائي للسجلات المفتوحة المنسية — من سجّل حضوراً ولم يسجل
// انصرافه حتى نهاية دوام ذلك اليوم، يُسجَّل له انصراف بنهاية الدوام
// (أو 23:59 عند غياب الدوام المجدول)، وقبل اكتمال 24 ساعة من الحضور.
// لا يمس سجل اليوم الحالي أبداً: الإغلاق لسجلات الأيام السابقة فقط.
// الحالة تُحسم بنفس قاعدة الانصراف العادية (الصافي مقابل المطلوب بعد السماح).
import { resolveBranchSchedule } from "./branchSchedule.ts";

const MIN_MS = 60 * 1000;
// سقف المدة: قبل اكتمال 24 ساعة من لحظة الحضور.
const MAX_DURATION_MIN = 24 * 60 - 1;

function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

function hmToMin(hm: any): number | null {
  const m = String(hm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// تاريخ الرياض (آسيا/الرياض) بلحظة معينة — بصيغة YYYY-MM-DD.
export function riyadhDateStr(atMs?: number): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date(Number(atMs) || Date.now()))
        .map((p) => [p.type, p.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return new Date(Number(atMs) || Date.now()).toISOString().slice(0, 10);
  }
}

// دقائق الحائط للحظة معينة بتوقيت الرياض — احتياط للسجلات بلا وقت نصي.
function riyadhMinutes(atMs: number): number | null {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Riyadh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .formatToParts(new Date(atMs))
        .map((p) => [p.type, p.value])
    );
    const h = Number(parts.hour);
    const mi = Number(parts.minute);
    if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
    return (h % 24) * 60 + mi;
  } catch {
    return null;
  }
}

function checkInMsOf(rec: any): number {
  const stamped = Number(rec?.check_in_at) || 0;
  if (stamped > 0) return stamped;
  const d = String(rec?.date || "").slice(0, 10);
  const hm = String(rec?.check_in || "");
  if (d && /^\d{1,2}:\d{2}/.test(hm)) {
    const t = new Date(`${d}T${hm}:00`).getTime();
    if (!isNaN(t)) return t;
  }
  try {
    const t = new Date(rec?.created_date).getTime();
    if (!isNaN(t)) return t;
  } catch {}
  return 0;
}

export interface AutoCloseScope {
  org: any;
  employees: any[];
  branches: any[];
  employeeIds?: string[];
  nowMs?: number;
}

// يغلق السجلات المفتوحة (حضور بلا انصراف) من الأيام السابقة فقط، ويعيد عددها.
export async function closeStaleOpenAttendance(base44: any, scope: AutoCloseScope): Promise<number> {
  const org = scope?.org || {};
  const employees = Array.isArray(scope?.employees) ? scope.employees : [];
  const branches = Array.isArray(scope?.branches) ? scope.branches : [];
  const nowMs = Number(scope?.nowMs) || Date.now();
  const todayStr = riyadhDateStr(nowMs);
  const empById = new Map(employees.map((e: any) => [String(e?.id || ""), e]));
  const branchById = new Map(branches.map((b: any) => [String(b?.id || ""), b]));
  const ids =
    Array.isArray(scope?.employeeIds) && scope.employeeIds.length
      ? scope.employeeIds.map(String)
      : [...empById.keys()].filter(Boolean);
  if (!ids.length) return 0;
  let rows: any[] = [];
  try {
    rows = asList(
      await base44.asServiceRole.entities.Attendance.filter({ employee_id: { $in: ids } }, "-date", 5000)
    );
  } catch {
    return 0;
  }
  let closed = 0;
  for (const rec of rows) {
    try {
      if (!rec?.check_in || rec?.check_out) continue;
      const st = String(rec?.status || "");
      if (st === "leave" || st === "absent" || st === "holiday") continue;
      const recDate = String(rec?.date || "").slice(0, 10);
      // سجل اليوم الحالي لا يُمس — الإغلاق للأيام السابقة فقط.
      if (!recDate || recDate >= todayStr) continue;
      const inMs = checkInMsOf(rec);
      if (!inMs) continue;
      const emp = empById.get(String(rec?.employee_id || ""));
      const branch = branchById.get(String((rec as any)?.branch_id || (emp as any)?.branch_id || ""));
      const sched = resolveBranchSchedule(org, branch || {});
      const endMinRaw = hmToMin((sched as any)?.work_end_time);
      let inMin = hmToMin(rec?.check_in);
      if (inMin == null) {
        inMin = riyadhMinutes(inMs);
        if (inMin == null) continue;
      }
      let endMin = endMinRaw != null ? endMinRaw : 23 * 60 + 59;
      // دوام ليلي يعبر منتصف الليل: النهاية في اليوم التالي.
      if (endMin <= inMin) endMin += 24 * 60;
      const durMin = Math.min(endMin - inMin, MAX_DURATION_MIN);
      if (durMin <= 0) continue;
      const endMs = inMs + durMin * MIN_MS;
      // لم تنتهِ نهاية الدوام بعد — يُترك مفتوحاً.
      if (nowMs < endMs) continue;
      const net = Math.max(0, durMin - (Number((rec as any)?.break_minutes) || 0));
      const wh = Math.round((net / 60) * 100) / 100;
      const hpd = Number((sched as any)?.work_hours_per_day) || 0;
      const req = hpd > 0 ? Math.min(hpd, 8) : 0;
      const grace = Number((sched as any)?.late_grace_minutes) || 0;
      const status = req > 0 && req - wh - grace / 60 > 0 ? "late" : "present";
      const outMin = (((inMin + durMin) % (24 * 60)) + 24 * 60) % (24 * 60);
      await base44.asServiceRole.entities.Attendance.update(String(rec.id), {
        check_out: `${pad2(Math.floor(outMin / 60))}:${pad2(outMin % 60)}`,
        check_out_at: endMs,
        work_hours: wh,
        status,
        auto_closed: true,
      });
      closed += 1;
    } catch {}
  }
  return closed;
}
