# 식단 구성 리스트(meal_list) 기능 구현 계획

이 문서는 자동 식단 생성 웹사이트에 식단 구성 리스트(meal_list) 기능을 구현하기 위한 상세 계획을 정리한 문서입니다.

## 1. 개요

식단 구성 리스트는 전체 음식 DB에서 실제 식단 생성에 사용할 음식들을 선별하여 관리하는 기능입니다. 이 리스트에 등록된 음식들만을 기반으로 자동 식단이 생성됩니다.

## 2. 기능 요구사항

### 2.1 백엔드 요구사항

#### 2.1.1 데이터베이스 모델 (MealList.js)
- meal_list 테이블과 상호작용하는 모델 구현
- CRUD 작업 지원 (생성, 조회, 수정, 삭제)
- 페이지네이션 지원을 위한 전체 항목 수 계산 기능
- 특정 레시피가 meal_list에 이미 존재하는지 확인하는 기능

#### 2.1.2 컨트롤러 (MealListController.js)
- HTTP 요청 처리 및 응답 생성
- 입력 데이터 유효성 검사
- 에러 처리 및 적절한 HTTP 상태 코드 반환
- 페이지네이션을 지원하는 목록 조회 기능
- meal_list에 없는 레시피 조회 기능

#### 2.1.3 라우트 (mealListRoutes.js)
- RESTful API 엔드포인트 정의
- /api/meal-list 엔드포인트 접두사 적용

### 2.2 프론트엔드 요구사항

#### 2.2.1 UI 컴포넌트
- 메인요리/반찬/야식별식 탭 기반의 관리 인터페이스
- 테이블 형식의 리스트 표시
- 페이지네이션 UI
- 필터 기능 (카테고리, 요리 유형 등)
- 모달 기반의 레시피 추가 인터페이스

#### 2.2.2 JavaScript 기능
- AJAX를 통한 비동기 데이터 처리
- 실시간 UI 업데이트
- 사용자 입력 검증
- 에러 메시지 표시

## 3. 구현된 구성 요소

### 3.1 데이터베이스 모델 (src/models/MealList.js)

#### 주요 메서드
1. `addItem()` - 새 항목을 meal_list에 추가
2. `getAllItems()` - 페이지네이션을 지원하는 항목 목록 조회
3. `getTotalItemCount()` - 전체 항목 수 계산 (페이지네이션용)
4. `getItemById()` - 특정 항목 조회
5. `updateItem()` - 항목 업데이트
6. `removeItem()` - 항목 제거
7. `isRecipeInMealList()` - 레시피가 이미 리스트에 있는지 확인

### 3.2 컨트롤러 (src/controllers/MealListController.js)

#### 주요 엔드포인트
1. `GET /api/meal-list` - 모든 항목 조회 (페이지네이션 지원)
2. `POST /api/meal-list` - 새 항목 추가
3. `PUT /api/meal-list/:id` - 항목 업데이트
4. `DELETE /api/meal-list/:id` - 항목 제거
5. `GET /api/meal-list/not-in-list` - meal_list에 없는 레시피 조회

### 3.3 라우트 (src/routes/mealListRoutes.js)

#### 라우트 정의
- `/api/meal-list`에 대한 모든 엔드포인트 등록
- HTTP 메서드에 따른 적절한 컨트롤러 메서드 매핑

### 3.4 메인 애플리케이션 (src/app.js)

#### 변경사항
- mealListRoutes 모듈 등록
- `/api/meal-list` 경로에 대한 라우트 연결

### 3.5 프론트엔드 뷰 (views/meal-list/index.ejs)

#### 주요 구성
1. **탭 인터페이스**
   - 메인요리 탭
   - 반찬 탭
   - 야식/별식 탭

2. **필터 기능**
   - 카테고리별 필터
   - 요리 유형별 필터

3. **테이블 뷰**
   - 음식명, 분류, 식사 시간 설정 체크박스 표시
   - 활성 상태 및 메모 표시
   - 항목 제거 버튼

4. **페이지네이션**
   - 이전/다음 버튼
   - 페이지 번호 표시

5. **모달 기반 레시피 추가**
   - 전체 음식 DB에서 레시피 선택
   - 필터 기능 지원
   - 추가 버튼

## 4. API 명세

### 4.1 GET /api/meal-list
- **설명**: meal_list의 모든 항목 조회
- **쿼리 파라미터**:
  - `page`: 페이지 번호 (기본: 1)
  - `limit`: 페이지당 항목 수 (기본: 10)
  - `category`: 카테고리 필터 (main_dish, side_dish, special)
  - `dish_type`: 요리 유형 필터
- **응답**:
  ```json
  {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
  ```

### 4.2 POST /api/meal-list
- **설명**: 새 항목을 meal_list에 추가
- **요청 본문**:
  ```json
  {
    "recipe_id": 5,
    "can_breakfast": 0,
    "can_lunch": 1,
    "can_dinner": 1,
    "memo": "여름에만 추천"
  }
  ```
- **응답**:
  ```json
  {
    "id": 10,
    "message": "식단 구성 리스트에 추가되었습니다."
  }
  ```

### 4.3 PUT /api/meal-list/:id
- **설명**: meal_list 항목 업데이트
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
- **응답**:
  ```json
  {
    "id": 10,
    "message": "식단 구성 리스트 항목이 업데이트되었습니다."
  }
  ```

### 4.4 DELETE /api/meal-list/:id
- **설명**: meal_list에서 항목 제거
- **응답**:
  ```json
  {
    "id": 10,
    "message": "식단 구성 리스트에서 제거되었습니다."
  }
  ```

### 4.5 GET /api/meal-list/not-in-list
- **설명**: meal_list에 없는 레시피 조회
- **쿼리 파라미터**:
  - `page`: 페이지 번호 (기본: 1)
  - `limit`: 페이지당 항목 수 (기본: 10)
  - `category`: 카테고리 필터
  - `dish_type`: 요리 유형 필터
- **응답**:
  ```json
  {
    "recipes": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "limit": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
  ```

## 5. 보안 및 오류 처리

### 5.1 입력 검증
- recipe_id의 존재 여부 확인
- 레시피가 이미 meal_list에 있는지 확인
- 필수 파라미터 검증

### 5.2 오류 처리
- 적절한 HTTP 상태 코드 반환 (400, 404, 409, 500 등)
- 사용자 친화적인 오류 메시지 제공
- 데이터베이스 오류에 대한 적절한 처리

## 6. 성능 고려사항

### 6.1 페이지네이션
- 데이터베이스 레벨에서 LIMIT/OFFSET 사용
- 클라이언트에 페이지네이션 메타데이터 제공

### 6.2 인덱스 활용
- meal_list 테이블의 인덱스 활용 (recipe_id, can_breakfast, can_lunch, can_dinner)

## 7. 향후 개선 사항

1. **캐싱**: 자주 조회되는 데이터에 대한 캐싱 구현
2. **검색 기능**: 레시피 이름으로 검색하는 기능 추가
3. **정렬 기능**: 다양한 기준으로 정렬하는 기능 추가
4. **벌크 작업**: 여러 항목을 한 번에 추가/제거하는 기능
5. **엑셀 내보내기**: 리스트를 엑셀 파일로 내보내는 기능