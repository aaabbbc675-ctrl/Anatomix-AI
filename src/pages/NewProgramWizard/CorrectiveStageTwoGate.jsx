import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../store/db";
import { EXERCISES } from "../../../engine/bodybuilding/data/exercises.seed.js";
import { buildCexProgram } from "../../../engine/corrective/file10_cexArchitecture.js";
import {
  buildWarmupBlock,
  buildRehabilitationBlock,
  buildStrengthAndCorrectionBlock,
  buildCooldownBlock,
} from "../../../engine/corrective/file11_injuredArchitecture.js";
import { applyContraindicationFilterWithFallback } from "../../../engine/corrective/file3_triageFallback.js";
import { filterExercisesByAvailableEquipment } from "../../../engine/corrective/file8_capacityEngine.js";
import { resolveExerciseSide, applyUnknownSideGuardrail } from "../../../engine/corrective/file7_asymmetry.js";
import {
  unionContraindicationSources,
  filterExercisesByBannedTags,
  runFilterChain,
} from "../../../engine/corrective/file12_conflictResolution.js";

const EFFECTIVE_SIDE_LABELS = { Right: "راست", Left: "چپ", Bilateral: "دوطرفه" };

// طبق تصمیم تاییدشده: MIN/MAX واقعاً فقط از منابع مستندی می‌آیند که عدد
// واقعی می‌دهند — نه هرچیزی که «شبیه» یک منبع باشد.
//   - systemicMaxSets: diseaseManagement.sets_range — امروز هیچ بیماری
//     اصلاحی این فیلد را ست نمی‌کند (همیشه null)، ولی این فیلد واقعی
//     RestrictionPatch است، نه اختراعی.
//   - systemicMinRest: diseaseManagement.rest_sec_min — واقعاً توسط
//     heartOrHypertension/cerebralPalsy ست می‌شود (فایل۴).
//   - ageMaxSets/ageMinRest: از resolveAgeAdjustment واقعی (فایل۵) — فقط
//     کودک/سالمند عدد می‌دهند.
//   - injuryMaxSets/injuryMinRest: هیچ منبع واقعی برای ساخت اولیه (ماه ۱)
//     وجود ندارد (resolveInjuredAreaProgressionCap به
//     previousMonthRpeInInjuredArea نیاز دارد که مخصوص ماه ۲+ است) — null.
function deriveMinMaxParams({ assessment, diseaseManagement, ageAdjustment }) {
  const systemicMaxSets = diseaseManagement.sets_range ? diseaseManagement.sets_range[1] : null;
  const systemicMinRest = diseaseManagement.rest_sec_min ?? null;

  let ageMaxSets = null;
  let ageMinRest = null;
  if (ageAdjustment.ageGroup === "child") {
    ageMaxSets = ageAdjustment.setsCap;
    ageMinRest = ageAdjustment.restSecRange[0];
  } else if (ageAdjustment.ageGroup === "elderly") {
    ageMaxSets = ageAdjustment.setsRange[1];
    ageMinRest = ageAdjustment.restSecRange[0];
  }

  return {
    defaultSets: assessment.setsPerExercise,
    defaultRest: assessment.restSecPerSet,
    systemicMaxSets,
    injuryMaxSets: null,
    ageMaxSets,
    systemicMinRest,
    injuryMinRest: null,
    ageMinRest,
  };
}

