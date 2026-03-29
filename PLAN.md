# 자동 식단 생성 웹사이트 — 전체 구현 계획서

**작성일**: 2026-03-26
**버전**: v1.0
**기준 코드베이스 분석일**: 2026-03-26

---

## 1. 프로젝트 개요 및 목표

### 1.1 프로젝트 설명

사용자가 큐레이션한 음식 리스트(meal_list)를 기반으로 일일 식단을 자동 생성하는 웹 애플리케이션입니다.
인터넷에서 레시피와 재료를 자동 수집하고, 메인요리/반찬/야식 등 카테고리로 분류하여 조식·중식·석식·야식 + 반찬 4개를 구성하는 일일 식단을 자동으로 만들어 줍니다.
명절/기념일 특식 제안 및 주말 특식 추천 기능도 포함합니다.

### 1.2 핵심 설계 원칙 (v4.0 기준)

| 원칙 | 설명 |
|------|------|
| **2단계 음식 리스트** | 전체 음식 DB(recipes)와 식단 구성 리스트(meal_list)를 분리. 식단 생성은 meal_list에서만 |
| **세부 음식 분류** | 한국요리: 요리/탕/찌개/국 세분화. 외국요리: 단일 분류. 면요리: 국(korean_guk)으로 분류 |
| **반찬 4개 자동 추천** | 식단 생성 시 반찬 리스트에서 4개 자동 배정, 수정 가능 |
| **식사 시간 지정** | 메인요리는 meal_list 등록 시 조식/중식/석식 복수 선택 가능 |
| **특별일 제안** | 추석/설날/크리스마스/추수감사절에 해당 명절 음식 별도 제안 (강제 적용 아님) |
| **주말 특식 제안** | 토/일에 시스템 특식 목록(짜장면, 탕수육 등)에서 별도 제안 |
| **인풋 기반 페이징** | 오프셋 페이징 대신 커서(ID) 기반 페이징으로 성능 및 일관성 확보 |

### 1.3 목표 사용자 환경

- **기준 해상도**: 아이패드 가로 모드 (1024×768px ~ 1366px)
- **브라우저**: Chrome, Safari, Edge 최신 버전
- **포트**: 4000번

---

## 2. 현재 코드베이스 분석

### 2.1 현재 파일 구조

```
C:\Develop\diet\
├── src/
│   ├── app.js                          ← Express 서버 진입점 (최소 구현)
│   ├── controllers/
│   │   └── MealListController.js       ← meal_list CRUD 컨트롤러 (오프셋 페이징)
│   ├── models/
│   │   ├── db.js                       ← MariaDB 연결 풀
│   │   ├── MealList.js                 ← meal_list 모델 (오프셋 페이징)
│   │   └── Recipe.js                   ← 레시피 모델 (v4.0 스키마 미반영)
│   ├── routes/
│   │   └── mealListRoutes.js           ← meal_list 라우트
│   ├── services/
│   │   └── recipeScraper.js            ← allrecipes/epicurious 스크래퍼 (구버전)
│   └── utils/                          ← 비어 있음
├── views/
│   ├── index.ejs                       ← 기본 홈 뷰 (최소 구현)
│   └── meal-list/
│       └── index.ejs                   ← meal_list 관리 뷰 (스켈레톤)
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── docs/
│   ├── database_schema.md              ← v4.0 완성 스키마 문서
│   ├── database_schema_updates.md      ← 구버전 스키마 변경 계획 (참고용)
│   ├── internet_recipe_search_feature.md
│   └── planning/
│       ├── requirements_analysis.md    ← v4.0 요구사항 (완성)
│       ├── architecture_design.md      ← 아키텍처 설계 (완성)
│       ├── api_design.md              ← v4.0 API 설계 (완성)
│       ├── ui_design.md               ← UI/UX 설계
│       ├── project_plan_summary.md
│       └── setup_completion_report.md
│   └── implementation/
│       └── meal_list_implementation_plan.md
├── CLAUDE.md
├── RESEARCH.md
├── code_update.md
├── talk_history.md
└── package.json
```

### 2.2 현재 구현 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| DB 연결 (db.js) | 완료 | MariaDB 연결 풀 설정 |
| MealList 모델 | 부분 완료 | 오프셋 페이징 → 인풋 기반으로 교체 필요 |
| Recipe 모델 | 불완전 | v4.0 스키마(food_category, dish_type 등) 미반영 |
| MealListController | 부분 완료 | 오프셋 페이징 → 인풋 기반으로 교체 필요 |
| mealListRoutes | 완료 | 라우트 정의 완료 |
| recipeScraper | 구버전 | allrecipes/epicurious만 지원. 만개의레시피 미지원 |
| app.js | 최소 구현 | meal-list 라우트만 등록. 나머지 라우트 없음 |
| views/index.ejs | 최소 구현 | 기본 HTML 골격만 있음 |
| 식단 생성 서비스 | 미구현 | MealPlanService 없음 |
| 재료비 계산 서비스 | 미구현 | CostService 없음 |
| 특별일/주말 특식 | 미구현 | HolidayService 없음 |

### 2.3 문제점 및 개선 필요사항

1. **오프셋 페이징 사용 중**: `MealList.js`와 `MealListController.js`에서 `LIMIT ? OFFSET ?` 방식 사용 → **인풋 기반 페이징(커서 기반)으로 전면 교체 필요**
2. **Recipe 모델 v4.0 미반영**: `meal_type ENUM('breakfast','lunch','dinner','side','snack')` 구버전 구조 사용. `food_category`, `dish_type`, `cuisine_origin` 등 신규 컬럼 미반영
3. **누락된 npm 패키지**: `package.json`에 `axios`, `cheerio`가 없음. recipeScraper.js에서 require하여 런타임 오류 발생
4. **미구현 서비스**: 식단 자동 생성(MealPlanService), 재료비 계산(CostService), 특별일(HolidayService), 주말 특식(WeekendSpecialService) 모두 미구현
5. **app.js 라우트 미등록**: foods, meal-plans, calendar, ingredients, holidays, weekend-specials 라우트 모두 미등록
6. **뷰 최소 구현**: EJS 뷰가 골격만 있고 실제 렌더링 로직 없음

---

## 3. 데이터베이스 스키마 설계

### 3.1 전체 테이블 DDL

