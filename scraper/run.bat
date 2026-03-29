@echo off
:: run.bat
:: 목적: 만개의 레시피 스크래퍼 실행 배치 파일
:: 윈도우 작업 스케줄러에서 이 파일을 실행하도록 등록

:: 로그 타임스탬프
set TIMESTAMP=%DATE% %TIME%

echo [%TIMESTAMP%] 스크래퍼 시작 >> "C:\Develop\diet\scraper\logs\scheduler.log"

:: Node.js 경로 (환경에 맞게 수정)
set NODE_PATH=node

:: 프로젝트 루트로 이동
cd /d "C:\Develop\diet"

:: 패키지 설치 확인 (최초 1회)
if not exist "scraper\node_modules" (
    echo [%TIMESTAMP%] npm install 실행 중... >> "scraper\logs\scheduler.log"
    cd scraper
    call npm install
    cd ..
)

:: 스크래퍼 실행
%NODE_PATH% scraper\index.js >> "scraper\logs\scheduler.log" 2>&1

echo [%TIMESTAMP%] 스크래퍼 종료 >> "scraper\logs\scheduler.log"
