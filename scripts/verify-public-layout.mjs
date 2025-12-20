import fs from "node:fs";

const layoutPath = "apps/public/app/layout.tsx";
if (!fs.existsSync(layoutPath)) {
  console.error(`❌ Missing ${layoutPath}`);
  process.exit(1);
}

const src = fs.readFileSync(layoutPath, "utf8");
if (!src.includes("<html") || !src.includes("<body")) {
  console.error("❌ RootLayout must include <html> and <body> tags.");
  process.exit(1);
}

if (!src.includes("globals.css")) {
  console.error("❌ RootLayout must import ./globals.css to ensure Tailwind loads.");
  process.exit(1);
}

console.log("✅ Public RootLayout integrity OK");
