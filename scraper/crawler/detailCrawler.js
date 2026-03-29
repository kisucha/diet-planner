// crawler/detailCrawler.js
// 목적: 만개의 레시피 상세 페이지 HTML 가져오기
// 역할: 레시피 ID로 상세 페이지 요청, raw HTML 반환

'use strict';

const axios  = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { delay, retryDelay } = require('../utils/rateLimiter');

/**
 * 레시피 상세 페이지 HTML 가져오기
 * @param {string} recipeId - 만개의 레시피 고유 ID
 * @returns {Promise<string|null>} HTML 문자열 또는 실패 시 null
 */
async function fetchDetail(recipeId) {
    const { baseUrl, detailPath, userAgent } = config.target;
    const { timeoutMs, retryCount }          = config.rateLimit;
    const url = `${baseUrl}${detailPath}${recipeId}`;

    let lastErr;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            const resp = await axios.get(url, {
                timeout: timeoutMs,
                headers: {
                    'User-Agent': userAgent,
                    'Accept-Language': 'ko-KR,ko;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Referer': `${baseUrl}/recipe/list.html`,
                }
            });
            return resp.data;

        } catch (err) {
            lastErr = err;

            // 404는 재시도 불필요
            if (err.response && err.response.status === 404) {
                logger.warn(`레시피 없음 (404): ${recipeId}`);
                return null;
            }

            // 429 (Too Many Requests): 더 긴 대기
            if (err.response && err.response.status === 429) {
                logger.warn(`요청 과다 (429): ${recipeId} - 30초 대기`);
                await new Promise(r => setTimeout(r, 30000));
                continue;
            }

            logger.warn(`상세 페이지 요청 실패 (시도 ${attempt}/${retryCount}): ${recipeId} - ${err.message}`);
            if (attempt < retryCount) await retryDelay(attempt);
        }
    }

    logger.error(`상세 페이지 최종 실패: ${recipeId} - ${lastErr && lastErr.message}`);
    return null;
}

module.exports = { fetchDetail };
