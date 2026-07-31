# TODO — نبود سنجه‌ی Reaction-Time / Hand-Eye Coordination در NormalizedIntake

## یافته (کشف‌شده حین ساخت schema برای table_tennis، Commit 17)

بانک تست‌های فعلی (`NormalizedIntake.performance`، Commit 2) این تست‌ها را دارد:
`vertical_jump_cm, broad_jump_cm, sprint_10m_sec, sprint_30m_sec, agility_sec,
beep_level, handgrip_dominant_kg, pushups_count, sit_and_reach_cm, wall_toss_count`.

**هیچ‌کدام سنجه‌ی مستقیم reaction-time یا hand-eye coordination نیست.** برای
`table_tennis`، نزدیک‌ترین proxy موجود (`agility_5_10_5`) واقعاً چابکی پا را
می‌سنجد، نه سرعت واکنش دست/چشم که رکن اصلی تنیس روی میز است.

## چرا این فراتر از یک رشته‌ی منفرد اهمیت دارد

این محدودیت فقط مخصوص `table_tennis` نیست — رشته‌های دیگری هم به همین سنجه
نیاز دارند که هنوز نساخته‌ایم:
- **فنسینگ** (`fencing`، Wave 3 — ردیف #۵۱ جدول ۲۰.۶): واکنش سریع به حمله‌ی حریف.
- **دروازه‌بان‌ها** (`soccer_goalkeeper`, `handball_goalkeeper`, `futsal_goalkeeper`):
  واکنش به شوت، هرچند `agility_5_10_5` تا حدی proxy قابل‌قبول‌تری برای این‌ها
  است (چون شامل حرکت بدن هم می‌شود، نه فقط دست).
- به‌طور بالقوه بازیکنان راکتی دیگر (`tennis_singles`) هم از این سنجه سود
  می‌برند، هرچند برایشان `agility_5_10_5` proxy نسبتاً معقول‌تری است.

## قبل از استفاده‌ی production باید انجام شود

باید در فاز بعدی (احتمالاً هنگام گسترش device schema در Commit 2/file1) یک
تست جدید reaction-time (مثلاً با دستگاه‌های تجاری مثل FitLight یا حتی یک
تست ساده‌ی app-based) به `NormalizedIntake.performance` اضافه شود، و سپس
`performance_weights` رشته‌های بالا بازبینی شوند تا این تست واقعی جایگزین
proxy‌های ضعیف فعلی شود.

## تا این کار انجام نشود

امتیاز عملکردی `table_tennis` (و در آینده `fencing`) بر اساس تست‌هایی ساخته
می‌شود که رکن اصلی این رشته‌ها را نمی‌سنجند — دقیقاً هم‌رده‌ی محدودیت
`normativeData.json` (Commit 4): زیرساخت تست می‌شود، اما برای تصمیم‌گیری
واقعی هنوز کافی نیست.
