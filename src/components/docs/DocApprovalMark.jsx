import React from "react";
import { cn } from "@/lib/utils";

/**
 * ختم حالة المستند: «مسودة» قبل الحفظ، و«معتمد» بعد الحفظ.
 * variant="stamp" يُوضع داخل المستند/المطبوع، و variant="chip" يُعرض على الشاشة.
 */
export default function DocApprovalMark({ approved, isAr, date, by, variant = "stamp", className }) {
  const title = approved ? (isAr ? "معتمدة" : "APPROVED") : (isAr ? "مسودة" : "DRAFT");
  const note = approved
    ? [date ? (isAr ? `تاريخ الاعتماد ${date}` : `Approved ${date}`) : (isAr ? "نسخة محفوظة" : "Saved copy"), by]
        .filter(Boolean)
        .join(" — ")
    : isAr
      ? "غير معتمدة — لم تُحفظ النسخة"
      : "Not approved — version not saved";

  if (variant === "chip") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-medium whitespace-nowrap",
          approved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700",
          className
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", approved ? "bg-emerald-500" : "bg-amber-500")} />
        {title}
        {note && <span className="text-[11px] opacity-75 font-normal">{note}</span>}
      </span>
    );
  }

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={cn(
        "inline-flex flex-col items-center justify-center text-center rounded-xl border-2 px-5 py-1.5",
        approved ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-amber-500 bg-amber-50 text-amber-700",
        className
      )}
    >
      <span className="text-base font-extrabold leading-tight">{title}</span>
      <span className="text-[10px] leading-tight opacity-85">{note}</span>
    </div>
  );
}