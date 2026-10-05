#!/usr/bin/env node

/**
 * Test script for CodeBuddy Google OAuth
 * Validates setup without running full automation
 */

const fs = require("fs");
const path = require("path");

console.log("\n🔍 CodeBuddy Google OAuth - Setup Validator\n");

const checks = [];

// 1. Check if main automation file exists
const mainFile = path.resolve(__dirname, "../src/automations/codebuddy/codebuddy-google-oauth.js");
if (fs.existsSync(mainFile)) {
    checks.push({ name: "✅ Main automation file", status: "OK", path: mainFile });
} else {
    checks.push({ name: "❌ Main automation file", status: "MISSING", path: mainFile });
}

// 2. Check if CLI entry point exists
const cliFile = path.resolve(__dirname, "../scripts/codebuddy-google.js");
if (fs.existsSync(cliFile)) {
    checks.push({ name: "✅ CLI entry point", status: "OK", path: cliFile });
} else {
    checks.push({ name: "❌ CLI entry point", status: "MISSING", path: cliFile });
}

// 3. Check if documentation exists
const docsFiles = [
    { name: "Quick Start Guide", path: path.resolve(__dirname, "../docs/QUICK-START-CODEBUDDY-GOOGLE.md") },
    { name: "Full Documentation", path: path.resolve(__dirname, "../docs/CODEBUDDY-GOOGLE-OAUTH.md") },
];

for (const doc of docsFiles) {
    if (fs.existsSync(doc.path)) {
        checks.push({ name: `✅ ${doc.name}`, status: "OK", path: doc.path });
    } else {
        checks.push({ name: `❌ ${doc.name}`, status: "MISSING", path: doc.path });
    }
}

// 4. Check if dependencies are available
const requiredModules = [
    "../../config",
    "../../utils",
    "../../browser",
    "../../providers/google/login",
    "../../providers/router",
];

for (const mod of requiredModules) {
    try {
        const resolved = path.resolve(__dirname, `../src/automations/codebuddy/${mod}.js`);
        if (fs.existsSync(resolved)) {
            checks.push({ name: `✅ Dependency: ${mod}`, status: "OK" });
        } else {
            checks.push({ name: `⚠️ Dependency: ${mod}`, status: "NOT_FOUND (may be OK)" });
        }
    } catch (e) {
        checks.push({ name: `⚠️ Dependency: ${mod}`, status: "CHECK_FAILED" });
    }
}

// 5. Check package.json script
const packageJson = path.resolve(__dirname, "../package.json");
if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
    if (pkg.scripts && pkg.scripts["codebuddy:google"]) {
        checks.push({ name: "✅ npm script", status: "OK", value: pkg.scripts["codebuddy:google"] });
    } else {
        checks.push({ name: "❌ npm script", status: "MISSING" });
    }
}

// Print results
console.log("═══════════════════════════════════════════\n");
for (const check of checks) {
    console.log(check.name);
    if (check.path) console.log(`   Path: ${check.path}`);
    if (check.value) console.log(`   Value: ${check.value}`);
}
console.log("\n═══════════════════════════════════════════");

const failedChecks = checks.filter((c) => c.status === "MISSING" || c.status === "CHECK_FAILED");
if (failedChecks.length > 0) {
    console.log("\n❌ Setup validation FAILED");
    console.log(`   ${failedChecks.length} issue(s) found\n`);
    process.exit(1);
} else {
    console.log("\n✅ Setup validation PASSED");
    console.log("   All files are in place\n");
    console.log("Next steps:");
    console.log("  1. Create account file: email:password format");
    console.log("  2. Run: node scripts/codebuddy-google.js --file accounts.txt");
    console.log("  3. Or: npm run codebuddy:google -- --file accounts.txt\n");
    process.exit(0);
}
