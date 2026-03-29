# 인터넷 레시피 검색 기능 상세 설계

이 문서는 자동 식단 생성 웹사이트에 인터넷 레시피 검색 기능을 추가하기 위한 상세 설계를 정리한 문서입니다.

## 1. 기능 개요

사용자가 음식 이름을 입력하면 인터넷에서 해당 레시피와 재료를 자동으로 가져오는 기능입니다. 이 기능은 기존의 수동 레시피 등록 방식을 보완하여 사용자 편의를 증대시키는 역할을 합니다.

## 2. 전체 아키텍처

### 2.1 구성 요소

1. **프론트엔드 UI**: 레시피 검색 입력창 및 결과 표시 영역
2. **백엔드 API**: 검색 요청을 처리하고 결과를 반환하는 엔드포인트
3. **레시피 스크래퍼 서비스**: 인터넷에서 레시피 정보를 가져오는 서비스
4. **데이터베이스**: 가져온 레시피 정보를 저장하는 저장소

### 2.2 데이터 흐름

```
사용자 입력 → 프론트엔드 → 백엔드 API → 레시피 스크래퍼 → 외부 웹사이트
    ↑                                                    ↓
결과 표시 ← 프론트엔드 ← 백엔드 API ← 데이터베이스 ← 레시피 저장
```

## 3. 프론트엔드 변경 사항

### 3.1 UI 구성 요소

#### 검색 섹션 추가
```html
<section class="recipe-search">
  <h2>레시피 검색</h2>
  <form id="recipe-search-form">
    <input type="text" id="recipe-name-input" placeholder="음식 이름을 입력하세요..." required>
    <button type="submit">레시피 검색</button>
  </form>
  <div id="search-results-container"></div>
</section>
```

#### 검색 결과 표시 영역
```html
<div id="search-results" class="hidden">
  <h3>검색 결과</h3>
  <div id="recipe-list"></div>
  <button id="save-all-button" class="hidden">모두 저장</button>
</div>
```

### 3.2 JavaScript 기능

#### 검색 폼 제출 처리
```javascript
document.getElementById('recipe-search-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const recipeName = document.getElementById('recipe-name-input').value;
  await searchRecipes(recipeName);
});
```

#### AJAX 검색 요청
```javascript
async function searchRecipes(recipeName) {
  try {
    const response = await fetch(`/api/recipes/search?name=${encodeURIComponent(recipeName)}`);
    const recipes = await response.json();
    displaySearchResults(recipes);
  } catch (error) {
    console.error('레시피 검색 오류:', error);
    showErrorMessage('레시피 검색 중 오류가 발생했습니다.');
  }
}
```

#### 결과 표시
```javascript
function displaySearchResults(recipes) {
  const container = document.getElementById('recipe-list');
  container.innerHTML = recipes.map(recipe => `
    <div class="recipe-item" data-id="${recipe.id}">
      <h4>${recipe.name}</h4>
      <p>출처: ${recipe.source_site}</p>
      <p>재료: ${recipe.ingredients.substring(0, 100)}...</p>
      <button class="save-recipe-button" data-recipe='${JSON.stringify(recipe)}'>저장</button>
    </div>
  `).join('');

  document.getElementById('search-results').classList.remove('hidden');
}
```

## 4. 백엔드 변경 사항

### 4.1 새로운 라우트 추가

#### app.js에 라우트 등록
```javascript
// 레시피 검색 라우트
const recipeRoutes = require('./routes/recipeRoutes');
app.use('/api/recipes', recipeRoutes);
```

#### recipeRoutes.js 파일 생성
```javascript
const express = require('express');
const router = express.Router();
const RecipeScraperService = require('../services/recipeScraper');
const Recipe = require('../models/Recipe');
const { pool } = require('../models/db');

// 레시피 검색 엔드포인트
router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: '레시피 이름이 필요합니다.' });
    }

    const scraper = new RecipeScraperService();
    const recipes = await scraper.searchRecipes(name);

    res.json(recipes);
  } catch (error) {
    console.error('레시피 검색 오류:', error);
    res.status(500).json({ error: '레시피 검색 중 오류가 발생했습니다.' });
  }
});

// 레시피 저장 엔드포인트
router.post('/save', async (req, res) => {
  try {
    const recipeData = req.body;
    const recipeModel = new Recipe(pool);
    const result = await recipeModel.addRecipe(
      recipeData.name,
      recipeData.meal_type,
      recipeData.ingredients,
      recipeData.instructions
    );

    res.json({ id: result.insertId, message: '레시피가 저장되었습니다.' });
  } catch (error) {
    console.error('레시피 저장 오류:', error);
    res.status(500).json({ error: '레시피 저장 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
```

### 4.2 레시피 스크래퍼 서비스

