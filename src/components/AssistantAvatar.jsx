import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Mic, MicOff, Volume2, Loader2, Headphones, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSpeechInput, useSpeechOutput } from "@/hooks/useSpeech";
import { Image } from "@/components/ui/image";

const AVATAR_URL = "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/a3dc65c7a_generated_image.png";

// خريطة لغة ← لغة التعرّف الصوتي + لغة النطق
const LANG_PROFILE = {
  ar: { rec: "ar-SA", tts: "ar" },
  en: { rec: "en-US", tts: "en" },
  hi: { rec: "hi-IN", tts: "hi" },
  ne: { rec: "ne-NP", tts: "ne" },
  bn: { rec: "bn-IN", tts: "bn" },
  fil: { rec: "fil-PH", tts: "fil" },
  ur: { rec: "ur-PK", tts: "ur" },
};

// رسائل الترحيب حسب البوابة واللغة
const WELCOME = {
  public: {
    ar: "أهلاً 👋 أنا «مساعد جداره». اسألني عن المنصة والباقات وكيف تبدأ تجربتك أو تسجّل الدخول للشركات/الموظفين. أوجّهك للخطوات الصحيحة ولا أنفّذ شيئاً عنك. اكتب أو اضغط الميكروفون وتحدّث معي.",
    en: "Hi 👋 I'm the Jadara Assistant. Ask me about the platform, plans, how to start your trial or sign in. I'll guide you to the right steps and won't do anything on your behalf. Type or tap the mic and talk to me.",
  },
  employee: {
    ar: "أهلاً 👋 أنا مرشدك في بوابة الموظف. اسألني كيف تطلب إجازة/سلفة/انتداب، أين تتابع طلباتك، كيف تسجّل حضورك أو تطبع مخالصتك. أشرح لك الخطوات ولا أنفّذ عنك. اكتب أو تحدّث معي صوتياً.",
    en: "Hi 👋 I'm your guide in the employee portal. Ask me how to request leave/loan/trip, where to track requests, how to clock in or print your settlement. I'll explain the steps and won't act for you. Type or talk to me.",
    hi: "नमस्ते 👋 मैं कर्मचारी पोर्टल में आपका गाइड हूँ। पूछें अवकाश/अग्रिम/यात्रा कैसे माँगें, अनुरोध कहाँ देखें, हाजिरी कैसे दर्ज करें या प्रमाण-पत्र कैसे छापें। मैं कदम बताऊँगा, आपकी ओर से कुछ नहीं करूँगा। टाइप करें या बोलें।",
    ne: "नमस्ते 👋 म कर्मचारी पोर्टलमा तपाईंको गाइड हुँ। सोध्नुहोस् बिदा/अग्रिम/भ्रमण कसरी अनुरोध गर्ने, अनुरोध कहाँ हेर्ने, हाजिरी कसरी राख्ने वा प्रमाण कसरी छाप्ने। म चरण बताऊँला, तपाईंको तर्फबाट केही गर्दिन। टाइप गर्नुहोस् वा बोल्नुहोस्।",
    bn: "নমস্কার 👋 আমি কর্মচারী পোর্টালে আপনার গাইড। জিজ্ঞাসা করুন ছুটি/অগ্রিম/সফর কীভাবে চাইবেন, অনুরোধ কোথায় দেখবেন, হাজিরা কীভাবে দেবেন বা প্রমাণ কীভাবে ছাপবেন। আমি ধাপ বলব, আপনার পক্ষে কিছু করব না। টাইপ করুন বা কথা বলুন।",
    fil: "Hi 👋 Ako ang gabay mo sa employee portal. Itanong kung paano humiling ng leave/loan/trip, saan titingnan ang requests, paano mag-clock in o i-print ang settlement. Ipapaliwanag ko ang hakbang at hindi gagawa para sa iyo. Mag-type o magsalita.",
    ur: "ہیلو 👋 میں ملازم پورٹل میں آپ کا رہنما ہوں۔ پوچھیں چھٹی/قرض/سفر کیسے مانگیں، درخواستیں کہاں دیکھیں، حاضری کیسے لگائیں یا تصفیہ کیسے پرنٹ کریں۔ میں بتاؤں گا، آپ کی طرف سے کچھ نہیں کروں گا۔ ٹائپ کریں یا بولیں۔",
  },
};

