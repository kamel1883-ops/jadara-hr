import React from "react";
import { Percent, RefreshCw, Landmark, Check, Calculator, ShieldCheck } from "lucide-react";

/**
 * قسم النطاقات (التوطين) في صفحة الهبوط:
 * يوضّح أن الحساب مطابق لحاسبة قوى، وأن النسب تُقرأ من المصدر الرسمي وتُزامَن تلقائياً
 * (قرارات وزارة الموارد البشرية والتنمية الاجتماعية عبر منصة قوى) بلا نسخ يدوي.
 */
const QIWA_URL = "https://www.qiwa.sa/";
const HRSD_URL = "https://www.hrsd.gov.sa/";

export default function NitaqatSection({ isAr = true }) {
  const t = isAr ? {
    tag: "النطاقات والتوطين",
    title: "النطاق كما تحسبه منصة قوى — بالضبط",
    intro: "نطاق منشأتك يُحسب في جداره بنفس طريقة حاسبة قوى: النشاط التفصيلي من الدليل الوطني للأنشطة الاقتصادية، وعدد السعوديين والوافدين من موظفيك النشطين.",
    steps: [
      { icon: Landmark, t: "النشاط التفصيلي", d: "تختار المنشأة نشاطها الرئيسي ثم النشاط التفصيلي الذي يندرج تحته من الدليل الوطني للأنشطة الاقتصادية (ISIC4) — وهو النشاط الذي تُحسب به النطاقات." },
      { icon: Percent, t: "أعداد العمالة", d: "يُقرأ عدد السعوديين وعدد الوافدين من ملفات الموظفين النشطين تلقائياً — بلا إدخال يدوي ولا كشوف خارجية." },
      { icon: Calculator, t: "المعادلة نفسها", d: "الحد = م × لوغ(إجمالي العمالة) + ث، بمعاملات النشاط التفصيلي نفسه المستخدمة في حاسبة قوى — فتطابق النتيجة تماماً." },
      { icon: ShieldCheck, t: "النطاق والمزايا والمخاطر", d: "بلاتيني، أخضر مرتفع، أخضر متوسط، أخضر منخفض، أحمر — مع مزايا كل نطاق ومخاطره، وكم سعودياً تحتاج للخروج من النطاق الأحمر." },
    ],
    srcTitle: "المصدر الرسمي والتحديث التلقائي",
    srcBody: "قرارات نسب التوطين تصدر من وزارة الموارد البشرية والتنمية الاجتماعية وتُنشر عبر منصة قوى، وتختلف من نشاط إلى آخر — وقد تُعدَّل في نشاط معيّن بعد قرار وزاري فترتفع النسبة المطلوبة (أو تنخفض). لذلك لا تُنسخ الأرقام يدوياً في جداره: النظام يقرأ بيانات النطاقات من المصدر الرسمي ويزامنها تلقائياً كل أسبوع، فأي تعديل يصدر هناك ينتقل إلى نظامك هنا كما هو — بالزيادة أو النقصان — دون إعادة إدخال أو انتظار.",
    chips: ["مطابقة حاسبة قوى", "مزامنة دورية مع المصدر الرسمي", "النشاط من الدليل الوطني ISIC4", "المزايا والمخاطر لكل نطاق"],
    srcLinks: "المصدر: منصة قوى",
    ministry: "وزارة الموارد البشرية",
  } : {
    tag: "Nitaqat & Saudization",
    title: "Your band, exactly as Qiwa calculates it",
    intro: "Jadara computes your Nitaqat band the same way Qiwa's calculator does: the detailed activity from the National Guide of Economic Activities, plus the Saudi and expat counts from your active employees.",
    steps: [
      { icon: Landmark, t: "Detailed activity", d: "Choose the main activity, then the detailed activity under it from the National Guide of Economic Activities (ISIC4) — that is the activity Nitaqat is calculated on." },
      { icon: Percent, t: "Workforce counts", d: "Saudi and expat counts are read automatically from your active employee records — no manual entry, no external sheets." },
      { icon: Calculator, t: "The same formula", d: "Limit = m × ln(total workforce) + c, using the coefficients of the very same detailed activity used by Qiwa's calculator — so the result matches exactly." },
      { icon: ShieldCheck, t: "Band, benefits & risks", d: "Platinum, High Green, Medium Green, Low Green, Red — with each band's benefits and risks, and how many more Saudis you need to leave the Red band." },
    ],
    srcTitle: "The official source, synced automatically",
    srcBody: "Saudization ratios are issued by the Ministry of Human Resources and Social Development and published through Qiwa, and they differ from one activity to another — a ministerial decision can raise (or lower) the required ratio for a specific activity. So Jadara never copies the numbers manually: the system reads the Nitaqat data from the official source and syncs it weekly, and any change there flows into your system here as it is — up or down — with no re-entry and no waiting.",
    chips: ["Matches Qiwa's calculator", "Weekly sync with the official source", "Activity from the National Guide (ISIC4)", "Benefits & risks per band"],
    srcLinks: "Source: Qiwa platform",
    ministry: "Ministry of Human Resources",
  };

  return (
    <section id="nitaqat" className="max-w-[1600px] mx-auto px-6 lg:px-14 py-14">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-full px-3 py-1 text-sm text-violet-700">{t.tag}</div>
        <h2 className="text-4xl sm:text-5xl font-extrabold mt-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>{t.title}</h2>
        <p className="text-muted-foreground text-base mt-4 max-w-3xl mx-auto leading-relaxed">{t.intro}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
        {t.steps.map((s) => {
          const I = s.icon;
          return (
            <div key={s.t} className="bg-white border border-violet-100 rounded-3xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4 shadow-sm">
                <I size={22} className="text-violet-600" />
              </div>
              <div className="font-bold text-lg text-foreground">{s.t}</div>
              <div className="text-muted-foreground text-base mt-2 leading-relaxed">{s.d}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white border border-violet-100 rounded-3xl p-7 grid lg:grid-cols-[1fr,auto] gap-6 items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={18} className="text-violet-600" />
            <span className="font-bold text-lg text-foreground">{t.srcTitle}</span>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">{t.srcBody}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {t.chips.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-sm bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5 text-foreground">
                <Check size={13} className="text-violet-600" /> {c}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 min-w-[220px]">
          <a href={QIWA_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg shadow-violet-600/30 transition">
            <Landmark size={17} /> {t.srcLinks}
          </a>
          <a href={HRSD_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-violet-50 border border-violet-200 text-foreground px-5 py-3 rounded-2xl font-semibold transition">
            <Landmark size={17} className="text-violet-600" /> {t.ministry}
          </a>
        </div>
      </div>
    </section>
  );
}