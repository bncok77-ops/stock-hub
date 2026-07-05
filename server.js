const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { getMarketSummary } = require("./market-data");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const CACHE_TTL_MS = 15_000;

let marketCache = null;
let marketCacheTime = 0;

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

async function getCachedMarketSummary() {
    if (marketCache && Date.now() - marketCacheTime < CACHE_TTL_MS) {
        return marketCache;
    }

    marketCache = await getMarketSummary();
    marketCacheTime = Date.now();
    return marketCache;
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
        sendJson(response, 200, await getCachedMarketSummary());
        return;
    }

    serveStatic(request, response);
});

server.listen(PORT, () => {
    console.log(`StockHub running at http://localhost:${PORT}`);
});
