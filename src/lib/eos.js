// حساب نهاية الخدمة والتأمينات الاجتماعية وفق نظام العمل السعودي — متعدد اللغات
import { activeLang } from "@/lib/lang";

const t = (entry, lang) => entry[lang] || entry.en || entry.ar;

export const terminationReasons = [
  { value: "end_of_contract", category: "full", ar: { label: "انتهاء العقد محدد المدة", article: "مادة 74", note: "انتهاء مدة العقد المحددة — مكافأة كاملة (مادة 84)" }, en: { label: "End of fixed-term contract", article: "Art. 74", note: "End of fixed term — full award (Art. 84)" }, hi: { label: "निश्चित-अवधि अनुबंध समाप्त", article: "अनुच्छेद 74", note: "निश्चित अवधि समाप्त — पूर्ण पुरस्कार (अनुच्छेद 84)" }, ne: { label: "निश्चित-अवधि सम्झौता समाप्त", article: "धारा ७४", note: "निश्चित अवधि समाप्त — पूर्ण पुरस्कार (धारा ८४)" }, bn: { label: "নির্দিষ্ট-মেয়াদি চুক্তি শেষ", article: "ধারা ৭৪", note: "নির্দিষ্ট মেয়াদ শেষ — সম্পূর্ণ পুরস্কার (ধারা ৮৪)" }, fil: { label: "Pagtatapos ng fixed-term contract", article: "Art. 74", note: "Pagtatapos ng fixed term — buong parusa (Art. 84)" }, ur: { label: "مدت معینہ معاہدہ ختم", article: "مادہ 74", note: "مدت معینہ ختم — مکمل انعام (مادہ 84)" } },
  { value: "contract_non_renewal", category: "full", ar: { label: "عدم التجديد / عدم الرغبة بالتمديد", article: "مادة 75", note: "إنهاء العقد من أحد الطرفين بإخطار مسبق — مكافأة كاملة" }, en: { label: "Non-renewal", article: "Art. 75", note: "Termination by either party with prior notice — full award" }, hi: { label: "अनुबंध गैर-नवीनीकरण", article: "अनुच्छेद 75", note: "किसी भी पक्ष द्वारा पूर्व सूचना के साथ समाप्ति — पूर्ण पुरस्कार" }, ne: { label: "सम्झौता नवीकरण नगरिएको", article: "धारा ७५", note: "कुनै पनि पक्षद्वारा पूर्व-सूचनासहित समाप्ति — पूर्ण पुरस्कार" }, bn: { label: "চুক্তি নবায়ন নয়", article: "ধারা ৭৫", note: "যেকোনো পক্ষের পূর্ব নোটিশে সমাপ্তি — সম্পূর্ণ পুরস্কার" }, fil: { label: "Hindi pag-renew ng kontrata", article: "Art. 75", note: "Pagwakas ng alinmang panig na may paunang abiso — buong parusa" }, ur: { label: "معاہدہ نئی نہ ہونا", article: "مادہ 75", note: "کسی بھی فریق کی جانب سے پہلے سے اطلاع کے ساتھ ختم — مکمل انعام" } },
  { value: "employer_termination", category: "full", ar: { label: "إنهاء العقد من صاحب العمل", article: "مادة 84", note: "إنهاء من صاحب العمل — مكافأة كاملة" }, en: { label: "Employer termination", article: "Art. 84", note: "Employer termination — full award" }, hi: { label: "नियोक्ता द्वारा समाप्ति", article: "अनुच्छेद 84", note: "नियोक्ता द्वारा समाप्ति — पूर्ण पुरस्कार" }, ne: { label: "नियोक्ताद्वारा समाप्ति", article: "धारा ८४", note: "नियोक्ताद्वारा समाप्ति — पूर्ण पुरस्कार" }, bn: { label: "নিয়োগকর্তা সমাপ্তি", article: "ধারা ৮৪", note: "নিয়োগকর্তা সমাপ্তি — সম্পূর্ণ পুরস্কার" }, fil: { label: "Pagwakas ng employer", article: "Art. 84", note: "Pagwakas ng employer — buong parusa" }, ur: { label: "ملازمت دہندہ کی جانب سے ختم", article: "مادہ 84", note: "ملازمت دہندہ کی جانب سے ختم — مکمل انعام" } },
  { value: "unjustified_dismissal", category: "full", ar: { label: "فصل تعسفي / إنهاء مخالف للنظام", article: "مادة 77", note: "الإنهاء المخالف للنظام يُوجب تعويض العامل عن الفصل التعسفي" }, en: { label: "Unjustified dismissal", article: "Art. 77", note: "Unlawful termination entitles compensation" }, hi: { label: "अनुचित बर्खास्तगी", article: "अनुच्छेद 77", note: "गैर-कानूनी समाप्ति क्षतिपूर्ति का हकदार" }, ne: { label: "अनुचित बर्खास्त", article: "धारा ७७", note: "गैर-कानूनी समाप्तिले क्षतिपूर्ति पाउँछ" }, bn: { label: "অযৌক্তিক বরখাস্ত", article: "ধারা ৭৭", note: "অবৈধ সমাপ্তি ক্ষতিপূরণের অধিকার দেয়" }, fil: { label: "Hindi makatarungang pagtanggal", article: "Art. 77", note: "Hindi naaayon na pagwakas — karapatan sa kabayaran" }, ur: { label: "غیر منطقی برطرفی", article: "مادہ 77", note: "غیر قانونی ختم کا معاوضہ حقدار ہے" } },
  { value: "resignation", category: "partial", ar: { label: "استقالة العامل", article: "مادة 85", note: "مكافأة جزئية حسب مدة الخدمة (أقل من سنتين لا شيء، 2-5 الثلث، 5-10 الثلثان، 10 فأكثر كاملة)" }, en: { label: "Employee resignation", article: "Art. 85", note: "Partial award by tenure (<2y none, 2-5 one third, 5-10 two thirds, 10+ full)" }, hi: { label: "कर्मचारी इस्तीफा", article: "अनुच्छेद 85", note: "सेवा अवधि अनुसार आंशिक पुरस्कार (<2वर्ष कुछ नहीं, 2-5 एक-तिहाई, 5-10 दो-तिहाई, 10+ पूर्ण)" }, ne: { label: "कर्मचारी राजिनामा", article: "धारा ८५", note: "सेवा अवधि अनुसार आंशिक पुरस्कार (<२वर्ष केही छैन, २-५ एक-तिहाई, ५-१० दुई-तिहाई, १०+ पूर्ण)" }, bn: { label: "কর্মচারীর পদত্যাগ", article: "ধারা ৮৫", note: "চাকরির মেয়াদ অনুযায়ী আংশিক পুরস্কার (<২বছর নেই, ২-৫ এক-তৃতীয়াংশ, ৫-১০ দুই-তৃতীয়াংশ, ১০+ সম্পূর্ণ)" }, fil: { label: "Pagbitiw ng empleyado", article: "Art. 85", note: "Bahag parusa ayon sa tenure (<2t wala, 2-5 isang-tatlo, 5-10 dalawang-tatlo, 10+ buo)" }, ur: { label: "ملازم کا استعفیٰ", article: "مادہ 85", note: "خدمت کی مدت کے مطابق جزوی انعام (<2سال کچھ نہیں، 2-5 ایک-تیہائی، 5-10 دو-تیہائی، 10+ مکمل)" } },
  { value: "dismissal_for_cause", category: "none", ar: { label: "فصل لأسباب مشروعة", article: "مادة 80", note: "الأسباب الواردة في المادة 80 — لا يستحق مكافأة ولا إشعاراً" }, en: { label: "Dismissal for cause", article: "Art. 80", note: "Art. 80 grounds — no award or notice" }, hi: { label: "कारणवश बर्खास्तगी", article: "अनुच्छेद 80", note: "अनुच्छेद 80 के आधार — कोई पुरस्कार या सूचना नहीं" }, ne: { label: "कारणवश बर्खास्त", article: "धारा ८०", note: "धारा ८० का आधार — कुनै पुरस्कार वा सूचना छैन" }, bn: { label: "কারণে বরখাস্ত", article: "ধারা ৮০", note: "ধারা ৮০ ভিত্তি — কোনো পুরস্কার বা নোটিশ নেই" }, fil: { label: "Pagtanggal dahil sa pagkakasala", article: "Art. 80", note: "Art. 80 batayan — walang parusa o abiso" }, ur: { label: "وجہ کی بنا پر برطرفی", article: "مادہ 80", note: "مادہ 80 کی بنیاد — کوئی انعام یا اطلاع نہیں" } },
  { value: "employee_leave_with_rights", category: "full", ar: { label: "ترك العامل العمل لأسباب جائزة", article: "مادة 81", note: "ترك العامل العمل لسبب مشروع — يحتفظ بكامل حقوقه ومكافأته" }, en: { label: "Employee leave with rights", article: "Art. 81", note: "Lawful reason — keeps full rights and award" }, hi: { label: "वैध कारण से कार्य छोड़ना", article: "अनुच्छेद 81", note: "वैध कारण — पूर्ण अधिकार और पुरस्कार बरकरार" }, ne: { label: "वैध कारणले काम छोड्ने", article: "धारा ८१", note: "वैध कारण — पूर्ण अधिकार र पुरस्कार कायम" }, bn: { label: "বৈধ কারণে কাজ ছাড়া", article: "ধারা ৮১", note: "বৈধ কারণ — সম্পূর্ণ অধিকার ও পুরস্কার বজায়" }, fil: { label: "Pag-alis dahil sa matwid na dahilan", article: "Art. 81", note: "Matwid na dahilan — panatilihin ang buong karapatan at parusa" }, ur: { label: "جائز وجہ سے کام چھوڑنا", article: "مادہ 81", note: "جائز وجہ — مکمل حقوق اور انعام برقرار" } },
  { value: "mutual_consent", category: "full", ar: { label: "إنهاء العقد بالتراضي", article: "مادة 74", note: "اتفاق الطرفين — يُراعى ما تم الاتفاق عليه ضمن العقد" }, en: { label: "Mutual consent", article: "Art. 74", note: "By agreement — per contract terms" }, hi: { label: "पारस्परिक सहमति", article: "अनुच्छेद 74", note: "समझौते से — अनुबंध की शर्तों अनुसार" }, ne: { label: "पारस्परिक सहमति", article: "धारा ७४", note: "समझौतामा — सम्झौता सर्त अनुसार" }, bn: { label: "পারস্পরিক সম্মতি", article: "ধারা ৭৪", note: "চুক্তি অনুযায়ী — চুক্তির শর্তানুসারে" }, fil: { label: "Parehong pagsang-ayon", article: "Art. 74", note: "Sa kasunduan — ayon sa tuntunin ng kontrata" }, ur: { label: "باہمی رضامندی", article: "مادہ 74", note: "معاہدے سے — معاہدہ کی شرائط کے مطابق" } },
  { value: "death", category: "full", ar: { label: "وفاة العامل", article: "مادة 74", note: "تنصرف مكافأة نهاية الخدمة للورثة بالكامل" }, en: { label: "Death", article: "Art. 74", note: "Award paid in full to heirs" }, hi: { label: "मृत्यु", article: "अनुच्छेद 74", note: "पूर्ण पुरस्कार वारिसों को" }, ne: { label: "मृत्यु", article: "धारा ७४", note: "पूर्ण पुरस्कार वारिसलाई" }, bn: { label: "মৃত্যু", article: "ধারা ৭৪", note: "সম্পূর্ণ পুরস্কার উত্তরাধিকারীদের" }, fil: { label: "Kamatayan", article: "Art. 74", note: "Buong parusa sa mga tagapagmana" }, ur: { label: "وفات", article: "مادہ 74", note: "مکمل انعام ورثاء کو" } },
  { value: "incapacity", category: "full", ar: { label: "العجز أو عدم اللياقة الصحية", article: "مادة 74", note: "انتهاء العقد بسبب العجز الصحي — مكافأة مستحقة" }, en: { label: "Incapacity / unfitness", article: "Art. 74", note: "Termination for health incapacity — award due" }, hi: { label: "अक्षमता / अयोग्यता", article: "अनुच्छेद 74", note: "स्वास्थ्य अक्षमता के लिए समाप्ति — पुरस्कार देय" }, ne: { label: "अक्षमता / अयोग्यता", article: "धारा ७४", note: "स्वास्थ्य अक्षमताको लागि समाप्ति — पुरस्कार देय" }, bn: { label: "অক্ষমতা / অযোগ্যতা", article: "ধারা ৭৪", note: "স্বাস্থ্য অক্ষমতার জন্য সমাপ্তি — পুরস্কার দেয়" }, fil: { label: "Kawalan ng kakayahan", article: "Art. 74", note: "Pagwakas dahil sa kalusugan — parusa dapat" }, ur: { label: "نااہلیت/غیر مناسب", article: "مادہ 74", note: "صحت کی نااہلیت کی وجہ سے ختم — انعام واجب" } },
  { value: "force_majeure", category: "full", ar: { label: "القوة القاهرة", article: "مادة 74", note: "ظرف خارج عن إرادة الطرفين — يحتفظ العامل بكامل مكافأته محسوبة على المدة (مادة 84)" }, en: { label: "Force majeure", article: "Art. 74", note: "Beyond parties' control — worker retains full award by tenure (Art. 84)" }, hi: { label: "प्रकृति आपदा", article: "अनुच्छेद 74", note: "कार्यकर्ता अवधि अनुसार पूर्ण पुरस्कार बरकरार रखता है (अनुच्छेद 84)" }, ne: { label: "बाध्यताजन्य परिस्थिति", article: "धारा ७४", note: "कर्मचारी अवधि अनुसार पूर्ण पुरस्कार बचत गर्छ (धारा ८४)" }, bn: { label: "প্রাকৃতিক দুর্যোগ", article: "ধারা ৭৪", note: "কর্মচারী মেয়াদ অনুযায়ী সম্পূর্ণ পুরস্কার বজায় রাখেন (ধারা ৮৪)" }, fil: { label: "Force majeure", article: "Art. 74", note: "Pinapanatili ng empleyado ang buong parusa ayon sa tenure (Art. 84)" }, ur: { label: "قوتِ قہر", article: "مادہ 74", note: "ملازم مدت کے مطابق مکمل انعام برقرار رکھتا ہے (مادہ 84)" } },
  { value: "probation_dismissal", category: "full", ar: { label: "الاستبعاد وإنهاء الخدمة أثناء فترة التجربة", article: "مادة 53", note: "جواز إنهاء العقد خلال فترة التجربة دون إخطار أو تعويض — يستحق العامل أجره عن المدة المقضاة، وتُحسب المكافأة وفق المدة (مادة 84)" }, en: { label: "Dismissal during probation", article: "Art. 53", note: "Either party may terminate during probation without notice or compensation — wages for days worked; award per tenure (Art. 84)" }, hi: { label: "परिवीक्षा काल में बर्खास्तगी", article: "अनुच्छेद 53", note: "परिवीक्षा काल में कोई भी पक्ष बिना सूचना या क्षतिपूर्ति समाप्त कर सकता है — कार्य दिवसों का वेतन; पुरस्कार अवधि अनुसार (अनुच्छेद 84)" }, ne: { label: "परिवीक्षा अवधिमा बर्खास्त", article: "धारा ५३", note: "परिवीक्षा अवधिमा कुनै पनि पक्षले सूचना वा क्षतिपूर्ति बिना समाप्त गर्न सक्छ — कार्य दिनको ज्याला; पुरस्कार अवधि अनुसार (धारा ८४)" }, bn: { label: "পরীক্ষামূলক সময়ে বরখাস্ত", article: "ধারা ৫৩", note: "পরীক্ষামূলক সময়ে যেকোনো পক্ষ নোটিশ বা ক্ষতিপূরণ ছাড়াই সমাপ্ত করতে পারে — কাজের দিনের মজুরি; মেয়াদ অনুযায়ী পুরস্কার (ধারা ৮৪)" }, fil: { label: "Pagtanggal sa probasyon", article: "Art. 53", note: "Alinmang panig ay maaaring wakasin sa probasyon nang walang abiso o kabayaran — sahod sa mga araw ng trabaho; parusa ayon sa tenure (Art. 84)" }, ur: { label: "پروفیشن کے دوران برطرفی", article: "مادہ 53", note: "پروفیشن کے دوران کوئی بھی فریق اطلاع یا معاوضہ کے بغیر ختم کر سکتا ہے — کام کے دنوں کی تنخواہ؛ مدت کے مطابق انعام (مادہ 84)" } },
];

