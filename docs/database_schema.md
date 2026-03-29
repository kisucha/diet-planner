# 데이터베이스 스키마

이 문서는 자동 식단 생성 웹사이트의 데이터베이스 구조를 정의합니다.

**최종 업데이트**: 2026-03-22 (v4.0 전면 개정 — 음식 분류, 식단 리스트, 특별일/주말 제안 반영)

---

## 테이블 목록

| 테이블명 | 역할 | 신규/기존 |
|---------|------|---------|
| `recipes` | 전체 음식 DB (기본 정보 + 분류) | 기존 + 컬럼 추가 |
| `recipe_ingredients` | 레시피별 재료 (메인/양념 구분) | 기존 |
| `meal_list` | 식단 구성 전용 리스트 | **신규** |
| `meal_plans` | 날짜별 식단 계획 | 기존 수정 |
| `meal_plan_sides` | 식단별 반찬 4개 저장 | **신규** |
| `ingredient_prices` | 재료별 구매 가격 정보 | 기존 |
| `holiday_calendar` | 특별한 날 날짜 목록 | **신규** |
| `holiday_suggestions` | 특별한 날 추천 음식 목록 | **신규** |
| `weekend_specials` | 주말 특식 목록 | **신규** |
| `external_api_keys` | 외부 API 키 관리 | 기존 |

---

## 핵심 개념: 2단계 음식 리스트

```
전체 음식 DB (recipes)
    ↓ 사용자가 선택하여 추가 (언제든 변경 가능)
식단 구성 리스트 (meal_list)
    ↓ 여기서만 선택
식단 (meal_plans + meal_plan_sides)
```

> **중요**: 전체 DB에 수백 개의 음식이 있어도, 실제 식단 생성은 **meal_list에 등록된 음식에서만** 이루어집니다.

---

## 1. recipes 테이블 (v4.0 확장)

전체 음식 DB. 인터넷 수집, 수동 등록 포함 모든 음식이 저장됩니다.

```sql
CREATE TABLE recipes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL
                    COMMENT '음식명',

    -- 음식 분류 (v4.0 추가)
    food_category   ENUM('main_dish', 'side_dish', 'special') NOT NULL DEFAULT 'main_dish'
                    COMMENT '메인요리/반찬/야식별식 구분',
    dish_type       ENUM(
                        'korean_dish',   -- 한식 일반요리 (볶음/구이/튀김/무침)
                        'korean_tang',   -- 한식 탕/찜 (설렁탕, 갈비탕, 갈비찜)
                        'korean_jjigae', -- 한식 찌개/전골 (김치찌개, 된장찌개, 순두부)
                        'korean_guk',    -- 한식 국/면 (미역국, 라면, 칼국수, 냉면)
                        'foreign',       -- 외국요리 단일 분류 (파스타, 피자, 스테이크)
                        'side',          -- 반찬 (김치, 나물, 볶음, 조림)
                        'special'        -- 야식/별식 (치킨, 떡볶이, 족발)
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
```

### 음식 분류 예시

| 음식명 | food_category | dish_type | cuisine_origin |
|--------|--------------|-----------|----------------|
| 김치찌개 | main_dish | korean_jjigae | korean |
| 된장찌개 | main_dish | korean_jjigae | korean |
| 설렁탕 | main_dish | korean_tang | korean |
| 갈비찜 | main_dish | korean_tang | korean |
| 미역국 | main_dish | korean_guk | korean |
| 라면 | main_dish | korean_guk | korean |
| 칼국수 | main_dish | korean_guk | korean |
| 불고기 | main_dish | korean_dish | korean |
| 제육볶음 | main_dish | korean_dish | korean |
| 파스타 | main_dish | foreign | foreign |
| 스테이크 | main_dish | foreign | foreign |
| 배추김치 | side_dish | side | korean |
| 시금치나물 | side_dish | side | korean |
| 계란말이 | side_dish | side | korean |
| 치킨 | special | special | foreign |
| 떡볶이 | special | special | korean |

> **면 요리 분류 규칙**: 라면, 칼국수, 냉면, 우동, 짬뽕 → `dish_type = 'korean_guk'`
> 짜장면: 외국 유래이지만 한국화된 음식으로 `korean_guk` 분류 가능, `is_weekend_special = 1` 함께 설정

