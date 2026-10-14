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
  domainUrl: "https://fresh-go.in",
  smartLandingUrl: "https://fresh-go.in/?redirect=app",
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=com.freshgofreshandmeat.app",
  appStoreUrl: "https://apps.apple.com/app/fresh-go/id6470000000",
  outputDirs: [
    path.resolve(__dirname, "../fresh-go-ui/public/qr-codes"),
    path.resolve(__dirname, "../freshgo-landing"),
  ],
  brandColor: "0F2E29", // FreshGo Dark Emerald
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

  for (const dir of CONFIG.outputDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const tasks = [
    {
      name: "1. fresh-go.in Website QR (High-Res 1000x1000 PNG)",
      filename: "fresh-go-in-qr.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        CONFIG.domainUrl
      )}&color=${CONFIG.brandColor}&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
    {
      name: "2. fresh-go.in Website QR (Vector SVG for Print)",
      filename: "fresh-go-in-qr.svg",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(
        CONFIG.domainUrl
      )}&color=${CONFIG.brandColor}&bgcolor=FFFFFF&margin=2&format=svg&ecc=H`,
    },
    {
      name: "3. fresh-go.in Smart App QR (High-Res 1000x1000 PNG)",
      filename: "fresh-go-in-smart-qr.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        CONFIG.smartLandingUrl
      )}&color=${CONFIG.brandColor}&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
    {
      name: "4. fresh-go.in Smart App QR (Vector SVG for Print)",
      filename: "fresh-go-in-smart-qr.svg",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(
        CONFIG.smartLandingUrl
      )}&color=${CONFIG.brandColor}&bgcolor=FFFFFF&margin=2&format=svg&ecc=H`,
    },
    {
      name: "5. Direct Google Play Store QR (1000x1000 PNG)",
      filename: "freshgo-playstore-qr.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        CONFIG.playStoreUrl
      )}&color=0F2E29&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
    {
      name: "6. Direct Apple App Store QR (1000x1000 PNG)",
      filename: "freshgo-appstore-qr.png",
      url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        CONFIG.appStoreUrl
      )}&color=0F2E29&bgcolor=FFFFFF&margin=2&format=png&ecc=H`,
    },
  ];

  for (const dir of CONFIG.outputDirs) {
    console.log(`\nSaving to: ${path.relative(process.cwd(), dir)}/`);
    for (const task of tasks) {
      const dest = path.join(dir, task.filename);
      try {
        process.stdout.write(`  Generating ${task.name}... `);
        await downloadFile(task.url, dest);
        console.log(`[OK] (${fs.statSync(dest).size} bytes)`);
      } catch (err) {
        console.log(`[WARN] (${err.message})`);
      }
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
  console.log(`\nGenerated files saved to:`);
  CONFIG.outputDirs.forEach(d => console.log(`  - ${path.relative(process.cwd(), d)}/`));
}

main().catch(console.error);
