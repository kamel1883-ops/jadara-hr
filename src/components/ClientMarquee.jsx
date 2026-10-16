import React from "react";
import { Image } from "@/components/ui/image";
import { useI18n } from "@/lib/i18n";

const CLIENTS = [
  { name: "عيادة دكتور توم البيطرية", en: "Dr. Tom Veterinary Clinic", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/5ae9d2097_Screenshot2026-08-05143830.png" },
  { name: "شركة كود الأعمال للمقاولات", en: "Business Code Co.", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/d146af91b_Screenshot2026-08-09155940.png" },
  { name: "مصنع درز للخياطة الراقية", en: "Darz Tailoring Factory", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/64e527d78_Screenshot2026-08-09155842.png" },
  { name: "آل معيض", en: "Al Moied", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/40f72a492_image.png" },
  { name: "شركة ومصنع الفواكه المجففة (دي فروت)", en: "Dfruit Dried Fruits Co. & Factory", logo: "https://base44.app/api/apps/6a74edc8f347046365c2e1a4/files/mp/public/6a74edc8f347046365c2e1a4/3e3cb09aa_dfruit-logo.png" },
];

export default function ClientMarquee() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const title = isAr ? "عملاؤنا" : "Our Clients";
  const sub = isAr ? "منشآت تثق بجداره لإدارة مواردها البشرية" : "Organizations trusting Jadara for their HR";
  const loop = [...CLIENTS, ...CLIENTS];

  return (
    <section className="max-w-7xl mx-auto px-5 py-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 text-xs text-violet-700 bg-violet-100 border border-violet-200 rounded-full px-3 py-1 mb-3">{isAr ? "موثوق به" : "Trusted by"}</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm mt-2">{sub}</p>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-violet-50/40 py-8" dir="ltr">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F6F3FC] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#F6F3FC] to-transparent z-10" />
        <div className="marquee-track flex w-max">
          {loop.map((c, i) => (
            <div key={i} className="shrink-0 mx-3 w-[300px] h-[150px] rounded-2xl bg-white border border-violet-100 flex flex-col items-center justify-center gap-3 px-4 shadow-lg">
              <Image src={c.logo} alt={isAr ? c.name : c.en} fittingType="fit" loading="eager" className="h-24 w-32 rounded-xl object-contain" />
              <div className="text-center text-sm font-semibold text-slate-800 leading-tight" dir={isAr ? "rtl" : "ltr"}>
                {isAr ? c.name : c.en}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}