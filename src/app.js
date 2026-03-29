const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// 환경 변수 로드
dotenv.config();

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 기본 라우트
app.get('/', (req, res) => {
  res.render('index');
});

// meal_list 라우트
const mealListRoutes = require('./routes/mealListRoutes');
app.use('/api/meal-list', mealListRoutes);

// 레시피 DB 테스트 페이지
const testRoutes = require('./routes/testRoutes');
app.use('/test', testRoutes);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;