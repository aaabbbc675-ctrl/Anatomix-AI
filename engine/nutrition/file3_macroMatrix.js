// فایل ۳ موتور تغذیه (بخش ۲.۲ سند: ماتریس تخصیص ماکرو بر اساس رشته).
// ورودی این فایل: weight_kg (فایل ۱) + target_calories (فایل ۲). خروجی
// جایگزین default_macros عمومی فایل ۲ برای نمایش نهایی می‌شود؛ کف‌های
// بخش ۱.۲ همچنان شبکه‌ی ایمنی زیرین‌اند (بازاستفاده از computeGenericFatFloorG،
// نه بازسازی — طبق اصل ۴ سند).

import { computeGenericFatFloorG, PROTEIN_FLOOR_G_PER_KG } from "./file2_energyTargets.js";

// طبق بخش ۲.۲ سند، نقطه‌ی MEV (Minimum Effective Dose = پایین‌ترین نقطه‌ی
// بازه‌ی هر رشته) طبق تصمیم صریح تاییدشده به‌عنوان پیش‌فرض سیستم — نه وسط
// بازه، نه بالاترین نقطه. بازه‌ی کامل هر رشته (`_range`) فقط برای مستندسازی/
// override بالادستی مربی نگه داشته شده، خودِ موتور از آن استفاده نمی‌کند.
//
// fat_mode:
//   "g_per_kg"                    → fat_mev_g_per_kg × weight با کف عمومی مقایسه می‌شود.
//   "percent_calories_floor_only" → سند برای این ردیف عدد g/kg نداده («حداقل
//                                    ۲۰٪ کالری»)، پس چربی همیشه دقیقاً همان
//                                    کف عمومی است، بدون مقایسه/هشدار.
const SPORT_ROWS = {
  FITNESS_BODYBUILDING: {
    protein_mev_g_per_kg: 1.6,
    protein_range_g_per_kg: [1.6, 2.2],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 0.5,
    fat_range_g_per_kg: [0.5, 1],
    carb_sane_range_g_per_kg: [3, 5],
  },
  BODYBUILDING_CUT: {
    protein_mev_g_per_kg: 2.3,
    protein_range_g_per_kg: [2.3, 3.1],
    fat_mode: "percent_calories_floor_only",
    carb_sane_range_g_per_kg: [2, 5],
  },
  POWERLIFTING_WEIGHTLIFTING: {
    protein_mev_g_per_kg: 1.5,
    protein_range_g_per_kg: [1.5, 2.0],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 1.0,
    fat_range_g_per_kg: [1, 1.2],
    carb_sane_range_g_per_kg: [4, 6],
  },
  TEAM_SPORTS: {
    protein_mev_g_per_kg: 1.4,
    protein_range_g_per_kg: [1.4, 1.7],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 1.0, // سند «~۱» آورده — تقریباً ثابت، نه بازه‌ی واقعی.
    fat_range_g_per_kg: [1, 1],
    carb_sane_range_g_per_kg: [5, 8],
  },
  COMBAT_SPORTS: {
    protein_mev_g_per_kg: 1.8,
    protein_range_g_per_kg: [1.8, 2.2],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 0.8,
    fat_range_g_per_kg: [0.8, 1.2],
    carb_sane_range_g_per_kg: [4, 6],
  },
  ENDURANCE: {
    protein_mev_g_per_kg: 1.2,
    protein_range_g_per_kg: [1.2, 1.4],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 1.0,
    fat_range_g_per_kg: [1, 1.5],
    // طبق بخش ۲.۲: سقف تا ۱۲ در روز مسابقه/حجم بالا — آن پسوند شرطی کار
    // batch ۴/۵ (دوره‌بندی/کربوسایکل) است، اینجا فقط بازه‌ی پایه.
    carb_sane_range_g_per_kg: [7, 10],
  },
  SPRINT: {
    protein_mev_g_per_kg: 1.5,
    protein_range_g_per_kg: [1.5, 1.8],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 1.0, // «~۱»
    fat_range_g_per_kg: [1, 1],
    carb_sane_range_g_per_kg: [5, 7],
  },
  SKILL_SPORTS: {
    protein_mev_g_per_kg: 1.3,
    protein_range_g_per_kg: [1.3, 1.6],
    fat_mode: "g_per_kg",
    fat_mev_g_per_kg: 1.0, // «~۱»
    fat_range_g_per_kg: [1, 1],
    carb_sane_range_g_per_kg: [5, 7],
  },
};

