# خزنة بيانات جدارة السعودية (Saudi Data Vault)

تطبيق مستقل يُستضاف على سيرفر داخل المملكة العربية السعودية، يخزّن **كل البيانات الحساسة** (الهويات، الإقامات، الجوازات، الحسابات البنكية، الرواتب، البدلات، التأمينات، والمستندات المُولّدة) مشفّرةً داخل المملكة، ولا يُرسل أي قيمة حساسة إلى Base44 — فقط رموز معتمة (opaque refs).

الهدف: الامتثال لمتطلبات سدايا (SDAYA) وهيئة الأمن السيبراني (NCA) في سيادة البيانات.

---

## البنية الأمنية

- **التشفير عند السكون:** AES-256-GCM لكل حقل حساس في PostgreSQL.
- **التشفير أثناء النقل:** TLS إلزامي عبر reverse proxy (Nginx/Caddy) — لا يُكشف المنفذ مباشرة.
- **المصادقة:** مفتاح API مشترك (`X-Vault-Key`) بين Base44 والخزنة، ولا يُكشف للعملاء.
- **عزل المستأجر:** كل استعلام مُقيّد بـ `tenant_id` من ترويسة الطلب.
- **روابط المستندات:** JWT قصير العمر (5 دقائق) — لا يحتاج مفتاح API، يُفتح في المتصفح.
- **عدم تسجيل الحمولة:** سجلات الخادم لا تحوي أي قيمة حساسة، فقط المسار والطريقة.

---

## الـdeploy على سيرفرك السعودي

### 1) المتطلبات
- Docker + Docker Compose
- نطاق سعودي (مثلاً `vault.jadara.sa`) موجه لسيرفرك
- شهادة TLS (Let's Encrypt مجانية عبر Caddy أو Certbot)

### 2) التجهيز
```bash
git clone <repo-url> saudi-vault
cd saudi-vault
cp .env.example .env
```

املأ `.env`:
```bash
# ولّد مفتاح التشفير (32 بايت hex)
openssl rand -hex 32   # → VAULT_ENCRYPTION_KEY

# ولّد مفتاح API مشترك
openssl rand -hex 32   # → VAULT_API_KEY (انسخه أيضاً إلى Base44 Secrets)

# كلمة مرور قاعدة البيانات
echo "PGPASSWORD=$(openssl rand -hex 16)"
```

### 3) التشغيل
```bash
docker compose up -d --build
# التهجير يتم تلقائياً داخل الحاوية
docker compose logs -f vault
```

### 4) reverse proxy مع TLS (مثال Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name vault.jadara.sa;

    ssl_certificate     /etc/letsencrypt/live/vault.jadara.sa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.jadara.sa/privkey.pem;

    # إلزامي: أرشِد فقط IP من داخل المملكة إن لزم (اختياري)
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 30m;
    }
}
```

### 5) فحص الصحة
```bash
curl https://vault.jadara.sa/health
# → {"status":"ok"}
```

---

## واجهة API

كل المسارات تحت `/api/vault/` وتتطلب `X-Vault-Key` و `X-Tenant-Id` إلا التنزيل (رمز JWT).

| الطريقة | المسار | الوصف |
|---|---|---|
| POST | `/employees` | تخزين بيانات موظف حساسة → `emp_ref` |
| POST | `/employees/bulk` | تخزين جماعي (استيراد) |
| GET | `/employees/:empRef` | استرجاع القيم الحساسة المفكوكة |
| PUT | `/employees/:empRef` | تحديث |
| DELETE | `/employees/:empRef` | حذف |
| POST | `/payroll` | تخزين قيم مالية → `payroll_ref` |
| GET | `/payroll/:payrollRef` | استرجاع قيم مالية |
| POST | `/documents` | رفع مستند (multipart) → `doc_ref` |
| POST | `/documents/:docRef/link` | توليد رابط تنزيل مؤقت |
| GET | `/documents/download/:token` | تنزيل عام بالرمز المؤقت |
| POST | `/modules/:module` | تخزين سجل وحدة حساسة → `<module>_ref` |
| GET | `/modules/:module/:ref` | استرجاع سجل مفكوك التشفير |
| PUT | `/modules/:module/:ref` | تحديث **بالدمج** (انظر أدناه) |
| DELETE | `/modules/:module/:ref` | حذف سجل |

### سلوك PUT: دمج لا استبدال

`PUT /modules/:module/:ref` **يدمج** الحمولة الواردة مع السجل المخزَّن ويرجع `{ "merged": true }`،
فلا يمحو تحديثٌ جزئي (ملاحظة مالية، إرجاع عهدة، إضافة مرفق) بقية الحقول الحسّاسة.

- `documents` (مصفوفة رموز مرفقات) تُحدَّث كاملة عند إرسالها: `[]` يحذف كل المرفقات.
- للاستبدال الكامل المتعمّد أرسل `{"data": {...}, "replace": true}` → يرجع `merged: false`.
- عند تعذّر فك تشفير سجل تالف يُتجاهل القديم ويُحفظ الجديد بدل إسقاط الطلب.

### مثال (تخزين موظف)
```bash
curl -X POST https://vault.jadara.sa/api/vault/employees \
  -H "X-Vault-Key: $VAULT_API_KEY" \
  -H "X-Tenant-Id: tenant_123" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"محمد","national_id":"1098765432","bank_account":"SA12345"}'
