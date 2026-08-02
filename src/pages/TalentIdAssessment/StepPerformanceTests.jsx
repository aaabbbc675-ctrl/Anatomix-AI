import React from "react";
import { StepShell, TrialsField, NumberField } from "./formFields.jsx";

export default function StepPerformanceTests({ form, updateField, onNext, onBack }) {
  return (
    <StepShell title="۴. تست‌های عملکردی میدانی" onBack={onBack} onNext={onNext}>
      <p style={{ color: "#666", fontSize: "0.85rem" }}>هر فیلد سه‌تلاشی اختیاری است — بهترین تلاش خودکار انتخاب می‌شود.</p>
      <TrialsField label="پرش عمودی" suffix="سانتی‌متر" values={form.vertical_jump_cm} onChange={(v) => updateField("vertical_jump_cm", v)} />
      <TrialsField label="پرش طول جفت" suffix="سانتی‌متر" values={form.broad_jump_cm} onChange={(v) => updateField("broad_jump_cm", v)} />
      <TrialsField label="دوی ۱۰ متر" suffix="ثانیه" values={form.sprint_10m_sec} onChange={(v) => updateField("sprint_10m_sec", v)} />
      <TrialsField label="دوی ۳۰ متر" suffix="ثانیه" values={form.sprint_30m_sec} onChange={(v) => updateField("sprint_30m_sec", v)} />
      <TrialsField label="چابکی ۵-۱۰-۵" suffix="ثانیه" values={form.agility_5_10_5_sec} onChange={(v) => updateField("agility_5_10_5_sec", v)} />
      <TrialsField label="دینامومتر گیر — دست غالب" suffix="کیلوگرم" values={form.handgrip_dominant_kg} onChange={(v) => updateField("handgrip_dominant_kg", v)} />
      <TrialsField label="دینامومتر گیر — دست غیرغالب" suffix="کیلوگرم" values={form.handgrip_nondominant_kg} onChange={(v) => updateField("handgrip_nondominant_kg", v)} />

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>بیپ تست (Beep Test)</legend>
        <NumberField label="سطح (Level)" value={form.beep_level} onChange={(v) => updateField("beep_level", v)} />
        <NumberField label="شاتل" value={form.beep_shuttle} onChange={(v) => updateField("beep_shuttle", v)} />
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>سایر تست‌ها</legend>
        <NumberField label="دراز و نشست/شنا در ۶۰ ثانیه" suffix="تعداد" value={form.pushups_60sec_count} onChange={(v) => updateField("pushups_60sec_count", v)} />
        <NumberField label="خمش رو به جلو (Sit and Reach)" suffix="سانتی‌متر" value={form.sit_and_reach_cm} onChange={(v) => updateField("sit_and_reach_cm", v)} />
        <NumberField label="پرتاب توپ به دیوار در ۳۰ ثانیه" suffix="تعداد" value={form.wall_toss_30sec_count} onChange={(v) => updateField("wall_toss_30sec_count", v)} />
      </fieldset>
    </StepShell>
  );
}