const SPORT_TYPE_TO_ROW_KEY = {
  fitness_bodybuilding: "FITNESS_BODYBUILDING",
  powerlifting_weightlifting: "POWERLIFTING_WEIGHTLIFTING",
  team_sports: "TEAM_SPORTS",
  combat_sports: "COMBAT_SPORTS",
  endurance: "ENDURANCE",
  sprint: "SPRINT",
  skill_sports: "SKILL_SPORTS",
};

// طبق تصمیم تفسیری batch ۱ (اجرایی‌شده اینجا): «بادی‌بیلدینگ در کات» ردیف
// جدای enum نیست، بلکه ترکیب fitness_bodybuilding + main_goal=fat_loss است.
function selectSportRowKey({ sport_type, main_goal }) {
  if (sport_type === "fitness_bodybuilding" && main_goal === "fat_loss") {
    return "BODYBUILDING_CUT";
  }
  const rowKey = SPORT_TYPE_TO_ROW_KEY[sport_type];
  if (!rowKey) {
    throw new Error(`sport_type نامعتبر برای ماتریس ماکرو رشته‌ای: "${sport_type}"`);
  }
  return rowKey;
}

function computeSportMacros({ sport_type, main_goal, weight_kg, target_calories }) {
  const rowKey = selectSportRowKey({ sport_type, main_goal });
  const row = SPORT_ROWS[rowKey];
  const warnings = [];

  const proteinG = row.protein_mev_g_per_kg * weight_kg;

  const genericFloorFatG = computeGenericFatFloorG({ target_calories, weight_kg });
  let fatG;
  if (row.fat_mode === "percent_calories_floor_only") {
    // ردیف کات هیچ عدد g/kg ندارد — چربی همیشه دقیقاً کف عمومی است، بدون
    // مقایسه یا هشدار «raised_to_floor» (چون چیزی برای بالا بردنش نیست).
    fatG = genericFloorFatG;
  } else {
    const sportFatG = row.fat_mev_g_per_kg * weight_kg;
    if (genericFloorFatG > sportFatG) {
      fatG = genericFloorFatG;
      // طبق تایید صریح: کد جدید، severity=info — انحراف از پیش‌فرض علمی
      // رشته، نه ریسک ایمنی.
      warnings.push({ code: "fat_raised_to_generic_floor", severity: "info", coach_note: null });
    } else {
      fatG = sportFatG;
    }
  }

  const carbG = (target_calories - proteinG * 4 - fatG * 9) / 4;

  if (carbG < 0) {
    // همان کد فایل ۲ — بازاستفاده، نه بازسازی.
    warnings.push({ code: "target_calories_unrealistic", severity: "caution", coach_note: null });
  } else {
    const carbPerKg = carbG / weight_kg;
    const [carbSaneMin, carbSaneMax] = row.carb_sane_range_g_per_kg;
    if (carbPerKg < carbSaneMin || carbPerKg > carbSaneMax) {
      // طبق تایید صریح: کد جدید، severity=info.
      warnings.push({ code: "carb_outside_sport_range", severity: "info", coach_note: null });
    }
  }

  return {
    sport_row_used: rowKey,
    protein_g: proteinG,
    fat_g: fatG,
    carb_g: carbG,
    warnings,
  };
}

export { computeSportMacros, selectSportRowKey, SPORT_ROWS, PROTEIN_FLOOR_G_PER_KG };