export function reasonMeta(reason) {
  const lang = activeLang();
  const r = terminationReasons.find((x) => x.value === reason);
  if (!r) return { label: reason, note: "", article: "", category: reason === "resignation" ? "partial" : "none" };
  return { category: r.category, ...t(r, lang) };
}

export const eosArticleReference = [
  { article: "مادة 74", ar: { title: "انتهاء عقد العمل", desc: "حالات انتهاء العقد: انتهاء المدة، التراضي، الوفاة، العجز، القوة القاهرة." }, en: { title: "End of contract", desc: "Cases: term end, mutual consent, death, incapacity, force majeure." }, hi: { title: "अनुबंध समाप्ति", desc: "मामले: अवधि समाप्ति, पारस्परिक सहमति, मृत्यु, अक्षमता, आपदा।" }, ne: { title: "सम्झौता समाप्ति", desc: "केसहरू: अवधि समाप्ति, पारस्परिक सहमति, मृत्यु, अक्षमता, आपदा।" }, bn: { title: "চুক্তি শেষ", desc: "ক্ষেত্র: মেয়াদ শেষ, পারস্পরিক সম্মতি, মৃত্যু, অক্ষমতা, দুর্যোগ।" }, fil: { title: "Pagtatapos ng kontrata", desc: "Mga kaso: katapusan ng termino, magkasang-ayon, kamatayan, hindi kakayahan, force majeure." }, ur: { title: "معاہدہ ختم", desc: "کیسز: میعاد ختم، باہمی رضامندی، وفات، نااہلیت، آفت۔" } },
  { article: "مادة 75", ar: { title: "إنهاء العقد بإرادة منفردة", desc: "جواز إنهاء العقد من أي طرف بشرط الإخطار المسبق المحدد نظاماً." }, en: { title: "Unilateral termination", desc: "Either party may terminate with the legally required notice." }, hi: { title: "एकपक्षीय समाप्ति", desc: "कोई भी पक्ष कानूनी नोटिस के साथ समाप्त कर सकता है।" }, ne: { title: "एकलपक्षीय समाप्ति", desc: "कुनै पनि पक्षले कानूनी नोटिससहित समाप्त गर्न सक्छ।" }, bn: { title: "একতরফা সমাপ্তি", desc: "যেকোনো পক্ষ আইনি নোটিশে সমাপ্ত করতে পারে।" }, fil: { title: "Isang-taong pagwakas", desc: "Maaaring wakasin ng alinmang panig na may legal na abiso." }, ur: { title: "یکطرفہ ختم", desc: "کوئی بھی فریق قانونی اطلاع کے ساتھ ختم کر سکتا ہے۔" } },
  { article: "مادة 77", ar: { title: "الإنهاء المخالف للنظام", desc: "تعويض الطرف المتضرر عن إنهاء العقد بطريقة مخالفة لأحكام النظام." }, en: { title: "Unlawful termination", desc: "Compensation for the aggrieved party on unlawful termination." }, hi: { title: "गैर-कानूनी समाप्ति", desc: "गैर-कानूनी समाप्ति पर पीड़ित पक्ष का क्षतिपूर्ति।" }, ne: { title: "गैर-कानूनी समाप्ति", desc: "गैर-कानूनी समाप्तिमा पीडित पक्षको क्षतिपूर्ति।" }, bn: { title: "অবৈধ সমাপ্তি", desc: "অবৈধ সমাপ্তিতে ক্ষতিগ্রস্ত পক্ষের ক্ষতিপূরণ।" }, fil: { title: "Hindi naaayong pagwakas", desc: "Kabayaran sa naapi na panig sa hindi naaayon na pagwakas." }, ur: { title: "غیر قانونی ختم", desc: "غیر قانونی ختم پر متاثر فریق کا معاوضہ۔" } },
  { article: "مادة 80", ar: { title: "الفصل دون مكافأة", desc: "الأسباب التي تخوّل صاحب العمل الفصل دون مكافأة ولا إشعار." }, en: { title: "Dismissal without award", desc: "Grounds allowing dismissal without award or notice." }, hi: { title: "बिना पुरस्कार बर्खास्तगी", desc: "बिना पुरस्कार या सूचना बर्खास्त के आधार।" }, ne: { title: "पुरस्कार बिना बर्खास्त", desc: "पुरस्कार वा सूचना बिना बर्खास्त गर्ने आधार।" }, bn: { title: "পুরস্কার ছাড়া বরখাস্ত", desc: "পুরস্কার বা নোটিশ ছাড়া বরখাস্তের ভিত্তি।" }, fil: { title: "Pagtanggal na walang parusa", desc: "Batayan ng pagtanggal nang walang parusa o abiso." }, ur: { title: "بغیر انعام برطرفی", desc: "بغیر انعام یا اطلاع برطرفی کی بنیادیں۔" } },
  { article: "مادة 81", ar: { title: "ترك العامل العمل", desc: "حالات يحق فيها للعامل ترك العمل مع الاحتفاظ بكل حقوقه ومكافأته." }, en: { title: "Employee leaving", desc: "Cases where the employee may leave keeping full rights and award." }, hi: { title: "कर्मचारी कार्य छोड़ना", desc: "ऐसे मामले जहाँ कर्मचारी पूर्ण अधिकार और पुरस्कार बनाए काम छोड़ सकता है।" }, ne: { title: "कर्मचारीले काम छोड्ने", desc: "कर्मचारीले पूर्ण अधिकार र पुरस्कार बचत गरी काम छोड्न सक्ने केसहरू।" }, bn: { title: "কর্মচারী কাজ ছাড়া", desc: "কর্মচারী সম্পূর্ণ অধিকার ও পুরস্কার নিয়ে কাজ ছাড়তে পারে এমন ক্ষেত্র।" }, fil: { title: "Pag-alis ng empleyado", desc: "Mga kaso kung saan maaaring umalis ang empleyado na may buong karapatan at parusa." }, ur: { title: "ملازم کا کام چھوڑنا", desc: "وہ کیسز جہاں ملازم مکمل حقوق اور انعام کے ساتھ کام چھوڑ سکتا ہے۔" } },
  { article: "مادة 84", ar: { title: "أساس حساب المكافأة", desc: "نصف شهر عن كل سنة من أول خمس سنوات، وشهر كامل عن كل سنة بعدها." }, en: { title: "Award basis", desc: "Half a month per year for the first five years, a full month per year thereafter." }, hi: { title: "पुरस्कार आधार", desc: "पहले पाँच वर्षों के लिए प्रति वर्ष आधा माह, उसके बाद प्रति वर्ष पूर्ण माह।" }, ne: { title: "पुरस्कार आधार", desc: "पहिलो पाँच वर्षको लागि प्रति वर्ष आधा महिना, त्यसपछि प्रति वर्ष पूर्ण महिना।" }, bn: { title: "পুরস্কার ভিত্তি", desc: "প্রথম পাঁচ বছরের জন্য প্রতি বছর অর্ধেক মাস, এরপর প্রতি বছর পূর্ণ মাস।" }, fil: { title: "Batayan ng parusa", desc: "Kalahating buwan bawat taon sa unang limang taon, buong buwan bawat taon pagkatapos." }, ur: { title: "انعام کی بنیاد", desc: "پہلے پانچ سالوں کے لیے ہر سال آدھا ماہ، اس کے بعد ہر سال مکمل ماہ۔" } },
  { article: "مادة 85", ar: { title: "مكافأة الاستقالة", desc: "احتساب جزء من المكافأة بحسب مدة الخدمة عند الاستقالة." }, en: { title: "Resignation award", desc: "Partial award by tenure on resignation." }, hi: { title: "इस्तीफा पुरस्कार", desc: "इस्तीफे पर सेवा अवधि अनुसार आंशिक पुरस्कार।" }, ne: { title: "राजिनामा पुरस्कार", desc: "राजिनामामा सेवा अवधि अनुसार आंशिक पुरस्कार।" }, bn: { title: "পদত্যাগ পুরস্কার", desc: "পদত্যাগে চাকরির মেয়াদ অনুযায়ী আংশিক পুরস্কার।" }, fil: { title: "Parusa sa pagbitiw", desc: "Bahag parusa ayon sa tenure sa pagbitiw." }, ur: { title: "استعفیٰ انعام", desc: "استعفیٰ پر مدت کے مطابق جزوی انعام۔" } },
  { article: "مادة 53", ar: { title: "الإنهاء أثناء فترة التجربة", desc: "يجوز لكل من العامل وصاحب العمل إنهاء العقد خلال فترة التجربة دون إخطار أو تعويض، مع وجوب دفع أجور العامل عن المدة التي قضاها في العمل." }, en: { title: "Termination during probation", desc: "Either party may terminate during probation without notice or compensation, with wages paid for days worked." }, hi: { title: "परिवीक्षा काल में समाप्ति", desc: "परिवीक्षा काल में कोई भी पक्ष बिना सूचना या क्षतिपूर्ति समाप्त कर सकता है, कार्य दिवसों का वेतन देय।" }, ne: { title: "परिवीक्षा अवधिमा समाप्ति", desc: "परिवीक्षा अवधिमा कुनै पनि पक्षले सूचना वा क्षतिपूर्ति बिना समाप्त गर्न सक्छ, कार्य दिनको ज्याला देय।" }, bn: { title: "পরীক্ষামূলক সময়ে সমাপ্তি", desc: "পরীক্ষামূলক সময়ে যেকোনো পক্ষ নোটিশ বা ক্ষতিপূরণ ছাড়াই সমাপ্ত করতে পারে, কাজের দিনের মজুরি দেয়।" }, fil: { title: "Pagwakas sa probasyon", desc: "Maaaring wakasin ng alinmang panig sa probasyon nang walang abiso o kabayaran, kasama ang sahod na bayad sa mga araw ng trabaho." }, ur: { title: "پروفیشن کے دوران ختم", desc: "پروفیشن کے دوران کوئی بھی فریق اطلاع یا معاوضہ کے بغیر ختم کر سکتا ہے، کام کے دنوں کی تنخواہ واجب۔" } },
];