export default function CorrectiveStageTwoGate({ studentId, assessment, cascadeResult, onSave, onBack }) {
  // طبق تصمیم صریح: این عدد یک سیگنال لحظه‌ای/حین‌بازدید است (نه بخشی از
  // ارزیابی اولیه‌ی ماه ۱) — پیش‌فرض ۰ (بدون درد)، مربی همین‌جا واقعاً
  // تغییرش می‌دهد و buildCooldownBlock زنده با آن دوباره محاسبه می‌شود.
  const [currentJointPainLevel, setCurrentJointPainLevel] = useState(0);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { architectureType, diseaseManagement, ageAdjustment } = cascadeResult;

  const minMaxParams = useMemo(
    () => deriveMinMaxParams({ assessment, diseaseManagement, ageAdjustment }),
    [assessment, diseaseManagement, ageAdjustment]
  );

  // گاردریل Unknown/S-شکل روی استخر پایه، قبل از هر انتخاب فاز/بلوکی —
  // هم‌الگوی تصمیم صریح فایل۷ (نه یک فیلتر جدید و جدا).
  const guardrail = useMemo(
    () =>
      applyUnknownSideGuardrail({
        hasSShapeDeformity: assessment.hasSShapeDeformity,
        affectedSide: assessment.affectedSide,
        exercises: EXERCISES,
        coreStabilizationExerciseIds: assessment.coreStabilizationExerciseIds,
      }),
    [assessment]
  );
  const basePool = guardrail.exercises;

  const cexResult = useMemo(() => {
    if (architectureType !== "cex_4_phase") return null;
    return buildCexProgram({
      candidateExercises: basePool,
      userContraindications: assessment.userContraindications,
      hasActiveInjury: false,
    });
  }, [architectureType, basePool, assessment.userContraindications]);

  const injuredResult = useMemo(() => {
    if (architectureType !== "injured_4_block") return null;
    const warmup = buildWarmupBlock({ cardioExercises: [], mobilityExercises: [] });
    const rehabilitation = buildRehabilitationBlock({ candidateExercises: basePool, minMaxParams });
    // حرکاتی که بلوک توانبخشی گرفته دوباره در بلوک قدرت/اصلاح نمی‌آیند —
    // هر حرکت فقط یک‌بار در جلسه.
    const rehabIds = new Set(rehabilitation.exercises.map((e) => e.id));
    const strengthCandidates = basePool.filter((ex) => !rehabIds.has(ex.id));
    const strengthAndCorrection = buildStrengthAndCorrectionBlock({
      candidateExercises: strengthCandidates,
      userContraindications: assessment.userContraindications,
      safeZoneExerciseIds: [],
    });
    const cooldown = buildCooldownBlock({ staticStretchExercises: [], currentJointPainLevel });
    return { warmup, rehabilitation, strengthAndCorrection, cooldown };
  }, [architectureType, basePool, minMaxParams, assessment.userContraindications, currentJointPainLevel]);

  const blocksForDisplay = useMemo(() => {
    if (cexResult) {
      return [
        { key: "inhibition", label: "بازدارندگی (CEx_Inhibit)", exercises: cexResult.phases.inhibition.exercises },
        { key: "lengthening", label: "طویل‌سازی (CEx_Lengthen)", exercises: cexResult.phases.lengthening.exercises },
        { key: "activation", label: "فعال‌سازی (CEx_Activate)", exercises: cexResult.phases.activation.exercises },
        { key: "integration", label: "یکپارچه‌سازی (CEx_Integrate)", exercises: cexResult.phases.integration.exercises },
      ];
    }
    if (injuredResult) {
      return [
        { key: "warmup", label: "گرم‌کردن", exercises: injuredResult.warmup.exercises },
        { key: "rehabilitation", label: "توانبخشی / اولویت اول", exercises: injuredResult.rehabilitation.exercises },
        { key: "strengthAndCorrection", label: "قدرت و اصلاح / اولویت دوم", exercises: injuredResult.strengthAndCorrection.exercises },
        { key: "cooldown", label: "سردکردن", exercises: injuredResult.cooldown.exercises },
      ];
    }
    return [];
  }, [cexResult, injuredResult]);

  // زنجیره‌ی فایل۱۲ روی حرکات نهایی (union + فیلتر تگ ممنوع + فیلتر
  // تجهیزات) — دقیقاً طبق تصمیم تاییدشده.
  const finalExercises = useMemo(() => {
    const rawList = blocksForDisplay.flatMap((b) => b.exercises.map((ex) => ({ ...ex, _sourceBlock: b.key })));

    const unionedContraindications = unionContraindicationSources([assessment.userContraindications]);
    const filters = [
      (exs) => applyContraindicationFilterWithFallback(exs, unionedContraindications, {}).exercises,
      (exs) => filterExercisesByBannedTags(exs, diseaseManagement.banned_tags),
      (exs) => filterExercisesByAvailableEquipment(exs, assessment.availableEquipment),
    ];
    const filtered = runFilterChain(rawList, filters);

    // دیکوریشن سمت اجرا برای حرکات یک‌طرفه — فقط وقتی گاردریل فعال نیست
    // (وگرنه اصلاً حرکت یک‌طرفه‌ای باقی نمانده) و application_rule واقعی
    // روی حرکت ست شده باشد (امروز هیچ‌کدام از ۱۸ حرکت این فیلد را ندارند —
    // پس این فقط برای وقتی بانک تکمیل شود کار می‌کند، نه یک حدس).
    if (guardrail.guardrailActive || assessment.affectedSide === "Unknown") {
      return filtered;
    }
    return filtered.map((exercise) => {
      if (exercise.laterality !== "unilateral" || !exercise.application_rule) return exercise;
      const effectiveSide = resolveExerciseSide({ exercise, affectedSide: assessment.affectedSide });
      return { ...exercise, effectiveSide };
    });
  }, [blocksForDisplay, assessment, diseaseManagement, guardrail]);

  useEffect(() => {
    setSelected(Object.fromEntries(finalExercises.map((ex) => [ex.id, true])));
  }, [finalExercises]);

  function toggleExercise(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const finalSelected = finalExercises.filter((ex) => selected[ex.id]);

      const architecture_json = {
        assessment,
        cascadeResult,
        guardrail: { guardrailActive: guardrail.guardrailActive, warnings: guardrail.warnings },
        minMaxParams,
        currentJointPainLevel: architectureType === "injured_4_block" ? currentJointPainLevel : null,
      };

      const program = await db.programs.create({
        student_id: studentId,
        program_type: "corrective",
        status: "active",
        architecture_json,
        final_program_json: { exercises: finalSelected },
        total_weeks: null,
      });

      onSave(program);
    } catch (err) {
      setSaveError(err.message || "خطا در ذخیره‌ی برنامه.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const totalRawCount = blocksForDisplay.reduce((sum, b) => sum + b.exercises.length, 0);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <h2>انتخاب حرکت واقعی — حرکات اصلاحی</h2>

      <p style={{ color: "#666", fontSize: "0.85rem" }}>
        بانک حرکات اصلاحی هنوز کامل نیست — فیلدهای phase/tags/rehab_target روی بانک مشترک فعلی (۱۸ حرکت بدنسازی) عملاً
        خالی/None هستند، پس فاز/بلوک‌های زیر ممکن است خیلی محدود یا خالی باشند. این محدودیت داده است، نه یک باگ.
      </p>

      {guardrail.guardrailActive && (
        <div style={{ marginTop: "0.75rem", padding: "0.75rem", border: "1px solid #e0a800", background: "#fff8e1", borderRadius: 8 }}>
          <strong>گاردریل Unknown/S-شکل فعال است</strong>
          {guardrail.warnings.map((w, i) => (
            <p key={i} style={{ margin: "0.4rem 0" }}>
              {w}
            </p>
          ))}
        </div>
      )}

      {architectureType === "injured_4_block" && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
          <label>
            سطح فعلی درد مفصلی شاگرد (۰ تا ۱۰)
            <input
              type="number"
              min={0}
              max={10}
              value={currentJointPainLevel}
              onChange={(e) => setCurrentJointPainLevel(Number(e.target.value))}
              style={{ marginRight: "0.5rem", width: "4rem" }}
            />
          </label>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "#666" }}>
            فقط برای همین بازدید است — بخشی از ارزیابی اولیه ذخیره‌شده نیست. اگر بیش از ۳ باشد، سردکردن باید متوقف شود.
          </p>
          {injuredResult.cooldown.shouldStop && (
            <p style={{ margin: "0.4rem 0 0", color: "#c0392b", fontWeight: "bold" }}>{injuredResult.cooldown.warning}</p>
          )}
        </div>
      )}

      {blocksForDisplay.map((block) => (
        <div key={block.key} style={{ marginTop: "1rem" }}>
          <h4>
            {block.label} — {block.exercises.length} حرکت واقعی یافت شد
          </h4>
          {block.exercises.length === 0 && <p style={{ color: "#888", fontSize: "0.85rem" }}>هیچ حرکتی یافت نشد.</p>}
          <ul>
            {block.exercises.map((ex) => (
              <li key={ex.id}>{ex.name}</li>
            ))}
          </ul>
        </div>
      ))}

      <div style={{ marginTop: "1.5rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
        <h3>
          فهرست نهایی (بعد از فیلتر تداخل + تگ ممنوع + تجهیزات) — {finalExercises.length} از {totalRawCount} حرکت خام
        </h3>
        {finalExercises.length === 0 && <p>هیچ حرکتی از فیلترهای نهایی عبور نکرد.</p>}
        {finalExercises.map((ex) => (
          <div key={ex.id} style={{ padding: "0.4rem 0", borderBottom: "1px solid #eee" }}>
            <label>
              <input type="checkbox" checked={!!selected[ex.id]} onChange={() => toggleExercise(ex.id)} /> {ex.name}{" "}
              <span style={{ color: "#888", fontSize: "0.8rem" }}>
                ({ex.equipment}
                {ex.effectiveSide ? ` — سمت اجرا: ${EFFECTIVE_SIDE_LABELS[ex.effectiveSide]}` : ""})
              </span>
            </label>
          </div>
        ))}
      </div>

      {saveError && <p style={{ color: "#c0392b" }}>{saveError}</p>}

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onBack} disabled={saving}>
          ← بازگشت
        </button>{" "}
        <button type="button" onClick={handleSave} disabled={saving || selectedCount === 0}>
          {saving ? "در حال ذخیره..." : "تایید نهایی و ذخیره‌ی برنامه"}
        </button>
      </div>
    </div>
  );
}
