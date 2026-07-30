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
    },
  },
};

export { activePathologyMap };
