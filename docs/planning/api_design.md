# API 설계 문서

이 문서는 자동 식단 생성 웹사이트의 RESTful API를 설계하고 정의합니다.

**최종 업데이트**: 2026-03-22 (v4.0 전면 개정 — 음식 분류, 식단 구성 리스트, 특별일/주말 제안 API 반영)

---

## 1. API 엔드포인트 개요

### 기본화면 API

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/today-meal` | GET | 오늘 식단 + 반찬 4개 + 특별일/주말 제안 |
| `/api/meal/:date` | GET | 특정 날짜의 식단 전체 조회 |

### 식단 관리 API

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/meal-plans` | GET | 전체 식단 목록 |
| `/api/meal-plans/:date` | GET | 특정 날짜 식단 (반찬 포함) |
| `/api/meal-plans/generate` | POST | 식단 자동 생성 (날짜/기간) |
| `/api/meal-plans` | POST | 식단 수동 저장 |
| `/api/meal-plans/:date` | PUT | 식단 수정 |
| `/api/meal-plans/:date` | DELETE | 식단 삭제 |
| `/api/meal-plans/:date/cost` | GET | 해당 날짜 비용 상세 |
| `/api/calendar/:year/:month` | GET | 월별 달력 데이터 |

### 식단 구성 리스트 API [신규]

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/meal-list` | GET | 리스트 전체 조회 (카테고리 필터 지원) |
| `/api/meal-list` | POST | 리스트에 음식 추가 |
| `/api/meal-list/:id` | PUT | 식사 시간 등 수정 |
| `/api/meal-list/:id` | DELETE | 리스트에서 제거 |

### 음식 DB 관리 API

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/foods` | GET | 전체 음식 DB 목록 (카테고리/유형 필터 지원) |
| `/api/foods/:id` | GET | 특정 음식 상세 조회 |
| `/api/foods` | POST | 음식 등록 |
| `/api/foods/:id` | PUT | 음식 수정 |
| `/api/foods/:id` | DELETE | 음식 삭제 |
| `/api/foods/search` | GET | 인터넷 레시피 검색 |
| `/api/foods/fetch-and-save` | POST | 검색 결과 저장 |
| `/api/foods/bulk-scrape` | POST | 대량 스크래핑 시작 |

### 특별한 날 API [신규]

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/holidays/:year` | GET | 해당 연도 특별한 날 목록 |
| `/api/holidays/check` | GET | 날짜의 특별일 여부 확인 |
| `/api/holidays/:key/suggestions` | GET | 특별한 날 추천 음식 |
| `/api/holidays/:year/:key` | PUT | 날짜 등록/수정 |
| `/api/holidays/:key/suggestions` | POST | 추천 음식 추가 |
| `/api/holidays/:key/suggestions/:id` | DELETE | 추천 음식 삭제 |

### 주말 특식 API [신규]

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/weekend-specials` | GET | 전체 특식 목록 |
| `/api/weekend-specials` | POST | 특식 추가 |
| `/api/weekend-specials/:id` | PUT | 특식 수정 |
| `/api/weekend-specials/:id` | DELETE | 특식 삭제 |

### 재료 가격 API

| 엔드포인트 | HTTP 메소드 | 기능 설명 |
|------------|-------------|-----------|
| `/api/ingredients` | GET | 재료 가격 목록 |
| `/api/ingredients` | POST | 가격 등록 |
| `/api/ingredients/:id` | PUT | 가격 수정 |
| `/api/ingredients/:id` | DELETE | 삭제 |

---

## 2. 상세 API 명세

### 2.1 기본화면 API

#### 2.1.1 오늘의 식단 조회
- **URL**: `/api/today-meal`
- **Method**: `GET`
- **설명**: 오늘 날짜의 식단 전체를 조회합니다. 주말이면 특식 제안, 특별한 날이면 명절 제안을 포함합니다.
- **응답**:
  ```json
  {
    "date": "2026-03-22",
    "is_weekend": true,
    "holiday": null,
    "meal": {
      "breakfast": { "id": 1, "name": "오트밀", "image_url": "..." },
      "lunch":     { "id": 2, "name": "김치찌개", "image_url": "..." },
      "dinner":    { "id": 3, "name": "비빔밥", "image_url": "..." },
      "snack":     null,
      "sides": [
        { "id": 10, "name": "배추김치", "sort_order": 1 },
        { "id": 11, "name": "시금치나물", "sort_order": 2 },
        { "id": 12, "name": "계란말이", "sort_order": 3 },
        { "id": 13, "name": "멸치볶음", "sort_order": 4 }
      ]
    },
    "total_cost": 12500,
    "weekend_specials": [
      { "food_name": "짜장면", "recipe_id": null, "description": "주말 특식의 대표" },
      { "food_name": "탕수육", "recipe_id": null, "description": "짜장면과 함께 인기" },
      { "food_name": "피자", "recipe_id": null, "description": "가족 주말 외식" }
    ],
    "holiday_suggestions": null
  }
  ```

