import React, { useState } from "react";
import { Paperclip, Loader2, X } from "lucide-react";
import { StoredDocButton } from "@/components/VaultDocLink";
import { uploadFileToVault } from "@/lib/vaultDocuments";
import { normalizeDocRefs } from "@/lib/vaultErrors";

/**
 * مرفقات الخزنة — عنصر واحد يُستخدم في كل الأقسام التي كانت بلا مستندات
 * (الإنذارات، الشكاوى، العهد، الأداء، التأمينات، القرارات...).
 *
 * — الرفع يذهب إلى الخزنة السعودية ويُعاد رمز (doc_ref) يُحفظ مع السجل.
 * — العرض يعمل مع رمز الخزنة أو رابط قديم (http) على حد سواء.
 * — القيمة تُقبل مصفوفة أو نص JSON أو رمزاً واحداً، فلا تفقد المرفقات القديمة.
 */

const T = {
  ar: { attach: "إرفاق مستند", empty: "لا مرفقات", uploading: "جارٍ الرفع...", remove: "حذف المرفق", hint: "تُخزَّن المرفقات في الخزنة السعودية داخل المملكة", failed: "تعذّر رفع المرفق إلى الخزنة", doc: "مستند" },
  en: { attach: "Attach document", empty: "No attachments", uploading: "Uploading...", remove: "Remove attachment", hint: "Attachments are stored in the Saudi vault inside the Kingdom", failed: "Could not upload the attachment to the vault", doc: "Document" },
};

/** عرض قائمة مرفقات سجل (للقراءة) */
export function VaultDocsView({ value, className = "", isAr = true, chipClass = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium" }) {
  const t = T[isAr ? "ar" : "en"];
  const refs = normalizeDocRefs(value);
  if (!refs.length) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {refs.map((ref, i) => (
        <StoredDocButton key={`${ref}-${i}`} value={ref} isAr={isAr} label={t.doc} className={chipClass}>
          <Paperclip size={13} /> {t.doc} {refs.length > 1 ? i + 1 : ""}
        </StoredDocButton>
      ))}
    </span>
  );
}

/** حقل مرفقات داخل النماذج: رفع + عرض + حذف */
export default function VaultAttachments({ value, onChange, isAr = true, docType = "attachment", empRef = null, label = "", disabled = false, className = "" }) {
  const t = T[isAr ? "ar" : "en"];
  const refs = normalizeDocRefs(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const add = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setBusy(true);
    setErr("");
    const next = [...refs];
    let failed = 0;
    for (const f of list) {
      if (f.size > 20 * 1024 * 1024) { failed += 1; continue; }
      const ref = await uploadFileToVault(f, { empRef, docType });
      if (ref) next.push(ref); else failed += 1;
    }
    setBusy(false);
    if (failed) setErr(t.failed);
    onChange(next);
  };

  const remove = (ref) => onChange(refs.filter((r) => r !== ref));

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-input cursor-pointer ${(busy || disabled) ? "opacity-60" : "hover:bg-accent"}`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {busy ? t.uploading : (label || t.attach)}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={busy || disabled}
            onChange={(e) => { add(e.target.files); e.target.value = ""; }}
          />
        </label>
        {refs.length === 0 && !busy && <span className="text-xs text-muted-foreground">{t.empty}</span>}
        {refs.map((ref, i) => (
          <span key={`${ref}-${i}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">
            <StoredDocButton value={ref} isAr={isAr} className="inline-flex items-center gap-1 text-blue-700 text-xs font-medium">
              <Paperclip size={12} /> {t.doc} {refs.length > 1 ? i + 1 : ""}
            </StoredDocButton>
            {!disabled && (
              <button type="button" onClick={() => remove(ref)} className="text-blue-400 hover:text-rose-600" title={t.remove}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground">{t.hint}</div>
      {err && <div className="text-xs text-rose-600">{err}</div>}
    </div>
  );
}
