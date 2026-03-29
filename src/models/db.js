// db.js - MariaDB 연결 설정

const mariadb = require('mariadb');

// 환경 변수에서 데이터베이스 설정 가져오기
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// 데이터베이스 연결 테스트
async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log("데이터베이스 연결 성공");
        return true;
    } catch (err) {
        console.error("데이터베이스 연결 실패:", err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

module.exports = {
    pool,
    testConnection
};