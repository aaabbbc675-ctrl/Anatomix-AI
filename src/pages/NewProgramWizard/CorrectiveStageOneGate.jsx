import React, { useMemo, useState } from "react";
import { computeCorrectivePrescription } from "../../engine/correctiveCascade";

const ARCHITECTURE_TYPE_LABELS = {
  injured_4_block: "معماری ۴بلوکی ویژه‌ی آسیب‌دیدگان (فایل۱۱)",
  cex_4_phase: "معماری ۴مرحله‌ای CEx (فایل۱۰)",
};

const AGE_GROUP_LABELS = { child: "کودک", adult: "بزرگسال", elderly: "سالمند" };

// همان اصطلاحات دقیق کامنت file9_syndromeDetection.js — هم‌الگوی
// CorrectiveAssessmentForm.jsx.
const PRIORITY_CATEGORY_LABELS = {
  spine_pelvis: "ستون فقرات / لگن",
  big_joints: "مفصل بزرگ",
  chain_end: "انتهای زنجیره (مچ / کف پا)",
};

function formatRange(range) {
  if (!range) return "—";
  const [min, max] = range;
  if (min === null && max === null) return "—";
  if (min === null) return `تا ${max}`;
  if (max === null) return `${min}+`;
  return min === max ? `${min}` : `${min} تا ${max}`;
}

