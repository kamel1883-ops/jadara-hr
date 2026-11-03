# -*- coding: utf-8 -*-
"""Jadara HR – Employee Portal user guide (Arabic + English), A4 PDF via fpdf2."""
import os
from fpdf import FPDF
from fpdf.fonts import FontFace
import arabic_reshaper
from bidi.algorithm import get_display

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "Jadara-Employee-Portal-Guide.pdf")

_reshaper = arabic_reshaper.ArabicReshaper(
    configuration={"delete_harakat": False, "support_ligatures": True}
)

def AR(s):
    # Identity: fpdf2 + HarfBuzz renders logical-order Arabic natively
    # (correct wrapping and line order), so no pre-shaping is needed.
    return "" if s is None else str(s)

VIOLET = (124, 58, 237)
DARK = (42, 35, 64)
GRAY = (110, 108, 125)
LIGHT = (245, 240, 255)
GREEN_BG = (236, 253, 245)
GREEN_TX = (4, 120, 87)
AMBER_BG = (255, 251, 235)
AMBER_TX = (146, 64, 14)
ROSE_BG = (255, 241, 242)
ROSE_TX = (190, 18, 60)
SLATE_BG = (248, 250, 252)

class Guide(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.add_font("amiri", "", os.path.join(BASE, "fonts", "Amiri-Regular.ttf"))
        self.add_font("amiri", "B", os.path.join(BASE, "fonts", "Amiri-Bold.ttf"))
        self.set_auto_page_break(True, margin=20)
        self.set_margins(18, 16, 18)

    def multi_cell(self, w, h=None, text="", *args, **kwargs):
        # multi_cell leaves the cursor at the right edge by default, which
        # makes the next multi_cell(0, ...) compute a zero width. Always
        # return to the left margin unless the caller says otherwise.
        kwargs.setdefault("new_x", "LMARGIN")
        kwargs.setdefault("new_y", "NEXT")
        return super().multi_cell(w, h, text, *args, **kwargs)

    def _ar_mode(self):
        self.set_text_shaping(True, script="arab", direction="rtl")

    def _en_mode(self):
        self.set_text_shaping(False)

    def footer(self):
        self._en_mode()
        self.set_y(-15)
        self.set_font("amiri", "", 8.5)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f"Jadara HR  |  Employee Portal Guide  |  {self.page_no()}", align="C")

    # ---------- primitives ----------
    def gap(self, h=3):
        self.ln(h)

    def h1(self, ar, en, num=None):
        self.ln(4)
        if self.get_y() > 235:
            self.add_page()
        self.set_font("amiri", "B", 18)
        self.set_text_color(*VIOLET)
        tag = f"{AR('الفصل')} {num} : " if num else ""
        self._ar_mode()
        self.multi_cell(0, 9, tag + AR(ar), align="R")
        self._en_mode()
        self.set_font("amiri", "", 11)
        self.set_text_color(*GRAY)
        self.multi_cell(0, 6.5, en, align="L")
        y = self.get_y()
        self.set_draw_color(*VIOLET)
        self.set_line_width(0.9)
        self.line(18, y + 1, 192, y + 1)
        self.ln(5)
        try:
            self.start_section(f"{ar} – {en}", level=0)
        except Exception:
            pass

    def h2(self, ar=None, en=None):
        if self.get_y() > 250:
            self.add_page()
        if ar:
            self._ar_mode()
            self.set_font("amiri", "B", 13)
            self.set_text_color(*DARK)
            self.multi_cell(0, 7.5, AR(ar), align="R")
        if en:
            self._en_mode()
            self.set_font("amiri", "B", 12)
            self.set_text_color(*DARK)
            self.multi_cell(0, 7, en, align="L")
        self.ln(1)

    def p(self, ar=None, en=None, size=11):
        if ar:
            self._ar_mode()
            self.set_font("amiri", "", size)
            self.set_text_color(*DARK)
            self.multi_cell(0, size * 0.62, AR(ar), align="R")
            self.ln(1)
        if en:
            self._en_mode()
            self.set_font("amiri", "", size - 0.5)
            self.set_text_color(60, 60, 70)
            self.multi_cell(0, (size - 0.5) * 0.62, en, align="L")
            self.ln(1)

    def bullets(self, items_ar=None, items_en=None, size=11):
        if items_ar:
            self._ar_mode()
            self.set_font("amiri", "", size)
            self.set_text_color(*DARK)
            for it in items_ar:
                self.multi_cell(0, size * 0.62, AR("\u2022  " + it), align="R")
            self.ln(1.5)
        if items_en:
            self._en_mode()
            self.set_font("amiri", "", size - 0.5)
            self.set_text_color(60, 60, 70)
            for it in items_en:
                self.multi_cell(0, (size - 0.5) * 0.62, "\u2022  " + it, align="L")
            self.ln(1.5)

    def steps(self, items_ar=None, items_en=None, size=11):
        if items_ar:
            self._ar_mode()
            self.set_font("amiri", "", size)
            self.set_text_color(*DARK)
            for i, it in enumerate(items_ar, 1):
                self.multi_cell(0, size * 0.62, AR(f"{i}. {it}"), align="R")
            self.ln(1.5)
        if items_en:
            self._en_mode()
            self.set_font("amiri", "", size - 0.5)
            self.set_text_color(60, 60, 70)
            for i, it in enumerate(items_en, 1):
                self.multi_cell(0, (size - 0.5) * 0.62, f"{i}. {it}", align="L")
            self.ln(1.5)

    def box(self, ar=None, en=None, kind="tip"):
        bg, tx, label_ar, label_en = {
            "tip": (GREEN_BG, GREEN_TX, "نصيحة", "Tip"),
            "warn": (AMBER_BG, AMBER_TX, "تنبيه", "Attention"),
            "err": (ROSE_BG, ROSE_TX, "مهم", "Important"),
            "info": (LIGHT, VIOLET, "معلومة", "Note"),
        }[kind]
        self.set_fill_color(*bg)
        x0 = self.l_margin
        w = self.epw
        y0 = self.get_y()
        if self.get_y() > 245:
            self.add_page()
            y0 = self.get_y()
        self.set_fill_color(*bg)
        if ar:
            self._ar_mode()
            self.set_font("amiri", "B", 11)
            self.set_text_color(*tx)
            self.multi_cell(0, 6.8, AR(label_ar + " :"), align="R", fill=True)
            self.set_font("amiri", "", 11)
            self.set_text_color(*DARK)
            self.multi_cell(0, 6.8, AR(ar), align="R", fill=True)
        if en:
            self._en_mode()
            self.set_font("amiri", "B", 10.5)
            self.set_text_color(*tx)
            self.multi_cell(0, 6.5, label_en + ":", align="L", fill=True)
            self.set_font("amiri", "", 10.5)
            self.set_text_color(60, 60, 70)
            self.multi_cell(0, 6.5, en, align="L", fill=True)
        y1 = self.get_y()
        self.set_draw_color(*tx)
        self.set_line_width(1.1)
        edge = 190 if ar else 18
        self.line(edge, y0, edge, y1)
        self.ln(2)

    def grid(self, headers, rows, widths=None, rtl=True):
        if rtl:
            self._ar_mode()
        else:
            self._en_mode()
        if self.get_y() > 220:
            self.add_page()
        n = len(headers)
        if widths is None:
            widths = [self.epw / n] * n
        style_head = FontFace(emphasis="BOLD", color=VIOLET, fill_color=LIGHT)
        style_row = FontFace(fill_color=(255, 255, 255))
        style_alt = FontFace(fill_color=SLATE_BG)
        align = "RIGHT" if rtl else "LEFT"
        with self.table(
            col_widths=tuple(widths),
            text_align=align,
            line_height=7,
            first_row_as_headings=True,
            headings_style=style_head,
            width=self.epw,
        ) as t:
            for j, row in enumerate([headers] + rows):
                r = t.row()
                for cell in row:
                    r.cell(cell, style=style_row if j == 0 or j % 2 == 0 else style_alt)
        self.ln(3)


