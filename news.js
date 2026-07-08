const newsData = [
    {
        title: "삼성전자, HBM 공급 기대감에 장중 강세",
        summary: "반도체 업황 회복 기대와 AI 서버 수요가 맞물리며 대형 반도체주에 매수세가 유입됐습니다.",
        source: "마켓브리프",
        publishedAt: "2026-06-11T14:35:00+09:00",
        category: "stock",
        categoryName: "종목",
        stock: "삼성전자",
        theme: "반도체"
    },
    {
        title: "2차전지 소재주, 전기차 판매 회복 기대에 동반 상승",
        summary: "전기차 수요 둔화 우려가 완화되면서 배터리 소재 관련 종목이 반등했습니다.",
        source: "증시리포트",
        publishedAt: "2026-06-11T13:10:00+09:00",
        category: "theme",
        categoryName: "테마",
        stock: "에코프로비엠",
        theme: "2차전지"
    },
    {
        title: "달러 환율 상승, 수출주와 항공주에 엇갈린 영향",
        summary: "환율 변동성이 커지며 자동차, 반도체, 항공 업종의 주가 민감도가 높아졌습니다.",
        source: "한국경제뉴스",
        publishedAt: "2026-06-11T11:20:00+09:00",
        category: "market",
        categoryName: "시장",
        stock: "현대차",
        theme: "수출주"
    },
    {
        title: "미국 기술주 반등, 국내 AI 인프라주 관심 확대",
        summary: "나스닥과 S&P 500 상승 마감 이후 국내 AI 서버, 전력설비 관련주가 주목받고 있습니다.",
        source: "글로벌마켓",
        publishedAt: "2026-06-11T09:05:00+09:00",
        category: "global",
        categoryName: "해외",
        stock: "HD현대일렉트릭",
        theme: "AI 전력"
    }
];

const state = {
    filter: "all",
    view: "timeline",
    query: ""
};

const formatters = {
    time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    date: new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" })
};

function getFilteredNews() {
    const query = state.query.trim().toLowerCase();
    return newsData
        .filter(item => state.filter === "all" || item.category === state.filter)
        .filter(item => {
            if (!query) return true;
            return [item.title, item.summary, item.stock, item.theme, item.categoryName]
                .join(" ")
                .toLowerCase()
                .includes(query);
        })
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function groupNewsByDate(news) {
    return news.reduce((groups, item) => {
        const dateKey = item.publishedAt.slice(0, 10);
        groups[dateKey] = groups[dateKey] || [];
        groups[dateKey].push(item);
        return groups;
    }, {});
}

function renderTimeline(news) {
    return news.map(item => {
        const date = new Date(item.publishedAt);
        return `
            <article class="news-card">
                <div class="news-time">
                    <span>${formatters.date.format(date)}</span>
                    <strong>${formatters.time.format(date)}</strong>
                </div>
                <div>
                    <div class="news-tags">
                        <span class="pill">${item.categoryName}</span>
                        <span class="pill">${item.theme}</span>
                    </div>
                    <h3 class="news-title">${item.title}</h3>
                    <p class="news-summary">${item.summary}</p>
                    <div class="news-meta">
                        <span>${item.source}</span>
                        <span>${item.stock}</span>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function renderDateView(news) {
    const groups = groupNewsByDate(news);
    return Object.entries(groups).map(([dateKey, items]) => {
        const date = new Date(`${dateKey}T00:00:00+09:00`);
        return `
            <section class="date-group">
                <h3>${formatters.date.format(date)}</h3>
                <div class="daily-list">
                    ${items.map(item => `
                        <div class="daily-item">
                            <span><strong>${formatters.time.format(new Date(item.publishedAt))}</strong> ${item.title}</span>
                            <span class="pill">${item.theme}</span>
                        </div>
                    `).join("")}
                </div>
            </section>
        `;
    }).join("");
}

function renderNews() {
    const news = getFilteredNews();
    const target = document.getElementById("news-list");

    if (!news.length) {
        target.innerHTML = `<div class="empty-state">검색 조건에 맞는 뉴스가 없습니다.</div>`;
        return;
    }

    target.innerHTML = state.view === "timeline" ? renderTimeline(news) : renderDateView(news);
}

function setupInteractions() {
    document.querySelectorAll("[data-filter]").forEach(button => {
        button.addEventListener("click", () => {
            state.filter = button.dataset.filter;
            document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            renderNews();
        });
    });

    document.querySelectorAll("[data-view]").forEach(button => {
        button.addEventListener("click", () => {
            state.view = button.dataset.view;
            document.querySelectorAll("[data-view]").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            renderNews();
        });
    });

    document.getElementById("search-input").addEventListener("input", event => {
        state.query = event.target.value;
        renderNews();
    });
}

function setupTheme() {
    const button = document.getElementById("theme-toggle");
    const saved = localStorage.getItem("stockhub-theme") || "dark";
    document.documentElement.dataset.theme = saved;
    button.textContent = saved === "dark" ? "다크" : "라이트";

    button.addEventListener("click", () => {
        const current = document.documentElement.dataset.theme || "dark";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("stockhub-theme", next);
        button.textContent = next === "dark" ? "다크" : "라이트";
    });
}

function init() {
    setupTheme();
    setupInteractions();
    renderNews();
}

document.addEventListener("DOMContentLoaded", init);
