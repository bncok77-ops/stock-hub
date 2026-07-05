const symbols = {
    priorityIndices: [
        { symbol: "^KS11", name: "코스피", label: "KOSPI", decimals: 2 },
        { symbol: "^KQ11", name: "코스닥", label: "KOSDAQ", decimals: 2 },
        { symbol: "NQ=F", name: "나스닥100 선물", label: "NQ Futures", decimals: 2 }
    ],
    macroIndicators: [
        { symbol: "KRW=X", name: "달러 환율", label: "USD/KRW", decimals: 2, marketType: "fx", displayTimezone: "Asia/Seoul" },
        { symbol: "BTC-USD", name: "비트코인", label: "BTC/USD", decimals: 0, prefix: "$", marketType: "crypto" },
        { symbol: "^TNX", name: "미국채 10년", label: "Yield", decimals: 2, suffix: "%" },
        { symbol: "^TYX", name: "미국채 30년", label: "Yield", decimals: 2, suffix: "%" },
        { symbol: "GC=F", name: "금", label: "Gold", decimals: 2, prefix: "$" },
        { symbol: "CL=F", name: "국제 유가", label: "WTI", decimals: 2, prefix: "$" }
    ],
    usIndicators: [
        { symbol: "^IXIC", name: "나스닥", label: "NASDAQ", decimals: 2 },
        { symbol: "^GSPC", name: "S&P 500", label: "S&P 500", decimals: 2 },
        { symbol: "^SOX", name: "필라델피아 반도체", label: "SOX", decimals: 2 },
        { symbol: "^VIX", name: "VIX", label: "Volatility", decimals: 2 }
    ]
};

function formatNumber(value, decimals, prefix = "", suffix = "") {
    if (!Number.isFinite(value)) return "-";
    return `${prefix}${value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}${suffix}`;
}

function formatChange(value, decimals) {
    if (!Number.isFinite(value)) return "-";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}`;
}

function formatPercent(value) {
    if (!Number.isFinite(value)) return "-";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

function statusFromChange(change) {
    if (change > 0) return "up";
    if (change < 0) return "down";
    return "flat";
}

function formatMarketDate(timestampSeconds, timezone = "Asia/Seoul") {
    if (!Number.isFinite(timestampSeconds)) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(timestampSeconds * 1000));
    const get = type => parts.find(part => part.type === type)?.value;
    return `${get("year")}.${get("month")}.${get("day")}`;
}

function getMarketSession(config, meta, delaySeconds) {
    const now = Math.floor(Date.now() / 1000);
    const regular = meta.currentTradingPeriod?.regular;
    const pre = meta.currentTradingPeriod?.pre;
    const post = meta.currentTradingPeriod?.post;

    if (config.marketType === "crypto" || meta.exchangeName === "CCC") {
        return { status: "always-open", label: "24시간" };
    }

    if (config.marketType === "fx" || meta.exchangeName === "CCY") {
        if (Number.isFinite(delaySeconds) && delaySeconds <= 7200) {
            return { status: "open", label: "환율 갱신" };
        }
        return { status: "fx-stale", label: "최근 고시" };
    }

    if (Number.isFinite(delaySeconds) && delaySeconds > 7200) {
        return { status: "closed", label: "장마감" };
    }

    if (regular && now >= regular.start && now <= regular.end) {
        return { status: "open", label: "정규장" };
    }

    if (pre && now >= pre.start && now < pre.end) {
        return { status: "pre", label: "장전" };
    }

    if (post && regular && now > regular.end && now <= post.end) {
        return { status: "post", label: "시간외" };
    }

    return { status: "closed", label: "장마감" };
}

async function fetchYahooChart(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=15m`;
    const response = await fetch(url, {
        headers: {
            accept: "application/json",
            "user-agent": "Mozilla/5.0 StockHub/1.0"
        }
    });

    if (!response.ok) {
        throw new Error(`${symbol} request failed: ${response.status}`);
    }

    const payload = await response.json();
    const result = payload.chart?.result?.[0];
    if (!result) {
        throw new Error(`${symbol} has no chart result`);
    }

    return result;
}

function chartToIndicator(config, chart) {
    const meta = chart.meta || {};
    const quote = chart.indicators?.quote?.[0] || {};
    const timestamps = chart.timestamp || [];
    const closesWithTime = (quote.close || [])
        .map((close, index) => ({ close, timestamp: timestamps[index] }))
        .filter(item => Number.isFinite(item.close) && Number.isFinite(item.timestamp));
    const closes = closesWithTime.map(item => item.close);
    const latestClose = closes.at(-1);
    const latestPointTime = closesWithTime.at(-1)?.timestamp;
    const regularMarketPrice = Number(meta.regularMarketPrice);
    const previousClose = Number(meta.previousClose || meta.chartPreviousClose);
    const price = Number.isFinite(regularMarketPrice) ? regularMarketPrice : latestClose;
    const change = Number.isFinite(price) && Number.isFinite(previousClose) ? price - previousClose : NaN;
    const percent = Number.isFinite(change) && previousClose ? (change / previousClose) * 100 : NaN;
    const marketTime = Number(meta.regularMarketTime || latestPointTime);
    const delaySeconds = Number.isFinite(marketTime) ? Math.max(0, Math.floor(Date.now() / 1000 - marketTime)) : null;
    const marketSession = getMarketSession(config, meta, delaySeconds);
    const displayTimezone = config.displayTimezone || meta.exchangeTimezoneName || "Asia/Seoul";

    return {
        name: config.name,
        label: config.label,
        value: formatNumber(price, config.decimals, config.prefix, config.suffix),
        change: formatChange(change, config.decimals),
        percent: formatPercent(percent),
        status: statusFromChange(change),
        delaySeconds,
        points: closes.slice(-24),
        source: "Yahoo Finance",
        symbol: config.symbol,
        exchangeName: meta.exchangeName || null,
        exchangeTimezoneName: meta.exchangeTimezoneName || null,
        displayTimezone,
        marketSession,
        marketDate: formatMarketDate(marketTime, displayTimezone),
        marketTime: Number.isFinite(marketTime) ? new Date(marketTime * 1000).toISOString() : null
    };
}

function failedIndicator(config, error) {
    return {
        name: config.name,
        label: config.label,
        value: "-",
        change: "-",
        percent: "-",
        status: "flat",
        delaySeconds: null,
        points: [1, 1, 1, 1, 1],
        source: "Yahoo Finance",
        symbol: config.symbol,
        exchangeName: null,
        exchangeTimezoneName: null,
        displayTimezone: config.displayTimezone || null,
        marketSession: { status: "unknown", label: "확인 필요" },
        marketDate: null,
        marketTime: null,
        error: error.message
    };
}

async function buildGroup(group) {
    return Promise.all(group.map(async config => {
        try {
            const chart = await fetchYahooChart(config.symbol);
            return chartToIndicator(config, chart);
        } catch (error) {
            return failedIndicator(config, error);
        }
    }));
}

async function getMarketSummary() {
    const [priorityIndices, macroIndicators, usIndicators] = await Promise.all([
        buildGroup(symbols.priorityIndices),
        buildGroup(symbols.macroIndicators),
        buildGroup(symbols.usIndicators)
    ]);

    return {
        generatedAt: new Date().toISOString(),
        source: "Yahoo Finance chart endpoint",
        refreshIntervalSeconds: 300,
        priorityIndices,
        macroIndicators,
        usIndicators
    };
}

module.exports = {
    getMarketSummary
};