# =====================================================================
# CONTENT – Arabic part
# =====================================================================
AR_CHAPTERS = [
("قبل أن تبدأ : ما هي بوابة الموظف؟",
 "What is the employee portal?",
 [
  ("p",
   "بوابة الموظف هي صفحتك الخاصة في نظام جدارة للموارد البشرية. منها تنجز كل تعاملاتك مع المنشأة دون مراجعة الإدارة : تسجيل الحضور والانصراف، طلب الإجازات والسلف والانتدابات والعهد، متابعة أرصدتك وراتبك، وقراءة التعميمات والإنذارات ومحاضر التحقيق والرد عليها.",
   None),
  ("bullets",
   ["تعمل على الجوال والكمبيوتر من المتصفح مباشرة دون تثبيت أي تطبيق.",
    "تدعم العربية والإنجليزية وخمس لغات أخرى، ويمكن تبديل اللغة في أي وقت من أعلى الصفحة.",
    "تسجيل خروج تلقائي عند ترك الصفحة خاملة لفترة حفاظاً على بياناتك، فأعد الدخول عند الحاجة.",
    "اسحب الشاشة للأسفل في أي وقت لتحديث البيانات.",
    "زر المساعد الذكي العائم يجيب عن استفساراتك حول النظام.",
    "رابط البوابة تحصل عليه من إدارة الموارد البشرية في منشأتك."],
   None),
 ]),

("الدخول وإنشاء الحساب",
 "Sign in and account setup",
 [
  ("h2", "أول مرة : إنشاء حسابك", None),
  ("steps",
   ["افتح رابط البوابة ثم اختر تبويب «إنشاء حساب».",
    "أدخل رقم الهوية أو الإقامة المسجل لدى الموارد البشرية.",
    "أدخل تاريخ ميلادك مرة واحدة للتحقق من هويتك.",
    "اختر كلمة مرور لا تقل عن 6 أحرف وأكدها.",
    "أكمل التحقق البشري ثم اضغط زر الإنشاء، وبعدها سجل الدخول من تبويب «دخول»."],
   None),
  ("h2", "تسجيل الدخول اليومي", None),
  ("steps",
   ["اختر تبويب «دخول».",
    "أدخل رقم الهوية أو الإقامة وكلمة المرور.",
    "أكمل التحقق البشري ثم اضغط «تسجيل الدخول»."],
   None),
  ("h2", "نسيت كلمة المرور", None),
  ("steps",
   ["اختر تبويب «نسيت كلمة المرور» وأدخل رقم الهوية.",
    "سيصلك رمز تحقق على بريدك الإلكتروني المسجل لدى الموارد البشرية.",
    "أدخل الرمز ثم عيّن كلمة مرور جديدة وأكدها."],
   None),
  ("box",
   "إن ظهرت لك رسالة بأن الحساب غير مسجل فسجل حسابك أولاً من تبويب «إنشاء حساب». وإن ظهر أن الحساب غير نشط فراجع الموارد البشرية. كلمة المرور تُستخدم مع رقم الهوية فقط، ولا يراها أحد غيرك.",
   None, "warn"),
 ]),

("صفحتك الرئيسية : بطاقتك وبياناتك",
 "Your home page",
 [
  ("p",
   "أعلى الصفحة تجد بطاقة المنشأة : شعارها واسمها، ثم رقمك الوظيفي ومسماك وقسمك. وإن كنت مديراً مباشراً أو معتمداً مالياً ستظهر شارة بصلاحيتك بجانب البطاقة.",
   None),
  ("bullets",
   ["بطاقة سنوات الخدمة : مدة خدمتك محسوبة من تاريخ المباشرة.",
    "بطاقة رصيد الإجازات : المتبقي لك من الإجازات السنوية مع المستحق والمستخدم.",
    "بطاقة الراتب الإجمالي : مجموع الأساسي والبدلات.",
    "بطاقة استحقاق التذكرة : سنوي أو كل سنتين أو لا يستحق، مع توضيح سعودي أو مقيم."],
   None),
  ("p",
   "تحت البطاقات تجد بطاقة «بياناتي» بتفاصيل راتبك : الأساسي وبدل السكن وبدل النقل والبدلات الأخرى والإجمالي، إضافة إلى المسمى والقسم وتاريخ المباشرة ونوع العقد. وفي أعلى المحتوى ثلاثة تبويبات : «خدماتي» لطلباتك وبياناتك، و«التنبيهات» لإشعاراتك، و«الاعتمادات» وتظهر فقط لمن لديه صلاحية اعتماد.",
   None),
 ]),

("تسجيل الحضور والانصراف (البصمة اليومية)",
 "Daily check-in and check-out",
 [
  ("p",
   "قسم «البصمة اليومية» يسجل حضورك من موقع مقر العمل فقط. يعرض القسم الوقت الحالي والدوام الرسمي للمنشأة أو فرعك، ووقتي حضورك وانصرافك المسجلين اليوم.",
   None),
  ("h2", "خطوات يومك", None),
  ("steps",
   ["فعّل خدمة الموقع (GPS) في جهازك واسمح للمتصفح بالوصول إليه.",
    "إن كنت تعمل في أكثر من فرع فاختر فرع البصمة من القائمة قبل التسجيل.",
    "اضغط «تسجيل الحضور» عند وصولك. يجب أن تكون داخل نطاق المقر (50 متراً افتراضياً).",
    "للاستراحة اضغط «بدء استراحة»، وعند العودة اضغط «مواصلة الدوام».",
    "عند نهاية الدوام اضغط «تسجيل الانصراف». لا يمكن الانصراف وأنت على استراحة.",
    "تُحسب ساعات عملك تلقائياً بعد خصم الاستراحات، ويُحتسب التأخير حسب بداية الدوام وفترة السماح."],
   None),
  ("h2", "سجل حضورك", None),
  ("p",
   "تحت البصمة جدول بسجلات أيامك : التاريخ ووقت الحضور ووقت الانصراف وعدد الساعات والحالة (حاضر أو متأخر أو غائب).",
   None),
  ("box",
   "إن ظهرت رسالة بأنك خارج النطاق فستعرض لك المسافة بالأمتار، فاقترب من المقر وأعد المحاولة. النظام يكشف تطبيقات تزييف الموقع ويرفض التسجيل معها، فأغلقها أولاً. وإن ظهر أن المقر غير محدد فراجع الموارد البشرية لتحديد موقع مقر العمل.",
   None, "err"),
 ]),

("طلب إجازة جديدة",
 "Requesting leave",
 [
  ("p",
   "اضغط زر «طلب إجازة» أعلى الصفحة. املأ نوع الإجازة وتاريخ المغادرة (آخر يوم عمل) وتاريخ العودة (استئناف العمل)، وستُحسب الأيام تلقائياً. الإجازة المرضية تتطلب إرفاق التقرير الطبي.",
   None),
  ("h2", "أنواع الإجازات", None),
  ("table",
   ["النوع", "مدفوعة؟", "تخصم من الرصيد؟"],
   [["إجازة سنوية", "نعم", "نعم"],
    ["إجازة مرضية (بتقرير طبي)", "نعم", "لا"],
    ["إجازة طارئة", "نعم", "لا"],
    ["إجازة أمومة", "نعم", "لا"],
    ["بدون راتب", "لا", "لا"],
    ["استئذان (بالساعات)", "نعم", "لا – بالساعات فقط"]],
   [52, 40, 82]),
  ("bullets",
   ["الإجازة السنوية : اختر «إجازة فعلية مع سفر» إن كنت ستسافر وستتغير حالتك إلى «في إجازة»، أو «تصفية المستحقات مع مواصلة العمل» لصرف قيمتها نقداً مع بقائك على رأس العمل.",
    "خيار «إجازة كاملة (تصفية + تذاكر)» يشمل التصفية المالية وتعويض التذكرة ويتطلب اعتماداً مالياً.",
    "اكتب سبب الإجازة بوضوح، فهو يساعد المعتمدين على سرعة البت في طلبك.",
    "يظهر طلبك فوراً في قائمتك بحالة «قيد الاعتماد» مع تاريخ التقديم."],
   None),
  ("h2", "متابعة طلبك بعد التقديم", None),
  ("bullets",
   ["يمر الطلب بالمدير المباشر ثم الموارد البشرية ثم المالية للأنواع المستحقة مالياً.",
    "المرضية وبدون الراتب والاستئذان تكتمل باعتماد الموارد البشرية دون المرور بالمالية.",
    "إن رُفض الطلب ستجد بطاقة حمراء باسم الرافض (المدير أو الموارد أو المالية) وسبب الرفض، فراجع السبب ثم قدم طلباً جديداً مصححاً.",
    "قد يُعتمد جزء من الأيام فقط، وسترى سطراً يوضح «المعتمد : عدد من عدد يوم»."],
   None),
 ]),

("رصيد إجازاتك",
 "Your leave balance",
 [
  ("p",
   "بطاقة رصيد الإجازات في صفحتك تعرض ثلاثة أرقام : المستحق لك منذ مباشرتك (21 يوماً افتراضياً أو 30 يوماً حسب ملفك، وتُحتسب تناسبياً مع مدة الخدمة)، والمستخدم (الرصيد الافتتاحي إن وجد + الإجازات السنوية المعتمدة داخل النظام)، والمتبقي وهو الفرق بينهما.",
   None),
  ("box",
   "قد يظهر المتبقي سالباً إن تجاوزت مستحقك، ويُعرض بقيمته الصريحة دون تصفير ليراه الجميع بوضوح. الإجازات المرضية والطارئة والأمومة وبدون الراتب والاستئذان لا تخصم من رصيدك السنوي.",
   None, "info"),
 ]),

("طلب سلفة",
 "Requesting a salary advance (loan)",
 [
  ("steps",
   ["اضغط زر «طلب سلفة» أعلى الصفحة.",
    "أدخل المبلغ المطلوب وسبب السلفة وعدد الأقساط الشهرية.",
    "يُحسب القسط الشهري تلقائياً، ثم أرسل الطلب.",
    "تابع حالة الطلب في قسم السلف : بانتظار الاعتماد، أو معتمدة، أو مرفوضة مع السبب."],
   None),
  ("p",
   "للسلفة المصروفة بطاقة متابعة تعرض الإجمالي والمسدد والمتبقي وحالتها (نشطة أو مغلقة)، مع زر تنزيل كشف السلفة (PDF) بعد اكتمالها. وقد يُعتمد مبلغ أقل مما طلبت، وسترى سطراً يوضح «المطلوب» و«المعتمد».",
   None),
 ]),

("الانتدابات ورحلات العمل",
 "Business trips",
 [
  ("steps",
   ["اضغط زر «طلب رحلة/انتداب» أعلى الصفحة.",
    "حدد نوع الرحلة : داخلية أو خارجية، ووجهتك ووسيلة السفر.",
    "أدخل تاريخي البداية والنهاية وسبب الانتداب وخطة العمل.",
    "أرسل الطلب وتابعه في قسم الانتدابات."],
   None),
  ("h2", "حالات الانتداب", None),
  ("table",
   ["الحالة", "معناها"],
   [["مسودة", "محفوظة ولم تُرسل بعد"],
    ["قيد الاعتماد", "بانتظار المدير أو الموارد أو المالية"],
    ["معتمدة", "تمت الموافقة على الرحلة"],
    ["قيد التنفيذ", "الرحلة جارية حالياً"],
    ["مكتملة", "انتهت الرحلة وتم إغلاقها"],
    ["ملغاة / مرفوضة", "أُلغيت أو رُفضت مع ذكر السبب"]],
   [45, 129]),
  ("box", "الانتداب المعتمد مالياً يُصرف عبر المالية مع إثبات التحويل قبل إغلاقه نهائياً.", None, "info"),
 ]),

("طلبات العهد والشكاوى",
 "Equipment custody and complaints",
 [
  ("h2", "طلب عهدة", None),
  ("steps",
   ["اضغط زر «طلب عهدة» وحدد الصنف المطلوب وسبب الاستلام.",
    "تابع الحالة : بانتظار المدير، ثم بانتظار الموارد، ثم «تم التسليم» عند الاستلام الفعلي، أو مرفوضة مع السبب."],
   None),
  ("h2", "رفع شكوى", None),
  ("steps",
   ["اضغط زر «رفع شكوى» واختر نوعها واكتب وصفاً واضحاً مع إرفاق ما يدعمها إن وجد.",
    "تمر الشكوى بالمدير المباشر ثم الموارد البشرية.",
    "عند الحل ستجد بطاقة خضراء بسطر «الحل :» ونص الإجراء المتخذ، أو سبب الرفض إن رُفضت."],
   None),
 ]),

("راتبك ومستنداتك المالية",
 "Your salary and financial documents",
 [
  ("p",
   "بطاقة «بياناتي» تعرض تفاصيل راتبك الشهري : الأساسي وبدل السكن وبدل النقل والبدلات الأخرى ثم الإجمالي. أما المستندات الرسمية فتجدها في قسم «مستنداتي المالية».",
   None),
  ("bullets",
   ["مخالصة الإجازة : ملف (PDF) قابل للتنزيل بعد صرف إجازتك واكتمالها.",
    "كشف السلفة : ملف (PDF) يعرض إجمالي السلفة والمسدد والمتبقي وعدد الأقساط.",
    "لا تظهر المستندات إلا بعد الصرف والاكتمال، فعدم ظهور مستند يعني أن المعاملة ما زالت في مسارها."],
   None),
 ]),

("نهاية الخدمة : التقدير والمخالصة",
 "End of service: estimate and settlement",
 [
  ("p",
   "قسم «تقدير نهاية الخدمة» يعرض حسبة تقديرية للاطلاع فقط : أساس الحساب (الأجر الشهري)، وسنوات الخدمة، والنسبة، ومكافأة نهاية الخدمة، وتعويض الإجازات غير المستخدمة، وتعويض التذكرة، ثم الإجمالي التقديري.",
   None),
  ("box", "القيمة تقديرية للاطلاع فقط، وتُحتسب المخالصة النهائية فعلياً عند الإنهاء من إدارة الموارد البشرية.", None, "warn"),
  ("p",
   "عند اعتماد مخالصة نهاية خدمتك فعلياً تمر بالموارد البشرية ثم المالية التي ترفع إثبات التحويل، وبعدها تجد المخالصة في «مستنداتي المالية» مع زر طباعة وزر تنزيل إثبات الصرف.",
   None),
 ]),

("التعميمات والقرارات والحوافز",
 "Announcements, decisions and incentives",
 [
  ("p",
   "كل ما يردك من المنشأة – تعميم أو قرار أو تهنئة أو حافز – يظهر في قسميه الخاص مع شارة بنوعه وتاريخ إصداره وتاريخ سريانه.",
   None),
  ("bullets",
   ["افتح البطاقة لقراءة النص الكامل، فالنص الطويل يُعرض مختصراً أولاً.",
    "اضغط زر «تم الاطلاع» (أو OK للحوافز) لتسجيل إقرارك بالعلم، وستتحول الشارة إلى «تم الإقرار».",
    "بطاقة الحافز تعرض المبلغ وتاريخ المنح.",
    "تجاهل الإقرار لا يمنع وصول القرار إليك، لكن الإقرار يوثق علمك به لدى الإدارة."],
   None),
 ]),

("تقييم الأداء والدورات التدريبية",
 "Performance reviews and training",
 [
  ("p",
   "قسم تقييمات الأداء يعرض تقييماتك المعتمدة : نوع التقييم (سنوي أو نصف سنوي أو فترة تجربة أو تحديد أهداف)، والتقييم الكلي، ونقاط القوة وفرص التحسين، والتوصية (إبقاء أو ترقية أو حافز أو إنذار أو إنهاء)، وتاريخ التقييم.",
   None),
  ("p", "قسم التدريب يعرض الدورات المرشح لها أو المسجلة فيها مع حالتها ومواعيدها.", None),
 ]),

("الإنذارات الموجهة إليك",
 "Warnings issued to you",
 [
  ("p",
   "قسم الإنذارات يعرض إجمالي عدد الإنذارات الصادرة بحقك مع عدّادات ملونة بعدد الإنذارات لكل درجة. وكل إنذار يعرض : فئة المخالفة، ودرجته، والمادة النظامية المستند إليها، وتاريخ الواقعة وتاريخ الجلسة إن وجدت، ووصف المخالفة.",
   None),
  ("box", "اطلع على المادة النظامية المذكورة في كل إنذار لتفهم الأساس النظامي، وراجع الموارد البشرية عند أي التباس.", None, "info"),
 ]),

("محاضر التحقيق : كيف ترد عليها",
 "Investigations: how to respond",
 [
  ("p",
   "إن ورد اسمك في محضر تحقيق – سواء معنياً بالمخالفة أو شاهداً طُلبت إفادته – ستجد المحضر في قسم «محاضر التحقيق» برقمه المرجعي وحالته «بانتظار ردك».",
   None),
  ("steps",
   ["افتح المحضر واقرأ الادعاءات أو المطلوب منك بعناية.",
    "اضغط على المحضر لفتح نموذج الرد.",
    "اكتب ردك على مطالب التحقيق بوضوح وموضوعية.",
    "إن كان لديك شهود فاكتب أسماءهم في الحقل المخصص.",
    "أرفق صورة أو ملف (PDF) كإثبات إن وجد (بحد أقصى 2.5 ميغابايت).",
    "اضغط «إرسال الرد». ستتحول الحالة إلى «تم الرد» ويمكنك مراجعة ردك لاحقاً."],
   None),
  ("box", "الرد المرسل نهائي وموثق في المحضر، فراجع نصك قبل الإرسال. المرفق الذي يتعذر حفظه ستظهر لك رسالة بذلك مع بقاء الرد محفوظاً.", None, "warn"),
 ]),

("التنبيهات والإشعارات",
 "Notifications",
 [
  ("p",
   "جرس التنبيه أعلى الصفحة يعرض عدد إشعاراتك غير المقروءة، وتبويب «التنبيهات» يعرض سجلاً كاملاً محفوظاً دائماً : نتائج طلباتك، والتعميمات الجديدة، والإنذارات، والمستندات المصروفة، وغيرها.",
   None),
  ("bullets",
   ["النقطة البنفسجية بجانب الإشعار تعني أنه غير مقروء.",
    "زر «تعليم الكل كمقروء» يصفر العداد دفعة واحدة.",
    "كل إشعار يعرض عنوانه ونصه وتاريخه ووقته."],
   None),
 ]),

("الوصف الوظيفي والطباعة",
 "Job description and printing",
 [
  ("p",
   "إن أضافت منشأتك وصفاً وظيفياً لملفك فستجده في قسم «الوصف الوظيفي» مع زر طباعة يخرجه بصيغة رسمية بشعار المنشأة. وبالمثل زر الطباعة في مخالصة نهاية الخدمة يطبعها بصيغتها الرسمية.",
   None),
 ]),

("الاعتمادات (1) : المدير المباشر",
 "Approvals (1): direct manager",
 [
  ("p",
   "إن كنت مديراً مباشراً أو معتمداً فستجد تبويب «الاعتمادات» في صفحتك مع شارة صلاحيتك. يعرض التبويب قائمة فريقك (الاسم والرقم الوظيفي والمسمى والقسم) ثم طلباتهم المعلقة.",
   None),
  ("h2", "اعتماد الإجازات", None),
  ("steps",
   ["افتح طلب الإجازة من القائمة وراجع النوع والتواريخ وعدد الأيام والسبب والمرفقات.",
    "عند الضغط على «موافقة» ستظهر نافذة تأكيد تعرض رصيد الموظف قبل الخصم وبعده وعدد الأيام المطلوبة، فراجعها ثم أكد المتابعة أو ألغِ.",
    "للرفض اضغط «رفض» واكتب سبب الرفض إلزامياً، فسيظهر للموظف مع اسمك."],
   None),
  ("h2", "بقية الطلبات", None),
  ("bullets",
   ["السلف : راجع المبلغ والسبب وعدد الأقساط ثم وافق أو ارفض مع السبب.",
    "الانتدابات : راجع الوجهة والتواريخ والغرض ثم وافق أو ارفض مع السبب.",
    "طلبات العهد والشكاوى : تعامل معها بحسب المرحلة (اعتماد أو رفض أو إحالة للموارد البشرية)."],
   None),
  ("box", "موافقتك تنقل الطلب للموارد البشرية ثم للمالية، ورفضك يغلقه نهائياً مع إظهار سببك للموظف.", None, "info"),
 ]),

("الاعتمادات (2) : المعتمد المالي",
 "Approvals (2): finance approver",
 [
  ("p",
   "تبويب المعتمد المالي يعرض أربعة أقسام بعدّادات : الإجازات والسلف والانتدابات ونهاية الخدمة، إضافة إلى سجل دائم لكل ما صُرف أو اعتُمد عبر المالية.",
   None),
  ("h2", "تأكيد الصرف", None),
  ("steps",
   ["افتح الطلب وراجع المبلغ المستحق (وللإجازة الكاملة راجع تعويض التذكرة، وللمخالصة راجع الإجمالي).",
    "اضغط «تأكيد الصرف».",
    "اكتب ملاحظة الصرف (تحويل بنكي أو سند توقيع أو غيره).",
    "أرفق إثبات التحويل أو السداد.",
    "أكد العملية. سيتحول الطلب إلى «تم الصرف/مكتمل» ويصل الموظف مستنده في «مستنداتي المالية».",
    "للرفض استخدم زر «رفض» مع كتابة السبب."],
   None),
  ("box",
   "الإجازات المرضية وبدون الراتب والاستئذان لا تمر بالمالية أصلاً، بل تكتمل باعتماد الموارد البشرية. وتأكيد الصرف حصري لمعتمد المالية.",
   None, "warn"),
 ]),

("مسار الطلب الكامل وحالاته",
 "Full request lifecycle and statuses",
 [
  ("p", "كل طلب مالي (إجازة مستحقة، سلفة، انتداب، مخالصة) يسير في هذا المسار :", None),
  ("steps",
   ["الموظف يقدم الطلب من بوابته.",
    "المدير المباشر يعتمد أو يرفض مع السبب.",
    "الموارد البشرية تراجع وتعتمد.",
    "المالية تؤكد الصرف مع إثبات التحويل.",
    "يكتمل الطلب ويصل الموظف مستنده الرسمي."],
   None),
  ("table",
   ["الحالة", "معناها"],
   [["بانتظار المدير", "لم يعتمدها المدير بعد"],
    ["بانتظار الموارد البشرية", "اعتمدها المدير وتنتظر الموارد"],
    ["بانتظار المالية", "اعتمدت إدارياً وتنتظر الصرف"],
    ["معتمدة", "تمت الموافقة وجارٍ استكمال المسار"],
    ["تم الصرف / مكتملة", "انتهت العملية ووصل المستند"],
    ["مرفوضة", "رُفضت مع عرض اسم الرافض وسببه"]],
   [52, 122]),
 ]),

("مشاكل شائعة وحلولها",
 "Common issues and fixes",
 [
  ("table",
   ["المشكلة", "الحل"],
   [["لا يقبل تسجيل الحضور ويذكر مسافة بالأمتار", "أنت خارج نطاق المقر – اقترب منه وأعد المحاولة مع تفعيل دقة الموقع"],
    ["رسالة عن تعذر التحقق من الموقع", "أغلق أي تطبيق لتزييف الموقع (GPS وهمي) ثم أعد المحاولة"],
    ["لا تصل صلاحية الموقع", "فعّل خدمة الموقع في الجهاز واسمح للمتصفح بالوصول إليها"],
    ["المقر الرسمي غير محدد", "راجع الموارد البشرية لتحديد موقع مقر العمل"],
    ["الدخول يفيد بأن الحساب غير مسجل", "أنشئ حسابك أولاً من تبويب «إنشاء حساب» برقم الهوية وتاريخ الميلاد"],
    ["الحساب غير نشط", "راجع الموارد البشرية لتفعيل ملفك"],
    ["لم يصل رمز إعادة التعيين", "تحقق من بريدك المسجل لدى الموارد البشرية ومجلد الرسائل غير المرغوبة"],
    ["خرجت البوابة فجأة لصفحة الدخول", "انتهت الجلسة للخمول أو الأمان – سجل الدخول مجدداً"],
    ["البيانات لا تتحدث", "اسحب الشاشة للأسفل للتحديث"]],
   [62, 112]),
 ]),

("خصوصيتك وأمان بياناتك",
 "Privacy and data security",
 [
  ("bullets",
   ["رقم الهوية يُستخدم اسماً للدخول فقط، وكلمة المرور لا يعرفها أحد غيرك.",
    "مستنداتك وبياناتك الحساسة محفوظة في الخزنة السعودية داخل المملكة ولا تظهر إلا لك ولإدارة منشأتك.",
    "لا تشارك كلمة مرورك مع أحد، وسجل الخروج عند استخدام جهاز مشترك.",
    "الجلسة تنتهي تلقائياً عند الخمول حفاظاً على بياناتك."],
   None),
 ]),
]

