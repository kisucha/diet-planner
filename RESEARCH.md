# 자동 식단 생성 웹사이트 - 종합 연구 보고서

**최종 업데이트**: 2026-03-22
**버전**: v4.0 (음식 분류 시스템, 식단 리스트, 특별일/주말 제안 전면 반영)

---

## 1. 프로젝트 개요

사용자가 등록한 음식을 기반으로 일정 기간의 식단을 자동 생성하고, 관련 재료 및 비용을 산출하는 웹 기반 식단 관리 시스템.

### 핵심 설계 원칙 (v4.0 추가)

| 원칙 | 설명 |
|------|------|
| **2단계 음식 리스트** | 전체 음식 DB ≠ 식단 구성 리스트. 반드시 구분 |
| **세부 음식 분류** | 한국요리는 요리/탕/찌개/국으로 세분화, 외국요리는 단일 |
| **반찬 4개 자동 추천** | 식단 생성 시 반찬 리스트에서 4개 자동 추천, 수정 가능 |
| **식사 시간 지정** | 메인요리는 리스트 등록 시 조식/중식/석식 지정 (복수 선택) |
| **특별일 음식 제안** | 추석/설날/크리스마스/추수감사절에 특별 음식 자동 제안 |
| **주말 특식 제안** | 주말에는 리스트 추천 + 시스템 특식(짜장면, 탕수육 등) 별도 제안 |

---

## 2. 음식 분류 시스템 (v4.0 핵심)

### 2.1 전체 분류 체계

```
전체 음식 DB (recipes 테이블)
│
├── 메인요리 (food_category = 'main_dish')
│   ├── 한국요리 (cuisine_origin = 'korean')
│   │   ├── 요리 (dish_type = 'korean_dish')
│   │   │   예: 불고기, 제육볶음, 닭갈비, 잡채
│   │   ├── 탕 (dish_type = 'korean_tang')
│   │   │   예: 설렁탕, 갈비탕, 삼계탕, 갈비찜
│   │   ├── 찌개 (dish_type = 'korean_jjigae')
│   │   │   예: 김치찌개, 된장찌개, 부대찌개, 순두부찌개
│   │   └── 국 (dish_type = 'korean_guk')  ← 면 요리 포함
│   │       예: 미역국, 콩나물국, 라면, 칼국수, 냉면, 우동
│   └── 외국요리 (cuisine_origin = 'foreign')
│       └── 요리 (dish_type = 'foreign')   ← 단일 분류
│           예: 파스타, 피자, 스테이크, 카레, 볶음밥
│
├── 반찬 (food_category = 'side_dish', dish_type = 'side')
│   예: 김치, 깍두기, 시금치나물, 멸치볶음, 계란말이, 감자조림
│
└── 야식/별식 (food_category = 'special', dish_type = 'special')
    예: 치킨, 떡볶이, 순대, 피자(야식용), 족발
```

### 2.2 면 요리 분류 규칙

> **면 요리는 국(korean_guk)으로 분류**

라면, 칼국수, 우동, 소면, 냉면, 짬뽕 → `dish_type = 'korean_guk'`

단, 짜장면은 외국 유래이지만 한국화된 음식. 이 경우:
- 메인요리(korean_guk)로 분류하되 주말 특식으로도 표시 가능

---

## 3. 2단계 음식 리스트 시스템 (핵심 개념)

### 3.1 전체 음식 DB vs 식단 구성 리스트

```
┌──────────────────────────────────────────────────────┐
│  전체 음식 DB (recipes 테이블)                       │
│  - 등록된 모든 음식                                  │
│  - 인터넷에서 가져온 음식 포함                       │
│  - 대량 스크래핑으로 수집된 음식 포함                │
│  - 수백~수천 개 존재 가능                           │
└──────────────────────┬───────────────────────────────┘
                       │ 사용자가 직접 선택하여 추가
                       │ (언제든 변경 가능)
                       ▼
┌──────────────────────────────────────────────────────┐
│  식단 구성 리스트 (meal_list 테이블)                 │
│  - 실제 식단 생성에 사용할 음식들만 모아둔 큐레이션  │
│  - 메인요리: 몇 십 개 수준                          │
│  - 반찬: 몇 십 개 수준                              │
│  - 언제든지 추가/제거 가능                          │
└──────────────────────┬───────────────────────────────┘
                       │ 여기서만 선택
                       ▼
┌──────────────────────────────────────────────────────┐
│  식단 (meal_plans 테이블)                            │
│  - 날짜별 실제 식단                                  │
│  - 조식/중식/석식/야식/반찬(4개)                   │
└──────────────────────────────────────────────────────┘
```

### 3.2 meal_list 등록 규칙

