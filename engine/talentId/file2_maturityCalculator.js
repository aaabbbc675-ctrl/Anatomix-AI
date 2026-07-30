// فایل ۲ موتور استعدادیابی (بخش ۳ سند معماری): محاسبه‌ی Maturity Offset و
// Bio-Age. ورودی این فایل خروجی normalizeIntake (فایل ۱) است — enumها
// (biological_sex) آنجا اعتبارسنجی شده‌اند، اینجا فقط محاسبه (هم‌الگوی
// engine/nutrition/file2_energyTargets.js: فایل بعدی enum فایل قبلی را
// دوباره اعتبارسنجی نمی‌کند، فقط یک آبجکت مسطح از فیلدهای لازم می‌گیرد).
//
// طبق تصمیم Commit 3 (وریفای مستقل فرمول Mirwald، سه یافته‌ی مهم که باید
// مستند بمانند):
//
// ۱) ضرایب فرمول Mirwald پایین (-9.236, 0.0002708, -0.001663, 0.007216,
//    0.02292 برای پسر؛ -9.376, 0.0001882, 0.0022, 0.005841, -0.002658,
//    0.07693 برای دختر) با یک منبع مستقل (جستجوی وب، نه فقط سند معماری)
//    تأیید شدند — نه صرفاً کپی از سند.
//
// ۲) عدد تست نمونه‌ی خودِ سند معماری (بخش ۳.۸: «پسر ۱۲.۵ ساله، H=155,
//    SH=78, W=45, LL=77 → MO مورد انتظار -1.63») غلط بود. محاسبه‌ی دستیِ
//    مستقلِ همین فرمول با همین ورودی‌ها عدد -۱.۵۰۹۱۹... می‌دهد، نه -۱.۶۳.
//    این یک عدد نمونه‌ی جعلی/تخمینی در سند بوده که واقعاً از فرمول محاسبه
//    نشده بود؛ تست‌های file2 از -1.509 (عدد وریفای‌شده) استفاده می‌کنند،
//    نه از -1.63 سند. رجوع کنید به تحلیل Commit 3 در تاریخچه‌ی گفتگو.
//
// ۳) Khamis-Roche (بخش ۳.۲.۲ سند) پیاده‌سازی نشد — سند فقط فرمول کلی
//    ناقص (predicted_adult_height = a+b×height+c×weight+d×midparent_height)
//    را بدون جدول ضرایب واقعی داده و نه سند نه من با اطمینان کافی جدول
//    ضرایب سن×جنس‌محور مقاله‌ی ۱۹۹۴ را داریم. طبق تصمیم تاییدشده،
//    ساختن یک جدول ضرایب حدسی دقیقاً همان خطری بود که این Commit سعی در
//    اجتنابش داشت. راه‌حل: selectMaturityFormula فقط بین 'mirwald' و
//    'chronological_fallback' انتخاب می‌کند (طبق بخش ۳.۵.۱ سند که خودش
//    این fallback را برای خارج از رنج پیش‌بینی کرده) — بدون حالت
//    khamis_roche در این Commit.

const AGE_AT_PHV_AVERAGE = { male: 14.0, female: 12.0 };

// طبق بخش ۳.۲.۱ سند: بازه‌ی اعتبار Mirwald.
const MIRWALD_VALID_RANGE = {
  male: { min: 12, max: 16 },
  female: { min: 10, max: 14 },
};

// طبق بخش ۳.۵.۲ سند: خارج از این بازه فقط flag می‌شود، رد نمی‌شود.
const MO_OUTLIER_THRESHOLD_YEARS = 3;

// طبق بخش ۳.۵.۳ سند.
const MATURITY_TYPE_THRESHOLD_YEARS = 1.0;

// طبق تصمیم تاییدشده‌ی Commit 3: چون Khamis-Roche نداریم، %PAH (بخش ۳.۴
// سند) قابل محاسبه نیست. جایگزین: قرارداد رایج دیگری در ادبیات bio-banding
// (Cumming et al. 2017) که مستقیماً از MO استفاده می‌کند، نه %PAH. این یک
// قرارداد جایگزین با اطمینان متوسط است — نه فرمول خودِ Mirwald که اطمینان
// بالا دارد — و باید اگر بعداً %PAH واقعی در دسترس شد جایگزین شود.
const PHV_ZONE_MO_THRESHOLD_YEARS = 1.0;

// طبق بخش ۳.۶ سند: نمونه‌ی CI برای mirwald صریحاً ±۰.۶ داده شده.
const CI_BIO_AGE_MIRWALD = 0.6;
// طبق تصمیم تاییدشده‌ی Commit 3: سند برای fallback عددی نمی‌دهد؛ ±۳.۰ حدس
// مهندسی معقول است چون در fallback هیچ تخمین بیولوژیکی واقعی نداریم، فقط
// سن تقویمی خام را جایگزین می‌کنیم.
const CI_BIO_AGE_FALLBACK = 3.0;

