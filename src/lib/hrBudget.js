// محرّك ميزانية الموارد البشرية السنوية.
//
// القاعدة: كل ريال يُصرف على الموظف يظهر في بند واضح، والبنود المرتبطة بالموظفين
// تُحسب تلقائياً من سجلات المنشأة الحالية (الرواتب، التأمينات، الإقامات، المركبات،
// اشتراكات المنصات)، بينما بنود التكاليف غير المحسوبة آلياً (تدريب، توظيف، سكن...)
// تُدخل مرة واحدة فتُحدَّث الميزانية فوراً.
//
// نسب التأمينات تُشتق من نفس محرك النظام (eos.js) فلا يوجد نسخ يدوي للنسب:
// • سعودي سجّل قبل 3 يوليو 2024: 11.75% صاحب عمل
// • سعودي من 3 يوليو 2024 فصاعداً: 12.75% صاحب عمل (النسب السارية من يوليو 2026)
// • مقيم: 2% مخاطر مهنية على صاحب العمل فقط
//
// مكافأة نهاية الخدمة تُخصم كمخصص سنوي بنفس قواعد مكتب العمل (مادة 84):
// نصف شهر عن كل سنة لأول 5 سنوات، وشهر كامل عن كل سنة بعدها — على أساس
// مطابقة حاسبة نهاية الخدمة في قوى.
import { gosiRates, eosSalaryBasis, computeYearsOfService, todayISO } from "@/lib/eos";

// ============================================================
// البنود — لكل بند: مفتاح، اسم عربي/إنجليزي، مصدر القيمة
// source: "auto" يُحسب من بيانات المنشأة | "input" يُدخل يدوياً | "auto_plus_input"
// ============================================================