**메인요리 등록 시**:
- 조식/중식/석식 중 1개 이상 반드시 선택 (복수 선택 가능)
- 선택된 식사 시간에만 추천됨

**반찬 등록 시**:
- 식사 시간 선택 불필요 (모든 식사에 반찬으로 포함)

**야식/별식 등록 시**:
- 식사 시간 선택 불필요 (야식으로만 추천)

### 3.3 meal_list에서의 식사 시간 예시

```
meal_list 예시:

  음식명        can_조식  can_중식  can_석식  비고
  ──────────────────────────────────────────────
  오트밀          ✓        ✗        ✗       조식 전용
  샌드위치        ✓        ✓        ✗       조식/중식
  김치찌개        ✗        ✓        ✓       중식/석식
  된장찌개        ✗        ✓        ✓       중식/석식
  비빔밥          ✗        ✓        ✓       중식/석식
  잡채            ✗        ✗        ✓       석식 전용
  설렁탕          ✓        ✓        ✓       모든 식사
  냉면            ✗        ✓        ✗       중식 전용
```

---

## 4. 식단 자동 생성 알고리즘 (v4.0 전면 개정)

### 4.1 전체 흐름

```
입력: 날짜 (또는 날짜 범위)
    ↓
① 날짜 성격 분석
  - 평일인가? 주말(토/일)인가?
  - 특별한 날(추석/설날/크리스마스/추수감사절)인가?
    ↓
② 메인요리 선택 (meal_list 메인요리에서만)
  - 조식: can_breakfast=1인 메인요리 중 랜덤 1개
           (최근 3일 이내 같은 음식 제외)
  - 중식: can_lunch=1인 메인요리 중 랜덤 1개
  - 석식: can_dinner=1인 메인요리 중 랜덤 1개
  - 야식: meal_list 야식/별식 중 랜덤 1개 (없으면 null)
    ↓
③ 반찬 선택 (meal_list 반찬에서만)
  - 4개 랜덤 선택 (최근 3일 이내 같은 반찬 제외)
    ↓
④ 특별한 날 제안 추가 (별도 섹션)
  - 해당 날짜가 특별한 날이면 → holiday_suggestions에서 제안 목록 추가
  - 이 제안은 실제 식단에 강제 포함되지 않고 "제안" 형태로 별도 표시
  - 사용자가 제안을 실제 식단으로 교체 가능
    ↓
⑤ 주말 특식 제안 추가 (토/일만)
  - meal_list 일반 추천 그대로 유지하면서
  - 시스템 특식 목록(weekend_specials)에서 3~5개 별도 제안
  - "오늘의 특식 추천" 섹션으로 별도 표시
    ↓
⑥ 비용 계산
  - 선택된 메인요리 + 반찬 4개의 메인재료 비용 합산
    ↓
⑦ DB 저장 및 결과 반환
```

### 4.2 중복 방지 로직 상세

```
최근 N일 체크:
  SELECT recipe_id FROM meal_plans MP
  JOIN meal_plan_sides MPS ON MP.id = MPS.plan_id
  WHERE MP.plan_date BETWEEN (target_date - 3 days) AND (target_date - 1 day)

→ 조식: breakfast_id 최근 3일 제외
→ 중식: lunch_id 최근 3일 제외
→ 석식: dinner_id 최근 3일 제외
→ 반찬: meal_plan_sides의 recipe_id 최근 3일 제외
→ 야식: snack_id 최근 3일 제외

예외: meal_list에 해당 식사 유형 음식이 3개 이하면 중복 허용
```

---

## 5. 특별한 날 제안 시스템

### 5.1 지원하는 특별한 날

| 명절/기념일 | 날짜 기준 | 대표 음식 |
|------------|----------|----------|
| **추석** | 음력 8월 15일 (±2일) | 송편, 갈비찜, 잡채, 전, 나물 |
| **설날** | 음력 1월 1일 (±2일) | 떡국, 갈비찜, 잡채, 전류 |
| **크리스마스** | 12월 25일 (±1일) | 로스트 치킨, 스테이크, 케이크, 샐러드 |
| **추수감사절** | 11월 넷째 목요일 | 로스트 터키, 호박파이, 매쉬드 포테이토 |

### 5.2 날짜 계산 방법

| 명절 | 계산 방법 |
|------|----------|
| 추석/설날 | `holiday_calendar` 테이블에 매년 날짜 수동 등록 (음력 계산 복잡하므로) |
| 크리스마스 | 12월 25일 고정 (코드로 계산) |
| 추수감사절 | 11월의 첫 번째 목요일 + 21일 (코드로 계산) |

### 5.3 제안 표시 방식

