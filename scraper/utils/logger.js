// utils/logger.js
// 목적: 스크래퍼 전용 로거 (콘솔 + 파일 동시 출력)
// 로그 파일: scraper/logs/YYYY-MM-DD.log

'use strict';

const winston = require('winston');
const path    = require('path');
const fs      = require('fs');
const config  = require('../config');

// 로그 디렉토리 없으면 생성
if (!fs.existsSync(config.log.dir)) {
    fs.mkdirSync(config.log.dir, { recursive: true });
}

// 날짜별 로그 파일명
const today    = new Date().toISOString().slice(0, 10);
const logFile  = path.join(config.log.dir, `${today}.log`);
const errFile  = path.join(config.log.dir, `${today}-error.log`);

const logger = winston.createLogger({
    level: config.log.level,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) =>
            `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}`
        )
    ),
    transports: [
        // 콘솔 출력 (컬러)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message }) =>
                    `[${timestamp}] ${level}: ${message}`
                )
            )
        }),
        // 전체 로그 파일
        new winston.transports.File({ filename: logFile }),
        // 에러 전용 파일
        new winston.transports.File({ filename: errFile, level: 'error' }),
    ]
});

module.exports = logger;
