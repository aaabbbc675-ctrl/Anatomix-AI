import React from "react";
import { StepShell, NumberField } from "./formFields.jsx";

export default function StepAnthropometrics({ form, updateField, onNext, onBack }) {
  return (
    <StepShell title="۲. آنتروپومتریک و ترکیب بدنی" onBack={onBack} onNext={onNext}>
      <fieldset>
        <legend>اندازه‌های بدنی</legend>
        <NumberField label="قد ایستاده" suffix="سانتی‌متر" value={form.standing_height_cm} onChange={(v) => updateField("standing_height_cm", v)} />
        <NumberField label="قد نشسته" suffix="سانتی‌متر" value={form.sitting_height_cm} onChange={(v) => updateField("sitting_height_cm", v)} />
        <NumberField label="وزن" suffix="کیلوگرم" value={form.weight_kg} onChange={(v) => updateField("weight_kg", v)} />
        <NumberField
          label="دهانه‌ی بازو (اختیاری — خالی بماند یعنی از قد تخمین زده می‌شود)"
          suffix="سانتی‌متر"
          value={form.arm_span_cm}
          onChange={(v) => updateField("arm_span_cm", v)}
        />
        <NumberField label="دور مچ دست" suffix="سانتی‌متر" value={form.wrist_circumference_cm} onChange={(v) => updateField("wrist_circumference_cm", v)} />
        <NumberField label="عرض شانه" suffix="سانتی‌متر" value={form.shoulder_width_cm} onChange={(v) => updateField("shoulder_width_cm", v)} />
        <NumberField label="عرض لگن" suffix="سانتی‌متر" value={form.hip_width_cm} onChange={(v) => updateField("hip_width_cm", v)} />
      </fieldset>
      <fieldset style={{ marginTop: "1rem" }}>
        <legend>ترکیب بدنی (BIA)</legend>
        <NumberField label="درصد چربی بدن" suffix="٪" value={form.body_fat_percent} onChange={(v) => updateField("body_fat_percent", v)} />
        <NumberField
          label="درصد عضله‌ی اسکلتی نسبت به وزن کل"
          suffix="٪"
          value={form.smm_percent_of_body_weight}
          onChange={(v) => updateField("smm_percent_of_body_weight", v)}
        />
        <NumberField label="درصد آب کل بدن" suffix="٪" value={form.total_body_water_percent} onChange={(v) => updateField("total_body_water_percent", v)} />
        <NumberField label="توده‌ی بدون چربی (FFM)" suffix="کیلوگرم" value={form.fat_free_mass_kg} onChange={(v) => updateField("fat_free_mass_kg", v)} />
      </fieldset>
    </StepShell>
  );
}