```
[식단 생성 결과 화면]

📅 2026-09-29 (추석 당일)

[ 오늘의 식단 ]         [ 🎑 추석 특별 제안 ]
 조식: 설렁탕            → 송편 (추석 대표 음식)
 중식: 비빔밥            → 갈비찜
 석식: 된장찌개          → 잡채
 반찬: 4개 표시          → 각종 전 (녹두전, 동그랑땡)

 [이 식단으로 저장]     [추석 음식으로 교체]
```

---

## 6. 주말 특식 제안 시스템

### 6.1 주말 특식 개념

> 평소에는 자주 먹지 않지만 특별한 날(주말) 먹기 좋은 음식

시스템이 미리 보유하는 특식 목록 (사용자 추가/수정 가능):

```
주말 특식 기본 목록:
  짜장면, 탕수육, 짬뽕
  피자 (마르게리타, 페퍼로니 등)
  스테이크
  초밥/회
  삼겹살 구이
  치킨 (양념/후라이드)
  햄버거
  파스타 (카르보나라, 토마토 등)
  갈비구이
```

### 6.2 주말 식단 생성 방식

```
주말(토/일) 식단 생성:

[ 일반 식단 추천 ]          [ 🍽️ 주말 특식 제안 ]
 - meal_list에서 정상 추천    - 시스템 특식 목록에서 3~5개
 - 중복 방지 로직 동일 적용   - meal_list에 없어도 제안 가능
                              - 사용자가 선택하면 식단에 교체

 [이 식단으로 저장]          [특식으로 식단 변경]
```

### 6.3 meal_list에 있는 음식과의 관계

- 주말 특식으로 제안된 음식이 meal_list에도 있으면 → 자동 통합 표시
- meal_list에 없는 특식 → "🆕 제안" 뱃지 표시, 선택 시 안내 표시
  - "이 음식은 전체 DB에 등록 후 사용 가능합니다" 또는 임시 추가

---

## 7. 전체 시스템 아키텍처 (v4.0)

### 7.1 화면 구조

```
/ (기본화면)
  → 오늘 날짜 식단 표시 (조식·중식·석식·야식·반찬 4개)
  → 음식 클릭 시 사진 + 레시피 + 재료 표시
  → 주말 특식 제안 배너 (토/일만 표시)
  → 특별한 날 제안 배너 (해당일만 표시)

/admin (관리 메인)
├── /admin/meal-plan        ← 식단 생성 및 달력 관리
├── /admin/foods            ← 전체 음식 DB 관리 (등록/수정/삭제)
├── /admin/meal-list        ← 식단 구성 리스트 관리 (NEW)
├── /admin/ingredients      ← 재료 가격 관리
├── /admin/holiday          ← 특별한 날 음식 설정 (NEW)
└── /admin/settings         ← API 키 설정
```

### 7.2 계층 구조 (MVC + Service)

```
클라이언트 (iPad 1024×768 기준)
    ↓ HTTP (REST API)
Express.js 서버 (포트 4000)
│
├── Routes (7개)
│   ├── indexRoutes.js          → / 기본화면
│   ├── mealPlanRoutes.js       → /admin/meal-plan
│   ├── foodRoutes.js           → /admin/foods
│   ├── mealListRoutes.js       → /admin/meal-list  [신규]
│   ├── ingredientRoutes.js     → /admin/ingredients
│   ├── holidayRoutes.js        → /admin/holiday    [신규]
│   └── settingsRoutes.js       → /admin/settings
│
├── Controllers (6개)
│   ├── mealPlanController.js
│   ├── foodController.js
│   ├── mealListController.js   [신규]
│   ├── ingredientController.js
│   ├── holidayController.js    [신규]
│   └── settingsController.js
│
├── Services (6개)
│   ├── mealPlanService.js          ← 식단 자동 생성 (v4.0 개정)
│   ├── costCalculationService.js   ← 재료비 계산
│   ├── recipeScraper.js            ← 인터넷 레시피 수집
│   ├── ingredientClassifier.js     ← 메인재료/양념 분류
│   ├── holidayService.js           ← 특별일 감지 + 제안 [신규]
│   └── weekendSpecialService.js    ← 주말 특식 제안 [신규]
│
└── Models (8개)
    ├── db.js
    ├── Recipe.js
    ├── MealList.js         [신규]
    ├── MealPlan.js
    ├── MealPlanSide.js     [신규]
    ├── Ingredient.js
    ├── Holiday.js          [신규]
    └── ApiKey.js
```

---

## 8. 데이터베이스 스키마 (v4.0 전면 개정)

### 8.1 전체 테이블 목록

