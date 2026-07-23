// کالیبراسیون هوازی بر اساس ضربان استراحت (HRrest) — ماژول ۴/۱۷ سند.
// این یک «Restriction Patch» نیست (چیزی را ممنوع/محدود نمی‌کند)، بلکه یک
// calibration جداست: عدد Modifier مستقیم (نه نسبی) به درصد هوازی پایه اضافه
// می‌شود. baseAerobicPercent از منطق تجویز هوازی می‌آید که هنوز ساخته نشده؛
// این تابع فقط خودِ فرمول کالیبراسیون را پیاده می‌کند تا وقتی آن بخش ساخته شد
// آماده‌ی استفاده باشد.
function calibrateAerobicPercent(hrRest, baseAerobicPercent) {
  let modifier;
  if (hrRest < 60) modifier = -10;
  else if (hrRest <= 70) modifier = 0;
  else if (hrRest <= 80) modifier = 10;
  else modifier = 20;

  return {
    hr_rest_modifier: modifier,
    final_aerobic_percent: baseAerobicPercent + modifier,
  };
}

module.exports = { calibrateAerobicPercent };
