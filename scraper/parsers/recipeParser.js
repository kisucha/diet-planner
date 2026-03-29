// parsers/recipeParser.js
// 목적: 만개의 레시피 상세 페이지 HTML에서 레시피 데이터 추출
// 전략: JSON-LD 스키마 1차 파싱 → HTML 선택자 2차 폴백

'use strict';

const cheerio = require('cheerio');
const logger  = require('../utils/logger');
const { parseIngredients } = require('./ingredientParser');

/**
 * HTML에서 레시피 전체 데이터 파싱
 * @param {string} html      - 상세 페이지 HTML
 * @param {string} recipeId  - 만개의 레시피 ID
 * @param {string} sourceUrl - 원본 URL
 * @returns {Object|null} 파싱된 레시피 데이터
 */
function parseRecipe(html, recipeId, sourceUrl) {
    if (!html) return null;

    const $ = cheerio.load(html);

    // 1차: JSON-LD 스키마 파싱 (가장 안정적)
    const jsonLd = extractJsonLd($);
    if (jsonLd) {
        return buildFromJsonLd(jsonLd, $, recipeId, sourceUrl);
    }

    // 2차 폴백: HTML 직접 파싱
    logger.warn(`JSON-LD 없음, HTML 파싱으로 폴백: ${recipeId}`);
    return buildFromHtml($, recipeId, sourceUrl);
}

/**
 * JSON-LD 스키마 태그 추출 및 파싱
 */
function extractJsonLd($) {
    let result = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        if (result) return; // 이미 찾았으면 스킵
        try {
            const json = JSON.parse($(el).html() || '{}');
            if (json['@type'] === 'Recipe') {
                result = json;
            }
        } catch (e) {
            // JSON 파싱 실패 무시
        }
    });
    return result;
}

/**
 * JSON-LD 데이터로 레시피 객체 구성
 */
function buildFromJsonLd(ld, $, recipeId, sourceUrl) {
    // 조리 시간 파싱 (ISO 8601 → 분 단위 문자열)
    const cookTime = parseIso8601Duration(ld.totalTime || ld.cookTime || '');

    // 인분 파싱 ("2 servings" → 2)
    const servings = parseServings(ld.recipeYield || '');

    // 대표 이미지 URL
    const imageUrl = Array.isArray(ld.image) ? ld.image[0] : (ld.image || null);

    // 조리 단계 파싱
    const { steps, stepImageUrls } = parseInstructions(ld.recipeInstructions || []);

    // 재료 파싱 (JSON-LD recipeIngredient 배열)
    const ingredients = parseIngredients(ld.recipeIngredient || [], $);

    // 카테고리/음식유형 추론
    const dishType = inferDishType($, ld.name || '', ld.recipeCategory || '');

    // 난이도 HTML에서 추출 (JSON-LD에 없음)
    const difficulty = extractDifficulty($);

    return {
        externalId:    recipeId,
        name:          (ld.name || '').trim(),
        description:   (ld.description || '').trim(),
        cookTime:      cookTime,
        servings:      servings,
        difficulty:    difficulty,
        imageUrl:      normalizeImageUrl(imageUrl),
        stepImageUrls: JSON.stringify(stepImageUrls),
        instructions:  JSON.stringify(steps),
        sourceUrl:     sourceUrl,
        sourceSite:    '10000recipe',
        dishType:      dishType.dishType,
        foodCategory:  dishType.foodCategory,
        cuisineOrigin: dishType.cuisineOrigin,
        ingredients:   ingredients,
    };
}

/**
 * HTML 직접 파싱 (JSON-LD 없을 때 폴백)
 */
function buildFromHtml($, recipeId, sourceUrl) {
    const name      = $('h3').first().text().trim() || '';
    const imageUrl  = $('#main_thumbs').attr('src') || null;
    const difficulty = extractDifficulty($);

    // 조리 단계
    const steps = [];
    const stepImageUrls = [];
    $('.view_step_cont').each((i, el) => {
        const text = $(el).text().trim();
        if (text) steps.push(`${i + 1}. ${text}`);
    });
    $('img[id^="stepimg"]').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src) stepImageUrls.push(src);
    });

    // 재료 (HTML에서 직접)
    const rawIngredients = [];
    $('#divConfirmedMaterialArea span.ingre_list_name').each((_, el) => {
        const text = $(el).text().trim();
        if (text) rawIngredients.push(text);
    });
    const ingredients = parseIngredients(rawIngredients, $);

    const dishType = inferDishType($, name, '');

    return {
        externalId:    recipeId,
        name:          name,
        description:   '',
        cookTime:      null,
        servings:      2,
        difficulty:    difficulty,
        imageUrl:      normalizeImageUrl(imageUrl),
        stepImageUrls: JSON.stringify(stepImageUrls),
        instructions:  JSON.stringify(steps),
        sourceUrl:     sourceUrl,
        sourceSite:    '10000recipe',
        dishType:      dishType.dishType,
        foodCategory:  dishType.foodCategory,
        cuisineOrigin: dishType.cuisineOrigin,
        ingredients:   ingredients,
    };
}

