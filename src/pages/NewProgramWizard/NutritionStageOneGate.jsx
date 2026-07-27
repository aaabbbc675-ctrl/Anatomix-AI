import React, { useMemo, useState } from "react";
import { processStage1 } from "../../engine/nutritionCascade";

// طبق بخش ۳.۱ سند: «نمایش EA محاسبه‌شده با رنگ‌بندی (سبز ≥۴۵، زرد ۳۰-۴۵،
// قرمز <۳۰) — یا پیام صریح در نبود داده». آستانه‌ها خودشان از قبل در
// engine/nutrition/file2_energyTargets.js (EA_OPTIMAL_THRESHOLD_KCAL_PER_KG_FFM=45،
// EA_SUBOPTIMAL_THRESHOLD_KCAL_PER_KG_FFM=30) اعمال شده‌اند و در ea_status
// (optimal/suboptimal/low/not_calculable) منعکس می‌شوند — اینجا فقط رنگ به
// همان سه‌وضعیت از‌قبل‌محاسبه‌شده نگاشت می‌شود، آستانه‌ی جدیدی اختراع نمی‌شود.
const EA_STATUS_COLORS = {
  optimal: "#2e7d32",
  suboptimal: "#e0a800",
  low: "#c0392b",
  not_calculable: "#888",
};
const EA_STATUS_LABELS = {
  optimal: "مطلوب",
  suboptimal: "زیر حد مطلوب",
  low: "پایین (خطر RED-S)",
  not_calculable: "قابل محاسبه نیست",
};

const BMR_FORMULA_LABELS = { katch_mcardle: "Katch-McArdle (با درصد چربی)", mifflin_st_jeor: "Mifflin-St Jeor (بدون درصد چربی)" };

const OVERRIDABLE_MACROS = [
  { macro: "protein_g", field: "protein_grams", label: "پروتئین (گرم)" },
  { macro: "fat_g", field: "fat_grams", label: "چربی (گرم)" },
  { macro: "carb_g", field: "carb_grams", label: "کربوهیدرات (گرم)" },
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function NutritionStageOneGate({ assessment, onConfirm, onBack }) {
  // هر عضو {macro, value} است؛ ویرایش یک ماکرو، override قبلی همان ماکرو را
  // جایگزین می‌کند (نه اضافه) — چون از دید مربی «مقدار نهایی این ماکرو را
  // می‌خواهم X باشد»، نه «یک دلتای دیگر روی override قبلی اعمال کن».
  const [overrides, setOverrides] = useState([]);

  // بازمحاسبه‌ی زنده: processStage1 مستقیماً از nutritionCascade.js (که خودش
  // فقط دوباره‌صادرکننده‌ی file6_stage1Orchestrator.js است) فراخوانی می‌شود —
  // هیچ فرمول BMR/TDEE/ماکرویی اینجا در کامپوننت بازسازی نشده.
  const liveResult = useMemo(() => processStage1({ rawInput: assessment, overrides }), [assessment, overrides]);

  const { approved_macros, safety_check, coach_overrides } = liveResult;

  function setOverrideValue(macro, value) {
    setOverrides((prev) => [...prev.filter((o) => o.macro !== macro), { macro, value }]);
  }
  function resetOverrides() {
    setOverrides([]);
  }

  const floorWarningCodes = new Set(["protein_below_floor", "fat_below_floor", "carb_below_floor"]);
  const floorsRespected = !safety_check.warnings.some((w) => floorWarningCodes.has(w.code));

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>تایید متغیرهای پایه و ماکروها — ایستگاه اول (Pre-Generation)</h2>

      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          border: `1px solid ${EA_STATUS_COLORS[safety_check.ea_status]}`,
          background: "#fff",
          borderRadius: 8,
        }}
      >
        <strong style={{ color: EA_STATUS_COLORS[safety_check.ea_status] }}>
          EA (در دسترس‌بودن انرژی): {EA_STATUS_LABELS[safety_check.ea_status]}
        </strong>
        {safety_check.ea_status === "not_calculable" ? (
          <p style={{ margin: "0.4rem 0" }}>
            قابل محاسبه نیست — چون درصد چربی بدن و/یا کالری سوزانده‌شده‌ی تمرین وارد نشده.
          </p>
        ) : (
          <p style={{ margin: "0.4rem 0" }}>{round1(safety_check.energy_availability_kcal_per_kg_ffm)} kcal/kg FFM</p>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <tbody>
          <tr>
            <td>کالری هدف</td>
            <td>{round1(approved_macros.target_calories)}</td>
          </tr>
          <tr>
            <td>تعداد معده</td>
            <td>{approved_macros.meals_count}</td>
          </tr>
          <tr>
            <td>فرمول BMR استفاده‌شده</td>
            <td>{BMR_FORMULA_LABELS[safety_check.bmr_formula_used] || safety_check.bmr_formula_used}</td>
          </tr>
          <tr>
            <td>ردیف ماتریس ماکرو</td>
            <td>{safety_check.sport_row_used}</td>
          </tr>
          <tr>
            <td>سطح بودجه</td>
            <td>{coach_overrides.diet_budget_tier}</td>
          </tr>
          <tr>
            <td>کف‌های ماکرو رعایت شده؟</td>
            <td>{floorsRespected ? "بله" : "خیر (هشدار پایین را ببینید)"}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>ماکروهای روزانه (قابل ویرایش — تغییر هر کدام بقیه را زنده بازمحاسبه می‌کند)</strong>
        {OVERRIDABLE_MACROS.map(({ macro, field, label }) => (
          <label key={macro} style={{ display: "block", marginTop: "0.5rem" }}>
            {label}
            <input
              type="number"
              step="0.1"
              value={round1(approved_macros[field])}
              onChange={(e) => setOverrideValue(macro, Number(e.target.value))}
            />
          </label>
        ))}
        {overrides.length > 0 && (
          <button type="button" onClick={resetOverrides} style={{ marginTop: "0.5rem" }}>
            بازنشانی همه‌ی تغییرات دستی
          </button>
        )}
      </div>

      {safety_check.warnings.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <strong>هشدارها (داشبورد مربی)</strong>
          <ul>
            {safety_check.warnings.map((w, i) => (
              <li key={i} style={{ color: w.severity === "caution" ? "#c0392b" : "#8a6d00" }}>
                [{w.severity}] {w.code}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onBack}>
          ← بازگشت
        </button>{" "}
        <button type="button" onClick={() => onConfirm({ intake: assessment, stage1Result: liveResult })}>
          تایید و ادامه به چیدن وعده‌ها →
        </button>
      </div>
    </div>
  );
}
