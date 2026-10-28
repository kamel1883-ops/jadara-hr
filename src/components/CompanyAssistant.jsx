import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Sparkles, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import DraggableFab from "@/components/DraggableFab";
import ReactMarkdown from "react-markdown";
import { useSpeechInput, useSpeechOutput } from "@/hooks/useSpeech";

const AGENT = "company_assistant";

function FunctionCall({ tc }) {
  const [open, setOpen] = useState(false);
  const failed = ["failed", "error"].includes(tc.status) || /error|failed/i.test(String(tc.results || ""));
  let parsed = tc.results;
  try { if (typeof parsed === "string") parsed = JSON.parse(parsed); } catch {}
  const proj = tc.display_projection || {};
  const label = proj.label || tc.name;
  const active = proj.active_label || "جارٍ التنفيذ";
  const errLabel = proj.error_label || "فشل";
  const okLabel = proj.label || "تم";
  const hide = proj.hide_details && proj.details_redacted;
  const statusText = failed ? errLabel : (["pending", "running", "in_progress"].includes(tc.status) ? active : okLabel);
  return (
    <div className="mt-1.5 text-xs">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-violet-700 hover:text-violet-900">
        <span className={failed ? "text-rose-600" : "text-violet-500"}>{failed ? "✕" : "⚙"}</span>
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">— {statusText}</span>
      </button>
      {!hide && open && (
        <div className="mt-1.5 ps-3 border-s border-border space-y-1.5">
          {tc.arguments_string && (
            <div>
              <div className="text-muted-foreground">المدخلات:</div>
              <pre className="bg-muted/50 rounded p-2 overflow-x-auto text-[11px] whitespace-pre-wrap break-words">{(() => { try { return JSON.stringify(JSON.parse(tc.arguments_string), null, 2); } catch { return tc.arguments_string; } })()}</pre>
            </div>
          )}
          {parsed !== undefined && (
            <div>
              <div className="text-muted-foreground">النتيجة:</div>
              <pre className="bg-muted/50 rounded p-2 overflow-x-auto text-[11px] whitespace-pre-wrap break-words">{typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
        {message.tool_calls?.map((tc, i) => <FunctionCall key={i} tc={tc} />)}
      </div>
    </div>
  );
}

export default function CompanyAssistant() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const { speak } = useSpeechOutput();
  const { listening, start, stop, supported: micSupported } = useSpeechInput({
    lang: "ar-SA",
    onTranscript: (t) => setInput((p) => (p ? p + " " : "") + t),
  });

  const ensureConversation = useCallback(async () => {
    if (conversation) return conversation;
    try {
      let conv = null;
      const list = await base44.agents.listConversations({ agent_name: AGENT });
      const items = list?.data || list || [];
      conv = items[0];
      if (!conv?.id) {
        conv = await base44.agents.createConversation({
          agent_name: AGENT,
          metadata: { name: "مساعد المنشأة", description: "محادثة مساعد الموارد البشرية" },
        });
        conv = conv?.data || conv;
      }
      const full = await base44.agents.getConversation(conv.id);
      const c = full?.data || full;
      setConversation(c);
      setMessages(c?.messages || []);
      return c;
    } catch {
      return null;
    }
  }, [conversation]);

  useEffect(() => {
    if (open) ensureConversation();
  }, [open, ensureConversation]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data?.messages || []);
      setSending(false);
    });
    return () => (unsub && unsub());
  }, [conversation?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      const conv = await ensureConversation();
      if (!conv) { setSending(false); return; }
      setMessages((m) => [...m, { role: "user", content: text }]);
      await base44.agents.addMessage(conv, { role: "user", content: text });
    } catch {
      setSending(false);
    }
  };

  return (
    <>
      <DraggableFab
        storageKey="jadara_company_assistant_pos"
        onClick={() => setOpen(true)}
        className="h-14 w-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center active:scale-95"
        title="مساعد الموارد البشرية — اسحبني لأي مكان"
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
                <span className="font-semibold">مساعد الموارد البشرية</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
              {messages.length === 0 && !sending && (
                <div className="text-center text-muted-foreground text-sm mt-8 px-4 leading-relaxed">
                  أهلاً 👋 أنا مرشدك للنظام فقط — أسألني أين توجد الخدمة وكيف تستخدمها (الموافقات، الإجازات، الرواتب، التقارير...) وسأشرح لك الخطوات. لا أنفّذ عنك، بل أوجّهك للأزرار والصفحات الصحيحة.
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