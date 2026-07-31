# TODO — بازبینی POWER_SPORTS برای رشته‌های جدید Commit 17

## وضعیت فعلی (بعد از تصحیح)

`engine/talentId/shared/sportCategories.js` حالا **۱۴ رشته** را «قدرتی» (power
sport، برای منظور بیو-بندینگ early/late maturer) طبقه‌بندی می‌کند: ۴ رشته‌ی
اصلی Commit 11 (`weightlifting_olympic, wrestling_freestyle,
volleyball_middle_blocker, soccer_striker`) + **۱۰ رشته‌ی جدید Commit 17** که
با استدلال مستند اضافه شدند:

- **شواهد مستقیم و قوی** (critical_perf_tests دقیقاً تست‌های انفجاری‌اند):
  `judo, wrestling_greco, sprint_100m, sprint_200m, handball_back, handball_pivot`.
- **شواهد ادبیاتی** (هم‌سطح استدلال ادبیاتی wrestling_freestyle اصلی، نه
  تطابق مستقیم critical_perf_tests): `boxing, MMA, karate, wushu_sanda`.

استدلال کامل هرکدام در کامنت بالای `POWER_SPORTS` در `sportCategories.js` آمده.

## ⚠️ باقی‌مانده — هنوز صادقانه ناتمام

این تصحیح **همه‌چیز را حل نکرد**. از ۲۴ رشته‌ی جدید Commit 17، **۱۴ رشته
هنوز بدون بازبینی** مانده‌اند و طبق پیش‌فرض `isPowerSport` برایشان `false`
است — بدون این‌که این پیش‌فرض لزوماً درست باشد:

`futsal_goalkeeper, futsal_fixo, futsal_flank, futsal_pivot, tennis_singles,
table_tennis, shooting_target, cycling_road, marathon,
middle_distance_running, taekwondo, gymnastics_artistic, handball_goalkeeper,
handball_wing`

بعضی از این‌ها (مثل `shooting_target`, `cycling_road`, `marathon`) بدیهتاً
non-power هستند (استقامتی/دقتی محض) و پیش‌فرض `false` برایشان درست است — اما
بعضی دیگر (مثل `taekwondo` که رشته‌ی رزمی است، یا `futsal_pivot`/`handball_wing`
که `vertical_jump`/`sprint_10m` را critical می‌دانند) واقعاً نیاز به بررسی
دارند و صرفاً هنوز فرصت نشده.

## قبل از استفاده‌ی production باید انجام شود

یک بازبینی جامع (نه لزوماً یک Commit جدا) باید هر ۱۴ رشته‌ی باقی‌مانده را
تک‌به‌تک با همان معیار (critical_perf_tests مستقیم، یا در نبود آن، ادبیات
عمومی رشته) بررسی کند — دقیقاً هم‌الگوی همین Commit.
