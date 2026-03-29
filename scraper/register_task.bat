@echo off
:: register_task.bat
:: 목적: 윈도우 작업 스케줄러에 스크래퍼 등록 (관리자 권한으로 실행)
:: 실행: 우클릭 → "관리자 권한으로 실행"

echo 윈도우 작업 스케줄러에 스크래퍼를 등록합니다...
echo.

:: 기존 작업 삭제 (있으면)
schtasks /delete /tn "DietRecipeScraper" /f > nul 2>&1

:: 새 작업 등록
:: - 매일 22:00 실행
:: - 로그인 여부 무관 실행
:: - 최대 6시간 실행 허용
schtasks /create ^
    /tn "DietRecipeScraper" ^
    /tr "\"C:\Develop\diet\scraper\run.bat\"" ^
    /sc DAILY ^
    /st 22:00 ^
    /ru SYSTEM ^
    /rl HIGHEST ^
    /f ^
    /xml "C:\Develop\diet\scraper\task_template.xml"

if %ERRORLEVEL% == 0 (
    echo.
    echo [성공] 작업 스케줄러 등록 완료!
    echo   작업명: DietRecipeScraper
    echo   실행시간: 매일 오후 10:00
    echo   실행파일: C:\Develop\diet\scraper\run.bat
) else (
    echo.
    echo [실패] 등록 실패. XML 방식으로 재시도합니다...
    :: XML 없을 경우 단순 등록
    schtasks /create ^
        /tn "DietRecipeScraper" ^
        /tr "cmd /c \"C:\Develop\diet\scraper\run.bat\"" ^
        /sc DAILY ^
        /st 22:00 ^
        /f
    echo 등록 완료 (단순 방식)
)

echo.
echo 등록된 작업 확인:
schtasks /query /tn "DietRecipeScraper" /fo LIST

pause
