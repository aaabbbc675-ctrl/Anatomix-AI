import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../store/db";
import { EXERCISES } from "../../../engine/bodybuilding/data/exercises.seed.js";
import { filterExercisesByInjuryBlacklist } from "../../../engine/bodybuilding/file4_trainingSystem/injuryFilter.js";
import { applyGenderExerciseWeighting } from "../../../engine/bodybuilding/file4_trainingSystem/genderExerciseWeighting.js";
import { applyTrainingTechnique } from "../../../engine/bodybuilding/file4_trainingSystem/eligibility.js";
import { TECHNIQUES } from "../../../engine/bodybuilding/file4_trainingSystem/techniques.js";

// نگاشت مصرفی مستندشده در زیرمرحله‌ی ۵.۱: واژگان trainingGoal حرکات با
// Program.main_goal یکی نیست.
const MAIN_GOAL_TO_TRAINING_GOAL = { fat_loss: "endurance", maintenance: "hypertrophy" };

export default function StageTwoGate({ studentId, assessment, cascadeResult, onSave, onBack }) {
  const [blacklistEntries, setBlacklistEntries] = useState(null);
  const [selected, setSelected] = useState({}); // exerciseId -> { techniqueId }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.injuryBlacklist.getByStudentId(studentId).then((rows) => {
      if (!cancelled) setBlacklistEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const candidateExercises = useMemo(() => {
    if (!blacklistEntries) return [];
    const trainingGoal = MAIN_GOAL_TO_TRAINING_GOAL[assessment.main_goal] || assessment.main_goal;
    const filtered = filterExercisesByInjuryBlacklist(EXERCISES, blacklistEntries).filter((ex) =>
      ex.trainingGoal.includes(trainingGoal)
    );
    return applyGenderExerciseWeighting(filtered, cascadeResult.cascadeOutput.gender_advisory);
  }, [blacklistEntries, assessment.main_goal, cascadeResult]);

  const groupedByMuscle = useMemo(() => {
    const groups = {};
    for (const ex of candidateExercises) {
      groups[ex.muscle_group] = groups[ex.muscle_group] || [];
      groups[ex.muscle_group].push(ex);
    }
    return groups;
  }, [candidateExercises]);

  function toggleExercise(exercise) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[exercise.id]) delete next[exercise.id];
      else next[exercise.id] = { techniqueId: "straight_sets" };
      return next;
    });
  }

  function setTechnique(exerciseId, techniqueId) {
    setSelected((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], techniqueId } }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const { prescription } = cascadeResult.result;
      const finalExercises = Object.entries(selected).map(([exerciseId, choice]) => {
        const exercise = EXERCISES.find((e) => e.id === exerciseId);
        const eligibility = applyTrainingTechnique({
          techniqueId: choice.techniqueId,
          experience: cascadeResult.goal.experience,
          exerciseEquipment: exercise.equipment,
          exerciseMovementType: exercise.movement_type,
          main_goal: cascadeResult.goal.main_goal,
          tempo: prescription.tempo,
        });
        return {
          exercise_id: exercise.id,
          name: exercise.name,
          technique_id: choice.techniqueId,
          base_prescription: prescription,
          technique_result: eligibility,
        };
      });

      const architecture_json = {
        assessment,
        cascadeOutput: cascadeResult.cascadeOutput,
        hardVetoRestriction: cascadeResult.hardVetoRestriction,
        finalizePrescriptionResult: cascadeResult.result,
      };

      const program = await db.programs.create({
        student_id: studentId,
        program_type: "bodybuilding",
        status: "active",
        architecture_json,
        final_program_json: { exercises: finalExercises },
        total_weeks: null,
      });

      onSave(program);
    } catch (err) {
      setSaveError(err.message || "خطا در ذخیره‌ی برنامه.");
    } finally {
      setSaving(false);
    }
  }

  if (!blacklistEntries) {
    return <p style={{ padding: "1.5rem" }}>در حال بارگذاری حرکات...</p>;
  }

  const selectedCount = Object.keys(selected).length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <h2>انتخاب حرکت واقعی</h2>
      <p style={{ color: "#666", fontSize: "0.85rem" }}>
        فهرست زیر از قبل بر اساس لیست سیاه آسیب این شاگرد فیلتر شده. حرکات مدنظرتان را تیک بزنید و در صورت نیاز تکنیک تمرینی
        انتخاب کنید.
      </p>

      {Object.entries(groupedByMuscle).map(([muscle, exercises]) => (
        <div key={muscle} style={{ marginTop: "1rem" }}>
          <h4>{muscle}</h4>
          {exercises.map((ex) => {
            const isSelected = !!selected[ex.id];
            return (
              <div key={ex.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <label>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleExercise(ex)} /> {ex.name}{" "}
                  <span style={{ color: "#888", fontSize: "0.8rem" }}>
                    ({ex.equipment}
                    {ex.selectionWeight > 1 ? ` — وزن انتخاب ×${ex.selectionWeight.toFixed(2)}` : ""})
                  </span>
                </label>
                {isSelected && (
                  <div style={{ marginRight: "1.5rem", marginTop: "0.3rem" }}>
                    تکنیک تمرینی:{" "}
                    <select value={selected[ex.id].techniqueId} onChange={(e) => setTechnique(ex.id, e.target.value)}>
                      {Object.keys(TECHNIQUES).map((techniqueId) => {
                        const check = applyTrainingTechnique({
                          techniqueId,
                          experience: cascadeResult.goal.experience,
                          exerciseEquipment: ex.equipment,
                          exerciseMovementType: ex.movement_type,
                          main_goal: cascadeResult.goal.main_goal,
                          tempo: cascadeResult.result.prescription.tempo,
                        });
                        return (
                          <option key={techniqueId} value={techniqueId} disabled={!check.eligible} title={check.reason || ""}>
                            {techniqueId}
                            {!check.eligible ? ` (غیرفعال: ${check.reason})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {candidateExercises.length === 0 && <p>هیچ حرکت مناسبی (بعد از فیلتر) پیدا نشد.</p>}

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
