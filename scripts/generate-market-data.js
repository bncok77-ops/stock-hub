const fs = require("node:fs/promises");
const path = require("node:path");
const { getMarketSummary } = require("../market-data");

async function main() {
    const summary = await getMarketSummary();
    const outputDir = path.join(__dirname, "..", "api");
    const outputPath = path.join(outputDir, "market-summary.json");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    const indicators = [
        ...summary.priorityIndices,
        ...summary.macroIndicators,
        ...summary.usIndicators
    ];
    const loaded = indicators.filter(item => item.marketDate).length;
    console.log(`Generated ${outputPath}`);
    console.log(`Loaded ${loaded}/${indicators.length} indicators`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