---

## 2. recipe_ingredients 테이블

레시피별 재료 상세 정보. **메인재료와 양념을 구분**하는 핵심 테이블입니다.

```sql
CREATE TABLE recipe_ingredients (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL
                    COMMENT '레시피 ID (recipes.id)',
    ingredient_name VARCHAR(255) NOT NULL
                    COMMENT '재료명 (예: 김치, 돼지고기)',
    quantity        DECIMAL(10, 2)
                    COMMENT '필요 용량 (숫자, 예: 200, 1.5)',
    unit            VARCHAR(20)
                    COMMENT '단위 (g, ml, 개, 스푼, 약간 등)',
    ingredient_type ENUM('main', 'seasoning') NOT NULL DEFAULT 'main'
                    COMMENT 'main=메인재료(가격산정 대상), seasoning=양념(가격산정 제외)',
    original_text   VARCHAR(255)
                    COMMENT '스크래핑 원본 텍스트 (예: 김치 1/2포기)',
    sort_order      INT DEFAULT 0
                    COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_ingredient_type (ingredient_type)
);
```

> **중요**: `ingredient_type = 'main'` 인 재료만 재료비 산정에 포함됩니다.
> 소금, 간장, 참기름 등 양념류는 `'seasoning'`으로 분류하여 비용 계산에서 제외합니다.

---

## 3. meal_list 테이블 (신규 — 핵심)

실제 식단 생성에 사용할 음식들을 큐레이션하는 리스트입니다.
전체 recipes DB에서 선택하여 추가하며, 언제든지 변경 가능합니다.

```sql
CREATE TABLE meal_list (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL
                    COMMENT '전체 DB의 레시피 ID (recipes.id)',
    can_breakfast   TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '조식 추천 허용 여부 (메인요리에만 적용)',
    can_lunch       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '중식 추천 허용 여부 (메인요리에만 적용)',
    can_dinner      TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '석식 추천 허용 여부 (메인요리에만 적용)',
    is_active       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '현재 리스트 활성 여부 (0=임시 비활성)',
    memo            VARCHAR(255)
                    COMMENT '메모 (예: 여름에만 추천, 2인분 조정 필요)',
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    COMMENT '리스트 추가 시간',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_recipe_id (recipe_id),
    INDEX idx_can_breakfast (can_breakfast),
    INDEX idx_can_lunch (can_lunch),
    INDEX idx_can_dinner (can_dinner)
);
```

> **식사 시간 플래그 적용 범위**
> - 메인요리(main_dish): can_breakfast/can_lunch/can_dinner 중 1개 이상 반드시 선택
> - 반찬(side_dish): 식사 시간 무관 (모든 식단에 반찬으로 포함될 수 있음)
> - 야식/별식(special): 식사 시간 무관 (야식 슬롯에만 추천)

### meal_list 등록 예시

| 음식명 | can_breakfast | can_lunch | can_dinner | 비고 |
|--------|:---:|:---:|:---:|------|
| 오트밀 | ✓ | ✗ | ✗ | 조식 전용 |
| 샌드위치 | ✓ | ✓ | ✗ | 조식/중식 |
| 김치찌개 | ✗ | ✓ | ✓ | 중식/석식 |
| 된장찌개 | ✗ | ✓ | ✓ | 중식/석식 |
| 설렁탕 | ✓ | ✓ | ✓ | 모든 식사 |
| 냉면 | ✗ | ✓ | ✗ | 중식 전용 |
| 잡채 | ✗ | ✗ | ✓ | 석식 전용 |

---

## 4. meal_plans 테이블 (v4.0 수정)

날짜별 식단 계획을 저장합니다. 반찬 4개는 meal_plan_sides 테이블에 별도 저장됩니다.

```sql
CREATE TABLE meal_plans (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    plan_date       DATE NOT NULL
                    COMMENT '식단 날짜',
    breakfast_id    INT
                    COMMENT '조식 레시피 ID (null이면 미지정)',
    lunch_id        INT
                    COMMENT '중식 레시피 ID (null이면 미지정)',
    dinner_id       INT
                    COMMENT '석식 레시피 ID (null이면 미지정)',
    snack_id        INT
                    COMMENT '야식 레시피 ID (null이면 미지정)',
    -- 반찬 4개는 meal_plan_sides 테이블 참조
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
```