// نصوص واجهة المساعد (الأزرار/الحالات) حسب اللغة
const UI = {
  ar: { label: "مساعد جداره", title: "مساعد جداره الذكي", subtitle: "مرشد إرشادي — صوتي وكتابي", listen: "استماع", ph: "اكتب رسالتك أو تحدّث معي…", writing: "يدوّن الرد…", listening: "أستمع الآن… تحدّث واتركني أردّ عليك", speaking: "أردّ عليك بالصوت…", idle: "اضغط الميكروفون لمحادثة صوتية حقيقية — أسأل وأردّ بالصوت تلقائياً", micOff: "تحدّث (محادثة صوتية)", micOn: "إيقاف الاستماع", btnTitle: "مساعد جداره الذكي", hintTry: "💡 جرّب: اضغط الميكروفون وتحدّث، وسأرد عليك بالصوت ثم أستمع لسؤالك التالي تلقائياً." },
  en: { label: "Jadara Assistant", title: "Jadara Smart Assistant", subtitle: "Guidance only — voice & text", listen: "Listen", ph: "Type your message or talk to me…", writing: "typing…", listening: "Listening… talk and I'll reply", speaking: "Replying by voice…", idle: "Tap the mic for a real voice chat — ask and I'll reply aloud", micOff: "Talk (voice chat)", micOn: "Stop listening", btnTitle: "Jadara Smart Assistant", hintTry: "💡 Tip: tap the mic and speak — I'll reply aloud then listen for your next question." },
  hi: { label: "जदारा सहायक", title: "जदारा स्मार्ट सहायक", subtitle: "केवल मार्गदर्शन — आवाज़ और टेक्स्ट", listen: "सुनें", ph: "अपना संदेश लिखें या बोलें…", writing: "लिख रहा हूँ…", listening: "सुन रहा हूँ… बोलिए, मैं जवाब दूँगा", speaking: "आवाज़ से जवाब दे रहा हूँ…", idle: "माइक दबाकर बोलें — मैं आवाज़ से जवाब दूँगा फिर अगला सवाल सुनूँगा", micOff: "बोलें (आवाज़ चैट)", micOn: "सुनना बंद करें", btnTitle: "जदारा स्मार्ट सहायक", hintTry: "💡 टिप: माइक दबाकर बोलें — मैं आवाज़ से जवाब दूँगा और अगला प्रश्न सुनूँगा।" },
  ne: { label: "जदारा सहायक", title: "जदारा स्मार्ट सहायक", subtitle: "केवल मार्गदर्शन — आवाज़ र टेक्स्ट", listen: "सुन्नुहोस्", ph: "सन्देश टाइप गर्नुहोस् वा बोल्नुहोस्…", writing: "लेख्दै…", listening: "सुन्दै… बोल्नुहोस्, म जवाफ दिन्छु", speaking: "आवाज़ले जवाफ दिँदै…", idle: "माइक थिचेर बोल्नुहोस् — म आवाज़ले जवाफ दिन्छु र अर्को प्रश्न सुन्छु", micOff: "बोल्नुहोस् (आवाज़ च्याट)", micOn: "सुन्न बन्द गर्नुहोस्", btnTitle: "जदारा स्मार्ट सहायक", hintTry: "💡 टिप: माइक थिचेर बोल्नुहोस् — म आवाज़ले जवाफ दिन्छु र अर्को प्रश्न सुन्छु।" },
  bn: { label: "জাদারা সহকারী", title: "জাদারা স্মার্ট সহকারী", subtitle: "শুধু গাইড — ভয়েস ও টেক্স্ট", listen: "শুনুন", ph: "আপনার বার্তা লিখুন বা বলুন…", writing: "লিখছি…", listening: "শুনছি… বলুন, আমি উত্তর দেব", speaking: "ভয়েসে উত্তর দিচ্ছি…", idle: "মাইক চেপে বলুন — আমি ভয়েসে উত্তর দেব তারপর পরের প্রশ্ন শুনব", micOff: "বলুন (ভয়েস চ্যাট)", micOn: "শোনা বন্ধ করুন", btnTitle: "জাদারা স্মার্ট সহকারী", hintTry: "💡 টিপ: মাইক চেপে বলুন — আমি ভয়েসে উত্তর দেব এবং পরের প্রশ্ন শুনব।" },
  fil: { label: "Jadara Assistant", title: "Jadara Smart Assistant", subtitle: "Gabay lamang — boses at text", listen: "Pakinggan", ph: "I-type ang mensahe o magsalita…", writing: "nagtatype…", listening: "Nakikinig… magsalita at sasagot ako", speaking: "Sumasagot sa boses…", idle: "Pindutin ang mic at magsalita — sasagot ako sa boses at pakikinig ang susunod", micOff: "Magsalita (voice chat)", micOn: "Itigil ang pakikinig", btnTitle: "Jadara Smart Assistant", hintTry: "💡 Tip: pindutin ang mic at magsalita — sasagot ako sa boses at pakikinig sa susunod." },
  ur: { label: "جدارہ اسسٹنٹ", title: "جدارہ سمارٹ اسسٹنٹ", subtitle: "صرف رہنمائی — آواز اور ٹیکسٹ", listen: "سنیں", ph: "اپنا پیغام ٹائپ کریں یا بولیں…", writing: "لکھ رہا ہے…", listening: "سن رہا ہوں… بولیں، میں جواب دوں گا", speaking: "آواز سے جواب دے رہا ہوں…", idle: "مائیک دبائیں اور بولیں — میں آواز سے جواب دوں گا پھر اگلا سوال سنوں گا", micOff: "بولیں (آواز چیٹ)", micOn: "سننا بند کریں", btnTitle: "جدارہ سمارٹ اسسٹنٹ", hintTry: "💡 ٹپ: مائیک دبائیں اور بولیں — میں آواز سے جواب دوں گا اور اگلا سوال سنوں گا۔" },
};

