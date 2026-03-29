// parsers/ingredientParser.js
// 목적: 재료 텍스트 파싱 (재료명, 용량, 단위, 메인/양념 구분)
// 예시: "두부 200g" → { name: "두부", quantity: 200, unit: "g", type: "main" }

'use strict';

// 단위 목록 (정규식 매칭용)
const UNITS = [
    'kg', 'g', 'mg',
    'l', 'ml', 'L',
    '컵', '큰술', '작은술', '스푼', '티스푼',
    '개', '마리', '봉지', '캔', '팩', '줄기', '장', '알', '쪽', '포기',
    '줌', '움큼',
    '조각', '판', '모', '토막',
    '적당량', '약간', '조금',
];

// 양념 키워드
const SEASONING_KEYWORDS = [
    '소금', '설탕', '간장', '된장', '고추장', '고추가루', '고춧가루',
    '참기름', '들기름', '식용유', '올리브유',
    '식초', '매실청', '올리고당', '물엿',
    '다진마늘', '마늘', '생강', '파',
    '후춧가루', '후추', '참깨', '깨소금',
    '굴소스', '새우젓', '멸치액젓', '피시소스',
    '케첩', '마요네즈', '겨자', '두반장',
];

/**
 * 재료 목록 파싱
 * @param {string[]} rawList - 원본 재료 텍스트 배열
 * @param {Object} $ - cheerio 인스턴스 (HTML 파싱 폴백용)
 * @returns {Array} 파싱된 재료 배열
 */
function parseIngredients(rawList, $) {
    if (!Array.isArray(rawList) || rawList.length === 0) {
        // HTML에서 직접 추출 시도
        return parseFromHtml($);
    }

    const result = [];
    let currentType = 'main'; // 현재 섹션 타입 추적

    rawList.forEach((raw, index) => {
        const text = String(raw).trim();
        if (!text) return;

        // 섹션 헤더 감지 (재료 구분 변경)
        if (isSectionHeader(text)) {
            currentType = detectSectionType(text);
            return;
        }

        const parsed = parseIngredientText(text);
        if (!parsed.name) return;

        // 양념 자동 감지 (섹션 헤더가 없어도)
        const autoType = isSeasoningByName(parsed.name) ? 'seasoning' : currentType;

        result.push({
            ingredientName: parsed.name,
            quantity:       parsed.quantity,
            unit:           parsed.unit,
            ingredientType: autoType,
            originalText:   text,
            sortOrder:      index,
        });
    });

    return result;
}

/**
 * HTML에서 재료 추출 (폴백)
 */
function parseFromHtml($) {
    const result = [];
    let idx = 0;

    // 재료 섹션 헤더와 재료 목록 파싱
    $('#divConfirmedMaterialArea').find('li, .ingre_list').each((_, el) => {
        const text = $(el).text().trim();
        if (!text) return;

        const parsed = parseIngredientText(text);
        if (!parsed.name) return;

        result.push({
            ingredientName: parsed.name,
            quantity:       parsed.quantity,
            unit:           parsed.unit,
            ingredientType: isSeasoningByName(parsed.name) ? 'seasoning' : 'main',
            originalText:   text,
            sortOrder:      idx++,
        });
    });

    return result;
}

/**
 * 재료 텍스트 1개 파싱
 * 예: "두부 200g" → { name: "두부", quantity: 200, unit: "g" }
 * 예: "소금 적당량" → { name: "소금", quantity: null, unit: "적당량" }
 */
function parseIngredientText(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();

    // 단위 패턴 (숫자+단위 또는 텍스트단위)
    const unitPattern = UNITS.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(
        `^(.+?)\\s+([\\d\\/\\.]+)?\\s*(${unitPattern})?\\s*$`, 'i'
    );

    const match = cleaned.match(regex);
    if (match) {
        const name = (match[1] || '').trim();
        const qRaw = (match[2] || '').trim();
        const unit = (match[3] || '').trim() || null;

        // 분수 처리: "1/2" → 0.5
        let quantity = null;
        if (qRaw) {
            if (qRaw.includes('/')) {
                const [num, den] = qRaw.split('/');
                quantity = parseFloat(num) / parseFloat(den);
            } else {
                quantity = parseFloat(qRaw) || null;
            }
        }

        return { name: name || cleaned, quantity, unit };
    }

    // 매칭 실패 시 전체를 이름으로
    return { name: cleaned, quantity: null, unit: null };
}

/**
 * 섹션 헤더 여부 감지
 * 예: "[메인재료]", "[양념]", "【양념】"
 */
function isSectionHeader(text) {
    return /^[\[【].+[\]】]$/.test(text.trim());
}

/**
 * 섹션 타입 감지
 */
function detectSectionType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('양념') || lower.includes('소스')) return 'seasoning';
    return 'main';
}

/**
 * 재료명으로 양념 여부 자동 감지
 */
function isSeasoningByName(name) {
    return SEASONING_KEYWORDS.some(kw => name.includes(kw));
}

module.exports = { parseIngredients, parseIngredientText };
