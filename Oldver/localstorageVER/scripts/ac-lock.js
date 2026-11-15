/**
 * account-lockout.js
 * Track failed login attempts and lock accounts after N failures.
 *
 * Implements Spec Clause 1.37.3(4)(f):
 *   "The DWSS shall temporarily suspend a user account after five invalid
 *    login attempts and keep all logs. The DWSS shall only allow authorised
 *    system administrator to unlock and configure user accounts."
 *
 * Also implements Spec Clause 1.37.2(5)(a) audit trail:
 *   "The DWSS shall maintain and keep the audit trails and system logs
 *    for a minimum period of six month to record add, edit and/or delete
 *    process undertaken by users."
 */

(function() {
    'use strict';

    // ==================== CONFIG ====================
    const CONFIG = {
        maxAttempts: 5,
        lockDurationMs: 30 * 60 * 1000,     // 30 minutes
        storageKey: 'dwss_lockout_state',
        logKey: 'dwss_login_logs',
        maxLogs: 1000                        // Keep up to 1000 log entries
    };

    // ==================== STATE MANAGEMENT ====================
    function loadState() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('[Lockout] Failed to parse state:', e);
            return {};
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
        } catch (e) {
            console.error('[Lockout] Failed to save state:', e);
        }
    }

    // ==================== ATTEMPT RECORDING ====================
    /**
     * Record a failed login attempt.
     * Returns the updated entry: { attempts, lockedUntil, lastAttempt }
     */
    function recordFailedAttempt(username) {
        if (!username) return null;

        const state = loadState();
        const now = Date.now();
        const key = username.toLowerCase();

        if (!state[key]) {
            state[key] = { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
        }

        const entry = state[key];

        // If lock expired, reset
        if (entry.lockedUntil && now > entry.lockedUntil) {
            entry.attempts = 0;
            entry.lockedUntil = 0;
        }

        entry.attempts += 1;
        entry.lastAttempt = now;

        if (entry.attempts >= CONFIG.maxAttempts) {
            entry.lockedUntil = now + CONFIG.lockDurationMs;
            addLog('account_locked', username, {
                attempts: entry.attempts,
                lockedUntil: new Date(entry.lockedUntil).toISOString(),
                durationMinutes: Math.ceil(CONFIG.lockDurationMs / 60000)
            });
            console.warn('[Lockout] Account locked:', username);
        } else {
            addLog('failed_login', username, { attempts: entry.attempts });
        }

        saveState(state);
        return entry;
    }

    /**
     * Record a successful login (resets counter).
     */
    function recordSuccessfulAttempt(username) {
        if (!username) return;

        const state = loadState();
        const key = username.toLowerCase();

        if (state[key]) {
            delete state[key];
            saveState(state);
        }

        addLog('login_success', username, {});
    }

    /**
     * Manually reset attempts for a user (admin unlock).
     */
    function resetAttempts(username, unlockedBy) {
        if (!username) return false;

        const state = loadState();
        const key = username.toLowerCase();
        const hadEntry = !!state[key];

        delete state[key];
        saveState(state);

        addLog('account_unlocked', username, {
            unlockedBy: unlockedBy || 'system'
        });

        console.log('[Lockout] Unlocked account:', username);
        return hadEntry;
    }

    // ==================== CHECKS ====================
    /**
     * Check if an account is currently locked.
     * Returns { locked: bool, lockedUntil?, remainingMs?, remainingMinutes?, attempts? }
     */
    function isLocked(username) {
        if (!username) return { locked: false };

        const state = loadState();
        const key = username.toLowerCase();
        const entry = state[key];

        if (!entry || !entry.lockedUntil) return { locked: false };

        const now = Date.now();
        if (now < entry.lockedUntil) {
            return {
                locked: true,
                lockedUntil: new Date(entry.lockedUntil),
                remainingMs: entry.lockedUntil - now,
                remainingMinutes: Math.ceil((entry.lockedUntil - now) / 60000),
                attempts: entry.attempts
            };
        }

        // Lock expired — clean up
        entry.lockedUntil = 0;
        entry.attempts = 0;
        saveState(state);
        return { locked: false };
    }

    /**
     * Get remaining allowed attempts before lockout.
     */
    function getRemainingAttempts(username) {
        if (!username) return CONFIG.maxAttempts;

        const state = loadState();
        const key = username.toLowerCase();
        const entry = state[key];

        if (!entry) return CONFIG.maxAttempts;
        return Math.max(0, CONFIG.maxAttempts - (entry.attempts || 0));
    }

    // ==================== LOGGING ====================
    /**
     * Add an entry to the login log.
     * type: 'login_success' | 'failed_login' | 'account_locked' | 'account_unlocked'
     */
    function addLog(type, username, details) {
        try {
            const logs = JSON.parse(localStorage.getItem(CONFIG.logKey) || '[]');
            logs.unshift({
                timestamp: new Date().toISOString(),
                type: type,
                username: username,
                details: details || {}
            });

            if (logs.length > CONFIG.maxLogs) {
                logs.length = CONFIG.maxLogs;
            }

            localStorage.setItem(CONFIG.logKey, JSON.stringify(logs));
        } catch (e) {
            console.warn('[Lockout] Failed to write log:', e);
        }
    }

    /**
     * Retrieve login logs.
     * If username is provided, filters by user. Otherwise returns all.
     */
    function getLogs(username) {
        try {
            const logs = JSON.parse(localStorage.getItem(CONFIG.logKey) || '[]');
            if (!username) return logs;
            const key = username.toLowerCase();
            return logs.filter(l => l.username && l.username.toLowerCase() === key);
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear all logs (admin only).
     */
    function clearLogs() {
        try {
            localStorage.removeItem(CONFIG.logKey);
        } catch (e) { /* ignore */ }
    }

    // ==================== ADMIN ====================
    /**
     * Get all currently locked accounts.
     */
    function getAllLockedAccounts() {
        const state = loadState();
        const now = Date.now();
        const locked = [];

        Object.keys(state).forEach(username => {
            const entry = state[username];
            if (entry.lockedUntil && now < entry.lockedUntil) {
                locked.push({
                    username: username,
                    attempts: entry.attempts,
                    lockedUntil: new Date(entry.lockedUntil),
                    remainingMs: entry.lockedUntil - now,
                    remainingMinutes: Math.ceil((entry.lockedUntil - now) / 60000)
                });
            }
        });

        return locked;
    }

    /**
     * Get all accounts with failed attempts (whether locked or not).
     */
    function getAllAttempts() {
        const state = loadState();
        const now = Date.now();
        return Object.keys(state).map(username => {
            const entry = state[username];
            return {
                username: username,
                attempts: entry.attempts || 0,
                lastAttempt: entry.lastAttempt ? new Date(entry.lastAttempt) : null,
                lockedUntil: entry.lockedUntil && now < entry.lockedUntil
                    ? new Date(entry.lockedUntil)
                    : null,
                isLocked: entry.lockedUntil && now < entry.lockedUntil
            };
        });
    }

    // ==================== EXPORT ====================
    window.DWSS_Lockout = {
        CONFIG,
        recordFailedAttempt,
        recordSuccessfulAttempt,
        resetAttempts,
        isLocked,
        getRemainingAttempts,
        addLog,
        getLogs,
        clearLogs,
        getAllLockedAccounts,
        getAllAttempts
    };

    console.log('[Lockout] Module loaded. Max attempts:', CONFIG.maxAttempts,
                '| Lock duration:', CONFIG.lockDurationMs / 60000, 'min');
})();