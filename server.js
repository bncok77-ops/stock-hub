const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const CACHE_TTL_MS = 15_000;

let marketCache = null;
let marketCacheTime = 0;

const symbols = {
    priorityIndices: [
        { symbol: "^KS11", name: "코스피", label: "KOSPI", decimals: 2 },
        { symbol: "^KQ11", name: "코스닥", label: "KOSDAQ", decimals: 2 },
        { symbol: "NQ=F", name: "나스닥100 선물", label: "NQ Futures", decimals: 2 }
    ],
    macroIndicators: [
        { symbol: "KRW=X", name: "달러 환율", label: "USD/KRW", decimals: 2 },
        { symbol: "^TNX", name: "미국채 10년", label: "Yield", decimals: 2, suffix: "%" },
        { symbol: "^TYX", name: "미국채 30년", label: "Yield", decimals: 2, suffix: "%" },
        { symbol: "GC=F", name: "금", label: "Gold", decimals: 2, prefix: "$" },
        { symbol: "BTC-USD", name: "비트코인", label: "BTC/USD", decimals: 0, prefix: "$" },
        { symbol: "CL=F", name: "국제 유가", label: "WTI", decimals: 2, prefix: "$" }
    ],
    usIndicators: [
        { symbol: "^IXIC", name: "나스닥", label: "NASDAQ", decimals: 2 },
        { symbol: "^GSPC", name: "S&P 500", label: "S&P 500", decimals: 2 },
        { symbol: "^SOX", name: "필라델피아 반도체", label: "SOX", decimals: 2 }
    ]
};

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
};

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
    });
    response.end(JSON.stringify(body));
}

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

function formatMarketDate(timestampSeconds) {
    if (!Number.isFinite(timestampSeconds)) return null;
    const date = new Date(timestampSeconds * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
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
        marketDate: formatMarketDate(marketTime),
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
    if (marketCache && Date.now() - marketCacheTime < CACHE_TTL_MS) {
        return marketCache;
    }

    const [priorityIndices, macroIndicators, usIndicators] = await Promise.all([
        buildGroup(symbols.priorityIndices),
        buildGroup(symbols.macroIndicators),
        buildGroup(symbols.usIndicators)
    ]);

    const summary = {
        generatedAt: new Date().toISOString(),
        source: "Yahoo Finance chart endpoint",
        refreshIntervalSeconds: 15,
        priorityIndices,
        macroIndicators,
        usIndicators
    };

    marketCache = summary;
    marketCacheTime = Date.now();
    return summary;
}

function serveStatic(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const resolvedPath = path.normalize(path.join(PUBLIC_DIR, pathname));

    if (!resolvedPath.startsWith(PUBLIC_DIR)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.readFile(resolvedPath, (error, data) => {
        if (error) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        response.writeHead(200, {
            "content-type": contentTypes[path.extname(resolvedPath)] || "application/octet-stream",
            "cache-control": "no-cache"
        });
        response.end(data);
    });
}

const server = http.createServer(async (request, response) => {
    if (request.url?.startsWith("/api/market-summary")) {
        sendJson(response, 200, await getMarketSummary());
        return;
    }

    serveStatic(request, response);
});

server.listen(PORT, () => {
    console.log(`StockHub running at http://localhost:${PORT}`);
});
