# مجلد رفع نسخة أبل (IPA)

هذا المجلد مخصص لملف الأبل الجاهز اللي يعطيك إياه Base44.

## الخطوات (بدون Mac مستأجر):

1. حمّل نسخة App Store من Base44 (ملف `.ipa`).
2. انسخه إلى هنا وسمّه مثلا `app.ipa`:
   `ios-upload/app.ipa`
3. ادفع إلى GitHub:
   `git add ios-upload/app.ipa`
   `git commit -m "رفع نسخة أبل الجديدة"`
   `git push`
4. الـ Workflow المسمى `Upload IPA to App Store Connect` سيشتغل تلقائياً على سيرفر Mac سحابي ويرفع الملف إلى حسابك في App Store Connect.
5. بعد دقائق ادخل إلى App Store Connect > TestFlight وستجد البناء الجديد بجانب `2.131675.6 (6)` — ثم اضغط Add for Review.

## المفاتيح المطلوبة (مرة واحدة فقط):

من حسابك في App Store Connect أنشئ مفتاح API ثم أضفه في GitHub هنا:
`GitHub repo > Settings > Secrets and variables > Actions > New repository secret`

- `APP_STORE_KEY_ID` = الـ Key ID
- `APP_STORE_ISSUER_ID` = الـ Issuer ID
- `APP_STORE_P8_BASE64` = محتوى ملف `.p8` مشفر Base64 (نحوّله بهذا الأمر على جهازك قبل اللصق، بدون رفعه هنا).

ملاحظة: لا تضع ملفات `.p8` أو كلمات المرور داخل الريبو أبداً — فقط في Secrets.