```sql
-- =============================================
-- 1. recipes 테이블 (v4.0 전면 개정)
-- 전체 음식 DB. 인터넷 수집, 수동 등록 포함 모든 음식 저장
-- =============================================
CREATE TABLE recipes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL
                    COMMENT '음식명',

    -- 음식 분류
    food_category   ENUM('main_dish', 'side_dish', 'special') NOT NULL DEFAULT 'main_dish'
                    COMMENT '메인요리/반찬/야식별식 구분',
    dish_type       ENUM(
                        'korean_dish',    -- 한식 일반요리 (볶음/구이/튀김/무침)
                        'korean_tang',    -- 한식 탕/찜 (설렁탕, 갈비탕, 갈비찜)
                        'korean_jjigae',  -- 한식 찌개/전골 (김치찌개, 된장찌개)
                        'korean_guk',     -- 한식 국/면 (미역국, 라면, 칼국수, 냉면)
                        'foreign',        -- 외국요리 (파스타, 피자, 스테이크)
                        'side',           -- 반찬 (김치, 나물, 볶음, 조림)
                        'special'         -- 야식/별식 (치킨, 떡볶이, 족발)
                    ) NOT NULL DEFAULT 'korean_dish'
                    COMMENT '음식 세부 유형 (면 요리는 korean_guk으로 분류)',
    cuisine_origin  ENUM('korean', 'foreign') NOT NULL DEFAULT 'korean'
                    COMMENT '한국/외국 요리 구분',
    is_weekend_special TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '1=주말 특식 목록에도 포함',

    -- 조리 정보
    instructions    TEXT
                    COMMENT '조리 방법 (JSON 배열: ["1. ...", "2. ..."])',
    image_url       VARCHAR(500)
                    COMMENT '음식 대표 사진 URL',
    prep_time       VARCHAR(50)
                    COMMENT '준비 시간 (예: 10분)',
    cook_time       VARCHAR(50)
                    COMMENT '조리 시간 (예: 20분)',
    servings        INT DEFAULT 2
                    COMMENT '기준 인원수',
    cuisine_type    VARCHAR(100)
                    COMMENT '요리 종류 (한식, 양식, 중식 등)',

    -- 출처 정보
    source_url      VARCHAR(500)
                    COMMENT '레시피 출처 URL',
    source_site     VARCHAR(100)
                    COMMENT '출처 사이트명 (10000recipe, spoonacular 등)',
    is_auto_fetched TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '0=수동 입력, 1=인터넷 자동 수집',

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    COMMENT '등록 시간',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
                    COMMENT '수정 시간',

    INDEX idx_food_category (food_category),
    INDEX idx_dish_type (dish_type),
    INDEX idx_cuisine_origin (cuisine_origin)
);

-- =============================================
-- 2. recipe_ingredients 테이블
-- 레시피별 재료 상세 정보. 메인재료와 양념 구분
-- =============================================
CREATE TABLE recipe_ingredients (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL
                    COMMENT '레시피 ID (recipes.id)',
    ingredient_name VARCHAR(255) NOT NULL
                    COMMENT '재료명 (예: 김치, 돼지고기)',
    quantity        DECIMAL(10, 2)
                    COMMENT '필요 용량 (숫자)',
    unit            VARCHAR(20)
                    COMMENT '단위 (g, ml, 개, 스푼, 약간 등)',
    ingredient_type ENUM('main', 'seasoning') NOT NULL DEFAULT 'main'
                    COMMENT 'main=메인재료(가격산정 대상), seasoning=양념(가격산정 제외)',
    original_text   VARCHAR(255)
                    COMMENT '스크래핑 원본 텍스트',
    sort_order      INT DEFAULT 0
                    COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_ingredient_type (ingredient_type)
);

-- =============================================
-- 3. meal_list 테이블 (핵심 — 식단 구성 리스트)
-- 실제 식단 생성에 사용할 음식들을 큐레이션하는 리스트
-- =============================================
CREATE TABLE meal_list (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL
                    COMMENT '전체 DB의 레시피 ID (recipes.id)',
    can_breakfast   TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '조식 추천 허용 여부',
    can_lunch       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '중식 추천 허용 여부',
    can_dinner      TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '석식 추천 허용 여부',
    is_active       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '현재 리스트 활성 여부',
    memo            VARCHAR(255)
                    COMMENT '메모 (예: 여름에만 추천)',
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    COMMENT '리스트 추가 시간',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_recipe_id (recipe_id),
    INDEX idx_can_breakfast (can_breakfast),
    INDEX idx_can_lunch (can_lunch),
    INDEX idx_can_dinner (can_dinner)
);

-- =============================================
-- 4. meal_plans 테이블 (v4.0 수정)
-- 날짜별 식단 계획 저장. 반찬 4개는 meal_plan_sides에 별도 저장
-- =============================================
CREATE TABLE meal_plans (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    plan_date       DATE NOT NULL
                    COMMENT '식단 날짜',
    breakfast_id    INT
                    COMMENT '조식 레시피 ID (null=미지정)',
    lunch_id        INT
                    COMMENT '중식 레시피 ID (null=미지정)',
    dinner_id       INT
                    COMMENT '석식 레시피 ID (null=미지정)',
    snack_id        INT
                    COMMENT '야식 레시피 ID (null=미지정)',
    total_cost      DECIMAL(10, 2)
                    COMMENT '총 재료비 (메인요리 + 반찬 4개 메인재료 합산, 원)',
    is_generated    TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '0=수동 작성, 1=자동 생성',
    has_holiday     TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '1=특별한 날(명절/기념일) 포함',
    holiday_key     VARCHAR(50)
                    COMMENT '특별한 날 키 (chuseok, seollal, christmas, thanksgiving)',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    COMMENT '생성 시간',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
                    COMMENT '수정 시간',
    UNIQUE KEY uk_plan_date (plan_date),
    FOREIGN KEY (breakfast_id) REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (lunch_id)     REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (dinner_id)    REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (snack_id)     REFERENCES recipes(id) ON DELETE SET NULL
);

-- =============================================
-- 5. meal_plan_sides 테이블 (신규)
-- 식단별 반찬 4개 저장. meal_plans와 1:N 관계
-- =============================================
CREATE TABLE meal_plan_sides (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    plan_id     INT NOT NULL
                COMMENT '식단 ID (meal_plans.id)',
    recipe_id   INT NOT NULL
                COMMENT '반찬 레시피 ID (food_category=side_dish)',
    sort_order  INT NOT NULL DEFAULT 0
                COMMENT '표시 순서 (1~4)',
    FOREIGN KEY (plan_id)   REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)   ON DELETE CASCADE,
    INDEX idx_plan_id (plan_id)
);

-- =============================================
-- 6. ingredient_prices 테이블
-- 재료별 구매 가격 정보. 재료비 자동 산정에 사용
-- =============================================
CREATE TABLE ingredient_prices (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name     VARCHAR(255) NOT NULL
                        COMMENT '재료명 (recipe_ingredients.ingredient_name과 매칭)',
    purchase_quantity   DECIMAL(10, 2) NOT NULL
                        COMMENT '구매 기준 용량',
    unit                VARCHAR(20) NOT NULL
                        COMMENT '단위 (g, ml, 개)',
    price               DECIMAL(10, 2) NOT NULL
                        COMMENT '구매 가격 (원)',
    price_per_unit      DECIMAL(10, 4)
                        COMMENT '단위당 가격 = price / purchase_quantity (자동 계산)',
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP
                        COMMENT '가격 최종 업데이트 시간',
    UNIQUE KEY uk_ingredient_name (ingredient_name),
    INDEX idx_ingredient_name (ingredient_name)
);

-- =============================================
-- 7. holiday_calendar 테이블 (신규)
-- 추석, 설날, 크리스마스, 추수감사절 날짜 관리
-- =============================================
CREATE TABLE holiday_calendar (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    year            INT NOT NULL
                    COMMENT '연도',
    holiday_key     VARCHAR(50) NOT NULL
                    COMMENT '고유 키 (chuseok, seollal, christmas, thanksgiving)',
    holiday_name    VARCHAR(100) NOT NULL
                    COMMENT '표시 명칭',
    start_date      DATE NOT NULL
                    COMMENT '시작 날짜',
    end_date        DATE NOT NULL
                    COMMENT '종료 날짜',
    UNIQUE KEY uk_year_holiday (year, holiday_key)
);

-- =============================================
-- 8. holiday_suggestions 테이블 (신규)
-- 특별한 날에 제안할 음식 목록
-- =============================================
CREATE TABLE holiday_suggestions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    holiday_key     VARCHAR(50) NOT NULL
                    COMMENT '특별한 날 키',
    food_name       VARCHAR(255) NOT NULL
                    COMMENT '추천 음식명',
    recipe_id       INT
                    COMMENT '전체 DB 레시피 연결 (없으면 NULL)',
    description     VARCHAR(500)
                    COMMENT '설명',
    display_order   INT NOT NULL DEFAULT 0
                    COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    INDEX idx_holiday_key (holiday_key)
);

-- =============================================
-- 9. weekend_specials 테이블 (신규)
-- 주말에 별도 제안할 특식 목록
-- =============================================
CREATE TABLE weekend_specials (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    food_name       VARCHAR(255) NOT NULL
                    COMMENT '특식 음식명',
    recipe_id       INT
                    COMMENT '레시피 연결 (없으면 NULL)',
    description     VARCHAR(500)
                    COMMENT '설명',
    is_active       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '활성 여부',
    display_order   INT NOT NULL DEFAULT 0
                    COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);

-- =============================================
-- 10. external_api_keys 테이블
-- 외부 레시피 API 키 관리
-- =============================================
CREATE TABLE external_api_keys (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    service_name    VARCHAR(100) NOT NULL
                    COMMENT '서비스명 (spoonacular, naver 등)',
    api_key         VARCHAR(500)
                    COMMENT 'API 키 (민감 정보)',
    extra_key       VARCHAR(500)
                    COMMENT '추가 키 (네이버 Client Secret 등)',
    is_active       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '1=활성, 0=비활성',
    last_tested     TIMESTAMP
                    COMMENT 'API 연결 마지막 테스트 시간',
    test_result     VARCHAR(255)
                    COMMENT '테스트 결과 메시지',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_service_name (service_name)
);
```