| 테이블명 | 역할 | 신규/기존 |
|---------|------|---------|
| `recipes` | 전체 음식 DB | 기존 + 컬럼 추가 |
| `recipe_ingredients` | 레시피별 재료 (메인/양념 구분) | 기존 |
| `meal_list` | 식단 구성 전용 리스트 | **신규** |
| `meal_plans` | 날짜별 식단 | 기존 수정 |
| `meal_plan_sides` | 식단별 반찬 4개 | **신규** |
| `ingredient_prices` | 재료 가격 | 기존 |
| `holiday_calendar` | 특별한 날 날짜 목록 | **신규** |
| `holiday_suggestions` | 특별한 날 추천 음식 | **신규** |
| `weekend_specials` | 주말 특식 목록 | **신규** |
| `external_api_keys` | 외부 API 키 | 기존 |

### 8.2 recipes 테이블 (v4.0 확장)

```sql
CREATE TABLE recipes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL           COMMENT '음식명',

    -- 음식 분류 (v4.0 추가)
    food_category   ENUM('main_dish','side_dish','special') NOT NULL DEFAULT 'main_dish'
                                                    COMMENT '메인요리/반찬/야식별식',
    dish_type       ENUM(
                        'korean_dish',   -- 한식 일반요리 (볶음/구이/튀김)
                        'korean_tang',   -- 한식 탕/찜
                        'korean_jjigae', -- 한식 찌개/전골
                        'korean_guk',    -- 한식 국/면요리(라면,칼국수 포함)
                        'foreign',       -- 외국요리 (단일 분류)
                        'side',          -- 반찬
                        'special'        -- 야식/별식
                    ) NOT NULL DEFAULT 'korean_dish'
                                                    COMMENT '음식 세부 유형',
    cuisine_origin  ENUM('korean','foreign') NOT NULL DEFAULT 'korean'
                                                    COMMENT '한국/외국 요리 구분',
    is_weekend_special TINYINT(1) NOT NULL DEFAULT 0
                                                    COMMENT '1=주말 특식 목록에 포함',

    -- 조리 정보
    instructions    TEXT                            COMMENT '조리 방법 (JSON 배열)',
    image_url       VARCHAR(500)                    COMMENT '음식 사진 URL',
    prep_time       VARCHAR(50)                     COMMENT '준비 시간',
    cook_time       VARCHAR(50)                     COMMENT '조리 시간',
    servings        INT DEFAULT 2                   COMMENT '기준 인원수',

    -- 출처 정보
    source_url      VARCHAR(500)                    COMMENT '레시피 출처 URL',
    source_site     VARCHAR(100)                    COMMENT '출처 사이트명',
    is_auto_fetched TINYINT(1) NOT NULL DEFAULT 0   COMMENT '0=수동, 1=자동수집',

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_food_category (food_category),
    INDEX idx_dish_type (dish_type),
    INDEX idx_cuisine_origin (cuisine_origin)
);
```

### 8.3 meal_list 테이블 (신규 - 핵심)

```sql
CREATE TABLE meal_list (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL                    COMMENT '전체 DB의 레시피 ID',
    can_breakfast   TINYINT(1) NOT NULL DEFAULT 0   COMMENT '조식 추천 허용 여부 (메인요리만)',
    can_lunch       TINYINT(1) NOT NULL DEFAULT 1   COMMENT '중식 추천 허용 여부 (메인요리만)',
    can_dinner      TINYINT(1) NOT NULL DEFAULT 1   COMMENT '석식 추천 허용 여부 (메인요리만)',
    is_active       TINYINT(1) NOT NULL DEFAULT 1   COMMENT '현재 리스트 활성 여부',
    memo            VARCHAR(255)                    COMMENT '메모 (예: 여름에만 추천)',
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_recipe_id (recipe_id),
    INDEX idx_can_breakfast (can_breakfast),
    INDEX idx_can_lunch (can_lunch),
    INDEX idx_can_dinner (can_dinner)
);
```

> **중요**: 반찬(side_dish)과 야식(special)은 can_breakfast/can_lunch/can_dinner 값을 사용하지 않습니다. `food_category`로 자동 구분됩니다.

### 8.4 meal_plans 테이블 (수정)

