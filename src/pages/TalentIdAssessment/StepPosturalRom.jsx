import React from "react";
import {
  POSTURE_TYPES,
  POSTURE_SEVERITY_LABELS,
  ROM_DEFICIT_TYPES,
  ROM_SEVERITY_OPTIONS,
} from "./formShape.js";
import { StepShell, NumberField, CheckboxField, SelectField } from "./formFields.jsx";

export default function StepPosturalRom({ form, updateField, onNext, onBack }) {
  function setPosture(key, severity) {
    // ⚠️ رفع باگ Commit 22: severity باید داخل {severity:N} بسته‌بندی شود
    // (رجوع کنید به کامنت defaultTalentIdForm در formShape.js).
    updateField("posture", { ...form.posture, [key]: { severity: Number(severity) } });
  }
  function setRom(key, severity) {
    updateField("rom_deficits", { ...form.rom_deficits, [key]: severity });
  }

  return (
    <StepShell title="۳. پوسچرال، ROM و بیومتریک" onBack={onBack} onNext={onNext}>
      <fieldset>
        <legend>وضعیت پوسچرال (شدت ۰=ندارد تا ۳=شدید)</legend>
        {POSTURE_TYPES.map((p) => (
          <SelectField
            key={p.key}
            label={p.label}
            value={form.posture[p.key].severity}
            onChange={(v) => setPosture(p.key, v)}
            options={Object.entries(POSTURE_SEVERITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        ))}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>کوتاهی عضلانی (ROM)</legend>
        {ROM_DEFICIT_TYPES.map((r) => (
          <SelectField
            key={r.key}
            label={r.label}
            value={form.rom_deficits[r.key]}
            onChange={(v) => setRom(r.key, v)}
            options={ROM_SEVERITY_OPTIONS}
          />
        ))}
        <CheckboxField
          label="هایپرموبیلیتی تشخیص داده شده"
          checked={form.hypermobility_detected}
          onChange={(v) => updateField("hypermobility_detected", v)}
        />
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>بیومتریک</legend>
        <NumberField label="ضربان قلب استراحت" suffix="bpm" value={form.resting_heart_rate_bpm} onChange={(v) => updateField("resting_heart_rate_bpm", v)} />
        <NumberField label="امتیاز تعادل" suffix="۰ تا ۱۰" min={0} max={10} value={form.balance_score_0_to_10} onChange={(v) => updateField("balance_score_0_to_10", v)} />
        <NumberField
          label="درصد عدم‌تقارن وزنی دوطرفه"
          suffix="٪"
          value={form.bilateral_weight_asymmetry_percent}
          onChange={(v) => updateField("bilateral_weight_asymmetry_percent", v)}
        />
      </fieldset>
    </StepShell>
  );
}