# =====================================================================
# CONTENT – English part (mirror, LTR)
# =====================================================================
EN_CHAPTERS = [
("Before you start: what is the employee portal?",
 [
  ("p", None,
   "The employee portal is your personal page in the Jadara HR system. From it you handle everything with your company without visiting the administration: check-in and check-out, leave, advance, trip and custody requests, tracking your balances and salary, and reading announcements, warnings and investigation reports – and replying to them."),
  ("bullets", None,
   ["Works on mobile and desktop right from the browser – nothing to install.",
    "Supports Arabic, English and five more languages; switch any time from the top of the page.",
    "You are signed out automatically after the page stays idle for a while, to protect your data.",
    "Pull the screen down at any time to refresh your data.",
    "The floating smart-assistant button answers your questions about the system.",
    "Get the portal link from your company's HR department."]),
 ]),

("Sign in and account setup",
 [
  ("h2en", "First time: create your account"),
  ("steps", None,
   ["Open the portal link and choose the \"Register\" tab.",
    "Enter the national ID / Iqama number registered with HR.",
    "Enter your birth date once to verify your identity.",
    "Choose a password of at least 6 characters and confirm it.",
    "Complete the human-verification check, submit, then sign in from the \"Sign in\" tab."]),
  ("h2en", "Daily sign-in"),
  ("steps", None,
   ["Choose the \"Sign in\" tab.",
    "Enter your national ID / Iqama and password.",
    "Complete the human-verification check, then press \"Sign in\"."]),
  ("h2en", "Forgot your password"),
  ("steps", None,
   ["Choose the \"Forgot password\" tab and enter your ID number.",
    "A verification code is sent to the email address HR has on file for you.",
    "Enter the code, then set and confirm a new password."]),
  ("box", None,
   "If you see an \"account not registered\" message, register first from the \"Register\" tab. If the account is inactive, contact HR. Your password is known only to you.", "warn"),
 ]),

("Your home page",
 [
  ("p", None,
   "At the top you see your company card: its logo and name, then your employee number, job title and department. If you are a direct manager or finance approver, a badge of your authority appears next to the card."),
  ("bullets", None,
   ["Years of service: your tenure counted from your hire date.",
    "Leave balance: your remaining annual leave, with entitled and used figures.",
    "Gross salary: base plus allowances combined.",
    "Ticket entitlement: yearly, biennial or none – noting Saudi or expatriate."]),
  ("p", None,
   "Below the cards, the \"My details\" card breaks down your salary (base, housing, transport and other allowances, then the total), plus title, department, hire date and contract type. Three tabs sit above the content: \"My Services\" for your requests and data, \"Notifications\" for your alerts, and \"Approvals\" – visible only to authorized approvers."),
 ]),

("Daily check-in and check-out",
 [
  ("p", None,
   "The \"Daily check-in\" section records your attendance from the workplace location only. It shows the current time, the official working hours of the company or your branch, and today's recorded check-in and check-out times."),
  ("h2en", "Your daily routine"),
  ("steps", None,
   ["Enable location services (GPS) on your device and allow the browser to access it.",
    "If you work across branches, pick the check-in branch from the list before recording.",
    "Press \"Check in\" when you arrive. You must be inside the workplace radius (50 m by default).",
    "For a break press \"Start break\", and when you return press \"Resume work\".",
    "At the end of the day press \"Check out\". You cannot check out while on a break.",
    "Your work hours are computed automatically after deducting breaks, and lateness is assessed against the start time plus the grace period."]),
  ("h2en", "Your attendance history"),
  ("p", None,
   "Below check-in, a table lists your daily records: date, check-in and check-out times, hours, and status (Present, Late or Absent)."),
  ("box", None,
   "If you see an out-of-range message, it shows your distance in meters – move closer to the workplace and retry. The system detects GPS-spoofing apps and rejects check-ins made with them, so close those first. If no workplace is set, ask HR to configure the workplace location.", "err"),
 ]),

("Requesting leave",
 [
  ("p", None,
   "Press the \"Leave request\" button at the top of the page. Fill in the leave type, departure date (last work day) and return date (resuming work); days are auto-calculated. Sick leave requires attaching the medical report."),
  ("h2en", "Leave types"),
  ("table_en",
   ["Type", "Paid?", "Deducts balance?"],
   [["Annual", "Yes", "Yes"],
    ["Sick (medical report required)", "Yes", "No"],
    ["Emergency", "Yes", "No"],
    ["Maternity", "Yes", "No"],
    ["Unpaid", "No", "No"],
    ["Permission (hours)", "Yes", "No – hours only"]],
   [80, 40, 54]),
  ("bullets", None,
   ["Annual leave: choose \"Actual leave with travel\" if you travel (your status becomes \"On leave\"), or \"Encash leave balance & continue working\" to cash it out while staying active.",
    "The \"Full clearance (settlement + tickets)\" option includes financial settlement and ticket compensation and needs finance approval.",
    "Write the reason clearly – it helps approvers decide faster.",
    "Your request appears instantly in your list as \"Pending\" with the submission date."]),
  ("h2en", "Tracking your request"),
  ("bullets", None,
   ["It passes through your direct manager, then HR, then Finance for financially settled types.",
    "Sick, unpaid and permission requests complete at HR approval without Finance.",
    "If rejected, a red card shows who rejected (manager, HR or finance) and the reason – review it, then submit a corrected request.",
    "Only part of the days may be approved; you will see a line stating \"Approved: X of Y days\"."]),
 ]),

("Your leave balance",
 [
  ("p", None,
   "The leave-balance card shows three figures: your entitlement since joining (21 days by default, or 30 per your file, pro-rated to your service), used days (opening balance if any, plus system-approved annual leaves), and the remainder – the difference between them."),
  ("box", None,
   "The remainder may display as a negative number if you exceeded your entitlement – it is shown as-is without zeroing so everyone sees it clearly. Sick, emergency, maternity, unpaid leaves and permissions never deduct from your annual balance.", "info"),
 ]),

("Requesting a salary advance (loan)",
 [
  ("steps", None,
   ["Press the \"Loan request\" button at the top of the page.",
    "Enter the requested amount, the reason, and the number of monthly installments.",
    "The monthly installment is computed automatically – then submit.",
    "Track the status in the loans section: pending, approved, or rejected with the reason."]),
  ("p", None,
   "A disbursed advance gets a tracking card showing total, paid, remaining and its state (Active or Closed), with a downloadable loan-statement PDF once completed. A smaller amount than requested may be approved – a line will show \"Requested\" vs \"Approved\"."),
 ]),

("Business trips",
 [
  ("steps", None,
   ["Press the \"Business trip\" button at the top of the page.",
    "Select the trip type – internal or external – plus destination and transport mode.",
    "Enter start and end dates, the trip reason and work plan.",
    "Submit and follow it in the trips section."]),
  ("h2en", "Trip statuses"),
  ("table_en",
   ["Status", "Meaning"],
   [["Draft", "Saved, not submitted yet"],
    ["Pending", "Awaiting manager, HR or finance"],
    ["Approved", "Trip approved"],
    ["In progress", "Trip currently running"],
    ["Completed", "Trip finished and closed"],
    ["Cancelled / Rejected", "Cancelled or rejected, reason shown"]],
   [60, 114]),
  ("box", None, "A financially approved trip is disbursed through Finance with a transfer proof before it is closed.", "info"),
 ]),

("Equipment custody and complaints",
 [
  ("h2en", "Equipment request"),
  ("steps", None,
   ["Press \"Equipment\", select the item and state the reason for receiving it.",
    "Follow the status: awaiting manager, then awaiting HR, then \"Delivered\" on actual handover – or rejected with the reason."]),
  ("h2en", "Filing a complaint"),
  ("steps", None,
   ["Press \"Complaint\", choose its type and write a clear description, attaching supporting files if any.",
    "It passes through your direct manager, then HR.",
    "When resolved you will see a green card with a \"Resolution:\" line describing the action taken – or the rejection reason."]),
 ]),

("Your salary and financial documents",
 [
  ("p", None,
   "The \"My details\" card shows your monthly salary breakdown: base, housing, transport and other allowances, then the total. Official documents live in the \"My financial documents\" section."),
  ("bullets", None,
   ["Leave clearance: a downloadable PDF after your leave is disbursed and completed.",
    "Loan statement: a PDF showing the advance total, paid and remaining amounts and installments.",
    "Documents appear only after disbursement and completion – a missing document means the case is still in progress."]),
 ]),

("End of service: estimate and settlement",
 [
  ("p", None,
   "The \"End of service estimate\" card shows a view-only estimate: calculation basis (monthly wage), years of service, fraction, the EOS award, unused-leave compensation and ticket compensation, then the estimated total."),
  ("box", None, "This is an estimate for viewing only. The final settlement is computed upon actual termination by HR.", "warn"),
  ("p", None,
   "When your actual EOS settlement is approved, it passes through HR then Finance, which uploads the transfer proof. Afterwards you will find it under \"My financial documents\" with print and proof-download buttons."),
 ]),

("Announcements, decisions and incentives",
 [
  ("p", None,
   "Everything your company sends you – circulars, decisions, congratulations, incentives – appears in its own section with a type badge, issue date and effective date."),
  ("bullets", None,
   ["Open the card to read the full text; long texts are previewed first.",
    "Press \"Acknowledge\" (or OK for incentives) to record that you have seen it – the badge turns to \"Acknowledged\".",
    "An incentive card shows the amount and grant date.",
    "Skipping acknowledgement never blocks delivery, but acknowledging documents your awareness with management."]),
 ]),

("Performance reviews and training",
 [
  ("p", None,
   "The performance section shows your approved reviews: review type (annual, mid-year, probation or goal setting), overall rating, strengths, improvement areas, the recommendation (maintain, promote, bonus, warn or terminate) and the review date."),
  ("p", None, "The training section lists courses you are nominated for or enrolled in, with their statuses and dates."),
 ]),

("Warnings issued to you",
 [
  ("p", None,
   "The warnings section shows the total number of warnings issued against you, with colored counters per level. Each warning shows: violation category, its level, the labor-law article it cites, the incident date and session date if any, and the violation description."),
  ("box", None, "Read the cited article in each warning to understand its legal basis, and check with HR about anything unclear.", "info"),
 ]),

("Investigations: how to respond",
 [
  ("p", None,
   "If your name appears in an investigation report – whether as the subject or as a witness asked for a statement – you will find it under \"Investigation reports\" with its reference number and the status \"Awaiting your reply\"."),
  ("steps", None,
   ["Open the report and read the allegations or what is asked of you carefully.",
    "Tap the report to open the reply form.",
    "Write your reply to the investigation clearly and objectively.",
    "If you have witnesses, write their names in the dedicated field.",
    "Attach a photo or PDF as evidence if available (max 2.5 MB).",
    "Press \"Send reply\". The status becomes \"Replied\" and you can review your reply later."]),
  ("box", None, "A submitted reply is final and recorded in the report – review your text before sending. If an attachment cannot be stored, you will be told so while the reply itself stays saved.", "warn"),
 ]),

("Notifications",
 [
  ("p", None,
   "The bell at the top of the page shows your unread count, and the \"Notifications\" tab keeps a permanently preserved history: your request outcomes, new circulars, warnings, disbursed documents and more."),
  ("bullets", None,
   ["The violet dot next to a notification means it is unread.",
    "\"Mark all read\" clears the counter at once.",
    "Each notification shows its title, body, date and time."]),
 ]),

("Job description and printing",
 [
  ("p", None,
   "If your company added a job description to your file, you will find it under \"Job description\" with a print button producing its official company-logo format. Likewise, the print button on the end-of-service settlement prints its official version."),
 ]),

("Approvals (1): direct manager",
 [
  ("p", None,
   "If you are a direct manager or an approver, you will see the \"Approvals\" tab with your authority badge. It lists your team (name, employee number, title, department) followed by their pending requests."),
  ("h2en", "Approving leaves"),
  ("steps", None,
   ["Open the leave request and review type, dates, day count, reason and attachments.",
    "Pressing \"Approve\" opens a confirmation showing the employee's balance before and after deduction plus the requested days – review it, then confirm or cancel.",
    "To reject, press \"Reject\" and write the reason (mandatory) – the employee will see it with your name."]),
  ("h2en", "Other requests"),
  ("bullets", None,
   ["Advances: review amount, reason and installments, then approve or reject with a reason.",
    "Trips: review destination, dates and purpose, then approve or reject with a reason.",
    "Custody requests and complaints: handle per stage (approve, reject or forward to HR)."]),
  ("box", None, "Your approval moves the request to HR and then Finance; your rejection closes it permanently with your reason shown to the employee.", "info"),
 ]),

("Approvals (2): finance approver",
 [
  ("p", None,
   "The finance approver tab shows four counters – leaves, advances, trips and end of service – plus a permanent log of everything disbursed or approved through Finance."),
  ("h2en", "Confirming disbursement"),
  ("steps", None,
   ["Open the request and review the due amount (ticket compensation for full-clearance leaves, the total for settlements).",
    "Press \"Confirm payment\".",
    "Write the payment note (bank transfer, signed receipt or other).",
    "Attach the transfer/payment proof.",
    "Confirm. The request becomes \"Paid/Completed\" and the employee receives the official document.",
    "To reject, use \"Reject\" with a written reason."]),
  ("box", None, "Sick, unpaid and permission leaves never reach Finance – they complete at HR approval. Disbursement confirmation is exclusive to the finance approver.", "warn"),
 ]),

("Full request lifecycle and statuses",
 [
  ("p", None, "Every financial request (settled leave, advance, trip, settlement) follows this path:"),
  ("steps", None,
   ["The employee submits the request from the portal.",
    "The direct manager approves or rejects with a reason.",
    "HR reviews and approves.",
    "Finance confirms disbursement with a transfer proof.",
    "The request completes and the employee receives the official document."]),
  ("table_en",
   ["Status", "Meaning"],
   [["Awaiting manager", "Manager has not approved yet"],
    ["Awaiting HR", "Manager approved; waiting for HR"],
    ["Awaiting finance", "Administratively approved; awaiting disbursement"],
    ["Approved", "Agreed; moving through the remaining path"],
    ["Paid / Completed", "Process finished; document delivered"],
    ["Rejected", "Rejected, with rejector name and reason shown"]],
   [60, 114]),
 ]),

("Common issues and fixes",
 [
  ("table_en",
   ["Issue", "Fix"],
   [["Check-in rejected with a distance in meters", "You are outside the workplace radius – move closer and retry with high-accuracy location on"],
    ["Message that location cannot be verified", "Close any GPS-spoofing (fake-GPS) app, then retry"],
    ["No location permission", "Enable location services and allow the browser to access them"],
    ["Workplace not set", "Ask HR to configure the workplace location"],
    ["Sign-in says account not registered", "Create your account first from \"Register\" with your ID and birth date"],
    ["Account inactive", "Ask HR to activate your file"],
    ["Reset code never arrived", "Check the email HR has on file, including the spam folder"],
    ["Portal suddenly returned to sign-in", "The session ended for idle-time or security – sign in again"],
    ["Data looks outdated", "Pull the screen down to refresh"]],
   [80, 94]),
 ]),

("Privacy and data security",
 [
  ("bullets", None,
   ["Your national ID is only a sign-in name; your password is known to nobody but you.",
    "Your documents and sensitive data are stored in the Saudi vault inside the Kingdom, visible only to you and your company management.",
    "Never share your password, and sign out on shared devices.",
    "Sessions end automatically when idle, to protect your data."]),
 ]),
]