export function computeYearsOfService(hireDate, lastWorkingDate) {
  if (!hireDate || !lastWorkingDate) return 0;
  const start = new Date(hireDate);
  const end = new Date(lastWorkingDate);
  if (end < start) return 0;
  // سنوات مكتملة فعلياً (تطابق إدخال «عدد سنوات الخدمة» في حاسبة مكتب العمل)
  let years = end.getFullYear() - start.getFullYear();
  if (end.getMonth() < start.getMonth() || (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())) years--;
  if (years < 0) years = 0;
  // الجزء المتبقي (أشهر/أيام) بعد آخر ذكرى سنوية مكتملة → كسر سنة على أساس 365 يوماً
  const anniv = new Date(start);
  anniv.setFullYear(start.getFullYear() + years);
  const remMs = end - anniv;
  const remDays = remMs > 0 ? remMs / (1000 * 60 * 60 * 24) : 0;
  return years + remDays / 365;
}

export function eosSalaryBasis(employee, basis = "gross") {
  const base = Number(employee.base_salary) || 0;
  if (basis === "base_only") return base;
  return base + (Number(employee.housing_allowance) || 0) + (Number(employee.transport_allowance) || 0) + (Number(employee.other_allowances) || 0);
}

const FRACTION_LABELS = {
  ar: {
    full: "كاملة (100%)",
    noneShort: "لا شيء (أقل من سنتين)", third: "ثلث (1/3)", twoThirds: "ثلثان (2/3)", fullTenured: "كاملة (10 سنوات فأكثر)",
    notEntitled: "لا تستحق (مادة 80)",
  },
  en: {
    full: "Full (100%)",
    noneShort: "None (under 2 years)", third: "One third (1/3)", twoThirds: "Two thirds (2/3)", fullTenured: "Full (10+ years)",
    notEntitled: "Not entitled (Art. 80)",
  },
  hi: {
    full: "पूर्ण (100%)",
    noneShort: "कुछ नहीं (2 वर्ष से कम)", third: "एक-तिहाई (1/3)", twoThirds: "दो-तिहाई (2/3)", fullTenured: "पूर्ण (10+ वर्ष)",
    notEntitled: "अधिकार नहीं (अनुच्छेद 80)",
  },
  ne: {
    full: "पूर्ण (100%)",
    noneShort: "केही छैन (२ वर्षभन्दा कम)", third: "एक-तिहाई (1/3)", twoThirds: "दुई-तिहाई (2/3)", fullTenured: "पूर्ण (१०+ वर्ष)",
    notEntitled: "हक छैन (धारा ८०)",
  },
  bn: {
    full: "সম্পূর্ণ (100%)",
    noneShort: "কিছু নয় (২ বছরের কম)", third: "এক-তৃতীয়াংশ (1/3)", twoThirds: "দুই-তৃতীয়াংশ (2/3)", fullTenured: "সম্পূর্ণ (১০+ বছর)",
    notEntitled: "অধিকার নেই (ধারা ৮০)",
  },
  fil: {
    full: "Buo (100%)",
    noneShort: "Wala (under 2 years)", third: "Isang-tatlo (1/3)", twoThirds: "Dalawang-tatlo (2/3)", fullTenured: "Buo (10+ years)",
    notEntitled: "Walang karapatan (Art. 80)",
  },
  ur: {
    full: "مکمل (100%)",
    noneShort: "کچھ نہیں (2 سال سے کم)", third: "ایک-تیہائی (1/3)", twoThirds: "دو-تیہائی (2/3)", fullTenured: "مکمل (10+ سال)",
    notEntitled: "حق نہیں (مادہ 80)",
  },
};

