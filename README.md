# StockHub

Cloudflare Pages serves the static UI and a Pages Function at `/api/market-summary`.
A separate Cloudflare Worker Cron updates Yahoo Finance market data and stores it in KV.

## Data Update Flow

1. Worker Cron runs every minute.
2. The Worker only collects data during Korean market hours: Monday-Friday, 09:00-15:30 KST.
3. Yahoo Finance chart data is fetched with a maximum concurrency of 5 requests.
4. A single run is guarded to stay below 50 external fetches.
5. The resulting JSON is stored in KV under `market-summary`.
6. `/api/market-summary` reads the KV value and returns it to the browser.

`UPDATE_INTERVAL_MINUTES` in `market-data.js` controls the effective update interval. It starts at `1`; change it to `2` or `5` to reduce update frequency while keeping the Cron trigger at one minute.

## Failure Handling

- Individual symbol failures do not fail the whole update.
- If previous KV data exists, failed symbols reuse the previous value for the same `symbol`.
- If `generatedAt` is less than 45 seconds old, the Worker skips duplicate KV writes.
- Last update errors are stored in KV under `market-summary:last-error`.
- The frontend marks data as delayed when `generatedAt` is older than 3 minutes.
- The frontend warns about a possible update stop when `generatedAt` is older than 10 minutes.

## Cloudflare Setup

Create one KV namespace and use the same namespace for both Pages and Worker:

```powershell
npx wrangler kv namespace create MARKET_DATA_KV
npx wrangler kv namespace create MARKET_DATA_KV --preview
```

Copy the returned IDs into:

- `wrangler.worker.toml`
- `wrangler.toml`

Replace both `id` and `preview_id` placeholders.

## Local Checks

```powershell
npm run check
```

Run the Pages Function locally:

```powershell
npm run dev
```

Run the Worker locally:

```powershell
npx wrangler dev --config wrangler.worker.toml
```

The Worker exposes a manual refresh endpoint for testing:

```text
/__refresh-market-summary
```

It still respects Korean market hours and update interval guards.

## Deploy

Deploy the Worker Cron:

```powershell
npm run deploy:worker
```

Deploy the Pages site through the Cloudflare Pages project connected to this repository, or run:

```powershell
npm run deploy:pages
```

If you deploy Pages through the Cloudflare dashboard Git integration, set the `MARKET_DATA_KV` binding in the Pages project settings as well.

After the first successful Worker run, verify:

```text
/api/market-summary
```

To inspect the latest recorded failure, read the KV key:

```powershell
npx wrangler kv key get market-summary:last-error --binding MARKET_DATA_KV --config wrangler.worker.toml
```
