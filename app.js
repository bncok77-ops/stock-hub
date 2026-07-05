let priorityIndices = [];
let macroIndicators = [];
let usIndicators = [];

const emptyPoints = [1, 1, 1, 1, 1];
const fallbackIndicators = {
    priorityIndices: [
        { name: "코스피", label: "KOSPI", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "코스닥", label: "KOSDAQ", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "나스닥100 선물", label: "NQ Futures", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints }
    ],
    macroIndicators: [
        { name: "달러 환율", label: "USD/KRW", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "비트코인", label: "BTC/USD", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "미국채 10년", label: "Yield", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "미국채 30년", label: "Yield", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "금", label: "Gold", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "국제 유가", label: "WTI", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints }
    ],
    usIndicators: [
        { name: "나스닥", label: "NASDAQ", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "S&P 500", label: "S&P 500", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "필라델피아 반도체", label: "SOX", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "VIX", label: "Volatility", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints }
    ]
};

const newsData = [
    {
        title: "삼성전자, HBM 공급 기대감에 장중 강세",
        summary: "반도체 대형주의 수급이 개선되며 코스피 방향성에 영향을 주고 있습니다.",
        source: "마켓브리프",
        publishedAt: "2026-06-11T14:35:00+09:00",
        category: "stock",
        categoryName: "종목",
        stock: "삼성전자",
        theme: "반도체"
    },
    {
        title: "2차전지 소재주, 전기차 판매 회복 기대에 동반 상승",
        summary: "수주 전망과 정책 기대가 맞물리며 관련 종목에 단기 매수가 유입됐습니다.",
        source: "증시리포트",
        publishedAt: "2026-06-11T13:10:00+09:00",
        category: "theme",
        categoryName: "테마",
        stock: "에코프로비엠",
        theme: "2차전지"
    },
    {
        title: "원달러 환율 상승, 수출주와 외국인 수급 변수로 부각",
        summary: "환율 변동성이 커지며 자동차, 반도체, 화학 업종의 민감도가 높아졌습니다.",
        source: "한국경제데스크",
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

const themeData = [
    { name: "반도체", count: 18, leaders: "삼성전자, SK하이닉스" },
    { name: "2차전지", count: 12, leaders: "LG에너지솔루션, 에코프로비엠" },
    { name: "AI 전력", count: 9, leaders: "HD현대일렉트릭, LS ELECTRIC" },
    { name: "방산", count: 7, leaders: "한화에어로스페이스, LIG넥스원" },
    { name: "바이오", count: 6, leaders: "셀트리온, 삼성바이오로직스" }
];

const stockData = [
    { name: "삼성전자", sector: "반도체", news: 8 },
    { name: "SK하이닉스", sector: "반도체", news: 6 },
    { name: "현대차", sector: "수출주", news: 4 },
    { name: "셀트리온", sector: "바이오", news: 3 }
];

const state = {
    filter: "all",
    view: "timeline",
    query: ""
};

const formatters = {
    time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    date: new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }),
    compactDate: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
};

function formatCompactDate(date) {
    return formatters.compactDate.format(date).replace(/\s/g, "");
}

function formatMarketDate(item) {
    if (item.marketDate) return item.marketDate;
    if (!item.marketTime) return "-";
    return formatCompactDate(new Date(item.marketTime));
}

