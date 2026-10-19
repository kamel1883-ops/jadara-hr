import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Building2, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";

const SCALE_AR = ["", "1 — ضعيف جدًا", "2 — ضعيف", "3 — مقبول", "4 — جيد", "5 — ممتاز"];
const SCALE_EN = ["", "1 — Very poor", "2 — Poor", "3 — Fair", "4 — Good", "5 — Excellent"];

export default function CustomerSurveyTake() {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [unified, setUnified] = useState("");
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getCustomerSurvey", { survey_id: surveyId });
        if (!res?.data?.ok) {
          if (res?.data?.closed) setClosed(true);
          else setNotFound(true);
          return;
        }
        setSurvey(res.data.survey);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  const submit = async () => {
    setError("");
    const em = email.trim().toLowerCase();
    const u = unified.replace(/\D/g, "");
    if (!em) { setError("أدخل البريد الإلكتروني"); return; }
    if (!/^7\d{9}$/.test(u)) { setError("أدخل الرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7)"); return; }
    if (!captchaToken) { setError("أكّد أنك لست روبوت"); return; }
    const qs = survey.questions || [];
    if (qs.length === 0) { setError("الاستبيان فارغ"); return; }
    const answers = qs.map((q, i) => ({ questionIndex: i, rating: Number(ratings[i] || 0) }));
    if (answers.some(a => a.rating < 1 || a.rating > 5)) { setError("قيّم جميع الأسئلة من 1 إلى 5"); return; }

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitCustomerSurvey", {
        survey_id: surveyId,
        unified_number: u,
        email: em,
        answers,
        comment,
        turnstileToken: captchaToken,
      });
      const d = res?.data || {};
      if (d.ok) { setDone(true); return; }
      if (d.already) { setError("لقد شاركت في هذا الاستبيان سابقاً. شكراً لك!"); return; }
      if (d.suspended) { setError("حالة اشتراك منشأتك غير نشطة حاليًا."); return; }
      if (d.closed) { setError("هذا الاستبيان مغلق ولم يعد يقبل الردود."); return; }
      setError(d.captcha === false ? "تعذّر التحقّق من أنك لست روبوت. عاود المحاولة." : "بيانات المنشأة غير مطابقة. تأكد من البريد والرقم الوطني الموحد.");
    } catch (e) {
      setError(e?.message || "تعذّر الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> جارٍ التحميل...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8] p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-border p-8">
          <AlertTriangle className="mx-auto text-rose-500 mb-3" size={36} />
          <h1 className="text-lg font-bold mb-1">الاستبيان غير موجود</h1>
          <p className="text-sm text-muted-foreground mb-4">قد يكون الرابط غير صحيح أو محذوف.</p>
          <Link to="/"><Button variant="outline">العودة للرئيسية</Button></Link>
        </div>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8] p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-border p-8">
          <Lock className="mx-auto text-slate-400 mb-3" size={36} />
          <h1 className="text-lg font-bold mb-1">الاستبيان مغلق</h1>
          <p className="text-sm text-muted-foreground mb-4">لم يعد يقبل ردودًا. شكراً لاهتمامك.</p>
          <Link to="/"><Button variant="outline">العودة للرئيسية</Button></Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8] p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-border p-8">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40} />
          <h1 className="text-lg font-bold mb-1">شكراً لمشاركتك!</h1>
          <p className="text-sm text-muted-foreground mb-4">تم استلام تقييمك ووصوله لإدارة جداره.</p>
          <Link to="/"><Button variant="outline">العودة للرئيسية</Button></Link>
        </div>
      </div>
    );
  }

  const qs = survey?.questions || [];

  return (
    <div className="min-h-screen bg-[#fcfaf8] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* header */}
          <div className="bg-[#1b1e32] text-white px-6 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Building2 size={20} /></div>
            <div>
              <div className="font-bold text-lg">{survey?.title || "استبيان تجربة العميل"}</div>
              <div className="text-xs text-white/70">جداره — منصة الموارد البشرية</div>
            </div>
          </div>

          <div className="p-6">
            {survey?.description && <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{survey.description}</p>}

            {/* questions */}
            <div className="space-y-5">
              {qs.map((q, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="font-medium text-sm mb-2">{i + 1}. {q.text}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5].map(n => {
                      const active = Number(ratings[i]) === n;
                      return (
                        <button type="button" key={n} onClick={() => setRatings({ ...ratings, [i]: n })}
                          className={`flex items-center justify-center w-10 h-10 rounded-lg border text-sm font-semibold transition ${active ? "bg-[#1b1e32] text-white border-[#1b1e32]" : "bg-white border-border hover:bg-slate-50"}`}>
                          {n}
                        </button>
                      );
                    })}
                    <div className="ml-1 flex items-center">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={16} className={n <= Number(ratings[i] || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">البريد الإلكتروني للمنشأة</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11" dir="ltr" placeholder="you@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">الرقم الوطني الموحد للمنشآت (١٠ خانات تبدأ بـ٧)</Label>
                <Input inputMode="numeric" value={unified} onChange={e => setUnified(e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-11" dir="ltr" placeholder="7XXXXXXXXX" />
              </div>
            </div>

            <div className="space-y-1.5 mt-3">
              <Label className="text-xs text-muted-foreground">التحسينات التي توصي بها (اختياري)</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="ما الذي يمكننا تحسينه لخدمتك بشكل أفضل؟" />
              <p className="text-[11px] text-emerald-700">وسنعمل جاهدين لنلبي طلباتكم.</p>
            </div>

            <div className="mt-4">
              <TurnstileWidget onToken={setCaptchaToken} />
            </div>

            {error && <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

            <Button onClick={submit} disabled={submitting || !captchaToken} className="w-full h-12 mt-4 gap-1.5">
              {submitting ? <><Loader2 className="animate-spin" /> جارٍ الإرسال...</> : "إرسال التقييم"}
            </Button>

            <div className="text-center mt-3">
              <Link to="/" className="text-xs text-muted-foreground hover:underline">العودة للرئيسية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}