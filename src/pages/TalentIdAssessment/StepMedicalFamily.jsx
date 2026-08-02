import React from "react";
import { ACTIVE_INJURY_OPTIONS, CHRONIC_CONDITION_OPTIONS } from "./formShape.js";
import { sportRequirementMatrix } from "../../../engine/talentId/shared/sportRequirementMatrix.js";
import { StepShell, NumberField, TextField, CheckboxField } from "./formFields.jsx";

function toggleInList(list, key) {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

export default function StepMedicalFamily({ form, updateField, onNext, onBack }) {
  const sportOptions = Object.values(sportRequirementMatrix).sort((a, b) => a.name_fa.localeCompare(b.name_fa, "fa"));

  function addClearedSport(sportId) {
    if (!sportId || form.physician_clearance_sports.includes(sportId)) return;
    updateField("physician_clearance_sports", [...form.physician_clearance_sports, sportId]);
  }
  function removeClearedSport(sportId) {
    updateField("physician_clearance_sports", form.physician_clearance_sports.filter((id) => id !== sportId));
  }

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
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>تأییدیه‌ی پزشک (اختیاری — فقط اگر پزشک برای رشته‌ی خاصی مجوز بازگشت داده)</legend>
        {form.physician_clearance_sports.length > 0 && (
          <ul>
            {form.physician_clearance_sports.map((id) => (
              <li key={id}>
                {sportRequirementMatrix[id]?.name_fa}{" "}
                <button type="button" onClick={() => removeClearedSport(id)}>
                  حذف
                </button>
              </li>
            ))}
          </ul>
        )}
        <select value="" onChange={(e) => addClearedSport(e.target.value)}>
          <option value="">+ افزودن رشته‌ی تأییدشده</option>
          {sportOptions
            .filter((s) => !form.physician_clearance_sports.includes(s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_fa}
              </option>
            ))}
        </select>
        {form.physician_clearance_sports.length > 0 && (
          <>
            <label style={{ display: "block", marginTop: "0.5rem" }}>
              تاریخ تأییدیه
              <input type="date" value={form.physician_clearance_date} onChange={(e) => updateField("physician_clearance_date", e.target.value)} />
            </label>
            <TextField label="یادداشت پزشک (اختیاری)" value={form.physician_clearance_notes} onChange={(v) => updateField("physician_clearance_notes", v)} />
          </>
        )}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>سابقه‌ی خانوادگی</legend>
        <CheckboxField label="والدین ورزشکار بوده‌اند" checked={form.parent_athletes} onChange={(v) => updateField("parent_athletes", v)} />
        <CheckboxField label="بستگان درجه‌یک نخبه‌ی ورزشی" checked={form.elite_relatives} onChange={(v) => updateField("elite_relatives", v)} />
      </fieldset>
    </StepShell>
  );
}
