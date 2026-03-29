// index.js
// 목적: 만개의 레시피 스크래퍼 메인 진입점
// 실행: node scraper/index.js
// 기능: 일 10,000개 제한, 중단/재시작 지원, 카테고리별 순차 수집

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config        = require('./config');
const db            = require('./db');
const logger        = require('./utils/logger');
const { delay }     = require('./utils/rateLimiter');
const { crawlCategory } = require('./crawler/listCrawler');
const { fetchDetail }   = require('./crawler/detailCrawler');
const { parseRecipe }   = require('./parsers/recipeParser');
const { downloadThumbnail } = require('./storage/imageStorage');
const {
    saveRecipe,
    getTodayProgress,
    updateProgress,
    isAlreadyScraped
} = require('./storage/dbStorage');

// CLI 인자 파싱
const args     = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');      // DB 저장 없이 테스트
const limitArg = args.find(a => a.startsWith('--limit='));
const limitOverride = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// =============================================
// 메인 실행
// =============================================
async function main() {
    logger.info('========================================');
    logger.info('만개의 레시피 스크래퍼 시작');
    logger.info(`모드: ${isDryRun ? 'DRY-RUN (저장 안 함)' : '실제 저장'}`);
    logger.info('========================================');

    // DB 연결 확인
    const connected = await db.testConnection();
    if (!connected) {
        logger.error('DB 연결 실패. 스크래퍼를 종료합니다.');
        process.exit(1);
    }

    // 오늘 진행 상태 조회 (재시작 지원)
    const progress  = await getTodayProgress();
    const today     = new Date().toISOString().slice(0, 10);
    const dailyMax  = limitOverride || progress.daily_limit;
    let   remaining = dailyMax - (progress.scraped_today || 0);

    logger.info(`오늘(${today}) 진행 현황: ${progress.scraped_today}/${dailyMax}개 완료`);
    logger.info(`남은 수집 가능: ${remaining}개`);

    if (remaining <= 0) {
        logger.info('오늘 일일 목표 달성 완료. 종료합니다.');
        await db.pool.end();
        return;
    }

    // 카테고리별 수집 시작
    const categories = config.target.categories;
    let   totalSaved = 0;
    let   totalSkip  = 0;
    let   totalError = 0;

    for (const cat of categories) {
        if (remaining <= 0) break;

        logger.info(`--- 카테고리 시작: [${cat.name}] (코드: ${cat.code}) ---`);

        // 이 카테고리에서 수집 재시작 페이지 결정
        const startPage = (progress.last_category === cat.code)
            ? progress.last_page
            : 1;

        const { saved, skipped, errors } = await processCategory(
            cat.code, cat.name, startPage, remaining, today
        );

        totalSaved += saved;
        totalSkip  += skipped;
        totalError += errors;
        remaining  -= saved;

        logger.info(`카테고리 [${cat.name}] 완료: 저장 ${saved}개, 스킵 ${skipped}개, 오류 ${errors}개`);

        // 카테고리 간 딜레이
        if (remaining > 0) await delay();
    }

    // 완료 처리
    const status = remaining <= 0 ? 'completed' : 'completed';
    await updateProgress(today, {
        status:        status,
        finished_at:   new Date().toISOString().slice(0, 19).replace('T', ' '),
        scraped_today: (progress.scraped_today || 0) + totalSaved,
        saved_today:   (progress.saved_today   || 0) + totalSaved,
        error_today:   (progress.error_today   || 0) + totalError,
        skipped_today: (progress.skipped_today || 0) + totalSkip,
    });

    logger.info('========================================');
    logger.info(`스크래퍼 완료: 저장 ${totalSaved}개, 스킵 ${totalSkip}개, 오류 ${totalError}개`);
    logger.info('========================================');

    await db.pool.end();
}

// =============================================
// 카테고리 1개 처리
// =============================================
async function processCategory(categoryCode, categoryName, startPage, remaining, today) {
    let saved   = 0;
    let skipped = 0;
    let errors  = 0;

    await crawlCategory(categoryCode, startPage, remaining, async (idBatch, nextPage) => {
        // 진행 상태 저장 (중단 대비)
        await updateProgress(today, {
            last_category: categoryCode,
            last_page:     nextPage,
        });

        for (const recipeId of idBatch) {
            if (saved + skipped >= remaining) break;

            // 이미 수집된 레시피 스킵
            if (await isAlreadyScraped(recipeId)) {
                skipped++;
                logger.debug(`스킵 (중복): ${recipeId}`);
                continue;
            }

            // 상세 페이지 수집
            const result = await scrapeOne(recipeId);
            if (result === 'saved') {
                saved++;
                // 진행 카운터 실시간 업데이트
                await updateProgress(today, {
                    scraped_today: (await getCurrentCount(today)) + 1,
                });
            } else if (result === 'error') {
                errors++;
            }

            // 항목 간 딜레이
            await delay();
        }
    });

    return { saved, skipped, errors };
}

// =============================================
// 레시피 1개 수집 → 파싱 → 저장
// =============================================
async function scrapeOne(recipeId) {
    const sourceUrl = `${config.target.baseUrl}${config.target.detailPath}${recipeId}`;

    try {
        // 1. 상세 페이지 HTML 가져오기
        const html = await fetchDetail(recipeId);
        if (!html) return 'error';

        // 2. 파싱
        const recipe = parseRecipe(html, recipeId, sourceUrl);
        if (!recipe || !recipe.name) {
            logger.warn(`파싱 결과 없음: ${recipeId}`);
            return 'error';
        }

        logger.info(`파싱 완료: [${recipe.name}] (재료 ${recipe.ingredients.length}개)`);

        if (isDryRun) {
            logger.info(`[DRY-RUN] 저장 스킵: ${recipe.name}`);
            return 'saved';
        }

        // 3. 대표 이미지 다운로드
        let localImage = null;
        if (recipe.imageUrl) {
            localImage = await downloadThumbnail(recipeId, recipe.imageUrl);
        }

        // 4. DB 저장
        const dbResult = await saveRecipe(recipe, localImage);
        if (!dbResult) return 'error';

        logger.info(`DB 저장 완료: [${recipe.name}] id=${dbResult.id} ${dbResult.isNew ? '(신규)' : '(업데이트)'}`);
        return 'saved';

    } catch (err) {
        logger.error(`수집 오류 (${recipeId}): ${err.message}`);
        return 'error';
    }
}

// 현재 오늘 카운터 조회
async function getCurrentCount(today) {
    const rows = await db.query(
        'SELECT scraped_today FROM scrape_progress WHERE run_date = ? LIMIT 1',
        [today]
    );
    return rows.length > 0 ? (rows[0].scraped_today || 0) : 0;
}

// =============================================
// 프로세스 종료 처리 (Ctrl+C 등 강제 중단)
// =============================================
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function gracefulShutdown(signal) {
    logger.warn(`시그널 수신(${signal}): 현재 작업 완료 후 종료합니다...`);
    const today = new Date().toISOString().slice(0, 10);
    await updateProgress(today, { status: 'stopped' }).catch(() => {});
    await db.pool.end().catch(() => {});
    process.exit(0);
}

// 실행
main().catch(err => {
    logger.error(`치명적 오류: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
});
