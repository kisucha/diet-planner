// test.js - 레시피 DB 테스트 페이지 클라이언트 스크립트
'use strict';

// ── 상태 ──────────────────────────────────────────
let currentDishType = '';
let currentTitle    = '전체';
let nextCursor      = null;
let isLoading       = false;
let searchTimer     = null;
let loadedCount     = 0;

// ── 초기화 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadRecipes(true);
    initScrollTopBtn();

    // 검색 입력 (300ms 디바운스)
    document.getElementById('searchInput').addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            loadRecipes(true);
        }, 300);
    });
});

// ── 카테고리 선택 ─────────────────────────────────
function selectCategory(el, dishType, title) {
    document.querySelectorAll('.category-item').forEach(li => li.classList.remove('active'));
    el.classList.add('active');
    currentDishType = dishType;
    currentTitle    = title;
    document.getElementById('searchInput').value = '';
    loadRecipes(true);
}

// ── 레시피 목록 로드 ──────────────────────────────
async function loadRecipes(reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        nextCursor  = null;
        loadedCount = 0;
        document.getElementById('recipeGrid').innerHTML = renderSkeletons(12);
        document.getElementById('loadMoreWrap').style.display = 'none';
        document.getElementById('emptyMsg').style.display     = 'none';
        document.getElementById('contentTitle').textContent   = currentTitle;
        document.getElementById('contentCount').textContent   = '';
    }

    const search = document.getElementById('searchInput').value.trim();

    const params = new URLSearchParams({ limit: 24 });
    if (currentDishType) params.set('dish_type', currentDishType);
    if (nextCursor)       params.set('cursor', nextCursor);
    if (search)           params.set('search', search);

    try {
        const resp = await fetch(`/test/api/recipes?${params}`);
        const data = await resp.json();

        if (!data.success) throw new Error(data.error);

        const grid = document.getElementById('recipeGrid');
        if (reset) grid.innerHTML = '';

        if (data.items.length === 0 && reset) {
            document.getElementById('emptyMsg').style.display = 'block';
        } else {
            data.items.forEach(item => {
                grid.insertAdjacentHTML('beforeend', renderCard(item));
            });
            loadedCount += data.items.length;
            document.getElementById('contentCount').textContent = `${loadedCount}개 표시됨`;
        }

        nextCursor = data.nextCursor;
        document.getElementById('loadMoreWrap').style.display = data.hasMore ? 'block' : 'none';

    } catch (err) {
        console.error('loadRecipes error:', err);
        document.getElementById('recipeGrid').innerHTML =
            `<p style="color:#e74c3c;padding:20px">오류: ${err.message}</p>`;
    } finally {
        isLoading = false;
    }
}

// ── 더 보기 ───────────────────────────────────────
function loadMore() {
    if (nextCursor) loadRecipes(false);
}

// ── 카드 렌더링 ───────────────────────────────────
function renderCard(item) {
    const imgHtml = item.displayImage
        ? `<img src="${escHtml(item.displayImage)}" alt="${escHtml(item.name)}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\'card-no-img\\'>🍽️</div>'">`
        : `<div class="card-no-img">🍽️</div>`;

    const metaHtml = [
        item.dish_type_label ? `<span class="card-tag">${escHtml(item.dish_type_label)}</span>` : '',
        item.cook_time       ? `<span>⏱ ${escHtml(item.cook_time)}</span>` : '',
        item.servings        ? `<span>👤 ${item.servings}인분</span>` : '',
    ].filter(Boolean).join('');

    return `
    <div class="recipe-card" onclick="openDetail(${item.id})">
        <div class="card-img-wrap">${imgHtml}</div>
        <div class="card-body">
            <div class="card-name">${escHtml(item.name)}</div>
            <div class="card-meta">${metaHtml}</div>
        </div>
    </div>`;
}

