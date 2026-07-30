// اسکریپت تست مستقل برای engine/talentId/file8_psychProfileExtractor.js.
// اجرا: node scripts/test-engine-talentid-file8-psych.js
//
// ⚠️ هیچ‌کدام از این تست‌ها به Claude API واقعی وصل نمی‌شوند — همه‌جا از
// apiCaller جعلی (fake) استفاده می‌شود. رجوع کنید به
// docs/TODO-api-key-security.md.
let passCount = 0;
let failCount = 0;

function check(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${description}`);
    console.log(`     ${err.message}`);
    failCount++;
  }
}

async function checkAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${description}`);
    console.log(`     ${err.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

async function assertThrowsWithCode(fn, expectedCode, description) {
  try {
    await fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (err.code !== expectedCode) {
      throw new Error(`${description || "code نامنتظره"} — انتظار "${expectedCode}", گرفتیم "${err.code}"`);
    }
  }
}

function validToolInput(overrides = {}) {
  return {
    teamwork_score: 4,
    aggression_contact: 2,
    focus_patience: 3,
    pressure_tolerance: 4,
    dynamic_activity: 5,
    chaos_decision: 4,
    resilience: 5,
    explicit_interests: ["swimming", "basketball"],
    extracted_confidence: 0.85,
    reasoning: { teamwork_score: "کاربر اشاره به تیم کرد" },
    ...overrides,
  };
}

function fakeApiCaller(toolInput) {
  return async (_payload) => ({
    content: [{ type: "tool_use", name: "record_psych_profile", input: toolInput }],
  });
}

(async () => {
  const {
    extractPsychProfile,
    buildSystemPrompt,
    buildToolSchema,
    buildApiRequestPayload,
    parsePsychProfileFromApiResponse,
    defaultNeutralProfile,
    SCENARIOS_FA,
  } = await import("../engine/talentId/file8_psychProfileExtractor.js");
  const { PSYCH_TRAITS } = await import("../engine/talentId/shared/sportRequirementSchema.js");

  console.log("\n[buildSystemPrompt / buildToolSchema — Pure]");
  check("system prompt شامل هر ۸ سناریو است", () => {
    const prompt = buildSystemPrompt();
    for (const scenario of SCENARIOS_FA) {
      assert(prompt.includes(scenario), `سناریو در پرامپت نیست: ${scenario.slice(0, 20)}...`);
    }
  });

  check("tool schema شامل هر ۷ trait + explicit_interests + extracted_confidence در required است", () => {
    const schema = buildToolSchema();
    for (const trait of PSYCH_TRAITS) {
      assert(schema.input_schema.properties[trait], `trait "${trait}" در schema نیست`);
      assert(schema.input_schema.required.includes(trait), `trait "${trait}" در required نیست`);
    }
    assert(schema.input_schema.required.includes("explicit_interests"), "explicit_interests باید required باشد");
    assert(schema.input_schema.required.includes("extracted_confidence"), "extracted_confidence باید required باشد");
  });

  check("buildApiRequestPayload مدل/ابزار/tool_choice را درست اسمبل می‌کند", () => {
    const payload = buildApiRequestPayload([{ role: "user", content: "سلام" }]);
    assert(payload.model === "claude-sonnet-5", "model نادرست");
    assert(payload.tools.length === 1 && payload.tools[0].name === "record_psych_profile", "tools نادرست");
    assert(payload.tool_choice.name === "record_psych_profile", "tool_choice نادرست");
  });

  console.log("\n[parsePsychProfileFromApiResponse — Pure]");
  check("پاسخ معتبر → PsychProfile درست parse می‌شود", () => {
    const response = { content: [{ type: "tool_use", name: "record_psych_profile", input: validToolInput() }] };
    const profile = parsePsychProfileFromApiResponse(response, []);
    assert(profile.teamwork_score === 4, "teamwork_score نادرست");
    assert(profile.explicit_interests.length === 2, "explicit_interests نادرست");
    assert(profile.extracted_confidence === 0.85, "extracted_confidence نادرست");
  });

  check("پاسخ بدون tool_use → throw PSYCH_EXTRACTION_MALFORMED", () => {
    try {
      parsePsychProfileFromApiResponse({ content: [{ type: "text", text: "..." }] }, []);
      throw new Error("باید throw می‌شد");
    } catch (err) {
      assert(err.code === "PSYCH_EXTRACTION_MALFORMED", `code نادرست: ${err.code}`);
    }
  });

  check("trait خارج از بازه‌ی ۱-۵ → throw PSYCH_EXTRACTION_MALFORMED", () => {
    const response = {
      content: [{ type: "tool_use", name: "record_psych_profile", input: validToolInput({ resilience: 9 }) }],
    };
    try {
      parsePsychProfileFromApiResponse(response, []);
      throw new Error("باید throw می‌شد");
    } catch (err) {
      assert(err.code === "PSYCH_EXTRACTION_MALFORMED", `code نادرست: ${err.code}`);
    }
  });

  check("explicit_interests غیرآرایه → throw PSYCH_EXTRACTION_MALFORMED", () => {
    const response = {
      content: [
        { type: "tool_use", name: "record_psych_profile", input: validToolInput({ explicit_interests: "swimming" }) },
      ],
    };
    try {
      parsePsychProfileFromApiResponse(response, []);
      throw new Error("باید throw می‌شد");
    } catch (err) {
      assert(err.code === "PSYCH_EXTRACTION_MALFORMED", `code نادرست: ${err.code}`);
    }
  });

  console.log("\n[defaultNeutralProfile — بخش ۹.۵ سند]");
  check("همه‌ی traitها=۳، confidence=۰، warning و weight_reduction درست", () => {
    const profile = defaultNeutralProfile();
    for (const trait of PSYCH_TRAITS) {
      assert(profile[trait] === 3, `${trait} باید ۳ باشد`);
    }
    assert(profile.extracted_confidence === 0, "extracted_confidence باید ۰ باشد");
    assert(profile.warning === "psych_module_skipped", "warning نادرست");
    assert(profile.weight_reduction === true, "weight_reduction باید true باشد");
  });

  console.log("\n[extractPsychProfile — orchestrator با DI]");
  await checkAsync("چت‌بات غایب (null) → defaultNeutralProfile بدون نیاز به apiCaller", async () => {
    const profile = await extractPsychProfile(null);
    assert(profile.warning === "psych_module_skipped", "باید fallback باشد");
  });

  await checkAsync("چت‌بات موجود ولی apiCaller غایب → throw MISSING_API_CALLER", async () => {
    await assertThrowsWithCode(
      () => extractPsychProfile([{ role: "user", content: "سلام" }]),
      "MISSING_API_CALLER"
    );
  });

  await checkAsync("چت‌بات + apiCaller جعلی معتبر → مسیر کامل کار می‌کند", async () => {
    const profile = await extractPsychProfile([{ role: "user", content: "سلام" }], {
      apiCaller: fakeApiCaller(validToolInput()),
    });
    assert(profile.teamwork_score === 4, "teamwork_score نادرست");
    assert(profile.raw_conversation != null, "raw_conversation باید ذخیره شود");
  });

  await checkAsync("apiCaller جعلی پاسخ خراب می‌دهد → خطای parse propagate می‌شود", async () => {
    await assertThrowsWithCode(
      () =>
        extractPsychProfile([{ role: "user", content: "سلام" }], {
          apiCaller: fakeApiCaller(validToolInput({ teamwork_score: 100 })),
        }),
      "PSYCH_EXTRACTION_MALFORMED"
    );
  });

  console.log(`\n[test-engine-talentid-file8-psych] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
