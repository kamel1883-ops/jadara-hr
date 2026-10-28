import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// بطاقة بوابة كبيرة وفخمة داخل صفحة الهبوط (بوابة الموظف / بوابة الاشتراكات) — تظهر على الجوال والمتصفح والتطبيقات.
export default function PortalEntryCard({ icon: Icon, title, desc, cta, to, isAr }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-l from-violet-50 via-violet-100/60 to-fuchsia-50 p-8 sm:p-10">
      <div className="absolute -top-12 -left-12 w-60 h-60 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
            <Icon size={26} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">{title}</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">{desc}</p>
          </div>
        </div>
        <Link
          to={to}
          className="self-start inline-flex items-center gap-2 bg-violet-600 text-white hover:bg-violet-700 px-6 py-3.5 rounded-2xl font-semibold shadow-xl shadow-violet-600/30 transition"
        >
          {cta} <ArrowLeft size={18} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
        </Link>
      </div>
    </div>
  );
}