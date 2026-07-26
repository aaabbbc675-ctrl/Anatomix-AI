// اسکریپت تست مستقل (با DB واقعی) برای getSameGroupCandidates در فایل ۷.
// اجرا: npx cross-env ELECTRON_RUN_AS_NODE=1 electron scripts/test-db-nutrition-smartswap.js
// (هم‌الگوی scripts/test-db-nutrition-foods.js در batch ۱ — better-sqlite3
// فقط زیر ABI الکترون کار می‌کند، نه node ساده؛ به همین دلیل این تست از
// test-engine-nutrition-file7-smartswap.js جداست.)

const fs = require("fs");
const os = require("os");
const path = require("path");

const { openDatabase } = require("../electron/db/connection");
const { createFoodsRepository } = require("../electron/db/repositories/foodsRepository");

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

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

(async () => {
  const { seedFoods } = await import("../engine/nutrition/data/foods.seed.js");
  const { getSameGroupCandidates } = await import("../engine/nutrition/file7_smartSwap.js");

  const dbPath = path.join(os.tmpdir(), `anatomix-test-nutrition-smartswap-${Date.now()}.db`);
  console.log(`[test-db-nutrition-smartswap] using temp database: ${dbPath}`);

  const db = openDatabase(dbPath);
  const foods = createFoodsRepository(db);
  seedFoods(foods);

  console.log("\n[getSameGroupCandidates — کوئری واقعی روی Foods]");
  check("RICE-WHITE-COOKED (starch) → کاندیدها فقط از گروه starch‌اند، خودش در لیست نیست", () => {
    const { old_food, candidates } = getSameGroupCandidates(foods, "RICE-WHITE-COOKED");
    assert(old_food.id === "RICE-WHITE-COOKED");
    assert(old_food.exchange_group === "starch");
    assert(candidates.length > 0, "انتظار حداقل یک کاندید دیگر در گروه starch داشتیم");
    assert(
      candidates.every((f) => f.exchange_group === "starch"),
      `همه‌ی کاندیدها باید starch باشند، گرفتیم: ${JSON.stringify(candidates.map((f) => f.exchange_group))}`
    );
    assert(
      !candidates.some((f) => f.id === "RICE-WHITE-COOKED"),
      "خودِ غذای اصلی نباید در فهرست کاندیدها باشد"
    );
    assert(
      candidates.some((f) => f.id === "POTATO-BOILED"),
      "POTATO-BOILED باید در کاندیدهای starch باشد"
    );
    assert(
      candidates.some((f) => f.id === "LENTILS-COOKED"),
      "LENTILS-COOKED هم starch است، باید در کاندیدها باشد"
    );
  });

  check("id نامعتبر → throw صریح", () => {
    let threw = false;
    try {
      getSameGroupCandidates(foods, "NOT-A-REAL-FOOD-ID");
    } catch (err) {
      threw = true;
      assert(err.message.includes("پیدا نشد"));
    }
    assert(threw, "انتظار throw داشتیم");
  });

  check("غذای soft-disable شده در کاندیدها ظاهر نمی‌شود (is_active از foodsRepository به ارث می‌رسد)", () => {
    // POTATO-BOILED را غیرفعال می‌کنیم و می‌بینیم دیگر در کاندیدهای RICE نیست.
    foods.update("POTATO-BOILED", { is_active: false });
    const { candidates } = getSameGroupCandidates(foods, "RICE-WHITE-COOKED");
    assert(
      !candidates.some((f) => f.id === "POTATO-BOILED"),
      "غذای غیرفعال نباید به‌عنوان کاندید پیشنهاد شود"
    );
  });

  db.close();
  fs.rmSync(dbPath, { force: true });

  console.log(`\n[test-db-nutrition-smartswap] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
