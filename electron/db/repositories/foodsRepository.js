const { randomUUID } = require("crypto");

// طبق بخش ۲.۸ سند معماری موتور تغذیه: allergens_json هم‌الگوی device_json_ref
// در studentsRepository.js — یک آرایه‌ی JSON، نه جدول جدا.
function deserialize(row) {
  return {
    ...row,
    allergens: row.allergens_json ? JSON.parse(row.allergens_json) : [],
  };
}

function toBit(value) {
  return value ? 1 : 0;
}

function createFoodsRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO Foods (
      id, name_fa, name_en, category, primary_macro,
      calories, protein_g, carbs_g, net_carbs_g, fat_g, fiber_g, sugar_g, saturated_fat_g, sodium_mg,
      common_unit_name, common_unit_grams,
      digestion_rate, pre_workout_approved, post_workout_approved, pre_sleep_approved, satiety_index,
      is_vegan, is_vegetarian, gluten_free, lactose_free, diabetic_friendly, cost_tier,
      exchange_group, exchange_serving_grams,
      protein_quality, allergens_json, is_active,
      created_at, updated_at
    ) VALUES (
      @id, @name_fa, @name_en, @category, @primary_macro,
      @calories, @protein_g, @carbs_g, @net_carbs_g, @fat_g, @fiber_g, @sugar_g, @saturated_fat_g, @sodium_mg,
      @common_unit_name, @common_unit_grams,
      @digestion_rate, @pre_workout_approved, @post_workout_approved, @pre_sleep_approved, @satiety_index,
      @is_vegan, @is_vegetarian, @gluten_free, @lactose_free, @diabetic_friendly, @cost_tier,
      @exchange_group, @exchange_serving_grams,
      @protein_quality, @allergens_json, @is_active,
      @created_at, @updated_at
    )
  `);
  const getAllStmt = db.prepare(`SELECT * FROM Foods ORDER BY name_fa ASC`);
  const getByIdStmt = db.prepare(`SELECT * FROM Foods WHERE id = ?`);
  const searchStmt = db.prepare(`
    SELECT * FROM Foods
    WHERE name_fa LIKE @query OR name_en LIKE @query
    ORDER BY name_fa ASC
  `);
  const getByExchangeGroupStmt = db.prepare(`
    SELECT * FROM Foods WHERE exchange_group = ? AND is_active = 1 ORDER BY name_fa ASC
  `);
  const updateStmt = db.prepare(`
    UPDATE Foods SET
      name_fa = @name_fa, name_en = @name_en, category = @category, primary_macro = @primary_macro,
      calories = @calories, protein_g = @protein_g, carbs_g = @carbs_g, net_carbs_g = @net_carbs_g,
      fat_g = @fat_g, fiber_g = @fiber_g, sugar_g = @sugar_g, saturated_fat_g = @saturated_fat_g, sodium_mg = @sodium_mg,
      common_unit_name = @common_unit_name, common_unit_grams = @common_unit_grams,
      digestion_rate = @digestion_rate, pre_workout_approved = @pre_workout_approved,
      post_workout_approved = @post_workout_approved, pre_sleep_approved = @pre_sleep_approved, satiety_index = @satiety_index,
      is_vegan = @is_vegan, is_vegetarian = @is_vegetarian, gluten_free = @gluten_free,
      lactose_free = @lactose_free, diabetic_friendly = @diabetic_friendly, cost_tier = @cost_tier,
      exchange_group = @exchange_group, exchange_serving_grams = @exchange_serving_grams,
      protein_quality = @protein_quality, allergens_json = @allergens_json, is_active = @is_active,
      updated_at = @updated_at
    WHERE id = @id
  `);
  const removeStmt = db.prepare(`DELETE FROM Foods WHERE id = ?`);

  const repo = {
    create(input) {
      const now = new Date().toISOString();
      const row = {
        // برخلاف Students/Programs (رکورد تراکنشی)، Foods یک بانک محتوا است
        // (هم‌الگوی exercises.seed.js با id ثابت مثل "SQ-BB") — پس اگر
        // ورودی id مشخص داده باشد (مثل foods.seed.js)، همان حفظ می‌شود.
        id: input.id ?? randomUUID(),
        name_fa: input.name_fa,
        name_en: input.name_en ?? null,
        category: input.category ?? null,
        primary_macro: input.primary_macro,
        calories: input.calories,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        net_carbs_g: input.net_carbs_g ?? null,
        fat_g: input.fat_g,
        fiber_g: input.fiber_g ?? null,
        sugar_g: input.sugar_g ?? null,
        saturated_fat_g: input.saturated_fat_g ?? null,
        sodium_mg: input.sodium_mg ?? null,
        common_unit_name: input.common_unit_name ?? null,
        common_unit_grams: input.common_unit_grams ?? null,
        digestion_rate: input.digestion_rate ?? null,
        pre_workout_approved: toBit(input.pre_workout_approved),
        post_workout_approved: toBit(input.post_workout_approved),
        pre_sleep_approved: toBit(input.pre_sleep_approved),
        satiety_index: input.satiety_index ?? null,
        is_vegan: toBit(input.is_vegan),
        is_vegetarian: toBit(input.is_vegetarian),
        gluten_free: toBit(input.gluten_free),
        lactose_free: toBit(input.lactose_free),
        diabetic_friendly: toBit(input.diabetic_friendly),
        cost_tier: input.cost_tier ?? null,
        exchange_group: input.exchange_group ?? null,
        exchange_serving_grams: input.exchange_serving_grams ?? null,
        protein_quality: input.protein_quality ?? null,
        allergens_json: JSON.stringify(input.allergens ?? []),
        is_active: input.is_active === undefined ? 1 : toBit(input.is_active),
        created_at: now,
        updated_at: now,
      };
      insertStmt.run(row);
      return repo.getById(row.id);
    },
    getAll() {
      return getAllStmt.all().map(deserialize);
    },
    getById(id) {
      const row = getByIdStmt.get(id);
      return row ? deserialize(row) : null;
    },
    search(query) {
      return searchStmt.all({ query: `%${query}%` }).map(deserialize);
    },
    getByExchangeGroup(exchangeGroup) {
      return getByExchangeGroupStmt.all(exchangeGroup).map(deserialize);
    },
    update(id, input) {
      const existing = getByIdStmt.get(id);
      if (!existing) throw new Error(`Food ${id} not found`);
      const row = {
        id,
        name_fa: input.name_fa ?? existing.name_fa,
        name_en: input.name_en !== undefined ? input.name_en : existing.name_en,
        category: input.category !== undefined ? input.category : existing.category,
        primary_macro: input.primary_macro ?? existing.primary_macro,
        calories: input.calories ?? existing.calories,
        protein_g: input.protein_g ?? existing.protein_g,
        carbs_g: input.carbs_g ?? existing.carbs_g,
        net_carbs_g: input.net_carbs_g !== undefined ? input.net_carbs_g : existing.net_carbs_g,
        fat_g: input.fat_g ?? existing.fat_g,
        fiber_g: input.fiber_g !== undefined ? input.fiber_g : existing.fiber_g,
        sugar_g: input.sugar_g !== undefined ? input.sugar_g : existing.sugar_g,
        saturated_fat_g: input.saturated_fat_g !== undefined ? input.saturated_fat_g : existing.saturated_fat_g,
        sodium_mg: input.sodium_mg !== undefined ? input.sodium_mg : existing.sodium_mg,
        common_unit_name: input.common_unit_name !== undefined ? input.common_unit_name : existing.common_unit_name,
        common_unit_grams: input.common_unit_grams !== undefined ? input.common_unit_grams : existing.common_unit_grams,
        digestion_rate: input.digestion_rate !== undefined ? input.digestion_rate : existing.digestion_rate,
        pre_workout_approved: input.pre_workout_approved !== undefined ? toBit(input.pre_workout_approved) : existing.pre_workout_approved,
        post_workout_approved: input.post_workout_approved !== undefined ? toBit(input.post_workout_approved) : existing.post_workout_approved,
        pre_sleep_approved: input.pre_sleep_approved !== undefined ? toBit(input.pre_sleep_approved) : existing.pre_sleep_approved,
        satiety_index: input.satiety_index !== undefined ? input.satiety_index : existing.satiety_index,
        is_vegan: input.is_vegan !== undefined ? toBit(input.is_vegan) : existing.is_vegan,
        is_vegetarian: input.is_vegetarian !== undefined ? toBit(input.is_vegetarian) : existing.is_vegetarian,
        gluten_free: input.gluten_free !== undefined ? toBit(input.gluten_free) : existing.gluten_free,
        lactose_free: input.lactose_free !== undefined ? toBit(input.lactose_free) : existing.lactose_free,
        diabetic_friendly: input.diabetic_friendly !== undefined ? toBit(input.diabetic_friendly) : existing.diabetic_friendly,
        cost_tier: input.cost_tier !== undefined ? input.cost_tier : existing.cost_tier,
        exchange_group: input.exchange_group !== undefined ? input.exchange_group : existing.exchange_group,
        exchange_serving_grams: input.exchange_serving_grams !== undefined ? input.exchange_serving_grams : existing.exchange_serving_grams,
        protein_quality: input.protein_quality !== undefined ? input.protein_quality : existing.protein_quality,
        allergens_json: input.allergens !== undefined ? JSON.stringify(input.allergens) : existing.allergens_json,
        is_active: input.is_active !== undefined ? toBit(input.is_active) : existing.is_active,
        updated_at: new Date().toISOString(),
      };
      updateStmt.run(row);
      return repo.getById(id);
    },
    remove(id) {
      removeStmt.run(id);
    },
  };

  return repo;
}

module.exports = { createFoodsRepository };
