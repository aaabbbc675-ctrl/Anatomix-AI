// نقشه‌ی پاتولوژی‌های فعال پزشکی و رشته‌های تحت تأثیر، طبق بخش ۱۱.۲ سند
// معماری.
//
// طبق تصمیم تاییدشده‌ی Commit 10: دوکلیدی (sport-id عمومی سند + خاص ۵ رشته‌ی
// matrix) — همون الگوی Commit 5/6/7.
//
// ⚠️ `is_universal_veto` سند اینجا عمداً `is_universal_hold` نام‌گذاری شده:
// چون این فایل از صفر ساخته می‌شود (نه ویرایش چیز موجود)، هیچ‌وقت اسم
// «veto» نوشته نشد — طبق بخش ۱۱.۴/۱۱.۵ سند حتی cardiovascular_disease هم
// با clearance قابل بازگشت است، پس واقعاً یک «hold سراسری» است، نه یک veto
// واقعی؛ اسم سند با اصل معماری «هیچ veto واقعی نداریم» تناقض داشت.
//
// chronic_kidney_disease.affects_sports عمداً کلیدهای wildcard سند
// (contact_sports_all, martial_arts_all) را ندارد — این‌ها sport-id واقعی
// نیستند و با category enum واقعی ما (strength/team_ball/combat/...) یک‌به‌یک
// منطبق نمی‌شوند؛ طبق اصل «چیزی که مطمئن نیستی را حدس نزن»، resolve نشدند.
// فقط ورودی مستقیم wrestling→wrestling_freestyle پوشش دارد.
const activePathologyMap = {
  active_disc_herniation: {
    required_specialist: "orthopedic_spine",
    affects_sports: {
      wrestling_freestyle: "high_risk",
      wrestling_greco: "high_risk",
      weightlifting_olympic: "high_risk",
      powerlifting: "high_risk",
      gymnastics: "high_risk",
      soccer: "moderate_risk",
      soccer_striker: "moderate_risk",
      volleyball: "moderate_risk",
      volleyball_middle_blocker: "moderate_risk",
      swimming: "safe",
      swimming_general: "safe",
      cycling: "safe",
      shooting: "safe",
      chess: "safe",
      // ⚠️ افزوده‌شده در Commit 18 (کپی مستقیم از volleyball عمومی موجود).
      // basketball عمداً بدون تغییر ماند — این نقشه از قبل هیچ کلید
      // "basketball" ندارد (گپ موجود از Commit 10). libero عمداً حذف شد
      // (بدون حمله بالای تور، طبق قانون رسمی FIVB).
      volleyball_setter: "moderate_risk",
      volleyball_outside: "moderate_risk",
      // ⚠️ افزوده‌شده در Commit 19 (جدید، نه کپی): «rower's back» — فتق
      // دیسک از فلکشن تکراری تحت بار، مفهوم مستند و شناخته‌شده در طب
      // ورزشی قایقرانی.
      rowing: "high_risk",
    },
    reason: "فتق دیسک فعال + بار محوری روی ستون فقرات = ریسک بالای تشدید",
  },

  active_shoulder_impingement: {
    required_specialist: "orthopedic_shoulder",
    affects_sports: {
      swimming: "high_risk",
      swimming_general: "high_risk",
      volleyball: "high_risk",
      volleyball_middle_blocker: "high_risk",
      handball: "high_risk",
      tennis: "high_risk",
      basketball: "high_risk",
      weightlifting_olympic: "high_risk",
      baseball_pitcher: "high_risk",
      soccer: "safe",
      soccer_striker: "safe",
      cycling: "safe",
      // ⚠️ افزوده‌شده در Commit 18: basketball_playmaker/shooter/center کپی
      // مستقیم basketball عمومی (بدون تمایز پستی، سند خودش هم تمایز نداده).
      // volleyball_setter/outside کپی مستقیم volleyball عمومی. libero عمداً
      // حذف شد (بدون حمله بالای تور، طبق قانون رسمی FIVB — رجوع کنید به
      // sportRequirementMatrix.js).
      basketball_playmaker: "high_risk",
      basketball_shooter: "high_risk",
      basketball_center: "high_risk",
      volleyball_setter: "high_risk",
      volleyball_outside: "high_risk",
      // ⚠️ انحراف از soccer عمومی («safe») — تصمیم تاییدشده‌ی Commit 18:
      // این یک استنتاج بیومکانیکی معقول (شیرجه/گرفتن بالای سر = ریسک
      // shoulder overuse شناخته‌شده در ادبیات دروازه‌بانی) است، **نه**
      // برگرفته از یک مطالعه‌ی اپیدمیولوژیک خاص با عدد مشخص — هم‌سطح صداقت
      // افشای body_fat زنانه (Commit 5) و wushu_sanda (Commit 17)؛
      // moderate_risk (نه high_risk مثل شنا/هندبال) چون حرکت شیرجه متناوب
      // است، نه تکراری/Overhead مداوم مثل شنا.
      soccer_goalkeeper: "moderate_risk",
      // ⚠️ افزوده‌شده در Commit 19 (جدید، نه کپی): هر ۶ رشته حرکت
      // Overhead/فشار تکراری شانه دارند (پرس/پرتاب/کشش/ورود به آب).
      bodybuilding: "high_risk",
      shot_put: "high_risk",
      discus: "high_risk",
      climbing: "high_risk",
      diving: "high_risk",
      archery: "high_risk",
    },
    reason: "گیرگیری/پارگی روتاتور کاف + حرکات Overhead = تشدید و پارگی کامل",
  },

  active_meniscus_tear: {
    required_specialist: "orthopedic_knee",
    affects_sports: {
      soccer: "high_risk",
      soccer_striker: "high_risk",
      basketball: "high_risk",
      volleyball: "high_risk",
      volleyball_middle_blocker: "high_risk",
      wrestling: "high_risk",
      wrestling_freestyle: "high_risk",
      taekwondo: "high_risk",
      skiing: "high_risk",
      swimming: "safe",
      swimming_general: "safe",
      rowing: "safe",
      chess: "safe",
      // ⚠️ افزوده‌شده در Commit 18 (کپی مستقیم از soccer/basketball/volleyball
      // عمومی موجود، نه عدد تازه). soccer_goalkeeper عمداً حذف شد (مکانیزم
      // Pivot Turn روی زانو برای این پست کمتر مستند است تا outfield).
      soccer_center_back: "high_risk",
      soccer_full_back: "high_risk",
      soccer_defensive_mid: "high_risk",
      soccer_winger: "high_risk",
      basketball_playmaker: "high_risk",
      basketball_shooter: "high_risk",
      basketball_center: "high_risk",
      volleyball_setter: "high_risk",
      volleyball_outside: "high_risk",
      volleyball_libero: "high_risk",
      // ⚠️ افزوده‌شده در Commit 19 (جدید): لانژ انفجاری/چرخش زانو حین حمله.
      fencing: "high_risk",
    },
    reason: "پارگی مینیسک + Pivot Turn = گیر افتادن مفصل و ریسک قفل شدن زانو",
  },

  active_acl_partial_tear: {
    required_specialist: "orthopedic_knee",
    affects_sports: {
      soccer: "critical_risk",
      soccer_striker: "critical_risk",
      basketball: "critical_risk",
      handball: "critical_risk",
      taekwondo: "critical_risk",
      skiing: "critical_risk",
      swimming: "safe",
      swimming_general: "safe",
      // ⚠️ افزوده‌شده در Commit 18 (کپی مستقیم از soccer/basketball عمومی
      // موجود). volleyball عمداً بدون تغییر ماند — این نقشه از قبل هیچ
      // کلید "volleyball" ندارد (گپ موجود از Commit 10، طبق اصل «چیزی که
      // مطمئن نیستی حدس نزن» چیزی برایش اضافه نشد)؛ soccer_goalkeeper هم
      // عمداً حذف شد، هم‌الگوی active_meniscus_tear بالا.
      soccer_center_back: "critical_risk",
      soccer_full_back: "critical_risk",
      soccer_defensive_mid: "critical_risk",
      soccer_winger: "critical_risk",
      basketball_playmaker: "critical_risk",
      basketball_shooter: "critical_risk",
      basketball_center: "critical_risk",
    },
    reason: "پارگی جزئی ACL + چرخش/توقف ناگهانی = ریسک پارگی کامل",
  },

  active_severe_scoliosis_cobb_over_40: {
    required_specialist: "orthopedic_spine",
    affects_sports: {
      weightlifting_olympic: "high_risk",
      powerlifting: "high_risk",
      wrestling: "high_risk",
      wrestling_freestyle: "high_risk",
      swimming: "therapeutic",
      swimming_general: "therapeutic",
    },
    reason: "اسکولیوز شدید (Cobb>۴۰) + بار نامتقارن روی ستون فقرات",
  },

  cardiovascular_disease: {
    required_specialist: "cardiologist",
    is_universal_hold: true,
    affects_categories: ["endurance_intense", "contact_sports", "combat_sports"],
    always_safe: ["chess", "shooting_archery", "billiards"],
    reason: "ریسک قلبی + شدت بالا = خطر مرگ ناگهانی. غربالگری ECG اجباری.",
  },

  chronic_kidney_disease: {
    required_specialist: "nephrologist",
    is_universal_hold: false,
    affects_sports: {
      wrestling: "critical_risk",
      wrestling_freestyle: "critical_risk",
      boxing: "critical_risk",
    },
    reason: "ضربه به ناحیه‌ی کلیه = ریسک آسیب حاد",
  },

  epilepsy_uncontrolled: {
    required_specialist: "neurologist",
    affects_sports: {
      swimming: "critical_risk",
      swimming_general: "critical_risk",
      diving: "critical_risk",
      cycling: "high_risk",
      climbing: "critical_risk",
      motorsports: "critical_risk",
    },
    reason: "حمله در محیط پرخطر = خطر جانی",
  },

  active_ankle_sprain_grade_2_or_3: {
    required_specialist: "orthopedic_foot",
    duration: "temporary_6_to_12_weeks",
    affects_sports: {
      soccer: "high_risk",
      soccer_striker: "high_risk",
      basketball: "high_risk",
      volleyball: "high_risk",
      volleyball_middle_blocker: "high_risk",
      sprint_running: "high_risk",
      swimming: "safe",
      swimming_general: "safe",
      // ⚠️ افزوده‌شده در Commit 18 (کپی مستقیم از soccer/basketball/volleyball
      // عمومی موجود). soccer_goalkeeper عمداً حذف شد (الگوی حرکتی متفاوت —
      // رجوع کنید به کامنت‌های goalkeeper در sportRequirementMatrix.js).
      // volleyball_libero عمداً *نگه داشته شد* (برخلاف پنالتی‌های حمله‌محور
      // بالاتر) چون اسکرمبل/شیرجه‌ی دفاعی، نه حمله، ریسک مچ‌پا را ایجاد
      // می‌کند.
      soccer_center_back: "high_risk",
      soccer_full_back: "high_risk",
      soccer_defensive_mid: "high_risk",
      soccer_winger: "high_risk",
      basketball_playmaker: "high_risk",
      basketball_shooter: "high_risk",
      basketball_center: "high_risk",
      volleyball_setter: "high_risk",
      volleyball_outside: "high_risk",
      volleyball_libero: "high_risk",
      // ⚠️ افزوده‌شده در Commit 19 (جدید): تیک‌آف/فرود Split-leg و لانژ
      // انفجاری، هر دو ریسک واقعی مچ‌پا.
      long_jump: "high_risk",
      fencing: "high_risk",
    },
  },
};

export { activePathologyMap };