function Bubble({ message, onSpeak, hideListen, listenLabel }) {
  const isUser = message.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div className={"max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm " + (isUser ? "bg-violet-600 text-white" : "bg-white border border-border")}>
        {message.content && (isUser
          ? <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          : <div className="prose prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"><ReactMarkdown>{message.content}</ReactMarkdown></div>)}
        {!isUser && message.content && !hideListen && (
          <button onClick={() => onSpeak(message.content)} className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800">
            <Volume2 size={13} /> {listenLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AssistantAvatar({ mode = "public", session = null, tone = "light", lang = "ar" }) {
  const profile = LANG_PROFILE[lang] || LANG_PROFILE.ar;
  const ui = UI[lang] || UI.ar;
  const welcome = (WELCOME[mode] && (WELCOME[mode][lang] || WELCOME[mode].ar)) || "";
  const isRtl = lang === "ar" || lang === "ur";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const fromMicRef = useRef(false);
  const stopLoopRef = useRef(false);

  // === ودجت المساعد قابل للسحب (touch + mouse) مع حفظ الموضع ===
  const POS_KEY = "jadara_assistant_pos";
  const readPos = () => {
    try { const p = JSON.parse(localStorage.getItem(POS_KEY) || "null"); if (p && typeof p.x === "number") return p; } catch (_e) {}
    return null;
  };
  // الموضع الافتراضي أسفل الشاشة — لا يغطي عنوان الصفحة أو نص الوصف (خاصةً على الجوال)
  const defaultPos = () => {
    const h = typeof window !== "undefined" ? window.innerHeight : 640;
    return { x: 20, y: Math.max(120, h - 140) };
  };
  const [pos, setPos] = useState(() => readPos() || defaultPos());
  const dragRef = useRef(null);
  const dragging = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0, pointerId: null });

  const clampPos = (x, y) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 360;
    const h = typeof window !== "undefined" ? window.innerHeight : 640;
    const SIZE = 92; // تقدير حجم الودجت
    return {
      x: Math.max(8, Math.min(x, w - SIZE - 8)),
      y: Math.max(8, Math.min(y, h - SIZE - 8)),
    };
  };

  const onPointerDown = (e) => {
    // لا تعطل النقر الافتتاحي عند الضغط العادي — نسجّل البداية فقط
    startRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, pointerId: e.pointerId };
    movedRef.current = false;
    dragging.current = true;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_e) {}
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; // عتبة لتمييز السحب عن النقر
    movedRef.current = true;
    setPos(clampPos(startRef.current.px + dx, startRef.current.py + dy));
  };

  const onPointerUp = (e) => {
    dragging.current = false;
    try { e.currentTarget?.releasePointerCapture?.(e.pointerId); } catch (_e) {}
    if (movedRef.current) {
      setPos((p) => { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch (_e) {} return p; });
    }
  };

  const onBtnClick = () => {
    if (movedRef.current) { movedRef.current = false; return; } // تجاهل النقر بعد سحب
    setOpen(true);
  };

  const onSpokeEnd = useCallback(() => {
    if (fromMicRef.current && !stopLoopRef.current) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { speak, speaking, stopSpeak } = useSpeechOutput({ onEnded: onSpokeEnd, lang: profile.tts });

  const handleTranscript = useCallback((t) => {
    if (!t) return;
    fromMicRef.current = true;
    stopLoopRef.current = false;
    sendText(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { listening, start, stop, supported: micSupported } = useSpeechInput({
    lang: profile.rec,
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const canRun = mode === "employee" ? !!(session?.token && session?.employee_id) : true;

  const sendText = async (override) => {
    const text = (override !== undefined ? override : input).trim();
    if (!text || sending || !canRun) return;
    const next = [...messages, { role: "user", content: override !== undefined ? override : text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const history = next.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      let payload, fnName;
      if (mode === "employee") {
        fnName = "employeeAssistant";
        payload = { token: session.token, employee_id: session.employee_id, message: text, history, lang };
      } else {
        fnName = "publicAssistant";
        payload = { message: text, history, lang };
      }
      const res = await base44.functions.invoke(fnName, payload);
      const data = res?.data || res;
      const reply = (data?.reply || (ui.lang === "en" ? "Sorry, I couldn't reply now. Try again." : "تعذّر الرد الآن. حاول مجدداً.")).trim();
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (fromMicRef.current) speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: (lang === "en" ? "Couldn't reach the assistant. Check your connection and try again." : "تعذّر الاتصال بالمساعد. تأكد من اتصالك ثم حاول مجدداً.") }]);
    } finally {
      setSending(false);
    }
  };

  const toggleMic = () => {
    if (listening) {
      stopLoopRef.current = true;
      stop();
    } else {
      fromMicRef.current = true;
      stopLoopRef.current = false;
      start();
    }
  };

  const typeSend = () => {
    fromMicRef.current = false;
    stopLoopRef.current = true;
    if (speaking) stopSpeak();
    sendText();
  };

  const close = () => {
    stopLoopRef.current = true;
    if (listening) stop();
    if (speaking) stopSpeak();
    setOpen(false);
  };

  if (mode === "employee" && !session) return null;

  const ringOnLight = tone === "light";
  const btnRing = ringOnLight
    ? "ring-2 ring-amber-300/60 shadow-lg shadow-amber-900/20"
    : "ring-2 ring-violet-300/60 shadow-lg shadow-violet-900/20";

  return (
    <>
      {/* علامة المساعد — شخصية سعودية، قابلة للسحب لأي زاوية */}
      <button
        ref={dragRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onBtnClick}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className={"fixed z-40 group flex flex-col items-center gap-1.5 transition active:scale-95 select-none"}
        title={ui.btnTitle}
        aria-label={ui.btnTitle}
      >
        <span className={"relative flex h-20 w-20 rounded-full overflow-hidden bg-slate-200 " + btnRing}>
          <Image src={AVATAR_URL} fittingType="fill" className="h-full w-full object-cover" />
          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        </span>
        <span className={"text-xs font-semibold px-2 rounded-full " + (ringOnLight ? "bg-amber-50/90 text-amber-700" : "bg-white/90 text-violet-700")}>{ui.label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-start">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="relative w-full sm:max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
            <div className="h-16 flex items-center justify-between px-4 border-b bg-[#0b1120] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-amber-300/50">
                  <Image src={AVATAR_URL} fittingType="fill" className="h-full w-full object-cover" />
                </span>
                <div className="leading-tight">
                  <div className="font-semibold text-sm">{ui.title}</div>
                  <div className="text-[11px] text-white/50">{ui.subtitle}</div>
                </div>
              </div>
              <button onClick={close} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
              {messages.length === 0 && !sending && (
                <div className="text-center text-muted-foreground text-sm mt-8 px-4 leading-relaxed">
                  {welcome}
                  <div className="mt-3 text-xs text-muted-foreground/80">{ui.hintTry}</div>
                </div>
              )}
              {messages.map((m, i) => <Bubble key={i} message={m} onSpeak={speak} hideListen={m.role === "assistant" && fromMicRef.current} listenLabel={ui.listen} />)}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-2xl px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> {ui.writing}
                  </div>
                </div>
              )}
              {speaking && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-2xl px-3.5 py-2.5 text-sm text-violet-600 flex items-center gap-2">
                    <Volume2 size={14} className="animate-pulse" /> {ui.speaking}
                  </div>
                </div>
              )}
            </div>

            {/* شريط الإدخال */}
            <div className="border-t bg-background p-2.5 flex items-end gap-2 shrink-0">
                <button
                  onClick={toggleMic}
                  className={"shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border " + (listening ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100")}
                  title={listening ? ui.micOn : ui.micOff}
                >
                  {listening ? <Square size={16} /> : <Mic size={18} />}
                </button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); typeSend(); } }}
                placeholder={ui.ph}
                rows={1}
                className="resize-none max-h-32 flex-1"
              />
              <Button onClick={typeSend} disabled={!input.trim() || sending} size="sm" className="h-10 w-10 p-0 shrink-0"><Send size={18} /></Button>
            </div>
            <div className="px-3 pb-2 text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
              <Headphones size={12} />
              {listening ? ui.listening : speaking ? ui.speaking : ui.idle}
            </div>
          </div>
        </div>
      )}
    </>
  );
}