// ── 상세 모달 ─────────────────────────────────────
async function openDetail(id) {
    document.getElementById('modalBody').innerHTML = '<div class="loading">불러오는 중...</div>';
    document.getElementById('modal').classList.add('open');
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
        const resp = await fetch(`/test/api/recipes/${id}`);
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);
        document.getElementById('modalBody').innerHTML = renderDetail(data.recipe, data.ingredients);
    } catch (err) {
        document.getElementById('modalBody').innerHTML =
            `<p style="color:#e74c3c">오류: ${err.message}</p>`;
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

function renderDetail(r, ingredients) {
    // 대표 이미지
    const imgHtml = r.displayImage
        ? `<img src="${escHtml(r.displayImage)}" alt="${escHtml(r.name)}" onerror="this.parentNode.innerHTML='<div class=\\'detail-img-none\\'>🍽️</div>'">`
        : `<div class="detail-img-none">🍽️</div>`;

    // 태그
    const tags = [r.food_category_label, r.dish_type_label, r.difficulty].filter(Boolean);
    const tagsHtml = tags.map(t => `<span class="detail-tag">${escHtml(t)}</span>`).join('');

    // 메타 정보
    const metaItems = [
        { label: '조리시간', value: r.cook_time    || '-' },
        { label: '인분',     value: r.servings ? r.servings + '인분' : '-' },
        { label: '난이도',   value: r.difficulty   || '-' },
        { label: '출처',     value: r.source_site  || '-' },
    ];
    const metaHtml = metaItems.map(m =>
        `<dt>${escHtml(m.label)}</dt><dd>${escHtml(String(m.value))}</dd>`
    ).join('');

    // 출처 링크
    const sourceHtml = r.source_url
        ? `<div class="detail-source">출처: <a href="${escHtml(r.source_url)}" target="_blank" rel="noopener">${escHtml(r.source_url)}</a></div>`
        : '';

    // 재료 테이블
    const mainIngs = ingredients.filter(i => i.ingredient_type === 'main');
    const seasonIngs = ingredients.filter(i => i.ingredient_type === 'seasoning');

    const renderIngRows = (list, type) => list.map(ing => {
        const qty = ing.quantity != null
            ? `${formatQty(ing.quantity)}${ing.unit || ''}`
            : (ing.unit || '-');
        return `<tr class="${type === 'seasoning' ? 'ing-seasoning' : ''}">
            <td>${escHtml(ing.ingredient_name)}</td>
            <td>${escHtml(qty)}</td>
            <td><span class="ing-type-badge ${type}">${type === 'seasoning' ? '양념' : '재료'}</span></td>
        </tr>`;
    }).join('');

    const ingHtml = (mainIngs.length + seasonIngs.length) > 0 ? `
        <table class="ing-table">
            <thead><tr><th>재료명</th><th>용량</th><th>구분</th></tr></thead>
            <tbody>
                ${renderIngRows(mainIngs, 'main')}
                ${renderIngRows(seasonIngs, 'seasoning')}
            </tbody>
        </table>` : '<p style="color:#aaa;font-size:.88rem">재료 정보가 없습니다.</p>';

    // 조리 순서
    const stepsHtml = r.instructions && r.instructions.length > 0
        ? `<ol class="step-list">${r.instructions.map((step, i) => {
            const text = typeof step === 'string' ? step.replace(/^\d+\.\s*/, '') : String(step);
            return `<li class="step-item">
                <div class="step-num">${i + 1}</div>
                <div>${escHtml(text)}</div>
            </li>`;
        }).join('')}</ol>`
        : '<p style="color:#aaa;font-size:.88rem">조리 방법 정보가 없습니다.</p>';

    return `
    <div class="detail-hero">
        <div class="detail-img">${imgHtml}</div>
        <div class="detail-info">
            <div class="detail-name">${escHtml(r.name)}</div>
            <div class="detail-tags">${tagsHtml}</div>
            <dl class="detail-meta-grid">${metaHtml}</dl>
            ${sourceHtml}
        </div>
    </div>

    <div class="detail-section">
        <h3>재료 (${ingredients.length}가지)</h3>
        ${ingHtml}
    </div>

    <div class="detail-section">
        <h3>조리 방법</h3>
        ${stepsHtml}
    </div>`;
}

// ── 맨 위로 버튼 ──────────────────────────────────
function initScrollTopBtn() {
    const btn = document.getElementById('btnTop');
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 300);
    });
}
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── 유틸 ──────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatQty(num) {
    if (!num) return '';
    const n = parseFloat(num);
    // 정수면 정수로, 소수면 소수점 1자리
    return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function renderSkeletons(count) {
    return Array.from({ length: count }, () => `
        <div class="recipe-card" style="pointer-events:none">
            <div class="card-img-wrap skeleton" style="aspect-ratio:1"></div>
            <div class="card-body">
                <div class="skeleton" style="height:14px;margin-bottom:6px;border-radius:4px"></div>
                <div class="skeleton" style="height:12px;width:60%;border-radius:4px"></div>
            </div>
        </div>`).join('');
}
