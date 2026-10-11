import React, { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { findActivity, loadNitaqatCatalog } from "@/lib/nitaqat";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

function Picker({ label, valueLabel, placeholder, options, onSelect, disabled }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nq = norm(query);
  const rows = useMemo(() => {
    const list = options || [];
    if (!nq) return list.length > 200 ? list.slice(0, 80) : list;
    const hit = [];
    for (const row of list) {
      if (norm(row.label).includes(nq) || norm(row.code).includes(nq)) {
        hit.push(row);
        if (hit.length >= 80) break;
      }
    }
    return hit;
  }, [options, nq]);

  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-right hover:bg-accent min-h-[44px] disabled:opacity-60"
          >
            <span className={cn("truncate", !valueLabel && "text-muted-foreground")}>{valueLabel || placeholder}</span>
            <ChevronDown size={16} className="text-muted-foreground shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" dir={isAr ? "rtl" : "ltr"}>
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={isAr ? "ابحث بالاسم أو الرمز…" : "Search by name or code…"} />
            <CommandList className="max-h-72">
              <CommandEmpty>{isAr ? "لا نتائج" : "No results"}</CommandEmpty>
              <CommandGroup>
                {rows.map((row) => (
                  <CommandItem
                    key={row.id}
                    value={row.id}
                    onSelect={() => { onSelect(row); setOpen(false); setQuery(""); }}
                    className="gap-2"
                  >
                    <Check size={15} className={cn("shrink-0", row.selected ? "opacity-100 text-violet-600" : "opacity-0")} />
                    {row.code && <span className="text-muted-foreground tabular-nums shrink-0 ltr-num">{row.code}</span>}
                    <span className="truncate">{row.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// نشاط رئيسي، ثم النشاط التفصيلي الذي يندرج تحته. هذا النشاط هو الذي تُحسب به النطاقات.
export default function NitaqatIsicSelect({ code, group, onChange }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    loadNitaqatCatalog().then(setCatalog).catch(() => {});
  }, []);

  const current = findActivity(catalog, code);
  const groupId = current?.group || group || "";
  const groupRow = catalog?.groups.find((g) => g.id === String(groupId));
  const children = catalog && groupId ? catalog.byGroup.get(String(groupId)) || [] : [];

  const mainOptions = (catalog?.groups || []).map((g) => ({
    id: g.id,
    code: "",
    label: g.ar,
    selected: g.id === String(groupId),
    raw: g,
  }));
  const detailOptions = children.map((a) => ({
    id: a.code,
    code: a.code,
    label: isAr ? a.ar : a.en,
    selected: a.code === current?.code,
    raw: a,
  }));

  return (
    <div className="space-y-3">
      <Picker
        label={isAr ? "النشاط الرئيسي" : "Main activity"}
        placeholder={isAr ? "اختر النشاط الرئيسي" : "Choose the main activity"}
        valueLabel={groupRow?.ar || ""}
        options={mainOptions}
        disabled={!catalog}
        onSelect={(row) => {
          if (row.id === String(groupId) && current) return;
          onChange({ code: "", name: "", group: row.id });
        }}
      />
      <Picker
        label={isAr ? "النشاط التفصيلي" : "Detailed activity"}
        placeholder={groupId
          ? (isAr ? "اختر النشاط الذي يندرج تحت الرئيسي" : "Choose the activity under the main one")
          : (isAr ? "اختر النشاط الرئيسي أولاً" : "Choose the main activity first")}
        valueLabel={current ? `${current.code} — ${isAr ? current.ar : current.en}` : ""}
        options={detailOptions}
        disabled={!catalog || !groupId}
        onSelect={(row) => onChange({
          code: row.raw.code,
          name: row.raw.ar,
          group: row.raw.group,
        })}
      />
    </div>
  );
}
