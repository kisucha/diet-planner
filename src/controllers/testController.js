// controllers/testController.js
// 목적: 스크래핑 데이터 확인용 테스트 페이지 컨트롤러
// 주의: mariadb 패키지 사용 - conn.query() 결과가 rows 배열을 직접 반환

'use strict';

const { pool } = require('../models/db');

// 카테고리 한국어 매핑
const CATEGORY_LABELS = {
    food_category: {
        main_dish: '메인요리',
        side_dish: '반찬',
        special:   '야식/별식',
    },
    dish_type: {
        korean_dish:   '한식 일반',
        korean_tang:   '탕/찜',
        korean_jjigae: '찌개/전골',
        korean_guk:    '국/면',
        foreign:       '외국요리',
        side:          '반찬류',
        special:       '야식/별식',
    }
};

/**
 * 메인 페이지 - 카테고리 목록 + 통계
 */
async function getMain(req, res) {
    let conn;
    try {
        conn = await pool.getConnection();

        // 전체 통계 (mariadb: query 결과는 rows 배열 직접 반환)
        const statsRows = await conn.query(`
            SELECT
                COUNT(*)                              AS total,
                SUM(image_local_path IS NOT NULL)     AS with_image,
                SUM(is_auto_fetched = 1)              AS auto_fetched
            FROM recipes
        `);
        const stats = statsRows[0];

        // dish_type별 카운트
        const categories = await conn.query(`
            SELECT
                food_category,
                dish_type,
                COUNT(*) AS cnt
            FROM recipes
            GROUP BY food_category, dish_type
            ORDER BY food_category, dish_type
        `);

        // 라벨 붙이기
        const categoriesWithLabel = categories.map(row => ({
            food_category:       row.food_category,
            dish_type:           row.dish_type,
            cnt:                 Number(row.cnt),
            food_category_label: CATEGORY_LABELS.food_category[row.food_category] || row.food_category,
            dish_type_label:     CATEGORY_LABELS.dish_type[row.dish_type]          || row.dish_type,
        }));

        res.render('test/index', {
            stats: {
                total:       Number(stats.total       || 0),
                with_image:  Number(stats.with_image  || 0),
                auto_fetched: Number(stats.auto_fetched || 0),
            },
            categories: categoriesWithLabel,
        });
    } catch (err) {
        console.error('testController.getMain error:', err);
        res.status(500).send(`DB 오류: ${err.message}`);
    } finally {
        if (conn) conn.end();
    }
}

/**
 * 레시피 목록 API (커서 기반 페이징)
 * GET /test/api/recipes?dish_type=&cursor=&limit=24
 */
async function getRecipeList(req, res) {
    let conn;
    try {
        conn = await pool.getConnection();

        const dishType = req.query.dish_type || null;
        const cursor   = parseInt(req.query.cursor || '0');
        const limit    = Math.min(parseInt(req.query.limit || '24'), 60);
        const search   = req.query.search || '';

        const params = [];
        let where = 'WHERE 1=1';

        if (dishType) {
            where += ' AND r.dish_type = ?';
            params.push(dishType);
        }
        if (cursor > 0) {
            where += ' AND r.id < ?';
            params.push(cursor);
        }
        if (search) {
            where += ' AND r.name LIKE ?';
            params.push(`%${search}%`);
        }

        params.push(limit + 1);

        const rows = await conn.query(`
            SELECT
                r.id,
                r.name,
                r.dish_type,
                r.food_category,
                r.cook_time,
                r.servings,
                r.difficulty,
                r.image_url,
                r.image_local_path,
                r.source_url,
                (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS ingredient_count
            FROM recipes r
            ${where}
            ORDER BY r.id DESC
            LIMIT ?
        `, params);

        const hasMore    = rows.length > limit;
        const items      = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        const result = items.map(row => ({
            id:               Number(row.id),
            name:             row.name,
            dish_type:        row.dish_type,
            food_category:    row.food_category,
            cook_time:        row.cook_time,
            servings:         row.servings,
            difficulty:       row.difficulty,
            displayImage:     row.image_local_path || row.image_url || null,
            source_url:       row.source_url,
            ingredient_count: Number(row.ingredient_count || 0),
            dish_type_label:  CATEGORY_LABELS.dish_type[row.dish_type] || row.dish_type,
        }));

        res.json({ success: true, items: result, hasMore, nextCursor });
    } catch (err) {
        console.error('testController.getRecipeList error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (conn) conn.end();
    }
}

/**
 * 레시피 상세 API
 * GET /test/api/recipes/:id
 */
async function getRecipeDetail(req, res) {
    let conn;
    try {
        conn = await pool.getConnection();
        const id = parseInt(req.params.id);

        // 레시피 기본 정보
        const recipeRows = await conn.query(`
            SELECT
                id, name, dish_type, food_category, cuisine_origin,
                instructions, image_url, image_local_path, step_image_urls,
                cook_time, prep_time, servings, difficulty,
                source_url, source_site, scraped_at
            FROM recipes
            WHERE id = ?
        `, [id]);

        if (!recipeRows || recipeRows.length === 0) {
            return res.status(404).json({ success: false, error: '레시피를 찾을 수 없습니다.' });
        }
        const recipe = recipeRows[0];

        // 재료 목록
        const ingredients = await conn.query(`
            SELECT ingredient_name, quantity, unit, ingredient_type, original_text, sort_order
            FROM recipe_ingredients
            WHERE recipe_id = ?
            ORDER BY ingredient_type DESC, sort_order ASC
        `, [id]);

        // JSON 파싱
        let instructions = [];
        try { instructions = JSON.parse(recipe.instructions || '[]'); } catch (e) {}

        let stepImageUrls = [];
        try { stepImageUrls = JSON.parse(recipe.step_image_urls || '[]'); } catch (e) {}

        res.json({
            success: true,
            recipe: {
                id:                  Number(recipe.id),
                name:                recipe.name,
                dish_type:           recipe.dish_type,
                food_category:       recipe.food_category,
                cuisine_origin:      recipe.cuisine_origin,
                cook_time:           recipe.cook_time,
                prep_time:           recipe.prep_time,
                servings:            recipe.servings,
                difficulty:          recipe.difficulty,
                source_url:          recipe.source_url,
                source_site:         recipe.source_site,
                scraped_at:          recipe.scraped_at,
                displayImage:        recipe.image_local_path || recipe.image_url || null,
                instructions,
                stepImageUrls,
                dish_type_label:     CATEGORY_LABELS.dish_type[recipe.dish_type]          || recipe.dish_type,
                food_category_label: CATEGORY_LABELS.food_category[recipe.food_category]  || recipe.food_category,
            },
            ingredients: ingredients.map(i => ({
                ingredient_name: i.ingredient_name,
                quantity:        i.quantity != null ? Number(i.quantity) : null,
                unit:            i.unit,
                ingredient_type: i.ingredient_type,
                original_text:   i.original_text,
            })),
        });
    } catch (err) {
        console.error('testController.getRecipeDetail error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (conn) conn.end();
    }
}

module.exports = { getMain, getRecipeList, getRecipeDetail };
