import React, { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// قائمة الأنشطة الاقتصادية الرسمية (الدليل الوطني للأنشطة الاقتصادية ISIC4 — وزارة التجارة)
// المصدر: البحث الاسترشادي للدليل الوطني للأنشطة الاقتصادية ISIC4 — 2,800 نشاط
let CACHE = null;
let PENDING = null;

async function loadActivities() {
  if (CACHE) return CACHE;
  if (!PENDING) {
    PENDING = fetch(`${import.meta.env.BASE_URL}isic4-activities.json`)
      .then((r) => r.json())
      .then((d) => { CACHE = d; return d; })
      .catch(() => { PENDING = null; return null; });
  }
  return PENDING;
}

// تطبيع عربي للبحث: تجاهل التشكيل والتطويل وتوحيد الهمزات
const norm = (s) =>
  String(s || "")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const LIMIT = 80;

export default function NitaqatIsicSelect({ code, name, group, onChange, className }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(CACHE);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    loadActivities().then((d) => { setData(d); setLoading(false); });
  }, [open, data]);

  const results = useMemo(() => {
    if (!data) return { rows: [], more: false };
    const nq = norm(query);
    const rows = [];
    let more = false;
    for (const row of data.activities) {
      const [c, n] = row;
      if (!nq || String(c).startsWith(nq) || norm(n).includes(nq)) {
        if (rows.length >= LIMIT) { more = true; break; }
        rows.push(row);
      }
    }
    return { rows, more };
  }, [data, query]);

  const groupName = data && group ? data.groups[String(group)] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-right hover:bg-accent min-h-[44px]",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Search size={15} className="text-muted-foreground shrink-0" />
            {code ? (
              <span className="flex flex-col items-start truncate">
                <span className="truncate">
                  <span className="text-muted-foreground tabular-nums ltr-num">{code}</span>
                  {" — "}
                  {name}
                </span>
                {groupName && <span className="text-[11px] text-muted-foreground truncate">{groupName}</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {isAr ? "ابحث برمز النشاط أو باسمه…" : "Search by activity code or name…"}
              </span>
            )}
          </span>
          <ChevronDown size={16} className="text-muted-foreground shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" dir={isAr ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "ابحث برمز النشاط أو باسمه…" : "Search by code or name…"}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 size={15} className="animate-spin" />
              {isAr ? "جارٍ تحميل الأنشطة الرسمية…" : "Loading official activities…"}
            </div>
          )}
          {!loading && results.rows.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">{isAr ? "لا نتائج" : "No results"}</div>
          )}
          {!loading && results.rows.map(([c, n, g]) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange({ code: String(c), name: n, group: String(g) }); setOpen(false); }}
              className="w-full flex items-start gap-2 px-3 py-2 text-right text-sm hover:bg-accent"
            >
              <Check
                size={15}
                className={cn("shrink-0 mt-0.5", String(code) === String(c) ? "opacity-100 text-violet-600" : "opacity-0")}
              />
              <span className="min-w-0">
                <span className="block truncate">
                  <span className="text-muted-foreground tabular-nums ltr-num me-1">{c}</span>
                  {n}
                </span>
                {data && <span className="block text-[11px] text-muted-foreground truncate">{data.groups[String(g)]}</span>}
              </span>
            </button>
          ))}
          {!loading && results.more && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border">
              {isAr ? "اكتب كلمة أدق لتضييق النتائج…" : "Type a more specific word to narrow results…"}
            </div>
          )}
        </div>
        {data && (
          <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            {isAr
              ? `${data.count.toLocaleString("en-US")} نشاط — الدليل الوطني ISIC4 (وزارة التجارة)`
              : `${data.count.toLocaleString("en-US")} activities — National ISIC4 guide (Ministry of Commerce)`}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}