---

### 2.2 식단 관리 API

#### 2.2.1 식단 자동 생성
- **URL**: `/api/meal-plans/generate`
- **Method**: `POST`
- **설명**: meal_list에 등록된 음식을 기반으로 지정된 날짜/기간의 식단을 자동 생성합니다.
- **요청 본문**:
  ```json
  {
    "start_date": "2026-04-01",
    "end_date": "2026-04-07"
  }
  ```
- **응답**:
  ```json
  {
    "message": "식단 계획이 생성되었습니다.",
    "plans": [
      {
        "date": "2026-04-01",
        "breakfast": "오트밀",
        "lunch": "김치찌개",
        "dinner": "비빔밥",
        "snack": null,
        "sides": ["배추김치", "시금치나물", "계란말이", "멸치볶음"],
        "total_cost": 12500,
        "has_holiday": false,
        "weekend_specials": null
      }
    ]
  }
  ```

#### 2.2.2 특정 날짜의 식단 계획 조회
- **URL**: `/api/meal-plans/:date`
- **Method**: `GET`
- **설명**: 특정 날짜의 식단 계획을 반찬 포함하여 조회합니다.
- **응답**:
  ```json
  {
    "date": "2026-04-01",
    "breakfast": {
      "id": 1,
      "name": "오트밀",
      "dish_type": "foreign",
      "food_category": "main_dish"
    },
    "lunch": {
      "id": 2,
      "name": "김치찌개",
      "dish_type": "korean_jjigae",
      "food_category": "main_dish"
    },
    "dinner": {
      "id": 3,
      "name": "비빔밥",
      "dish_type": "korean_dish",
      "food_category": "main_dish"
    },
    "snack": null,
    "sides": [
      { "id": 10, "name": "배추김치", "sort_order": 1 },
      { "id": 11, "name": "시금치나물", "sort_order": 2 },
      { "id": 12, "name": "계란말이", "sort_order": 3 },
      { "id": 13, "name": "멸치볶음", "sort_order": 4 }
    ],
    "total_cost": 12500
  }
  ```

#### 2.2.3 달력 데이터 조회
- **URL**: `/api/calendar/:year/:month`
- **Method**: `GET`
- **설명**: 특정 년월의 달력 데이터를 조회합니다.
- **응답**:
  ```json
  {
    "year": 2026,
    "month": 4,
    "days": [
      { "date": "2026-04-01", "has_plan": true },
      { "date": "2026-04-02", "has_plan": false }
    ]
  }
  ```

---

### 2.3 식단 구성 리스트 API [신규]

#### 2.3.1 리스트 전체 조회
- **URL**: `/api/meal-list`
- **Method**: `GET`
- **쿼리 파라미터**:
  - `category` (선택): `main_dish`, `side_dish`, `special`
  - `dish_type` (선택): `korean_dish`, `korean_tang`, `korean_jjigae`, `korean_guk`, `foreign`, `side`, `special`
- **요청 예시**: `GET /api/meal-list?category=main_dish`
- **응답**:
  ```json
  [
    {
      "id": 1,
      "recipe_id": 5,
      "name": "김치찌개",
      "food_category": "main_dish",
      "dish_type": "korean_jjigae",
      "cuisine_origin": "korean",
      "can_breakfast": 0,
      "can_lunch": 1,
      "can_dinner": 1,
      "is_active": 1,
      "memo": null,
      "image_url": "..."
    }
  ]
  ```

#### 2.3.2 리스트에 음식 추가
- **URL**: `/api/meal-list`
- **Method**: `POST`
- **설명**: 전체 음식 DB에서 선택한 음식을 식단 구성 리스트에 추가합니다.
- **요청 본문**:
  ```json
  {
    "recipe_id": 5,
    "can_breakfast": 0,
    "can_lunch": 1,
    "can_dinner": 1,
    "memo": ""
  }
  ```
- **응답**:
  ```json
  {
    "id": 10,
    "message": "식단 구성 리스트에 추가되었습니다."
  }
  ```

#### 2.3.3 식사 시간 수정
- **URL**: `/api/meal-list/:id`
- **Method**: `PUT`
- **요청 본문**:
  ```json
  {
    "can_breakfast": 1,
    "can_lunch": 1,
    "can_dinner": 0,
    "is_active": 1,
    "memo": "여름에만 추천"
  }
  ```

---

### 2.4 음식 DB 관리 API

