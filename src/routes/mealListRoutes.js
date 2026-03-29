// mealListRoutes.js - 식단 구성 리스트 라우트
// 이 파일은 meal_list 관련 엔드포인트를 정의합니다.

const express = require('express');
const router = express.Router();
const MealListController = require('../controllers/MealListController');

// MealListController 인스턴스 생성
const mealListController = new MealListController();

// GET /api/meal-list - meal_list의 모든 항목 조회 (페이지네이션 지원)
router.get('/', (req, res) => mealListController.getAllItems(req, res));

// POST /api/meal-list - 새 항목을 meal_list에 추가
router.post('/', (req, res) => mealListController.addItem(req, res));

// PUT /api/meal-list/:id - meal_list 항목 업데이트
router.put('/:id', (req, res) => mealListController.updateItem(req, res));

// DELETE /api/meal-list/:id - meal_list에서 항목 제거
router.delete('/:id', (req, res) => mealListController.removeItem(req, res));

// GET /api/meal-list/not-in-list - meal_list에 없는 레시피 조회
router.get('/not-in-list', (req, res) => mealListController.getRecipesNotInMealList(req, res));

module.exports = router;