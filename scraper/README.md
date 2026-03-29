# 만개의 레시피 스크래퍼

메인 앱(`C:\Develop\diet\src\`)과 완전히 독립된 별도 엔진입니다.

## 최초 설정 (1회만)

### 1. 패키지 설치
```
cd C:\Develop\diet\scraper
npm install
```

### 2. DB 테이블 초기화
MariaDB에 접속 후 실행:
```sql
source C:\Develop\diet\scraper\sql\init.sql
```

### 3. 테스트 실행 (10개만, DB 저장 없음)
```
node index.js --limit=10 --dry-run
```

### 4. 실제 실행
```
node index.js
```

---

## 윈도우 작업 스케줄러 등록

`register_task.bat`을 **관리자 권한**으로 실행하면 매일 22:00에 자동 실행됩니다.

---

## 수집 데이터

| 항목 | 저장 방식 |
|------|----------|
| 레시피 기본 정보 | recipes 테이블 |
| 재료 + 용량 + 단위 | recipe_ingredients 테이블 |
| 조리 단계 텍스트 | recipes.instructions (JSON) |
| 조리 단계 이미지 URL | recipes.step_image_urls (JSON, 나중에 다운로드 가능) |
| 대표 이미지 | public/images/recipes/[id].jpg 로컬 저장 |
| 진행 상태 | scrape_progress 테이블 |

## 로그 위치
`scraper/logs/YYYY-MM-DD.log`
