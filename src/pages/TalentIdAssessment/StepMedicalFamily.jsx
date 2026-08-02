import React from "react";
import { ACTIVE_INJURY_OPTIONS, CHRONIC_CONDITION_OPTIONS } from "./formShape.js";
import { StepShell, NumberField, TextField, CheckboxField } from "./formFields.jsx";

function toggleInList(list, key) {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

export default function StepMedicalFamily({ form, updateField, onNext, onBack }) {
  return (
    <StepShell title="۵. پزشکی و سابقه‌ی خانوادگی" onBack={onBack} onNext={onNext}>
      <fieldset>
        <legend>آسیب‌های فعال</legend>
        {ACTIVE_INJURY_OPTIONS.map((opt) => (
          <CheckboxField
            key={opt.key}
            label={opt.label}
            checked={form.active_injuries.includes(opt.key)}
            onChange={() => updateField("active_injuries", toggleInList(form.active_injuries, opt.key))}
          />
        ))}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>شرایط مزمن</legend>
        {CHRONIC_CONDITION_OPTIONS.map((opt) => (
          <CheckboxField
            key={opt.key}
            label={opt.label}
            checked={form.chronic_conditions.includes(opt.key)}
            onChange={() => updateField("chronic_conditions", toggleInList(form.chronic_conditions, opt.key))}
          />
        ))}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>سایر موارد پزشکی</legend>
        <NumberField label="بیشترین شدت درد فعلی" suffix="۰ تا ۱۰" min={0} max={10} value={form.pain_scale_current_max_0_to_10} onChange={(v) => updateField("pain_scale_current_max_0_to_10", v)} />
        <TextField label="وضعیت تأیید پزشک (اختیاری)" value={form.physician_clearance_status} onChange={(v) => updateField("physician_clearance_status", v)} />
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>سابقه‌ی خانوادگی</legend>
        <CheckboxField label="والدین ورزشکار بوده‌اند" checked={form.parent_athletes} onChange={(v) => updateField("parent_athletes", v)} />
        <CheckboxField label="بستگان درجه‌یک نخبه‌ی ورزشی" checked={form.elite_relatives} onChange={(v) => updateField("elite_relatives", v)} />
      </fieldset>
    </StepShell>
  );
}
