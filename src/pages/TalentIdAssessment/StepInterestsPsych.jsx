import React from "react";
import { sportRequirementMatrix } from "../../../engine/talentId/shared/sportRequirementMatrix.js";
import { StepShell } from "./formFields.jsx";

// طبق بخش ۱۰.۳ سند: فقط رتبه‌ی ۱-۳ بونوس می‌گیرد (INTEREST_BONUS_FACTORS در
// file9) — انتخاب بیشتر از ۳ بی‌اثر است، پس UI را به همین محدود می‌کنیم.
const MAX_RANKED_INTERESTS = 3;

export default function StepInterestsPsych({ form, updateField, onNext, onBack }) {
  const sportOptions = Object.values(sportRequirementMatrix).sort((a, b) => a.name_fa.localeCompare(b.name_fa, "fa"));

  function toggleInterest(sportId) {
    const current = form.explicit_sport_interest;
    if (current.includes(sportId)) {
      updateField("explicit_sport_interest", current.filter((id) => id !== sportId));
    } else if (current.length < MAX_RANKED_INTERESTS) {
      updateField("explicit_sport_interest", [...current, sportId]);
    }
  }

  return (
    <StepShell title="۶. علاقه‌مندی و پروفایل روان‌شناختی" onBack={onBack} onNext={onNext} nextLabel="مشاهده‌ی گزارش ←">
      <fieldset>
        <legend>رشته‌های مورد علاقه‌ی صریح (حداکثر ۳، به‌ترتیب اولویت — رتبه‌ی اول بیشترین بونوس را می‌گیرد)</legend>
        {form.explicit_sport_interest.length > 0 && (
          <ol style={{ marginTop: "0.5rem" }}>
            {form.explicit_sport_interest.map((id) => (
              <li key={id}>{sportRequirementMatrix[id]?.name_fa}</li>
            ))}
          </ol>
        )}
        <select
          style={{ marginTop: "0.5rem", width: "100%" }}
          value=""
          disabled={form.explicit_sport_interest.length >= MAX_RANKED_INTERESTS}
          onChange={(e) => e.target.value && toggleInterest(e.target.value)}
        >
          <option value="">
            {form.explicit_sport_interest.length >= MAX_RANKED_INTERESTS ? "حداکثر ۳ رشته انتخاب شد" : "+ افزودن رشته به لیست علاقه‌مندی"}
          </option>
          {sportOptions
            .filter((s) => !form.explicit_sport_interest.includes(s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_fa}
              </option>
            ))}
        </select>
        {form.explicit_sport_interest.length > 0 && (
          <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => updateField("explicit_sport_interest", [])}>
            پاک کردن لیست
          </button>
        )}
      </fieldset>

      <fieldset style={{ marginTop: "1rem", opacity: 0.6 }}>
        <legend>مصاحبه‌ی روان‌شناختی هوش مصنوعی</legend>
        <p style={{ fontSize: "0.85rem" }}>
          این بخش نیازمند اتصال به Claude API است که هنوز در این نسخه پیاده‌سازی نشده
          (رجوع کنید به <code>docs/TODO-api-key-security.md</code>). گزارش با یک پروفایل
          روان‌شناختی <strong>خنثی</strong> (همه‌ی صفات=۳، اطمینان=۰) محاسبه می‌شود و این
          به‌صراحت در گزارش نشان داده خواهد شد.
        </p>
        <button type="button" disabled>
          مصاحبه‌ی چت (به‌زودی)
        </button>
      </fieldset>
    </StepShell>
  );
}
