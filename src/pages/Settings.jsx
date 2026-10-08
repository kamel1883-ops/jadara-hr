import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentOrgContext, invalidateCurrentOrg, ORG_DEFAULTS } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Image } from "@/components/ui/image";
import Time24Input from "@/components/ui/time24";
import { Loader2, Building2, Save, Crosshair, Wallet, Upload, UserCircle, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import WorkplaceMapPicker from "@/components/settings/WorkplaceMapPicker";
import NitaqatActivitySelect from "@/components/NitaqatActivitySelect";
import { NITAQAT_ACTIVITIES } from "@/lib/nitaqat";
import { cn } from "@/lib/utils";

const VALID_CODES = new Set(NITAQAT_ACTIVITIES.map((a) => a.code));
const normalizeActivity = (v) => (v && VALID_CODES.has(String(v)) ? String(v) : "10");

// ترتيب الأسبوع السعودي: السبت → الجمعة (أرقام getDay: 6=السبت ... 5=الجمعة)
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
const DAY_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_WORK_DAYS = "0,1,2,3,4,6"; // السبت–الخميس (الجمعة فقط إجازة)

const empty = { ...ORG_DEFAULTS, work_days: DEFAULT_WORK_DAYS };

export default function SettingsPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إعدادات المنشأة", subtitle: "بيانات المنشأة والسياسات المواردية", loading: "جارٍ التحميل...",
    secOrg: "بيانات المنشأة", secOrgNote: "مجلوبة من طلب عرض السعر / التفعيل — يمكنك تعديلها وستُحفظ لمنشأتك.",
    secSub: "بيانات الاشتراك — من عقد منشأتك", subCount: "عدد الموظفين المتعاقد عليه", subTier: "الشريحة", subPrice: "السعر السنوي للباقة (ر.س)", subStatus: "الحالة",
    name: "اسم المنشأة", industry: "القطاع / النشاط", responsible: "اسم الشخص المسؤول",
    nitaqatActivity: "النشاط لحساب نطاقات التوطين",
    nitaqatNote: "اختر النشاط المعتمد لدى مكتب العمل (من قائمة نطاقات المطور الـ41) بالبحث برمز النشاط أو باسمه، لتُحتسب نسبة التوطين وفق معادلة نطاقات المطور الرسمية.",
    nitaqatHint: "يُحتسب النطاق من العمالة النشطة فقط (سعوديين ومقيمين)، والنتيجة الرسمية على منصة قوى.",
    nitaqatLink: "عرض النطاقات",
    phone: "الهاتف", unified: "الرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7)", email: "البريد الإلكتروني",
    vat: "الرقم الضريبي", city: "المدينة",
    secLeave: "سياسات الإجازات والتذاكر", annualDays: "أيام الإجازة السنوية", ticketPolicy: "سياسة التذاكر",
    yearly: "سنوية", biennial: "كل سنتين", none: "بدون",
    secEos: "إعدادات نهاية الخدمة والتأمينات", eosBasis: "أساس حساب نهاية الخدمة",
    gross: "الراتب الإجمالي (أساسي + بدلات)", baseOnly: "الراتب الأساسي فقط",
    gosiEmp: "نسبة تأمين الموظف السعودي %", gosiErSa: "نسبة تأمين صاحب العمل (سعودي) %", gosiErEx: "نسبة تأمين صاحب العمل (مقيم) %",
    secAtt: "إعدادات الحضور والدوام", weekHours: "ساعات العمل الأسبوعية", weekDays: "عدد أيام العمل", grace: "سماح التأخير (دقيقة)",
    workDays: "أيام العمل الأسبوعية", workDaysHint: "الأيام غير المختارة تُعد إجازة أسبوعية — تُستخدم لحساب عطلات الأسبوع في الحضور وكشف الحضور.",
    weeklyOffTitle: "الإجازة الأسبوعية",
    dayStart: "بداية الدوام", dayEnd: "نهاية الدوام", dayHours: "ساعات العمل اليومية المطلوبة (تتخللها فترة راحة)",
    absType: "طريقة خصم الغياب", monthlyDiv: "الراتب الشهري ÷ 30 لليوم", dailyWage: "الأجر اليومي",
    secLoc: "موقع مقر العمل (للبصمة)", lat: "خط العرض", lng: "خط الطول", radius: "نطاق البصمة (متر)", capture: "تحديد موقعي الحالي",
    locNote: (r) => `سيُسمح للموظف بالبصمة فقط ضمن ${r || 50} متر من هذا الموقع.`,
    mapHint: "انقر على الخريطة أو اسحب الدبوس لتحديد موقع المقر بدقة — الدائرة تمثل نطاق البصمة المسموح.",
    logo: "شعار المنشأة", logoHint: "يظهر في بوابة الموظف والاعتمادات", uploading: "جارٍ الرفع...",
    changeLogo: "تغيير الشعار", chooseLogo: "اختيار صورة", logoEmpty: "لم يتم رفع شعار بعد",
    secAccount: "الصورة الشخصية للمسؤول", accountHint: "تظهر صورة الشخص المسؤول في تعريف المنشأة والشريط الجانبي",
    accountEmpty: "لم يتم رفع صورة بعد", changePhoto: "تغيير الصورة", choosePhoto: "اختيار صورة", photoUploading: "جارٍ رفع الصورة...",
    save: "حفظ الإعدادات",
    noGeo: "الجهاز لا يدعم تحديد الموقع", noAccess: "تعذر الوصول إلى موقعك",
  } : {
    title: "Organization settings", subtitle: "Organization data and HR policies", loading: "Loading...",
    secOrg: "Organization data", secOrgNote: "Pulled from your quote / activation request — edit to save them to your organization.",
    secSub: "Subscription data (from your contract)", subCount: "Contracted employees", subTier: "Tier", subPrice: "Annual package price (SAR)", subStatus: "Status",
    name: "Organization name", industry: "Sector / Activity", responsible: "Responsible person",
    nitaqatActivity: "Activity for Nitaqat calculation",
    nitaqatNote: "Pick the official MHRSD activity (one of the 41 Developed-Nitaqat activities) by searching its code or name, so Saudization is computed with the official Nitaqat Mutawar formula.",
    nitaqatHint: "The band is computed from active workforce only (Saudis & expats); the official result is on the Qiwa platform.",
    nitaqatLink: "View Nitaqat",
    phone: "Phone", unified: "National Unified Number (10 digits, starts with 7)", email: "Email",
    vat: "VAT number", city: "City",
    secLeave: "Leave & ticket policies", annualDays: "Annual leave days", ticketPolicy: "Ticket policy",
    yearly: "Yearly", biennial: "Biennial", none: "None",
    secEos: "EOS & GOSI settings", eosBasis: "EOS calculation basis",
    gross: "Gross salary (base + allowances)", baseOnly: "Base salary only",
    gosiEmp: "Saudi employee GOSI rate %", gosiErSa: "Employer GOSI (Saudi) %", gosiErEx: "Employer GOSI (Expat) %",
    secAtt: "Attendance & working time", weekHours: "Weekly working hours", weekDays: "Number of working days", grace: "Late grace (minutes)",
    workDays: "Weekly working days", workDaysHint: "Unselected days are treated as the weekly off — used to mark weekly holidays in attendance and the attendance report.",
    weeklyOffTitle: "Weekly off",
    dayStart: "Daily start time", dayEnd: "Daily end time", dayHours: "Required daily work hours (including a break period)",
    absType: "Absence deduction method", monthlyDiv: "Monthly salary ÷ 30 per day", dailyWage: "Daily wage",
    secLoc: "Workplace location (for check‑in)", lat: "Latitude", lng: "Longitude", radius: "Check‑in radius (m)", capture: "Set my current location",
    locNote: (r) => `Employees may check in only within ${r || 50} m of this location.`,
    mapHint: "Click the map or drag the pin to set the exact workplace — the circle shows the allowed check‑in radius.",
    logo: "Company logo", logoHint: "Shown in the employee & approvals portal", uploading: "Uploading...",
    changeLogo: "Change logo", chooseLogo: "Choose image", logoEmpty: "No logo uploaded yet",
    secAccount: "Responsible person photo", accountHint: "Shown in the establishment definition and the sidebar",
    accountEmpty: "No photo uploaded yet", changePhoto: "Change photo", choosePhoto: "Choose image", photoUploading: "Uploading photo...",
    save: "Save settings",
    noGeo: "Device does not support geolocation", noAccess: "Could not access your location",
  };

  const [org, setOrg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subInfo, setSubInfo] = useState(null);
  const [tenantUnified, setTenantUnified] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setAvatarUrl(u?.avatar_url || "")).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      // سجل إعدادات منشأة العميل نفسه فقط (بمطابقة الرقم الموحّد لمنشأته) — لا بيانات أي منشأة أخرى.
      const { tenant, unified, org } = await getCurrentOrgContext();
      const merged = { ...empty };
      // تعبئة تعريفية من سجل منشأة العميل، وسجل إعداداتها المحفوظ يتقدّم عليها
      if (tenant) {
        Object.entries({
          name: tenant.name, industry: tenant.industry, city: tenant.city,
          contact_name: tenant.contact_name, contact_phone: tenant.contact_phone,
          unified_number: tenant.unified_number, contact_email: tenant.contact_email,
          vat_number: tenant.vat_number, country: tenant.country,
        }).forEach(([k, v]) => { if (v) merged[k] = v; });
      }
      if (org) Object.entries(org).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") merged[k] = v; });
      merged.nitaqat_activity = normalizeActivity(merged.nitaqat_activity);
      setTenantUnified(unified);
      // بيانات الاشتراك: عقد منشأة العميل نفسها — تُعرض للقراءة فقط
      setSubInfo(tenant ? {
        employee_count: tenant.employee_count || 0,
        pricing_tier: tenant.pricing_tier || "",
        quoted_amount: tenant.quoted_amount || 0,
        status: tenant.status || "",
      } : null);
      setOrg(merged);
      setLoading(false);
    })();
  }, []);

  const set = (k, v) => setOrg((o) => ({ ...o, [k]: v }));

  const toggleWorkDay = (day) => {
    const cur = String(org.work_days || DEFAULT_WORK_DAYS)
      .split(",").map((x) => Number(x.trim())).filter((x) => !isNaN(x));
    const next = new Set(cur);
    if (next.has(day)) next.delete(day); else next.add(day);
    const sorted = [0, 1, 2, 3, 4, 5, 6].filter((d) => next.has(d));
    if (!sorted.length) return; // منع إلغاء كل الأيام
    set("work_days", sorted.join(","));
    set("work_week_days", sorted.length);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) { alert(t.noGeo); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { set("workplace_lat", Number(pos.coords.latitude.toFixed(6))); set("workplace_lng", Number(pos.coords.longitude.toFixed(6))); },
      () => alert(t.noAccess),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo_url", file_url);
    } catch (_) {} finally { setUploading(false); }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      setAvatarUrl(file_url);
    } catch (_) {} finally { setAvatarUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...org, nitaqat_activity: normalizeActivity(org.nitaqat_activity) };
      // ربط سجل الإعدادات بمنشأة العميل — يمنع تداخل السجلات بين الشركات
      payload.unified_number = String(payload.unified_number || "").trim() || tenantUnified;
      payload.workplace_lat = payload.workplace_lat === "" || payload.workplace_lat === null ? null : Number(payload.workplace_lat);
      payload.workplace_lng = payload.workplace_lng === "" || payload.workplace_lng === null ? null : Number(payload.workplace_lng);
      if (org.id) { await base44.entities.Organization.update(org.id, payload); }
      else { const created = await base44.entities.Organization.create(payload); setOrg({ ...org, ...created }); }
      invalidateCurrentOrg();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t.loading}</div>;

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <div className="max-w-3xl space-y-6">
        {subInfo && (subInfo.employee_count > 0 || subInfo.quoted_amount > 0) && (
          <Section title={t.secSub} icon={Wallet}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label={t.subCount}><div className="text-sm font-semibold px-3 py-2 rounded-md bg-muted">{subInfo.employee_count || "—"}</div></Field>
              <Field label={t.subTier}><div className="text-sm font-semibold px-3 py-2 rounded-md bg-muted truncate" title={subInfo.pricing_tier}>{subInfo.pricing_tier || "—"}</div></Field>
              <Field label={t.subPrice}><div className="text-sm font-semibold px-3 py-2 rounded-md bg-muted">{subInfo.quoted_amount ? subInfo.quoted_amount.toLocaleString() : "—"}</div></Field>
              <Field label={t.subStatus}><div className="text-sm font-semibold px-3 py-2 rounded-md bg-muted">{subInfo.status || "—"}</div></Field>
            </div>
          </Section>
        )}
        <Section title={t.secOrg} icon={Building2}>
          <p className="text-xs text-muted-foreground -mt-1">{t.secOrgNote}</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.name}><Input value={org.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label={t.industry}><Input value={org.industry} onChange={(e) => set("industry", e.target.value)} /></Field>
            <Field label={t.nitaqatActivity}>
              <NitaqatActivitySelect value={org.nitaqat_activity || "10"} onChange={(v) => set("nitaqat_activity", v)} placeholder={t.nitaqatActivity} />
            </Field>
            <Field label={t.city}><Input value={org.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label={t.responsible}><Input value={org.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
            <Field label={t.phone}><Input value={org.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} dir="ltr" /></Field>
            <Field label={t.unified}><Input value={org.unified_number} onChange={(e) => set("unified_number", e.target.value.replace(/\D/g, ""))} dir="ltr" /></Field>
            <Field label={t.email}><Input type="email" value={org.contact_email} onChange={(e) => set("contact_email", e.target.value)} dir="ltr" /></Field>
            <Field label={t.vat}><Input value={org.vat_number} onChange={(e) => set("vat_number", e.target.value)} dir="ltr" /></Field>
          </div>
          <div className="flex items-start gap-2 -mt-1 rounded-xl bg-violet-50 border border-violet-200 p-3">
            <Info size={16} className="text-violet-600 shrink-0 mt-0.5" />
            <div className="text-xs text-violet-800 leading-relaxed">
              <span className="font-semibold">{t.nitaqatActivity}: </span>{t.nitaqatNote}
              <span className="block text-violet-600 mt-1">{t.nitaqatHint}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="w-20 h-20 rounded-xl border border-input bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
              {org.logo_url ? <Image src={org.logo_url} fittingType="fit" className="w-full h-full" /> : <Building2 size={28} className="text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <Label className="text-xs font-medium text-muted-foreground">{t.logo}</Label>
              <p className="text-xs text-muted-foreground mb-2">{org.logo_url ? t.logoHint : t.logoEmpty}</p>
              <label className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md border border-input bg-transparent hover:bg-accent cursor-pointer">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? t.uploading : (org.logo_url ? t.changeLogo : t.chooseLogo)}
                <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} disabled={uploading} />
              </label>
            </div>
          </div>
        </Section>

        <Card>
          <SectionTitle title={t.secLeave} />
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.annualDays}>
              <MobileSelect value={String(org.annual_leave_days === 30 ? 30 : 21)} onValueChange={(v) => set("annual_leave_days", Number(v))} placeholder={t.annualDays}>
                <MobileSelectItem value="21">21 {isAr ? "يوم" : "days"}</MobileSelectItem>
                <MobileSelectItem value="30">30 {isAr ? "يوم" : "days"}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.ticketPolicy}>
              <MobileSelect value={org.ticket_policy} onValueChange={(v) => set("ticket_policy", v)} placeholder={t.ticketPolicy}>
                <MobileSelectItem value="yearly">{t.yearly}</MobileSelectItem>
                <MobileSelectItem value="biennial">{t.biennial}</MobileSelectItem>
                <MobileSelectItem value="none">{t.none}</MobileSelectItem>
              </MobileSelect>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle title={t.secEos} />
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.eosBasis}>
              <MobileSelect value={org.eos_basis} onValueChange={(v) => set("eos_basis", v)} placeholder={t.eosBasis}>
                <MobileSelectItem value="gross">{t.gross}</MobileSelectItem>
                <MobileSelectItem value="base_only">{t.baseOnly}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.gosiEmp}><Input type="number" step="0.01" value={org.gosi_saudi_employee_rate} onChange={(e) => set("gosi_saudi_employee_rate", Number(e.target.value))} /></Field>
            <Field label={t.gosiErSa}><Input type="number" step="0.01" value={org.gosi_saudi_employer_rate} onChange={(e) => set("gosi_saudi_employer_rate", Number(e.target.value))} /></Field>
            <Field label={t.gosiErEx}><Input type="number" step="0.01" value={org.gosi_expat_employer_rate} onChange={(e) => set("gosi_expat_employer_rate", Number(e.target.value))} /></Field>
          </div>
        </Card>

        <Card>
          <SectionTitle title={t.secAtt} />
          <div className="grid grid-cols-3 gap-4">
            <Field label={t.weekHours}><Input type="number" value={org.work_week_hours} onChange={(e) => set("work_week_hours", Number(e.target.value))} /></Field>
            <Field label={t.weekDays}><div className="text-sm font-semibold px-3 py-2 rounded-md bg-muted tabular-nums">{org.work_week_days || 0} {isAr ? "أيام" : "days"}</div></Field>
            <Field label={t.grace}><Input type="number" value={org.late_grace_minutes} onChange={(e) => set("late_grace_minutes", Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-1 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.workDays}</Label>
              <div className="flex flex-wrap gap-2">
                {WEEK_ORDER.map((d) => {
                  const cur = String(org.work_days || DEFAULT_WORK_DAYS)
                    .split(",").map((x) => Number(x.trim())).filter((x) => !isNaN(x));
                  const active = cur.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWorkDay(d)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium border transition",
                        active
                          ? "bg-[#2e2448] text-white border-[#2e2448] shadow"
                          : "bg-white text-muted-foreground border-input hover:bg-accent"
                      )}
                    >
                      {isAr ? DAY_AR[d] : DAY_EN[d]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t.workDaysHint}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Field label={t.dayStart}><Time24Input value={org.work_start_time || ""} onChange={(v) => set("work_start_time", v)} /></Field>
            <Field label={t.dayEnd}><Time24Input value={org.work_end_time || ""} onChange={(v) => set("work_end_time", v)} /></Field>
            <Field label={t.dayHours}><Input type="number" step="0.1" value={org.work_hours_per_day} onChange={(e) => set("work_hours_per_day", Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-1 mt-4">
            <Field label={t.absType}>
              <MobileSelect value={org.absence_deduction_type} onValueChange={(v) => set("absence_deduction_type", v)} placeholder={t.absType}>
                <MobileSelectItem value="monthly_divided">{t.monthlyDiv}</MobileSelectItem>
                <MobileSelectItem value="daily_wage">{t.dailyWage}</MobileSelectItem>
              </MobileSelect>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle title={t.secLoc} />
          <div className="grid grid-cols-3 gap-4">
            <Field label={t.lat}><Input type="number" step="any" value={org.workplace_lat} onChange={(e) => set("workplace_lat", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
            <Field label={t.lng}><Input type="number" step="any" value={org.workplace_lng} onChange={(e) => set("workplace_lng", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
            <Field label={t.radius}><Input type="number" value={org.workplace_radius} onChange={(e) => set("workplace_radius", Number(e.target.value))} /></Field>
          </div>
          <Button type="button" variant="outline" onClick={captureLocation} className="gap-2"><Crosshair size={16} /> {t.capture}</Button>
          <WorkplaceMapPicker
            lat={org.workplace_lat}
            lng={org.workplace_lng}
            radius={org.workplace_radius}
            onChange={(la, ln) => { set("workplace_lat", la); set("workplace_lng", ln); }}
            hint={t.mapHint}
          />
          <p className="text-xs text-muted-foreground">{t.locNote(org.workplace_radius)}</p>
        </Card>

        <Section title={t.secAccount} icon={UserCircle}>
          <p className="text-xs text-muted-foreground -mt-1">{t.accountHint}</p>
          <div className="flex items-center gap-4 pt-1">
            <div className="w-20 h-20 rounded-full border border-input bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? <Image src={avatarUrl} fittingType="fill" className="w-full h-full" /> : <UserCircle size={34} className="text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <Label className="text-xs font-medium text-muted-foreground">{t.responsible}</Label>
              <p className="text-xs text-muted-foreground mb-2">{avatarUrl ? t.accountHint : t.accountEmpty}</p>
              <label className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md border border-input bg-transparent hover:bg-accent cursor-pointer">
                {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {avatarUploading ? t.photoUploading : (avatarUrl ? t.changePhoto : t.choosePhoto)}
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={avatarUploading} />
              </label>
            </div>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ children }) { return <div className="bg-card rounded-2xl border border-border p-5 space-y-4">{children}</div>; }
function SectionTitle({ title }) { return <h3 className="font-semibold text-foreground">{title}</h3>; }
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-[#2e2448]/10 flex items-center justify-center text-[#2e2448]">{Icon && <Icon size={18} />}</span><h3 className="font-semibold text-foreground">{title}</h3></div>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (<div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>);
}