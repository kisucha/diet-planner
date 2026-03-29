// db.js
// 목적: 스크래퍼 전용 MariaDB 연결 풀 (메인 앱과 별도 인스턴스)
// 메인 앱의 동일한 DB에 접근하되, 연결은 독립적으로 관리

'use strict';

const mysql  = require('mysql2/promise');
const config = require('./config');
const logger = require('./utils/logger');

const pool = mysql.createPool(config.db);

/**
 * DB 연결 테스트
 * @returns {Promise<boolean>}
 */
async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        logger.info('DB 연결 성공');
        return true;
    } catch (err) {
        logger.error(`DB 연결 실패: ${err.message}`);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * 쿼리 실행 헬퍼
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

module.exports = { pool, query, testConnection };