#### 2.4.1 음식 목록 조회 (카테고리 필터)
- **URL**: `/api/foods`
- **Method**: `GET`
- **쿼리 파라미터**:
  - `category` (선택): `main_dish`, `side_dish`, `special`
  - `dish_type` (선택): `korean_dish`, `korean_tang`, `korean_jjigae`, `korean_guk`, `foreign`, `side`, `special`
  - `cuisine_origin` (선택): `korean`, `foreign`
  - `not_in_meal_list` (선택): `true` — meal_list에 없는 음식만 조회 (리스트 추가용)
- **요청 예시**: `GET /api/foods?category=main_dish&dish_type=korean_jjigae`
- **응답**:
  ```json
  [
    {
      "id": 1,
      "name": "김치찌개",
      "food_category": "main_dish",
      "dish_type": "korean_jjigae",
      "cuisine_origin": "korean",
      "is_weekend_special": 0,
      "image_url": "...",
      "source_site": "10000recipe",
      "created_at": "2026-03-22T10:00:00"
    }
  ]
  ```

#### 2.4.2 음식 등록
- **URL**: `/api/foods`
- **Method**: `POST`
- **요청 본문**:
  ```json
  {
    "name": "김치찌개",
    "food_category": "main_dish",
    "dish_type": "korean_jjigae",
    "cuisine_origin": "korean",
    "is_weekend_special": 0,
    "instructions": ["1. 돼지고기를 볶는다", "2. 김치를 넣고 볶는다"],
    "image_url": "...",
    "prep_time": "10분",
    "cook_time": "20분",
    "servings": 2,
    "ingredients": [
      { "ingredient_name": "김치", "quantity": 200, "unit": "g", "ingredient_type": "main" },
      { "ingredient_name": "돼지고기", "quantity": 150, "unit": "g", "ingredient_type": "main" },
      { "ingredient_name": "소금", "quantity": null, "unit": "약간", "ingredient_type": "seasoning" }
    ]
  }
  ```
- **응답**:
  ```json
  {
    "id": 5,
    "message": "음식이 등록되었습니다."
  }
  ```

#### 2.4.3 인터넷 레시피 검색
- **URL**: `/api/foods/search`
- **Method**: `GET`
- **설명**: 음식 이름으로 인터넷에서 레시피를 검색합니다. 결과는 DB에 저장되지 않으며, 사용자 확인 후 저장 여부를 선택합니다.
- **쿼리 파라미터**:
  - `name` (필수): 음식 이름 (한국어/영어 모두 지원)
  - `lang` (선택): `ko` 또는 `en` (미지정 시 자동 감지)
- **요청 예시**: `GET /api/foods/search?name=김치찌개`
- **응답**:
  ```json
  [
    {
      "name": "김치찌개",
      "ingredients": [
        { "name": "김치", "quantity": "200g", "ingredient_type": "main" },
        { "name": "돼지고기", "quantity": "150g", "ingredient_type": "main" },
        { "name": "소금", "quantity": "약간", "ingredient_type": "seasoning" }
      ],
      "instructions": ["1. 돼지고기를 볶는다", "2. 김치를 넣고 볶는다", "3. 물을 붓고 끓인다"],
      "prep_time": "10분",
      "cook_time": "20분",
      "source_url": "https://www.10000recipe.com/recipe/12345",
      "source_site": "10000recipe",
      "image_url": "https://img.10000recipe.com/...",
      "suggested_category": "main_dish",
      "suggested_dish_type": "korean_jjigae"
    }
  ]
  ```

#### 2.4.4 검색된 레시피 저장
- **URL**: `/api/foods/fetch-and-save`
- **Method**: `POST`
- **요청 본문**:
  ```json
  {
    "recipeData": {
      "name": "김치찌개",
      "food_category": "main_dish",
      "dish_type": "korean_jjigae",
      "cuisine_origin": "korean",
      "ingredients": [...],
      "instructions": [...],
      "source_url": "https://www.10000recipe.com/recipe/12345",
      "source_site": "10000recipe"
    }
  }
  ```
- **응답**:
  ```json
  {
    "id": 5,
    "message": "레시피가 저장되었습니다."
  }
  ```

---

### 2.5 특별한 날 API [신규]

#### 2.5.1 연도별 특별한 날 목록 조회
- **URL**: `/api/holidays/:year`
- **Method**: `GET`
- **응답**:
  ```json
  [
    {
      "id": 1,
      "year": 2026,
      "holiday_key": "chuseok",
      "holiday_name": "추석",
      "start_date": "2026-10-04",
      "end_date": "2026-10-06"
    },
    {
      "id": 2,
      "year": 2026,
      "holiday_key": "seollal",
      "holiday_name": "설날",
      "start_date": "2026-01-28",
      "end_date": "2026-01-30"
    }
  ]
  ```

