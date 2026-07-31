// نقشه‌ی تأثیر پوسچرال روی رشته‌ها، طبق بخش ۶.۴ سند معماری.
//
// طبق تصمیم تاییدشده‌ی Commit 6: این map دوکلیدی است — هم sport-idهای
// عمومی خودِ سند (swimming, soccer, volleyball, ...) برای سازگاری با
// رشته‌های Wave 2/3 آینده، هم sport-idهای دقیق ۵ رشته‌ی فعلی matrix
// (swimming_general, soccer_striker, volleyball_middle_blocker) که مقدارشان
// عیناً از همان ردیف عمومی کپی شده. wrestling_freestyle و
// weightlifting_olympic از قبل با همین نام دقیق در سند آمده بودند،
// نیازی به کپی نداشتند.
//
// forward_head هیچ‌کدام از ۵ رشته‌ی فعلی ما را پوشش نمی‌دهد (فقط
// boxing/tennis/swimming_butterfly که نداریم) — عمداً چیزی برایش حدس
// زده نشد.
//
// beneficial:'mild_only' یا 'always' طبق تصمیم تاییدشده‌ی Commit 6: مقدار
// penalty ذخیره‌شده (۰) در همه‌ی severityها به همین صورت اعمال می‌شود —
// این فلگ صرفاً informational/narrative است، severity-gate نیست (سند
// عددی برای severity ۲/۳ این موارد نداده، پس چیزی اختراع نشد).
const posturalSportImpactMap = {
  kyphosis: {
    swimming: { penalty: -25, reason: "محدودیت پروانه و کرال پشت" },
    swimming_general: { penalty: -25, reason: "محدودیت پروانه و کرال پشت" },
    swimming_butterfly: { penalty: -35, reason: "پروانه نیازمند اکستنشن قدرتمند ستون فقرات" },
    weightlifting_olympic: { penalty: -25, reason: "ناتوانی در نگه داشتن وزنه Overhead" },
    volleyball_middle_blocker: { penalty: -25, reason: "اسپک نیازمند اکستنشن کامل تنه" },
    gymnastics: { penalty: -30, reason: "اکستنشن بالای سر برای Handstand" },
    boxing: { penalty: 0, beneficial: "mild_only", reason: "کایفوز خفیف: حفاظت طبیعی چانه" },
    cycling: { penalty: 0, beneficial: "mild_only", reason: "کایفوز خفیف: آیرودینامیک" },
    // دوکلیدی جدید Commit 18: هیچ کلید عمومی "volleyball" در این نقشه
    // نبود (فقط volleyball_middle_blocker خاص، از Commit 6) — outside با
    // همان مقدار خاص MB کپی شد (سازوکار یکسان: اسپک). setter مورد ضعیف‌تر
    // گروه (رجوع کنید به کامنت volleyball_setter در sportRequirementMatrix.js).
    volleyball_outside: { penalty: -25, reason: "اسپک نیازمند اکستنشن کامل تنه" },
    volleyball_setter: { penalty: -25, reason: "ست‌زنی بالای سر نیازمند اکستنشن تنه (خفیف‌تر از اسپک)" },
  },

  hyperlordosis: {
    gymnastics: { penalty: -20, reason: "گودی کمر شدید = ریسک اسپوندیلولیزیس" },
    weightlifting_olympic: { penalty: -20, reason: "اسکات و اسنچ نیازمند کنترل کمر" },
    diving: { penalty: -25, reason: "شیرجه با گودی کمر شدید = ریسک بالای Fracture" },
    figure_skating: { penalty: -20, reason: "اکستنشن‌های تکراری کمر" },
  },

  scoliosis: {
    wrestling_freestyle: { penalty: -25, reason: "گراپلینگ و پیچش تنه ریسک تشدید" },
    wrestling_greco: { penalty: -25, reason: "مشابه کشتی آزاد" },
    weightlifting_olympic: { penalty: -25, reason: "بار محوری روی ستون فقرات نامتقارن" },
    gymnastics: { penalty: -20, reason: "ریسک عوارض rotation" },
    swimming: { penalty: 0, beneficial: "always", reason: "شنا برای اسکولیوز درمانی است" },
    swimming_general: { penalty: 0, beneficial: "always", reason: "شنا برای اسکولیوز درمانی است" },
  },

  genu_valgum: {
    volleyball: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    volleyball_middle_blocker: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    basketball: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    high_jump: { penalty: -30, reason: "فرودهای مکرر" },
    handball: { penalty: -25, reason: "شیرجه و پرش" },
    long_jump: { penalty: -25, reason: "فرود Split-leg" },
    swimming: { penalty: 0, reason: "بی‌اثر — شنا بدون تحمل وزن است" },
    // ⚠️ دوکلیدی جدید Commit 18 (کپی مستقیم از basketball/volleyball عمومی
    // موجود، نه عدد تازه): هر ۳ پست بسکتبال + volleyball_setter/outside.
    // volleyball_libero عمداً حذف شد — طبق قانون رسمی FIVB حق حمله/بلاک
    // بالای تور ندارد، پس فرود پرش حمله‌ای برایش صدق نمی‌کند.
    basketball_playmaker: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    basketball_shooter: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    basketball_center: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    volleyball_setter: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    volleyball_outside: { penalty: -30, reason: "فرود پرش = ریسک بالای ACL" },
    // مستند به Di Salvo et al. 2007 (رجوع کنید به flat_foot پایین‌تر):
    // center_back کمترین حجم دویدن/فرود پرشی زمین را دارد، اما همچنان در
    // دوئل‌های هوایی/کرنر فرود می‌کند — طبق تصمیم تاییدشده‌ی Commit 18
    // پوشش داده شد (برخلاف flat_foot که مستثنا شد).
    soccer_center_back: { penalty: -25, reason: "فرود از دوئل‌های هوایی/کرنر" },
  },

  genu_varum: {
    volleyball: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    volleyball_middle_blocker: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    basketball: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    soccer: { penalty: 0, beneficial: "mild_only", reason: "مرکز ثقل پایین‌تر — مثال: مسی، گاریشا" },
    soccer_striker: { penalty: 0, beneficial: "mild_only", reason: "مرکز ثقل پایین‌تر — مثال: مسی، گاریشا" },
    futsal: { penalty: 0, beneficial: "mild_only", reason: "کنترل توپ بهتر" },
    wrestling_freestyle: { penalty: 0, beneficial: "mild_only", reason: "ثبات پایین‌تنه" },
    // دوکلیدی جدید Commit 18 (کپی مستقیم از basketball/volleyball عمومی):
    // همان ۵ پست genu_valgum بالا، به‌جز soccer_center_back (سند/رشته عددی
    // برای genu_varum فوتبال جز beneficial soccer عمومی نداده).
    basketball_playmaker: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    basketball_shooter: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    basketball_center: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    volleyball_setter: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
    volleyball_outside: { penalty: -25, reason: "شبیه valgum ولی خفیف‌تر" },
  },

  flat_foot: {
    marathon: { penalty: -20, reason: "ریسک تندینوپاتی پاشنه" },
    sprint_100m: { penalty: -20, reason: "انتقال نیرو ضعیف‌تر" },
    soccer: { penalty: -20, reason: "دویدن مداوم" },
    soccer_striker: { penalty: -20, reason: "دویدن مداوم" },
    tennis: { penalty: -20, reason: "حرکات عرضی" },
    swimming: { penalty: 0, beneficial: "mild_only", reason: "خفیف: باله طبیعی" },
    swimming_general: { penalty: 0, beneficial: "mild_only", reason: "خفیف: باله طبیعی" },
    rowing: { penalty: 0, reason: "بی‌اثر" },
    // ⚠️ دوکلیدی جدید Commit 18 — مستند به مطالعه (نه استنتاج): طبق
    // Di Salvo V, Baron R, Tschan H, Bachl N, Pigozzi F. "Performance
    // Characteristics According to Playing Position in Elite Soccer."
    // Int J Sports Med. 2007;28(3):222-227 — مدافعان کناری (full_back) در
    // مسافت دویدن پرشدت تفاوت معناداری با هافبک‌های کناری/مهاجمان ندارند؛
    // هافبک‌های مرکزی (defensive_mid) بیشترین مسافت دویدن با شدت متوسط
    // (پیوسته) را در کل بازیکنان زمین دارند؛ وینگر دویدن پرشدت مکرر دارد.
    // center_back و goalkeeper عمداً حذف شدند — رجوع کنید به کامنت‌های
    // خودشان در sportRequirementMatrix.js.
    soccer_full_back: { penalty: -20, reason: "دویدن مداوم — بالاترین حجم دویدن پرشدت بین پست‌های زمین (Di Salvo et al. 2007)" },
    soccer_defensive_mid: { penalty: -20, reason: "دویدن مداوم — بالاترین مسافت دویدن با شدت متوسط بین همه‌ی پست‌ها (Di Salvo et al. 2007)" },
    soccer_winger: { penalty: -20, reason: "دویدن مداوم — دویدن پرشدت مکرر" },
  },

  forward_head: {
    boxing: { penalty: -15, reason: "کاهش دید حریف و ریسک ضربه به گردن" },
    swimming_butterfly: { penalty: -15, reason: "مکانیک تنفس مختل" },
    tennis: { penalty: -10, reason: "سرویس زدن با اکستنشن گردن" },
  },

  rounded_shoulder: {
    swimming: { penalty: -20, reason: "اسکاپولا نمی‌تواند به عقب برود" },
    swimming_general: { penalty: -20, reason: "اسکاپولا نمی‌تواند به عقب برود" },
    volleyball: { penalty: -20, reason: "اسپک نیازمند retraction شانه" },
    volleyball_middle_blocker: { penalty: -20, reason: "اسپک نیازمند retraction شانه" },
    tennis: { penalty: -15, reason: "سرویس" },
    boxing: { penalty: 0, beneficial: "mild_only", reason: "گارد طبیعی" },
    cycling: { penalty: 0, beneficial: "mild_only", reason: "آیرودینامیک" },
    // دوکلیدی جدید Commit 18: outside کپی مستقیم از volleyball_middle_blocker
    // (همان سازوکار اسپک). setter مورد ضعیف‌تر گروه (رجوع کنید به کامنت
    // volleyball_setter در sportRequirementMatrix.js). libero عمداً حذف شد
    // (بدون حمله بالای تور، طبق قانون FIVB).
    volleyball_outside: { penalty: -20, reason: "اسپک نیازمند retraction شانه" },
    volleyball_setter: { penalty: -20, reason: "ست‌زنی بالای سر نیازمند retraction شانه (خفیف‌تر از اسپک)" },
  },
};

export { posturalSportImpactMap };