def cover(pdf):
    pdf.add_page()
    pdf.ln(28)
    pdf._ar_mode()
    pdf.set_font("amiri", "B", 34)
    pdf.set_text_color(*VIOLET)
    pdf.multi_cell(0, 16, AR("دليل بوابة الموظفين"), align="C")
    pdf._en_mode()
    pdf.set_font("amiri", "B", 22)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 12, "Employee Portal User Guide", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf._ar_mode()
    pdf.set_font("amiri", "", 15)
    pdf.set_text_color(*GRAY)
    pdf.multi_cell(0, 9, AR("نظام جدارة للموارد البشرية"), align="C")
    pdf._en_mode()
    pdf.set_font("amiri", "", 13)
    pdf.cell(0, 9, "Jadara HR System", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)
    y = pdf.get_y()
    pdf.set_draw_color(*VIOLET)
    pdf.set_line_width(0.8)
    pdf.line(70, y, 140, y)
    pdf.ln(8)
    pdf.set_font("amiri", "", 11.5)
    pdf.set_text_color(*DARK)
    pdf._ar_mode()
    pdf.multi_cell(0, 7.5, AR("يشرح هذا الدليل بوابة الموظف من البداية إلى النهاية : الدخول، الحضور والانصراف، طلبات الإجازات والسلف والانتدابات، الرواتب والأرصدة، التعميمات والإنذارات ومحاضر التحقيق، وقسم الاعتمادات للمديرين والمعتمدين الماليين."), align="C")
    pdf.ln(3)
    pdf._en_mode()
    pdf.set_font("amiri", "", 10.5)
    pdf.set_text_color(*GRAY)
    pdf.multi_cell(0, 7, "Covers sign-in, check-in/out, leave, advance and trip requests, salaries and balances, announcements, warnings and investigations, plus the approvals section for managers and finance approvers.", align="C")
    pdf.ln(10)
    pdf.set_font("amiri", "", 10.5)
    pdf.set_text_color(*GRAY)
    pdf._ar_mode()
    pdf.multi_cell(0, 7, AR("الإصدار 1.0 – نوفمبر 2026"), align="C")
    pdf._en_mode()
    pdf.cell(0, 7, "Version 1.0 – November 2026", align="C", new_x="LMARGIN", new_y="NEXT")