export const BUDGET_CATEGORIES = [
  {
    key: "salaries",
    ar: "الرواتب والبدلات", en: "Salaries & Allowances",
    items: [
      { key: "salaries_basic", ar: "الرواتب الأساسية + البدلات (من الموظفين النشطين)", en: "Basic salaries + allowances (from active employees)", source: "auto" },
      { key: "salaries_overtime", ar: "العمل الإضافي (إدخال سنوي)", en: "Overtime (annual input)", source: "input" },
      { key: "salaries_incentives", ar: "الحوافز والمكافآت والعمولات (إدخال سنوي)", en: "Incentives, bonuses & commissions (annual input)", source: "input" },
      { key: "salaries_raise", ar: "مخصص الزيادات السنوية (نسبة من الرواتب)", en: "Annual raises provision (% of salaries)", source: "input" },
    ],
  },
  {
    key: "gosi",
    ar: "التأمينات الاجتماعية", en: "Social Insurance (GOSI)",
    items: [
      { key: "gosi_employer", ar: "حصة صاحب العمل — سعوديون (11.75% / 12.75% حسب تاريخ التسجيل)", en: "Employer share — Saudis (11.75% / 12.75% by registration date)", source: "auto" },
      { key: "gosi_expat", ar: "حصة صاحب العمل — مقيمون (2% مخاطر مهنية)", en: "Employer share — expats (2% occupational hazards)", source: "auto" },
      { key: "gosi_reserve", ar: "احتياطي فروقات/غرامات إقرار (نسبة)", en: "GOSI differences/declarations reserve (%)", source: "input" },
    ],
  },
  {
    key: "medical",
    ar: "التأمين الطبي", en: "Medical Insurance",
    items: [
      { key: "medical_employees", ar: "قسط التأمين الطبي للموظفين (سنوي × العمالة)", en: "Employee medical premium (annual × headcount)", source: "auto_plus_input" },
      { key: "medical_dependents", ar: "قسط التأمين الطبي للتابعين", en: "Dependents medical premium", source: "auto_plus_input" },
      { key: "medical_upgrade", ar: "فروقات ترقية التغطية/أمراض مزمنة", en: "Coverage upgrades / chronic conditions", source: "input" },
      { key: "medical_renewal", ar: "احتياطي زيادة أسعار تجديد الوثيقة (نسبة)", en: "Renewal price-increase reserve (%)", source: "input" },
    ],
  },
  {
    key: "iqama",
    ar: "الإقامة ورسوم الجوازات والرخص", en: "Iqama, Visas & Work Permits",
    items: [
      { key: "iqama_renewal", ar: "تجديد إقامات المقيمين (650 ر.س سنوياً × المقيمون)", en: "Iqama renewals (SAR 650/yr × expats)", source: "auto" },
      { key: "iqama_permit", ar: "رخصة العمل/مكتب العمل (8,400 أو 9,600 ر.س سنوياً لكل مقيم حسب توازن النطاق)", en: "Work permit (SAR 8,400 or 9,600/yr per expat by Nitaqat balance)", source: "auto" },
      { key: "iqama_family", ar: "دعم الشركة لرسوم التابعين (400 ر.س شهرياً × التابعون)", en: "Company support for dependents fee (SAR 400/mo × dependents)", source: "auto_plus_input" },
      { key: "iqama_services", ar: "فحوصات طبية، ترجمة وتصديق، بطاقات بديلة، تأشيرات خروج وعودة، نقل كفالة", en: "Medical exams, translation, replacement cards, exit/re-entry, sponsorship transfer", source: "input" },
    ],
  },
  {
    key: "housing",
    ar: "السكن والمرافق", en: "Housing & Utilities",
    items: [
      { key: "housing_cash_annual", ar: "بدل السكن النقدي للموظفين (إجمالي سنوي — يُدفع خارج الرواتب بشيك/نقداً)", en: "Cash housing allowance paid to employees (annual total — paid outside payroll by check/cash)", source: "input" },
      { key: "housing_rent", ar: "إيجارات سكن إداري/مجمع سكني", en: "Administrative / staff housing rent", source: "input" },
      { key: "housing_utilities", ar: "كهرباء وماء للسكن أو المكاتب المخصصة", en: "Electricity & water for staff housing/offices", source: "input" },
      { key: "housing_maintenance", ar: "صيانة السكن، أثاث، إنترنت، رسوم بلدية", en: "Housing maintenance, furniture, internet, municipal fees", source: "input" },
      { key: "housing_tickets", ar: "تذاكر طيران سنوية للمقيمين", en: "Annual flight tickets for expats", source: "input" },
    ],
  },
  {
    key: "transport",
    ar: "النقل والسيارات", en: "Transport & Vehicles",
    items: [
      { key: "transport_fuel", ar: "وقود السيارات (عدد السيارات × متوسط شهري × 12)", en: "Vehicle fuel (cars × monthly avg × 12)", source: "auto_plus_input" },
      { key: "transport_maintenance", ar: "صيانة وقطع غيار (عدد السيارات × متوسط سنوي)", en: "Maintenance & parts (cars × annual avg)", source: "auto_plus_input" },
      { key: "transport_insurance", ar: "تأمين المركبات (عدد السيارات × القسط السنوي)", en: "Vehicle insurance (cars × annual premium)", source: "auto_plus_input" },
      { key: "transport_inspection", ar: "الفحص الدوري (عدد السيارات × رسوم الفحص)", en: "Periodic inspection (cars × fee)", source: "auto_plus_input" },
      { key: "transport_rental", ar: "تأجير سيارات (المستأجرة × الإيجار الشهري × 12)", en: "Car rental (rented × monthly rent × 12)", source: "input" },
      { key: "transport_allowance", ar: "بدل بنزين للموظفين (المستفيدين × المبلغ الشهري × 12)", en: "Fuel allowance for employees (beneficiaries × monthly × 12)", source: "input" },
    ],
  },
  {
    key: "eos",
    ar: "مخصص نهاية الخدمة والإجازات", en: "EOS & Leave Provisions",
    items: [
      { key: "eos_provision", ar: "مخصص مكافأة نهاية الخدمة (مادة 84 — نصف شهر/سنة لأول 5 ثم شهر/سنة) — لهذا العام فقط", en: "EOS award provision (Art. 84 — half month/yr first 5, then full month/yr) — this year only", source: "auto" },
      { key: "eos_leave", ar: "مخصص الإجازات السنوية (تلقائي: 30 يوم لمن أكمل 5 سنوات، و21 أو 30 حسب سياسة الشركة لمن دونها)", en: "Annual leave provision (auto: 30 days after 5 years; 21 or 30 per company policy before)", source: "auto" },
      { key: "eos_settlements", ar: "بدل إجازات غير مستخدمة عند إنهاء + تسويات غير متوقعة", en: "Unused leave on termination + unexpected settlements", source: "input" },
    ],
  },
  {
    key: "recruitment",
    ar: "التوظيف والاستقدام", en: "Recruitment & Mobilization",
    items: [
      { key: "recruit_visas", ar: "رسوم تأشيرات عمل واستقدام", en: "Work visa & mobilization fees", source: "input" },
      { key: "recruit_transfer", ar: "رسوم نقل كفالة/نقل خدمات عبر قوى", en: "Sponsorship / service transfer via Qiwa", source: "input" },
      { key: "recruit_medical", ar: "فحوصات وتصديقات وتذاكر سفر عند التعيين", en: "Medical exams, attestations & tickets on hiring", source: "input" },
      { key: "recruit_agency", ar: "أجور مكاتب استقدام ووكالات التوظيف", en: "Recruitment agency fees", source: "input" },
      { key: "recruit_ads", ar: "إعلانات وظائف ومنصات توظيف واختبارات ومقابلات", en: "Job ads, hiring platforms, tests & interviews", source: "input" },
      { key: "recruit_bonus", ar: "مكافأة تعيين/انتقال للموظف", en: "Joining / relocation bonus", source: "input" },
    ],
  },
  {
    key: "training",
    ar: "التدريب والتطوير", en: "Training & Development",
    items: [
      { key: "training_external", ar: "تدريب خارجي ودورات معتمدة وشهادات مهنية", en: "External training, certified courses & professional certifications", source: "input" },
      { key: "training_internal", ar: "تدريب داخلي ومدربين ومنصات تعليم إلكتروني", en: "Internal training, trainers & e-learning platforms", source: "input" },
      { key: "training_conferences", ar: "مؤتمرات ومعارض", en: "Conferences & exhibitions", source: "input" },
      { key: "training_leaders", ar: "تطوير القيادات وبرامج تأهيل السعوديين", en: "Leadership development & Saudi qualification programs", source: "input" },
    ],
  },
  {
    key: "other",
    ar: "بنود إضافية", en: "Other Items",
    items: [
      { key: "other_uniforms", ar: "زي موحد ومهمات عمل", en: "Uniforms & work gear", source: "input" },
      { key: "other_care", ar: "رعاية طبية تكميلية/تأمين حياة", en: "Supplementary medical / life insurance", source: "input" },
      { key: "other_children", ar: "بدل أطفال أو تعتعليم (إن وجد سياسة)", en: "Children allowance / education (if any)", source: "input" },
      { key: "other_welfare", ar: "أنشطة ورفاهية الموظفين", en: "Employee activities & welfare", source: "input" },
      { key: "other_legal", ar: "استشارات قانونية ونظامية", en: "Legal & labor-law consultations", source: "input" },
      { key: "other_platforms", ar: "رسوم منصات (قوى، مقيم، أبشر أعمال، مدد، أنظمة HR + منصات مخصّصة)", en: "Platform fees (Qiwa, Muqeem, Absher Business, Mudad, HR systems + custom)", source: "auto_plus_input" },
    ],
  },
];

