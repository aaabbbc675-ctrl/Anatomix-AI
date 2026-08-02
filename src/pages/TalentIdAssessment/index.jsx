import React, { useState } from "react";
import { defaultTalentIdForm, buildRawInputsFromForm } from "./formShape.js";
import StepIdentity from "./StepIdentity.jsx";
import StepAnthropometrics from "./StepAnthropometrics.jsx";
import StepPosturalRom from "./StepPosturalRom.jsx";
import StepPerformanceTests from "./StepPerformanceTests.jsx";
import StepMedicalFamily from "./StepMedicalFamily.jsx";
import StepInterestsPsych from "./StepInterestsPsych.jsx";

const STEPS = ["identity", "anthropometrics", "posturalRom", "performance", "medicalFamily", "interestsPsych"];

// جریان مستقل از NewProgramWizard (تصمیم تاییدشده‌ی Commit 21) — ارزیابی
// استعداد یک «Program» نیست، پس نه از ProgramTypeSelect عبور می‌کند نه در
// db.programs ذخیره می‌شود؛ فقط رواج formState → سه ورودی خام → صفحه‌ی گزارش.
export default function TalentIdAssessment({ studentId, initialFullName, onCancel, onComplete }) {
  const [form, setForm] = useState(defaultTalentIdForm);
  const [stepIndex, setStepIndex] = useState(0);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (stepIndex === STEPS.length - 1) {
      const { rawDevice, rawCoach, rawChatbot } = buildRawInputsFromForm(form);
      onComplete({ rawDevice, rawCoach, rawChatbot, athleteName: initialFullName ?? null });
      return;
    }
    setStepIndex((i) => i + 1);
  }
  function goBack() {
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    setStepIndex((i) => i - 1);
  }

  const stepProgress = `مرحله ${stepIndex + 1} از ${STEPS.length}`;

  return (
    <div>
      <p style={{ textAlign: "center", color: "#888", fontSize: "0.8rem", marginTop: "1rem" }}>{stepProgress}</p>
      {STEPS[stepIndex] === "identity" && <StepIdentity form={form} updateField={updateField} onNext={goNext} onCancel={goBack} />}
      {STEPS[stepIndex] === "anthropometrics" && <StepAnthropometrics form={form} updateField={updateField} onNext={goNext} onBack={goBack} />}
      {STEPS[stepIndex] === "posturalRom" && <StepPosturalRom form={form} updateField={updateField} onNext={goNext} onBack={goBack} />}
      {STEPS[stepIndex] === "performance" && <StepPerformanceTests form={form} updateField={updateField} onNext={goNext} onBack={goBack} />}
      {STEPS[stepIndex] === "medicalFamily" && <StepMedicalFamily form={form} updateField={updateField} onNext={goNext} onBack={goBack} />}
      {STEPS[stepIndex] === "interestsPsych" && <StepInterestsPsych form={form} updateField={updateField} onNext={goNext} onBack={goBack} />}
    </div>
  );
}