```sql
CREATE TABLE meal_plans (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    plan_date       DATE NOT NULL                   COMMENT '식단 날짜',
    breakfast_id    INT                             COMMENT '조식 레시피 ID',
    lunch_id        INT                             COMMENT '중식 레시피 ID',
    dinner_id       INT                             COMMENT '석식 레시피 ID',
    snack_id        INT                             COMMENT '야식 레시피 ID',
    -- 반찬 4개는 meal_plan_sides 테이블에 별도 저장
    total_cost      DECIMAL(10,2)                   COMMENT '총 재료비 (메인요리+반찬 모두)',
    is_generated    TINYINT(1) NOT NULL DEFAULT 0   COMMENT '0=수동, 1=자동생성',
    has_holiday     TINYINT(1) NOT NULL DEFAULT 0   COMMENT '1=특별한 날 포함',
    holiday_key     VARCHAR(50)                     COMMENT '해당 특별한 날 키 (chuseok 등)',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plan_date (plan_date),
    FOREIGN KEY (breakfast_id) REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (lunch_id)     REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (dinner_id)    REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (snack_id)     REFERENCES recipes(id) ON DELETE SET NULL
);
```

### 8.5 meal_plan_sides 테이블 (신규)

```sql
CREATE TABLE meal_plan_sides (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    plan_id     INT NOT NULL                    COMMENT '식단 ID',
    recipe_id   INT NOT NULL                    COMMENT '반찬 레시피 ID',
    sort_order  INT NOT NULL DEFAULT 0          COMMENT '표시 순서 (1~4)',
    FOREIGN KEY (plan_id)   REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)   ON DELETE CASCADE,
    INDEX idx_plan_id (plan_id)
);
```

### 8.6 holiday_calendar 테이블 (신규)

```sql
CREATE TABLE holiday_calendar (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    year            INT NOT NULL                    COMMENT '연도',
    holiday_key     VARCHAR(50) NOT NULL            COMMENT '고유 키 (chuseok, seollal 등)',
    holiday_name    VARCHAR(100) NOT NULL           COMMENT '명칭 (추석, 설날 등)',
    start_date      DATE NOT NULL                   COMMENT '시작 날짜',
    end_date        DATE NOT NULL                   COMMENT '종료 날짜 (1일이면 start=end)',
    UNIQUE KEY uk_year_holiday (year, holiday_key)
);
```

**사전 등록 데이터 예시**:

| year | holiday_key | holiday_name | start_date | end_date |
|------|-------------|-------------|------------|----------|
| 2026 | chuseok | 추석 | 2026-10-04 | 2026-10-06 |
| 2026 | seollal | 설날 | 2026-01-28 | 2026-01-30 |
| 2026 | christmas | 크리스마스 | 2026-12-25 | 2026-12-25 |
| 2026 | thanksgiving | 추수감사절 | 2026-11-26 | 2026-11-26 |

> 크리스마스와 추수감사절은 매년 코드로 계산 가능하지만, 일관성을 위해 테이블에 함께 관리

### 8.7 holiday_suggestions 테이블 (신규)

```sql
CREATE TABLE holiday_suggestions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    holiday_key     VARCHAR(50) NOT NULL            COMMENT '특별한 날 키',
    food_name       VARCHAR(255) NOT NULL           COMMENT '추천 음식명',
    recipe_id       INT                             COMMENT '레시피 DB에 있으면 연결',
    description     VARCHAR(500)                    COMMENT '설명',
    display_order   INT NOT NULL DEFAULT 0          COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    INDEX idx_holiday_key (holiday_key)
);
```

**사전 등록 데이터 예시**:

| holiday_key | food_name | description |
|-------------|----------|-------------|
| chuseok | 송편 | 추석 대표 떡 |
| chuseok | 갈비찜 | 추석 차례 음식 |
| chuseok | 잡채 | 명절 대표 음식 |
| seollal | 떡국 | 설날에 먹는 국 |
| seollal | 갈비찜 | 설날 차례 음식 |
| christmas | 로스트 치킨 | 크리스마스 대표 음식 |
| christmas | 스테이크 | 크리스마스 특식 |
| thanksgiving | 로스트 터키 | 추수감사절 대표 음식 |
| thanksgiving | 호박파이 | 추수감사절 디저트 |

### 8.8 weekend_specials 테이블 (신규)

```sql
CREATE TABLE weekend_specials (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    food_name       VARCHAR(255) NOT NULL           COMMENT '특식 음식명',
    recipe_id       INT                             COMMENT '레시피 DB에 있으면 연결',
    description     VARCHAR(500)                    COMMENT '설명',
    is_active       TINYINT(1) NOT NULL DEFAULT 1   COMMENT '활성 여부',
    display_order   INT NOT NULL DEFAULT 0          COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);
```

**사전 등록 데이터 예시**:

| food_name | description |
|----------|-------------|
| 짜장면 | 주말 특식의 대표 |
| 탕수육 | 짜장면 세트로 인기 |
| 짬뽕 | 얼큰한 주말 특식 |
| 피자 | 가족 주말 외식 |
| 스테이크 | 주말 특별 요리 |
| 초밥/회 | 주말 고급 식사 |
| 삼겹살 구이 | 주말 바비큐 |
| 치킨 | 주말 대표 음식 |
| 햄버거 | 패스트푸드 특식 |
| 갈비구이 | 주말 외식 대표 |

