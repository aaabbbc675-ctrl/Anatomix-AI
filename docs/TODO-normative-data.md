# TODO — داده‌ی نُرم مرجع (Normative Data)

## ⚠️ وضعیت فعلی: placeholder_unverified

`engine/talentId/shared/normativeData.json` در حال حاضر **placeholder_unverified** است
(به `data_status` در ریشه‌ی فایل نگاه کنید). این داده فقط زیرساخت lookup را تست می‌کند
(Commit 4، بخش ۴ سند معماری استعدادیابی) — از هیچ منبع علمی معتبری استخراج نشده.

اعداد فعلی از سند قدیمی پروژه (`پرامپ استعداد یابی ورزشی.docx`) reuse شده‌اند، اما خودِ آن
سند هم صریحاً این اعداد را «۳ سطح فرضی» اعلام کرده بود — یعنی هیچ‌وقت داده‌ی واقعی نبوده‌اند،
نه در این پروژه، نه در سند قبلی‌اش.

## قبل از استفاده‌ی production باید انجام شود

باید با داده‌ی واقعی از یکی از این منابع جایگزین شود:

- **DMT 6-18** (Bös K, et al. *Deutscher Motorik-Test 6-18*. Ahrensburg: Czwalina; 2009)
- **Tomkinson GR, et al.** *European normative values for physical fitness in children and
  adolescents aged 9-17 years: Results from 2,779,165 Eurofit performances representing 30
  countries.* Br J Sports Med 2018.

با این تعدیل‌های لازم:

1. **تطبیق به bio-age** — هر دو منبع بالا بر اساس سن تقویمی‌اند، نه سن بیولوژیک (Mirwald).
   باید یا جدول‌های خودشان به بازه‌های bio-age (`bio_age_8_9` تا `bio_age_16_17`) نگاشت شوند،
   یا منبع دیگری که مستقیماً bio-age-banded باشد پیدا شود.
2. **پوشش کامل ۹ تست** — فعلاً فقط `vertical_jump` و `sprint_10m` داریم. باید تکمیل شود:
   `broad_jump`, `agility_5_10_5`, `beep_test`, `handgrip`, `pushups`, `sit_and_reach`,
   `wall_toss`.
3. **پوشش کامل ۵ بازه‌ی سنی × ۲ جنس** — فعلاً فقط `bio_age_10_11` و `bio_age_14_15` (مرد و زن).
   باید `bio_age_8_9`, `bio_age_12_13`, `bio_age_16_17` هم اضافه شوند.
4. **۴ tier کامل** — فعلاً فقط ۳ tier داریم (`excellent_top_20`, `average_mid_60`,
   `poor_bottom_20`). `elite_top_5` طبق schema بخش ۴.۳ سند معماری باید اضافه شود، اما فقط اگر
   منبع واقعی چنین تفکیکی بدهد — نه با حدس زدن یک آستانه‌ی بالاتر از excellent.

## تا این کار انجام نشود

امتیازهای `perf_score` خروجی موتور برای تصمیم‌گیری واقعی (نه فقط تست منطق نرم‌افزار)
**غیرقابل‌اعتماد** هستند.

## پیامد مستقیم روی Commit 8 (file7_perfScoreCalculator.js)

چون فقط ۲ تست پوشش داده شده‌اند، `computePerfScoreForSport` مجبور است تست‌های بدون norm را
skip و وزن‌های باقی‌مانده را renormalize کند (رجوع کنید به کامنت بالای آن فایل). یعنی
`Perf_Score` هر رشته فعلاً روی بخش کوچکی از وزن واقعی‌اش ساخته شده — مثلاً برای
`soccer_striker` فقط `sprint_10m(0.25) + vertical_jump(0.20) = 0.45` از ۱.۰۰ وزن واقعی قابل
ارزیابی است؛ بقیه در `data_coverage.skipped_tests` با دلیل `normative_missing` ثبت می‌شوند.
با تکمیل ۹ تست دیگر طبق بند بالا، این پوشش هم به‌طور خودکار کامل می‌شود — نیازی به تغییر کد
`file7` نیست.