### 3.2 테이블 관계도

```
recipes (1) ──────────────────────── (N) recipe_ingredients
   │                                              │
   │                                   ingredient_name 매칭
   │ (1)                                          ↓
   ├── (N) meal_list                    ingredient_prices
   │         │ (식단 구성 리스트)
   │         ↓ 여기서만 선택
   │
meal_plans
  ├── breakfast_id → recipes.id
  ├── lunch_id     → recipes.id
  ├── dinner_id    → recipes.id
  └── snack_id     → recipes.id
        │
        └── (N) meal_plan_sides → recipes.id  (반찬 4개)

holiday_calendar (1) ─── (N) holiday_suggestions → recipes.id (선택)
weekend_specials → recipes.id (선택)
external_api_keys (독립 테이블)
```

### 3.3 인덱스 설계 요약

| 테이블 | 인덱스 컬럼 | 목적 |
|--------|------------|------|
| recipes | food_category, dish_type, cuisine_origin | 카테고리 필터 |
| recipe_ingredients | recipe_id, ingredient_type | 재료 조회, 메인/양념 구분 |
| meal_list | recipe_id (UNIQUE), can_breakfast, can_lunch, can_dinner | 식사별 필터, 중복 방지 |
| meal_plans | plan_date (UNIQUE) | 날짜 중복 방지 |
| meal_plan_sides | plan_id | 식단별 반찬 조회 |
| ingredient_prices | ingredient_name (UNIQUE) | 재료명 빠른 검색 |
| holiday_suggestions | holiday_key | 명절별 조회 |

---

## 4. API 설계

### 4.1 전체 엔드포인트 목록

#### 기본화면 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/today-meal` | GET | 오늘 식단 + 반찬 + 주말/명절 제안 |
| `/api/meal/:date` | GET | 특정 날짜 식단 조회 |

#### 식단 관리 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/meal-plans` | GET | 식단 목록 (인풋 기반 페이징) |
| `/api/meal-plans/:date` | GET | 특정 날짜 식단 (반찬 포함) |
| `/api/meal-plans/generate` | POST | 식단 자동 생성 |
| `/api/meal-plans` | POST | 식단 수동 저장 |
| `/api/meal-plans/:date` | PUT | 식단 수정 |
| `/api/meal-plans/:date` | DELETE | 식단 삭제 |
| `/api/meal-plans/:date/cost` | GET | 날짜별 재료비 상세 |
| `/api/calendar/:year/:month` | GET | 월별 달력 데이터 |

#### 식단 구성 리스트 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/meal-list` | GET | 리스트 조회 (인풋 기반 페이징) |
| `/api/meal-list/not-in-list` | GET | meal_list 미등록 레시피 조회 (인풋 기반 페이징) |
| `/api/meal-list` | POST | 리스트에 음식 추가 |
| `/api/meal-list/:id` | PUT | 식사 시간 등 수정 |
| `/api/meal-list/:id` | DELETE | 리스트에서 제거 |

#### 음식 DB 관리 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/foods` | GET | 전체 음식 DB 목록 (인풋 기반 페이징) |
| `/api/foods/:id` | GET | 특정 음식 상세 조회 |
| `/api/foods` | POST | 음식 등록 |
| `/api/foods/:id` | PUT | 음식 수정 |
| `/api/foods/:id` | DELETE | 음식 삭제 |
| `/api/foods/search` | GET | 인터넷 레시피 검색 |
| `/api/foods/fetch-and-save` | POST | 검색 결과 저장 |
| `/api/foods/bulk-scrape` | POST | 대량 스크래핑 시작 |

#### 특별한 날 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/holidays/:year` | GET | 연도별 특별한 날 목록 |
| `/api/holidays/check` | GET | 날짜의 특별일 여부 확인 |
| `/api/holidays/:key/suggestions` | GET | 특별한 날 추천 음식 |
| `/api/holidays/:year/:key` | PUT | 날짜 등록/수정 |
| `/api/holidays/:key/suggestions` | POST | 추천 음식 추가 |
| `/api/holidays/:key/suggestions/:id` | DELETE | 추천 음식 삭제 |