---

## 9. 화면별 상세 설계 (v4.0)

### 9.1 기본화면 (/) — iPad 가로 1024×768px

```
┌─────────────────────────────────────────────────────────────────────┐
│  자동 식단 생성기    오늘: 2026-03-22 (일요일)    [관리화면] 버튼   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────── 오늘의 식단 ──────────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │ 🌅 조식  │  │ ☀️ 중식  │  │ 🌙 석식  │  │ 🌙 야식  │    │  │
│  │  │          │  │          │  │          │  │          │    │  │
│  │  │ 오트밀   │  │ 김치찌개 │  │ 비빔밥   │  │ 미지정   │    │  │
│  │  │ [상세▼]  │  │ [상세▼]  │  │ [상세▼]  │  │          │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  │                                                               │  │
│  │  반찬  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │  │
│  │  (4개) │ 김치   │ │시금치  │ │계란말이│ │멸치볶음│         │  │
│  │        └────────┘ └────────┘ └────────┘ └────────┘         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── 🍽️ 주말 특식 제안 (일요일) ────────────────────────────────   │
│  │  짜장면  │  탕수육  │  피자  │  스테이크  │  [더보기]         │  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                     │
│  ┌──────── 음식 상세 패널 (클릭 시 나타남) ──────────────────────┐  │
│  │ ← 닫기        김치찌개                                        │  │
│  │ [사진]   📋 조리 방법 1,2,3...                                │  │
│  │          [▼ 재료 자세히 보기]                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**특별한 날 배너 (해당일만 표시)**:
```
── 🎑 추석 특별 제안 ──────────────────────────────────────────
│  오늘은 추석입니다! 명절 음식을 추천해 드립니다.              │
│  송편  갈비찜  잡채  각종 전   [식단에 적용하기]              │
───────────────────────────────────────────────────────────────
```

### 9.2 식단 구성 리스트 관리 화면 (/admin/meal-list) [신규]

```
┌─────────────────────────────────────────────────────────────────────┐
│  식단 구성 리스트 관리         [전체 음식 DB에서 추가] 버튼         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  탭: [메인요리] [반찬] [야식/별식]                                  │
│                                                                     │
│  ─── 메인요리 탭 ────────────────────────────────────────────────  │
│  분류 필터: [전체] [한식-요리] [한식-탕] [한식-찌개] [한식-국] [외식]│
│                                                                     │
│  ┌──────┬────────────┬────────────┬──────────────────┬─────────┐   │
│  │ 사진 │ 음식명     │ 분류       │ 추천 식사 시간   │ 액션   │   │
│  ├──────┼────────────┼────────────┼──────────────────┼─────────┤   │
│  │[img] │ 오트밀     │ 외국-요리  │ [조식✓][중식][석식]│[수정][삭제]│   │
│  │[img] │ 김치찌개   │ 한식-찌개  │ [조식][중식✓][석식✓]│[수정][삭제]│   │
│  │[img] │ 된장찌개   │ 한식-찌개  │ [조식][중식✓][석식✓]│[수정][삭제]│   │
│  │[img] │ 설렁탕     │ 한식-탕    │ [조식✓][중식✓][석식✓]│[수정][삭제]│   │
│  └──────┴────────────┴────────────┴──────────────────┴─────────┘   │
│                                                                     │
│  ─── 반찬 탭 ────────────────────────────────────────────────────  │
│  ┌──────┬────────────────────────────────────────────┬──────────┐  │
│  │ 사진 │ 반찬명                                     │ 액션    │  │
│  ├──────┼────────────────────────────────────────────┼──────────┤  │
│  │[img] │ 배추김치                                   │[삭제]   │  │
│  │[img] │ 시금치나물                                 │[삭제]   │  │
│  └──────┴────────────────────────────────────────────┴──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**전체 DB에서 추가 팝업**:
```
┌───────── 전체 음식 DB에서 선택 ─────────────────────────────────┐
│  검색: [___________]  분류: [전체▼]  원산지: [전체▼]            │
│                                                                 │
│  □ 비빔밥       (한식-요리)    □ 파스타      (외국-요리)        │
│  □ 갈비탕       (한식-탕)      □ 냉면        (한식-국)         │
│  □ 미역국       (한식-국)      ☑ 된장찌개    (한식-찌개)       │
│  ...                                                            │
│                                                                 │
│  [선택된 항목 리스트에 추가]                                    │
│  ※ 메인요리는 식사 시간을 추가 후 설정해야 합니다              │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 관리화면 — 식단 생성 (/admin/meal-plan)

```
┌─────────────────────────────────────────────────────────────────────┐
│  식단 관리                                                          │
├──────────────────────────────┬──────────────────────────────────────┤
│  달력 (2026년 3월)           │  식단 생성/편집 패널                 │
│                              │                                      │
│  < 2026년 3월 >              │  📅 2026-03-22 (일요일)              │
│  일 월 화 수 목 금 토        │                                      │
│  🔪 2  3  4  5  6  7        │  [식단 자동 생성] [수동 설정]        │
│   8 🔪10 🔪12 13 14         │                                      │
│  ...                         │  조식: [오트밀          ▼] [변경]   │
│                              │  중식: [김치찌개        ▼] [변경]   │
│                              │  석식: [비빔밥          ▼] [변경]   │
│                              │  야식: [미지정          ▼] [추가]   │
│                              │                                      │
│                              │  반찬 (4개)                         │
│                              │  ┌──────┐┌──────┐┌──────┐┌──────┐ │
│                              │  │ 김치 ││시금치││계란  ││멸치  │ │
│                              │  │ [변경]││[변경]││[변경]││[변경]│ │
│                              │  └──────┘└──────┘└──────┘└──────┘ │
│                              │                                      │
│                              │  🍽️ 주말 특식 제안 (일요일)          │
│                              │  짜장면 탕수육 피자  [교체]         │
│                              │                                      │
│                              │  재료비: 12,500원 (메인재료 기준)   │
│                              │  [저장]  [취소]                     │
└──────────────────────────────┴──────────────────────────────────────┘
```

---

## 10. API 엔드포인트 (v4.0 전면 개정)

### 10.1 기본화면 API

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/today-meal` | 오늘 식단 + 반찬 4개 + 특별일/주말 제안 |
| GET | `/api/meal/:date` | 특정 날짜 식단 |

