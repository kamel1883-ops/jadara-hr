import React from "react";
import { Crown } from "lucide-react";
import { FULL_FEATURES_AR, FULL_FEATURES_EN } from "@/lib/pricing";
import StampSeal from "@/components/docs/StampSeal";
import { PROVIDER, PROVIDER_BANK, IBAN_CERT_URL } from "@/lib/providerIdentity";
import { computeBreakdown } from "@/lib/pricingBreakdown";

const SUPPORT_EMAIL = "info@jadara-hr.com";

// نسخة عرض السعر القابلة للطباعة PDF — مطابقة لما رآه العميل في صفحة عرض السعر.
// تُولَّد من بيانات المنشأة (Tenant) المُرسلة من لدن العميل عند طلب عرض السعر.
// يستخدمها المالك لتنزيل نسخة من عرض السعر المُقدَّم للعميل.
export default function QuoteDoc({
  company = {},
  quoteNo = "",
  date = "",
  tier = null,
  amount = 0,
  discountPercent = 0,
  discountCode = "",
  isAr = true,
}) {
  const cDate = date || new Date().toISOString().slice(0, 10);
  const basePrice = tier ? Number(tier.yearly) || 0 : (discountPercent > 0 && amount ? Math.round(amount / (1 - discountPercent / 100)) : 0);
  const finalAmount = Number(amount) || (tier ? Number(tier.yearly) : 0);
  const hasDiscount = discountPercent > 0 && discountCode;
  const bd = computeBreakdown({ tier, quotedAmount: finalAmount, discountPercent, discountCode });
  const feats = isAr ? FULL_FEATURES_AR : FULL_FEATURES_EN;
  const L = isAr
    ? {
        pageTitle: "عرض سعر — الاشتراك السنوي",
        quoteNo: "رقم العرض", date: "التاريخ", to: "إلى",
        company: "اسم المنشأة", industry: "القطاع - النشاط", city: "المدينة",
        contact: "الشخص المسؤول", phone: "الهاتف", email: "البريد الإلكتروني",
        unified: "الرقم الوطني الموحد للمنشآت", empCount: "عدد الموظفين",
        planTitle: "الاشتراك السنوي - منصة جداره",
        planDesc: "باقة واحدة متكاملة تشمل كل ميزات المنصة:", includes: "تشمل الباقة:",
        planTier: "شريحة الاشتراك", annual: "ريال",
        renewNote: "يتجدد الاشتراك سنوياً بنفس قيمة شريحتك حسب عدد الموظفين وقت التجديد.",
        transferTitle: "تفعيل الاشتراك عبر التحويل البنكي",
        transferNote: "حول المبلغ الموضّح أعلاه إلى حسابنا البنكي في بنك STC، ثم أرسل صورة إيصال التحويل عبر البريد الإلكتروني إلى info@jadara-hr.com. سيتم تأكيد اشتراكك وتفعيل الحساب خلال 24 ساعة.",
        bankSection: "بيانات التحويل البنكي",
        beneficiary: "اسم المستفيد", bank: "البنك", accountNo: "رقم الحساب", iban: "رقم الآيبان IBAN",
        amountDue: "المبلغ المستحق للسنة الأولى",
        waSupport: "الدعم الفني - البريد الإلكتروني", sendReceipt: "أرسل إيصال التحويل إلى info@jadara-hr.com لتفعيل الحساب",
        openWhatsApp: "مراسلة عبر البريد",
        beforeDiscLabel: "القيمة الإجمالية قبل الخصم",
        discBadge: "نسبة الخصم", discApplied: "قيمة الخصم المُخصومة",
        netAnnualLabel: "المبلغ بعد الخصم", setupLabel: "رسوم التأسيس (لمرة واحدة)", year1Label: "إجمالي السنة الأولى", byAgreement: "حسب الاتفاق",
        sigName: `${PROVIDER.signerLabel} - ${PROVIDER.signerName}`,
        validityNote: "صلاحية هذا العرض 48 ساعة من تاريخ الإصدار.",
      }
    : {
        pageTitle: "Quotation — Annual Subscription",
        quoteNo: "Quote no.", date: "Date", to: "To",
        company: "Company name", industry: "Sector - Activity", city: "City",
        contact: "Responsible person", phone: "Phone", email: "Email",
        unified: "National Unified Number", empCount: "Expected employees",
        planTitle: "Annual Subscription - Jadara Platform",
        planDesc: "One integrated package including every feature of the platform:", includes: "The package includes:",
        planTier: "Subscription tier", annual: "SAR",
        renewNote: "The subscription renews annually at your tier's value based on headcount at renewal.",
        transferTitle: "Activate the subscription via bank transfer",
        transferNote: "Transfer the amount shown above to our STC Bank account, then send the transfer receipt photo via email to info@jadara-hr.com. Your subscription will be confirmed and account activated within 24 hours.",
        bankSection: "Bank transfer details",
        beneficiary: "Beneficiary", bank: "Bank", accountNo: "Account number", iban: "IBAN",
        amountDue: "Amount due for year 1",
        waSupport: "Support Email", sendReceipt: "Send the transfer receipt to info@jadara-hr.com to activate your account",
        openWhatsApp: "Email us",
        beforeDiscLabel: "Total before discount",
        discBadge: "Discount rate", discApplied: "Deducted discount value",
        netAnnualLabel: "Amount after discount", setupLabel: "Setup fee (one-time)", year1Label: "Year 1 total", byAgreement: "By agreement",
        sigName: `${PROVIDER.signerLabelEn} - ${PROVIDER.signerNameEn}`,
        validityNote: "This quotation is valid for 48 hours from the issue date.",
      };

  const v = (x) => (x == null || String(x).trim() === "" ? "—" : x);
  const num = (n) => Number(n || 0).toLocaleString();

  return (
    <div dir="rtl" style={{ width: 794, minHeight: 1123, background: "#fff", color: "#0f172a", fontFamily: "var(--font-display), Tajawal, IBM Plex Sans Arabic, sans-serif", padding: "40px 44px", boxSizing: "border-box", fontSize: 13, lineHeight: 1.85 }}>
      {/* عنوان العرض */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>{L.pageTitle}</div>
        <div style={{ textAlign: "left", fontSize: 12, lineHeight: 1.7 }}>
          <div>{L.quoteNo}: <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{quoteNo || "—"}</span></div>
          <div>{L.date}: {cDate}</div>
        </div>
      </div>

      {/* رأس هوية المنشأة — مطابق لعقد الاشتراك */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 18, borderBottom: "2px solid #0b1120", marginBottom: 22 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#0b0f19,#2e2448)", boxShadow: "0 0 0 1px rgba(252,211,77,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Crown size={26} strokeWidth={1.8} style={{ color: "#fbbf24" }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-display)" }}>جداره</div>
          <div style={{ fontSize: 11, color: "#666" }}>لإدارة الموارد البشرية</div>
          <div style={{ fontWeight: 700, fontSize: 11.5, color: "#0b1120", marginTop: 3 }}>{PROVIDER.institutionName}</div>
          <div style={{ fontSize: 10, color: "#666" }}>الرقم الموحّد: <span style={{ fontFamily: "ui-monospace, monospace" }}>{PROVIDER.unifiedNumber}</span></div>
        </div>
      </div>

      {/* إلى (بيانات المنشأة) */}
      <div style={{ paddingTop: 22, paddingBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 8 }}>{L.to}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", fontSize: 12.5, lineHeight: 1.8 }}>
          <KV k={L.company} vv={v(company?.name)} bold />
          <KV k={L.industry} vv={v(company?.industry)} />
          <KV k={L.city} vv={v(company?.city)} />
          <KV k={L.contact} vv={v(company?.contact_name)} />
          <KV k={L.phone} vv={v(company?.contact_phone)} ltr />
          <KV k={L.email} vv={v(company?.contact_email)} ltr />
          <KV k={L.unified} vv={v(company?.unified_number)} mono />
          <KV k={L.empCount} vv={company?.employee_count ? String(company.employee_count) : "—"} bold />
        </div>
      </div>

      {/* الباقة والمميزات */}
      <div style={{ paddingTop: 22, paddingBottom: 22, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{L.planTitle}</div>
        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 14 }}>{L.planDesc}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 8 }}>{L.includes}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 22px", fontSize: 12, lineHeight: 1.7 }}>
          {feats.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8E24AA", flexShrink: 0 }} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* الأسعار */}
      <div style={{ paddingTop: 22, paddingBottom: 22, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ border: "1px solid #ddd6fe", background: "#faf5ff", borderRadius: 16, padding: 18 }}>
          {/* رأس الباقة */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid #ddd6fe" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{tier && tier.tier ? tier.tier : L.planTier}</div>
              {tier && tier.range ? <div style={{ fontSize: 11, color: "#64748b" }}>{tier.range}</div> : null}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{company?.employee_count ? `${company.employee_count} ${isAr ? "موظفاً" : "employees"}` : ""}</div>
          </div>

          {/* ١) القيمة الإجمالية قبل الخصم */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{L.beforeDiscLabel}</div>
            <div style={{ fontSize: hasDiscount ? 16 : 24, fontWeight: 800, color: "#7c3aed", textDecoration: hasDiscount ? "line-through" : "none" }}>
              {num(bd.baseAnnual)} {L.annual}
            </div>
          </div>

          {/* ٢) نسبة الخصم وقيمته */}
          {hasDiscount && (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid #ddd6fe" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{L.discBadge} {bd.discountPercent}%{bd.discountCode ? ` — ${bd.discountCode}` : ""}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{L.discApplied}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>- {num(bd.discountAmount)} {L.annual}</div>
            </div>
          )}

          {/* ٣) المبلغ بعد الخصم = المبلغ المطلوب للسنة الأولى */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1.5px solid #c4b5fd", background: "#ede9fe", borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#5b21b6" }}>{L.netAnnualLabel} ({L.year1Label})</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#5b21b6" }}>{num(bd.finalAnnual)} {L.annual}</div>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 12, paddingTop: 10, borderTop: "1px solid #ddd6fe" }}>{L.renewNote}</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px", marginTop: 10 }}>
            {L.validityNote}
          </div>
        </div>
      </div>

      {/* تفعيل الاشتراك عبر التحويل البنكي */}
      <div style={{ paddingTop: 22, paddingBottom: 22, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#047857", fontSize: 17, marginBottom: 6 }}>{L.transferTitle}</div>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#065f46" }}>{L.transferNote}</p>

          {/* المبلغ المستحق */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(255,255,255,0.7)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "10px 16px", fontSize: 12.5, marginBottom: 14 }}>
            <span style={{ color: "#64748b" }}>{L.amountDue}</span>
            <span style={{ fontWeight: 800, color: "#047857", fontSize: 22 }}>{num(bd.totalYear1)} {L.annual}</span>
          </div>

          {/* بيانات البنك */}
          <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid #ddd6fe", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "#7c3aed", marginBottom: 10, fontSize: 12.5 }}>{L.bankSection}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 28px", fontSize: 12.5, lineHeight: 1.8 }}>
              <KV k={L.beneficiary} vv={isAr ? PROVIDER_BANK.beneficiaryAr : PROVIDER_BANK.beneficiaryEn} />
              <KV k={L.bank} vv={isAr ? PROVIDER_BANK.bankAr : PROVIDER_BANK.bankEn} />
              <KV k={L.accountNo} vv={PROVIDER_BANK.account} mono />
              <KV k={L.iban} vv={PROVIDER_BANK.iban} mono bold />
            </div>
          </div>

          {/* البريد الإلكتروني للدعم */}
          <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: "#5b21b6" }}>{L.waSupport}</div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 16, marginTop: 2, direction: "ltr", unicodeBidi: "embed" }}>{SUPPORT_EMAIL}</div>
              <div style={{ fontSize: 12, color: "#5b21b6", marginTop: 2 }}>{L.sendReceipt}</div>
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ background: "#7c3aed", color: "#fff", fontWeight: 700, borderRadius: 14, padding: "8px 16px", fontSize: 12.5, textDecoration: "none" }}>{L.openWhatsApp}</a>
          </div>
        </div>
      </div>

      {/* التوقيع والختم */}
      <div style={{ paddingTop: 28, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 76, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8" }}>مساحة التوقيع</div>
          <div style={{ borderTop: "1px solid #94a3b8", paddingTop: 6, fontSize: 12, fontWeight: 700, minWidth: 220 }}>{L.sigName}</div>
        </div>
        <StampSeal size={150} />
      </div>

      {/* الصفحة الثانية — شهادة الآيبان الرسمية للمنشأة المُوفِّرة */}
      <div style={{ marginTop: 48, paddingTop: 30, borderTop: "1px dashed #cbd5e1", minHeight: 1010, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0b1120", marginBottom: 4 }}>شهادة رقم الآيبان IBAN - {PROVIDER.institutionName}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 18 }}>الرقم الوطني الموحد للمنشأة: <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{PROVIDER.unifiedNumber}</span> · {PROVIDER_BANK.bankAr}</div>
        <img src={IBAN_CERT_URL} crossOrigin="anonymous" alt="شهادة الآيبان" style={{ maxWidth: 580, width: "100%", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 4px 18px -8px rgba(16,24,40,.18)" }} />
        <div style={{ marginTop: 16, fontSize: 11.5, color: "#475569", textAlign: "center", lineHeight: 1.9, maxWidth: 560 }}>
          <div><b>المستفيد:</b> {PROVIDER_BANK.beneficiaryAr} · <b>رقم الحساب:</b> <span style={{ fontFamily: "ui-monospace, monospace" }}>{PROVIDER_BANK.account}</span></div>
          <div><b>الآيبان IBAN:</b> <span style={{ fontFamily: "ui-monospace, monospace" }}>{PROVIDER_BANK.iban}</span></div>
          <div style={{ color: "#94a3b8", fontSize: 10.5, marginTop: 6 }}>شهادة رسمية صادرة عن بنك إس تي سي تُثبت ملكية حساب المنشأة لغايات التحويل البنكي لتفعيل الاشتراك.</div>
        </div>
      </div>
    </div>
  );
}

function KV({ k, vv, bold, mono, ltr }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
      <span style={{ color: "#64748b", flexShrink: 0 }}>{k}:</span>
      <span style={{
        fontWeight: bold ? 800 : 600,
        color: "#0b1120",
        fontFamily: mono ? "ui-monospace, monospace" : undefined,
        direction: ltr ? "ltr" : undefined,
        unicodeBidi: ltr ? "embed" : undefined,
        wordBreak: "break-word",
      }}>{vv}</span>
    </div>
  );
}