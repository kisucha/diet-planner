// MealListController.js - 식단 구성 리스트 컨트롤러
// 이 파일은 meal_list 관련 HTTP 요청을 처리하는 컨트롤러입니다.

const MealList = require('../models/MealList');
const Recipe = require('../models/Recipe');
const { pool } = require('../models/db');

class MealListController {
    constructor() {
        this.mealListModel = new MealList(pool);
        this.recipeModel = new Recipe(pool);
    }

    // GET /api/meal-list - meal_list의 모든 항목 조회 (페이지네이션 지원)
    async getAllItems(req, res) {
        try {
            // 쿼리 파라미터에서 페이지, 제한, 카테고리, 요리 유형 가져오기
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const category = req.query.category || null;
            const dishType = req.query.dish_type || null;

            // 전체 항목 수 조회
            const totalCount = await this.mealListModel.getTotalItemCount(category, dishType);

            // 페이지네이션된 항목 조회
            const items = await this.mealListModel.getAllItems(page, limit, category, dishType);

            // 페이지네이션 메타데이터 계산
            const totalPages = Math.ceil(totalCount / limit);
            const hasNext = page < totalPages;
            const hasPrev = page > 1;

            // 응답 데이터 구성
            const response = {
                items: items,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: limit,
                    hasNext: hasNext,
                    hasPrev: hasPrev
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Error fetching meal list items:', error);
            res.status(500).json({ error: '식단 구성 리스트 항목 조회 중 오류가 발생했습니다.' });
        }
    }

    // POST /api/meal-list - 새 항목을 meal_list에 추가
    async addItem(req, res) {
        try {
            const { recipe_id, can_breakfast, can_lunch, can_dinner, memo } = req.body;

            // 필수 파라미터 확인
            if (!recipe_id) {
                return res.status(400).json({ error: 'recipe_id가 필요합니다.' });
            }

            // 레시피 존재 여부 확인
            const recipe = await this.recipeModel.getRecipeById(recipe_id);
            if (!recipe) {
                return res.status(404).json({ error: '해당 레시피를 찾을 수 없습니다.' });
            }

            // 이미 meal_list에 있는지 확인
            const isInList = await this.mealListModel.isRecipeInMealList(recipe_id);
            if (isInList) {
                return res.status(409).json({ error: '이미 식단 구성 리스트에 등록된 레시피입니다.' });
            }

            // 기본값 설정
            const canBreakfast = can_breakfast !== undefined ? can_breakfast : 0;
            const canLunch = can_lunch !== undefined ? can_lunch : 1;
            const canDinner = can_dinner !== undefined ? can_dinner : 1;
            const memoText = memo || '';

            // 항목 추가
            const result = await this.mealListModel.addItem(
                recipe_id,
                canBreakfast,
                canLunch,
                canDinner,
                1, // 기본적으로 활성화
                memoText
            );

            res.status(201).json({
                id: result.insertId,
                message: '식단 구성 리스트에 추가되었습니다.'
            });
        } catch (error) {
            console.error('Error adding item to meal list:', error);
            res.status(500).json({ error: '식단 구성 리스트에 추가 중 오류가 발생했습니다.' });
        }
    }

    // PUT /api/meal-list/:id - meal_list 항목 업데이트
    async updateItem(req, res) {
        try {
            const id = parseInt(req.params.id);
            const { can_breakfast, can_lunch, can_dinner, is_active, memo } = req.body;

            // 항목 존재 여부 확인
            const item = await this.mealListModel.getItemById(id);
            if (!item) {
                return res.status(404).json({ error: '해당 항목을 찾을 수 없습니다.' });
            }

            // 항목 업데이트
            const result = await this.mealListModel.updateItem(
                id,
                can_breakfast !== undefined ? can_breakfast : item.can_breakfast,
                can_lunch !== undefined ? can_lunch : item.can_lunch,
                can_dinner !== undefined ? can_dinner : item.can_dinner,
                is_active !== undefined ? is_active : item.is_active,
                memo !== undefined ? memo : item.memo
            );

            res.json({
                id: id,
                message: '식단 구성 리스트 항목이 업데이트되었습니다.'
            });
        } catch (error) {
            console.error('Error updating meal list item:', error);
            res.status(500).json({ error: '식단 구성 리스트 항목 업데이트 중 오류가 발생했습니다.' });
        }
    }

    // DELETE /api/meal-list/:id - meal_list에서 항목 제거
    async removeItem(req, res) {
        try {
            const id = parseInt(req.params.id);

            // 항목 존재 여부 확인
            const item = await this.mealListModel.getItemById(id);
            if (!item) {
                return res.status(404).json({ error: '해당 항목을 찾을 수 없습니다.' });
            }

            // 항목 제거
            const result = await this.mealListModel.removeItem(id);

            res.json({
                id: id,
                message: '식단 구성 리스트에서 제거되었습니다.'
            });
        } catch (error) {
            console.error('Error removing item from meal list:', error);
            res.status(500).json({ error: '식단 구성 리스트에서 제거 중 오류가 발생했습니다.' });
        }
    }

    // GET /api/meal-list/not-in-list - meal_list에 없는 레시피 조회 (페이지네이션 지원)
    async getRecipesNotInMealList(req, res) {
        try {
            // 쿼리 파라미터에서 페이지, 제한, 카테고리, 요리 유형 가져오기
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const category = req.query.category || null;
            const dishType = req.query.dish_type || null;

            // 페이지네이션 계산
            const offset = (page - 1) * limit;

            // 쿼리 구성
            let query = `
                SELECT *
                FROM recipes r
                WHERE NOT EXISTS (
                    SELECT 1 FROM meal_list ml WHERE ml.recipe_id = r.id
                )
            `;

            const params = [];

            // 필터 조건 추가
            if (category) {
                query += ' AND r.food_category = ?';
                params.push(category);
            }

            if (dishType) {
                query += ' AND r.dish_type = ?';
                params.push(dishType);
            }

            // 페이지네이션 적용
            query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const recipes = await this.recipeModel.db.query(query, params);

            // 전체 개수 조회
            let countQuery = `
                SELECT COUNT(*) as count
                FROM recipes r
                WHERE NOT EXISTS (
                    SELECT 1 FROM meal_list ml WHERE ml.recipe_id = r.id
                )
            `;

            const countParams = [];
            if (category) {
                countQuery += ' AND r.food_category = ?';
                countParams.push(category);
            }

            if (dishType) {
                countQuery += ' AND r.dish_type = ?';
                countParams.push(dishType);
            }

            const countRows = await this.recipeModel.db.query(countQuery, countParams);
            const totalCount = countRows[0].count;

            // 페이지네이션 메타데이터 계산
            const totalPages = Math.ceil(totalCount / limit);
            const hasNext = page < totalPages;
            const hasPrev = page > 1;

            // 응답 데이터 구성
            const response = {
                recipes: recipes,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: limit,
                    hasNext: hasNext,
                    hasPrev: hasPrev
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Error fetching recipes not in meal list:', error);
            res.status(500).json({ error: 'meal_list에 없는 레시피 조회 중 오류가 발생했습니다.' });
        }
    }
}

module.exports = MealListController;