---

## 5. meal_plan_sides 테이블 (신규)

식단별 반찬 4개를 저장합니다. meal_plans와 1:N 관계입니다.

```sql
CREATE TABLE meal_plan_sides (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    plan_id     INT NOT NULL
                COMMENT '식단 ID (meal_plans.id)',
    recipe_id   INT NOT NULL
                COMMENT '반찬 레시피 ID (recipes.id, food_category=side_dish)',
    sort_order  INT NOT NULL DEFAULT 0
                COMMENT '표시 순서 (1~4)',
    FOREIGN KEY (plan_id)   REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)   ON DELETE CASCADE,
    INDEX idx_plan_id (plan_id)
);
```

> 하나의 식단(plan_id)에 대해 최대 4개의 반찬 행이 존재합니다.
> sort_order 1~4로 순서를 지정합니다.

---

## 6. ingredient_prices 테이블

재료별 구매 가격 정보를 저장합니다. 재료비 자동 산정에 사용됩니다.

```sql
CREATE TABLE ingredient_prices (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name     VARCHAR(255) NOT NULL
                        COMMENT '재료명 (recipe_ingredients.ingredient_name과 매칭)',
    purchase_quantity   DECIMAL(10, 2) NOT NULL
                        COMMENT '구매 기준 용량 (숫자, 예: 500)',
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
```

> **계산 예시**: 돼지고기 500g = 9,800원
> → price_per_unit = 9800 / 500 = 19.6원/g
> → 레시피에서 150g 필요 시 → 비용 = 150 × 19.6 = 2,940원

---

## 7. holiday_calendar 테이블 (신규)

추석, 설날, 크리스마스, 추수감사절 등 특별한 날의 날짜를 관리합니다.

```sql
CREATE TABLE holiday_calendar (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    year            INT NOT NULL
                    COMMENT '연도',
    holiday_key     VARCHAR(50) NOT NULL
                    COMMENT '고유 키 (chuseok, seollal, christmas, thanksgiving)',
    holiday_name    VARCHAR(100) NOT NULL
                    COMMENT '표시 명칭 (추석, 설날, 크리스마스, 추수감사절)',
    start_date      DATE NOT NULL
                    COMMENT '시작 날짜',
    end_date        DATE NOT NULL
                    COMMENT '종료 날짜 (단일 날짜면 start_date와 동일)',
    UNIQUE KEY uk_year_holiday (year, holiday_key)
);
```

### 사전 등록 데이터 예시

| year | holiday_key | holiday_name | start_date | end_date |
|------|-------------|-------------|------------|----------|
| 2026 | chuseok | 추석 | 2026-10-04 | 2026-10-06 |
| 2026 | seollal | 설날 | 2026-01-28 | 2026-01-30 |
| 2026 | christmas | 크리스마스 | 2026-12-25 | 2026-12-25 |
| 2026 | thanksgiving | 추수감사절 | 2026-11-26 | 2026-11-26 |

> 크리스마스(12월 25일)와 추수감사절(11월 넷째 목요일)은 코드로 계산 가능하지만,
> 추석과 설날은 음력 기반이므로 매년 수동 등록이 필요합니다.

---

## 8. holiday_suggestions 테이블 (신규)

특별한 날에 제안할 음식 목록을 저장합니다.

```sql
CREATE TABLE holiday_suggestions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    holiday_key     VARCHAR(50) NOT NULL
                    COMMENT '특별한 날 키 (holiday_calendar.holiday_key와 매칭)',
    food_name       VARCHAR(255) NOT NULL
                    COMMENT '추천 음식명',
    recipe_id       INT
                    COMMENT '전체 DB에 해당 레시피가 있으면 연결 (없으면 NULL)',
    description     VARCHAR(500)
                    COMMENT '설명 (예: 추석 대표 떡)',
    display_order   INT NOT NULL DEFAULT 0
                    COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    INDEX idx_holiday_key (holiday_key)
);
```

### 사전 등록 데이터 예시

