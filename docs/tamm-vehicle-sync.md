# ربط «تم» — تحديث تواريخ المركبات تلقائياً

استعلامات فقط (Inquiry) — لا تُنفّذ أي معاملة حكومية.

## 1) الأسرار المطلوبة (في إعدادات الأسرار — لا تُكتب في الكود)

| الاسم | إلزامي | الوصف |
|---|---|---|
| `TAMM_CLIENT_ID` | ✅ | App ID / Client ID من باقة إدارة الأسطول |
| `TAMM_CLIENT_SECRET` | ✅ | App Key / Client Secret |
| `CRON_SECRET` | ✅ | موجود مسبقاً — تستخدمه الجدولة الأسبوعية |
| `TAMM_BASE_URL` | اختياري | افتراضي `https://www.rabet.sa` |
| `TAMM_TOKEN_URL` | اختياري | رابط الحصول على الرمز — يُضبط إذا اختلف عن الافتراضي |
| `TAMM_IDP_BASE_URL` | اختياري | افتراضي `https://idp.apps.devocp4.elm.sa` |
| `TAMM_REALM` | اختياري | افتراضي `Tamm-dev` — غيّره إلى realm الإنتاج عند الاشتراك |
| `TAMM_SCOPE` | اختياري | إن طلبته «تم» |

**مقيم لاحقاً:** `MUQEEM_CLIENT_ID` / `MUQEEM_CLIENT_SECRET` — مستقلة تماماً ولا تتداخل مع «تم».

## 2) الملفات

| الملف | الدور |
|---|---|
| `base44/shared/tamm.ts` | عميل «تم»: مصادقة OAuth، بناء الطلب من اللوحة، استخراج التواريخ، الخدمات الثلاث |
| `base44/functions/vehicleSync/entry.ts` | المزامنة: `sync` / `syncAll` / `status` / `diagnose` مع قفل 7 أيام |
| `base44/workflows/Tamm Vehicle Sync.jsonc` | جدولة أسبوعية — كل سبت 8 صباحاً بتوقيت الرياض |
| `src/pages/Fleet.jsx` | زر «تحديث من «تم»» + شارة المصدر + عرض آخر مزامنة والقفل |
| `base44/entities/Vehicle.jsonc` | حقول اللوحة (`plate_letters` / `plate_type`) وحقول المزامنة |

## 3) الخدمات الثلاث المستدعاة

| الوثيقة | Endpoint | تُكتب في |
|---|---|---|
| التأمين | `POST /api/v1/inquiry/vehicle-insurance` | `tamm_sync_insurance_expiry` + `insurance_expiry` |
| الفحص الدوري | `POST /api/v1/inquiry/mvpi/latest-inspection` | `tamm_sync_inspection_expiry` + `inspection_expiry` |
| رخصة السير | `POST /api/v1/plate-change-request/verify-vehicle` (الخطوة 1 فقط) | `tamm_sync_license_expiry` + `license_expiry` |

نكتب أيضاً في الحقل الأصلي حتى تقرأه التنبيهات والتقارير الحالية **بدون أي تعديل عليها**.

## 4) القواعد

- **تلقائي:** كل سبت 8 صباحاً، لكل مركبة لم تُزامن خلال 7 أيام (حد أقصى 40 مركبة في الدورة).
- **يدوي:** زر واحد لكل مركبة، مرة كل 7 أيام — القفل مفروض في الخادم لا في الواجهة فقط.
- **فشل جزئي:** إذا نجحت وثيقة وفشلت أخرى، تُحفظ الناجحة وتُسجّل الملاحظة في `tamm_sync_message`.
- **فشل كامل:** تبقى التواريخ القديمة كما هي، ويُسجّل السبب.

## 5) فحص الاتصال

من داخل النظام (كمستخدم admin) استدعِ الدالة `vehicleSync` بـ:

```json
{ "action": "diagnose" }
```

- `ok: true` → المصادقة تعمل.
- `tamm_token_unreachable` → خادم المصادقة غير مُتاح من الشبكة (IP allowlist / VPN / بيئة تطوير).
- `tamm_token_failed` → ترفض «تم» المفاتيح (راجع `TAMM_CLIENT_ID` / `TAMM_CLIENT_SECRET`).
- `tamm_error: HTTP 403` على مسار معيّن → الخدمة غير مفعّلة على حسابك.

## 6) قبل الإنتاج

1. اشترك في الباقة واحصل على مفاتيح الإنتاج.
2. غيّر في الأسرار: `TAMM_CLIENT_ID`، `TAMM_CLIENT_SECRET`، `TAMM_REALM`، و`TAMM_TOKEN_URL` إن تغيّر.
3. جرّب `diagnose` ثم مزامنة مركبة واحدة حقيقية وتأكد من التواريخ يدوياً.
4. **لا سطر كود يتغيّر** بين بيئة التطوير والإنتاج.
