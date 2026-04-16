import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIST_ASSETS_DIR = path.resolve(process.cwd(), "dist", "assets");

const KB = 1024;
const WARN_KB = 350;

const formatKb = (bytes) => `${(bytes / KB).toFixed(2)} KB`;

const isJavaScriptChunk = (fileName) => fileName.endsWith(".js");
const isVendorChunk = (fileName) => fileName.startsWith("vendor-");

async function main() {
  const fileNames = await readdir(DIST_ASSETS_DIR);
  const chunkNames = fileNames.filter(isJavaScriptChunk);

  const chunks = await Promise.all(
    chunkNames.map(async (chunkName) => {
      const filePath = path.join(DIST_ASSETS_DIR, chunkName);
      const fileStat = await stat(filePath);
      return {
        name: chunkName,
        size: fileStat.size,
      };
    })
  );

  chunks.sort((left, right) => right.size - left.size);

  const vendorChunks = chunks.filter((chunk) => isVendorChunk(chunk.name));
  const vendorMisc = vendorChunks.find((chunk) => chunk.name.startsWith("vendor-misc"));

  console.log("\nTop 12 JS chunks by size:");
  chunks.slice(0, 12).forEach((chunk, index) => {
    console.log(`${String(index + 1).padStart(2, "0")}. ${chunk.name} - ${formatKb(chunk.size)}`);
  });

  const totalVendorSize = vendorChunks.reduce((sum, chunk) => sum + chunk.size, 0);
  console.log(`\nVendor chunks: ${vendorChunks.length}`);
  console.log(`Total vendor size: ${formatKb(totalVendorSize)}`);

  if (!vendorMisc) {
    console.log("vendor-misc: not present");
  } else {
    console.log(`vendor-misc size: ${formatKb(vendorMisc.size)}`);
    if (vendorMisc.size > WARN_KB * KB) {
      console.warn(
        `WARNING: vendor-misc exceeds ${WARN_KB} KB. Consider moving heavy deps to a dedicated chunk group.`
      );
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
