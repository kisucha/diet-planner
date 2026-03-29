// Recipe.js - 레시피 관련 데이터베이스 모델

class Recipe {
    constructor(db) {
        this.db = db;
    }

    // 새 레시피 추가
    async addRecipe(name, mealType, ingredients, instructions) {
        try {
            const query = `
                INSERT INTO recipes (name, meal_type, ingredients, instructions)
                VALUES (?, ?, ?, ?)
            `;
            const result = await this.db.query(query, [name, mealType, ingredients, instructions]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 모든 레시피 조회
    async getAllRecipes() {
        try {
            const query = 'SELECT * FROM recipes';
            const rows = await this.db.query(query);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // 특정 레시피 조회
    async getRecipeById(id) {
        try {
            const query = 'SELECT * FROM recipes WHERE id = ?';
            const rows = await this.db.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // 레시피 업데이트
    async updateRecipe(id, name, mealType, ingredients, instructions) {
        try {
            const query = `
                UPDATE recipes
                SET name = ?, meal_type = ?, ingredients = ?, instructions = ?
                WHERE id = ?
            `;
            const result = await this.db.query(query, [name, mealType, ingredients, instructions, id]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 레시피 삭제
    async deleteRecipe(id) {
        try {
            const query = 'DELETE FROM recipes WHERE id = ?';
            const result = await this.db.query(query, [id]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 식사 유형별 레시피 조회
    async getRecipesByMealType(mealType) {
        try {
            const query = 'SELECT * FROM recipes WHERE meal_type = ?';
            const rows = await this.db.query(query, [mealType]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Recipe;