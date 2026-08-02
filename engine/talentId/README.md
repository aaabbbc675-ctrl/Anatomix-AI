# موتور استعدادیابی ورزشی Anatomix AI

پیاده‌سازی موتور استعدادیابی طبق سند معماری
`استعدادیابی-معماری-نهایی-موتور-v1.md` — یک مجموعه‌ی ۱۶ فایل pure-function
(بدون IO/side-effect) که از داده‌ی خام دستگاه بادی‌اسکن + تست‌های میدانی +
پروفایل روانی، برای هر ورزشکار ۳ تا ۵ رشته‌ی برتر از میان ۵۲ رشته/پست
پیشنهاد می‌دهد، همراه با توضیح ساختارمند برای **هر** رشته (چه پیشنهادشده،
چه ردشده).

امضای دقیق هر تابع export‌شده در [`docs/talentId-API.md`](../../docs/talentId-API.md).

---

## ⚠️ قبل از استفاده‌ی واقعی باید حل شود

سه مورد زیر production-blocking هستند — قبل از استفاده‌ی واقعی توسط
باشگاه‌ها/مربیان (نه فقط تست منطق نرم‌افزار) باید حل شوند:

1. **[`docs/TODO-normative-data.md`](../../docs/TODO-normative-data.md)** —
   `normativeData.json` هنوز `placeholder_unverified` است (فقط ۲ از ۱۰ تست،
   ۲ از ۵ بازه‌ی سنی، ۳ از ۴ tier). امتیازهای `perf_score` فعلاً
   غیرقابل‌اعتماد برای تصمیم‌گیری واقعی‌اند.
2. **[`docs/TODO-tier-a-unreachable.md`](../../docs/TODO-tier-a-unreachable.md)**
   — پیامد مستقیم مورد بالا: با نبود سطح `elite_top_5`، کلاس A با هیچ
   ترکیب واقعی ورودی قابل‌دسترسی نیست (سقف ریاضی فعلی ≈۸۳.۲۵).
3. **[`docs/TODO-medical-coverage-gaps.md`](../../docs/TODO-medical-coverage-gaps.md)**
   — `soccer_striker` هیچ پوشش صریحی زیر `chronic_kidney_disease` ندارد؛
   این یک سؤال بالینی باز است که باید با نفرولوژیست/پزشک طب ورزشی حل شود،
   نه با حدس در کد.

