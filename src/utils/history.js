const fs = require('fs');
const path = require('path');

// Use same pattern as config/index.js
const ROOT_DIR = path.resolve(__dirname, "../..");
const HISTORY_FILE = path.join(ROOT_DIR, 'output', 'logs', 'history.json');

function ensureHistoryDir() {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8').trim();
            
            // Handle empty file or whitespace-only content
            if (!data || data.length === 0) {
                return {};
            }
            
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to load history:', error.message);
        // Return empty object instead of crashing
        return {};
    }
    return {};
}

function saveHistory(historyData, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            ensureHistoryDir();
            
            // Write to temp file first, then rename (atomic operation)
            const tempFile = HISTORY_FILE + '.tmp';
            fs.writeFileSync(tempFile, JSON.stringify(historyData, null, 2), { flag: 'w' });
            
            // Atomic rename (will fail if file is locked, then retry)
            fs.renameSync(tempFile, HISTORY_FILE);
            
            return; // Success!
        } catch (error) {
            if (attempt === retries) {
                console.error(`Failed to save history after ${retries} attempts:`, error.message);
                console.error('If file is open in editor, please close it and retry.');
            } else {
                // Wait before retry (50ms * attempt number)
                const waitMs = 50 * attempt;
                const start = Date.now();
                while (Date.now() - start < waitMs) {
                    // Blocking wait
                }
            }
        }
    }
}

function isAccountCompleted(automationType, email) {
    if (!automationType || !email) return false;
    
    const history = loadHistory();
    if (!history[automationType]) return false;
    
    const completedEmails = history[automationType];
    
    // If no completed accounts yet, allow processing
    if (completedEmails.length === 0) return false;
    
    // Extract domain from current email
    const currentDomain = email.split('@')[1];
    
    // Check if any completed account has same domain
    const hasSameDomainCompleted = completedEmails.some(completedEmail => {
        const completedDomain = completedEmail.split('@')[1];
        return completedDomain === currentDomain;
    });
    
    // If this is a new domain (no completed accounts from this domain), allow processing
    if (!hasSameDomainCompleted) {
        return false;
    }
    
    // Same domain exists in completed list, check if THIS SPECIFIC email is completed
    return completedEmails.includes(email);
}

function markAccountCompleted(automationType, email) {
    if (!automationType || !email) return;
    const history = loadHistory();
    if (!history[automationType]) {
        history[automationType] = [];
    }
    if (!history[automationType].includes(email)) {
        history[automationType].push(email);
        saveHistory(history);
    }
}

module.exports = {
    isAccountCompleted,
    markAccountCompleted,
    loadHistory
};
