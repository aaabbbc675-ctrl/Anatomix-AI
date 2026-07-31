# تصحیح — برچسب‌های Wave 1/2/3 سند قابل‌اتکا نیستند

## یافته (کشف‌شده حین آماده‌سازی Commit 17)

بخش ۲۰.۱ سند می‌گوید Wave 1 واقعی **۱۵ رشته** است: فوتبال (۶ پست: goalkeeper,
center_back, full_back, defensive_mid, winger, striker) + بسکتبال (۳ پست:
playmaker, shooter, center) + والیبال (۴ پست: setter, libero, middle_blocker,
outside) + `swimming_general` + `weightlifting_olympic`.

اما ۵ رشته‌ای که در Commit 1 «Wave 1» نامیده شدند این‌ها بودند:
`soccer_striker, wrestling_freestyle, volleyball_middle_blocker, swimming_general,
weightlifting_olympic`. از این ۵ تا فقط ۴ تا واقعاً در Wave 1 سند هستند —
`wrestling_freestyle` طبق جدول معتبر بخش ۲۰.۶ (ردیف #۳۰) در **Wave 2** است، نه ۱.

علاوه بر این، بخش ۲۰.۲ می‌گوید «Wave 2 — ۲۰ رشته»، اما جدول تفصیلی بخش ۲۰.۶
(ردیف‌های ۱۶ تا ۴۰) واقعاً **۲۵ رشته** برای Wave 2 لیست کرده — یک ناسازگاری
حسابی دیگر در خودِ سند، هم‌رده‌ی خطای مقدار نمونه‌ی Mirwald (Commit 3) و
مثال JSON بخش ۱۴.۵ (Commit 13).

## تصمیم تاییدشده (Commit 17)

طبق استدلال کاربر: برچسب «Wave 1/2/3» در commit messageها و مستندات آینده
دیگر استفاده نمی‌شود — به‌جایش «دسته‌بندی موضوعی» (تیمی-توپی، رزمی،
رکوردی/استقامتی، راکتی/دقتی/زیبایی‌شناختی) به کار می‌رود. این برچسب‌ها
معیار عملی هستند (چه ساخته شده، چه نه)، نه یک شماره‌ی Wave که در خودِ سند
هم قابل‌اتکا نیست.

## شمارش دقیق برای پیگیری Commitهای بعدی

- کل رشته‌های جدول ۲۰.۶: ۵۲.
- ساخته‌شده تا پایان Commit 16: ۵ رشته (`soccer_striker`, `wrestling_freestyle`,
  `volleyball_middle_blocker`, `swimming_general`, `weightlifting_olympic`).
- Commit 17 اضافه می‌کند: ۲۴ رشته (تمام ردیف‌های ۱۶-۴۰ جدول ۲۰.۶ به‌جز
  `wrestling_freestyle` که از قبل ساخته شده بود).
- **باقی‌مانده بعد از Commit 17: ۲۳ رشته**، شامل:
  - ۱۱ رشته‌ی «Wave 1 واقعی» جامانده: `soccer_goalkeeper, soccer_center_back,
    soccer_full_back, soccer_defensive_mid, soccer_winger, basketball_playmaker,
    basketball_shooter, basketball_center, volleyball_setter, volleyball_libero,
    volleyball_outside`.
  - ۱۲ رشته‌ی ردیف‌های ۴۱-۵۲ جدول ۲۰.۶ (`powerlifting, bodybuilding, chess,
    long_jump, high_jump, shot_put, discus, climbing, rowing, archery, fencing,
    diving`).

این شمارش (۵۲ = ۵ + ۲۴ + ۲۳) باید هنگام برنامه‌ریزی Commitهای بعدی مرجع باشد،
نه شماره‌ی Wave سند.
