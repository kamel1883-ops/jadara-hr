// وظيفة تحقّق مؤقتة — تُحذف بعد التأكد من نجاح أرشفة مستند الإجازة وربطه بالطلب.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const leaveId = "6ad0883fc8119d66c69a5dba";
  const legacy = "https://base44.app/api/apps/6a74edc8f347046365c2e1a4/files/mp/public/6a74edc8f347046365c2e1a4/a0b62a614_leave-settlement-6a957639fd61ab170805a498.pdf";
  const L = base44.asServiceRole.entities.LeaveRequest;
  const rows = (p: any) => (Array.isArray(p) ? p : p?.items || []);
  const out: any = {};
  out.byId = rows(await L.filter({ id: leaveId }, { limit: 2 })).length;
  out.byEmp = rows(await L.filter({ employee_id: "6a7b5f4ef66815fdc660a409" }, { limit: 2 })).length;
  out.legacyNoFields = rows(await L.filter({ settlement_pdf_url: legacy })).length;
  out.legacyFields = rows(await L.filter({ settlement_pdf_url: legacy }, { limit: 2, fields: ["id"] })).length;
  out.legacyRegex = rows(await L.filter({ settlement_pdf_url: { $regex: "a0b62a614" } }, { limit: 2 })).length;
  out.legacyOr = rows(await L.filter({ employee_id: "6a7b5f4ef66815fdc660a409", $or: [{ settlement_pdf_url: legacy }] }, { limit: 2 })).length;
  return Response.json({ ok: true, out });
}