export function computeEOS({ employee, lastWorkingDate, reason, basis = "gross" }) {
  const lang = activeLang();
  const lwd = lastWorkingDate || employee.termination_date || todayISO();
  const years = computeYearsOfService(employee.hire_date, lwd);
  const monthlyWage = eosSalaryBasis(employee, basis);
  let fullFraction = 0;
  if (years >= 1) {
    const first5 = Math.min(years, 5);
    const beyond = Math.max(0, years - 5);
    fullFraction = first5 * 0.5 + beyond * 1;
  }
  const fullEOS = monthlyWage * fullFraction;

  const category = reasonMeta(reason).category || (reason === "resignation" ? "partial" : "none");
  let amount = 0;
  let fractionLabel = "";
  const f = FRACTION_LABELS[lang] || FRACTION_LABELS.en;
  if (category === "full") {
    amount = fullEOS;
    fractionLabel = f.full;
  } else if (category === "partial") {
    if (years < 2) { amount = 0; fractionLabel = f.noneShort; }
    else if (years <= 5) { amount = fullEOS * (1 / 3); fractionLabel = f.third; }
    else if (years < 10) { amount = fullEOS * (2 / 3); fractionLabel = f.twoThirds; }
    else { amount = fullEOS; fractionLabel = f.fullTenured; }
  } else {
    amount = 0;
    fractionLabel = f.notEntitled;
  }
  const monthlyWageForDaily = monthlyWage / 30;
  return { years: years.toFixed(2), monthlyWage, dailyWage: monthlyWageForDaily, fullEOS, amount, fractionLabel, lastWorkingDate: lwd };
}

