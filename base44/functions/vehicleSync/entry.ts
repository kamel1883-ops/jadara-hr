import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyCronSecret } from "../../shared/renewal.ts";
import {
  syncVehicleWithTamm,
  tammConfigured,
  tammConfig,
  getTammToken,
} from "../../shared/tamm.ts";

/**
 * مزامنة بيانات المركبات مع منصة «تم» (استعلامات فقط):
 *  - تحديث تواريخ رخصة السير والتأمين والفحص الدوري من المصدر الحكومي.
 *  - تعمل تلقائياً كل سبت (workflow مجدول) وتعمل يدوياً بزر واحد بإيقاع لا يتجاوز مرة كل 7 أيام لكل مركبة.
 *
 * الاستدعاءات:
 *  { action: "sync",  vehicle_id }  → مزامنة مركبة واحدة (زر التحديث)  [admin]
 *  { action: "syncAll", cron_secret } → مزامنة كل المركبات المستحقة   [cron]
 *  { action: "status" }             → حالة الإعداد + المركبات وأوقات سماح التحديث [admin]
 *  { action: "diagnose" }           → فحص اتصال ومصادقة لدى «تم» بدون تعديل بيانات [admin]
 */

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_RUN = 40;
const CONCURRENCY = 4;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** آخر تاريخ مزامنة للمركبة (أي مصدر: تلقائي أو يدوي) */
function lastSyncAt(v: any): number {
  const raw = v?.tamm_sync_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return isNaN(t) ? 0 : t;
}

/** التاريخ الفعّال للوثيقة: المزامن من «تم» إن وُجد، وإلا ما أدخله العميل */
function effective(v: any, syncedField: string, manualField: string): string | null {
  return v?.[syncedField] || v?.[manualField] || null;
}