def toc(pdf, chapters, rtl, title_ar, title_en):
    pdf.add_page()
    pdf.set_font("amiri", "B", 17)
    pdf.set_text_color(*VIOLET)
    if rtl:
        pdf._ar_mode()
        pdf.multi_cell(0, 9, AR(title_ar), align="R")
        pdf._en_mode()
        pdf.set_font("amiri", "", 11)
        pdf.set_text_color(*GRAY)
        pdf.multi_cell(0, 6.5, title_en, align="L")
    else:
        pdf._en_mode()
        pdf.multi_cell(0, 9, title_en, align="L")
    pdf.ln(3)
    for i, ch in enumerate(chapters, 1):
        if pdf.get_y() > 260:
            pdf.add_page()
        if rtl:
            pdf._ar_mode()
            pdf.set_font("amiri", "B", 11.5)
            pdf.set_text_color(*DARK)
            pdf.multi_cell(0, 7.5, AR(f"{i}. {ch[0]}"), align="R")
        else:
            pdf._en_mode()
            pdf.set_font("amiri", "B", 11)
            pdf.set_text_color(*DARK)
            pdf.multi_cell(0, 7, f"{i}. {ch[0]}", align="L")


def render_ar(pdf):
    pdf.add_page()
    pdf.set_font("amiri", "B", 24)
    pdf.set_text_color(*VIOLET)
    pdf.ln(10)
    pdf._ar_mode()
    pdf.multi_cell(0, 14, AR("الجزء الأول : الدليل باللغة العربية"), align="C")
    pdf._en_mode()
    pdf.set_font("amiri", "", 12)
    pdf.set_text_color(*GRAY)
    pdf.multi_cell(0, 8, "Part 1 – Arabic guide", align="C")
    toc(pdf, AR_CHAPTERS, True, "المحتويات", "Contents")
    for i, (title_ar, title_en, blocks) in enumerate(AR_CHAPTERS, 1):
        pdf.add_page()
        pdf.h1(title_ar, title_en, num=i)
        for b in blocks:
            kind = b[0]
            if kind == "p":
                pdf.p(ar=b[1])
            elif kind == "bullets":
                pdf.bullets(items_ar=b[1])
            elif kind == "steps":
                pdf.steps(items_ar=b[1])
            elif kind == "h2":
                pdf.h2(ar=b[1])
            elif kind == "box":
                pdf.box(ar=b[1], kind=b[3] if len(b) > 3 else "info")
            elif kind == "table":
                headers = [AR(h) for h in b[1]]
                rows = [[AR(c) for c in r] for r in b[2]]
                pdf.grid(headers, rows, widths=b[3], rtl=True)


