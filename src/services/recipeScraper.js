// recipeScraper.js - 레시피 스크래핑 서비스
const axios = require('axios');
const cheerio = require('cheerio');
const Recipe = require('../models/Recipe');
const { pool } = require('../models/db');

/**
 * 레시피 스크래핑 서비스 클래스
 * 다양한 레시피 웹사이트에서 데이터를 수집하고 파싱하여
 * 로컬 데이터베이스에 저장하는 기능을 제공합니다.
 */
class RecipeScraperService {
    constructor() {
        // 지원하는 레시피 사이트 목록
        this.supportedSites = {
            'allrecipes': {
                baseUrl: 'https://www.allrecipes.com',
                selectors: {
                    title: 'h1.headline',
                    ingredients: 'ul.ingredients-list li',
                    instructions: 'ul.instructions-section li',
                    prepTime: '.recipe-meta-container .recipe-meta-item:first-child .recipe-meta-item-body',
                    cookTime: '.recipe-meta-container .recipe-meta-item:nth-child(2) .recipe-meta-item-body'
                }
            },
            'epicurious': {
                baseUrl: 'https://www.epicurious.com',
                selectors: {
                    title: 'h1[data-testid="ContentHeaderHed"]',
                    ingredients: 'div.List-ingredient ul li',
                    instructions: 'div.Step ol li',
                    prepTime: '[data-testid="ContentHeaderTime"]',
                    cookTime: '[data-testid="ContentHeaderCookTime"]'
                }
            }
        };

        // 레시피 모델 초기화
        this.recipeModel = new Recipe(pool);
    }

    /**
     * 지정된 웹사이트에서 레시피 데이터를 스크래핑합니다.
     * @param {string} siteName - 스크래핑할 사이트 이름 ('allrecipes', 'epicurious')
     * @param {string} recipeUrl - 레시피 URL
     * @returns {Object} 파싱된 레시피 데이터
     */
    async scrapeRecipe(siteName, recipeUrl) {
        try {
            // 지원하는 사이트인지 확인
            if (!this.supportedSites[siteName]) {
                throw new Error(`지원하지 않는 사이트입니다: ${siteName}`);
            }

            // HTTP 요청으로 페이지 내용 가져오기
            const response = await axios.get(recipeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000 // 10초 타임아웃
            });

            // HTML 파싱
            const $ = cheerio.load(response.data);
            const siteConfig = this.supportedSites[siteName];

            // 레시피 데이터 추출
            const recipeData = {
                title: this.extractText($, siteConfig.selectors.title),
                ingredients: this.extractList($, siteConfig.selectors.ingredients),
                instructions: this.extractList($, siteConfig.selectors.instructions),
                prepTime: this.extractText($, siteConfig.selectors.prepTime),
                cookTime: this.extractText($, siteConfig.selectors.cookTime),
                sourceUrl: recipeUrl,
                sourceSite: siteName
            };

            return recipeData;
        } catch (error) {
            // 네트워크 오류 또는 파싱 오류 처리
            throw new Error(`레시피 스크래핑 중 오류 발생: ${error.message}`);
        }
    }

    /**
     * CSS 선택자를 사용하여 텍스트를 추출합니다.
     * @param {CheerioAPI} $ - Cheerio 인스턴스
     * @param {string} selector - CSS 선택자
     * @returns {string} 추출된 텍스트
     */
    extractText($, selector) {
        try {
            return $(selector).first().text().trim();
        } catch (error) {
            return '';
        }
    }

    /**
     * CSS 선택자를 사용하여 리스트 항목들을 추출합니다.
     * @param {CheerioAPI} $ - Cheerio 인스턴스
     * @param {string} selector - CSS 선택자
     * @returns {Array<string>} 추출된 리스트 항목들
     */
    extractList($, selector) {
        try {
            const items = [];
            $(selector).each((index, element) => {
                const text = $(element).text().trim();
                if (text) {
                    items.push(text);
                }
            });
            return items;
        } catch (error) {
            return [];
        }
    }

    /**
     * 스크래핑한 레시피를 데이터베이스에 저장합니다.
     * @param {Object} recipeData - 스크래핑된 레시피 데이터
     * @param {string} mealType - 식사 유형 (예: breakfast, lunch, dinner, snack)
     * @returns {Object} 저장 결과
     */
    async saveRecipe(recipeData, mealType = 'dinner') {
        try {
            // 데이터 유효성 검사
            if (!recipeData.title || !recipeData.ingredients.length || !recipeData.instructions.length) {
                throw new Error('필수 레시피 정보가 누락되었습니다.');
            }

            // 레시피 데이터베이스에 저장
            const result = await this.recipeModel.addRecipe(
                recipeData.title,
                mealType,
                JSON.stringify(recipeData.ingredients), // 배열을 JSON 문자열로 변환
                JSON.stringify(recipeData.instructions) // 배열을 JSON 문자열로 변환
            );

            return {
                success: true,
                id: result.insertId,
                message: '레시피가 성공적으로 저장되었습니다.'
            };
        } catch (error) {
            throw new Error(`레시피 저장 중 오류 발생: ${error.message}`);
        }
    }

    /**
     * 여러 레시피를 일괄 스크래핑하고 저장합니다.
     * @param {Array<Object>} recipeUrls - {siteName, url, mealType} 객체들의 배열
     * @returns {Array<Object>} 처리 결과 배열
     */
    async batchScrapeAndSave(recipeUrls) {
        const results = [];

        for (const item of recipeUrls) {
            try {
                // 레시피 스크래핑
                const recipeData = await this.scrapeRecipe(item.siteName, item.url);

                // 레시피 저장
                const saveResult = await this.saveRecipe(recipeData, item.mealType);

                results.push({
                    url: item.url,
                    success: true,
                    ...saveResult
                });
            } catch (error) {
                results.push({
                    url: item.url,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 레시피 API를 통해 데이터를 가져옵니다. (대안 방법)
     * @param {string} searchTerm - 검색어
     * @returns {Array<Object>} 레시피 데이터 배열
     */
    async fetchFromAPI(searchTerm) {
        try {
            // Spoonacular API 예시 (API 키 필요)
            const apiKey = process.env.SPOONACULAR_API_KEY;
            if (!apiKey) {
                throw new Error('API 키가 설정되지 않았습니다.');
            }

            const response = await axios.get(
                `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(searchTerm)}&apiKey=${apiKey}&addRecipeInformation=true`
            );

            return response.data.results.map(recipe => ({
                title: recipe.title,
                ingredients: recipe.extendedIngredients.map(ing => ing.original),
                instructions: recipe.analyzedInstructions[0]?.steps?.map(step => step.step) || [],
                prepTime: recipe.readyInMinutes ? `${recipe.readyInMinutes} 분` : '',
                cookTime: '',
                sourceUrl: recipe.sourceUrl,
                sourceSite: 'spoonacular'
            }));
        } catch (error) {
            throw new Error(`레시피 API 호출 중 오류 발생: ${error.message}`);
        }
    }
}

module.exports = RecipeScraperService;