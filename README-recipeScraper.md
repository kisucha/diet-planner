# Recipe Scraper Service 설계 문서

## 개요
`recipeScraper.js` 서비스는 다양한 레시피 웹사이트에서 데이터를 수집하고 파싱하여 로컬 데이터베이스에 저장하는 기능을 제공합니다. 이 서비스는 외부 소스에서 레시피 정보를 가져와 애플리케이션 내에서 활용할 수 있도록 합니다.

## 아키텍처 및 상호작용

### Recipe 모델과의 상호작용
- `recipeScraper.js`는 `Recipe` 모델을 직접 사용하여 스크래핑된 데이터를 데이터베이스에 저장합니다.
- `Recipe` 모델의 `addRecipe()` 메서드를 사용하여 새로운 레시피를 추가합니다.
- 데이터베이스 연결은 기존의 `db.js`에서 제공하는 `pool`을 사용합니다.

## 지원하는 웹사이트 및 API

### 1. 레시피 웹사이트 스크래핑
현재 지원하는 주요 레시피 웹사이트:
1. **Allrecipes** (https://www.allrecipes.com)
2. **Epicurious** (https://www.epicurious.com)

추후 확장 가능한 웹사이트:
- Food Network
- BBC Good Food
- NYT Cooking

### 2. 레시피 API
대체 수단으로 Spoonacular API 지원:
- API 엔드포인트: https://api.spoonacular.com/
- 필요한 환경 변수: `SPOONACULAR_API_KEY`

## 데이터 파싱 방식

### HTML 파싱 라이브러리
- **Cheerio**: jQuery와 유사한 서버사이드 HTML 파싱 라이브러리
- 각 웹사이트별로 CSS 선택자를 정의하여 데이터 추출

### 파싱되는 데이터 구조
1. **제목** (title)
2. **재료 목록** (ingredients)
3. **조리 방법** (instructions)
4. **준비 시간** (prepTime)
5. **조리 시간** (cookTime)
6. **원본 URL** (sourceUrl)
7. **소스 사이트** (sourceSite)

## 오류 처리 전략

### 1. 네트워크 오류
- 타임아웃 설정 (10초)
- 재시도 메커니즘 (향후 구현 가능)
- 사용자 친화적 오류 메시지 제공

### 2. 파싱 오류
- 선택자가 잘못되었을 경우 대체 선택자 시도
- 필수 데이터 누락 시 적절한 오류 반환
- 부분적으로 파싱된 데이터라도 가능한 한 반환

### 3. 데이터베이스 오류
- 데이터 유효성 검사 실패 시 오류 처리
- 데이터베이스 연결 문제 시 로깅 및 알림

### 4. API 오류
- API 키 누락 시 명확한 오류 메시지
- API 제한 초과 시 대기 후 재시도

## 사용 예시

### 단일 레시피 스크래핑
```javascript
const RecipeScraperService = require('./services/recipeScraper');
const scraper = new RecipeScraperService();

// Allrecipes에서 레시피 스크래핑
const recipeData = await scraper.scrapeRecipe('allrecipes', 'https://www.allrecipes.com/recipe/...');
await scraper.saveRecipe(recipeData, 'dinner');
```

### 일괄 스크래핑
```javascript
const urls = [
    { siteName: 'allrecipes', url: 'https://...', mealType: 'breakfast' },
    { siteName: 'epicurious', url: 'https://...', mealType: 'lunch' }
];

const results = await scraper.batchScrapeAndSave(urls);
```

### API를 통한 레시피 가져오기
```javascript
// Spoonacular API 사용
const recipes = await scraper.fetchFromAPI('chicken');
```

## 보안 및 성능 고려사항

### 1. Rate Limiting
- 동일 사이트에 대한 요청 간격 조절
- 동시 요청 수 제한 (필요시 구현)

### 2. User-Agent 회전
- 탐지를 피하기 위해 다양한 User-Agent 사용 (향후 구현 가능)

### 3. 캐싱
- 동일 URL에 대한 반복 요청 시 캐시 사용 (향후 구현 가능)

## 종속성 설치

```bash
npm install axios cheerio
```

## 환경 변수 설정

```
SPOONACULAR_API_KEY=your_api_key_here
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=diet_app
```

## 향후 개선 방향

1. 더 많은 레시피 웹사이트 지원
2. 이미지 다운로드 및 저장 기능
3. 카테고리 및 태그 자동 분류
4. 중복 레시피 감지 및 처리
5. 스크래핑 일정 자동화