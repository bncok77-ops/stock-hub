import { MARKET_SUMMARY_KEY } from "../../market-data.js";

const headers = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8"
};

export async function onRequest({ request, env }) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "method-not-allowed" }), {
            status: 405,
            headers: {
                ...headers,
                allow: "GET"
            }
        });
    }

    const body = await env.MARKET_DATA_KV.get(MARKET_SUMMARY_KEY);

    if (!body) {
        return new Response(JSON.stringify({
            error: "market-summary-not-found",
            message: "Market summary has not been generated yet."
        }), {
            status: 503,
            headers
        });
    }

    return new Response(body, {
        status: 200,
        headers
    });
}
