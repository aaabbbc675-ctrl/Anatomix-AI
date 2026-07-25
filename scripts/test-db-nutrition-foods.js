// اسکریپت تست مستقل (بدون Electron) برای جدول Foods + foodsRepository +
// foods.seed.js — هم‌الگوی scripts/test-db.js، مستقیم روی better-sqlite3.
// اجرا: node scripts/test-db-nutrition-foods.js
//
// electron/db/ همچنان CommonJS است؛ فقط engine/nutrition/data/foods.seed.js
// ESM است (engine/package.json) و باید با dynamic import() بارگذاری شود.

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

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message || "deep-equal mismatch"} — actual: ${a}, expected: ${e}`);
  }
}

function expectThrow(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message || "expected function to throw, but it did not");
}

(async () => {
  const { FOODS, seedFoods } = await import("../engine/nutrition/data/foods.seed.js");

  const dbPath = path.join(os.tmpdir(), `anatomix-test-nutrition-foods-${Date.now()}.db`);
  console.log(`[test-db-nutrition-foods] using temp database: ${dbPath}`);

  const db = openDatabase(dbPath);
  const foods = createFoodsRepository(db);

  console.log("\n[create + round-trip]");

  let chickenId;
  check("insert a food succeeds and numeric/enum fields round-trip", () => {
    const chicken = foods.create({
      name_fa: "سینه مرغ کبابی تست",
      name_en: "Test chicken breast",
      category: "poultry",
      primary_macro: "protein",
      calories: 165,
      protein_g: 31,
      carbs_g: 0,
      net_carbs_g: 0,
      fat_g: 3.6,
      fiber_g: 0,
      digestion_rate: "slow",
      post_workout_approved: true,
      satiety_index: "high",
      is_vegan: false,
      is_vegetarian: false,
      gluten_free: true,
      lactose_free: true,
      diabetic_friendly: true,
      cost_tier: "economic",
      exchange_group: "lean_meat",
      exchange_serving_grams: 23,
      protein_quality: "complete",
      allergens: [],
    });
    chickenId = chicken.id;
    assert(chicken.name_fa === "سینه مرغ کبابی تست", "name_fa mismatch");
    assert(chicken.primary_macro === "protein", "primary_macro mismatch");
    assert(chicken.exchange_group === "lean_meat", "exchange_group mismatch");
    assert(chicken.exchange_serving_grams === 23, "exchange_serving_grams mismatch");
    assert(chicken.post_workout_approved === 1, "post_workout_approved should round-trip as 1");
    assert(chicken.is_vegan === 0, "is_vegan should round-trip as 0");
    assert(chicken.is_active === 1, "is_active should default to 1");
    assertDeepEqual(chicken.allergens, [], "allergens should default/round-trip as []");
  });

  check("boolean fields default to 0 when omitted", () => {
    const minimal = foods.create({
      name_fa: "غذای حداقلی تست",
      primary_macro: "carb",
      calories: 100,
      protein_g: 1,
      carbs_g: 20,
      fat_g: 0,
    });
    assert(minimal.is_vegan === 0, "is_vegan should default to 0");
    assert(minimal.pre_workout_approved === 0, "pre_workout_approved should default to 0");
    assert(minimal.exchange_group === null, "exchange_group should default to null when omitted");
  });

  console.log("\n[CHECK constraints]");

  check("primary_macro نامعتبر رد می‌شود (CHECK constraint)", () => {
    expectThrow(() => {
      foods.create({
        name_fa: "غذای نامعتبر",
        primary_macro: "not_a_macro",
        calories: 100,
        protein_g: 1,
        carbs_g: 1,
        fat_g: 1,
      });
    }, "expected CHECK constraint violation on primary_macro");
  });

  check("exchange_group نامعتبر رد می‌شود (CHECK constraint)", () => {
    expectThrow(() => {
      foods.create({
        name_fa: "غذای نامعتبر ۲",
        primary_macro: "carb",
        calories: 100,
        protein_g: 1,
        carbs_g: 1,
        fat_g: 1,
        exchange_group: "keto_snack",
      });
    }, "expected CHECK constraint violation on exchange_group");
  });

  check("cost_tier نامعتبر رد می‌شود (CHECK constraint)", () => {
    expectThrow(() => {
      foods.create({
        name_fa: "غذای نامعتبر ۳",
        primary_macro: "carb",
        calories: 100,
        protein_g: 1,
        carbs_g: 1,
        fat_g: 1,
        cost_tier: "luxury",
      });
    }, "expected CHECK constraint violation on cost_tier");
  });

  console.log("\n[getById / search / getByExchangeGroup]");

  check("getById returns the exact inserted row", () => {
    const found = foods.getById(chickenId);
    assert(found !== null, "expected to find the food by id");
    assert(found.name_fa === "سینه مرغ کبابی تست", "name_fa mismatch on getById");
  });

  check("search finds food by partial name (fa)", () => {
    const results = foods.search("سینه مرغ کبابی تست");
    assert(results.length === 1 && results[0].id === chickenId, "search did not find the expected food");
  });

  check("getByExchangeGroup only returns active foods from that group", () => {
    const leanMeats = foods.getByExchangeGroup("lean_meat");
    assert(
      leanMeats.some((f) => f.id === chickenId),
      "expected the test chicken to appear in lean_meat group"
    );
    assert(
      leanMeats.every((f) => f.exchange_group === "lean_meat"),
      "getByExchangeGroup leaked a food from another group"
    );
  });

  console.log("\n[update + allergens_json round-trip]");

  check("update changes fields and allergens array round-trips", () => {
    const updated = foods.update(chickenId, { calories: 170, allergens: ["soy"] });
    assert(updated.calories === 170, "calories should be updated");
    assertDeepEqual(updated.allergens, ["soy"], "allergens should round-trip as updated array");
    assert(updated.name_fa === "سینه مرغ کبابی تست", "untouched fields should be preserved on partial update");
  });

  console.log("\n[is_active soft-disable — طبق تصمیم صریح: بدون حذف تاریخچه]");

  check("setting is_active=false via update soft-disables without deleting the row", () => {
    const disabled = foods.update(chickenId, { is_active: false });
    assert(disabled.is_active === 0, "is_active should be 0 after soft-disable");
    const stillThere = foods.getById(chickenId);
    assert(stillThere !== null, "row must still exist after soft-disable (no hard delete)");
    const activeLeanMeats = foods.getByExchangeGroup("lean_meat");
    assert(
      !activeLeanMeats.some((f) => f.id === chickenId),
      "soft-disabled food must not appear in getByExchangeGroup (is_active filter)"
    );
  });

  console.log("\n[remove — hard delete]");

  check("remove actually deletes the row", () => {
    foods.remove(chickenId);
    assert(foods.getById(chickenId) === null, "food row should be gone after remove");
  });

  console.log("\n[foods.seed.js]");

  check("seedFoods populates the Foods table with every FOODS record", () => {
    const seeded = seedFoods(foods);
    assert(seeded.length === FOODS.length, `expected ${FOODS.length} seeded foods, got ${seeded.length}`);
    const rice = foods.getById("RICE-WHITE-COOKED");
    assert(rice !== null, "expected RICE-WHITE-COOKED to be seeded");
    assert(rice.exchange_group === "starch", "seeded rice should be in the starch exchange group");
  });

  check("every FOODS record declares a valid exchange_group (no invented enum values)", () => {
    const validGroups = [
      "starch",
      "fruit",
      "milk",
      "non_starchy_vegetable",
      "lean_meat",
      "medium_high_fat_meat",
      "fat",
      "free",
    ];
    for (const food of FOODS) {
      assert(validGroups.includes(food.exchange_group), `${food.id} has invalid exchange_group: ${food.exchange_group}`);
    }
  });

  db.close();
  fs.rmSync(dbPath, { force: true });

  console.log(`\n[test-db-nutrition-foods] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
