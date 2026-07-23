import React, { useMemo, useState } from "react";
import { computeBodybuildingPrescription } from "../../engine/bodybuildingCascade";

const GOAL_LABELS = { hypertrophy: "هایپرتروفی", strength: "قدرت", fat_loss: "کاهش چربی", maintenance: "حفظ وضعیت" };

function formatRange(range) {
  if (!range) return "—";
  const [min, max] = range;
  if (min === null && max === null) return "—";
  if (min === null) return `تا ${max}`;
  if (max === null) return `${min}+`;
  return min === max ? `${min}` : `${min} تا ${max}`;
}

// Explainability پایه: شکستن عدد نهایی به مراحل محاسبه (بخش ۸.۳ سند).
function buildExplainability(cascadeResult) {
  const { goal, cascadeOutput, result } = cascadeResult;
  const lines = [
    `پایه‌ی سطح تجربه (${goal.experience}) → ${cascadeOutput.weekly_sets_progression_ceiling ? "بازه‌ی حجم استاندارد" : ""}`,
  ];
  if (cascadeOutput.gender_advisory) {
    lines.push(
      `ضریب جنسیتی اعمال‌شده: حجم ×${cascadeOutput.gender_advisory.appliedVolumeFactor} — استراحت ×${cascadeOutput.gender_advisory.appliedRestFactor}` +
        (cascadeOutput.gender_advisory.isOverridden ? " (override دستی مربی)" : " (پیشنهاد سیستم)")
    );
  }
  if (result.adjustment_source !== "none") {
    lines.push(`ضریب هفتگی اعمال‌شده: ${result.adjustment_source === "return_protocol" ? "پروتکل بازگشت ایمن" : "دی‌لود"}`);
  }
  lines.push("سقف/کف پزشکی-سنی (اگر لازم بود) در آخرین قدم روی همه‌ی اعداد اعمال شده است.");
  return lines;
}

export default function StageOneGate({ assessment, onConfirm, onBack }) {
  const cascadeResult = useMemo(() => computeBodybuildingPrescription(assessment), [assessment]);
  const [genderOverrides, setGenderOverrides] = useState(null);

  const effectiveAssessment = genderOverrides ? { ...assessment, genderOverrides } : assessment;
  const liveResult = useMemo(() => computeBodybuildingPrescription(effectiveAssessment), [effectiveAssessment]);

  const { result, cascadeOutput, hardVetoRestriction } = liveResult;

  if (result.blocked) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
        <h2>امکان ساخت برنامه در حال حاضر وجود ندارد</h2>
        <div style={{ padding: "1rem", background: "#fdecea", border: "1px solid #c0392b", borderRadius: 8 }}>
          {result.block_reasons.map((reason, i) => (
            <p key={i} style={{ margin: 0, color: "#c0392b" }}>
              {reason}
            </p>
          ))}
        </div>
        <button style={{ marginTop: "1rem" }} onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    );
  }

  const { prescription } = result;
  const explainLines = buildExplainability(liveResult);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>تایید معماری کلان — هدف: {GOAL_LABELS[liveResult.goal.main_goal]}</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <tbody>
          <tr>
            <td>ست هفتگی هر عضله</td>
            <td>{prescription.weekly_sets_per_muscle}</td>
          </tr>
          <tr>
            <td>بازه‌ی تکرار</td>
            <td>{formatRange(prescription.rep_range)}</td>
          </tr>
          <tr>
            <td>بازه‌ی شدت (٪۱RM)</td>
            <td>{formatRange(prescription.intensity_percent_1rm)}</td>
          </tr>
          <tr>
            <td>استراحت (ثانیه)</td>
            <td>{formatRange(prescription.rest_sec)}</td>
          </tr>
          <tr>
            <td>تمپو</td>
            <td>{prescription.tempo}</td>
          </tr>
          <tr>
            <td>RIR</td>
            <td>{formatRange(prescription.rir)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f5f5f5", borderRadius: 8, fontSize: "0.85rem" }}>
        <strong>این عدد از کجا آمد؟</strong>
        <ul>
          {explainLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      {cascadeOutput.gender_advisory && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
          <strong>ضرایب جنسیتی (پیشنهادی، قابل override)</strong>
          <div style={{ marginTop: "0.5rem" }}>
            <label>
              ضریب حجم:{" "}
              <input
                type="number"
                step="0.01"
                value={(genderOverrides?.volumeFactor ?? cascadeOutput.gender_advisory.appliedVolumeFactor).toString()}
                onChange={(e) => setGenderOverrides((prev) => ({ ...prev, volumeFactor: Number(e.target.value) }))}
              />
            </label>{" "}
            <label>
              ضریب استراحت:{" "}
              <input
                type="number"
                step="0.01"
                value={(genderOverrides?.restFactor ?? cascadeOutput.gender_advisory.appliedRestFactor).toString()}
                onChange={(e) => setGenderOverrides((prev) => ({ ...prev, restFactor: Number(e.target.value) }))}
              />
            </label>
          </div>
          {cascadeOutput.gender_advisory.isOverridden && (
            <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => setGenderOverrides(null)}>
              بازگردانی به پیشنهاد سیستم
            </button>
          )}
        </div>
      )}

      {result.warnings.length > 0 && (
        <ul style={{ marginTop: "1rem", color: "#8a6d00" }}>
          {result.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onBack}>
          ← بازگشت
        </button>{" "}
        <button type="button" onClick={() => onConfirm({ assessment: effectiveAssessment, cascadeResult: liveResult })}>
          تایید و ادامه به انتخاب حرکت →
        </button>
      </div>
    </div>
  );
}
