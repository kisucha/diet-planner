// config.js
// 목적: 스크래퍼 전체 설정 관리 (DB, 요청 속도, 저장 경로 등)
// 메인 앱의 .env 파일을 공유 사용

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config = {
    // -------------------------
    // 데이터베이스 설정 (메인 앱과 동일 DB)
    // -------------------------
    db: {
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'diet_planner',
        port:     parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 3,     // 스크래퍼는 DB 연결 최소화
        queueLimit:      0
    },

    // -------------------------
    // 스크래핑 대상 사이트
    // -------------------------
    target: {
        baseUrl:    'https://www.10000recipe.com',
        listPath:   '/recipe/list.html',
        detailPath: '/recipe/',
        userAgent:  'Mozilla/5.0 (compatible; DietPlannerBot/1.0; +http://localhost:4000)',

        // 수집할 카테고리 (순서대로 처리)
        categories: [
            { code: '56', name: '메인반찬' },
            { code: '54', name: '국/탕'    },
            { code: '55', name: '찌개'     },
            { code: '52', name: '밥/죽/떡' },
            { code: '53', name: '면/만두'  },
            { code: '63', name: '밑반찬'   },
            { code: '60', name: '디저트'   },
            { code: '61', name: '퓨전'     },
        ]
    },

    // -------------------------
    // 요청 속도 제한 (서버 부하 방지)
    // -------------------------
    rateLimit: {
        concurrency:    3,      // 동시 요청 수
        minDelayMs:   500,      // 요청 간 최소 딜레이 (ms)
        maxDelayMs:  1000,      // 요청 간 최대 딜레이 (ms)
        retryCount:     3,      // 실패 시 재시도 횟수
        retryDelayMs: 5000,     // 재시도 대기 시간 (ms)
        timeoutMs:   15000,     // 요청 타임아웃 (ms)
    },

    // -------------------------
    // 수집 제한
    // -------------------------
    limits: {
        dailyMax:        10000, // 일일 최대 수집 수
        perCategoryMax:  99999, // 카테고리별 최대 (기본 무제한)
    },

    // -------------------------
    // 이미지 저장 경로
    // -------------------------
    image: {
        // 대표 이미지 저장 디렉토리 (메인 앱 public 폴더 내)
        localDir: require('path').join(__dirname, '..', 'public', 'images', 'recipes'),
        // 웹에서 접근할 URL 경로 접두사
        urlPrefix: '/images/recipes/',
    },

    // -------------------------
    // 로그 설정
    // -------------------------
    log: {
        dir:   require('path').join(__dirname, 'logs'),
        level: 'info',
    }
};

module.exports = config;
