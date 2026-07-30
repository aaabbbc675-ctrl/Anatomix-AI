// فایل ۸ موتور استعدادیابی (بخش ۹ سند معماری): استخراج ۷ متغیر روانی از
// مکالمه‌ی چت‌بات، از طریق Claude API با tool_use.
//
// ⚠️ اصل پاکی (بخش ۱.۴ سند) اینجا به API call هم تعمیم داده شده (تصمیم
// تاییدشده‌ی Commit 9): این فایل هیچ فراخوانی واقعی fetch/API ندارد.
// `extractPsychProfile` یک `apiCaller` تزریق‌شده اجباری می‌گیرد؛ پیاده‌سازی
// واقعی (fetch + ANTHROPIC_API_KEY) باید فقط در main-process Electron
// باشد (هم‌الگوی better-sqlite3 در electron/db/ + IPC در electron/preload.js)
// تا کلید API هرگز به renderer/DevTools درز نکند. رجوع کنید به
// docs/TODO-api-key-security.md برای نقشه‌ی راه کامل IPC.
//
// مدل پیشنهادی (تاییدشده): claude-sonnet-5. env var پیشنهادی: ANTHROPIC_API_KEY
// (این‌ها فقط در پیاده‌سازی واقعی IPC استفاده می‌شوند، نه اینجا).

import { PSYCH_TRAITS } from "./shared/sportRequirementSchema.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

const CLAUDE_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;
const TOOL_NAME = "record_psych_profile";

// طبق بخش ۹.۲ سند: ۷ سناریوی اصلی + یک سناریوی بونوس علاقه‌ی صریح، عیناً
// از سند کپی شده.
const SCENARIOS_FA = [
  "فرض کن تو یه بازی مهم هستی. ترجیح می‌دی خودت تنهایی قهرمان بشی و همه تشویقت کنن، یا با چندتا از دوستای صمیمیت با هم یه تیم بشید و با هم کاپ رو ببرید بالا؟",
  "تو ورزش، بعضیا دوست دارن مثل گلادیاتورها با حریف گلاویز بشن و قدرت‌نمایی کنن، بعضیا هم ترجیح می‌دن یه تور بینشون باشه یا از دور با حریف مسابقه بدن که کسی بهشون نخوره. تو کدوم مدل رو بیشتر حال می‌کنی؟",
  "کدومش برات جذاب‌تره؟ اینکه مثل یه تک‌تیرانداز چند دقیقه نفس رو حبس کنی تا یه شلیک بی‌نقص داشته باشی، یا اینکه یه بند تو زمین بدوی و عرق بریزی و سرعتت رو به رخ بکشی؟",
  "تصور کن دقیقه‌ی ۹۰ بازی، تیمت داره یک پنالتی حیاتی گیرت انداده و همه دارن نگاهت می‌کنن. چه حسی داری، لذت می‌بری از این لحظه یا کاش بازیکن کناری‌ات رو می‌ذاشتی؟",
  "تو یه روز عادی، اگه بذاری انتخاب کنی، ترجیح می‌دی سه ساعت تو یه اتاق آروم پازل بچینی، یا سه ساعت با دوستات تو پارک بدوی و بازی کنی؟",
  "وقتی داری بازی کامپیوتری می‌کنی یا با دوستات مسابقه می‌دی، ترجیح می‌دی همه‌چیز سریع و غیرقابل‌پیش‌بینی باشه و تو صدم‌ثانیه تصمیم بگیری (مثل بازی‌های جنگی)، یا وقت داشته باشی نقشه بکشی و با دقت یه کار رو انجام بدی (مثل شطرنج)؟",
  "اگه تو یه مسابقه‌ی خیلی مهم ببازی، واکنشت چیه؟ زود فراموش می‌کنی و می‌ری سراغ تمرین بعدی، یا تا چند روز اعصابت خورده و تو خودت می‌ری؟",
  "اگه یه غول چراغ جادو بیاد و بگه فردا می‌تونی تو سه تا رشته‌ی ورزشی قهرمان المپیک بشی، بدون اینکه فکر کنی، اون سه تا رو به ترتیب برام بگو!",
];