// طبق بخش ۳.۲.۱ سند — وریفای‌شده با منبع مستقل (نه فقط کپی از سند).
function mirwaldBoys(chronoAge, standingHeightCm, sittingHeightCm, legLengthCm, weightKg) {
  return (
    -9.236 +
    0.0002708 * (legLengthCm * sittingHeightCm) +
    -0.001663 * (chronoAge * legLengthCm) +
    0.007216 * (chronoAge * sittingHeightCm) +
    0.02292 * ((weightKg / standingHeightCm) * 100)
  );
}

// طبق بخش ۳.۲.۱ سند — وریفای‌شده با منبع مستقل.
function mirwaldGirls(chronoAge, standingHeightCm, sittingHeightCm, legLengthCm, weightKg) {
  return (
    -9.376 +
    0.0001882 * (legLengthCm * sittingHeightCm) +
    0.0022 * (chronoAge * legLengthCm) +
    0.005841 * (chronoAge * sittingHeightCm) +
    -0.002658 * (chronoAge * weightKg) +
    0.07693 * ((weightKg / standingHeightCm) * 100)
  );
}

// طبق بخش ۳.۲.۳ سند، ساده‌شده طبق تصمیم تاییدشده‌ی Commit 3 (بدون
// khamis_roche؛ hasParentHeights دیگر پارامتر معناداری نیست).
function selectMaturityFormula(chronoAge, sex) {
  const range = MIRWALD_VALID_RANGE[sex];
  if (range && chronoAge >= range.min && chronoAge <= range.max) {
    return "mirwald";
  }
  return "chronological_fallback";
}

// طبق بخش ۳.۳ سند: bio_age = age_at_phv_average(sex) + maturity_offset.
function computeBioAge(maturityOffset, sex) {
  return AGE_AT_PHV_AVERAGE[sex] + maturityOffset;
}

// طبق بخش ۳.۵.۳ سند.
function determineMaturityType(bioAge, chronoAge) {
  const delta = bioAge - chronoAge;
  if (delta > MATURITY_TYPE_THRESHOLD_YEARS) return "early_maturer";
  if (delta < -MATURITY_TYPE_THRESHOLD_YEARS) return "late_maturer";
  return "on_time_maturer";
}

// طبق تصمیم تاییدشده‌ی Commit 3 (قرارداد MO-محور جایگزین %PAH، اطمینان
// متوسط): pre-PHV اگر MO < -۱، circa-PHV اگر بین -۱ و +۱، post-PHV اگر > +۱.
function computePhvZone(maturityOffset) {
  if (maturityOffset == null) return "unknown";
  if (maturityOffset < -PHV_ZONE_MO_THRESHOLD_YEARS) return "pre_phv";
  if (maturityOffset > PHV_ZONE_MO_THRESHOLD_YEARS) return "post_phv";
  return "circa_phv";
}

function calculateMaturityProfile({
  chronological_age_decimal: chronoAge,
  biological_sex: sex,
  standing_height_cm: standingHeightCm,
  sitting_height_cm: sittingHeightCm,
  leg_length_cm: legLengthCm,
  weight_kg: weightKg,
}) {
  const warnings = [];
  const formulaUsed = selectMaturityFormula(chronoAge, sex);

  if (formulaUsed === "chronological_fallback") {
    return {
      chronological_age: chronoAge,
      biological_age: chronoAge,
      maturity_offset: null,
      age_at_phv_predicted: null,
      phv_zone: "unknown",
      maturity_type: "unknown",
      percent_adult_height: null,
      predicted_adult_height_cm: null,
      formula_used: "chronological_fallback",
      confidence: "low",
      ci_bio_age_years: CI_BIO_AGE_FALLBACK,
      warnings: [
        "Age outside Mirwald validity; using chronological age as fallback",
      ],
    };
  }

  const maturityOffset =
    sex === "male"
      ? mirwaldBoys(chronoAge, standingHeightCm, sittingHeightCm, legLengthCm, weightKg)
      : mirwaldGirls(chronoAge, standingHeightCm, sittingHeightCm, legLengthCm, weightKg);

  if (maturityOffset > MO_OUTLIER_THRESHOLD_YEARS || maturityOffset < -MO_OUTLIER_THRESHOLD_YEARS) {
    warnings.push("outlier — recheck sitting_height measurement");
  }

  const bioAge = computeBioAge(maturityOffset, sex);

  return {
    chronological_age: chronoAge,
    biological_age: bioAge,
    maturity_offset: maturityOffset,
    age_at_phv_predicted: AGE_AT_PHV_AVERAGE[sex] + maturityOffset,
    phv_zone: computePhvZone(maturityOffset),
    maturity_type: determineMaturityType(bioAge, chronoAge),
    percent_adult_height: null,
    predicted_adult_height_cm: null,
    formula_used: "mirwald",
    confidence: "high",
    ci_bio_age_years: CI_BIO_AGE_MIRWALD,
    warnings,
  };
}

export {
  calculateMaturityProfile,
  selectMaturityFormula,
  mirwaldBoys,
  mirwaldGirls,
  computeBioAge,
  determineMaturityType,
  computePhvZone,
  AGE_AT_PHV_AVERAGE,
  MIRWALD_VALID_RANGE,
  MO_OUTLIER_THRESHOLD_YEARS,
  MATURITY_TYPE_THRESHOLD_YEARS,
  CI_BIO_AGE_MIRWALD,
  CI_BIO_AGE_FALLBACK,
};
