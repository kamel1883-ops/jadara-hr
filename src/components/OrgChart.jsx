import React from "react";
import { chartColors, chartNodeText } from "@/lib/orgTree";

/**
 * مخطط هرمي ثابت: كل شخص صندوق بحجم واحد، والأبناء في صف واحد بلا التفاف حتى لا تتداخل الخطوط.
 * الألوان تتبع المستوى: قمة فاتحة، إدارة بنفسجي، قسم أصفر، مسمى أزرق.
 */
const LINE = "bg-[#1e293b]";

export default function OrgChart({ roots, lang, dir = "rtl" }) {
  if (!roots || roots.length === 0) return null;
  const rtl = dir === "rtl";
  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex justify-center min-w-max px-4 py-2" dir="ltr">
        {roots.map((node) => (
          <Node key={node.id} node={node} lang={lang} rtl={rtl} />
        ))}
      </div>
    </div>
  );
}

function Node({ node, lang, rtl }) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  const kids = node._children || [];
  const ordered = rtl ? kids.slice().reverse() : kids;

  return (
    <div className="flex flex-col items-center">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="w-[148px] h-[78px] rounded-lg border-2 px-2 py-1.5 text-center overflow-hidden shadow-sm"
        style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
        title={[text.title, text.name, text.num].filter(Boolean).join(" — ")}
      >
        <div className="text-[11px] font-extrabold leading-tight line-clamp-2">{text.title}</div>
        {text.name && text.name !== text.title && (
          <div className="text-[10px] leading-tight mt-0.5 line-clamp-2 opacity-90">{text.name}</div>
        )}
        {text.num && <div className="text-[9px] opacity-75 mt-0.5">{text.num}</div>}
      </div>

      {ordered.length > 0 && (
        <div className="flex flex-col items-center">
          <div className={`w-px h-6 ${LINE}`} />
          <div className="flex items-start justify-center">
            {ordered.map((child, i) => {
              const hasLeft = i > 0;
              const hasRight = i < ordered.length - 1;
              return (
                <div key={child.id} className="flex flex-col items-center px-1.5">
                  <div className="relative h-6 w-full">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 ${LINE}`} />
                    {hasLeft && <div className={`absolute top-0 left-0 right-1/2 h-px ${LINE}`} />}
                    {hasRight && <div className={`absolute top-0 left-1/2 right-0 h-px ${LINE}`} />}
                  </div>
                  <Node node={child} lang={lang} rtl={rtl} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
