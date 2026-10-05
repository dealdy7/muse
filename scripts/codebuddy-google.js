#!/usr/bin/env node

/**
 * CodeBuddy Google OAuth CLI
 * 
 * Usage:
 *   node scripts/codebuddy-google.js <email> <password>
 *   node scripts/codebuddy-google.js --file accounts.txt
 * 
 * Account file format (one per line):
 *   email@gmail.com:password
 *   email2@gmail.com:password2
 */

const { runCodebuddyGoogleOAuth } = require("../src/automations/codebuddy/codebuddy-google-oauth");
const { createFileLogger } = require("../src/utils");
const fs = require("fs");
const path = require("path");

function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
CodeBuddy Google OAuth Automation

Usage:
  node scripts/codebuddy-google.js <email> <password>
  node scripts/codebuddy-google.js --file <accounts-file>

Examples:
  node scripts/codebuddy-google.js myemail@gmail.com MyPassword123
  node scripts/codebuddy-google.js --file accounts.txt

Account file format (one per line):
  email@gmail.com:password
  email2@gmail.com:password2
        `);
        process.exit(0);
    }

    // Single account mode
    if (args[0] !== "--file" && args.length === 2) {
        return {
            mode: "single",
            accounts: [{
                email: args[0],
                password: args[1],
            }],
        };
    }

    // Batch mode from file
    if (args[0] === "--file" && args[1]) {
        const filePath = path.resolve(args[1]);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filePath}`);
            process.exit(1);
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const accounts = [];

        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;

            const [email, password] = trimmed.split(":");
            if (email && password) {
                accounts.push({
                    email: email.trim(),
                    password: password.trim(),
                });
            }
        }

        if (accounts.length === 0) {
            console.error(`❌ No valid accounts found in: ${filePath}`);
            process.exit(1);
        }

        return {
            mode: "batch",
            accounts,
        };
    }

    console.error("❌ Invalid arguments. Use --help for usage.");
    process.exit(1);
}

async function main() {
    const { mode, accounts } = parseArgs();
    const logger = createFileLogger();

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  CodeBuddy Google OAuth Automation`);
    console.log(`  Mode: ${mode}`);
    console.log(`  Accounts: ${accounts.length}`);
    console.log(`═══════════════════════════════════════════\n`);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        console.log(`\n[${i + 1}/${accounts.length}] Processing: ${account.email}`);
        
        try {
            await runCodebuddyGoogleOAuth(account, logger.log);
            successCount++;
            console.log(`✅ Success: ${account.email}`);
        } catch (error) {
            failedCount++;
            console.error(`❌ Failed: ${account.email}`);
            console.error(`   Error: ${error.message}`);
            logger.log(`[ERROR] ${account.email}: ${error.message}`);
        }

        // Delay between accounts
        if (i < accounts.length - 1) {
            console.log(`Waiting 5s before next account...`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  Results:`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  📊 Total: ${accounts.length}`);
    console.log(`═══════════════════════════════════════════\n`);

    logger.close();
    process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
});