#### 주말 특식 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/weekend-specials` | GET | 전체 특식 목록 |
| `/api/weekend-specials` | POST | 특식 추가 |
| `/api/weekend-specials/:id` | PUT | 특식 수정 |
| `/api/weekend-specials/:id` | DELETE | 특식 삭제 |

#### 재료 가격 API
| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/api/ingredients` | GET | 재료 가격 목록 (인풋 기반 페이징) |
| `/api/ingredients` | POST | 가격 등록 |
| `/api/ingredients/:id` | PUT | 가격 수정 |
| `/api/ingredients/:id` | DELETE | 삭제 |

### 4.2 주요 API 요청/응답 형식

#### 오늘의 식단 조회 응답
```json
{
  "date": "2026-03-26",
  "is_weekend": false,
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
  "weekend_specials": null,
  "holiday_suggestions": null
}
```

#### 식단 자동 생성 요청/응답
```json
// 요청
POST /api/meal-plans/generate
{
  "start_date": "2026-04-01",
  "end_date": "2026-04-07"
}

// 응답
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
      "has_holiday": false
    }
  ]
}
```

#### 인풋 기반 페이징 API 응답 형식
```json
{
  "success": true,
  "data": {
    "items": [...],
    "hasMore": true,
    "nextCursor": 42
  }
}
```

---

## 5. 인풋 기반 페이징(Input-based Pagination) 구현

### 5.1 오프셋 페이징 vs 인풋 기반 페이징 비교

| 항목 | 오프셋 페이징 (현재) | 인풋 기반 페이징 (목표) |
|------|---------------------|------------------------|
| 파라미터 | `page=2&limit=10` | `lastId=42&limit=10` |
| DB 쿼리 | `LIMIT 10 OFFSET 10` | `WHERE id < 42 ORDER BY id DESC LIMIT 11` |
| 일관성 | 조회 중 데이터 변경 시 중복/누락 발생 | 커서 기준이므로 일관성 보장 |
| 성능 | OFFSET 증가 시 풀스캔 발생 | 인덱스 활용으로 일정한 성능 |
| "다음 페이지 존재 여부" | totalCount 별도 쿼리 필요 | limit+1 조회로 즉시 판단 |
| 무한 스크롤 지원 | 구현 복잡 | 자연스럽게 지원 |

**결론**: 오프셋 페이징의 가장 큰 문제는 OFFSET이 커질수록 DB 성능이 저하되고, 목록 중간에 삽입/삭제 시 데이터 중복 또는 누락이 발생하는 것입니다. 인풋 기반 페이징은 마지막으로 받은 항목의 ID(커서)를 기준으로 다음 페이지를 조회하여 이 문제를 해결합니다.

### 5.2 인풋 기반 페이징 구현 원칙

- `lastId`: 마지막으로 받은 항목의 ID. 없으면 `null` (첫 페이지)
- `limit`: 페이지당 아이템 수 (기본 20)
- **limit+1개 조회**: 실제로 `limit + 1`개를 조회하여 다음 페이지 존재 여부를 판단
- `hasMore`: `rows.length > limit`이면 true
- `nextCursor`: 다음 페이지 시작점. `hasMore`가 true일 때 마지막 아이템의 ID
- `ORDER BY id DESC`: 최신순 정렬 기준. 필요에 따라 `added_at DESC`도 사용

### 5.3 모델 계층 구현 코드 스니펫

**파일**: `C:\Develop\diet\src\models\MealList.js` (교체)

```javascript
// MealList.js - 식단 구성 리스트 데이터베이스 모델
// 인풋 기반 페이징(커서 기반) 적용 — 오프셋 페이징 전면 교체

class MealList {
    constructor(db) {
        this.db = db;
    }

    /**
     * meal_list 항목 목록 조회 — 인풋 기반 페이징
     * @param {Object} params
     * @param {number|null} params.lastId - 마지막 항목 ID (null이면 첫 페이지)
     * @param {number} params.limit - 페이지당 항목 수 (기본 20)
     * @param {string|null} params.category - 카테고리 필터 (main_dish, side_dish, special)
     * @param {string|null} params.dishType - 요리 유형 필터
     * @returns {{ items: Array, hasMore: boolean, nextCursor: number|null }}
     */
    async getAllItems({ lastId = null, limit = 20, category = null, dishType = null } = {}) {
        const params = [];

        let whereClause = 'WHERE 1=1';

        // 커서 조건: lastId보다 작은 ID만 조회 (최신순 정렬이므로)
        if (lastId) {
            whereClause += ' AND ml.id < ?';
            params.push(lastId);
        }

        if (category) {
            whereClause += ' AND r.food_category = ?';
            params.push(category);
        }

        if (dishType) {
            whereClause += ' AND r.dish_type = ?';
            params.push(dishType);
        }

        // limit+1개 조회하여 hasMore 판단
        params.push(limit + 1);

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
                ml.added_at,
                r.image_url
            FROM meal_list ml
            JOIN recipes r ON ml.recipe_id = r.id
            ${whereClause}
            ORDER BY ml.id DESC
            LIMIT ?
        `;

        const rows = await this.db.query(query, params);

        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return { items, hasMore, nextCursor };
    }

    // 새 항목 추가 (변경 없음)
    async addItem(recipeId, canBreakfast = 0, canLunch = 1, canDinner = 1, isActive = 1, memo = '') {
        const query = `
            INSERT INTO meal_list (recipe_id, can_breakfast, can_lunch, can_dinner, is_active, memo)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return await this.db.query(query, [recipeId, canBreakfast, canLunch, canDinner, isActive, memo]);
    }

    // 특정 항목 조회 (변경 없음)
    async getItemById(id) {
        const query = `
            SELECT ml.*, r.name, r.food_category, r.dish_type, r.cuisine_origin
            FROM meal_list ml
            JOIN recipes r ON ml.recipe_id = r.id
            WHERE ml.id = ?
        `;
        const rows = await this.db.query(query, [id]);
        return rows[0];
    }

    // 항목 업데이트 (변경 없음)
    async updateItem(id, canBreakfast, canLunch, canDinner, isActive, memo) {
        const query = `
            UPDATE meal_list
            SET can_breakfast = ?, can_lunch = ?, can_dinner = ?, is_active = ?, memo = ?
            WHERE id = ?
        `;
        return await this.db.query(query, [canBreakfast, canLunch, canDinner, isActive, memo, id]);
    }

    // 항목 제거 (변경 없음)
    async removeItem(id) {
        return await this.db.query('DELETE FROM meal_list WHERE id = ?', [id]);
    }

    // recipe_id 존재 여부 확인 (변경 없음)
    async isRecipeInMealList(recipeId) {
        const rows = await this.db.query(
            'SELECT COUNT(*) as count FROM meal_list WHERE recipe_id = ?',
            [recipeId]
        );
        return rows[0].count > 0;
    }
}