/**
 * ISO 8601 기간 → 분 단위 문자열 변환
 * 예: "PT1H30M" → "90분"
 */
function parseIso8601Duration(duration) {
    if (!duration) return null;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return null;
    const hours   = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const total   = hours * 60 + minutes;
    return total > 0 ? `${total}분` : null;
}

/**
 * 인분 수 파싱
 * 예: "2 servings" → 2, "4인분" → 4
 */
function parseServings(raw) {
    if (!raw) return 2;
    const match = String(raw).match(/(\d+)/);
    return match ? parseInt(match[1]) : 2;
}

/**
 * 조리 단계 배열 파싱
 */
function parseInstructions(instructions) {
    const steps         = [];
    const stepImageUrls = [];

    if (!Array.isArray(instructions)) return { steps, stepImageUrls };

    instructions.forEach((step, i) => {
        const text = typeof step === 'string' ? step : (step.text || '');
        if (text.trim()) {
            steps.push(`${i + 1}. ${text.trim()}`);
        }
        // 단계 이미지 URL (나중에 로컬 저장용으로 보관)
        const img = step.image || null;
        if (img) {
            stepImageUrls.push(Array.isArray(img) ? img[0] : img);
        } else {
            stepImageUrls.push(null); // 이미지 없는 단계는 null
        }
    });

    return { steps, stepImageUrls };
}

/**
 * 음식 유형 추론 (카테고리명/음식명 기반)
 */
function inferDishType($, name, category) {
    const cat = (category || '').toLowerCase();
    const nm  = (name || '').toLowerCase();

    // 반찬류 판정
    if (cat.includes('밑반찬') || cat.includes('반찬')) {
        return { foodCategory: 'side_dish', dishType: 'side', cuisineOrigin: 'korean' };
    }
    // 찌개류
    if (nm.includes('찌개') || nm.includes('전골') || cat.includes('찌개')) {
        return { foodCategory: 'main_dish', dishType: 'korean_jjigae', cuisineOrigin: 'korean' };
    }
    // 탕/찜류
    if (nm.includes('탕') || nm.includes('찜') || nm.includes('설렁') || nm.includes('갈비')) {
        return { foodCategory: 'main_dish', dishType: 'korean_tang', cuisineOrigin: 'korean' };
    }
    // 국/면류
    if (nm.includes('국') || nm.includes('면') || nm.includes('라면') ||
        nm.includes('칼국수') || nm.includes('냉면') || nm.includes('우동') || nm.includes('짬뽕')) {
        return { foodCategory: 'main_dish', dishType: 'korean_guk', cuisineOrigin: 'korean' };
    }
    // 외국요리 (카테고리가 퓨전이거나 이름에 외래어 포함)
    if (cat.includes('퓨전') || nm.includes('파스타') || nm.includes('피자') || nm.includes('스테이크')) {
        return { foodCategory: 'main_dish', dishType: 'foreign', cuisineOrigin: 'foreign' };
    }
    // 디저트/야식
    if (cat.includes('디저트') || nm.includes('케이크') || nm.includes('쿠키')) {
        return { foodCategory: 'special', dishType: 'special', cuisineOrigin: 'korean' };
    }

    // 기본값: 한식 일반요리
    return { foodCategory: 'main_dish', dishType: 'korean_dish', cuisineOrigin: 'korean' };
}

/**
 * 난이도 텍스트 추출
 */
function extractDifficulty($) {
    const text = $('.view_info2').text() || $('span:contains("초급"), span:contains("중급"), span:contains("고급")').first().text();
    if (text.includes('초급')) return '초급';
    if (text.includes('중급')) return '중급';
    if (text.includes('고급')) return '고급';
    return null;
}

/**
 * 이미지 URL 정규화 (썸네일 → 고해상도 변환)
 * _m.jpg → _f.jpg 로 변경
 */
function normalizeImageUrl(url) {
    if (!url) return null;
    return url.replace(/_m\.jpg$/, '_f.jpg').replace(/^\/\//, 'https://');
}

module.exports = { parseRecipe };