// الاشتراك يستمر في كل أنواع الإجازة. يتوقف فقط عند فسخ العقد وإنهاء الخدمة.
export function isGosiSubscriber(employee) {
  const status = String(employee?.status || "active");
  return status !== "terminated" && status !== "resigned";
}

// === التأمينات الاجتماعية (GOSI) ===
// النسبة ليست ثابتة لكل السعوديين: تختلف بحسب تاريخ تسجيل الموظف في التأمينات.
// • المسجل قبل 3 يوليو 2024: 9.75% موظف + 11.75% صاحب عمل = 21.50%
// • المسجل من 3 يوليو 2024 فصاعداً: 10.75% موظف + 12.75% صاحب عمل = 23.50% (النسب السارية من يوليو 2026)
// • المقيم: 2% مخاطر مهنية على صاحب العمل، وحصة الموظف 0%.
export const GOSI_NEW_REGISTRANT_FROM = "2024-07-03";
export const GOSI_DEFAULTS = {
  legacy_employee: 9.75, legacy_employer: 11.75,
  new_employee: 10.75, new_employer: 12.75,
  expat_employer: 2,
};

function gosiNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// تاريخ التسجيل في التأمينات = تاريخ مباشرة الموظف المسجَّل في ملفه.
export function gosiRegistrationDate(employee) {
  return String(employee?.hire_date || "").slice(0, 10);
}

