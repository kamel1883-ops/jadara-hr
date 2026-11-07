import React, { useEffect, useState } from "react";
import { attendanceElapsedMs, formatWorkDuration } from "@/lib/hr";

// عدّاد حي لمدة التواجد للسجل المفتوح (حضور بلا انصراف): يبدأ من لحظة بصمة
// الحضور ويتحدث كل 30 ثانية، ويتوقف تلقائياً عند تسجيل الانصراف.
export default function OnDutyTimer({ record, isAr, className }) {
  const [, setTick] = useState(0);
  const open = !!record?.check_in && !record?.check_out;
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [open, record?.id]);
  if (!record?.check_in) return null;
  const label = formatWorkDuration(attendanceElapsedMs(record), isAr ? "ar" : "en");
  return (
    <div className={className || "mt-1 text-[11px] text-muted-foreground tabular-nums"}>
      {isAr ? `مدة التواجد: ${label}` : `On duty: ${label}`}
    </div>
  );
}
