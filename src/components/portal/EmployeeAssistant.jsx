import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Sparkles, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import DraggableFab from "@/components/DraggableFab";
import ReactMarkdown from "react-markdown";
import { useSpeechInput, useSpeechOutput } from "@/hooks/useSpeech";

function Bubble({ message, onSpeak }) {
  const isUser = message.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div className={"max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm " + (isUser ? "bg-violet-600 text-white" : "bg-white border border-border")}>
        {message.content && (isUser
          ? <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          : <div className="prose prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"><ReactMarkdown>{message.content}</ReactMarkdown></div>)}
        {!isUser && message.content && (
          <button onClick={() => onSpeak(message.content)} className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800">
            <Volume2 size={13} /> استماع
          </button>
        )}
      </div>
    </div>
  );
}

export default function EmployeeAssistant({ session }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const { speak } = useSpeechOutput();
  const { listening, start, stop, supported: micSupported } = useSpeechInput({
    lang: "ar-SA",
    onTranscript: (t) => setInput((p) => (p ? p + " " : "") + t),
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  if (!session) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await base44.functions.invoke("employeeAssistant", {
        token: session.token,
        employee_id: session.employee_id,
        message: text,
        history: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      });
      const data = res?.data || res;
      const reply = (data?.reply || "تعذّر الرد الآن. حاول مجدداً.").trim();
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الاتصال بالمساعد. تأكد من اتصالك ثم حاول مجدداً." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DraggableFab
        storageKey="jadara_employee_assistant_pos"
        onClick={() => setOpen(true)}
        className="h-14 w-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center active:scale-95"
        title="مساعد الموظف — اسحبني لأي مكان"
      >
        <Sparkles size={24} />
      </DraggableFab>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-start">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col" dir="rtl">
            <div className="h-14 flex items-center justify-between px-4 border-b bg-[#0b1120] text-white shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-violet-300" />
                <span className="font-semibold">مساعد الموظف</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
              {messages.length === 0 && !sending && (
                <div className="text-center text-muted-foreground text-sm mt-8 px-4 leading-relaxed">
                  أهلاً 👋 أنا مرشدك في البوابة فقط — اسألني كيف تطلب إجازة/سلفة/انتداب، أين تتابع طلباتك، كيف تسجّل حضورك أو تطبع مخالصتك. أشرح لك الخطوات والأزرار، ولا أنفّذ عنك شيئاً.
                </div>
              )}
              {messages.map((m, i) => <Bubble key={i} message={m} onSpeak={speak} />)}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-2xl px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> يدوّن الرد…
                  </div>
                </div>
              )}
            </div>
            <div className="border-t bg-background p-2.5 flex items-end gap-2 shrink-0">
              {micSupported && (
                <button
                  onClick={() => (listening ? stop() : start())}
                  className={"shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border " + (listening ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" : "bg-muted border-border text-muted-foreground hover:bg-muted/70")}
                  title={listening ? "إيقاف الاستماع" : "تحدّث"}
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="اكتب رسالتك…"
                rows={1}
                className="resize-none max-h-32 flex-1"
              />
              <Button onClick={send} disabled={!input.trim() || sending} size="sm" className="h-10 w-10 p-0 shrink-0"><Send size={18} /></Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}