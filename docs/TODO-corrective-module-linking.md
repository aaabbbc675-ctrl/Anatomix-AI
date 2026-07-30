# TODO — اتصال به ماژول‌های موتور اصلاحی (Corrective Module Linking)

## ⚠️ وضعیت فعلی: not_yet_linked

`engine/talentId/file5_posturalAdvisoryLayer.js` طبق بخش ۶.۷ سند معماری استعدادیابی باید
هر `PosturalAdjustment` را به یک پروتکل مشخص در موتور اصلاحی وصل کند (مثلاً
`"CORR-KYPHOSIS-MODERATE-PROTOCOL-A"`).

**این ID ها واقعی نیستند.** جستجوی کامل در `engine/corrective/` (که طبق userMemories قبلاً
کامل شده) نشان داد هیچ سیستم شناسه‌ی `CORR-*` یا registry مشابهی وجود ندارد — فقط تشخیص
سندروم (مثل `upper_crossed_syndrome` در `file9_syndromeDetection.js`) بدون یک شناسه‌ی
protocol قابل‌ارجاع از بیرون.

به همین دلیل، فعلاً هر `PosturalAdjustment` دارد:
```js
suggested_corrective_module_id: null,
corrective_module_status: "not_yet_linked",
```
به‌جای یک رشته‌ی جعلی که وانمود کند به چیزی واقعی وصل است.

## قبل از استفاده‌ی production باید انجام شود

یکی از این دو مسیر:

1. **موتور اصلاحی یک سیستم شناسه‌ی protocol اضافه کند** (مثلاً هر ترکیب سندروم/تمرین یک
   `protocol_id` بگیرد) و سپس این فایل به آن وصل شود.
2. **یا** نگاشت مستقیم‌تری بسازیم: هر `posture_type` استعدادیابی (kyphosis, scoliosis, ...)
   را به `syndrome` معادلش در `engine/corrective/file9_syndromeDetection.js` وصل کنیم (نه به
   یک "protocol ID" که اصلاً وجود ندارد) و از همان مسیر موجود corrective cascade استفاده
   کنیم.

## تا این کار انجام نشود

بخش «مسیر اصلاح» (Correction Path) در Match Report (file13، Commit 13) نمی‌تواند مستقیماً
به یک پروتکل مشخص در موتور اصلاحی لینک بدهد — فقط می‌تواند زمان تخمینی (`typical_correction_time_weeks`)
و دلیل بیومکانیکی را نشان دهد، بدون لینک عملیاتی به تمرین‌های واقعی.
