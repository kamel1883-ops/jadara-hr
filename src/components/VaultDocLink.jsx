import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download } from "lucide-react";
import { openStoredDoc, openVaultDoc } from "@/lib/vaultDocuments";

/**
 * VaultDocLink — عرض/تنزيل مستند مؤرشف في الخزنة السعودية.
 * - إن كان الحقل رابطاً قديماً (http) → يفتحه مباشرة (توافق مع البيانات السابقة).
 * - إن كان رمز خزنة (doc_ref) → يجلب رابطاً مؤقتاً من vaultProxy ويفتحه.
 * يعرض زر تنزيل صغير؛ يعمل للمستندات المولّدة والمرفقات على حد سواء.
 */
export default function VaultDocLink({ value, label = "فتح المستند", className = "" }) {
  const [busy, setBusy] = useState(false);
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;

  const isUrl = /^https?:\/\//i.test(String(value));

  const open = async () => {
    if (isUrl) { window.open(value, "_blank", "noopener,noreferrer"); return; }
    setBusy(true);
    const ok = await openVaultDoc(value);
    setBusy(false);
    if (!ok) alert("تعذر فتح المستند من الخزنة.");
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={open} disabled={busy} className={`gap-1.5 ${className}`}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      <FileText size={14} /> {label}
    </Button>
  );
}

/** زر يفتح رابطاً قديماً أو رمز خزنة مع الإبقاء على شكل الزر في الصفحة */
export function StoredDocButton({ value, className = "", children }) {
  const [busy, setBusy] = useState(false);
  if (!value) return null;
  const open = async () => {
    setBusy(true);
    const ok = await openStoredDoc(value);
    setBusy(false);
    if (!ok) alert("تعذر فتح المستند من الخزنة.");
  };
  return (
    <button type="button" onClick={open} disabled={busy} className={className}>
      {children}
    </button>
  );
}