function buildSystemPrompt() {
  return [
    "شما یک روان‌سنج ورزشی هستید که با نوجوانان ۱۰-۱۷ ساله فارسی‌زبان صحبت می‌کنید.",
    "هدف: استخراج ۷ متغیر روانی از طریق سؤال‌های سناریومحور (نه مستقیم).",
    "",
    "قوانین:",
    "- هرگز مستقیم نپرسید «آیا روحیه‌ی تیمی داری؟»",
    "- ۷ سناریو در ترتیب طبیعی مکالمه‌ای بپرسید",
    "- برای هر پاسخ، نمره ۱-۵ برای متغیر مرتبط استخراج کنید",
    "- در پایان با ابزار record_psych_profile نتیجه را ثبت کنید",
    "",
    "سناریوها (به ترتیب مطرح شوند):",
    ...SCENARIOS_FA.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");
}

// طبق بخش ۹.۳ سند. یک فیلد نسبت به نمونه‌ی سند اضافه شده (تصمیم تاییدشده‌ی
// Commit 9): extracted_confidence — چون type بخش ۹.۴ سند این فیلد را در
// PsychProfile می‌خواهد، اما schema نمونه‌ی بخش ۹.۳ اصلاً از Claude
// نمی‌پرسدش (یک ناهماهنگی داخلی دیگر در سند). به‌جای فرض کردن یک عدد ثابت
// (که یعنی جعل اطمینان)، مستقیم از Claude می‌خواهیم به این استخراج خودش
// چقدر مطمئن است.
function buildToolSchema() {
  const traitProperties = Object.fromEntries(
    PSYCH_TRAITS.map((trait) => [trait, { type: "integer", minimum: 1, maximum: 5 }])
  );

  return {
    name: TOOL_NAME,
    description: "ثبت ۷ نمره‌ی روانی + علاقه‌های صریح از مکالمه",
    input_schema: {
      type: "object",
      properties: {
        ...traitProperties,
        explicit_interests: { type: "array", items: { type: "string" } },
        extracted_confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "چقدر به این استخراج از مکالمه مطمئن هستید",
        },
        reasoning: {
          type: "object",
          description: "توجیه کوتاه برای هر نمره بر اساس پاسخ‌های کاربر",
        },
      },
      required: [...PSYCH_TRAITS, "explicit_interests", "extracted_confidence"],
    },
  };
}

function buildApiRequestPayload(chatConversation) {
  return {
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    messages: chatConversation,
    tools: [buildToolSchema()],
    tool_choice: { type: "tool", name: TOOL_NAME },
  };
}

function parsePsychProfileFromApiResponse(apiResponse, chatConversation) {
  const toolUseBlock = (apiResponse?.content ?? []).find(
    (block) => block.type === "tool_use" && block.name === TOOL_NAME
  );
  if (!toolUseBlock) {
    throw new TalentIdError(
      "PSYCH_EXTRACTION_MALFORMED",
      "پاسخ Claude شامل tool_use برای record_psych_profile نیست.",
      { apiResponse }
    );
  }

  const input = toolUseBlock.input ?? {};
  for (const trait of PSYCH_TRAITS) {
    const value = input[trait];
    if (typeof value !== "number" || value < 1 || value > 5) {
      throw new TalentIdError(
        "PSYCH_EXTRACTION_MALFORMED",
        `مقدار "${trait}" در پاسخ Claude نامعتبر است: "${value}". باید عددی بین ۱ تا ۵ باشد.`,
        { trait, value }
      );
    }
  }
  if (!Array.isArray(input.explicit_interests)) {
    throw new TalentIdError(
      "PSYCH_EXTRACTION_MALFORMED",
      "explicit_interests در پاسخ Claude باید آرایه باشد.",
      { input }
    );
  }

  const profile = {};
  for (const trait of PSYCH_TRAITS) profile[trait] = input[trait];

  return {
    ...profile,
    explicit_interests: input.explicit_interests,
    extracted_confidence: typeof input.extracted_confidence === "number" ? input.extracted_confidence : 0.5,
    reasoning: input.reasoning ?? {},
    raw_conversation: JSON.stringify(chatConversation ?? []),
  };
}

// طبق بخش ۹.۵ سند.
function defaultNeutralProfile() {
  const neutralProfile = {};
  for (const trait of PSYCH_TRAITS) neutralProfile[trait] = 3;

  return {
    ...neutralProfile,
    explicit_interests: [],
    extracted_confidence: 0,
    reasoning: {},
    raw_conversation: null,
    warning: "psych_module_skipped",
    weight_reduction: true,
  };
}

async function extractPsychProfile(chatConversation, { apiCaller } = {}) {
  if (!chatConversation) {
    return defaultNeutralProfile();
  }
  if (typeof apiCaller !== "function") {
    throw new TalentIdError(
      "MISSING_API_CALLER",
      "apiCaller باید یک تابع باشد؛ engine/talentId هرگز خودش مستقیم API صدا نمی‌زند (طبق بخش ۱.۴ سند و docs/TODO-api-key-security.md).",
      {}
    );
  }

  const payload = buildApiRequestPayload(chatConversation);
  const response = await apiCaller(payload);
  return parsePsychProfileFromApiResponse(response, chatConversation);
}

export {
  extractPsychProfile,
  buildSystemPrompt,
  buildToolSchema,
  buildApiRequestPayload,
  parsePsychProfileFromApiResponse,
  defaultNeutralProfile,
  CLAUDE_MODEL,
  SCENARIOS_FA,
};
