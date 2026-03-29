// utils/rateLimiter.js
// 목적: 요청 간 랜덤 딜레이 적용 (서버 부하 방지 및 차단 회피)

'use strict';

const config = require('../config');

/**
 * 설정된 범위 내 랜덤 딜레이 적용
 * @returns {Promise<void>}
 */
async function delay() {
    const { minDelayMs, maxDelayMs } = config.rateLimit;
    const ms = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 재시도 대기 (실패 시 더 긴 딜레이)
 * @param {number} attempt - 현재 시도 횟수 (1부터)
 * @returns {Promise<void>}
 */
async function retryDelay(attempt) {
    const ms = config.rateLimit.retryDelayMs * attempt;
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { delay, retryDelay };