### 10.2 식단 관리 API

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/meal-plans` | 전체 식단 목록 |
| GET | `/api/meal-plans/:date` | 특정 날짜 식단 (반찬 포함) |
| POST | `/api/meal-plans/generate` | 식단 자동 생성 (날짜/기간) |
| POST | `/api/meal-plans` | 식단 수동 저장 |
| PUT | `/api/meal-plans/:date` | 식단 수정 |
| DELETE | `/api/meal-plans/:date` | 식단 삭제 |
| GET | `/api/meal-plans/:date/cost` | 해당일 비용 상세 |

### 10.3 식단 구성 리스트 API [신규]

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/meal-list` | 리스트 전체 조회 |
| GET | `/api/meal-list?category=main_dish` | 카테고리 필터 |
| POST | `/api/meal-list` | 리스트에 음식 추가 |
| PUT | `/api/meal-list/:id` | 식사 시간 등 수정 |
| DELETE | `/api/meal-list/:id` | 리스트에서 제거 |

### 10.4 음식 DB 관리 API

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/foods` | 전체 음식 DB 목록 |
| GET | `/api/foods?category=side_dish` | 카테고리 필터 |
| GET | `/api/foods?dish_type=korean_jjigae` | 유형 필터 |
| POST | `/api/foods` | 음식 등록 |
| PUT | `/api/foods/:id` | 음식 수정 |
| DELETE | `/api/foods/:id` | 음식 삭제 |
| GET | `/api/foods/search?name=김치찌개` | 인터넷 레시피 검색 |
| POST | `/api/foods/fetch-and-save` | 검색 결과 저장 |
| POST | `/api/foods/bulk-scrape` | 대량 스크래핑 |

### 10.5 특별한 날 API [신규]

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/holidays/:year` | 해당 연도 특별한 날 목록 |
| GET | `/api/holidays/check?date=2026-10-05` | 날짜의 특별일 여부 확인 |
| GET | `/api/holidays/:key/suggestions` | 특별한 날 추천 음식 |
| PUT | `/api/holidays/:year/:key` | 날짜 등록/수정 |
| POST | `/api/holidays/:key/suggestions` | 추천 음식 추가 |

### 10.6 주말 특식 API [신규]

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/weekend-specials` | 전체 특식 목록 |
| POST | `/api/weekend-specials` | 특식 추가 |
| PUT | `/api/weekend-specials/:id` | 특식 수정 |
| DELETE | `/api/weekend-specials/:id` | 특식 삭제 |

### 10.7 재료 가격 API

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/ingredients` | 재료 가격 목록 |
| POST | `/api/ingredients` | 가격 등록 |
| PUT | `/api/ingredients/:id` | 가격 수정 |
| DELETE | `/api/ingredients/:id` | 삭제 |

