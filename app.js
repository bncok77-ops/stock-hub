let priorityIndices = [];
let macroIndicators = [];
let usIndicators = [];

const emptyPoints = [1, 1, 1, 1, 1];
const fallbackIndicators = {
    priorityIndices: [
        { name: "코스피", label: "KOSPI", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "코스닥", label: "KOSDAQ", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints },
        { name: "나스닥 100 선물", label: "NQ Futures", value: "-", change: "-", percent: "-", status: "flat", points: emptyPoints }
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

const formatters = {
    time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
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
    if (session?.status === "always-open") return "실시간";
    if (session?.status === "fx-stale") return "최근 고시";
    if (session?.status === "closed") return "마감";
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

function createSparkline(points, status, previousClose) {
    const width = 180;
    const height = 44;
    const safePoints = points && points.length > 1 ? points : [1, 1];
    const baseline = Number(previousClose);
    const hasBaseline = Number.isFinite(baseline);
    const scalePoints = hasBaseline ? [...safePoints, baseline] : safePoints;
    const min = Math.min(...scalePoints);
    const max = Math.max(...scalePoints);
    const range = max - min || 1;
    const step = width / (safePoints.length - 1);
    const pointToY = point => height - ((point - min) / range) * (height - 8) - 4;
    const path = safePoints.map((point, index) => {
        const x = index * step;
        const y = pointToY(point);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    const baselineY = hasBaseline ? pointToY(baseline).toFixed(1) : null;

    return `
        <svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="최근 흐름 차트">
            ${hasBaseline ? `<line class="sparkline-baseline" x1="0" y1="${baselineY}" x2="${width}" y2="${baselineY}"></line>` : ""}
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
            ${createSparkline(item.points, item.status, item.previousClose)}
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

function formatRefreshInterval(seconds) {
    const minutes = Math.max(1, Math.round(Number(seconds || 60) / 60));
    return `${minutes}분 주기 갱신`;
}

function getGeneratedAgeSeconds(generatedAt) {
    const timestamp = new Date(generatedAt).getTime();
    if (!Number.isFinite(timestamp)) return Infinity;
    return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
}

function formatDataStatus(data) {
    const updated = new Date(data.generatedAt);
    const ageSeconds = getGeneratedAgeSeconds(data.generatedAt);
    const base = `갱신 ${formatCompactDate(updated)} ${formatters.time.format(updated)} · ${formatRefreshInterval(data.refreshIntervalSeconds)}`;

    if (ageSeconds >= 600) {
        return { message: `${base} · 데이터 갱신 중단 가능성`, isError: true };
    }

    if (ageSeconds >= 180) {
        return { message: `${base} · 업데이트 지연`, isError: true };
    }

    return { message: base, isError: false };
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
        const cacheBust = `v=${Date.now()}`;
        const data = await fetchJson(`/api/market-summary?${cacheBust}`);

        setIndicators(data);
        const status = formatDataStatus(data);
        updateDataStatus(status.message, status.isError);
    } catch (error) {
        console.error(error);
        updateDataStatus("시장 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.", true);
    }
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
    setIndicators(fallbackIndicators);
    fetchMarketData();
    setInterval(fetchMarketData, 60_000);
}

document.addEventListener("DOMContentLoaded", init);