// فئة الاشتراك: مقيم / سعودي مباشرته قبل 3 يوليو 2024 / سعودي مباشرته من 3 يوليو 2024.
export function gosiCategory(employee) {
  const isSaudi = Boolean(employee?.is_saudi) || isSaudiNationalId(employee?.national_id);
  if (!isSaudi) return "expat";
  const date = gosiRegistrationDate(employee);
  return date && date >= GOSI_NEW_REGISTRANT_FROM ? "saudi_new" : "saudi_legacy";
}

// جدول النسب المطبقة لكل الفئات (من ملف المنشأة، وبالنسب النظامية افتراضياً).
export function gosiRateTable(org) {
  return {
    legacy: {
      employee: gosiNum(org?.gosi_saudi_employee_rate, GOSI_DEFAULTS.legacy_employee),
      employer: gosiNum(org?.gosi_saudi_employer_rate, GOSI_DEFAULTS.legacy_employer),
    },
    fresh: {
      employee: gosiNum(org?.gosi_new_saudi_employee_rate, GOSI_DEFAULTS.new_employee),
      employer: gosiNum(org?.gosi_new_saudi_employer_rate, GOSI_DEFAULTS.new_employer),
    },
    expat: {
      employee: 0,
      employer: gosiNum(org?.gosi_expat_employer_rate, GOSI_DEFAULTS.expat_employer),
    },
  };
}

