import { activeLang } from "@/lib/lang";

// رمز العملة حسب اللغة
const SAR_BY_LANG = {
  ar: "ر.س", en: "SAR", hi: "SAR", ne: "SAR", bn: "SAR", fil: "SAR", ur: "SAR",
};
export const sarSymbol = () => SAR_BY_LANG[activeLang()] || SAR_BY_LANG.en;

export function formatCurrency(n) {
  return `${(Number(n) || 0).toLocaleString("en-US")} ${sarSymbol()}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// أسماء أنواع الإجازات — 7 لغات
const LEAVE_TYPES = {
  ar: { annual: "إجازة سنوية", sick: "إجازة مرضية", emergency: "إجازة طارئة", unpaid: "بدون راتب", maternity: "إجازة أمومة", permission: "استئذان" },
  en: { annual: "Annual", sick: "Sick", emergency: "Emergency", unpaid: "Unpaid", maternity: "Maternity", permission: "Permission" },
  hi: { annual: "वार्षिक अवकाश", sick: "बीमारी अवकाश", emergency: "आपातकालीन अवकाश", unpaid: "बिना वेतन", maternity: "मातृत्व अवकाश", permission: "अनुमति" },
  ne: { annual: "वार्षिक बिदा", sick: "बिरामी बिदा", emergency: "आपतकालीन बिदा", unpaid: "बिना तलब बिदा", maternity: "मातृत्व बिदा", permission: "अनुमति" },
  bn: { annual: "বার্ষিক ছুটি", sick: "অসুস্থতার ছুটি", emergency: "জরুরি ছুটি", unpaid: "বেতনহীন ছুটি", maternity: "মাতৃত্ব ছুটি", permission: "অনুমতি" },
  fil: { annual: "Taon-taon", sick: "Sick", emergency: "Emergency", unpaid: "Unpaid", maternity: "Maternity", permission: "Permission" },
  ur: { annual: "سالانہ چھٹی", sick: "بیماری کی چھٹی", emergency: "ایمرجنسی", unpaid: "بلا تنخواہ", maternity: "مادرناٹی", permission: "اجازت" },
};

export function leaveTypeLabel(type) {
  const lang = activeLang();
  const map = LEAVE_TYPES[lang] || LEAVE_TYPES.en;
  return map[type] || type;
}

// النوع الكامل مع بيان الراتب (براتب / بدون راتب) — 7 لغات
const LEAVE_FULL = {
  ar: { annual: "إجازة سنوية براتب", sick: "إجازة مرضية براتب", emergency: "إجازة طارئة براتب", unpaid: "إجازة بدون راتب", maternity: "إجازة أمومة براتب", permission: "استئذان (ساعات)" },
  en: { annual: "Annual leave (paid)", sick: "Sick leave (paid)", emergency: "Emergency leave (paid)", unpaid: "Unpaid leave", maternity: "Maternity leave (paid)", permission: "Permission (hours)" },
  hi: { annual: "वार्षिक अवकाश (paid)", sick: "बीमारी अवकाश (paid)", emergency: "आपातकालीन अवकाश (paid)", unpaid: "बिना वेतन अवकाश", maternity: "मातृत्व अवकाश (paid)", permission: "अनुमति (घंटे)" },
  ne: { annual: "वार्षिक बिदा (paid)", sick: "बिरामी बिदा (paid)", emergency: "आपातकालीन बिदा (paid)", unpaid: "बिना तलब बिदा", maternity: "मातृत्व बिदा (paid)", permission: "अनुमति (घण्टा)" },
  bn: { annual: "বার্ষিক ছুটি (paid)", sick: "অসুস্থতার ছুটি (paid)", emergency: "জরুরি ছুটি (paid)", unpaid: "বেতনহীন ছুটি", maternity: "মাতৃত্ব ছুটি (paid)", permission: "অনুমতি (ঘণ্টা)" },
  fil: { annual: "Annual leave (paid)", sick: "Sick leave (paid)", emergency: "Emergency leave (paid)", unpaid: "Unpaid leave", maternity: "Maternity leave (paid)", permission: "Permission (hours)" },
  ur: { annual: "سالانہ چھٹی (مع تنخواہ)", sick: "بیماری کی چھٹی (مع تنخواہ)", emergency: "ایمرجنسی چھٹی (مع تنخواہ)", unpaid: "بلا تنخواہ چھٹی", maternity: "مادرناٹی چھٹی (مع تنخواہ)", permission: "اجازت (گھنٹے)" },
};

export function leaveFullTypeLabel(type) {
  const lang = activeLang();
  const map = LEAVE_FULL[lang] || LEAVE_FULL.en;
  return map[type] || leaveTypeLabel(type);
}

export function leaveIsPaid(type) {
  return type !== "unpaid";
}

export function leavePayStatusLabel(type) {
  const lang = activeLang();
  const paid = { ar: "براتب", en: "Paid", hi: "Paid", ne: "Paid", bn: "Paid", fil: "Paid", ur: "مع تنخواہ" };
  const unpaid = { ar: "بدون راتب", en: "Unpaid", hi: "Unpaid", ne: "Unpaid", bn: "Unpaid", fil: "Unpaid", ur: "بلا تنخواہ" };
  const m = type === "unpaid" ? unpaid : paid;
  return m[lang] || m.en;
}

export function statusColors(status) {
  if (status === "pending") return "bg-amber-50 text-amber-600";
  if (status === "approved") return "bg-emerald-50 text-emerald-600";
  return "bg-rose-50 text-rose-600";
}

export function statusEmployeeLabel(status) {
  const lang = activeLang();
  const ar = {
    active: { label: "على رأس العمل", cls: "bg-emerald-50 text-emerald-600" },
    on_leave: { label: "في إجازة", cls: "bg-amber-50 text-amber-600" },
    terminated: { label: "منهي", cls: "bg-rose-50 text-rose-600" },
    resigned: { label: "مستقيل", cls: "bg-slate-100 text-slate-500" },
  };
  const en = {
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-600" },
    on_leave: { label: "On leave", cls: "bg-amber-50 text-amber-600" },
    terminated: { label: "Terminated", cls: "bg-rose-50 text-rose-600" },
    resigned: { label: "Resigned", cls: "bg-slate-100 text-slate-500" },
  };
  const hi = { active: { label: "कार्यरत", cls: "bg-emerald-50 text-emerald-600" }, on_leave: { label: "अवकाश पर", cls: "bg-amber-50 text-amber-600" }, terminated: { label: "समाप्त", cls: "bg-rose-50 text-rose-600" }, resigned: { label: "इस्तीफा", cls: "bg-slate-100 text-slate-500" } };
  const ne = { active: { label: "कार्यरत", cls: "bg-emerald-50 text-emerald-600" }, on_leave: { label: "बिदामा", cls: "bg-amber-50 text-amber-600" }, terminated: { label: "समाप्त", cls: "bg-rose-50 text-rose-600" }, resigned: { label: "राजिनामा", cls: "bg-slate-100 text-slate-500" } };
  const bn = { active: { label: "কর্মরত", cls: "bg-emerald-50 text-emerald-600" }, on_leave: { label: "ছুটিতে", cls: "bg-amber-50 text-amber-600" }, terminated: { label: "সমাপ্ত", cls: "bg-rose-50 text-rose-600" }, resigned: { label: "পদত্যাগ", cls: "bg-slate-100 text-slate-500" } };
  const fil = { active: { label: "Aktibo", cls: "bg-emerald-50 text-emerald-600" }, on_leave: { label: "Nasa leave", cls: "bg-amber-50 text-amber-600" }, terminated: { label: "Itinapos", cls: "bg-rose-50 text-rose-600" }, resigned: { label: "Nagbitiw", cls: "bg-slate-100 text-slate-500" } };
  const ur = { active: { label: "ملازم", cls: "bg-emerald-50 text-emerald-600" }, on_leave: { label: "چھٹی پر", cls: "bg-amber-50 text-amber-600" }, terminated: { label: "ختم شدہ", cls: "bg-rose-50 text-rose-600" }, resigned: { label: "استعفیٰ", cls: "bg-slate-100 text-slate-500" } };
  const map = { ar, en, hi, ne, bn, fil, ur }[lang] || en;
  return map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
}

export function ticketEntitlementLabel(value) {
  const lang = activeLang();
  const map = {
    ar: { yearly: "سنوي", biennial: "كل سنتين", none: "لا يستحق" },
    en: { yearly: "Yearly", biennial: "Biennial", none: "None" },
    hi: { yearly: "वार्षिक", biennial: "द्विवार्षिक", none: "कोई नहीं" },
    ne: { yearly: "वार्षिक", biennial: "द्विवार्षिक", none: "छैन" },
    bn: { yearly: "বার্ষিক", biennial: "দ্বিবার্ষিক", none: "নেই" },
    fil: { yearly: "Yearly", biennial: "Biennial", none: "None" },
    ur: { yearly: "سالانہ", biennial: "ہر دو سال", none: "کوئی نہیں" },
  };
  return (map[lang] || map.en)[value] || value || "";
}

export function contractTypeLabel(value) {
  const lang = activeLang();
  const map = {
    ar: { full_time: "دوام كامل", part_time: "دوام جزئي", contract: "عقد" },
    en: { full_time: "Full time", part_time: "Part time", contract: "Contract" },
    hi: { full_time: "पूर्णकालिक", part_time: "अंशकालिक", contract: "अनुबंध" },
    ne: { full_time: "पूर्णकालिक", part_time: "अंशकालिक", contract: "सम्झौता" },
    bn: { full_time: "পূর্ণকালীন", part_time: "খণ্ডকালীন", contract: "চুক্তি" },
    fil: { full_time: "Full time", part_time: "Part time", contract: "Contract" },
    ur: { full_time: "فل ٹائم", part_time: "پارٹ ٹائم", contract: "معاہدہ" },
  };
  return (map[lang] || map.en)[value] || value || "";
}

export function attendanceStatusLabel(status) {
  const lang = activeLang();
  const ar = {
    present: { label: "حاضر", cls: "bg-emerald-50 text-emerald-600" },
    late: { label: "متأخر", cls: "bg-amber-50 text-amber-600" },
    absent: { label: "غائب", cls: "bg-rose-50 text-rose-600" },
    leave: { label: "إجازة", cls: "bg-blue-50 text-blue-600" },
    holiday: { label: "عطلة", cls: "bg-violet-50 text-violet-600" },
  };
  const en = {
    present: { label: "Present", cls: "bg-emerald-50 text-emerald-600" },
    late: { label: "Late", cls: "bg-amber-50 text-amber-600" },
    absent: { label: "Absent", cls: "bg-rose-50 text-rose-600" },
    leave: { label: "Leave", cls: "bg-blue-50 text-blue-600" },
    holiday: { label: "Holiday", cls: "bg-violet-50 text-violet-600" },
  };
  const hi = { present: { label: "उपस्थित", cls: "bg-emerald-50 text-emerald-600" }, late: { label: "देर से", cls: "bg-amber-50 text-amber-600" }, absent: { label: "अनुपस्थित", cls: "bg-rose-50 text-rose-600" }, leave: { label: "अवकाश", cls: "bg-blue-50 text-blue-600" }, holiday: { label: "छुट्टी", cls: "bg-violet-50 text-violet-600" } };
  const ne = { present: { label: "उपस्थित", cls: "bg-emerald-50 text-emerald-600" }, late: { label: "ढिलो", cls: "bg-amber-50 text-amber-600" }, absent: { label: "अनुपस्थित", cls: "bg-rose-50 text-rose-600" }, leave: { label: "बिदा", cls: "bg-blue-50 text-blue-600" }, holiday: { label: "बिदा/छुट्टी", cls: "bg-violet-50 text-violet-600" } };
  const bn = { present: { label: "উপস্থিত", cls: "bg-emerald-50 text-emerald-600" }, late: { label: "দেরি", cls: "bg-amber-50 text-amber-600" }, absent: { label: "অনুপস্থিত", cls: "bg-rose-50 text-rose-600" }, leave: { label: "ছুটি", cls: "bg-blue-50 text-blue-600" }, holiday: { label: "ছুটির দিন", cls: "bg-violet-50 text-violet-600" } };
  const fil = { present: { label: "Present", cls: "bg-emerald-50 text-emerald-600" }, late: { label: "Late", cls: "bg-amber-50 text-amber-600" }, absent: { label: "Absent", cls: "bg-rose-50 text-rose-600" }, leave: { label: "Leave", cls: "bg-blue-50 text-blue-600" }, holiday: { label: "Holiday", cls: "bg-violet-50 text-violet-600" } };
  const ur = { present: { label: "حاضر", cls: "bg-emerald-50 text-emerald-600" }, late: { label: "دیر", cls: "bg-amber-50 text-amber-600" }, absent: { label: "غیر حاضر", cls: "bg-rose-50 text-rose-600" }, leave: { label: "چھٹی", cls: "bg-blue-50 text-blue-600" }, holiday: { label: "چھٹی کا دن", cls: "bg-violet-50 text-violet-600" } };
  const map = { ar, en, hi, ne, bn, fil, ur }[lang] || en;
  return map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
}

// عرض السجل المفتوح (بصمة حضور بلا انصراف) كـ «موجود بالعمل» مع بقاء الحالة
// المخزنة present لضمان توافق التقارير والرواتب — يُقبل سجلاً أو حالة نصية.
export function attendanceDisplayStatus(recordOrStatus) {
  const record = recordOrStatus && typeof recordOrStatus === "object" ? recordOrStatus : null;
  const stored = String(record?.status ?? recordOrStatus ?? "");
  const open = stored === "present" && record?.check_in && !record?.check_out;
  if (!open) return attendanceStatusLabel(stored);
  const lang = activeLang();
  const map = {
    ar: "موجود بالعمل",
    en: "On duty",
    hi: "ड्यूटी पर मौजूद",
    ne: "ड्युटीमा उपस्थित",
    bn: "ডিউটিতে উপস্থিত",
    fil: "Nasa duty",
    ur: "ڈیوٹی پر موجود",
  };
  return { key: "on_duty", label: map[lang] || map.en, cls: "bg-emerald-50 text-emerald-700" };
}

// لحظة الحضور/الانصراف بالمللي ثانية: الطابع المخزّن أولاً، ثم اشتقاق من تاريخ
// السجل + الوقت، ثم تاريخ الإنشاء احتياطاً للحضور. تُستخدم لحساب مدة التواجد الفعلية.
export function attendanceMomentMs(record, kind) {
  try {
    const stamped = Number(record?.[kind === "out" ? "check_out_at" : "check_in_at"]) || 0;
    if (stamped > 0) return stamped;
    const hm = String(record?.[kind === "out" ? "check_out" : "check_in"] || "");
    const d = String(record?.date || "").slice(0, 10);
    if (d && /^\d{1,2}:\d{2}$/.test(hm)) {
      const t = new Date(`${d}T${hm}:00`).getTime();
      if (!isNaN(t)) return t;
    }
    if (kind === "in" && record?.created_date) {
      const t = new Date(record.created_date).getTime();
      if (!isNaN(t)) return t;
    }
  } catch {}
  return 0;
}

// المدة المنقضية بالمللي ثانية: للمفتوح (حضور بلا انصراف) حتى اللحظة المعطاة،
// وللمغلق بين لحظتي الحضور والانصراف — أي مدة التواجد الفعلية بالدوام.
export function attendanceElapsedMs(record, nowMs) {
  const start = attendanceMomentMs(record, "in");
  if (!start) return 0;
  const end = record?.check_out ? attendanceMomentMs(record, "out") : Number(nowMs) || Date.now();
  if (!end || end < start) return 0;
  return end - start;
}

// صياغة المدة بالعربية: «ساعة و10 دقائق»، «ساعتين و5 دقائق»، «4 ساعات»،
// «7 ساعات و30 دقيقة» — وبغير العربية بصيغة مختصرة مثل 1h 10m.
export function formatWorkDuration(ms, lang) {
  const totalMin = Math.max(0, Math.floor((Number(ms) || 0) / 60000));
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (lang !== "ar") {
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    if (m) return `${m}m`;
    return "<1m";
  }
  const unit = (n, one, two, few, many) => {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return `${n} ${few}`;
    return `${n} ${many}`;
  };
  const parts = [];
  if (h) parts.push(unit(h, "ساعة", "ساعتين", "ساعات", "ساعة"));
  if (m) parts.push(unit(m, "دقيقة", "دقيقتين", "دقائق", "دقيقة"));
  if (!parts.length) return "أقل من دقيقة";
  return parts.join(" و");
}

// تاريخ عملية الحضور/الانصراف الفعلية: من طابع لحظة العملية المخزّن، وإلا تاريخ السجل.
// kind: "in" للحضور، "out" للانصراف. يُستخدم لعرض تاريخ كل عملية مع وقتها.
export function attendanceOpDate(record, kind) {
  try {
    const at = Number(record?.[kind === "out" ? "check_out_at" : "check_in_at"]) || 0;
    if (at > 0) {
      const d = new Date(at);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }
  } catch {}
  return String(record?.date || "").slice(0, 10);
}

// أسماء أيام الأسبوع بالعربية مفهرسة حسب getDay() (0=الأحد ... 6=السبت)
export const WEEK_DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// يعيد اسم اليوم بالعربية لتاريخ بصيغة YYYY-MM-DD
export function dayNameAr(dateStr) {
  if (!dateStr) return "";
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return WEEK_DAYS_AR[d.getDay()];
}

// يعيد مصفوفة أرقام أيام العمل المختارة للمنشأة (0=الأحد ... 6=السبت) — افتراضي السبت→الخميس
export function orgWorkDays(org) {
  const s = org?.work_days;
  if (!s && s !== 0) return [0, 1, 2, 3, 4, 6];
  const arr = String(s).split(",").map((x) => Number(x.trim())).filter((x) => !isNaN(x));
  return arr.length ? arr : [0, 1, 2, 3, 4, 6];
}

// هل التاريخ المُعطى ضمن عطلة المنشأة الأسبوعية (أي ليس من أيام العمل)؟
export function isOrgWeeklyOff(dateStr, org) {
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  return !orgWorkDays(org).includes(d.getDay());
}

export function payrollStatusLabel(status) {
  const lang = activeLang();
  const ar = {
    draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600" },
    approved: { label: "معتمد", cls: "bg-blue-50 text-blue-600" },
    paid: { label: "مصروف", cls: "bg-emerald-50 text-emerald-600" },
  };
  const en = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
    approved: { label: "Approved", cls: "bg-blue-50 text-blue-600" },
    paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-600" },
  };
  const hi = { draft: { label: "ड्राफ्ट", cls: "bg-slate-100 text-slate-600" }, approved: { label: "स्वीकृत", cls: "bg-blue-50 text-blue-600" }, paid: { label: "भुगतान", cls: "bg-emerald-50 text-emerald-600" } };
  const ne = { draft: { label: "ड्राफ्ट", cls: "bg-slate-100 text-slate-600" }, approved: { label: "स्वीकृत", cls: "bg-blue-50 text-blue-600" }, paid: { label: "भुक्तानी", cls: "bg-emerald-50 text-emerald-600" } };
  const bn = { draft: { label: "খসড়া", cls: "bg-slate-100 text-slate-600" }, approved: { label: "অনুমোদিত", cls: "bg-blue-50 text-blue-600" }, paid: { label: "পরিশোধিত", cls: "bg-emerald-50 text-emerald-600" } };
  const fil = { draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" }, approved: { label: "Na-apruba", cls: "bg-blue-50 text-blue-600" }, paid: { label: "Nabayaran", cls: "bg-emerald-50 text-emerald-600" } };
  const ur = { draft: { label: "مسودہ", cls: "bg-slate-100 text-slate-600" }, approved: { label: "منظور شدہ", cls: "bg-blue-50 text-blue-600" }, paid: { label: "ادا شدہ", cls: "bg-emerald-50 text-emerald-600" } };
  const map = { ar, en, hi, ne, bn, fil, ur }[lang] || en;
  return map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
}