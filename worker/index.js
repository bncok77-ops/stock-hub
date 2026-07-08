import {
    MARKET_SUMMARY_LAST_ERROR_KEY,
    MARKET_SUMMARY_KEY,
    UPDATE_INTERVAL_MINUTES,
    getMarketSummary,
    isKoreanMarketUpdateTime
} from "../market-data.js";

const MIN_STORE_INTERVAL_MS = 45_000;

function getSummaryAgeMs(summary, now) {
    if (!summary?.generatedAt) return Infinity;

    const previousGeneratedAt = new Date(summary.generatedAt).getTime();
    if (!Number.isFinite(previousGeneratedAt)) return Infinity;

    return now.getTime() - previousGeneratedAt;
}

function isRecentlyStored(summary, now) {
    return getSummaryAgeMs(summary, now) < MIN_STORE_INTERVAL_MS;
}

function shouldRunByInterval(summary, now) {
    const intervalMs = Math.max(1, UPDATE_INTERVAL_MINUTES) * 60 * 1000;
    return getSummaryAgeMs(summary, now) >= intervalMs;
}

async function storeLastError(env, payload) {
    await env.MARKET_DATA_KV.put(MARKET_SUMMARY_LAST_ERROR_KEY, JSON.stringify({
        recordedAt: new Date().toISOString(),
        ...payload
    }));
}

async function updateMarketSummary(env, now = new Date()) {
    if (!isKoreanMarketUpdateTime(now)) {
        return { skipped: true, reason: "outside-korean-market-hours" };
    }

    try {
        const currentSummary = await env.MARKET_DATA_KV.get(MARKET_SUMMARY_KEY, "json");
        if (isRecentlyStored(currentSummary, now)) {
            return { skipped: true, reason: "recent-data-exists" };
        }

        if (!shouldRunByInterval(currentSummary, now)) {
            return { skipped: true, reason: "update-interval-not-reached" };
        }

        const summary = await getMarketSummary({ previousSummary: currentSummary });
        await env.MARKET_DATA_KV.put(MARKET_SUMMARY_KEY, JSON.stringify(summary));

        if (summary.failures.length) {
            await storeLastError(env, {
                type: "partial-symbol-failure",
                message: `${summary.failures.length} Yahoo Finance symbol request(s) failed`,
                failures: summary.failures,
                generatedAt: summary.generatedAt
            });
        }

        return {
            skipped: false,
            key: MARKET_SUMMARY_KEY,
            generatedAt: summary.generatedAt,
            updateIntervalMinutes: UPDATE_INTERVAL_MINUTES,
            fetchCount: summary.fetchCount,
            failures: summary.failures.length
        };
    } catch (error) {
        await storeLastError(env, {
            type: "market-summary-update-failed",
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(updateMarketSummary(env));
    },

    async fetch(request, env) {
        if (new URL(request.url).pathname === "/__refresh-market-summary") {
            return Response.json(await updateMarketSummary(env));
        }

        return new Response("Not found", { status: 404 });
    }
};
