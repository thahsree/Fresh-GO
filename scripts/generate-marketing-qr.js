/**
 * FreshGo Marketing QR Code Generator
 *
 * Generates print-ready high-resolution (1200x1200) PNG & SVG QR codes
 * for flyers, delivery boxes, pamphlets, stickers, and standees.
 *
 * Usage:
 *   node scripts/generate-marketing-qr.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const CONFIG = {
  // Smart Universal URL: automatically detects Android / iOS / Desktop
  smartLandingUrl: "https://fresh-go.duckdns.org/?redirect=app",
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=com.freshgofreshandmeat.app",
  appStoreUrl: "https://apps.apple.com/app/fresh-go/id6470000000",
  outputDir: path.resolve(__dirname, "../fresh-go-ui/public/qr-codes"),
  brandColor: "1F4D46", // FreshGo Dark Emerald
  accentColor: "E5623E", // FreshGo Coral Accent
};

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        }
        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve(destPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

async function main() {
  console.log("==================================================");
  console.log("   FreshGo Marketing QR Code Generator");
  console.log("==================================================");

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const tasks = [
    {
      name: "1. Smart Universal QR Code (High-Res 1200x1200 PNG)",
      filename: "freshgo-smart-qr-1200px.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=${encodeURIComponent(
        CONFIG.smartLandingUrl
      )}&color=${CONFIG.brandColor}&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
    {
      name: "2. Smart Universal QR Code (Vector SVG for Print)",
      filename: "freshgo-smart-qr.svg",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(
        CONFIG.smartLandingUrl
      )}&color=${CONFIG.brandColor}&bgcolor=FFFFFF&margin=2&format=svg&ecc=H`,
    },
    {
      name: "3. Direct Google Play Store QR (1000x1000 PNG)",
      filename: "freshgo-playstore-qr.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        CONFIG.playStoreUrl
      )}&color=0F2E29&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
    {
      name: "4. Direct Apple App Store QR (1000x1000 PNG)",
      filename: "freshgo-appstore-qr.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        CONFIG.appStoreUrl
      )}&color=0F2E29&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
  ];

  for (const task of tasks) {
    const dest = path.join(CONFIG.outputDir, task.filename);
    try {
      process.stdout.write(`Generating ${task.name}... `);
      await downloadFile(task.url, dest);
      console.log(`[OK] Saved to ${path.relative(process.cwd(), dest)}`);
    } catch (err) {
      console.log(`[WARN] (${err.message})`);
    }
  }

  console.log("\n==================================================");
  console.log("   Summary & Marketing Deployment Guide");
  console.log("==================================================");
  console.log(`Smart QR Destination URL:`);
  console.log(`  -> ${CONFIG.smartLandingUrl}\n`);
  console.log("Behavior when scanned:");
  console.log("  - Android devices -> Directly opens Google Play Store");
  console.log("  - iOS devices (iPhone) -> Directly opens Apple App Store");
  console.log("  - PC / Desktop -> Opens FreshGo Web with store badges & QR");
  console.log(`\nGenerated files located at: ${CONFIG.outputDir}`);
}

main().catch(console.error);