---

## 11. 재료비 계산 로직 (v4.0 업데이트)

### 11.1 계산 대상 변경

기존: 조식/중식/석식/야식 메인요리만
**변경: 조식/중식/석식/야식 메인요리 + 반찬 4개** 메인재료 합산

```
하루 총 재료비 =
    [조식 메인요리 메인재료 비용]
  + [중식 메인요리 메인재료 비용]
  + [석식 메인요리 메인재료 비용]
  + [야식 메인요리 메인재료 비용] (있을 경우)
  + [반찬1 메인재료 비용]
  + [반찬2 메인재료 비용]
  + [반찬3 메인재료 비용]
  + [반찬4 메인재료 비용]
```

### 11.2 재료명 매칭 전략 (동일)

1. 완전 일치 탐색
2. 포함 관계 탐색
3. 유사도 계산 (Levenshtein distance)
4. 매칭 실패 → 비용 0 + "가격 미등록" 경고

---

## 12. 미구현 파일 목록 (v4.0 기준)

```
src/
├── controllers/
│   ├── mealPlanController.js
│   ├── foodController.js
│   ├── mealListController.js      [신규]
│   ├── ingredientController.js
│   ├── holidayController.js       [신규]
│   └── settingsController.js
│
├── models/
│   ├── MealList.js                [신규]
│   ├── MealPlan.js
│   ├── MealPlanSide.js            [신규]
│   ├── Ingredient.js
│   ├── Holiday.js                 [신규]
│   └── ApiKey.js
│
├── routes/
│   ├── indexRoutes.js
│   ├── mealPlanRoutes.js
│   ├── mealListRoutes.js          [신규]
│   ├── foodRoutes.js
│   ├── ingredientRoutes.js
│   ├── holidayRoutes.js           [신규]
│   └── settingsRoutes.js
│
├── services/
│   ├── mealPlanService.js         (v4.0 전면 개정)
│   ├── costCalculationService.js
│   ├── ingredientClassifier.js
│   ├── holidayService.js          [신규]
│   └── weekendSpecialService.js   [신규]
│
└── utils/
    ├── unitConverter.js
    └── ingredientMatcher.js

views/
├── index.ejs                      (전면 재설계)
├── admin/
│   ├── meal-plan.ejs
│   ├── meal-list.ejs              [신규]
│   ├── foods.ejs
│   ├── ingredients.ejs
│   ├── holiday.ejs                [신규]
│   └── settings.ejs
└── partials/
    ├── header.ejs
    ├── food-detail-panel.ejs
    ├── holiday-banner.ejs         [신규]
    ├── weekend-special-banner.ejs [신규]
    └── recipe-card.ejs
```

---

## 13. 기술 스택 및 패키지

| 영역 | 기술 | 비고 |
|------|------|------|
| 백엔드 | Node.js + Express 4.x | |
| 템플릿 | EJS | |
| 데이터베이스 | MariaDB | |
| DB 드라이버 | mariadb 3.x | |
| HTTP 클라이언트 | axios | ⚠️ package.json 등록 필요 |
| HTML 파싱 | cheerio | ⚠️ package.json 등록 필요 |
| 환경 변수 | dotenv | |
| 개발 서버 | nodemon | |
| 테스트 | Jest | |
| 외부 레시피 API | Spoonacular | API 키 필요 |
| 한국 레시피 | 만개의 레시피 스크래핑 | |
| 기준 화면 | 1024×768px (iPad 가로) | |

---

## 14. 개발 우선순위 (v4.0 권장 순서)

| 순서 | 작업 | 이유 |
|------|------|------|
| 1 | DB 스키마 생성 (10개 테이블) | 모든 기능의 기반 |
| 2 | axios, cheerio npm 등록 | 런타임 에러 방지 |
| 3 | recipes 테이블에 분류 컬럼 추가 | 음식 분류 기반 |
| 4 | meal_list 모델 구현 | 식단 구성 리스트 핵심 |
| 5 | 음식 등록 화면 + API (분류 포함) | 데이터 축적 |
| 6 | 식단 구성 리스트 화면 + API | 식단 생성 전제 |
| 7 | 재료 가격 등록 + 비용 계산 서비스 | 비용 산정 |
| 8 | 식단 자동 생성 v4.0 (반찬+특별일+주말) | 핵심 기능 |
| 9 | 특별한 날 데이터 사전 입력 | 추석/설날 등 |
| 10 | 주말 특식 목록 데이터 입력 | 주말 제안 |
| 11 | 기본화면 구현 (iPad 최적화) | 사용자 뷰 |
| 12 | 인터넷 레시피 수집 (만개 스크래핑) | 보조 기능 |