// نسب الاشتراك المطبقة على موظف بعينه (%).
export function gosiRates({ employee, org }) {
  const category = gosiCategory(employee);
  const table = gosiRateTable(org);
  const row = category === "saudi_new" ? table.fresh : category === "saudi_legacy" ? table.legacy : table.expat;
  return { category, employee_rate: row.employee, employer_rate: row.employer };
}

export function computeGOSI({ employee, org }) {
  const gross = eosSalaryBasis(employee, "gross");
  const { category, employee_rate, employer_rate } = gosiRates({ employee, org });
  return {
    category,
    isSaudi: category !== "expat",
    employee_rate,
    employer_rate,
    gosi_employee: gross * (employee_rate / 100),
    gosi_employer: gross * (employer_rate / 100),
    gross,
  };
}

export function computeSettlement({ employee, org, lastWorkingDate, reason, leaveBalance, ticketAmount }) {
  const basis = org?.eos_basis || "gross";
  const eos = computeEOS({ employee, lastWorkingDate, reason, basis });
  const lb = leaveBalance != null ? Number(leaveBalance) : (Number(employee.leave_balance) || 0);
  const leaveCash = Number((eos.dailyWage * lb).toFixed(2));
  let ticketVal = 0;
  if (ticketAmount != null && ticketAmount !== "" && Number(ticketAmount) > 0) {
    ticketVal = Number(ticketAmount);
  } else {
    const empTicket = Number(employee.ticket_value) || 0;
    if (employee.ticket_entitlement !== "none" && empTicket > 0) {
      const currentYear = new Date().getFullYear();
      const lastUsed = Number(employee.ticket_last_used_year) || 0;
      const cycle = employee.ticket_entitlement === "biennial" ? 2 : 1;
      if (currentYear - lastUsed >= cycle) ticketVal = empTicket;
    }
  }
  const total = Number((eos.amount + leaveCash + ticketVal).toFixed(2));
  return { ...eos, basis, leaveBalance: lb, leaveCash, ticketEntitlement: employee.ticket_entitlement, ticketValue: ticketVal, ticketAmount: ticketVal, total_settlement: total };
}

