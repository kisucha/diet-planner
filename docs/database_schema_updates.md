# 레시피 검색 기능을 위한 데이터베이스 스키마 변경 계획

이 문서는 자동 식단 생성 웹사이트에 레시피 검색 기능을 추가하기 위해 필요한 데이터베이스 스키마 변경 사항을 정리한 문서입니다.

## 1. 현재 스키마 분석

현재 `recipes` 테이블은 다음과 같은 구조를 가지고 있습니다:

```sql
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '레시피 이름',
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'side', 'snack') NOT NULL COMMENT '식사 유형',
    ingredients TEXT NOT NULL COMMENT '필요 재료',
    instructions TEXT NOT NULL COMMENT '조리 방법',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간'
);
```

## 2. 필요한 스키마 변경 사항

### 2.1 레시피 출처 추적을 위한 필드 추가

인터넷에서 가져온 레시피의 출처를 추적하기 위해 다음과 같은 필드를 추가해야 합니다:

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

### 2.2 추가 테이블 생성

더 향상된 검색 기능을 위해 다음과 같은 추가 테이블을 생성할 수 있습니다:

#### 태그 테이블
```sql
CREATE TABLE recipe_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    tag VARCHAR(100) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_tag (tag)
);
```

#### 영양 정보 테이블
```sql
CREATE TABLE recipe_nutrition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    calories DECIMAL(6,2) COMMENT '칼로리',
    protein DECIMAL(6,2) COMMENT '단백질(g)',
    carbs DECIMAL(6,2) COMMENT '탄수화물(g)',
    fat DECIMAL(6,2) COMMENT '지방(g)',
    fiber DECIMAL(6,2) COMMENT '섬유질(g)',
    sodium DECIMAL(6,2) COMMENT '나트륨(mg)',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);
```

## 3. 변경 이유

1. **출처 추적**: 인터넷에서 가져온 레시피의 원본을 추적하여 저작권 문제를 방지
2. **향상된 검색**: 태그, 요리 종류, 난이도 등으로 검색 기능 향상
3. **사용자 경험 개선**: 이미지, 준비 시간, 조리 시간 등의 정보 제공
4. **데이터 정규화**: 영양 정보와 태그를 별도 테이블로 분리하여 데이터 정규화

## 4. 구현 고려사항

1. **마이그레이션 전략**: 기존 레시피에는 새로운 필드에 대한 기본값 또는 NULL 값 적용
2. **인덱싱**: 검색 성능 향상을 위해 적절한 인덱스 생성
3. **하위 호환성**: 새로운 필드는 nullable로 설정하여 기존 코드와의 호환성 유지
4. **성능 최적화**: 자주 검색되는 필드에 대한 인덱스 추가

이 변경 사항은 레시피 검색 기능을 효과적으로 구현하고 유지보수하기 위한 기반을 제공합니다.