def render_en(pdf):
    pdf.add_page()
    pdf.set_font("amiri", "B", 24)
    pdf.set_text_color(*VIOLET)
    pdf.ln(10)
    pdf._en_mode()
    pdf.multi_cell(0, 14, "Part 2 – English Guide", align="C")
    pdf.set_font("amiri", "", 12)
    pdf.set_text_color(*GRAY)
    pdf._ar_mode()
    pdf.multi_cell(0, 8, AR("الجزء الثاني : الدليل باللغة الإنجليزية"), align="C")
    pdf._en_mode()
    toc(pdf, EN_CHAPTERS, False, "", "Contents")
    for i, (title_en, blocks) in enumerate(EN_CHAPTERS, 1):
        pdf.add_page()
        pdf.ln(4)
        pdf._en_mode()
        pdf.set_font("amiri", "B", 18)
        pdf.set_text_color(*VIOLET)
        pdf.multi_cell(0, 9, f"Chapter {i}: {title_en}", align="L")
        y = pdf.get_y()
        pdf.set_draw_color(*VIOLET)
        pdf.set_line_width(0.9)
        pdf.line(18, y + 1, 192, y + 1)
        pdf.ln(5)
        try:
            pdf.start_section(f"EN {i}: {title_en}", level=0)
        except Exception:
            pass
        for b in blocks:
            kind = b[0]
            if kind == "p":
                pdf.p(en=b[2])
            elif kind == "bullets":
                pdf.bullets(items_en=b[2])
            elif kind == "steps":
                pdf.steps(items_en=b[2])
            elif kind == "h2en":
                pdf.h2(en=b[1])
            elif kind == "box":
                pdf.box(en=b[2], kind=b[3] if len(b) > 3 else "info")
            elif kind == "table_en":
                pdf.grid(b[1], b[2], widths=b[3], rtl=False)


def main():
    pdf = Guide()
    pdf.set_title("Jadara HR – Employee Portal Guide / دليل بوابة الموظفين")
    pdf.set_author("Jadara HR")
    cover(pdf)
    render_ar(pdf)
    render_en(pdf)
    pdf.output(OUT)
    print("wrote", OUT, os.path.getsize(OUT), "bytes,", pdf.page_no(), "pages")


if __name__ == "__main__":
    main()
