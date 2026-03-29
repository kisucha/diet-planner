// storage/imageStorage.js
// 목적: 대표 이미지 로컬 다운로드 및 저장 관리
// 저장 위치: public/images/recipes/[recipeId].jpg

'use strict';

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// 이미지 저장 디렉토리 초기화
function ensureImageDir() {
    if (!fs.existsSync(config.image.localDir)) {
        fs.mkdirSync(config.image.localDir, { recursive: true });
        logger.info(`이미지 디렉토리 생성: ${config.image.localDir}`);
    }
}

/**
 * 대표 이미지 다운로드 및 저장
 * @param {string} recipeId  - 레시피 ID (파일명으로 사용)
 * @param {string} imageUrl  - CDN 이미지 URL
 * @returns {Promise<string|null>} 로컬 저장 경로 또는 실패 시 null
 */
async function downloadThumbnail(recipeId, imageUrl) {
    if (!imageUrl) return null;

    ensureImageDir();

    const fileName  = `${recipeId}.jpg`;
    const localPath = path.join(config.image.localDir, fileName);
    const urlPath   = `${config.image.urlPrefix}${fileName}`;

    // 이미 다운로드된 파일은 스킵
    if (fs.existsSync(localPath)) {
        return urlPath;
    }

    try {
        const resp = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': config.target.userAgent,
                'Referer':    config.target.baseUrl,
            }
        });

        fs.writeFileSync(localPath, resp.data);
        logger.debug(`이미지 저장: ${fileName}`);
        return urlPath;

    } catch (err) {
        logger.warn(`이미지 다운로드 실패 (${recipeId}): ${err.message}`);
        return null;
    }
}

/**
 * 로컬 이미지 파일 존재 여부 확인
 * @param {string} recipeId
 * @returns {boolean}
 */
function imageExists(recipeId) {
    const localPath = path.join(config.image.localDir, `${recipeId}.jpg`);
    return fs.existsSync(localPath);
}

module.exports = { downloadThumbnail, imageExists };
