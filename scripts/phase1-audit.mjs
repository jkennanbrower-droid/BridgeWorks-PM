import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());

const roots = [
  path.join(repoRoot, "apps", "api"),
  path.join(repoRoot, "packages", "ui"),
];

const ignoreDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "prisma",
  "migrations",
  "generated",
]);

const allowedExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);

const forbiddenPatterns = [
  { name: "lease_offer", regex: /lease_offer/i },
  { name: "LeaseOffer", regex: /LeaseOffer/ },
  { name: "esign", regex: /e-?sign|esign/i },
  { name: "DocuSign", regex: /docusign/i },
  { name: "LeaseGeneration", regex: /generateLease|leaseGeneration/i },
];

function shouldIgnoreDir(name) {
  return ignoreDirs.has(name);
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      walk(fullPath, files);
    } else if (entry.isFile()) {
      if (!allowedExtensions.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = [];
  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(content)) {
      matches.push(pattern.name);
    }
  }
  return matches;
}

const findings = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const files = walk(root);
  for (const file of files) {
    const matches = scanFile(file);
    if (matches.length > 0) {
      findings.push({ file, matches });
    }
  }
}

if (findings.length > 0) {
  console.error("Phase 1 audit failed. Forbidden patterns found:");
  for (const finding of findings) {
    console.error(`- ${path.relative(repoRoot, finding.file)}: ${finding.matches.join(", ")}`);
  }
  process.exit(1);
}

console.log("Phase 1 audit passed.");