export default function CorrectiveStageOneGate({ assessment, onConfirm, onBack }) {
  // ناهنجاری‌هایی که مربی موقتاً از این ماه کنار گذاشته — قبل از فراخوانی
  // applyDeformityFunnel از هر دو فیلد مرتبط (coachPrioritizedDeformities و
  // deformitiesForFunnel) حذف می‌شوند، نه فقط از نمایش.
  const [removedDeformityIds, setRemovedDeformityIds] = useState([]);

  const effectiveAssessment = useMemo(
    () => ({
      ...assessment,
      coachPrioritizedDeformities: assessment.coachPrioritizedDeformities.filter((id) => !removedDeformityIds.includes(id)),
      deformitiesForFunnel: assessment.deformitiesForFunnel.filter((d) => !removedDeformityIds.includes(d.id)),
    }),
    [assessment, removedDeformityIds]
  );

  const liveResult = useMemo(() => computeCorrectivePrescription(effectiveAssessment), [effectiveAssessment]);

  const {
    diseaseManagement,
    sessionArchitecture,
    ageAdjustment,
    aerobicFitnessDrop,
    obesityHighHeartRate,
    detectedSyndromes,
    deformityFunnel,
    sessionCapacity,
    tempoVeto,
    architectureType,
  } = liveResult;

  if (diseaseManagement.hard_stop) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
        <h2>امکان ساخت برنامه در حال حاضر وجود ندارد</h2>
        <div style={{ padding: "1rem", background: "#fdecea", border: "1px solid #c0392b", borderRadius: 8 }}>
          {diseaseManagement.hard_stop_reasons.map((reason, i) => (
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

  const collectedWarnings = [
    ...diseaseManagement.warnings,
    ...(obesityHighHeartRate?.warnings ?? []),
    ...(sessionArchitecture.medicalModeActive ? [sessionArchitecture.mandatoryHeaderWarning] : []),
  ];

  function removeDeformity(id) {
    setRemovedDeformityIds((prev) => [...prev, id]);
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>تایید معماری کلان — حرکات اصلاحی</h2>

      <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>نوع معماری: </strong>
        {ARCHITECTURE_TYPE_LABELS[architectureType]}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <tbody>
          <tr>
            <td>گروه سنی</td>
            <td>{AGE_GROUP_LABELS[ageAdjustment.ageGroup]}</td>
          </tr>
          <tr>
            <td>ظرفیت جلسه (زمان بدنه‌ی اصلی)</td>
            <td>{sessionCapacity.mainWorkoutMinutes} دقیقه</td>
          </tr>
          <tr>
            <td>حداکثر تعداد حرکت قابل‌جای‌گیری</td>
            <td>{sessionCapacity.maxExerciseCount}</td>
          </tr>
          {sessionArchitecture.medicalModeActive && (
            <>
              <tr>
                <td>سقف RPE (حالت پزشکی)</td>
                <td>{sessionArchitecture.rpeCap}</td>
              </tr>
              <tr>
                <td>بازه‌ی دقیقه‌ی جلسه</td>
                <td>{formatRange(sessionArchitecture.sessionMinutesRange)}</td>
              </tr>
              <tr>
                <td>بازه‌ی استراحت (ثانیه)</td>
                <td>{formatRange(sessionArchitecture.restSecRange)}</td>
              </tr>
              <tr>
                <td>سقف پیشروی ماهانه</td>
                <td>٪{sessionArchitecture.monthlyProgressionCapPercent}</td>
              </tr>
            </>
          )}
          {tempoVeto.allIsometricPausesZero && (
            <tr>
              <td>وتوی تمپو</td>
              <td>همه‌ی مکث‌های ایزومتریک = ۰</td>
            </tr>
          )}
        </tbody>
      </table>
      {!sessionArchitecture.medicalModeActive && (
        <p style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "#666" }}>
          بدون احتساب گرم‌کردن/سردکردن، چون سند برای حالت غیرپزشکی عددی مشخص نکرده — اعداد بالا فقط زمان بدنه‌ی اصلی
          را نشان می‌دهند.
        </p>
      )}

      {aerobicFitnessDrop?.restricted && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
          <strong>افت آمادگی هوازی (Resting HR بالای ۸۰)</strong>
          <p style={{ margin: "0.4rem 0" }}>
            شروع از {aerobicFitnessDrop.startingDurationMinutes} دقیقه (سقف {aerobicFitnessDrop.durationCapMinutes} دقیقه)،
            جایگاه: انتهای جلسه.
          </p>
        </div>
      )}

      {obesityHighHeartRate?.triggered && (
        <div
          style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #e0a800", background: "#fff8e1", borderRadius: 8 }}
        >
          <strong>قانون چاقی + ضربان بالا فعال است</strong>
          <p style={{ margin: "0.4rem 0" }}>{obesityHighHeartRate.warnings.join(" ")}</p>
        </div>
      )}

      {detectedSyndromes.length > 0 && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
          <strong>سندرم‌های ترکیبی تشخیص‌داده‌شده</strong>
          <ul>
            {detectedSyndromes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>ناهنجاری‌های اولویت‌بندی‌شده {deformityFunnel.funnelActive ? "(قیف فعال — بیش از ۴ ناهنجاری)" : ""}</strong>
        {deformityFunnel.slotDeformities.length === 0 && deformityFunnel.homeworkOnlyDeformities.length === 0 && (
          <p>هیچ ناهنجاری‌ای ثبت نشده.</p>
        )}
        <ul>
          {deformityFunnel.slotDeformities.map((d, i) => (
            <li key={`${d.id}-${i}`}>
              {d.id} — {PRIORITY_CATEGORY_LABELS[d.priorityCategory]}{" "}
              <button type="button" onClick={() => removeDeformity(d.id)}>
                ✗ حذف از این ماه
              </button>
            </li>
          ))}
        </ul>
        {deformityFunnel.homeworkOnlyDeformities.length > 0 && (
          <>
            <strong>فقط تکلیف خانگی (اسلات نگرفتند):</strong>
            <ul>
              {deformityFunnel.homeworkOnlyDeformities.map((d, i) => (
                <li key={`${d.id}-${i}`}>
                  {d.id} — {PRIORITY_CATEGORY_LABELS[d.priorityCategory]}{" "}
                  <button type="button" onClick={() => removeDeformity(d.id)}>
                    ✗ حذف از این ماه
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {/* طبق تصمیم صریح: اولویت واقعی از priorityCategory هر ناهنجاری (نه
            ترتیب دستی مربی) می‌آید — پس اینجا drag-drop برای تغییر ترتیب
            عمداً ساخته نشده، نه یک قابلیت جاافتاده. */}
        <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
          اولویت‌بندی بر اساس نوع ناهنجاری (priorityCategory) خودکار است؛ می‌توانید موقتاً یک ناهنجاری را از این ماه کنار
          بگذارید.
        </p>
      </div>

      {collectedWarnings.length > 0 && (
        <ul style={{ marginTop: "1rem", color: "#8a6d00" }}>
          {collectedWarnings.map((w, i) => (
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
