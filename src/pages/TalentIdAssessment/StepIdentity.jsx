import React from "react";
import { VALID_SEX } from "../../../engine/talentId/file1_intakeInputs.js";
import { StepShell, TextField, SelectField } from "./formFields.jsx";

const SEX_LABELS = { male: "مرد", female: "زن" };

export default function StepIdentity({ form, updateField, onNext, onCancel }) {
  const canProceed = form.date_of_birth && form.assessment_date && form.biological_sex;
  return (
    <StepShell title="۱. هویت و جمعیت‌شناسی" onBack={onCancel} onNext={canProceed ? onNext : undefined} backLabel="انصراف">
      <TextField label="شناسه‌ی ورزشکار (اختیاری)" value={form.athlete_id} onChange={(v) => updateField("athlete_id", v)} />
      <label style={{ display: "block", marginTop: "0.5rem" }}>
        تاریخ تولد (میلادی)
        <input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} />
      </label>
      <label style={{ display: "block", marginTop: "0.5rem" }}>
        تاریخ ارزیابی
        <input type="date" value={form.assessment_date} onChange={(e) => updateField("assessment_date", e.target.value)} />
      </label>
      <SelectField
        label="جنسیت زیستی"
        value={form.biological_sex}
        onChange={(v) => updateField("biological_sex", v)}
        options={VALID_SEX.map((v) => ({ value: v, label: SEX_LABELS[v] || v }))}
      />
      {!canProceed && (
        <p style={{ color: "#8a6d00", marginTop: "0.75rem" }}>تاریخ تولد و تاریخ ارزیابی الزامی‌اند.</p>
      )}
    </StepShell>
  );
}