فهرست کامل TODOهای باز (شامل موارد غیر-blocking) در [بخش TODOها](#todoهای-باز) پایین همین فایل.

---

## معماری کلی — زنجیره‌ی داده (طبق بخش ۱.۲ سند)

```
file1 (Intake)  ──┐
file2 (Maturity)──┼──▶ file4 (Bio) ──▶ file5 (Postural) ──▶ file6 (ROM) ──▶ file7 (Perf)
file8 (Psych, ─────┘                                                            │
  چت‌بات) ──▶ file9 (Psych Match)                                                │
                        │                                                       │
file10 (Medical) ───────┼───────────────────────────────────────────────────────┤
                        ▼                                                       ▼
                  file11 (Bio-Banding + RAE) ──▶ file12 (Score Synthesis + CI)
                        │
                        ▼
        file13 (Explainability ★★★ قلب سیستم)
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
file14 (Transfer)  file15 (Tier)   file16 (Report Renderer)
```

## ۷ اصل معماری قفل‌شده (بخش ۰.۳ سند — نقل‌قول مستقیم)

> ### اصل ۱: Advisory-Only Hard-Gate برای اسکلتی/پوسچرال
> **پوسچرال و اسکلتی هرگز رشته را حذف نمی‌کند.** طبق معماری قفل‌شده‌ی موتور بدنسازی/اصلاحی، پوسچرال فقط جریمه می‌گیرد ولی **به هیچ عنوان** رشته را از لیست بیرون نمی‌اندازد. رشته در کلاس مربوطه (A/B/C) قرار می‌گیرد و **Match Report شامل توضیح شفاف** است.

> ### اصل ۲: پاتولوژی پزشکی فعال — Conditional Exclusion (نه Absolute Veto)
> آسیب حاد فعال (فتق دیسک، پارگی رباط، بیماری قلبی...) → رشته به بخش خاکستری «نیاز به مجوز پزشک» می‌رود. با تیک مربی «مجوز اخذ شد ✓» به لیست عادی برمی‌گردد. **هیچ‌وقت به‌طور دائم مخفی نمی‌شود.**

> ### اصل ۳: Explainability اجباری برای همه رشته‌ها
> هر رشته (چه A چه B چه C) باید یک **Match Report ساختارمند ۴ لایه** داشته باشد. رد شدن بدون توضیح ممنوع است.

> ### اصل ۴: Confidence Interval روی همه امتیازها
> هر امتیاز به صورت `مقدار ± CI` گزارش می‌شود. کاربر با CI کمتر از ۱۰٪ Score قابل اعتماد دیده می‌شود.

> ### اصل ۵: تفکیک صفات آموزش‌پذیر از ژنتیکی
> هر فاکتور در ماتریس نیاز رشته‌ها یک تگ `trainability` دارد: `innate` (قد، طول اهرم‌ها)، `partial` (VO2max، انعطاف)، `trainable` (استقامت عضلانی، قدرت). این تگ در Match Report برای تصمیم‌گیری استفاده می‌شود («کسری قدرت پنجه با تمرین جبران‌پذیر است»).

> ### اصل ۶: Bio-Age > Chronological Age
> تمام تصمیم‌گیری‌ها بر اساس **سن بیولوژیک** (نه سن تقویمی) انجام می‌شود. Mirwald + Khamis-Roche.

> ### اصل ۷: هشدار RAE اجباری
> اگر ماه تولد کاربر در ۳ ماه اول سال ورزشی است، هشدار Relative Age Effect به مربی داده می‌شود.

⚠️ توجه: اصل ۶ صراحتاً «Mirwald + Khamis-Roche» می‌گوید، اما طبق تصمیم
تاییدشده‌ی Commit 3، فقط Mirwald پیاده شده — Khamis-Roche بدون جدول ضرایب
واقعی از سند بود و ساختنش یعنی حدس زدن دقیقاً همان چیزی که این پروژه
سعی در اجتنابش دارد؛ خارج از بازه‌ی معتبر Mirwald، `chronological_fallback`
استفاده می‌شود.

---

## وضعیت هر فایل

| فایل | Commit | هدف | محدودیت شناخته‌شده |
|---|---|---|---|
| `file1_intakeInputs.js` | ۲ | اعتبارسنجی/نرمال‌سازی سه ورودی خام | — |
| `file2_maturityCalculator.js` | ۳ | Maturity Offset و Bio-Age (Mirwald) | Khamis-Roche پیاده نشده |
| `file3_normativeDataLookup.js` | ۴ | Lookup صدک بر اساس نُرم مرجع | [TODO-normative-data](../../docs/TODO-normative-data.md) 🔴 |
| `file4_bioScoreCalculator.js` | ۵ | امتیاز پیکرسنجی هر رشته | — |
| `file5_posturalAdvisoryLayer.js` | ۶ | پنالتی پوسچرال (هرگز veto) | [TODO-corrective-module-linking](../../docs/TODO-corrective-module-linking.md) 🟡 |
| `file6_flexibilityROMAdjustments.js` | ۷ | پنالتی ROM/انعطاف (هرگز veto) | — |
| `file7_perfScoreCalculator.js` | ۸ | امتیاز عملکردی با renormalize | [TODO-normative-data](../../docs/TODO-normative-data.md) 🔴, [TODO-missing-reaction-test](../../docs/TODO-missing-reaction-test.md) 🟢 |
| `file8_psychProfileExtractor.js` | ۹ | استخراج پروفایل روانی از چت‌بات | [TODO-api-key-security](../../docs/TODO-api-key-security.md) 🟠 |
| `file9_psychMatchCalculator.js` | ۹ | تطابق پروفایل روانی با نیاز رشته | — |
| `file10_medicalConditionalGate.js` | ۱۰ | گیت پزشکی مشروط (dual-layer) | [TODO-medical-coverage-gaps](../../docs/TODO-medical-coverage-gaps.md) 🔴 |
| `file11_bioBandingAdjuster.js` | ۱۱ | تعدیل بیو-بندینگ + هشدار RAE | [TODO-power-sports-wave2](../../docs/TODO-power-sports-wave2.md) 🟡 |
| `file12_scoreSynthesis.js` | ۱۲ | تلفیق نهایی امتیاز + CI | [TODO-ci-computation](../../docs/TODO-ci-computation.md) 🟡 |
| `file13_explainabilityEngine.js` ★★★ | ۱۳ | موتور Explainability (قلب سیستم) | [TODO-postural-rom-integration](../../docs/TODO-postural-rom-integration.md) ⚪ resolved |
| `file14_talentTransferSuggester.js` | ۱۴ | پیشنهاد انتقال استعداد | [TODO-transfer-potential-formula](../../docs/TODO-transfer-potential-formula.md) 🟡 |
| `file15_tierClassifier.js` | ۱۵ | طبقه‌بندی نهایی برای داشبورد | [TODO-tier-overflow-wave2](../../docs/TODO-tier-overflow-wave2.md) 🟡 |
| `file16_reportRenderer.js` | ۱۶ | رندر گزارش نهایی (Coach/Client) | — |
| `shared/sportRequirementMatrix.js` | ۱،۱۷-۱۹ | ماتریس نیازهای ۵۲ رشته | [TODO-wave-labeling-correction](../../docs/TODO-wave-labeling-correction.md) ⚪ resolved |
| `shared/sensitivePeriodsLTAD.js` | ۲۰ | پنجره‌های حساس آموزش‌پذیری (LTAD) | Level II evidence، رجوع کنید به کامنت بالای فایل |
| `src/engine/talentIdCascade.js` + UI | ۲۱ | اتصال UI (فرم + گزارش، بدون persistence) | فقط نمایش زنده‌ی in-session |
| `scripts/test-engine-talentid-e2e-scenarios.js` | ۲۲ | ۵ سناریوی End-to-End دستی‌وریفای‌شده | کشف‌کننده‌ی ۳ باگ واقعی wiring (رفع‌شده) |

## اجرای تست‌ها

هر فایل تست یک اسکریپت مستقل Node (بدون framework، الگوی `check`/`assert`
دستی) است:

```bash
node scripts/test-engine-talentid-file1-intake.js
# ... تا
node scripts/test-engine-talentid-e2e-scenarios.js
```

اسکریپت‌های مرتبط با talentId همه با پیشوند `test-engine-talentid-` در
پوشه‌ی `scripts/` هستند (۲۵ فایل، تا Commit 22).

## UI

`src/pages/TalentIdAssessment/` (فرم ۶مرحله‌ای) → `src/pages/TalentIdReport/`
(نمایش زنده‌ی نتیجه، از طریق `src/engine/talentIdCascade.js`). ورودی از
`StudentProfile.jsx` («+ ارزیابی استعداد») در دسترس است. **بدون persistence
فعلی** — نتیجه فقط in-session محاسبه و نمایش داده می‌شود؛ ذخیره‌سازی در
تاریخچه‌ی شاگرد به یک Commit جدا موکول شده.

## TODOهای باز

| فایل | خلاصه | اولویت |
|---|---|---|
| [TODO-normative-data.md](../../docs/TODO-normative-data.md) | داده‌ی نُرم مرجع placeholder است | 🔴 Production-blocking |
| [TODO-tier-a-unreachable.md](../../docs/TODO-tier-a-unreachable.md) | کلاس A فعلاً ریاضاً دست‌نیافتنی است | 🔴 Production-blocking |
| [TODO-medical-coverage-gaps.md](../../docs/TODO-medical-coverage-gaps.md) | soccer_striker زیر CKD پوشش ندارد | 🔴 Production-blocking |
| [TODO-api-key-security.md](../../docs/TODO-api-key-security.md) | چت‌بات روانی به IPC واقعی وصل نیست | 🟠 Feature-blocking |
| [TODO-corrective-module-linking.md](../../docs/TODO-corrective-module-linking.md) | بدون شناسه‌ی protocol واقعی در موتور اصلاحی | 🟡 فاز ۲ |
| [TODO-ci-computation.md](../../docs/TODO-ci-computation.md) | CI فعلاً baseline-only است (همیشه ۳) | 🟡 فاز ۲ |
| [TODO-transfer-potential-formula.md](../../docs/TODO-transfer-potential-formula.md) | شباهت رشته‌ها ۳-سطحی و تقریبی است | 🟡 فاز ۲ |
| [TODO-tier-overflow-wave2.md](../../docs/TODO-tier-overflow-wave2.md) | سقف A=۳/B=۵ در نمای پیش‌فرض داشبورد | 🟡 فاز ۲ |
| [TODO-power-sports-wave2.md](../../docs/TODO-power-sports-wave2.md) | ۱۴ رشته هنوز برای POWER_SPORTS بازبینی‌نشده | 🟡 فاز ۲ |
| [TODO-missing-reaction-test.md](../../docs/TODO-missing-reaction-test.md) | بدون سنجه‌ی reaction-time/hand-eye | 🟢 کم‌اهمیت |
| [TODO-wave-labeling-correction.md](../../docs/TODO-wave-labeling-correction.md) | تصحیح برچسب Wave سند (تاریخی) | ⚪ حل‌شده |
| [TODO-postural-rom-integration.md](../../docs/TODO-postural-rom-integration.md) | اتصال پنالتی پوسچرال/ROM به امتیاز (تاریخی) | ⚪ حل‌شده |