async function applySync(entities: any, vehicle: any) {
  const result = await syncVehicleWithTamm(vehicle);
  const patch: Record<string, any> = { tamm_sync_at: new Date().toISOString() };

  const got: string[] = [];
  const missing: string[] = [];
  const pairs: Array<[string, string, string | null, string]> = [
    ["tamm_sync_license_expiry", "license_expiry", result.license, "رخصة السير"],
    ["tamm_sync_insurance_expiry", "insurance_expiry", result.insurance, "التأمين"],
    ["tamm_sync_inspection_expiry", "inspection_expiry", result.inspection, "الفحص الدوري"],
  ];

  for (const [syncedField, manualField, value, label] of pairs) {
    if (value) {
      patch[syncedField] = value;
      // نحدّث الحقل الأصلي أيضاً حتى تقرأه التنبيهات والتقارير الحالية بلا أي تغيير فيها
      patch[manualField] = value;
      got.push(label);
    } else {
      missing.push(label);
    }
  }

  let status = "success";
  let message = `تم تحديث: ${got.join("، ") || "لا شيء"}`;
  if (got.length === 0) {
    status = "failed";
    message = `لم تُرجع «تم» أي تاريخ (${result.errors[0] || "رد فارغ"})`;
  } else if (missing.length > 0 || result.errors.length > 0) {
    status = "partial";
    message = `تم تحديث: ${got.join("، ")} — لم يتوفر: ${missing.join("، ")}${
      result.errors.length ? " | " + result.errors[0] : ""
    }`;
  }
  patch.tamm_sync_status = status;
  patch.tamm_sync_message = message.slice(0, 500);

  await entities.Vehicle.update(vehicle.id, patch);
  return { id: vehicle.id, plate: vehicle.plate_number || vehicle.plate_number_en || "", status, message, patch };
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "status");
    const isCron = verifyCronSecret(body?.cron_secret);

    let user: any = null;
    if (!isCron) {
      try {
        user = await base44.auth.me();
      } catch {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const sr = base44.asServiceRole.entities;
    const configured = tammConfigured();

    // ─── فحص الاتصال ───────────────────────────────────────────
    if (action === "diagnose") {
      if (!configured) {
        return Response.json({
          ok: false,
          configured: false,
          error: "TAMM_CLIENT_ID / TAMM_CLIENT_SECRET غير مضبوطة في أسرار البيئة",
        });
      }
      const c = tammConfig();
      try {
        const token = await getTammToken(true);
        return Response.json({
          ok: true,
          configured: true,
          base_url: c.baseUrl,
          token_url: c.tokenUrl,
          token_received: Boolean(token),
        });
      } catch (e: any) {
        return Response.json({
          ok: false,
          configured: true,
          base_url: c.baseUrl,
          token_url: c.tokenUrl,
          error: e?.message || String(e),
        });
      }
    }

    // ─── الحالة ────────────────────────────────────────────────
    if (action === "status") {
      const vehicles = await sr.Vehicle.list("-created_date", 2000);
      const now = Date.now();
      return Response.json({
        ok: true,
        configured,
        cooldown_days: 7,
        total: vehicles.length,
        vehicles: vehicles.map((v: any) => {
          const last = lastSyncAt(v);
          const next = last ? last + COOLDOWN_MS : 0;
          return {
            id: v.id,
            plate: v.plate_number || v.plate_number_en || "",
            last_sync_at: v.tamm_sync_at || null,
            last_status: v.tamm_sync_status || null,
            last_message: v.tamm_sync_message || null,
            can_sync: !last || now >= next,
            next_allowed_at: next && now < next ? new Date(next).toISOString() : null,
            expiry: {
              license: effective(v, "tamm_sync_license_expiry", "license_expiry"),
              insurance: effective(v, "tamm_sync_insurance_expiry", "insurance_expiry"),
              inspection: effective(v, "tamm_sync_inspection_expiry", "inspection_expiry"),
            },
          };
        }),
      });
    }

    // ─── مزامنة مركبة واحدة (الزر) ──────────────────────────────
    if (action === "sync") {
      const id = String(body?.vehicle_id || "");
      if (!id) return Response.json({ error: "vehicle_id مطلوب" }, { status: 400 });
      if (!configured) {
        return Response.json(
          { error: "tamm_not_configured", message: "لم تُضبط مفاتيح «تم» في أسرار البيئة بعد." },
          { status: 400 }
        );
      }
      const vehicle = await sr.Vehicle.get(id);
      if (!vehicle) return Response.json({ error: "not_found" }, { status: 404 });

      const last = lastSyncAt(vehicle);
      const next = last ? last + COOLDOWN_MS : 0;
      if (last && Date.now() < next) {
        const remaining = Math.ceil((next - Date.now()) / 86400000);
        return Response.json(
          {
            error: "cooldown",
            message: `لا يمكن التحديث إلا مرة كل 7 أيام. المتاح بعد ${remaining} يوم (${isoDate(
              new Date(next)
            )}).`,
            next_allowed_at: new Date(next).toISOString(),
          },
          { status: 429 }
        );
      }
      if (!String(vehicle.plate_number || vehicle.plate_number_en || "").trim()) {
        return Response.json(
          { error: "missing_plate", message: "أدخل رقم اللوحة أولاً قبل التحديث من «تم»." },
          { status: 400 }
        );
      }

      const out = await applySync(sr, vehicle);
      return Response.json({ ok: out.status !== "failed", ...out });
    }

    // ─── مزامنة الكل (الجدولة الأسبوعية) ────────────────────────
    if (action === "syncAll") {
      if (!isCron) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!configured) {
        return Response.json({ ok: false, configured: false, error: "tamm_not_configured" });
      }

      const vehicles = await sr.Vehicle.list("-created_date", 5000);
      const now = Date.now();
      const due = vehicles.filter((v: any) => {
        if (!String(v.plate_number || v.plate_number_en || "").trim()) return false;
        const last = lastSyncAt(v);
        return !last || now - last >= COOLDOWN_MS;
      });

      const batch = due.slice(0, MAX_PER_RUN);
      const results: any[] = [];
      for (let i = 0; i < batch.length; i += CONCURRENCY) {
        const chunk = batch.slice(i, i + CONCURRENCY);
        const settled = await Promise.all(
          chunk.map(async (v: any) => {
            try {
              return await applySync(sr, v);
            } catch (e: any) {
              const msg = (e?.message || String(e)).slice(0, 500);
              await sr.Vehicle.update(v.id, {
                tamm_sync_at: new Date().toISOString(),
                tamm_sync_status: "failed",
                tamm_sync_message: msg,
              }).catch(() => {});
              return { id: v.id, plate: v.plate_number || "", status: "failed", message: msg };
            }
          })
        );
        results.push(...settled);
      }

      const summary = {
        ok: true,
        total_vehicles: vehicles.length,
        due: due.length,
        processed: results.length,
        succeeded: results.filter((r) => r.status === "success").length,
        partial: results.filter((r) => r.status === "partial").length,
        failed: results.filter((r) => r.status === "failed").length,
        skipped_over_limit: Math.max(0, due.length - batch.length),
      };
      return Response.json({ ...summary, results });
    }

    return Response.json({ error: "unknown_action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
