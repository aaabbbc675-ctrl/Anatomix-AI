// جدول هفته‌های اصلاح استاندارد بر اساس posture × severity، طبق بخش ۶.۵
// سند معماری. برخلاف Mirwald (Commit 3، فرمول ریاضی قابل‌محاسبه‌ی مستقل)
// و normativeData (Commit 4، آمار خام placeholder_unverified)، این اعداد
// قضاوت بالینی مبتنی بر روش‌شناسی نام‌برده‌شده‌اند (NASM CES + Kendall
// Muscle Testing 2005) — نه فرمولی که بشود دستی وریفای کرد، نه آماری که
// از یک مقاله‌ی مشخص با جدول percentile استخراج شده باشد. سطح شواهدشان
// هم‌تراز Commit 5 (قضاعد امتیازدهی محصولی) است: پیاده‌سازی مستقیم بدون
// ادعای «وریفای مستقل» و بدون flag placeholder_unverified — یک دسته‌ی
// سوم، بینابین.
const postureCorrectionTime = {
  kyphosis: { 1: 4, 2: 8, 3: 12 },
  hyperlordosis: { 1: 4, 2: 8, 3: 12 },
  scoliosis: { 1: 8, 2: 16, 3: 24 },
  genu_valgum: { 1: 6, 2: 12, 3: 20 },
  genu_varum: { 1: 6, 2: 12, 3: 20 },
  flat_foot: { 1: 4, 2: 8, 3: 16 },
  forward_head: { 1: 4, 2: 6, 3: 10 },
  rounded_shoulder: { 1: 4, 2: 6, 3: 10 },
};

export { postureCorrectionTime };
