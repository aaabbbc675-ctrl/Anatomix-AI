// فایل ۹ موتور استعدادیابی (بخش ۱۰ سند معماری): Δ بین PsychProfile کاربر
// و نیاز روانی هر رشته. کاملاً pure — بدون وابستگی به API (برخلاف file8).

import { PSYCH_TRAITS } from "./shared/sportRequirementSchema.js";
import { getPsychMismatchNarrative, getPsychMatchNarrative } from "./shared/psychNarratives.js";

// طبق تصمیم تاییدشده‌ی Commit 9: چون سند بخش ۵.۵-مانند برای صفات روانی
// جدول trainability کامل نداده، پیش‌فرض 'trainable' (مهارت‌های روانی-ورزشی
// با تمرین/مربی‌گری روان‌شناسی توسعه‌پذیرند)، به‌جز pressure_tolerance که
// طبق نمونه‌ی صریح بخش ۱۴.۵ سند 'partial' است.
function getPsychTrainability(trait) {
  return trait === "pressure_tolerance" ? "partial" : "trainable";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// طبق بخش ۱۰.۱ سند.
function computePsychMatch(userProfile, sportRequirements) {
  let totalWeightedDelta = 0;
  let totalWeight = 0;
  const drivers = [];

  for (const trait of PSYCH_TRAITS) {
    const user = userProfile[trait];
    const target = sportRequirements.psych_requirements[trait];
    const importance = sportRequirements.trait_importance?.[trait] ?? 1;

    const delta = Math.abs(user - target);
    totalWeightedDelta += delta * importance;
    totalWeight += 4 * importance;

    if (delta >= 2) {
      drivers.push({
        driver_id: `psych.${trait}.mismatch`,
        trait,
        category: "psychological",
        user_value: user,
        target_value: target,
        delta,
        importance,
        trainability: getPsychTrainability(trait),
        narrative_short: getPsychMismatchNarrative(trait, user, target),
      });
    } else if (delta <= 1 && importance >= 1) {
      drivers.push({
        driver_id: `psych.${trait}.match`,
        trait,
        category: "psychological",
        user_value: user,
        target_value: target,
        delta,
        importance,
        trainability: getPsychTrainability(trait),
        narrative_short: getPsychMatchNarrative(trait),
      });
    }
  }

  const matchPercent = (1 - totalWeightedDelta / totalWeight) * 100;
  return { psych_score: clamp(matchPercent, 0, 100), drivers };
}

// طبق بخش ۱۰.۳ سند: رتبه‌ی ۰=+۱۰٪, ۱=+۷٪, ۲=+۵٪.
const INTEREST_BONUS_FACTORS = [1.1, 1.07, 1.05];

function applyInterestBonus(psychScore, explicitInterests, sportId) {
  const rank = (explicitInterests ?? []).indexOf(sportId);
  if (rank === -1 || rank >= INTEREST_BONUS_FACTORS.length) {
    return { psych_score: psychScore, driver: null };
  }

  const bonusFactor = INTEREST_BONUS_FACTORS[rank];
  const adjustedScore = Math.min(100, psychScore * bonusFactor);
  const driver = {
    driver_id: "interest.explicit_bonus",
    rank_by_user: rank + 1,
    applied_bonus: `${Math.round((bonusFactor - 1) * 100)}%`,
    narrative: `کاربر این رشته را در اولویت ${rank + 1} علاقه‌ی شخصی قرار داده`,
  };
  return { psych_score: adjustedScore, driver };
}

function calculatePsychScores(sportRequirementMatrix, psychProfile) {
  const scores = {};
  for (const [sportId, sportEntry] of Object.entries(sportRequirementMatrix)) {
    const { psych_score, drivers } = computePsychMatch(psychProfile, sportEntry);
    const { psych_score: adjustedScore, driver: interestDriver } = applyInterestBonus(
      psych_score,
      psychProfile.explicit_interests,
      sportId
    );
    scores[sportId] = {
      final_psych_score: adjustedScore,
      drivers: interestDriver ? [...drivers, interestDriver] : drivers,
    };
  }
  return scores;
}

export { computePsychMatch, applyInterestBonus, calculatePsychScores, getPsychTrainability };