export function isSaudiNationalId(id) {
  if (!id) return false;
  const s = String(id).trim().replace(/\s|-/g, "");
  return /^1\d{9}$/.test(s) || s.startsWith("1");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(todayISO());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const SEVERITY_AR = {
  expired: { label: "منتهي", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "خلال 30 يوم", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "خلال 90 يوم", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "ساري", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const SEVERITY_EN = {
  expired: { label: "Expired", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "Within 30 days", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "Within 90 days", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "Active", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const SEVERITY_HI = {
  expired: { label: "समाप्त", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "30 दिन में", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "90 दिन में", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "सक्रिय", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const SEVERITY_NE = {
  expired: { label: "म्याद सकियो", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "३० दिनमा", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "९० दिनमा", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "सक्रिय", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const SEVERITY_BN = {
  expired: { label: "মেয়াদ শেষ", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "৩০ দিনে", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "৯০ দিনে", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "সক্রিয়", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const SEVERITY_FIL = {
  expired: { label: "Expired na", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "Sa loob ng 30 araw", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "Sa loob ng 90 araw", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "Aktibo", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const SEVERITY_UR = {
  expired: { label: "ختم شدہ", cls: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  critical: { label: "30 دن میں", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  soon: { label: "90 دن میں", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ok: { label: "فعال", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
export const SEVERITY = SEVERITY_AR;

export function expirySeverity(dateStr) {
  const d = daysUntil(dateStr);
  const map = { ar: SEVERITY_AR, en: SEVERITY_EN, hi: SEVERITY_HI, ne: SEVERITY_NE, bn: SEVERITY_BN, fil: SEVERITY_FIL, ur: SEVERITY_UR }[activeLang()] || SEVERITY_EN;
  if (d === null) return map.ok;
  if (d < 0) return map.expired;
  if (d <= 30) return map.critical;
  if (d <= 90) return map.soon;
  return map.ok;
}