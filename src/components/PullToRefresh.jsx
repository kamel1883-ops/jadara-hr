import React from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useTabScreenActive } from "@/components/TabScreenActive";
import { cn } from "@/lib/utils";

/**
 * Wraps scrollable page content with a pull-to-refresh gesture.
 * Pass an async `onRefresh` (usually the page's data loader).
 */
export default function PullToRefresh({ onRefresh, children, className }) {
  // التبويبات المخفية تبقى في الذاكرة — لا تُحدَّث مع سحبة التبويب الظاهر.
  const tabActive = useTabScreenActive();
  const { pullDistance, refreshing } = usePullToRefresh({ onRefresh, enabled: tabActive });
  const visible = pullDistance > 0 || refreshing;
  const height = refreshing ? 40 : Math.min(pullDistance, 60);
  const ready = pullDistance >= 50;

  return (
    <div className={className}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
        style={{ height: visible ? height : 0 }}
      >
        {refreshing ? (
          <Loader2 size={22} className="animate-spin text-violet-600" />
        ) : (
          <ArrowDown
            size={20}
            className={cn(
              "text-violet-500 transition-all",
              ready ? "opacity-100" : "opacity-40"
            )}
            style={{ transform: ready ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </div>
      {children}
    </div>
  );
}