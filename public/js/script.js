// 달력 생성 함수
function generateCalendar(year, month) {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';

    // 달력 헤더 생성
    const headers = ['일', '월', '화', '수', '목', '금', '토'];
    headers.forEach(header => {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'calendar-header';
        headerDiv.textContent = header;
        calendarDiv.appendChild(headerDiv);
    });

    // 해당 월의 첫째 날과 마지막 날 구하기
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 첫째 날의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const firstDayOfWeek = firstDay.getDay();

    // 이전 달의 날짜 채우기
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDiv = document.createElement('div');
        calendarDiv.appendChild(emptyDiv);
    }

    // 현재 달의 날짜 채우기
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day unplanned';
        dayDiv.textContent = day;
        dayDiv.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 임시로 일부 날짜를 계획된 날짜로 표시
        if (day % 5 === 0) {
            dayDiv.classList.remove('unplanned');
            dayDiv.classList.add('planned');
        }

        dayDiv.addEventListener('click', function() {
            showMealPlan(this.dataset.date);
        });

        calendarDiv.appendChild(dayDiv);
    }
}

// 식단 표시 함수
function showMealPlan(date) {
    const mealPlanDisplay = document.getElementById('meal-plan-display');
    mealPlanDisplay.innerHTML = `<h3>${date} 식단</h3>`;

    // 여기에 실제 식단 데이터를 가져오는 로직을 추가해야 합니다
    mealPlanDisplay.innerHTML += `
        <p><strong>아침:</strong> 오트밀</p>
        <p><strong>점심:</strong> 김치찌개, 밥</p>
        <p><strong>저녁:</strong> 고구마 샐러드</p>
        <p><strong>재료 비용:</strong> 15,000원</p>
    `;
}

// 레시피 등록 폼 제출 처리
document.getElementById('recipe-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const recipeName = document.getElementById('recipe-name').value;
    const mealType = document.getElementById('meal-type').value;
    const ingredients = document.getElementById('ingredients').value;
    const instructions = document.getElementById('instructions').value;

    // 여기에 실제 레시피 등록 로직을 추가해야 합니다
    console.log('레시피 등록:', { recipeName, mealType, ingredients, instructions });

    alert(`${recipeName} 레시피가 등록되었습니다!`);
    this.reset();
});

// 페이지 로드 시 현재 달력 표시
document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    generateCalendar(now.getFullYear(), now.getMonth());
});