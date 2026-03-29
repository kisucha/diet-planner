# 만개의 레시피 스크래핑 엔진 설계

**작성일**: 2026-03-26
**버전**: v1.0
**작성자**: 설계 분석팀
**목적**: 만개의 레시피(10000recipe.com) 웹사이트에서 레시피 데이터를 수집하는 독립 스크래퍼 엔진의 기술 분석 및 설계 문서

---

## 목차

1. [웹사이트 분석 결과](#1-웹사이트-분석-결과)
2. [스크래핑 가능 데이터 목록](#2-스크래핑-가능-데이터-목록)
3. [스크래퍼 엔진 아키텍처 설계](#3-스크래퍼-엔진-아키텍처-설계)
4. [데이터베이스 연동 설계](#4-데이터베이스-연동-설계)
5. [기술 스택 선택](#5-기술-스택-선택)
6. [실제 HTML 선택자 (분석 결과)](#6-실제-html-선택자-분석-결과)
7. [구현 단계 계획](#7-구현-단계-계획)
8. [트레이드오프 및 고려사항](#8-트레이드오프-및-고려사항)
9. [설정 파라미터 설계](#9-설정-파라미터-설계)

---

## 1. 웹사이트 분석 결과

### 1.1 사이트 구조 분석

만개의 레시피(https://www.10000recipe.com)는 국내 최대 한국어 레시피 커뮤니티 사이트입니다.

**기본 정보**

| 항목 | 내용 |
|------|------|
| 총 레시피 수 | 약 267,333개 (2026-03-26 기준) |
| 목록 페이지 URL 패턴 | `/recipe/list.html?order=[정렬]&page=[번호]` |
| 상세 페이지 URL 패턴 | `/recipe/[레시피ID]` (예: `/recipe/6891010`) |
| 페이지당 레시피 수 | 약 20~30개 (카테고리/정렬에 따라 다름) |
| 카테고리 URL 패턴 | `/recipe/list.html?cat4=[코드]&page=[번호]` |

**카테고리 코드 (cat4 파라미터)**

| 코드 | 카테고리명 | 비고 |
|------|-----------|------|
| 63 | 밑반찬 | 약 54,988개 |
| 56 | 메인반찬 | - |
| 54 | 국/탕 | - |
| 55 | 찌개 | - |
| 52 | 밥/죽/떡 | - |
| 53 | 면/만두 | - |
| 57 | 김치/젓갈/장류 | - |
| 60 | 디저트 | - |
| 61 | 퓨전 | - |

**정렬 파라미터 (order)**

| 값 | 의미 |
|----|------|
| `reco` | 추천순 (기본값) |
| `recent` | 최신순 |

---

### 1.2 robots.txt 분석 및 허용 범위

**확인된 robots.txt 내용** (2026-03-26 실제 확인):

```
User-Agent: *
Disallow: /admin/
Disallow: /app/
Disallow: /static/

User-agent: dotbot
Disallow: /
```

**허용 범위 분석**

| 경로 | 허용 여부 | 비고 |
|------|----------|------|
| `/recipe/list.html` | **허용** | robots.txt에 차단 없음 |
| `/recipe/[ID]` | **허용** | 레시피 상세 페이지 |
| `/admin/` | 차단 | 관리자 영역 |
| `/app/` | 차단 | 앱 관련 경로 |
| `/static/` | 차단 | 정적 파일 경로 |

**결론**: `/recipe/` 하위 경로(목록, 상세 페이지)는 robots.txt 기준으로 크롤링이 허용됩니다.
단, 이미지 CDN(`recipe1.ezmember.co.kr`)의 robots.txt는 별도 확인이 필요합니다.

**윤리적 가이드라인 준수 계획**:
- 요청 간 1~3초 딜레이 적용 (서버 부하 방지)
- 동시 요청 수 최대 2개 이하
- `User-Agent` 명시적 설정으로 봇 신분 투명화 고려

---

### 1.3 HTML 선택자 목록 (실제 확인된 CSS 선택자)

**레시피 목록 페이지 선택자**

| 데이터 항목 | CSS 선택자 | 비고 |
|------------|-----------|------|
| 개별 레시피 카드 | `ul > li` | li 태그 직접 사용, 별도 class 없음 |
| 레시피 링크 | `li > a:first-of-type` | href="/recipe/[ID]" 패턴 |
| 레시피 ID 추출 | `li a[href^="/recipe/"]` | href에서 ID 파싱 |
| 썸네일 이미지 | `li a img` | src 속성에서 URL 추출 |
| 레시피 제목 | `li a:nth-of-type(2)` 또는 `.caption` | 텍스트 직접 추출 |
| 제목 (JS 확인) | `.ellipsis_title`, `.elipsis_rrtitle` | JavaScript 처리용 클래스 |
| 페이지네이션 링크 | `a[href*="page="]` | URL 파라미터에서 페이지 번호 추출 |
| 총 레시피 수 | 페이지 텍스트 "총 N개" | 정규식으로 숫자 파싱 |

**레시피 상세 페이지 선택자**

| 데이터 항목 | CSS 선택자 / ID | 실제 확인 여부 |
|------------|----------------|-------------|
| 음식 이름 | `h3` (첫 번째) | 확인됨 |
| 메인 썸네일 이미지 | `img#main_thumbs` | 확인됨 |
| 재료 컨테이너 | `div#divConfirmedMaterialArea` | 확인됨 |
| 조리 순서 컨테이너 | `.view_step_cont` | 확인됨 |
| 조리 단계 이미지 | `img[id^="stepimg"]` | 확인됨 |
| 카테고리/태그 | `a[href^="/recipe/list.html?q="]` | 확인됨 |
| 좋아요 버튼 | `#availLike` | 확인됨 |
| JSON-LD 스키마 | `script[type="application/ld+json"]` | 확인됨 (권장 추출 경로) |

**JSON-LD 스키마 필드 (가장 안정적인 추출 방법)**

```json
{
  "@context": "http://schema.org/",
  "@type": "Recipe",
  "name": "음식명",
  "image": ["이미지URL"],
  "author": { "@type": "Person", "name": "작성자명" },
  "datePublished": "ISO8601 날짜",
  "description": "음식 설명",
  "totalTime": "PT2H (ISO 8601 기간)",
  "recipeYield": "N servings",
  "recipeIngredient": ["재료명 용량", ...],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "조리 단계", "image": "단계 이미지URL" }
  ]
}
```

> **핵심 설계 결정**: HTML 선택자는 사이트 업데이트 시 깨질 수 있으므로,
> **JSON-LD 스키마를 1차 추출 소스로**, HTML 선택자를 2차 폴백으로 사용합니다.

---

### 1.4 페이징 방식 분석

**목록 페이지 오프셋 기반 페이징**

```
기본 URL: https://www.10000recipe.com/recipe/list.html
파라미터:
  - order=reco (정렬 기준)
  - page=N (1부터 시작, 정수)
  - cat4=코드 (카테고리 필터, 선택)

예시:
  1페이지: /recipe/list.html?order=reco&page=1
  2페이지: /recipe/list.html?order=reco&page=2
  밑반찬 1페이지: /recipe/list.html?cat4=63&page=1
```

**페이지 수 계산**

```
총 레시피 수: 267,333개
페이지당 레시피 수: 약 20개 (카테고리 목록 기준)
최대 페이지 수: 약 267,333 / 20 = 약 13,367페이지
```

**크롤링 전략 적용**:
- 무한 페이징 방지: 빈 결과 페이지 감지 시 중단
- 목표 수량 달성 시 조기 종료
- 페이지네이션 링크에서 실제 마지막 페이지 번호 파싱

---

### 1.5 동적/정적 콘텐츠 분석

| 구분 | 판단 | 근거 |
|------|------|------|
| 목록 페이지 | **정적 HTML** | 서버에서 완성된 HTML 렌더링, JS 없이 Cheerio로 파싱 가능 |
| 상세 페이지 (기본 정보) | **정적 HTML** | h3 제목, 메인 이미지, JSON-LD 스키마가 초기 HTML에 포함 |
| 재료 목록 | **부분 동적** | `#divConfirmedMaterialArea`는 AJAX 또는 인라인 JS로 채워짐 가능성 있음 |
| 조리 순서 | **정적 HTML** | `.view_step_cont`은 초기 HTML에 포함 |
| 조회수/좋아요 | **동적 JS** | JavaScript 이벤트로 업데이트 (스크래핑 불필요) |

**결론**: axios + cheerio 조합으로 대부분의 데이터 수집 가능.
재료 목록이 AJAX 방식임을 확인 시 puppeteer 폴백 전략 필요.
단, JSON-LD 스키마에 재료 목록(`recipeIngredient`)이 포함되어 있으므로
**axios + JSON-LD 파싱만으로도 충분한 데이터 수집 가능**.

---

## 2. 스크래핑 가능 데이터 목록

### 2.1 레시피 기본 정보

| 데이터 | 소스 | 추출 방법 | recipes 테이블 컬럼 |
|--------|------|----------|-------------------|
| 음식 이름 | JSON-LD `name` / HTML `h3` | JSON 파싱 또는 CSS 선택자 | `name` |
| 음식 설명 | JSON-LD `description` | JSON 파싱 | (instructions에 포함 또는 별도 컬럼 추가 고려) |
| 조리 시간 | JSON-LD `totalTime` (ISO 8601) | 파싱 후 분 단위로 변환 | `cook_time` |
| 인분 수 | JSON-LD `recipeYield` ("N servings") | 숫자 파싱 | `servings` |
| 난이도 | HTML 텍스트 ("초급/중급/고급") | 텍스트 파싱 | (별도 컬럼 추가 가능) |
| 작성일 | JSON-LD `datePublished` | ISO 날짜 파싱 | - |
| 출처 URL | 현재 URL | 직접 사용 | `source_url` |
| 출처 사이트 | 고정값 | 하드코딩 "10000recipe" | `source_site` |

### 2.2 재료 정보

| 데이터 | 소스 | 추출 방법 | recipe_ingredients 컬럼 |
|--------|------|----------|------------------------|
| 재료 목록 (통합) | JSON-LD `recipeIngredient` | 배열 파싱 | - |
| 재료명 | 각 항목에서 파싱 | 정규식 (텍스트 앞부분) | `ingredient_name` |
| 용량/단위 | 각 항목에서 파싱 | 정규식 (숫자+단위) | `quantity`, `unit` |
| 원본 텍스트 | JSON-LD 원문 | 그대로 저장 | `original_text` |
| 재료 구분 | HTML `#divConfirmedMaterialArea` 섹션 헤더 | 텍스트 패턴 매칭 | `ingredient_type` |

**재료 구분 텍스트 패턴 (실제 확인)**:
- `[메인재료]` → `ingredient_type = 'main'`
- `[양념]` → `ingredient_type = 'seasoning'`
- `[필수]` → `ingredient_type = 'main'` (필수 재료는 메인으로 처리)
- `【양념】` → `ingredient_type = 'seasoning'` (다른 형식)

### 2.3 조리 방법

| 데이터 | 소스 | 추출 방법 | recipes 컬럼 |
|--------|------|----------|-------------|
| 조리 단계 목록 | JSON-LD `recipeInstructions` | `HowToStep` 배열 파싱 | `instructions` (JSON 배열) |
| 단계별 텍스트 | `recipeInstructions[N].text` | 직접 추출 | - |
| 단계별 이미지 URL | `recipeInstructions[N].image` | 직접 추출 | - |

### 2.4 이미지 정보

| 데이터 | 소스 | 추출 방법 |
|--------|------|----------|
| 대표 이미지 URL | JSON-LD `image[0]` / `img#main_thumbs src` | JSON 또는 HTML |
| CDN URL 패턴 | `recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash]_f.jpg` | URL 파싱 |
| 고해상도 이미지 | URL의 `_m.jpg` → `_f.jpg` 변환 | 접미사 교체 |

**이미지 CDN URL 패턴 정리**:
```
썸네일(목록): https://recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash]_m.jpg
원본(상세):   https://recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash]_f.jpg
조리 단계:   https://recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash].jpg
```

### 2.5 카테고리/분류 정보

| 데이터 | 소스 | 활용 |
|--------|------|------|
| 사이트 카테고리 코드 | URL `cat4=N` | DB 매핑 참조 |
| 태그/해시태그 | `a[href^="/recipe/list.html?q="]` | 보조 분류 |

---

## 3. 스크래퍼 엔진 아키텍처 설계

### 3.1 전체 시스템 구성도

```
[메인 앱 - C:\Develop\diet\src\]         [스크래퍼 - C:\Develop\diet\scraper\]
┌─────────────────────────────┐           ┌──────────────────────────────────┐
│  Express 웹 서버              │           │  독립 Node.js 프로세스             │
│  - 식단 생성                  │           │  - 단독 실행 (node scraper/index) │
│  - 달력 표시                  │           │  - 크론 배치 실행 가능             │
│  - 재료비 계산                │           │                                  │
└──────────────┬──────────────┘           └──────────────┬───────────────────┘
               │                                          │
               └──────────┬───────────────────────────────┘
                          │ 공통 MariaDB 접근
                    ┌─────▼──────┐
                    │  MariaDB   │
                    │  recipes   │
                    │  recipe_   │
                    │ ingredients│
                    │  scrape_   │
                    │  progress  │
                    └────────────┘
```

**분리 원칙**:
- 스크래퍼는 메인 앱과 **완전히 독립된 Node.js 프로세스**로 실행
- 두 시스템의 연결점은 **MariaDB만** (파일 공유 없음)
- 스크래퍼에는 별도 `package.json` (별도 의존성 관리)
- 메인 앱 코드를 수정하지 않고 스크래퍼 독립 개발 가능

---

### 3.2 메인 프로그램과의 분리 방법

**디렉토리 분리**:
```
C:\Develop\diet\
├── src\           ← 메인 앱 (수정 금지 영역)
├── scraper\       ← 완전히 독립된 스크래퍼 엔진
│   └── package.json  ← 별도 의존성
└── .env           ← DB 설정 공유 (읽기 전용으로 scraper에서도 참조)
```

**공유 가능 항목**:
- `.env` DB 접속 정보 (scraper에서 `../../../.env` 경로로 참조 또는 복사)
- MariaDB 테이블 (동일 DB 사용)

**분리 항목**:
- Node.js 의존성 (`scraper/package.json`)
- 실행 프로세스 (메인 앱과 별개 실행)
- 로그 파일 (`scraper/logs/`)
- 설정 파일 (`scraper/config.js`)

---

### 3.3 스크래퍼 엔진 디렉토리 구조

```
scraper/
├── index.js                  # 진입점 — 전체 크롤링 워크플로우 오케스트레이션
├── config.js                 # 설정값 중앙화 (딜레이, 동시성, URL 등)
├── package.json              # 독립 패키지 (axios, cheerio, p-queue, mariadb 등)
│
├── crawler/
│   ├── listCrawler.js        # 목록 페이지 크롤러 (URL 생성, 페이지 순회)
│   └── detailCrawler.js      # 상세 페이지 크롤러 (HTML fetch, 파싱 위임)
│
├── parsers/
│   ├── recipeParser.js       # 레시피 기본 정보 파싱 (JSON-LD + HTML 폴백)
│   └── ingredientParser.js   # 재료 파싱 (재료명/용량/단위 분리, 메인/양념 구분)
│
├── storage/
│   ├── dbStorage.js          # DB 저장 로직 (중복 확인, INSERT/UPDATE)
│   └── imageStorage.js       # 이미지 처리 (URL 저장 또는 로컬 다운로드)
│
├── utils/
│   ├── rateLimiter.js        # 요청 속도 제한 (딜레이 주입)
│   ├── queue.js              # 크롤링 큐 래퍼 (p-queue 기반)
│   ├── logger.js             # 로그 출력 (콘솔 + 파일)
│   └── progressTracker.js   # 크롤링 진행 상태 저장/복원
│
├── logs/                     # 자동 생성 로그 디렉토리
│   ├── scraper.log           # 일반 로그
│   └── errors.log            # 에러 로그
│
└── README.md                 # 스크래퍼 실행 방법 가이드
```

---

### 3.4 크롤링 전략 (rate limiting, retry, queue)

**크롤링 플로우**

```
1. config.js 로드 (카테고리, 목표 수량, 딜레이 등)
2. scrape_progress 테이블에서 이전 진행 상태 복원
3. listCrawler: 목록 페이지 URL 생성 → 큐에 추가
4. 큐에서 목록 URL 순차 처리:
   a. 목록 페이지 fetch (rateLimiter 적용)
   b. 레시피 ID 목록 추출
   c. 각 레시피 ID를 상세 페이지 큐에 추가
5. 큐에서 상세 URL 순차 처리:
   a. 이미 처리된 URL이면 스킵 (중복 확인)
   b. 상세 페이지 fetch (rateLimiter 적용)
   c. recipeParser → ingredientParser 파싱
   d. dbStorage에 저장
   e. 진행 상태 업데이트
6. 목표 수량 또는 빈 페이지 감지 시 종료
```

**Rate Limiting 전략**

```
목록 페이지 요청 간격: 2초 ~ 3초 (랜덤 지터 포함)
상세 페이지 요청 간격: 1초 ~ 2초 (랜덤 지터 포함)
동시 요청 수: 최대 1 (순차 처리 권장, 최대 2)
타임아웃: 15초/요청
```

**Retry 전략**

```
최대 재시도 횟수: 3회
재시도 대기 시간: 지수 백오프 (5초, 10초, 20초)
재시도 조건: 5xx 서버 에러, 네트워크 타임아웃
비재시도 조건: 404 Not Found, 403 Forbidden
```

**Queue 구현 (p-queue 기반)**

```javascript
// 개념 설계 (코드 아님, 설계 참고용)
QueueManager:
  - listQueue: concurrency=1, interval=2000ms
  - detailQueue: concurrency=1, interval=1500ms
  - 큐 완료 이벤트 핸들러
  - 에러 발생 시 에러 로그 기록 후 다음 항목 처리
```

---

### 3.5 이미지 저장 전략

**권장 전략: URL 참조 (Phase 1)**

초기 구현에서는 이미지를 로컬에 다운로드하지 않고 **CDN URL을 DB에 저장**합니다.

| 전략 | 장점 | 단점 |
|------|------|------|
| URL 참조 | 빠른 구현, 저장 공간 불필요 | 외부 CDN 의존, URL 만료 위험 |
| 로컬 다운로드 | 영구 보존, 오프라인 가능 | 저장 공간 필요, 저작권 고려 |

**URL 참조 방식 설계**:
- DB `recipes.image_url` 컬럼에 CDN URL 저장
- 고해상도 URL로 변환하여 저장 (`_m.jpg` → `_f.jpg`)
- CDN URL 유효성 검사 로직 포함

**Phase 2 (선택적) 로컬 다운로드 전략**:
- 저장 경로: `C:\Develop\diet\public\images\recipes\[레시피ID].jpg`
- DB에는 `/images/recipes/[레시피ID].jpg` (서비스 경로) 저장
- 다운로드 실패 시 CDN URL 폴백

---

## 4. 데이터베이스 연동 설계

### 4.1 기존 DB 스키마와의 매핑

**스크래핑 데이터 → recipes 테이블 매핑**

| 스크래핑 데이터 | recipes 컬럼 | 처리 방법 |
|----------------|-------------|----------|
| JSON-LD `name` | `name` | 직접 저장 |
| JSON-LD `image[0]` | `image_url` | `_f.jpg` 변환 후 저장 |
| JSON-LD `totalTime` | `cook_time` | "PT30M" → "30분" 변환 |
| JSON-LD `recipeYield` | `servings` | "2 servings" → 2 파싱 |
| JSON-LD `recipeInstructions` | `instructions` | JSON 배열 직렬화 |
| 카테고리 코드(cat4) | `food_category`, `dish_type` | 매핑 테이블로 자동 분류 |
| 현재 URL | `source_url` | 직접 저장 |
| 고정값 | `source_site` | "10000recipe" |
| 고정값 | `is_auto_fetched` | 1 |

**카테고리 코드 → dish_type 매핑**

| cat4 코드 | 사이트 카테고리 | food_category | dish_type |
|-----------|--------------|--------------|-----------|
| 54 | 국/탕 | main_dish | korean_tang 또는 korean_guk |
| 55 | 찌개 | main_dish | korean_jjigae |
| 56 | 메인반찬 | main_dish | korean_dish |
| 63 | 밑반찬 | side_dish | side |
| 52 | 밥/죽/떡 | main_dish | korean_guk |
| 53 | 면/만두 | main_dish | korean_guk |
| 61 | 퓨전 | main_dish | foreign |

> 국/탕 카테고리(cat4=54)는 음식명에 "찌개", "전골" 포함 여부로 세부 분류.
> 이름 기반 자동 분류 로직을 ingredientParser.js에 구현 예정.

**스크래핑 데이터 → recipe_ingredients 테이블 매핑**

| 스크래핑 데이터 | recipe_ingredients 컬럼 | 처리 방법 |
|----------------|------------------------|----------|
| JSON-LD `recipeIngredient[N]` | `original_text` | 원문 그대로 저장 |
| 원문에서 파싱한 재료명 | `ingredient_name` | 정규식 추출 |
| 원문에서 파싱한 숫자 | `quantity` | 정규식 + 분수 변환 |
| 원문에서 파싱한 단위 | `unit` | 단위 사전 매핑 |
| 섹션 헤더 텍스트 | `ingredient_type` | 'main' 또는 'seasoning' |

---

### 4.2 스크래핑 진행 상태 추적 테이블 설계

메인 앱 DB에 추가할 새 테이블 (스크래퍼 전용):

```sql
CREATE TABLE scrape_progress (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_url      VARCHAR(500) NOT NULL
                    COMMENT '크롤링된 레시피 상세 URL',
    recipe_id_ext   VARCHAR(50) NOT NULL
                    COMMENT '만개의레시피 레시피 ID (URL에서 추출)',
    status          ENUM('pending', 'success', 'failed', 'skipped')
                    NOT NULL DEFAULT 'pending'
                    COMMENT '처리 상태',
    recipe_db_id    INT
                    COMMENT '저장된 recipes 테이블 ID (성공 시)',
    error_message   VARCHAR(1000)
                    COMMENT '에러 메시지 (실패 시)',
    retry_count     INT NOT NULL DEFAULT 0
                    COMMENT '재시도 횟수',
    processed_at    TIMESTAMP
                    COMMENT '처리 완료 시간',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    COMMENT '큐 등록 시간',

    UNIQUE KEY uk_recipe_url (recipe_url),
    INDEX idx_status (status),
    INDEX idx_recipe_id_ext (recipe_id_ext)
) COMMENT '스크래퍼 진행 상태 추적 테이블';
```

**추가 상태 추적 테이블 (배치 실행 단위)**:

```sql
CREATE TABLE scrape_sessions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    session_key     VARCHAR(100) NOT NULL
                    COMMENT '세션 식별키 (날짜+시각)',
    target_category VARCHAR(50)
                    COMMENT '크롤링 대상 카테고리 (cat4 코드 또는 all)',
    target_count    INT
                    COMMENT '목표 수집 레시피 수',
    collected_count INT NOT NULL DEFAULT 0
                    COMMENT '현재까지 수집된 수',
    status          ENUM('running', 'paused', 'completed', 'failed')
                    NOT NULL DEFAULT 'running',
    started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at        TIMESTAMP,
    UNIQUE KEY uk_session_key (session_key)
) COMMENT '스크래핑 배치 세션 관리 테이블';
```

---

### 4.3 중복 방지 전략

**레시피 중복 방지**:

1. **URL 기반 중복 확인**: `scrape_progress.recipe_url`에 UNIQUE KEY 적용
   - 목록 크롤링 중 이미 처리된 URL은 INSERT IGNORE로 스킵
2. **이름 기반 중복 확인**: `recipes.name`이 이미 존재하면 UPDATE 또는 SKIP
   - `source_url`이 같으면 → UPDATE (정보 갱신)
   - `source_url`이 다르면 → SKIP (다른 출처의 동명 음식)
3. **사이트 ID 기반 확인**: `scrape_progress.recipe_id_ext` (만개의레시피 ID)로 1차 확인

**재료 중복 방지**:
- `recipe_id` + `ingredient_name` 조합으로 유일성 확인
- 레시피 재수집 시 기존 재료 삭제 후 재삽입 (DELETE + INSERT)

---

## 5. 기술 스택 선택

### 5.1 HTTP 요청 라이브러리

**선택: axios**

| 라이브러리 | 장점 | 단점 | 선택 이유 |
|-----------|------|------|---------|
| **axios** | 메인 앱에서 이미 사용, 안정적, Promise 기반, 타임아웃 설정 용이 | 별도 번들 | 기존 코드베이스 일관성, 팀 친숙도 |
| got | 최신 API, retry 내장 | ESM 전용(v12+), CommonJS 비호환 | CommonJS 프로젝트와 충돌 가능 |
| node-fetch | 브라우저 Fetch API 호환 | v3부터 ESM 전용 | 같은 이유로 제외 |

**axios 설정 포인트**:
```
기본 헤더: User-Agent (일반 브라우저 문자열)
타임아웃: 15,000ms
응답 인코딩: EUC-KR 대응 (iconv-lite 조합)
자동 리다이렉트: 최대 3회
```

> **인코딩 주의**: 10000recipe.com은 `UTF-8`로 서빙하나, 일부 응답이 `EUC-KR`일 수 있음.
> `iconv-lite` 라이브러리를 함께 사용하여 인코딩 자동 감지 처리 필요.

---

### 5.2 HTML 파싱

**선택: cheerio (1차) + JSON-LD 파싱 (주요 경로)**

| 라이브러리 | 장점 | 단점 | 선택 이유 |
|-----------|------|------|---------|
| **cheerio** | jQuery 문법, 빠름, Node.js 표준, 서버 사이드 전용 | JS 렌더링 불가 | 정적 HTML 파싱에 최적, 가볍고 안정적 |
| puppeteer | 실제 브라우저, JS 실행 가능 | 무거움(Chromium), 느림, 리소스 多 | 동적 콘텐츠 필요 시 폴백으로만 사용 |
| playwright | puppeteer보다 안정적 | 더 무거움 | 최후 수단 폴백 |

**전략**:
- 기본: `axios + cheerio + JSON-LD 파싱` (충분히 처리 가능)
- 폴백: 재료 목록이 AJAX 방식 확인 시 `puppeteer` 선택적 추가
- JSON-LD가 모든 레시피에 있는 경우 cheerio 사용 최소화

---

### 5.3 큐 시스템

**선택: p-queue**

| 라이브러리 | 장점 | 단점 | 선택 이유 |
|-----------|------|------|---------|
| **p-queue** | 경량, concurrency 제어, Promise 기반, 설치 쉬움 | 인메모리 (재시작 시 큐 소실) | 간단하고 충분, 진행 상태는 DB로 관리 |
| bull | Redis 기반, 내구성, 분산 | Redis 필수, 복잡 | 프로젝트 스케일에 과도함 |
| 자체 구현 | 완전 제어 | 개발 비용, 버그 위험 | 검증된 라이브러리 선호 |

> 큐 소실 문제는 `scrape_progress` 테이블에서 `status='pending'` 레코드를 읽어 재시작 시 큐 복원으로 해결.

---

### 5.4 이미지 처리

**Phase 1 (URL 저장)**: 추가 라이브러리 불필요, URL만 저장.

**Phase 2 (로컬 다운로드, 선택적)**:
- `axios`의 `responseType: 'stream'` + Node.js `fs.createWriteStream` 조합
- 별도 이미지 처리 라이브러리 불필요 (리사이징 등은 하지 않음)

---

### 5.5 기타 유틸리티

| 용도 | 라이브러리 | 이유 |
|------|-----------|------|
| DB 연결 | mariadb (npm) | 메인 앱과 동일 드라이버 |
| 환경 변수 | dotenv | 메인 앱과 동일 |
| 인코딩 변환 | iconv-lite | EUC-KR 대응 |
| 로그 | winston 또는 console | winston은 파일 로그에 유용 |

---

## 6. 실제 HTML 선택자 (분석 결과)

### 6.1 레시피 목록 페이지 선택자 테이블

| 데이터 항목 | CSS 선택자 / 추출 방법 | 예시 값 |
|------------|----------------------|--------|
| 레시피 목록 컨테이너 | `ul` (페이지 내 메인 ul) | - |
| 개별 레시피 아이템 | `ul > li` | `<li>...</li>` |
| 레시피 상세 링크 | `li a[href^="/recipe/"]` | `/recipe/6912734` |
| 레시피 외부 ID | `href` 값에서 정규식 추출 | `6912734` |
| 썸네일 이미지 URL | `li a img` → `src` 속성 | `https://recipe1.ezmember.co.kr/.../xxx_m.jpg` |
| 레시피 제목 | `li a:not([href*="profile"])` 텍스트 | `새송이버섯간장버터구이 만들기` |
| 별점 (간접) | `img[src*="icon_star2_on"]` 개수 | 5개 → 별점 5 |
| 총 레시피 수 | 페이지 텍스트 매칭 | `총 267,332개` |

### 6.2 레시피 상세 페이지 선택자 테이블

| 데이터 항목 | CSS 선택자 / 추출 방법 | 실제 확인 여부 |
|------------|----------------------|-------------|
| JSON-LD 전체 | `script[type="application/ld+json"]` | 확인됨 |
| 음식 이름 | JSON-LD `.name` / `h3:first-of-type` | 확인됨 |
| 대표 이미지 | JSON-LD `.image[0]` / `img#main_thumbs` | 확인됨 |
| 작성자 | JSON-LD `.author.name` | 확인됨 |
| 조리 시간 | JSON-LD `.totalTime` (ISO 8601) | 확인됨 |
| 인분 수 | JSON-LD `.recipeYield` | 확인됨 |
| 재료 목록 | JSON-LD `.recipeIngredient[]` | 확인됨 |
| 조리 단계 | JSON-LD `.recipeInstructions[]` | 확인됨 |
| 단계별 이미지 | `recipeInstructions[N].image` | 확인됨 |
| 재료 컨테이너 (HTML) | `div#divConfirmedMaterialArea` | 확인됨 |
| 조리 순서 컨테이너 (HTML) | `.view_step_cont` | 확인됨 |
| 조리 단계 이미지 (HTML) | `img[id^="stepimg"]` | 확인됨 |
| 태그 목록 | `a[href^="/recipe/list.html?q="]` | 확인됨 |
| 좋아요 버튼 | `#availLike` | 확인됨 |

### 6.3 데이터 파싱 규칙

**조리 시간 변환 (ISO 8601 → 텍스트)**:
```
PT30M → "30분"
PT1H → "1시간"
PT1H30M → "1시간 30분"
PT2H → "2시간 이상"
```

**인분 수 파싱**:
```
"2 servings" → 2
"6 servings" → 6
"6인분 이상" → 6 (HTML 텍스트에서)
```

**재료 텍스트 파싱 (정규식 패턴)**:
```
원문 예시: "돼지등뼈 2Kg"
파싱:
  - ingredient_name: "돼지등뼈"
  - quantity: 2
  - unit: "Kg"

원문 예시: "대파 1개"
파싱:
  - ingredient_name: "대파"
  - quantity: 1
  - unit: "개"

원문 예시: "소금 약간"
파싱:
  - ingredient_name: "소금"
  - quantity: NULL
  - unit: "약간"

정규식: /^(.+?)\s+([\d./]+|약간|적당량)?\s*([가-힣a-zA-Z]+)?$/
```

**재료 타입 분류 패턴**:
```
섹션 헤더 패턴 → ingredient_type 매핑:
  "[메인재료]", "[재료]", "[필수]", "【재료】" → 'main'
  "[양념]", "[소스]", "【양념】", "[양념장]"    → 'seasoning'
  패턴 없이 첫 번째 재료 → 기본 'main'으로 처리
```

---

## 7. 구현 단계 계획

### Phase 1: 기본 구조 설정 (예상 1일)

**목표**: 스크래퍼 디렉토리 구조 생성 및 기본 모듈 설정

**작업 목록**:
- `scraper/` 디렉토리 생성
- `scraper/package.json` 작성 (axios, cheerio, p-queue, mariadb, dotenv, iconv-lite)
- `scraper/config.js` 작성 (딜레이, 동시성, URL 베이스, 카테고리 목록)
- `scraper/utils/logger.js` 구현 (콘솔 + 파일 로그)
- `scraper/utils/rateLimiter.js` 구현 (지연 함수, 지터 적용)
- MariaDB에 `scrape_progress`, `scrape_sessions` 테이블 생성 SQL 준비

**완료 기준**: `node scraper/index.js --dry-run` 실행 시 오류 없이 설정 출력

---

### Phase 2: 목록 페이지 크롤러 (예상 1일)

**목표**: 레시피 목록 페이지에서 레시피 ID와 URL 수집

**작업 목록**:
- `scraper/crawler/listCrawler.js` 구현
  - 카테고리 코드와 페이지 번호로 URL 생성
  - HTML fetch → Cheerio 파싱
  - 레시피 링크(`/recipe/[ID]`) 추출
  - 빈 페이지 감지 (목록 아이템 0개 = 마지막 페이지)
  - `scrape_progress` 테이블에 `status='pending'`으로 등록
- `scraper/utils/queue.js` 구현 (p-queue 래퍼)

**완료 기준**: 지정 카테고리의 1~3 페이지를 크롤링하여 레시피 URL 목록 DB 저장 확인

---

### Phase 3: 상세 페이지 파서 (예상 2일)

**목표**: 레시피 상세 페이지에서 모든 레시피 정보 파싱

**작업 목록**:
- `scraper/crawler/detailCrawler.js` 구현
  - URL fetch → HTML 파싱
  - JSON-LD 스키마 추출 (1차 방법)
  - HTML 선택자 폴백 처리 (JSON-LD 실패 시)
- `scraper/parsers/recipeParser.js` 구현
  - JSON-LD 데이터 → 내부 레시피 객체 변환
  - 조리 시간 ISO 8601 파싱
  - 인분 수 파싱
  - dish_type 자동 추론 (이름 키워드 기반)
- `scraper/parsers/ingredientParser.js` 구현
  - `recipeIngredient[]` 배열 파싱
  - 재료명/용량/단위 분리 정규식
  - 메인재료/양념 구분 로직

**완료 기준**: 레시피 상세 URL 하나를 입력 시 구조화된 객체로 반환 확인

---

### Phase 4: 이미지 다운로더 (예상 0.5일)

**목표**: Phase 1에서는 URL 저장, Phase 2로 로컬 다운로드 확장 가능 구조 설계

**작업 목록**:
- `scraper/storage/imageStorage.js` 구현
  - `saveImageUrl(recipeId, imageUrl)`: DB에 URL 저장
  - `downloadImage(imageUrl, destPath)`: 로컬 저장 (비활성화 상태로 구현)
  - CDN URL에서 고해상도 버전 URL로 변환 (`_m.jpg` → `_f.jpg`)

**완료 기준**: 이미지 URL이 `recipes.image_url`에 올바르게 저장 확인

---

### Phase 5: DB 저장 로직 (예상 1일)

**목표**: 파싱된 레시피 데이터를 MariaDB에 안전하게 저장

**작업 목록**:
- `scraper/storage/dbStorage.js` 구현
  - `saveRecipe(recipeData)`: recipes 테이블 INSERT
  - `saveIngredients(recipeId, ingredients)`: recipe_ingredients INSERT
  - 중복 확인 로직 (source_url 기준)
  - 트랜잭션 처리 (레시피 + 재료 원자적 저장)
  - 저장 실패 시 `scrape_progress.status = 'failed'` 업데이트

**완료 기준**: 파싱된 레시피 10개를 DB에 저장하고 메인 앱에서 조회 가능 확인

---

### Phase 6: 진행 상태 관리 및 전체 통합 (예상 1일)

**목표**: 중단 후 재시작, 전체 워크플로우 통합

**작업 목록**:
- `scraper/utils/progressTracker.js` 구현
  - 세션 생성/갱신
  - `pending` 상태 레코드 재시작 시 큐 복원
  - 진행률 출력 (N / 목표 수)
- `scraper/index.js` 구현
  - CLI 인자 파싱 (`--category`, `--count`, `--dry-run`)
  - 전체 플로우 오케스트레이션
  - 종료 시 통계 출력

**완료 기준**: 100개 레시피 수집 → 중단 → 재시작 후 이어서 수집 확인

---

## 8. 트레이드오프 및 고려사항

### 8.1 법적/윤리적 고려사항

| 항목 | 내용 | 대응 방안 |
|------|------|---------|
| robots.txt 준수 | `/recipe/` 경로 허용 확인 완료 | 크롤링 진행 가능 |
| 이용약관 | 10000recipe.com 이용약관에 자동 수집 금지 조항 있을 수 있음 | 개인 학습/비상업적 목적임을 전제, 상업적 사용 시 별도 계약 필요 |
| 저작권 | 레시피 내용 및 이미지는 저작권 보호 대상 | **개인 사용 목적**으로 제한, 외부 공개 금지 |
| 서버 부하 | 과도한 요청은 서비스 방해가 될 수 있음 | 최소 1~3초 딜레이, 동시 요청 1~2개 제한 |

### 8.2 서버 부하 방지

**딜레이 설정 근거**:
- 일반 사용자 평균 페이지 간 이동: 3~10초
- 최소 준수 딜레이: 1초 (매우 빠른 사용자 수준)
- 권장 딜레이: 2~3초 (일반 사용자 수준)
- 야간(00:00~06:00) 실행 권장

**요청 헤더 설정**:
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Accept-Language: ko-KR,ko;q=0.9
Accept: text/html,application/xhtml+xml
```

### 8.3 실패 복구 전략

| 실패 유형 | 대응 |
|-----------|------|
| 네트워크 타임아웃 | 지수 백오프로 최대 3회 재시도 |
| HTTP 429 (Too Many Requests) | 60초 대기 후 재시도 |
| HTTP 403 (Forbidden) | 재시도 없이 `status='skipped'` 처리 |
| HTTP 404 (Not Found) | 재시도 없이 `status='skipped'` 처리 |
| DB 저장 실패 | 3회 재시도, 실패 시 `status='failed'`로 기록 후 계속 |
| JSON-LD 파싱 실패 | HTML 선택자 폴백으로 재시도 |
| 프로세스 강제 종료 | `scrape_progress`에서 `pending` 레코드 복원 |

### 8.4 예상 소요 시간

| 목표 수집 수 | 딜레이 설정 | 예상 소요 시간 |
|------------|-----------|--------------|
| 100개 | 2초/레시피 | 약 3.5분 (목록 크롤링 포함) |
| 1,000개 | 2초/레시피 | 약 35분 |
| 10,000개 | 2초/레시피 | 약 6시간 |
| 50,000개 | 2초/레시피 | 약 30시간 (야간 다회 분할 실행 권장) |

> 식단 생성 앱 운영 목적으로는 **500~1,000개** 수집이면 충분합니다.
> 카테고리별로 분할 수집 권장 (밑반찬 200개, 국/탕 100개 등).

### 8.5 데이터 용량 예측

| 데이터 종류 | 1개당 용량 | 1,000개 기준 |
|-----------|---------|------------|
| recipes 테이블 | ~2KB | ~2MB |
| recipe_ingredients 테이블 | ~1KB (재료 10개 기준) | ~1MB |
| 이미지 (URL만) | 무시 가능 | 무시 가능 |
| 이미지 (로컬 저장 시) | ~200KB/개 | ~200MB |
| scrape_progress 테이블 | ~0.5KB | ~0.5MB |
| **총계 (URL 저장)** | ~3.5KB | **~3.5MB** |

---

## 9. 설정 파라미터 설계

`scraper/config.js`에서 관리할 설정 파라미터 목록:

```javascript
// scraper/config.js 설계 (코드 아님, 파라미터 설계 참고)

module.exports = {
  // 대상 사이트
  baseUrl: 'https://www.10000recipe.com',

  // 크롤링 대상 카테고리 목록
  categories: {
    all:        { code: null,  name: '전체' },
    national:   { code: 56,   name: '메인반찬' },
    soup:       { code: 54,   name: '국/탕' },
    jjigae:     { code: 55,   name: '찌개' },
    side:       { code: 63,   name: '밑반찬' },
    rice:       { code: 52,   name: '밥/죽/떡' },
    noodle:     { code: 53,   name: '면/만두' },
    kimchi:     { code: 57,   name: '김치/젓갈/장류' },
  },

  // 수집 제한
  maxRecipesPerRun: 1000,       // 1회 실행 최대 수집 수
  maxPagesPerCategory: 50,      // 카테고리당 최대 페이지 수
  targetCategory: 'all',        // 기본 대상 카테고리

  // 요청 설정
  requestTimeout: 15000,        // 요청 타임아웃 (ms)
  minDelayMs: 1000,             // 최소 딜레이 (ms)
  maxDelayMs: 3000,             // 최대 딜레이 (ms) - 랜덤 지터
  listPageDelayMs: 2000,        // 목록 페이지 간 딜레이
  detailPageDelayMs: 1500,      // 상세 페이지 간 딜레이

  // 동시성
  listConcurrency: 1,           // 목록 페이지 동시 요청 수
  detailConcurrency: 1,         // 상세 페이지 동시 요청 수

  // 재시도
  maxRetries: 3,                // 최대 재시도 횟수
  retryDelay: 5000,             // 첫 재시도 대기 시간 (ms, 지수 백오프)

  // 이미지 처리
  saveImageLocally: false,      // true = 로컬 저장, false = URL만 저장
  imageSavePath: '../public/images/recipes/',

  // 로그
  logLevel: 'info',             // 'debug' | 'info' | 'warn' | 'error'
  logToFile: true,
  logFilePath: './logs/scraper.log',

  // HTTP 헤더
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',

  // 정렬 기준
  sortOrder: 'reco',            // 'reco' | 'recent'
};
```

**CLI 파라미터 설계**:

```
사용법: node scraper/index.js [옵션]

옵션:
  --category [코드]     크롤링 카테고리 (all, soup, jjigae, side 등, 기본: all)
  --count [숫자]        수집 목표 수 (기본: config.maxRecipesPerRun)
  --dry-run             실제 저장 없이 파싱만 테스트
  --resume              이전 중단 지점부터 재시작
  --reset               scrape_progress 초기화 후 재시작

실행 예시:
  node scraper/index.js --category side --count 200
  node scraper/index.js --category soup --count 100 --dry-run
  node scraper/index.js --resume
```

---

## 부록: 주요 URL 패턴 요약

| 용도 | URL 패턴 |
|------|---------|
| 전체 목록 1페이지 | `https://www.10000recipe.com/recipe/list.html?order=reco&page=1` |
| 카테고리 목록 | `https://www.10000recipe.com/recipe/list.html?cat4=63&page=1` |
| 레시피 상세 | `https://www.10000recipe.com/recipe/6891010` |
| 썸네일 이미지 (목록) | `https://recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash]_m.jpg` |
| 고해상도 이미지 (상세) | `https://recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash]_f.jpg` |
| 조리 단계 이미지 | `https://recipe1.ezmember.co.kr/cache/recipe/YYYY/MM/DD/[hash].jpg` |
| 태그 검색 | `https://www.10000recipe.com/recipe/list.html?q=[태그명]` |

---

*이 문서는 2026-03-26 실제 웹사이트 접속 분석을 기반으로 작성되었습니다.*
*웹사이트 구조 변경 시 HTML 선택자 재검증이 필요합니다.*
