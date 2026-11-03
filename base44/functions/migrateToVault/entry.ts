/**
 * migrateToVault — ترحيل البيانات الحساسة الموجودة في Base44 إلى الخزنة السعودية.
 *
 * يقرأ السجلات التي تحتوي بيانات حساسة ولم تُرحّل بعد (لا يوجد *_ref)،
 * يخزّن البيانات الحساسة في الخزنة، ثم يحدّث سجل Base44 بالمرجع ويُفرّغ الحقول الحساسة.
 *
 * يُشغّل يدوياً من قبل المالك/الأدمن مرة واحدة بعد نشر الخزنة الموسّعة.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  storeRecord, updateRecord, storeEmployee,
} from "../../shared/vaultClient.ts";
import { companyVaultKey } from "../../shared/vaultIdentity.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "admin_required" }, { status: 403 });
    }
    // الترحيل يكتب تحت مفتاح المنشأة (الرقم الموحّد) لا حساب المشغّل، فتُقرأ السجلات
    // المرحّلة من كل حسابات المنشأة — الرئيسي والفرعي — وبلا أي وصول لمنشأة أخرى.
    let tenant = user.id;
    try { tenant = await companyVaultKey(base44, user); } catch { tenant = user.id; }
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;

    const report: Record<string, { scanned: number; migrated: number; failed: number }> = {
      employees: { scanned: 0, migrated: 0, failed: 0 },
      complaints: { scanned: 0, migrated: 0, failed: 0 },
      warnings: { scanned: 0, migrated: 0, failed: 0 },
      licenses: { scanned: 0, migrated: 0, failed: 0 },
    };

    // ---- الموظفون: الهوية/الجواز/البنك → vault_employees (يجب أن يُنفّذ أولاً لأن الرواتب تعتمد عليه) ----
    try {
      const employees = await base44.entities.Employee.list("-created_date", 1000);
      report.employees.scanned = employees.length;
      for (const e of employees) {
        if (e.emp_ref) continue; // سبق تهجيره
        const sensitive = {
          national_id: e.national_id || "",
          passport_number: e.passport_number || "",
          bank_account: e.bank_account || "",
          birth_date: e.birth_date || "",
          phone: e.phone || "",
          address: e.address || "",
          emergency_contact: e.emergency_contact || "",
          health_insurance_number: e.health_insurance_number || "",
        };
        // لا تُهاجر إن لم يكن هناك أي قيمة حساسة
        const hasAny = Object.values(sensitive).some((v) => v);
        if (!hasAny) { report.employees.migrated++; continue; }
        if (dryRun) { report.employees.migrated++; continue; }
        try {
          const res = await storeEmployee(tenant, sensitive);
          const ref = (res as any)?.emp_ref || (res as any)?.ref;
          if (ref) {
            await base44.entities.Employee.update(e.id, {
              emp_ref: ref,
              national_id: "",
              passport_number: "",
              bank_account: "",
              birth_date: "",
              phone: "",
              address: "",
              emergency_contact: "",
              health_insurance_number: "",
            });
            report.employees.migrated++;
          } else { report.employees.failed++; }
        } catch { report.employees.failed++; }
      }
    } catch (e) { console.error("[migrate] employees:", e.message); }

    // ---- الشكاوى: الوصف الحساس → vault_complaints ----
    try {
      const complaints = await base44.entities.Complaint.list("-created_date", 500);
      report.complaints.scanned = complaints.length;
      for (const c of complaints) {
        if (c.complaint_ref) continue;
        if (!c.description && !c.custom_type) continue;
        const vaultData = {
          complaint_type: c.complaint_type,
          custom_type: c.custom_type || "",
          description: c.description || "",
          is_confidential: !!c.is_confidential,
        };
        if (dryRun) { report.complaints.migrated++; continue; }
        try {
          const res = await storeRecord(tenant, "complaints", vaultData, null);
          const ref = (res as any)?.complaint_ref || (res as any)?.ref;
          if (ref) {
            await base44.entities.Complaint.update(c.id, {
              complaint_ref: ref, description: "", custom_type: "",
            });
            report.complaints.migrated++;
          } else { report.complaints.failed++; }
        } catch { report.complaints.failed++; }
      }
    } catch (e) { console.error("[migrate] complaints:", e.message); }

    // ---- الإنذارات: نص الإنذار + ملخص التحقيق → vault_warnings ----
    try {
      const warnings = await base44.entities.Warning.list("-created_date", 500);
      report.warnings.scanned = warnings.length;
      for (const w of warnings) {
        if (w.warning_ref) continue;
        if (!w.description && !w.investigation_summary && !w.article_reference) continue;
        const vaultData = {
          violation_category: w.violation_category,
          article_reference: w.article_reference || "",
          warning_level: w.warning_level,
          incident_date: w.incident_date || "",
          session_date: w.session_date || "",
          investigation_summary: w.investigation_summary || "",
          description: w.description || "",
        };
        if (dryRun) { report.warnings.migrated++; continue; }
        try {
          const res = await storeRecord(tenant, "warnings", vaultData, w.emp_ref || null);
          const ref = (res as any)?.warning_ref || (res as any)?.ref;
          if (ref) {
            await base44.entities.Warning.update(w.id, {
              warning_ref: ref,
              description: "", investigation_summary: "", article_reference: "",
            });
            report.warnings.migrated++;
          } else { report.warnings.failed++; }
        } catch { report.warnings.failed++; }
      }
    } catch (e) { console.error("[migrate] warnings:", e.message); }

    // ---- التراخيص: الرقم/الجهة/الملاحظات → vault_licenses ----
    try {
      const licenses = await base44.entities.License.list("-created_date", 500);
      report.licenses.scanned = licenses.length;
      for (const l of licenses) {
        if (l.license_ref) continue;
        if (!l.license_number && !l.issuing_authority && !l.notes) continue;
        const vaultData = {
          license_type: l.license_type,
          custom_label: l.custom_label || "",
          license_number: l.license_number || "",
          issuing_authority: l.issuing_authority || "",
          issue_date: l.issue_date || "",
          expiry_date: l.expiry_date || "",
          duration_months: l.duration_months || 0,
          notes: l.notes || "",
          document_url: l.document_url || "",
        };
        if (dryRun) { report.licenses.migrated++; continue; }
        try {
          const res = await storeRecord(tenant, "licenses", vaultData, null);
          const ref = (res as any)?.license_ref || (res as any)?.ref;
          if (ref) {
            await base44.entities.License.update(l.id, {
              license_ref: ref,
              license_number: "", issuing_authority: "", notes: "",
            });
            report.licenses.migrated++;
          } else { report.licenses.failed++; }
        } catch { report.licenses.failed++; }
      }
    } catch (e) { console.error("[migrate] licenses:", e.message); }

    return Response.json({ ok: true, dry_run: dryRun, report });
  } catch (error) {
    console.error("[migrateToVault] error:", error.message);
    return Response.json({ error: "migration_failed", details: error.message }, { status: 500 });
  }
}