// القيم الافتراضية للمدخلات — تُضبط لاحقاً من صفحة الإعدادات
export const BUDGET_INPUT_DEFAULTS = {
  // الرواتب
  overtime_annual: 0, incentives_annual: 0, raise_pct: 3,
  // التأمينات
  gosi_reserve_pct: 1,
  // التأمين الطبي (سنوي لكل فرد)
  medical_employee_premium: 0, medical_dependent_premium: 0, dependents_count: 0,
  medical_upgrade: 0, medical_renewal_pct: 5,
  // الإقامات
  dependents_fee_borne: true, iqama_services: 0,
  // السكن
  housing_cash_annual: 0, housing_rent: 0, housing_utilities: 0, housing_maintenance: 0, housing_tickets: 0,
  // النقل
  fleet_fuel_monthly: 0, fleet_maintenance_annual: 0, fleet_insurance_annual: 0, fleet_inspection_fee: 0,
  rental_cars_count: 0, rental_monthly: 0,
  fuel_allowance_beneficiaries: 0, fuel_allowance_monthly: 0,
  // نهاية الخدمة
  eos_settlements: 0,
  // التوظيف
  recruit_visas: 0, recruit_transfer: 0, recruit_medical: 0, recruit_agency: 0, recruit_ads: 0, recruit_bonus: 0,
  // التدريب
  training_external: 0, training_internal: 0, training_conferences: 0, training_leaders: 0,
  // إضافية
  other_uniforms: 0, other_care: 0, other_children: 0, other_welfare: 0, other_legal: 0,
  custom_platforms: [], // [{ label, amount }]
  platform_extra: 0, // رسوم منصات إضافية غير مذكورة
  // احتياطي
  contingency_pct: 4,
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * حساب الميزانية السنوية.
 * @param {object} p
 * @param {Array} p.employees — الموظفون النشطون (مع الحقول: base_salary, housing_allowance, ...)
 * @param {object} p.org — إعدادات المنشأة (نسب GOSI، أساس نهاية الخدمة)
 * @param {Array} p.vehicles — مركبات الأسطول
 * @param {Array} p.platformSubs — اشتراكات المنصات الحكومية (annual_cost)
 * @param {object} p.inputs — مدخلات المستخدم (BUDGET_INPUT_DEFAULTS كقالة)
 */
export function computeHrBudget({ employees = [], org = null, vehicles = [], platformSubs = [], inputs = {} } = {}) {
  const inp = { ...BUDGET_INPUT_DEFAULTS, ...inputs };
  const active = employees.filter((e) => e && e.status !== "terminated" && e.status !== "resigned");
  const saudis = active.filter((e) => e.is_saudi);
  const expats = active.filter((e) => !e.is_saudi);
  const today = todayISO();

  // ---- مجاميع تُشتق تلقائياً ----
  const monthlyPayroll = active.reduce((s, e) => s + eosSalaryBasis(e, "gross"), 0);
  const annualSalaries = monthlyPayroll * 12;

  // التأمينات: حصة صاحب العمل على نفس أساس النظام (الراتب الأساسي + البدلات)
  let gosiEmployerSaudis = 0;
  let gosiEmployerExpats = 0;
  for (const e of saudis) {
    const { employer_rate } = gosiRates({ employee: e, org });
    gosiEmployerSaudis += eosSalaryBasis(e, "gross") * (employer_rate / 100);
  }
  for (const e of expats) {
    const { employer_rate } = gosiRates({ employee: e, org });
    gosiEmployerExpats += eosSalaryBasis(e, "gross") * (employer_rate / 100);
  }
  const gosiAnnualSaudis = gosiEmployerSaudis * 12;
  const gosiAnnualExpats = gosiEmployerExpats * 12;

  // الإقامات ورخص العمل
  const expatCount = expats.length;
  const dependentsCount = num(inp.dependents_count);
  // 700 ر.س شهرياً إذا كان النطاق متوازناً (السعوديون ≥ المقيمين)، و800 إذا كان المقيمون أكبر
  const permitMonthly = expatCount > saudis.length ? 800 : 700;
  const iqamaRenewal = expatCount * 650;
  const iqamaPermit = expatCount * permitMonthly * 12;
  const iqamaFamily = inp.dependents_fee_borne ? dependentsCount * 400 * 12 : 0;

  // مخصص نهاية الخدمة — مخصص سنوي لسنة الميزانية فقط بحسب مدة خدمة كل موظف (مادة 84):
  // نصف شهر عن كل سنة لأول 5 سنوات، وشهر كامل لكل سنة بعدها — من تاريخ المباشرة في ملف الموظف.
  let eosProvision = 0;
  for (const e of active) {
    const years = computeYearsOfService(e.hire_date, today);
    const wage = eosSalaryBasis(e, org?.eos_basis || "gross");
    const rate = years >= 5 ? 1 : 0.5; // شهر كامل/سنة بعد الخامسة، ونصف شهر قبلها
    eosProvision += wage * rate;
  }
  // مخصص الإجازات السنوية — تلقائي من ملف الموظف بلا أي إدخال يدوي:
  // من أكمل 5 سنوات فمستحقه 30 يوماً (قاعدة الوزارة)، ومن دونها يُرجع لحقل استحقاقه
  // في الملف (21 أو 30 يوماً حسب سياسة الشركة). القيمة = (الراتب الشهري ÷ 30) × الأيام.
  let leaveProvision = 0;
  for (const e of active) {
    const years = computeYearsOfService(e.hire_date, today);
    const days = years >= 5 ? 30 : (Number(e.annual_leave_entitlement) || Number(org?.annual_leave_days) || 21);
    leaveProvision += (eosSalaryBasis(e, org?.eos_basis || "gross") / 30) * days;
  }

  // أسطول المركبات — من سجل المركبات الفعلي
  const fleetCount = vehicles.length;
  const transportFuel = fleetCount * num(inp.fleet_fuel_monthly) * 12;
  const transportMaintenance = fleetCount * num(inp.fleet_maintenance_annual);
  const transportInsurance = fleetCount * num(inp.fleet_insurance_annual);
  const transportInspection = fleetCount * num(inp.fleet_inspection_fee);

  // اشتراكات المنصات الحكومية — من السجل الفعلي + المخصّص + الإضافي
  const platformsRegistered = platformSubs.filter((s) => s && !s.not_applicable && s.status !== "stopped")
    .reduce((s, x) => s + num(x.annual_cost), 0);
  const platformsCustom = (Array.isArray(inp.custom_platforms) ? inp.custom_platforms : [])
    .reduce((s, x) => s + num(x?.amount), 0);
  const otherPlatforms = platformsRegistered + platformsCustom + num(inp.platform_extra);

  // ---- تجميع البنود ----
  const values = {
    salaries_basic: annualSalaries,
    salaries_overtime: num(inp.overtime_annual),
    salaries_incentives: num(inp.incentives_annual),
    salaries_raise: annualSalaries * (num(inp.raise_pct) / 100),

    gosi_employer: gosiAnnualSaudis,
    gosi_expat: gosiAnnualExpats,
    gosi_reserve: (gosiAnnualSaudis + gosiAnnualExpats) * (num(inp.gosi_reserve_pct) / 100),

    medical_employees: active.length * num(inp.medical_employee_premium),
    medical_dependents: dependentsCount * num(inp.medical_dependent_premium),
    medical_upgrade: num(inp.medical_upgrade),
    medical_renewal: 0, // يُحتسب لاحقاً كنسبة من إجمالي التأمين الطبي

    iqama_renewal: iqamaRenewal,
    iqama_permit: iqamaPermit,
    iqama_family: iqamaFamily,
    iqama_services: num(inp.iqama_services),

    housing_cash_annual: num(inp.housing_cash_annual),
    housing_rent: num(inp.housing_rent),
    housing_utilities: num(inp.housing_utilities),
    housing_maintenance: num(inp.housing_maintenance),
    housing_tickets: num(inp.housing_tickets),

    transport_fuel: transportFuel,
    transport_maintenance: transportMaintenance,
    transport_insurance: transportInsurance,
    transport_inspection: transportInspection,
    transport_rental: num(inp.rental_cars_count) * num(inp.rental_monthly) * 12,
    transport_allowance: num(inp.fuel_allowance_beneficiaries) * num(inp.fuel_allowance_monthly) * 12,

    eos_provision: eosProvision,
    eos_leave: leaveProvision,
    eos_settlements: num(inp.eos_settlements),

    recruit_visas: num(inp.recruit_visas),
    recruit_transfer: num(inp.recruit_transfer),
    recruit_medical: num(inp.recruit_medical),
    recruit_agency: num(inp.recruit_agency),
    recruit_ads: num(inp.recruit_ads),
    recruit_bonus: num(inp.recruit_bonus),

    training_external: num(inp.training_external),
    training_internal: num(inp.training_internal),
    training_conferences: num(inp.training_conferences),
    training_leaders: num(inp.training_leaders),

    other_uniforms: num(inp.other_uniforms),
    other_care: num(inp.other_care),
    other_children: num(inp.other_children),
    other_welfare: num(inp.other_welfare),
    other_legal: num(inp.other_legal),
    other_platforms: otherPlatforms,
  };

  // احتياطي أسعار التجديد يُضاف على فرع التأمين الطبي
  const medicalBase = values.medical_employees + values.medical_dependents + values.medical_upgrade;
  values.medical_renewal = medicalBase * (num(inp.medical_renewal_pct) / 100);

  const categories = BUDGET_CATEGORIES.map((cat) => {
    const items = cat.items.map((it) => ({ ...it, amount: round2(values[it.key] || 0) }));
    return { ...cat, items, total: round2(items.reduce((s, i) => s + i.amount, 0)) };
  });

  const subtotal = round2(categories.reduce((s, c) => s + c.total, 0));
  const contingency = round2(subtotal * (num(inp.contingency_pct) / 100));
  const grandTotal = round2(subtotal + contingency);

  return {
    categories,
    subtotal,
    contingency,
    contingency_pct: num(inp.contingency_pct),
    grandTotal,
    headcount: { total: active.length, saudis: saudis.length, expats: expatCount, dependents: dependentsCount },
    vehicles: fleetCount,
    values,
  };
}

// ============================================================
// مؤشرات الأداء
// ============================================================
export function computeBudgetKpis(budget, { hires = 0, actualTotal = null } = {}) {
  const { grandTotal, categories, headcount } = budget;
  const total = grandTotal || 1;
  const catOf = (k) => categories.find((c) => c.key === k)?.total || 0;
  const salaries = catOf("salaries");
  const eos = catOf("eos");
  const recruitment = catOf("recruitment");
  const training = catOf("training");
  const transport = catOf("transport");
  const saudizationPct = headcount.total ? (headcount.saudis / headcount.total) * 100 : 0;
  return {
    costPerEmployee: headcount.total ? round2(grandTotal / headcount.total) : 0,
    salariesPct: round2((salaries / total) * 100),
    recruitmentPerHire: hires > 0 ? round2(recruitment / hires) : null,
    trainingPerEmployee: headcount.total ? round2(training / headcount.total) : 0,
    saudizationPct: round2(saudizationPct),
    eosPctOfSalaries: salaries > 0 ? round2((eos / salaries) * 100) : 0,
    fleetPerVehicle: budget.vehicles > 0 ? round2(transport / budget.vehicles) : 0,
    deviation: actualTotal != null && grandTotal > 0 ? round2((actualTotal / grandTotal - 1) * 100) : null,
  };
}

// ============================================================
// الفعلي: تجميع كشوف الرواتب المدفوعة لسنة → 12 شهراً
// (الفعلي المتاح من النظام = الرواتب المصروفة + حصة صاحب العمل في التأمينات)
// ============================================================
export function monthlyActualsFromPayrolls(payrolls = [], year) {
  const months = Array.from({ length: 12 }, () => 0);
  for (const p of payrolls) {
    if (!p || p.status !== "paid") continue;
    if (year && Number(p.year) !== Number(year)) continue;
    const m = Number(p.month);
    if (!m || m < 1 || m > 12) continue;
    months[m - 1] += num(p.gross_salary) + num(p.gosi_employer);
  }
  return months.map(round2);
}

export function budgetMonthlyPlan(grandTotal) {
  return Array.from({ length: 12 }, () => round2((grandTotal || 0) / 12));
}
