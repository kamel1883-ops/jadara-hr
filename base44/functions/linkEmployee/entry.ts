import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { findEmployeesByNationalId } from '../../shared/vaultIdentity.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nationalId = String(body.national_id || '').trim();
    if (!nationalId) return Response.json({ error: 'رقم الهوية/الإقامة مطلوب' }, { status: 400 });

    // الهوية المعزولة تُطابق داخل الخزنة السعودية، ويُعاد سجل الموظف دون إعادة كتابتها
    const matches = await findEmployeesByNationalId(base44, nationalId);
    if (!matches || matches.length === 0) {
      return Response.json({ error: 'لا يوجد موظف مسجل بهذا الرقم. تأكد من الرقم أو تواصل مع الموارد البشرية.' }, { status: 404 });
    }
    const emp = matches[0];

    // حدود الثقة: التحقق من تطابق بريد المستخدم الموثّق مع بريد العمل المسجّل لدى HR لهذا الموظف.
    // لا يُسمح بالربط إلا إذا كان بريد العمل مضبوطاً ومطابقاً لبريد المستخدم المسجّل (الموثّق عبر OTP) —
    // هذا يمنع الاستيلاء على حساب موظف بمعرفة رقم هويته فقط.
    const empEmail = (emp.email || '').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();
    if (!empEmail || empEmail !== userEmail) {
      return Response.json({
        error: 'تعذّر التحقق من هويتك. لا يمكن ربط الحساب إلا إذا طابق البريد المسجّل في حسابك البريد المعتمد لدى الموارد البشرية لهذا الموظف. تواصل مع الموارد البشرية لضبط بريد العمل.'
      }, { status: 403 });
    }

    // إن كان السجل مرتبطاً بحساب آخر → رفض
    if (emp.user_id && emp.user_id !== user.id) {
      return Response.json({ error: 'هذا السجل مرتبط بحساب آخر. تواصل مع الموارد البشرية.' }, { status: 409 });
    }
    // إن كان مرتبطاً بنفس المستخدم → لا شيء
    if (emp.user_id === user.id) {
      return Response.json({ ok: true, already_linked: true, employee_id: emp.id });
    }
    // ربط الحساب
    await base44.asServiceRole.entities.Employee.update(emp.id, { user_id: user.id });
    return Response.json({ ok: true, employee_id: emp.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}