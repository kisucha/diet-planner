// crawler/listCrawler.js
// 목적: 만개의 레시피 목록 페이지 크롤링
// 역할: 카테고리별 레시피 ID 목록 수집

'use strict';

const axios   = require('axios');
const cheerio = require('cheerio');
const config  = require('../config');
const logger  = require('../utils/logger');
const { delay, retryDelay } = require('../utils/rateLimiter');

/**
 * 목록 페이지 1개에서 레시피 ID 배열 추출
 * @param {string} categoryCode - 카테고리 코드 (예: '54', '55', 'all')
 * @param {number} page - 페이지 번호 (1부터)
 * @returns {Promise<{ids: string[], hasNext: boolean}>}
 */
async function fetchListPage(categoryCode, page) {
    const { baseUrl, listPath, userAgent } = config.target;
    const { timeoutMs, retryCount }        = config.rateLimit;

    // URL 구성
    const params = new URLSearchParams({ order: 'reco', page: String(page) });
    if (categoryCode && categoryCode !== 'all') {
        params.set('cat4', categoryCode);
    }
    const url = `${baseUrl}${listPath}?${params.toString()}`;

    let lastErr;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            const resp = await axios.get(url, {
                timeout: timeoutMs,
                headers: {
                    'User-Agent': userAgent,
                    'Accept-Language': 'ko-KR,ko;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml',
                }
            });

            const $ = cheerio.load(resp.data);
            const ids = [];

            // 레시피 링크에서 ID 추출: href="/recipe/[ID]"
            $('a[href^="/recipe/"]').each((_, el) => {
                const href = $(el).attr('href') || '';
                const match = href.match(/^\/recipe\/(\d+)$/);
                if (match) {
                    ids.push(match[1]);
                }
            });

            // 중복 제거
            const uniqueIds = [...new Set(ids)];

            // 다음 페이지 존재 여부: 다음 페이지 링크 또는 결과가 있으면 true
            const nextPageLink = $(`a[href*="page=${page + 1}"]`).length > 0;
            const hasNext = uniqueIds.length > 0 && nextPageLink;

            logger.debug(`목록 ${categoryCode} p.${page}: ${uniqueIds.length}개 ID 수집`);
            return { ids: uniqueIds, hasNext };

        } catch (err) {
            lastErr = err;
            logger.warn(`목록 페이지 요청 실패 (시도 ${attempt}/${retryCount}): ${url} - ${err.message}`);
            if (attempt < retryCount) await retryDelay(attempt);
        }
    }

    logger.error(`목록 페이지 수집 최종 실패: ${url}`);
    return { ids: [], hasNext: false };
}

/**
 * 카테고리 전체 레시피 ID 수집 (일일 제한 고려)
 * @param {string} categoryCode - 카테고리 코드
 * @param {number} startPage    - 시작 페이지 (재시작 시 사용)
 * @param {number} remaining    - 오늘 남은 수집 가능 수
 * @param {Function} onBatch    - ID 배치 수집될 때마다 호출되는 콜백 (ids, nextPage)
 * @returns {Promise<{collected: number, lastPage: number, done: boolean}>}
 */
async function crawlCategory(categoryCode, startPage, remaining, onBatch) {
    let page      = startPage;
    let collected = 0;
    let hasNext   = true;

    while (hasNext && collected < remaining) {
        const result = await fetchListPage(categoryCode, page);

        if (result.ids.length === 0) break;

        // 남은 한도 내에서만 처리
        const canTake = Math.min(result.ids.length, remaining - collected);
        const batch   = result.ids.slice(0, canTake);

        await onBatch(batch, page + 1);

        collected += batch.length;
        hasNext    = result.hasNext && canTake === result.ids.length;
        page++;

        // 페이지 간 딜레이
        if (hasNext && collected < remaining) {
            await delay();
        }
    }

    const done = !hasNext || collected >= remaining;
    return { collected, lastPage: page, done };
}

module.exports = { fetchListPage, crawlCategory };
