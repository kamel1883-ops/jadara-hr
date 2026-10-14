import React from "react";
import { chartColors, chartNodeText, employeeDisplayName, roleLabel } from "@/lib/orgTree";

/**
 * مخطط تنظيمي عمودي بنفس آلية الهيكل المرجعي:
 * القمة (المالك ← المدير التنفيذي) في الأعلى، ثم صف الإدارات،
 * وتحت كل إدارة في نفس العمود موظفوها من الأعلى إلى الأسفل،
 * حتى يتّسع المخطط على ورقة A4 واحدة عند الطباعة.
 */
const LINE = "bg-[#1e293b]";
const COL_W = 156; // عرض عمود الإدارة (يحدّد مسافة خطوط الناقل)

export default function OrgChart({ model, lang, dir = "rtl", noneLabel = "أخرى", noManagerLabel = "بلا مدير" }) {
  const top = (model && model.top) || [];
  const cols = (model && model.columns) || [];
  if (top.length === 0 && cols.length === 0) return null;
  const rtl = dir === "rtl";
  const busHalf = ((cols.length - 1) * COL_W) / 2;

  return (
    <div className="overflow-x-auto pb-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="min-w-max mx-auto px-4 py-1 flex flex-col items-center">
        {/* القمة: المالك ثم المدير التنفيذي */}
        {top.length > 0 && (
          <div className="flex flex-col items-center">
            {top.map((node, i) => (
              <React.Fragment key={node.id}>
                {i > 0 && <div className={`w-0.5 h-4 ${LINE}`} />}
                <TopBox node={node} lang={lang} rtl={rtl} />
              </React.Fragment>
            ))}
          </div>
        )}
        {top.length > 0 && cols.length > 0 && <div className={`w-0.5 h-4 ${LINE}`} />}

        {/* صف الإدارات: خط أفقي ينزل إلى كل إدارة، وتحتها عمود موظفيها */}
        {cols.length > 0 && (
          <div className="relative flex items-start justify-center">
            {cols.length > 1 && (
              <div
                className={`absolute top-0 h-0.5 ${LINE}`}
                style={{ left: `calc(50% - ${busHalf}px)`, right: `calc(50% - ${busHalf}px)` }}
              />
            )}
            {cols.map((col) => (
              <Column key={col.key} col={col} lang={lang} rtl={rtl} noneLabel={noneLabel} noManagerLabel={noManagerLabel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ col, lang, rtl, noneLabel, noManagerLabel }) {
  const colors = col.manager ? chartColors(col.manager.role_level) : chartColors("manager");
  const head = col.name || noneLabel;
  const sub = col.manager ? employeeDisplayName(col.manager) : noManagerLabel;
  return (
    <div className="flex flex-col items-center" style={{ width: COL_W }}>
      <div className={`w-0.5 h-4 ${LINE}`} />
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="w-[146px] h-[64px] rounded-lg border-2 px-2 py-1.5 text-center overflow-hidden shadow-sm"
        style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
        title={[head, sub].filter(Boolean).join(" — ")}
      >
        <div className="text-[11px] font-extrabold leading-tight line-clamp-2">{head}</div>
        <div className="text-[10px] leading-tight mt-0.5 line-clamp-1 opacity-90">{sub}</div>
        {col.manager && <div className="text-[9px] leading-tight mt-0.5 line-clamp-1 opacity-75">{roleLabel(col.manager.role_level, lang)}</div>}
      </div>
      {col.members.map((m) => (
        <React.Fragment key={m.id}>
          <div className={`w-0.5 h-2.5 ${LINE}`} />
          <MemberBox node={m} lang={lang} rtl={rtl} />
        </React.Fragment>
      ))}
    </div>
  );
}

function TopBox({ node, lang, rtl }) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="w-[150px] h-[64px] rounded-lg border-2 px-2 py-1.5 text-center overflow-hidden shadow-sm"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
      title={[text.title, text.name, text.num].filter(Boolean).join(" — ")}
    >
      <div className="text-[11px] font-extrabold leading-tight line-clamp-2">{text.title}</div>
      {text.name && text.name !== text.title && (
        <div className="text-[10px] leading-tight mt-0.5 line-clamp-1 opacity-90">{text.name}</div>
      )}
      {text.num && <div className="text-[9px] leading-tight mt-0.5 opacity-75">{text.num}</div>}
    </div>
  );
}

function MemberBox({ node, lang, rtl }) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="w-[136px] h-[44px] rounded-md border px-2 py-1 text-center overflow-hidden"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
      title={[text.title, text.name, text.num].filter(Boolean).join(" — ")}
    >
      <div className="text-[10px] font-bold leading-tight line-clamp-1">{text.title}</div>
      {text.name && text.name !== text.title && (
        <div className="text-[9px] leading-tight mt-0.5 line-clamp-1 opacity-90">{text.name}</div>
      )}
      {text.num && <div className="text-[8px] leading-tight opacity-75">{text.num}</div>}
    </div>
  );
}
