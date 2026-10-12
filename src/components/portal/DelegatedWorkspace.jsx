import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Users, UserPlus, Fingerprint, Upload, CheckCircle2, CalendarDays, Plane, Banknote,
  ShieldCheck, Car, FileText, Target, GraduationCap, Network, MessageSquare,
  AlertTriangle, FileSearch, ScrollText, Gift, BarChart3, FileBadge, Globe, Settings,
} from "lucide-react";
import { delegatedFor } from "./delegatedRegistry";
import DelegatedAdminSection from "./DelegatedAdminSection";

const ICONS = {
  Users, UserPlus, Fingerprint, Upload, CheckCircle2, CalendarDays, Plane, Banknote,
  ShieldCheck, Car, FileText, Target, GraduationCap, Network, MessageSquare,
  AlertTriangle, FileSearch, ScrollText, Gift, BarChart3, FileBadge, Globe, Settings,
};

// أي قسم مُفوّض يُعرض للموظف بصفحته الأصلية من لوحة الشركات وبكامل صلاحياته،
// وكل عملية ينفّذها تُوثّق تلقائياً بـ «أُعدّت بواسطة» (اسمه ورقم هويته) على الخادم.
export default function DelegatedWorkspace({ perms, session, employee, isAr = true }) {
  const sections = delegatedFor(perms);
  const [active, setActive] = useState(null);
  if (!sections.length) return null;

  const current = sections.find((s) => s.key === active);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-violet-600" />
        <h3 className="font-bold">{isAr ? "الأقسام الإدارية المفوّضة لك" : "Your delegated departments"}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
          {sections.length}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="lg:w-64 shrink-0 lg:order-1">
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/70 shadow-lg p-2 space-y-1 lg:sticky lg:top-24 lg:max-h-[70vh] lg:overflow-y-auto">
            {sections.map((s) => {
              const Icon = ICONS[s.icon] || ShieldCheck;
              const isActive = s.key === active;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActive(isActive ? null : s.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition",
                    isActive ? "bg-violet-100 text-violet-800" : "hover:bg-violet-50/70"
                  )}
                >
                  <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isActive ? "bg-violet-200" : "bg-violet-100")}>
                    <Icon size={16} className="text-violet-600" />
                  </span>
                  <span className="text-sm font-medium truncate">{isAr ? s.ar : s.en}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 min-w-0 lg:order-2">
          {!current ? (
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/70 shadow-lg p-10 text-center text-sm text-muted-foreground">
              {isAr ? "اختر قسماً من القائمة لبدء العمل عليه." : "Select a department from the list to start."}
            </div>
          ) : (
            <div>
              <div className="mb-3 text-xs text-muted-foreground">
                {isAr
                  ? "كل إجراء تنفّذه في هذا القسم يُسجَّل ويُطبع بعبارة «أُعدّت بواسطة» باسمك ورقم هويتك."
                  : "Every action here is recorded and stamped “Prepared by” with your name and ID."}
              </div>
              <DelegatedAdminSection sectionKey={current.key} session={session} employee={employee} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}