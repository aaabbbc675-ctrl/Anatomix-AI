import React, { useEffect, useState } from "react";
import { db } from "../../store/db";
import ProgramTypeSelect from "./ProgramTypeSelect";
import BodybuildingAssessmentForm from "./BodybuildingAssessmentForm";
import CorrectiveAssessmentForm from "./CorrectiveAssessmentForm";
import CorrectiveStageOneGate from "./CorrectiveStageOneGate";
import CorrectiveStageTwoGate from "./CorrectiveStageTwoGate";
import StageOneGate from "./StageOneGate";
import StageTwoGate from "./StageTwoGate";

// طبق بخش ۲.۳ سند: «+ برنامه جدید» همیشه یعنی شروع سیکل تازه (Stage=1) با seed
// از آخرین coachOverrides شاگرد — هرگز خروجی منجمد قدیمی به‌عنوان نتیجه‌ی فعلی
// نمایش داده نمی‌شود؛ موتور همیشه دوباره روی مقادیر (قابل‌ویرایش) اجرا می‌شود.
export default function NewProgramWizard({ studentId, onDone, onCancel }) {
  // type | assessment | stage1 | stage2 (بدنسازی) | correctiveAssessment | correctiveStage1 | correctiveStage2 (اصلاحی)
  const [step, setStep] = useState("type");
  const [initialAssessment, setInitialAssessment] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [cascadeResult, setCascadeResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.programs.getByStudentId(studentId).then((programs) => {
      if (cancelled) return;
      const lastBodybuilding = programs.find((p) => p.program_type === "bodybuilding");
      if (lastBodybuilding?.architecture_json?.assessment) {
        setInitialAssessment(lastBodybuilding.architecture_json.assessment);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (step === "type") {
    return (
      <ProgramTypeSelect
        onSelect={(type) => {
          if (type === "bodybuilding") setStep("assessment");
          else if (type === "corrective") setStep("correctiveAssessment");
        }}
      />
    );
  }

  if (step === "assessment") {
    return (
      <BodybuildingAssessmentForm
        initialValues={initialAssessment}
        onCancel={onCancel}
        onSubmit={(values) => {
          setAssessment(values);
          setStep("stage1");
        }}
      />
    );
  }

  if (step === "correctiveAssessment") {
    return (
      <CorrectiveAssessmentForm
        onCancel={onCancel}
        onSubmit={(values) => {
          setAssessment(values);
          setStep("correctiveStage1");
        }}
      />
    );
  }

  if (step === "correctiveStage1") {
    return (
      <CorrectiveStageOneGate
        assessment={assessment}
        onBack={() => setStep("correctiveAssessment")}
        onConfirm={({ assessment: confirmedAssessment, cascadeResult: confirmedResult }) => {
          setAssessment(confirmedAssessment);
          setCascadeResult(confirmedResult);
          setStep("correctiveStage2");
        }}
      />
    );
  }

  if (step === "correctiveStage2") {
    return (
      <CorrectiveStageTwoGate
        studentId={studentId}
        assessment={assessment}
        cascadeResult={cascadeResult}
        onBack={() => setStep("correctiveStage1")}
        onSave={(program) => onDone(program)}
      />
    );
  }

  if (step === "stage1") {
    return (
      <StageOneGate
        assessment={assessment}
        onBack={() => setStep("assessment")}
        onConfirm={({ assessment: confirmedAssessment, cascadeResult: confirmedResult }) => {
          setAssessment(confirmedAssessment);
          setCascadeResult(confirmedResult);
          setStep("stage2");
        }}
      />
    );
  }

  if (step === "stage2") {
    return (
      <StageTwoGate
        studentId={studentId}
        assessment={assessment}
        cascadeResult={cascadeResult}
        onBack={() => setStep("stage1")}
        onSave={(program) => onDone(program)}
      />
    );
  }

  return null;
}
