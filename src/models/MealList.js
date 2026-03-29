// MealList.js - 식단 구성 리스트 데이터베이스 모델
// 이 파일은 meal_list 테이블과 상호작용하여 식단 구성 리스트 관리를 위한 모델입니다.

class MealList {
    constructor(db) {
        this.db = db;
    }

    // 새 항목을 meal_list에 추가
    async addItem(recipeId, canBreakfast = 0, canLunch = 1, canDinner = 1, isActive = 1, memo = '') {
        try {
            const query = `
                INSERT INTO meal_list (recipe_id, can_breakfast, can_lunch, can_dinner, is_active, memo)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const result = await this.db.query(query, [recipeId, canBreakfast, canLunch, canDinner, isActive, memo]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // meal_list에서 모든 항목 조회 (페이지네이션 지원)
    async getAllItems(page = 1, limit = 10, category = null, dishType = null) {
        try {
            // 페이지네이션 계산
            const offset = (page - 1) * limit;

            // 기본 쿼리
            let query = `
                SELECT
                    ml.id,
                    ml.recipe_id,
                    r.name,
                    r.food_category,
                    r.dish_type,
                    r.cuisine_origin,
                    ml.can_breakfast,
                    ml.can_lunch,
                    ml.can_dinner,
                    ml.is_active,
                    ml.memo,
                    ml.added_at,
                    r.image_url
                FROM meal_list ml
                JOIN recipes r ON ml.recipe_id = r.id
            `;

            // 필터 조건 추가
            const conditions = [];
            const params = [];

            if (category) {
                conditions.push('r.food_category = ?');
                params.push(category);
            }

            if (dishType) {
                conditions.push('r.dish_type = ?');
                params.push(dishType);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            // 페이지네이션 적용
            query += ' ORDER BY ml.added_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const rows = await this.db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // 전체 항목 수 조회 (페이지네이션을 위한 총 개수 계산)
    async getTotalItemCount(category = null, dishType = null) {
        try {
            let query = 'SELECT COUNT(*) as count FROM meal_list ml JOIN recipes r ON ml.recipe_id = r.id';
            const params = [];

            const conditions = [];
            if (category) {
                conditions.push('r.food_category = ?');
                params.push(category);
            }

            if (dishType) {
                conditions.push('r.dish_type = ?');
                params.push(dishType);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const rows = await this.db.query(query, params);
            return rows[0].count;
        } catch (error) {
            throw error;
        }
    }

    // 특정 항목 조회
    async getItemById(id) {
        try {
            const query = `
                SELECT
                    ml.id,
                    ml.recipe_id,
                    r.name,
                    r.food_category,
                    r.dish_type,
                    r.cuisine_origin,
                    ml.can_breakfast,
                    ml.can_lunch,
                    ml.can_dinner,
                    ml.is_active,
                    ml.memo,
                    ml.added_at
                FROM meal_list ml
                JOIN recipes r ON ml.recipe_id = r.id
                WHERE ml.id = ?
            `;
            const rows = await this.db.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // meal_list 항목 업데이트
    async updateItem(id, canBreakfast, canLunch, canDinner, isActive, memo) {
        try {
            const query = `
                UPDATE meal_list
                SET can_breakfast = ?, can_lunch = ?, can_dinner = ?, is_active = ?, memo = ?
                WHERE id = ?
            `;
            const result = await this.db.query(query, [canBreakfast, canLunch, canDinner, isActive, memo, id]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // meal_list에서 항목 제거
    async removeItem(id) {
        try {
            const query = 'DELETE FROM meal_list WHERE id = ?';
            const result = await this.db.query(query, [id]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // recipe_id로 항목 존재 여부 확인
    async isRecipeInMealList(recipeId) {
        try {
            const query = 'SELECT COUNT(*) as count FROM meal_list WHERE recipe_id = ?';
            const rows = await this.db.query(query, [recipeId]);
            return rows[0].count > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = MealList;