#### 2.5.2 날짜의 특별일 여부 확인
- **URL**: `/api/holidays/check`
- **Method**: `GET`
- **쿼리 파라미터**: `date` (필수): 확인할 날짜 (YYYY-MM-DD)
- **요청 예시**: `GET /api/holidays/check?date=2026-10-05`
- **응답**:
  ```json
  {
    "date": "2026-10-05",
    "is_holiday": true,
    "holiday": {
      "holiday_key": "chuseok",
      "holiday_name": "추석"
    }
  }
  ```

#### 2.5.3 특별한 날 추천 음식 조회
- **URL**: `/api/holidays/:key/suggestions`
- **Method**: `GET`
- **요청 예시**: `GET /api/holidays/chuseok/suggestions`
- **응답**:
  ```json
  [
    { "id": 1, "food_name": "송편", "recipe_id": null, "description": "추석 대표 떡", "display_order": 1 },
    { "id": 2, "food_name": "갈비찜", "recipe_id": 15, "description": "추석 차례 음식", "display_order": 2 },
    { "id": 3, "food_name": "잡채", "recipe_id": 20, "description": "명절 대표 음식", "display_order": 3 }
  ]
  ```

---

### 2.6 주말 특식 API [신규]

#### 2.6.1 전체 특식 목록 조회
- **URL**: `/api/weekend-specials`
- **Method**: `GET`
- **응답**:
  ```json
  [
    { "id": 1, "food_name": "짜장면", "recipe_id": null, "description": "주말 특식의 대표", "is_active": 1, "display_order": 1 },
    { "id": 2, "food_name": "탕수육", "recipe_id": null, "description": "짜장면과 함께 인기", "is_active": 1, "display_order": 2 },
    { "id": 3, "food_name": "피자", "recipe_id": null, "description": "가족 주말 외식", "is_active": 1, "display_order": 3 }
  ]
  ```

#### 2.6.2 특식 추가
- **URL**: `/api/weekend-specials`
- **Method**: `POST`
- **요청 본문**:
  ```json
  {
    "food_name": "스테이크",
    "recipe_id": null,
    "description": "주말 특별 요리",
    "display_order": 5
  }
  ```

---

### 2.7 재료 가격 API

#### 2.7.1 재료 가격 목록 조회
- **URL**: `/api/ingredients`
- **Method**: `GET`
- **응답**:
  ```json
  [
    {
      "id": 1,
      "ingredient_name": "돼지고기",
      "purchase_quantity": 500,
      "unit": "g",
      "price": 9800,
      "price_per_unit": 19.6,
      "updated_at": "2026-03-22T10:00:00"
    }
  ]
  ```

#### 2.7.2 가격 등록
- **URL**: `/api/ingredients`
- **Method**: `POST`
- **요청 본문**:
  ```json
  {
    "ingredient_name": "돼지고기",
    "purchase_quantity": 500,
    "unit": "g",
    "price": 9800
  }
  ```
- **응답**:
  ```json
  {
    "id": 1,
    "price_per_unit": 19.6,
    "message": "가격이 등록되었습니다."
  }
  ```

---

## 3. 오류 처리

### 3.1 일반 오류 응답 형식
```json
{
  "error": "오류 메시지",
  "code": "오류 코드"
}
```

### 3.2 주요 오류 코드

| 상태 코드 | 오류 코드 | 설명 |
|----------|-----------|------|
| 400 | INVALID_INPUT | 잘못된 입력 값 |
| 404 | NOT_FOUND | 요청한 리소스를 찾을 수 없음 |
| 409 | ALREADY_EXISTS | 이미 존재하는 데이터 (meal_list 중복 등) |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |
| 502 | EXTERNAL_API_ERROR | 외부 API (Spoonacular 등) 오류 |

---

## 4. 인증 및 보안

현재 버전에서는 인증을 구현하지 않으며, 향후 확장을 고려하여 설계합니다.
외부 API 키는 서버 환경 변수(.env)에만 저장하고, 클라이언트에는 절대 노출하지 않습니다.

---

## 5. 화면별 API 사용 패턴

| 화면 | 사용 API |
|------|---------|
| 기본화면 (/) | `GET /api/today-meal` |
| 관리화면 - 달력 | `GET /api/calendar/:year/:month` |
| 관리화면 - 식단 상세 | `GET /api/meal-plans/:date` |
| 관리화면 - 식단 생성 | `POST /api/meal-plans/generate` |
| 식단 구성 리스트 | `GET/POST/PUT/DELETE /api/meal-list` |
| 음식 등록 - 검색 | `GET /api/foods/search` |
| 음식 등록 - 저장 | `POST /api/foods/fetch-and-save` |
| 전체 음식 DB | `GET/POST/PUT/DELETE /api/foods` |
| 재료 가격 관리 | `GET/POST/PUT/DELETE /api/ingredients` |
| 특별한 날 관리 | `GET/PUT/POST /api/holidays/*` |
| 주말 특식 관리 | `GET/POST/PUT/DELETE /api/weekend-specials` |