module.exports = MealList;
```

### 5.4 컨트롤러 계층 구현 코드 스니펫

**파일**: `C:\Develop\diet\src\controllers\MealListController.js` (교체)

```javascript
// MealListController.js - 식단 구성 리스트 컨트롤러
// 인풋 기반 페이징 적용 — page/offset 방식 제거

class MealListController {
    constructor() {
        this.mealListModel = new MealList(pool);
        this.recipeModel = new Recipe(pool);
    }

    // GET /api/meal-list?lastId=42&limit=20&category=main_dish
    async getAllItems(req, res) {
        try {
            // lastId: 문자열로 오므로 정수 변환. 없으면 null (첫 페이지)
            const lastId = req.query.lastId ? parseInt(req.query.lastId) : null;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100); // 최대 100
            const category = req.query.category || null;
            const dishType = req.query.dish_type || null;

            const result = await this.mealListModel.getAllItems({ lastId, limit, category, dishType });

            res.json({
                success: true,
                data: result  // { items, hasMore, nextCursor }
            });
        } catch (error) {
            console.error('meal-list 조회 오류:', error);
            res.status(500).json({ success: false, error: '식단 구성 리스트 조회 중 오류가 발생했습니다.' });
        }
    }

    // GET /api/meal-list/not-in-list?lastId=10&limit=20&category=main_dish
    async getRecipesNotInMealList(req, res) {
        try {
            const lastId = req.query.lastId ? parseInt(req.query.lastId) : null;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const category = req.query.category || null;
            const dishType = req.query.dish_type || null;

            const params = [];
            let whereClause = 'WHERE NOT EXISTS (SELECT 1 FROM meal_list ml WHERE ml.recipe_id = r.id)';

            if (lastId) {
                whereClause += ' AND r.id < ?';
                params.push(lastId);
            }
            if (category) {
                whereClause += ' AND r.food_category = ?';
                params.push(category);
            }
            if (dishType) {
                whereClause += ' AND r.dish_type = ?';
                params.push(dishType);
            }

            params.push(limit + 1);
            const query = `SELECT * FROM recipes r ${whereClause} ORDER BY r.id DESC LIMIT ?`;
            const rows = await this.recipeModel.db.query(query, params);

            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const nextCursor = hasMore ? items[items.length - 1].id : null;

            res.json({
                success: true,
                data: { items, hasMore, nextCursor }
            });
        } catch (error) {
            console.error('not-in-list 조회 오류:', error);
            res.status(500).json({ success: false, error: 'meal_list 미등록 레시피 조회 중 오류가 발생했습니다.' });
        }
    }
}
```

### 5.5 클라이언트 측 인풋 기반 페이징 구현

**파일**: `C:\Develop\diet\public\js\mealList.js` (신규)

```javascript
// mealList.js - 식단 구성 리스트 클라이언트 페이징
// 인풋 기반 페이징: 다음 페이지 로드 시 nextCursor를 lastId로 사용

let currentCursor = null;  // null = 첫 페이지
let hasMore = true;
let isLoading = false;

async function loadMealList(reset = false) {
    if (isLoading || (!hasMore && !reset)) return;

    if (reset) {
        currentCursor = null;
        hasMore = true;
        document.getElementById('meal-list-container').innerHTML = '';
    }

    isLoading = true;

    const params = new URLSearchParams({
        limit: 20,
        ...(currentCursor ? { lastId: currentCursor } : {}),
        ...(currentCategory ? { category: currentCategory } : {})
    });

    const response = await fetch(`/api/meal-list?${params}`);
    const { data } = await response.json();

    // 아이템 렌더링
    data.items.forEach(item => renderMealListItem(item));

    // 다음 페이지 상태 업데이트
    hasMore = data.hasMore;
    currentCursor = data.nextCursor;

    // "더 보기" 버튼 상태 업데이트
    document.getElementById('load-more-btn').style.display = hasMore ? 'block' : 'none';

    isLoading = false;
}

// 초기 로드
loadMealList(true);

