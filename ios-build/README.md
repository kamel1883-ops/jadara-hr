# مجلد نسخة iOS

ضع هنا ملف النسخة المصدّر من Base44 بهذا الاسم بالضبط:

```
ios-build/app.ipa
```

ثم ادفع (push) — وسيتكفل GitHub Actions برفعه تلقائياً إلى TestFlight.

شروط ملف الـ `.ipa` حتى تقبله أبل:
- موقّع بشهادة التوزيع (Distribution) الخاصة بحساب الـ Apple Developer تبعك.
- نفس الـ Bundle ID المسجّل لتطبيقك في App Store Connect.
- رقم البناء (Build Number) أعلى من آخر نسخة رُفعت.
- الحجم أقل من 100MB (إذا أكبر، أخبرني لأجهز لك Git LFS).

ملف `app.ipa` نفسه لا يُرفع هنا — ضعه أنت من جهازك.
