import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// تطبيع النص العربي للبحث: إزالة التشكيل والتطويل وتوحيد الهمزات والألف والتاء المربوطة،
// ليطابق "مُحمَّد" نص "محمد" و"احمد" نص "أحمد".
export const normSearch = (s) =>
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

// حدّ أقصى للصفوف المعروضة دفعةً واحدة حتى لا يبطؤ النموذج مع آلاف السجلات —
// البحث يصل كامل القائمة بغض النظر عن هذا الحد.
const MAX_ROWS = 200;

/**
 * قائمة منسدلة قابلة للبحث — بنفس آلية NitaqatIsicSelect (Popover + Command).
 * groups: [{ label?: string, items: [{ value, label, sub?, searchText? }] }]
 * searchText هو النص الذي يُبحث فيه (إن غاب يُبحث في label + sub).
 */
export default function SearchSelect({
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  moreText,
  groups = [],
  disabled,
  className,
}) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nq = normSearch(query);

  const flat = useMemo(() => groups.flatMap((g) => g.items || []), [groups]);
  const selected = useMemo(
    () => flat.find((it) => String(it.value) === String(value)) || null,
    [flat, value]
  );

  const matches = (it) => {
    if (!nq) return true;
    const hay = normSearch(it.searchText || `${it.label || ""} ${it.sub || ""}`);
    return hay.includes(nq);
  };

  const shown = [];
  let budget = MAX_ROWS;
  for (const g of groups) {
    if (budget <= 0) break;
    const items = (g.items || []).filter(matches).slice(0, budget);
    if (!items.length) continue;
    shown.push({ label: g.label, items });
    budget -= items.length;
  }
  const truncated = !nq && flat.length > MAX_ROWS;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
              {selected && selected.sub ? <span className="text-muted-foreground"> — {selected.sub}</span> : null}
            </span>
            <ChevronDown size={16} className="shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder || (isAr ? "ابحث..." : "Search...")}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>{emptyText || (isAr ? "لا توجد نتائج مطابقة" : "No matching results")}</CommandEmpty>
              {shown.map((g, gi) => (
                <CommandGroup key={g.label || gi} heading={g.label}>
                  {g.items.map((it) => (
                    <CommandItem
                      key={it.value}
                      value={String(it.value)}
                      onSelect={() => { onValueChange(it.value); setOpen(false); setQuery(""); }}
                      className="items-start"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{it.label}</span>
                        {it.sub ? (
                          <span className="block truncate text-[11px] text-muted-foreground">{it.sub}</span>
                        ) : null}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {truncated && moreText ? (
                <div className="border-t px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">{moreText}</div>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