function formatDelay(item) {
    const session = item.marketSession;
    if (session?.status === "always-open") return "5분 주기 갱신";
    if (session?.status === "fx-stale") return "최근 고시";
    if (session?.status === "closed") return "장마감";
    if (session?.status === "pre") return "장전";
    if (session?.status === "post") return "시간외";
    if (session?.status === "unknown") return "확인 필요";

    const seconds = item.delaySeconds;
    if (!Number.isFinite(seconds)) return "지연 확인 중";
    if (seconds < 60) return `지연 ${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `지연 ${minutes}분`;
    return session?.label || "거래중";
}

function createSparkline(points, status) {
    const width = 180;
    const height = 44;
    const safePoints = points && points.length > 1 ? points : [1, 1];
    const min = Math.min(...safePoints);
    const max = Math.max(...safePoints);
    const range = max - min || 1;
    const step = width / (safePoints.length - 1);
    const path = safePoints.map((point, index) => {
        const x = index * step;
        const y = height - ((point - min) / range) * (height - 8) - 4;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    return `
        <svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="최근 흐름 차트">
            <path d="${path}" class="${status}"></path>
        </svg>
    `;
}

function renderIndicatorCard(item, priority = false) {
    return `
        <article class="indicator-card${priority ? " priority" : ""}">
            <div class="indicator-top">
                <span class="indicator-name">${item.name}</span>
                <span class="indicator-label">${item.label}</span>
            </div>
            <div class="indicator-value-row">
                <div class="indicator-value">${item.value}</div>
                <div class="indicator-change ${item.status}">
                    ${item.change}<br>${item.percent}
                </div>
            </div>
            ${createSparkline(item.points, item.status)}
            <div class="indicator-meta">
                <span>기준일 ${formatMarketDate(item)}</span>
                <span>${formatDelay(item)}</span>
            </div>
        </article>
    `;
}

function renderIndicators() {
    document.getElementById("priority-indices").innerHTML = priorityIndices.map(item => renderIndicatorCard(item, true)).join("");
    document.getElementById("macro-indicators").innerHTML = macroIndicators.map(item => renderIndicatorCard(item)).join("");
    document.getElementById("us-indicators").innerHTML = usIndicators.map(item => renderIndicatorCard(item)).join("");
}

function renderTicker() {
    const items = [...priorityIndices, ...macroIndicators, ...usIndicators].map(item => `
        <span class="ticker-item">
            ${item.name}
            <span class="${item.status}">${item.value} ${item.percent}</span>
            <span>${formatMarketDate(item)}</span>
        </span>
    `).join("");
    document.getElementById("ticker-track").innerHTML = items + items;
}

function setIndicators(data) {
    priorityIndices = data.priorityIndices || fallbackIndicators.priorityIndices;
    macroIndicators = data.macroIndicators || fallbackIndicators.macroIndicators;
    usIndicators = data.usIndicators || fallbackIndicators.usIndicators;
    renderIndicators();
    renderTicker();
}

function updateDataStatus(message, isError = false) {
    const status = document.getElementById("data-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`${url} 요청 실패: ${response.status}`);
    }
    return response.json();
}

async function fetchMarketData() {
    try {
        let data;
        const cacheBust = `v=${Date.now()}`;
        const isLocalServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);

        if (isLocalServer) {
            try {
                data = await fetchJson(`api/market-summary?${cacheBust}`);
            } catch {
                data = await fetchJson(`api/market-summary.json?${cacheBust}`);
            }
        } else {
            data = await fetchJson(`api/market-summary.json?${cacheBust}`);
        }

        setIndicators(data);
        const updated = new Date(data.generatedAt);
        updateDataStatus(`갱신 ${formatCompactDate(updated)} ${formatters.time.format(updated)} · 무료 GitHub Pages는 약 5분 주기로 갱신`);
    } catch (error) {
        console.error(error);
        updateDataStatus("시장 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.", true);
    }
}

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

function groupNewsByDate(news) {
    return news.reduce((groups, item) => {
        const dateKey = item.publishedAt.slice(0, 10);
        groups[dateKey] = groups[dateKey] || [];
        groups[dateKey].push(item);
        return groups;
    }, {});
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
    renderDateGroups();
}

function renderDateGroups() {
    const sortedNews = [...newsData].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const groups = groupNewsByDate(sortedNews);
    document.getElementById("date-groups").innerHTML = Object.entries(groups).map(([dateKey, items]) => {
        const date = new Date(`${dateKey}T00:00:00+09:00`);
        return `
            <section class="date-group">
                <h3>${formatters.date.format(date)}</h3>
                <div class="daily-list">
                    ${items.slice(0, 4).map(item => `
                        <div class="daily-item">
                            <span><strong>${formatters.time.format(new Date(item.publishedAt))}</strong> ${item.title}</span>
                        </div>
                    `).join("")}
                </div>
            </section>
        `;
    }).join("");
}

function renderSideRail() {
    document.getElementById("theme-list").innerHTML = themeData.map(item => `
        <button type="button" class="theme-item" data-query="${item.name}">
            <strong>${item.name}</strong>
            <span>${item.count}건 · ${item.leaders}</span>
        </button>
    `).join("");

    document.getElementById("stock-list").innerHTML = stockData.map(item => `
        <button type="button" class="stock-chip" data-query="${item.name}">
            <strong>${item.name}</strong>
            <span>${item.sector} · 뉴스 ${item.news}</span>
        </button>
    `).join("");
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

    document.querySelectorAll("[data-query]").forEach(button => {
        button.addEventListener("click", () => {
            const searchInput = document.getElementById("search-input");
            state.query = button.dataset.query;
            searchInput.value = state.query;
            document.getElementById("news").scrollIntoView({ behavior: "smooth", block: "start" });
            renderNews();
        });
    });

    document.getElementById("theme-toggle").addEventListener("click", () => {
        const current = document.documentElement.dataset.theme || "dark";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("stockhub-theme", next);
        document.getElementById("theme-toggle").textContent = next === "dark" ? "다크" : "라이트";
    });
}

function loadTheme() {
    const saved = localStorage.getItem("stockhub-theme") || "dark";
    document.documentElement.dataset.theme = saved;
    document.getElementById("theme-toggle").textContent = saved === "dark" ? "다크" : "라이트";
}

function init() {
    loadTheme();
    setIndicators(fallbackIndicators);
    renderSideRail();
    renderNews();
    setupInteractions();
    fetchMarketData();
    setInterval(fetchMarketData, 300_000);
}

document.addEventListener("DOMContentLoaded", init);