#### recipeScraper.js 파일 생성
```javascript
class RecipeScraperService {
  constructor() {
    // 스크래핑에 필요한 라이브러리 초기화
    this.axios = require('axios');
    this.cheerio = require('cheerio');
  }

  async searchRecipes(foodName) {
    try {
      // 여러 소스에서 레시피 검색
      const recipes = [];

      // Allrecipes에서 검색
      const allrecipesResult = await this.fetchFromAllrecipes(foodName);
      if (allrecipesResult) recipes.push(allrecipesResult);

      // Epicurious에서 검색
      const epicuriousResult = await this.fetchFromEpicurious(foodName);
      if (epicuriousResult) recipes.push(epicuriousResult);

      return recipes;
    } catch (error) {
      console.error('레시피 검색 오류:', error);
      return [];
    }
  }

  async fetchFromAllrecipes(foodName) {
    // Allrecipes에서 레시피 가져오기 구현
    // 실제 구현은 여기에 포함되어야 하지만 현재는 설명만 제공
    return {
      name: `${foodName} 레시피`,
      source_site: 'Allrecipes',
      ingredients: '예제 재료',
      instructions: '예제 조리법'
    };
  }

  async fetchFromEpicurious(foodName) {
    // Epicurious에서 레시피 가져오기 구현
    // 실제 구현은 여기에 포함되어야 하지만 현재는 설명만 제공
    return {
      name: `${foodName} 레시피`,
      source_site: 'Epicurious',
      ingredients: '예제 재료',
      instructions: '예제 조리법'
    };
  }
}

module.exports = RecipeScraperService;
```

## 5. 데이터베이스 변경 사항

### 5.1 기존 테이블 확장

recipes 테이블에 레시피 출처 정보를 저장하기 위한 필드 추가:

```sql
ALTER TABLE recipes ADD COLUMN (
    source_url VARCHAR(500) COMMENT '원본 레시피 URL',
    source_site VARCHAR(100) COMMENT '원본 사이트 이름',
    source_author VARCHAR(255) COMMENT '작성자/출처',
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '스크래핑 시간',
    image_url VARCHAR(500) COMMENT '레시피 대표 이미지 URL',
    prep_time VARCHAR(50) COMMENT '준비 시간',
    cook_time VARCHAR(50) COMMENT '조리 시간',
    servings INT COMMENT '제공량',
    difficulty_level ENUM('easy', 'medium', 'hard') COMMENT '난이도',
    cuisine_type VARCHAR(100) COMMENT '요리 종류',
    tags TEXT COMMENT '태그 (콤마로 구분)'
);
```

## 6. 보안 및 오류 처리

### 6.1 입력 검증

```javascript
// 검색어 유효성 검사
function validateSearchInput(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('유효한 레시피 이름을 입력해주세요.');
  }

  if (name.length > 100) {
    throw new Error('레시피 이름은 100자를 초과할 수 없습니다.');
  }

  return name.trim();
}
```

### 6.2 오류 처리

```javascript
// 네트워크 오류 처리
async function handleNetworkError(error, source) {
  console.error(`${source}에서 데이터를 가져오는 중 오류 발생:`, error.message);

  // 재시도 로직
  if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
    throw new Error(`${source} 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.`);
  }

  throw new Error(`${source}에서 데이터를 가져오는 중 문제가 발생했습니다.`);
}
```

## 7. 성능 최적화

### 7.1 캐싱 전략

```javascript
// 간단한 메모리 캐시 구현
class RecipeCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5분 TTL
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
}

const recipeCache = new RecipeCache();
```

### 7.2 요청 제한

```javascript
// 요청 제한 미들웨어
function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
  } else {
    const requestData = requestCounts.get(ip);
    if (now > requestData.resetTime) {
      requestData.count = 1;
      requestData.resetTime = now + 60000;
    } else {
      requestData.count++;
      if (requestData.count > 10) {
        return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
      }
    }
  }

  next();
}
```

## 8. 테스트 계획

### 8.1 단위 테스트

```javascript
// recipeScraper.test.js
describe('RecipeScraperService', () => {
  test('searchRecipes should return recipes for valid input', async () => {
    const scraper = new RecipeScraperService();
    const results = await scraper.searchRecipes('김치찌개');

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
  });

  test('searchRecipes should handle invalid input gracefully', async () => {
    const scraper = new RecipeScraperService();
    const results = await scraper.searchRecipes('');

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBe(0);
  });
});
```

### 8.2 통합 테스트

```javascript
// recipeRoutes.test.js
describe('Recipe Routes', () => {
  test('GET /api/recipes/search should return recipes', async () => {
    const response = await request(app).get('/api/recipes/search?name=김치찌개');

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  test('GET /api/recipes/search should return error for missing name', async () => {
    const response = await request(app).get('/api/recipes/search');

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
```

이 설계는 인터넷 레시피 검색 기능을 효과적으로 구현하기 위한 전반적인 구조와 구현 방향을 제공합니다. 실제 구현 시에는 각 구성 요소의 세부 구현을 완료해야 합니다.