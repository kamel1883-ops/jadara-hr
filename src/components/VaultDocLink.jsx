import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download } from "lucide-react";
import { openStoredDoc, openVaultDoc, vaultFailureMessage } from "@/lib/vaultDocuments";

/**
 * VaultDocLink — عرض/تنزيل مستند مؤرشف في الخزنة السعودية.
 * - إن كان الحقل رابطاً قديماً (http) → يفتحه مباشرة (توافق مع البيانات السابقة).
 * - إن كان رمز خزنة (doc_ref) → يجلب رابطاً مؤقتاً من vaultProxy ويفتحه.
 * يعرض زر تنزيل صغير؛ يعمل للمستندات المولّدة والمرفقات على حد سواء.
 *
 * عند الفشل يُعرض **سبب الفشل الحقيقي** (غير مُهيّأة / مفتاح مرفوض / غير موجود في
 * منشأتك / انتهت المهلة / تعذّر الوصول) بدل الرسالة العامة السابقة.
 */
async function reportFailure(code, isAr) {
  const msg = await vaultFailureMessage(code, isAr);
  try { console.warn("[vault] open failed:", code); } catch { /* تجاهل */ }
  alert(msg);
}

export default function VaultDocLink({ value, label = "فتح المستند", className = "", isAr = true }) {
  const [busy, setBusy] = useState(false);
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;

  const isUrl = /^https?:\/\//i.test(String(value));

  const open = async () => {
    if (isUrl) { window.open(value, "_blank", "noopener,noreferrer"); return; }
    setBusy(true);
    const r = await openVaultDoc(value);
    setBusy(false);
    if (!r.ok) await reportFailure(r.code, isAr);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={open} disabled={busy} className={`gap-1.5 ${className}`} title={isAr ? "فتح المستند من الخزنة" : "Open from vault"}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      <FileText size={14} /> {label}
    </Button>
  );
}

/** زر يفتح رابطاً قديماً أو رمز خزنة مع الإبقاء على شكل الزر في الصفحة */
export function StoredDocButton({ value, className = "", children, isAr = true, label = "" }) {
  const [busy, setBusy] = useState(false);
  if (!value) return null;
  const open = async () => {
    setBusy(true);
    const r = await openStoredDoc(value);
    setBusy(false);
    if (!r.ok) await reportFailure(r.code, isAr);
  };
  return (
    <button type="button" onClick={open} disabled={busy} className={className} title={label || (isAr ? "فتح المستند" : "Open document")}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}