// "더 보기" 버튼 클릭 시 다음 페이지 로드
document.getElementById('load-more-btn').addEventListener('click', () => loadMealList());
```

### 5.6 API 요청/응답 예시

#### 첫 페이지 요청 (lastId 없음)
```
GET /api/meal-list?limit=20&category=main_dish
```

```json
{
  "success": true,
  "data": {
    "items": [
      { "id": 50, "name": "김치찌개", "food_category": "main_dish", ... },
      { "id": 49, "name": "된장찌개", "food_category": "main_dish", ... },
      ...
    ],
    "hasMore": true,
    "nextCursor": 31
  }
}
```

#### 두 번째 페이지 요청 (lastId = 31)
```
GET /api/meal-list?lastId=31&limit=20&category=main_dish
```

```json
{
  "success": true,
  "data": {
    "items": [
      { "id": 30, "name": "비빔밥", "food_category": "main_dish", ... },
      ...
    ],
    "hasMore": false,
    "nextCursor": null
  }
}
```

---

## 6. 백엔드 구현 계획

### 6.1 수정될 파일 목록

| 파일 경로 | 작업 유형 | 주요 변경 내용 |
|----------|----------|---------------|
| `src/app.js` | 수정 | 모든 라우트 등록, DB 연결 테스트, 에러 미들웨어 추가 |
| `src/models/MealList.js` | 수정 | 오프셋 → 인풋 기반 페이징 교체 |
| `src/models/Recipe.js` | 수정 | v4.0 스키마 반영 (food_category, dish_type 등) |
| `src/controllers/MealListController.js` | 수정 | 인풋 기반 페이징 파라미터 처리 |
| `package.json` | 수정 | axios, cheerio 의존성 추가 |
| `src/models/RecipeIngredient.js` | 신규 | recipe_ingredients 테이블 모델 |
| `src/models/MealPlan.js` | 신규 | meal_plans + meal_plan_sides 모델 |
| `src/models/IngredientPrice.js` | 신규 | ingredient_prices 모델 |
| `src/models/Holiday.js` | 신규 | holiday_calendar + holiday_suggestions 모델 |
| `src/models/WeekendSpecial.js` | 신규 | weekend_specials 모델 |
| `src/services/MealPlanService.js` | 신규 | 식단 자동 생성 알고리즘 |
| `src/services/CostService.js` | 신규 | 재료비 계산 서비스 |
| `src/services/HolidayService.js` | 신규 | 특별일 판정 서비스 |
| `src/services/recipeScraper.js` | 수정 | 만개의레시피, Spoonacular API 지원 추가 |
| `src/controllers/FoodController.js` | 신규 | 음식 CRUD + 레시피 검색 컨트롤러 |
| `src/controllers/MealPlanController.js` | 신규 | 식단 생성/조회/수정 컨트롤러 |
| `src/controllers/IngredientController.js` | 신규 | 재료 가격 관리 컨트롤러 |
| `src/controllers/HolidayController.js` | 신규 | 특별일/주말 특식 컨트롤러 |
| `src/routes/foodRoutes.js` | 신규 | /api/foods 라우트 |
| `src/routes/mealPlanRoutes.js` | 신규 | /api/meal-plans, /api/calendar 라우트 |
| `src/routes/ingredientRoutes.js` | 신규 | /api/ingredients 라우트 |
| `src/routes/holidayRoutes.js` | 신규 | /api/holidays, /api/weekend-specials 라우트 |

### 6.2 app.js 수정 내용

**파일**: `C:\Develop\diet\src\app.js`

```javascript
// app.js - Express 서버 진입점 (v2.0)
// 모든 라우트 등록 및 미들웨어 설정

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./models/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 뷰 엔진
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 라우트 등록
const mealListRoutes = require('./routes/mealListRoutes');
const foodRoutes = require('./routes/foodRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const holidayRoutes = require('./routes/holidayRoutes');

app.use('/api/meal-list', mealListRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api', mealPlanRoutes);       // /api/meal-plans, /api/calendar, /api/today-meal
app.use('/api/ingredients', ingredientRoutes);
app.use('/api', holidayRoutes);        // /api/holidays, /api/weekend-specials

// 페이지 라우트
app.get('/', (req, res) => res.render('index'));
app.get('/admin/meal-plan', (req, res) => res.render('admin/meal-plan'));
app.get('/admin/meal-list', (req, res) => res.render('admin/meal-list'));
app.get('/admin/foods', (req, res) => res.render('admin/foods'));
app.get('/admin/ingredients', (req, res) => res.render('admin/ingredients'));
app.get('/admin/holiday', (req, res) => res.render('admin/holiday'));
app.get('/admin/settings', (req, res) => res.render('admin/settings'));

// 에러 미들웨어
app.use((err, req, res, next) => {
    console.error('서버 오류:', err.stack);
    res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다.' });
});

// 서버 시작
async function startServer() {
    await testConnection();
    app.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
}

startServer();
module.exports = app;
```

### 6.3 MealPlanService 핵심 로직

**파일**: `C:\Develop\diet\src\services\MealPlanService.js` (신규)

```javascript
// MealPlanService.js - 식단 자동 생성 서비스
// meal_list에서 식사 유형별 랜덤 선택, 최근 3일 중복 방지

class MealPlanService {
    /**
     * 특정 날짜 범위의 식단 자동 생성
     * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
     * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
     */
    async generateMealPlans(startDate, endDate) {
        const dates = this.getDateRange(startDate, endDate);
        const results = [];

        // 최근 3일 사용된 음식 ID 추적 (중복 방지)
        const recentUsed = { breakfast: [], lunch: [], dinner: [], snack: [], sides: [] };

        for (const date of dates) {
            const dayOfWeek = new Date(date).getDay(); // 0=일, 6=토
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const holiday = await this.holidayService.checkHoliday(date);

            // meal_list에서 각 식사 유형별 랜덤 선택 (최근 3일 중복 제외)
            const breakfast = await this.pickRandom('can_breakfast', recentUsed.breakfast);
            const lunch     = await this.pickRandom('can_lunch',     recentUsed.lunch);
            const dinner    = await this.pickRandom('can_dinner',    recentUsed.dinner);
            const snack     = await this.pickRandomSpecial(recentUsed.snack);
            const sides     = await this.pickRandomSides(4, recentUsed.sides);

            // 재료비 계산
            const totalCost = await this.costService.calculateDailyCost(
                breakfast?.id, lunch?.id, dinner?.id, snack?.id,
                sides.map(s => s.id)
            );

            // DB 저장
            const plan = await this.mealPlanModel.createPlan({
                plan_date: date, breakfast_id: breakfast?.id,
                lunch_id: lunch?.id, dinner_id: dinner?.id,
                snack_id: snack?.id, total_cost: totalCost,
                is_generated: 1, has_holiday: holiday ? 1 : 0,
                holiday_key: holiday?.holiday_key || null
            });

            // 반찬 저장
            await this.mealPlanModel.saveSides(plan.id, sides);

            // 최근 사용 목록 업데이트 (3개 유지)
            this.updateRecentUsed(recentUsed, { breakfast, lunch, dinner, snack, sides });

            results.push({ date, breakfast: breakfast?.name, lunch: lunch?.name,
                dinner: dinner?.name, snack: snack?.name,
                sides: sides.map(s => s.name), total_cost: totalCost,
                has_holiday: !!holiday });
        }

        return results;
    }

    /**
     * 인풋 기반 페이징으로 meal_list에서 랜덤 선택
     * 전체 목록 중 최근 사용 제외 후 랜덤 1개 반환
     */
    async pickRandom(mealTimeFlag, excludeIds) {
        const query = `
            SELECT ml.recipe_id, r.name
            FROM meal_list ml
            JOIN recipes r ON ml.recipe_id = r.id
            WHERE ml.${mealTimeFlag} = 1 AND ml.is_active = 1
              AND ml.recipe_id NOT IN (${excludeIds.length ? excludeIds.join(',') : '0'})
            ORDER BY RAND()
            LIMIT 1
        `;
        const rows = await this.db.query(query);
        return rows[0] || null;
    }
}
```

### 6.4 package.json 수정 내용

**파일**: `C:\Develop\diet\package.json`

```json
{
  "name": "diet-planner",
  "version": "1.0.0",
  "description": "자동 식단 생성 웹사이트",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mariadb": "^3.2.0",
    "ejs": "^3.1.9",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2"
  }
}
```

---

## 7. 프론트엔드 구현 계획

### 7.1 EJS 템플릿 구조

```
views/
├── layouts/
│   └── main.ejs             ← 공통 레이아웃 (헤더, 네비, 푸터)
├── index.ejs                ← 기본화면 (오늘의 식단 + 달력)
├── admin/
│   ├── meal-plan.ejs        ← 식단 관리 (달력 + 자동 생성)
│   ├── meal-list/
│   │   └── index.ejs        ← 식단 구성 리스트 관리 (탭)
│   ├── foods.ejs            ← 전체 음식 DB 관리
│   ├── ingredients.ejs      ← 재료 가격 관리
│   ├── holiday.ejs          ← 특별한 날 관리
│   └── settings.ejs         ← 외부 API 키 관리
└── partials/
    ├── food-card.ejs        ← 음식 카드 컴포넌트
    ├── meal-detail.ejs      ← 식단 상세 표시 컴포넌트
    └── pagination.ejs       ← 인풋 기반 페이징 컴포넌트
```

### 7.2 기본화면(index.ejs) 주요 구성

```
┌─────────────────────────────────────────────────────────────┐
│  헤더: 자동 식단 생성기 | [관리] 버튼                        │
├───────────────────────────┬─────────────────────────────────┤
│  달력 섹션 (왼쪽)          │  식단 표시 섹션 (오른쪽)         │
│  [◀ 이전] 2026년 3월 [다음▶] │  선택 날짜: 2026-03-26        │
│  일 월 화 수 목 금 토      │  아침: 오트밀 🖼                 │
│  □  □  □  □  □  □ 🔪     │  점심: 김치찌개 🖼               │
│  🔪 🔪 🔪 🔪 🔪 🔪 🔪      │  저녁: 비빔밥 🖼                │
│  ...                      │  야식: —                        │
│                           │  반찬: 김치|나물|계란말이|멸치   │
│                           │  재료비: 12,500원               │
├───────────────────────────┴─────────────────────────────────┤
│  [주말 특식 배너] 토/일에만 표시: 짜장면, 탕수육, 피자       │
│  [명절 배너] 해당일에만 표시: 추석 음식 제안                 │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 식단 구성 리스트 뷰 (admin/meal-list/index.ejs)

```
┌─────────────────────────────────────────────────────────────┐
│  [메인요리 탭] [반찬 탭] [야식/별식 탭]                      │
├─────────────────────────────────────────────────────────────┤
│  필터: [전체▼] [한식-찌개▼]   [+ 음식 추가] 버튼            │
├──────┬──────┬────────────┬───────────┬──────┬──────────────┤
│ 음식명 │ 분류  │ 조식 │ 중식 │ 석식 │ 상태  │ 액션         │
├──────┼──────┼────────────┼───────────┼──────┼──────────────┤
│김치찌개│찌개  │  ☐  │  ☑  │  ☑  │ 활성  │ [수정][삭제] │
│된장찌개│찌개  │  ☐  │  ☑  │  ☑  │ 활성  │ [수정][삭제] │
│설렁탕  │탕   │  ☑  │  ☑  │  ☑  │ 활성  │ [수정][삭제] │
├──────┴──────┴────────────┴───────────┴──────┴──────────────┤
│  [더 보기] 버튼 (인풋 기반 페이징 — 다음 커서 기반 로드)     │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 CSS/JS 설계

**CSS 파일**: `C:\Develop\diet\public\css\style.css`
- 색상 시스템: 주색 #4CAF50 (녹색), 보조 #2196F3 (파란색)
- 배경: #F5F5F5, 텍스트: #333333
- 아이패드 가로 1024px 기준 레이아웃
- 터치 친화적 버튼 최소 44×44px

**JS 파일**:

| 파일 | 역할 |
|------|------|
| `public/js/calendar.js` | 달력 렌더링, 날짜 클릭 이벤트 |
| `public/js/mealPlan.js` | 식단 조회/생성/수정 |
| `public/js/mealList.js` | 식단 구성 리스트 관리 (인풋 기반 페이징) |
| `public/js/foods.js` | 음식 DB 검색, 레시피 조회 (인풋 기반 페이징) |
| `public/js/ingredients.js` | 재료 가격 관리 |
| `public/js/script.js` | 공통 유틸리티 함수 |

### 7.5 달력 인터페이스 구현

```javascript
// calendar.js - 달력 렌더링 및 식단 마커 표시
// 식단이 있는 날 칼/도마 아이콘(🔪) 표시

async function renderCalendar(year, month) {
    // GET /api/calendar/:year/:month 호출
    const response = await fetch(`/api/calendar/${year}/${month}`);
    const { days } = await response.json();

    days.forEach(day => {
        const cell = document.querySelector(`[data-date="${day.date}"]`);
        if (day.has_plan) {
            cell.classList.add('has-plan');
            cell.innerHTML += '<span class="meal-marker">🔪</span>';
        }
    });
}
```

---

## 8. 구현 순서 및 단계

### Phase 1: 데이터베이스 설정 (1일)

1. MariaDB에 v4.0 스키마 DDL 실행하여 테이블 생성
2. 기본 데이터 삽입:
   - `holiday_calendar`: 2026년 추석/설날/크리스마스/추수감사절 날짜
   - `holiday_suggestions`: 명절별 추천 음식 목록
   - `weekend_specials`: 짜장면, 탕수육, 피자 등 기본 특식 목록
3. `.env` 파일 DB 설정 확인

**수정 파일**: DB 스키마 실행 (MariaDB 클라이언트)

### Phase 2: package.json 및 기반 코드 수정 (1일)

1. `package.json`에 axios, cheerio 추가 후 `npm install`
2. `src/models/Recipe.js` v4.0 스키마 반영 (food_category, dish_type 등)
3. `src/models/MealList.js` 인풋 기반 페이징으로 교체
4. `src/controllers/MealListController.js` 인풋 기반 페이징 파라미터 처리

**수정 파일**:
- `C:\Develop\diet\package.json`
- `C:\Develop\diet\src\models\Recipe.js`
- `C:\Develop\diet\src\models\MealList.js`
- `C:\Develop\diet\src\controllers\MealListController.js`

### Phase 3: 신규 모델 및 서비스 생성 (2일)

1. 신규 모델 생성:
   - `src/models/RecipeIngredient.js` (recipe_ingredients 테이블)
   - `src/models/MealPlan.js` (meal_plans + meal_plan_sides 테이블)
   - `src/models/IngredientPrice.js` (ingredient_prices 테이블)
   - `src/models/Holiday.js` (holiday_calendar + suggestions 테이블)
   - `src/models/WeekendSpecial.js` (weekend_specials 테이블)
2. 신규 서비스 생성:
   - `src/services/MealPlanService.js` (식단 자동 생성 알고리즘)
   - `src/services/CostService.js` (재료비 계산)
   - `src/services/HolidayService.js` (특별일 판정)

**신규 파일**:
- `C:\Develop\diet\src\models\RecipeIngredient.js`
- `C:\Develop\diet\src\models\MealPlan.js`
- `C:\Develop\diet\src\models\IngredientPrice.js`
- `C:\Develop\diet\src\models\Holiday.js`
- `C:\Develop\diet\src\models\WeekendSpecial.js`
- `C:\Develop\diet\src\services\MealPlanService.js`
- `C:\Develop\diet\src\services\CostService.js`
- `C:\Develop\diet\src\services\HolidayService.js`

### Phase 4: 신규 컨트롤러 및 라우트 (2일)

1. 신규 컨트롤러 생성:
   - `FoodController.js`: 음식 CRUD + 레시피 검색
   - `MealPlanController.js`: 식단 생성/조회/수정
   - `IngredientController.js`: 재료 가격 관리
   - `HolidayController.js`: 특별일/주말 특식
2. 신규 라우트 생성:
   - `foodRoutes.js`, `mealPlanRoutes.js`, `ingredientRoutes.js`, `holidayRoutes.js`
3. `app.js` 업데이트: 모든 라우트 등록

**신규 파일**:
- `C:\Develop\diet\src\controllers\FoodController.js`
- `C:\Develop\diet\src\controllers\MealPlanController.js`
- `C:\Develop\diet\src\controllers\IngredientController.js`
- `C:\Develop\diet\src\controllers\HolidayController.js`
- `C:\Develop\diet\src\routes\foodRoutes.js`
- `C:\Develop\diet\src\routes\mealPlanRoutes.js`
- `C:\Develop\diet\src\routes\ingredientRoutes.js`
- `C:\Develop\diet\src\routes\holidayRoutes.js`

### Phase 5: 프론트엔드 구현 (3일)

1. 공통 레이아웃 (`views/layouts/main.ejs`) 작성
2. 기본화면 (`views/index.ejs`) — 달력 + 오늘 식단 표시
3. 관리화면:
   - `views/admin/meal-plan.ejs` — 식단 생성/관리
   - `views/admin/meal-list/index.ejs` — 식단 구성 리스트 (인풋 기반 페이징)
   - `views/admin/foods.ejs` — 전체 음식 DB
   - `views/admin/ingredients.ejs` — 재료 가격 관리
   - `views/admin/holiday.ejs` — 특별한 날 관리
4. CSS 스타일 (`public/css/style.css`)
5. 클라이언트 JS (`public/js/` 각 파일)

### Phase 6: 인터넷 레시피 수집 (2일)

1. `src/services/recipeScraper.js` 업데이트:
   - 만개의 레시피(10000recipe.com) 스크래퍼 추가 (한국 음식)
   - Spoonacular API 연동 추가 (영어 음식)
   - 메인재료/양념 자동 분류 로직 추가
2. 대량 스크래핑 SSE(Server-Sent Events) 진행상황 표시 구현
3. 재료 자동 파싱 (용량 + 단위 분리)

**수정 파일**:
- `C:\Develop\diet\src\services\recipeScraper.js`

### Phase 7: 테스트 및 마무리 (1일)

1. Jest 단위 테스트 작성 (MealPlanService, CostService)
2. API 통합 테스트
3. 아이패드 가로 모드 UI 검증
4. `code_update.md` 업데이트

---

## 9. 고려 사항 및 트레이드오프

### 9.1 기술적 고려사항

#### 인풋 기반 페이징 커서 선택
- **현재 선택**: `id` 컬럼 기반 커서 (단순하고 항상 인덱스 활용 가능)
- **대안**: `added_at` 타임스탬프 기반 커서 (가독성 좋으나 동일 시간 삽입 시 중복 가능)
- **트레이드오프**: `id` 기반은 "최신순" 정렬이 기본이므로, "오래된순" 정렬이 필요하면 `WHERE id > lastId ORDER BY id ASC`로 변경 필요

#### 식단 자동 생성 중복 방지
- **현재 방식**: 최근 3일 이내 동일 음식 반복 배정 방지
- **예외 처리**: meal_list에 같은 유형 음식이 3개 이하이면 중복 허용
- **트레이드오프**: 3일 제한이 너무 짧으면 반복이 빈번하고, 너무 길면 선택 폭이 좁아짐

#### 레시피 스크래핑 vs API
- **만개의 레시피**: HTML 스크래핑 방식. 사이트 구조 변경 시 유지보수 필요. 요청 간 딜레이 필수
- **Spoonacular API**: 하루 150포인트 제한 (무료). 초과 시 유료 플랜 필요
- **트레이드오프**: 안정성(API) vs 한국 레시피 품질(스크래핑)

### 9.2 성능 고려사항

#### DB 쿼리 최적화
- `meal_list.getAllItems()`에서 인덱스 활용: `WHERE ml.id < ? ORDER BY ml.id DESC LIMIT ?`
  - `meal_list.id`가 PK이므로 자동 인덱스 활용
- `NOT EXISTS` 서브쿼리: 음식 수가 많아지면 성능 저하 가능. 필요 시 LEFT JOIN + IS NULL 방식 고려

```sql
-- NOT EXISTS 대신 LEFT JOIN 방식 (성능 비교 후 선택)
SELECT r.*
FROM recipes r
LEFT JOIN meal_list ml ON r.id = ml.recipe_id
WHERE ml.id IS NULL
  AND r.id < ?
ORDER BY r.id DESC
LIMIT ?
```

#### 재료비 계산 캐싱
- 식단 생성 시 `total_cost`를 `meal_plans` 테이블에 저장하여 재계산 방지
- `ingredient_prices` 변경 시 관련 식단의 `total_cost` 재산정 필요 (배치 또는 트리거)

#### 대량 스크래핑 비동기 처리
- 대량 스크래핑은 Node.js 이벤트 루프 블로킹 방지를 위해 작업 큐 처리
- SSE(Server-Sent Events)로 진행 상황 클라이언트에 실시간 전송

### 9.3 보안 고려사항

#### SQL 인젝션 방지
- 모든 DB 쿼리에서 파라미터 바인딩(`?`) 사용. 동적 컬럼명(mealTimeFlag)은 허용 목록 검증

```javascript
// 안전하지 않은 방식 (절대 사용 금지)
query += ` AND ml.${dishType} = ?`;  // dishType이 외부 입력이면 위험

// 안전한 방식 — 허용 목록 검증
const ALLOWED_DISH_TYPES = ['korean_dish', 'korean_tang', 'korean_jjigae', 'korean_guk', 'foreign', 'side', 'special'];
if (dishType && !ALLOWED_DISH_TYPES.includes(dishType)) {
    return res.status(400).json({ error: '유효하지 않은 dish_type 값입니다.' });
}
```

#### 외부 API 키 보안
- Spoonacular API 키, 네이버 Client Secret은 `.env` 파일에만 저장
- `.gitignore`에 `.env` 포함 필수
- `external_api_keys` 테이블의 api_key는 DB에 평문 저장 (로컬 서버 기준. 보안 강화 필요 시 암호화 검토)

#### 스크래핑 윤리
- 만개의 레시피 요청 간 딜레이: 최소 1~2초 (서버 부하 방지)
- `source_url` 저장으로 출처 추적
- 레시피 출처 사이트명 항상 표시

#### 입력 검증
- 모든 API 엔드포인트에서 필수 파라미터 검증
- ENUM 값(food_category, dish_type 등)은 허용 목록으로만 허용
- 날짜 형식(YYYY-MM-DD) 정규식 검증

### 9.4 유지보수 고려사항

#### 모듈 분리 원칙
- 파일당 단일 기능: 모델, 서비스, 컨트롤러를 1:1:1로 대응
- 파일 최대 3000줄 제한 준수 (CLAUDE.md 가이드라인)
- 서비스 계층에 비즈니스 로직 집중 (컨트롤러는 요청/응답만 처리)

#### 코드 주석
- 모든 함수에 한국어 주석 필수 (CLAUDE.md 가이드라인)
- JSDoc 형식으로 파라미터 및 반환값 명시

#### 환경 변수 목록 (.env 필수 항목)
```
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=diet_planner
SPOONACULAR_API_KEY=your_key
NAVER_CLIENT_ID=your_id
NAVER_CLIENT_SECRET=your_secret
```

---

*이 계획서는 2026-03-26 기준 코드베이스를 분석하여 작성되었습니다. 구현 진행에 따라 갱신이 필요합니다.*
