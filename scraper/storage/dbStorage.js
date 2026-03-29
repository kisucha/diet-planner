// storage/dbStorage.js
// 목적: 파싱된 레시피 데이터를 MariaDB에 저장
// 중복 방지: source_url 기준 UPSERT 처리

'use strict';

const db     = require('../db');
const logger = require('../utils/logger');

/**
 * 레시피 DB 저장 (중복이면 업데이트, 신규면 삽입)
 * @param {Object} recipe      - recipeParser 결과 객체
 * @param {string} localImage  - 로컬 저장 이미지 경로 (없으면 null)
 * @returns {Promise<{id: number, isNew: boolean}|null>}
 */
async function saveRecipe(recipe, localImage) {
    try {
        // 중복 확인 (source_url 기준)
        const existing = await db.query(
            'SELECT id FROM recipes WHERE source_url = ? LIMIT 1',
            [recipe.sourceUrl]
        );

        let recipeId;
        let isNew = false;

        if (existing.length > 0) {
            // 기존 레코드 업데이트
            recipeId = existing[0].id;
            await db.query(`
                UPDATE recipes SET
                    name            = ?,
                    instructions    = ?,
                    image_url       = ?,
                    image_local_path = ?,
                    step_image_urls = ?,
                    cook_time       = ?,
                    servings        = ?,
                    difficulty      = ?,
                    food_category   = ?,
                    dish_type       = ?,
                    cuisine_origin  = ?,
                    source_site     = ?,
                    is_auto_fetched = 1,
                    scraped_at      = NOW(),
                    updated_at      = NOW()
                WHERE id = ?
            `, [
                recipe.name,
                recipe.instructions,
                recipe.imageUrl,
                localImage,
                recipe.stepImageUrls,
                recipe.cookTime,
                recipe.servings,
                recipe.difficulty,
                recipe.foodCategory,
                recipe.dishType,
                recipe.cuisineOrigin,
                recipe.sourceSite,
                recipeId,
            ]);
        } else {
            // 신규 삽입
            const result = await db.query(`
                INSERT INTO recipes (
                    name, instructions, image_url, image_local_path,
                    step_image_urls, cook_time, servings, difficulty,
                    food_category, dish_type, cuisine_origin,
                    source_url, source_site, is_auto_fetched, scraped_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
            `, [
                recipe.name,
                recipe.instructions,
                recipe.imageUrl,
                localImage,
                recipe.stepImageUrls,
                recipe.cookTime,
                recipe.servings,
                recipe.difficulty,
                recipe.foodCategory,
                recipe.dishType,
                recipe.cuisineOrigin,
                recipe.sourceUrl,
                recipe.sourceSite,
            ]);
            recipeId = result.insertId;
            isNew = true;
        }

        // 재료 저장 (기존 데이터 삭제 후 재삽입)
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            await saveIngredients(recipeId, recipe.ingredients);
        }

        return { id: recipeId, isNew };

    } catch (err) {
        logger.error(`레시피 저장 실패 (${recipe.name}): ${err.message}`);
        return null;
    }
}

/**
 * 레시피 재료 저장
 * @param {number} recipeId
 * @param {Array}  ingredients
 */
async function saveIngredients(recipeId, ingredients) {
    // 기존 재료 삭제
    await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);

    // 재료 일괄 삽입
    for (const ing of ingredients) {
        await db.query(`
            INSERT INTO recipe_ingredients
                (recipe_id, ingredient_name, quantity, unit, ingredient_type, original_text, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            recipeId,
            ing.ingredientName,
            ing.quantity,
            ing.unit,
            ing.ingredientType,
            ing.originalText,
            ing.sortOrder,
        ]);
    }
}

/**
 * 오늘 진행 상태 조회 또는 신규 생성
 * @returns {Promise<Object>} scrape_progress 행
 */
async function getTodayProgress() {
    const today = new Date().toISOString().slice(0, 10);
    const rows  = await db.query(
        'SELECT * FROM scrape_progress WHERE run_date = ? LIMIT 1',
        [today]
    );

    if (rows.length > 0) return rows[0];

    // 신규 생성
    await db.query(`
        INSERT INTO scrape_progress (run_date, status, last_page, last_category)
        VALUES (?, 'running', 1, 'all')
    `, [today]);

    const newRow = await db.query(
        'SELECT * FROM scrape_progress WHERE run_date = ? LIMIT 1',
        [today]
    );
    return newRow[0];
}

/**
 * 진행 상태 업데이트
 * @param {string} today       - YYYY-MM-DD
 * @param {Object} updates     - 업데이트할 필드들
 */
async function updateProgress(today, updates) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), today];
    await db.query(
        `UPDATE scrape_progress SET ${fields} WHERE run_date = ?`,
        values
    );
}

/**
 * 레시피 ID가 이미 수집됐는지 확인 (source_url 기준)
 * @param {string} recipeId - 만개의 레시피 ID
 * @returns {Promise<boolean>}
 */
async function isAlreadyScraped(recipeId) {
    const url  = `https://www.10000recipe.com/recipe/${recipeId}`;
    const rows = await db.query(
        'SELECT id FROM recipes WHERE source_url = ? LIMIT 1',
        [url]
    );
    return rows.length > 0;
}

module.exports = { saveRecipe, getTodayProgress, updateProgress, isAlreadyScraped };