| holiday_key | food_name | description |
|-------------|----------|-------------|
| chuseok | 송편 | 추석 대표 떡 |
| chuseok | 갈비찜 | 추석 차례 음식 |
| chuseok | 잡채 | 명절 대표 음식 |
| chuseok | 각종 전 | 녹두전, 동그랑땡 등 |
| seollal | 떡국 | 설날에 먹는 전통 음식 |
| seollal | 갈비찜 | 설날 차례 음식 |
| seollal | 잡채 | 설날 명절 음식 |
| christmas | 로스트 치킨 | 크리스마스 대표 음식 |
| christmas | 스테이크 | 크리스마스 특식 |
| christmas | 케이크 | 크리스마스 디저트 |
| thanksgiving | 로스트 터키 | 추수감사절 대표 음식 |
| thanksgiving | 호박파이 | 추수감사절 디저트 |
| thanksgiving | 매쉬드 포테이토 | 추수감사절 사이드 |

> 제안은 실제 식단에 강제 포함되지 않습니다. 사용자가 "특식으로 교체" 버튼으로 선택할 수 있습니다.

---

## 9. weekend_specials 테이블 (신규)

주말에 별도 제안할 특식 목록입니다. meal_list에 없어도 제안 가능합니다.

```sql
CREATE TABLE weekend_specials (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    food_name       VARCHAR(255) NOT NULL
                    COMMENT '특식 음식명',
    recipe_id       INT
                    COMMENT '전체 DB에 해당 레시피가 있으면 연결 (없으면 NULL)',
    description     VARCHAR(500)
                    COMMENT '설명',
    is_active       TINYINT(1) NOT NULL DEFAULT 1
                    COMMENT '활성 여부 (0=비활성)',
    display_order   INT NOT NULL DEFAULT 0
                    COMMENT '표시 순서',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);
```

### 기본 특식 목록

| food_name | description |
|----------|-------------|
| 짜장면 | 주말 특식의 대표 |
| 탕수육 | 짜장면과 함께 인기 |
| 짬뽕 | 얼큰한 주말 특식 |
| 피자 | 가족 주말 외식 |
| 스테이크 | 주말 특별 요리 |
| 초밥/회 | 주말 고급 식사 |
| 삼겹살 구이 | 주말 바비큐 |
| 치킨 | 주말 대표 음식 |
| 햄버거 | 패스트푸드 특식 |
| 갈비구이 | 주말 외식 대표 |
| 파스타 | 카르보나라, 토마토 등 |

---

## 10. external_api_keys 테이블

외부 레시피 API 키를 관리합니다.

```sql
CREATE TABLE external_api_keys (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    service_name    VARCHAR(100) NOT NULL
                    COMMENT '서비스명 (spoonacular, naver 등)',
    api_key         VARCHAR(500)
                    COMMENT 'API 키 (주의: 민감 정보)',
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

---

## 테이블 관계도 (ERD)

```
recipes (1) ──────────────── (N) recipe_ingredients
   │                                    │
   │                                    │ ingredient_name 매칭
   │ (1)                                ↓
   ├── (N) meal_list              ingredient_prices
   │         │ (식단 구성 리스트)
   │         ↓ 여기서만 선택
   │
meal_plans (N)
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

---

## 재료비 산정 계산 (v4.0 업데이트)

### 계산 대상 (v4.0 변경)

기존: 조식/중식/석식/야식 메인요리의 메인재료만
**변경**: 메인요리(조/중/석/야식) + **반찬 4개** 모두의 메인재료 합산

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

### 계산 예시 (2026-03-22 중식: 김치찌개)

| 재료 | 구분 | 필요량 | 단위당가격 | 비용 |
|------|------|--------|-----------|------|
| 김치 | 메인 | 200g | 5원/g | 1,000원 |
| 돼지고기 | 메인 | 150g | 19.6원/g | 2,940원 |
| 두부 | 메인 | 150g | 5원/g | 750원 |
| 대파 | 메인 | 1개 | 500원/개 | 500원 |
| 소금 | **양념** | 약간 | — | **제외** |
| 간장 | **양념** | 2스푼 | — | **제외** |
| 참기름 | **양념** | 1스푼 | — | **제외** |

**중식 소계**: 5,190원
