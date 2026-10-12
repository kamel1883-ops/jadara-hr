import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crown, Printer } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => new Date().toISOString().slice(0, 10);
const genInvNum = () => {
  const d = new Date();
  return `INV-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
};

function Stamp() {
  return (
    <svg viewBox="0 0 140 140" width="128" height="128" style={{ transform: "rotate(-8deg)" }}>
      <defs>
        <path id="stampArc" d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" />
      </defs>
      <circle cx="70" cy="70" r="62" fill="none" stroke="#1d3a5f" strokeWidth="3" />
      <circle cx="70" cy="70" r="50" fill="none" stroke="#1d3a5f" strokeWidth="1.5" />
      <text fontSize="7" fill="#1d3a5f" letterSpacing="1.5">
        <textPath href="#stampArc" startOffset="3%">JADARA · HR PLATFORM · SAUDI ARABIA · </textPath>
      </text>
      <text x="70" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1d3a5f" fontFamily="var(--font-display)">جداره</text>
      <text x="70" y="78" textAnchor="middle" fontSize="8" fill="#1d3a5f">لإدارة الموارد البشرية</text>
      <path d="M30 90 H 110" stroke="#1d3a5f" strokeWidth="0.8" />
      <text x="70" y="103" textAnchor="middle" fontSize="7" fill="#1d3a5f">وثيقة رسمية</text>
    </svg>
  );
}

export default function InvoiceDialog({ open, onClose, tenant, subs, isAr }) {
  const sub = useMemo(() => {
    if (!tenant || !subs) return null;
    const list = subs
      .filter((s) => s.tenant_id === tenant.id)
      .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
    return list[0] || null;
  }, [tenant, subs]);

  const [f, setF] = useState(null);
  const [invNum] = useState(genInvNum);

  useEffect(() => {
    if (!tenant) return;
    setF({
      name: tenant.name || "",
      unified_number: tenant.unified_number || "",
      contact_name: tenant.contact_name || "",
      contact_phone: tenant.contact_phone || "",
      contact_email: tenant.contact_email || "",
      city: tenant.city || "",
      plan: sub?.plan === "monthly" ? (isAr ? "اشتراك شهري" : "Monthly subscription") : (isAr ? "اشتراك سنوي" : "Annual subscription"),
      pricing_tier: tenant.pricing_tier || (isAr ? "باقة جداره السنوية" : "Jadara annual plan"),
      employee_count: tenant.employee_count || 0,
      period_start: sub?.period_start || todayISO(),
      period_end: sub?.period_end || "",
      amount: sub?.amount || 2500,
    });
  }, [tenant, sub, isAr]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const today = todayISO();
  const sar = isAr ? "ر.س" : "SAR";
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(invNum)}&scale=2&height=8&alttext=${encodeURIComponent(invNum)}`;

  const F = isAr ? {
    title: "إنشاء فاتورة", pul: "تُجلب بيانات العميل تلقائياً — راجعها وعدّلها ثم اطبع",
    name: "اسم المنشأة", unified: "الرقم الوطني الموحد للمنشآت", contact: "جهة الاتصال",
    phone: "الهاتف", email: "البريد", city: "المدينة", plan: "الباقة",
    empCount: "عدد الموظفين", pricePer: "سعر الباقة",
    pstart: "بداية الاشتراك", pend: "نهاية الاشتراك", amount: "المبلغ (ر.س)",
    print: "طباعة / حفظ PDF", close: "إغلاق",
    docTitle: "فاتورة", billedTo: "فاتورة إلى", desc: "الوصف", period: "الفترة",
    amt: "المبلغ", total: "الإجمالي", subFrom: "من", subTo: "إلى",
    contactFoot: "للاستفسار", subLine: "باقة جداره السنوية للمنصة",
  } : {
    title: "Create invoice", pul: "Client data is pulled automatically — review, edit, then print",
    name: "Company name", unified: "National Unified Number", contact: "Contact",
    phone: "Phone", email: "Email", city: "City", plan: "Plan",
    empCount: "Employees", pricePer: "Plan price",
    pstart: "Start date", pend: "End date", amount: "Amount (SAR)",
    print: "Print / Save PDF", close: "Close",
    docTitle: "Invoice", billedTo: "Billed to", desc: "Description", period: "Period",
    amt: "Amount", total: "Total", subFrom: "From", subTo: "To",
    contactFoot: "Inquiries", subLine: "Jadara annual platform plan",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{F.title}</DialogTitle></DialogHeader>

        {tenant && f ? (
          <div className="space-y-4">
            <div className="no-print text-xs text-muted-foreground bg-slate-50 border border-border rounded-lg p-2.5">{F.pul}</div>

            {/* تأكيد/تعديل بيانات العميل */}
            <div className="no-print grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Inp label={F.name} value={f.name} onChange={(v) => set("name", v)} />
              <Inp label={F.unified} value={f.unified_number} onChange={(v) => set("unified_number", v)} />
              <Inp label={F.contact} value={f.contact_name} onChange={(v) => set("contact_name", v)} />
              <Inp label={F.phone} value={f.contact_phone} onChange={(v) => set("contact_phone", v)} />
              <Inp label={F.email} value={f.contact_email} onChange={(v) => set("contact_email", v)} />
              <Inp label={F.city} value={f.city} onChange={(v) => set("city", v)} />
              <Inp label={F.plan} value={f.plan} onChange={(v) => set("plan", v)} />
              <Inp label={F.empCount} value={f.employee_count} onChange={(v) => set("employee_count", Number(v) || 0)} type="number" />
              <Inp label={F.amount} value={f.amount} onChange={(v) => set("amount", Number(v) || 0)} type="number" />
              <Inp label={F.pstart} value={f.period_start} onChange={(v) => set("period_start", v)} type="date" />
              <Inp label={F.pend} value={f.period_end} onChange={(v) => set("period_end", v)} type="date" />
            </div>

            <div className="no-print flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>{F.close}</Button>
              <Button onClick={() => window.print()} className="gap-1.5"><Printer size={16} /> {F.print}</Button>
            </div>

            {/* الفاتورة القابلة للطباعة */}
            <div className="print-invoice bg-white text-slate-900 rounded-xl border border-slate-200 p-8 mx-auto" style={{ maxWidth: "780px" }} dir={isAr ? "rtl" : "ltr"}>
              {/* رأس الفاتورة */}
              <div className="flex items-start justify-between border-b-2 border-slate-300 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#2d234a", boxShadow: "0 0 0 1px rgba(197,160,89,.35)" }}>
                    <Crown size={22} strokeWidth={1.8} style={{ color: "#c5a059" }} />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-[#1d3a5f]">جداره</div>
                    <div className="text-[10px] text-slate-500">{isAr ? "لإدارة الموارد البشرية" : "HR Platform"} · jadara-hr.com</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xl font-extrabold tracking-tight">{F.docTitle}</div>
                  <div className="text-xs text-slate-600 mt-1">{isAr ? "رقم الفاتورة" : "Invoice No."}: <b className="text-slate-900">{invNum}</b></div>
                  <div className="text-xs text-slate-600">{isAr ? "التاريخ" : "Date"}: <b className="text-slate-900"> {today}</b></div>
                </div>
              </div>

              {/* الباركود */}
              <div className="flex flex-col items-center my-4">
                <img src={barcodeUrl} alt={invNum} className="h-12" />
                <div className="text-[10px] text-slate-500 mt-1">{invNum}</div>
              </div>

              {/* بيانات العميل — كاملة بمسميات واضحة */}
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 mb-4 break-inside-avoid">
                <div className="text-xs font-semibold text-slate-500 mb-2">{F.billedTo}</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm break-inside-avoid">
                  <Row lbl={F.name} val={f.name} bold />
                  <Row lbl={F.unified} val={f.unified_number} />
                  <Row lbl={F.contact} val={f.contact_name} />
                  <Row lbl={F.phone} val={f.contact_phone} ltr />
                  <Row lbl={F.email} val={f.contact_email} ltr />
                  <Row lbl={F.city} val={f.city} />
                  <Row lbl={F.empCount} val={String(f.employee_count || 0)} bold />
                  <Row lbl={F.plan} val={f.plan} bold />
                </div>
              </div>

              {/* ملخص الاشتراك */}
              <div className="border border-slate-300 rounded-lg p-3 mb-4 break-inside-avoid text-sm">
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                  <Row lbl={F.pstart} val={f.period_start} />
                  <Row lbl={F.pend} val={f.period_end} />
                  <Row lbl={F.pricePer} val={`${Number(f.amount).toLocaleString()} ${sar}`} bold accent />
                </div>
              </div>

              {/* جدول البنود */}
              <table className="w-full text-sm border border-slate-300 mb-4 break-inside-avoid">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-right p-2 border-b border-slate-300">{F.desc}</th>
                    <th className="text-right p-2 border-b border-slate-300">{F.period}</th>
                    <th className="text-right p-2 border-b border-slate-300">{F.amt}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b border-slate-200 break-words">{f.plan} — {F.subLine}</td>
                    <td className="p-2 border-b border-slate-200 whitespace-nowrap">{F.subFrom} {f.period_start} {F.subTo} {f.period_end || "—"}</td>
                    <td className="p-2 border-b border-slate-200 font-semibold whitespace-nowrap">{Number(f.amount).toLocaleString()} {sar}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="p-2 text-left font-bold text-slate-800">{F.total}</td>
                    <td className="p-2 font-extrabold text-base text-[#1d3a5f] whitespace-nowrap">{Number(f.amount).toLocaleString()} {sar}</td>
                  </tr>
                </tbody>
              </table>

              {/* التذييل */}
              <div className="flex items-end justify-between break-inside-avoid">
                <div className="text-xs text-slate-500 leading-relaxed">
                  <div className="font-semibold text-slate-700">{F.contactFoot}</div>
                  <div dir="ltr">WhatsApp: +966 594700782</div>
                  <div dir="ltr">info@jadara-hr.com</div>
                </div>
                <div className="flex flex-col items-center">
                  <Stamp />
                  <div className="text-[10px] text-slate-400 mt-1">jadara-hr.com</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{F.close}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Inp({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ lbl, val, bold, ltr, accent }) {
  const text = val && String(val).trim() !== "" ? val : "—";
  return (
    <div className="flex flex-col min-w-0 break-inside-avoid">
      <span className="text-[11px] text-slate-500">{lbl}</span>
      <span
        className={["break-words min-w-0", bold ? "font-bold" : "", accent ? "text-[#1d3a5f]" : "text-slate-700"].join(" ")}
        dir={ltr ? "ltr" : undefined}
      >
        {text}
      </span>
    </div>
  );
}