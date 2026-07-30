# TODO — شکاف‌های پوشش پزشکی در activePathologyMap

## ⚠️ سؤال بازِ نیازمند مشاوره‌ی پزشکی: soccer_striker زیر chronic_kidney_disease

`engine/talentId/shared/activePathologyMap.js` → `chronic_kidney_disease.affects_sports`
فقط کلیدهای صریح `wrestling`, `wrestling_freestyle`, `boxing` را دارد (هر سه `critical_risk`).
سند معماری اصلی این پاتولوژی را زیر دو دسته‌ی wildcard تعریف کرده بود:
`contact_sports_all` و `martial_arts_all` — که در این پروژه resolve نشدند، چون این‌ها
sport-id واقعی نیستند و با category enum ما (`strength`/`team_ball`/`combat`/...) یک‌به‌یک
منطبق نمی‌شوند (تصمیم Commit 10: حدس زده نشود).

**سؤال باز:** آیا `soccer_striker` — به‌عنوان یک رشته‌ی نیمه‌تماسی (تکل، برخورد رقابتی، ریسک
ضربه به پهلو/کمر) — باید زیر محدودیت بیماری کلیوی مزمن قرار بگیرد (مثلاً `moderate_risk`)؟

این تصمیم **نباید بدون مشاوره‌ی پزشک متخصص طب ورزشی/نفرولوژیست حدس زده شود** — نه با یک عدد
دلبخواهی و نه با فرض این‌که «فوتبال شبیه کشتی است پس همون ریسک را می‌گیرد». تا آن مشاوره
انجام نشود، `soccer_striker` فعلاً **بدون پوشش صریح** باقی می‌ماند و `computeMedicalHoldForSport`
برای این ترکیب `status: "clear"` برمی‌گرداند — یعنی این یک gap واقعی و بالقوه‌خطرناک است، نه
یک تصمیم بی‌خطر.

## بررسی‌شده و به‌درستی بدون پوشش (بی‌خطر — این‌ها نگران‌کننده نیستند)

این دو رشته هم زیر `chronic_kidney_disease` پوشش صریح ندارند، اما برخلاف `soccer_striker`،
این عمداً و به‌درستی است چون هر دو غیرتماسی‌اند و حتی اگر wildcardهای سند resolve می‌شدند،
منطقاً همچنان خارج از `contact_sports_all`/`martial_arts_all` می‌ماندند:

- `volleyball_middle_blocker` — بدون تماس فیزیکی مستقیم با حریف (تور بین دو تیم).
- `weightlifting_olympic` — بدون تماس فیزیکی؛ ریسک اصلی آن بار محوری روی ستون فقرات است
  (که در `active_disc_herniation`/`active_severe_scoliosis_cobb_over_40` جداگانه پوشش داده
  شده)، نه ضربه به کلیه.

## قبل از استفاده‌ی production باید انجام شود

با یک منبع پزشکی معتبر (نفرولوژیست ورزشی یا گایدلاین رسمی مثل ACSM/IOC) این سؤال حل شود، و
در صورت نیاز، یک ورودی صریح `soccer_striker: "<risk_level>"` به
`activePathologyMap.chronic_kidney_disease.affects_sports` اضافه شود — با همان الگوی
`wrestling_freestyle` موجود.

این TODO هم‌خانواده‌ی [`TODO-normative-data.md`](TODO-normative-data.md) و
[`TODO-corrective-module-linking.md`](TODO-corrective-module-linking.md) است: شکافی که آگاهانه
مستند شده تا فراموش نشود، نه چیزی که با حدس پر شده باشد.
