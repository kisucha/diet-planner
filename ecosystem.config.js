// ecosystem.config.js
// 목적: PM2 프로세스 관리 설정 파일
// 사용법:
//   pm2 start ecosystem.config.js          # 전체 앱 시작
//   pm2 start ecosystem.config.js --only diet-app   # 앱만 시작
//   pm2 reload ecosystem.config.js         # 무중단 재시작
//   pm2 save                               # 현재 프로세스 목록 저장
//   pm2 startup                            # 서버 재부팅 시 자동 시작 등록

'use strict';

module.exports = {
  apps: [
    // ─────────────────────────────────────────
    // 메인 웹 서비스 (Express)
    // ─────────────────────────────────────────
    {
      name: 'diet-app',
      script: 'src/app.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      // 로그 설정
      out_file: './logs/app-out.log',
      error_file: './logs/app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    },

    // ─────────────────────────────────────────
    // 레시피 스크레이퍼 (백그라운드 수집 프로세스)
    // 주의: 수동 실행이 필요할 경우 아래 명령 사용
    //   pm2 start ecosystem.config.js --only diet-scraper
    //   pm2 stop diet-scraper   # 수집 완료 후 중지
    // ─────────────────────────────────────────
    {
      name: 'diet-scraper',
      script: 'scraper/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,   // 수집 완료 후 자동 재시작 안 함
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      out_file: './logs/scraper-out.log',
      error_file: './logs/scraper-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
