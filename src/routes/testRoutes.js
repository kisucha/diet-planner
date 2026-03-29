// routes/testRoutes.js
// 목적: 스크래핑 데이터 확인용 테스트 페이지 라우트

'use strict';

const express    = require('express');
const router     = express.Router();
const testCtrl   = require('../controllers/testController');

// 테스트 메인 페이지 (카테고리 목록)
router.get('/', testCtrl.getMain);

// API: 카테고리별 레시피 목록 (커서 기반 페이징)
router.get('/api/recipes', testCtrl.getRecipeList);

// API: 레시피 상세
router.get('/api/recipes/:id', testCtrl.getRecipeDetail);

module.exports = router;