# → {"emp_ref":"emp_a1b2c3..."}
```

---

## الاختبارات
```bash
npm test          # node --test "test/**/*.test.mjs"
```
يشمل اختبار `crud-put-merge.test.mjs` سلوك الدمج أعلاه (تحديث جزئي، تسلسل خطوات نهاية الخدمة، المرفقات، `replace`، 404، سجل تالف)
على كود `src/lib/crudFactory.js` الفعلي بأبدال لطبقة قاعدة البيانات والتشفير — بلا حاجة إلى PostgreSQL.

---

## ملاحظات
- مفتاح `VAULT_API_KEY` نفسه يُضبط في Base44 كـ secret ليستخدمه الـvaultProxy.
- مفتاح `VAULT_ENCRYPTION_KEY` يبقى **هنا فقط** — لا يُرسل إلى Base44 إطلاقاً.
- النسخ الاحتياطي: اعمل `pg_dump` دورياً وارفع النسخة لمخزن مشفّر داخل المملكة.

---

## تشخيص مشاكل فتح المستندات

١) صحة الخدمة:
```bash
curl https://vault.jadara.sa/health          # → {"status":"ok"}
```
٢) من النظام: عملية `health` في دالة `vaultProxy` تُعيد (بلا كشف أي سر):
```json
{ "configured": true, "has_url": true, "has_key": true, "host": "vault.jadara.sa", "reachable": true, "vault_status": 200 }
```
وتظهر هذه الحالة تلقائياً في رسالة الخطأ عند فشل فتح أي مستند، فيعرف المستخدم السبب فوراً.

٣) سلامة الملفات على القرص:
```bash
npm run verify          # يكشف السجلات التي فُقد ملفها (خطأ 410) والملفات اليتيمة
npm run verify -- --quiet
```

### أخطاء شائعة ومعناها
| ما يظهر للمستخدم | المعنى | الإجراء |
|---|---|---|
| الخزنة السعودية غير مُهيّأة | `VAULT_URL` أو `VAULT_API_KEY` غير مضبوطين في أسرار Base44 | اضبطهما (نفس `VAULT_API_KEY` الموجود هنا) |
| مفتاح الخزنة غير صحيح | مفتاح Base44 لا يطابق مفتاح السيرفر | انسخ القيمة الصحيحة |
| المستند غير موجود في قسم هذه المنشأة | محفوظ تحت مفتاح منشأة آخر أو حُذف ملفه | شغّل `npm run verify` أو أعد الرفع |
| تعذّر الوصول إلى سيرفر الخزنة | DNS/TLS/منفذ مغلق/الخدمة متوقفة | تحقق من النطاق و `docker compose ps` |
| 410 file_missing | السجل موجود والملف مفقود من القرص | استعد الملف من النسخة الاحتياطية |
| schema_mismatch / 42703 | عمود مفقود في قاعدة بيانات الخزنة، وليس مشكلة اتصال | حدّث نسخة الخزنة على السيرفر السعودي وطبّق الترحيل |

### تحديث خادم الخزنة بعد خطأ 42703
نشر واجهة Base44 لا ينشر خادم الخزنة المستقل ولا يحدّث قاعدة بياناته. يجب أولاً نقل **نسخة الخزنة المحدّثة** إلى مجلد النشر الحالي على السيرفر السعودي، مع الإبقاء على ملف `.env` ومجلد `storage` وأحجام قاعدة البيانات والشبكات الحالية.

من مجلد النشر الذي يحتوي على `docker-compose.yml`، وقاعدة البيانات تعمل:
```bash
sudo docker compose build --no-cache vault
sudo docker compose run --rm --no-deps vault node src/migrate.js
# تابع فقط إذا انتهى الترحيل بنجاح.
sudo docker compose up -d --no-deps --force-recreate vault
```
لا تستخدم `docker compose down -v`، ولا تغيّر مفاتيح التشفير. الترحيل يضيف الأعمدة قبل إنشاء الفهارس؛ لا يحذف سجلات ولا يعيد إسناد مستندات لمنشآت أخرى.

بعد التحديث، افحص عملية `health` في `vaultProxy`: يجب أن تكون `reachable` و`documents_ready` كلتاهما `true`. الحالة `document_status: 404` مع `documents_ready: true` متوقعة، لأن الفحص يستخدم مرجعاً غير موجود عمداً للتحقق من نجاح الاستعلام دون إنشاء مستندات.

> تُكتب المستندات الآن تحت **مفتاح ثابت للمنشأة (الرقم الموحد)** لا حساب من رفعها،
> فيفتحها أي عضو في نفس المنشأة، وتبقى السجلات القديمة (المحفوظة تحت حساب الرافع) مقروءة أيضاً.

### النسخ الاحتياطي (إلزامي للمستندات)
المستندات تُخزَّن كملفات على القرص بجانب قاعدة البيانات:
- أبقِ حجمًا دائماً لمجلد `./storage` (مضبوط في `docker-compose.yml`).
- انسخ `pg_dump` **ومجلد** `./storage` معاً — نسخة القاعدة وحدها لا تُفتح منها المستندات.
- أضف `npm run verify` إلى مهمة مجدولة ليكشف أي فقد قبل أن يشتكي العميل.

### مسارات متوفرة في الكود (غير مذكورة أعلاه)
| الطريقة | المسار | الوصف |
|---|---|---|
| POST | `/api/vault/employees/lookup` | جلب دفعة موظفين برموزها ومستأجريها في استعلام واحد (٨ مفاتيح لكل جزء) |
| POST | `/api/vault/employees/find` | مطابقة رقم الهوية (وتاريخ الميلاد) وإرجاع الرموز فقط |
| POST | `/api/vault/employees/bulk` | تخزين جماعي (استيراد موظفين) |
| POST | `/api/vault/modules/:module/bulk` | تخزين جماعي لأي وحدة حساسة |