/**
 usermanagement lockout
 */

(function () {
    'use strict';

    // ================================================================
    // 1. FALLBACK — only used if window.DWSS_Lockout is not present.
    //    Kept API-compatible with ac-lock.js so the rest of the code
    //    does not need to know which one is active.
    // ================================================================
    function buildFallbackLockout() {
        var CONFIG = {
            maxAttempts: 5,
            lockDurationMs: 30 * 60 * 1000,
            storageKey: 'dwss_lockout_state',
            logKey: 'dwss_login_logs',
            maxLogs: 1000
        };

        function loadState() {
            try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'); }
            catch (e) { return {}; }
        }
        function saveState(s) {
            try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(s)); } catch (e) {}
        }
        function addLog(type, username, details) {
            try {
                var logs = JSON.parse(localStorage.getItem(CONFIG.logKey) || '[]');
                logs.unshift({
                    timestamp: new Date().toISOString(),
                    type: type,
                    username: username,
                    details: details || {}
                });
                if (logs.length > CONFIG.maxLogs) logs.length = CONFIG.maxLogs;
                localStorage.setItem(CONFIG.logKey, JSON.stringify(logs));
            } catch (e) {}
        }
        function getLogs(username) {
            try {
                var logs = JSON.parse(localStorage.getItem(CONFIG.logKey) || '[]');
                if (!username) return logs;
                var k = username.toLowerCase();
                return logs.filter(function (l) {
                    return l.username && l.username.toLowerCase() === k;
                });
            } catch (e) { return []; }
        }
        return {
            CONFIG: CONFIG,
            recordFailedAttempt: function (username) {
                if (!username) return null;
                var state = loadState();
                var now = Date.now();
                var key = username.toLowerCase();
                if (!state[key]) state[key] = { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
                var entry = state[key];
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
                        lockedUntil: new Date(entry.lockedUntil).toISOString()
                    });
                } else {
                    addLog('failed_login', username, { attempts: entry.attempts });
                }
                saveState(state);
                return entry;
            },
            recordSuccessfulAttempt: function (username) {
                if (!username) return;
                var state = loadState();
                var key = username.toLowerCase();
                if (state[key]) { delete state[key]; saveState(state); }
                addLog('login_success', username, {});
            },
            resetAttempts: function (username, unlockedBy) {
                if (!username) return false;
                var state = loadState();
                var key = username.toLowerCase();
                var had = !!state[key];
                delete state[key];
                saveState(state);
                addLog('account_unlocked', username, { unlockedBy: unlockedBy || 'system' });
                return had;
            },
            isLocked: function (username) {
                if (!username) return { locked: false };
                var state = loadState();
                var key = username.toLowerCase();
                var entry = state[key];
                if (!entry || !entry.lockedUntil) return { locked: false };
                var now = Date.now();
                if (now < entry.lockedUntil) {
                    return {
                        locked: true,
                        lockedUntil: new Date(entry.lockedUntil),
                        remainingMs: entry.lockedUntil - now,
                        remainingMinutes: Math.ceil((entry.lockedUntil - now) / 60000),
                        attempts: entry.attempts
                    };
                }
                entry.lockedUntil = 0;
                entry.attempts = 0;
                saveState(state);
                return { locked: false };
            },
            getRemainingAttempts: function (username) {
                if (!username) return CONFIG.maxAttempts;
                var state = loadState();
                var entry = state[username.toLowerCase()];
                if (!entry) return CONFIG.maxAttempts;
                return Math.max(0, CONFIG.maxAttempts - (entry.attempts || 0));
            },
            addLog: addLog,
            getLogs: getLogs,
            clearLogs: function () { try { localStorage.removeItem(CONFIG.logKey); } catch (e) {} },
            getAllLockedAccounts: function () {
                var state = loadState();
                var now = Date.now();
                var out = [];
                Object.keys(state).forEach(function (u) {
                    var e = state[u];
                    if (e.lockedUntil && now < e.lockedUntil) {
                        out.push({
                            username: u,
                            attempts: e.attempts,
                            lockedUntil: new Date(e.lockedUntil),
                            remainingMs: e.lockedUntil - now,
                            remainingMinutes: Math.ceil((e.lockedUntil - now) / 60000)
                        });
                    }
                });
                return out;
            },
            getAllAttempts: function () {
                var state = loadState();
                var now = Date.now();
                return Object.keys(state).map(function (u) {
                    var e = state[u];
                    return {
                        username: u,
                        attempts: e.attempts || 0,
                        lastAttempt: e.lastAttempt ? new Date(e.lastAttempt) : null,
                        lockedUntil: (e.lockedUntil && now < e.lockedUntil) ? new Date(e.lockedUntil) : null,
                        isLocked: !!(e.lockedUntil && now < e.lockedUntil)
                    };
                });
            }
        };
    }

    var Lockout = window.DWSS_Lockout || buildFallbackLockout();
    // Expose so login page / other scripts can use it consistently.
    if (!window.DWSS_Lockout) window.DWSS_Lockout = Lockout;

    // ================================================================
    // 2. HELPERS
    // ================================================================
    function isAdminSession() {
        try {
            var raw = sessionStorage.getItem('dwss_session');
            if (!raw) return false;
            var user = JSON.parse(raw);
            return user && user.userRole === 'admin';
        } catch (e) { return false; }
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
        });
    }

    function formatRemaining(ms) {
        if (ms <= 0) return 'expired';
        var totalSec = Math.floor(ms / 1000);
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        if (m > 0) return m + 'm ' + s + 's';
        return s + 's';
    }

    // ================================================================
    // 3. RENDER — Locked Accounts panel
    // ================================================================
    function findUserRecord(lockedUsername) {
        // Match a locked username (which may be an email) against UserManagement.users
        if (!window.UserManagement || !Array.isArray(UserManagement.users)) return null;
        var needle = String(lockedUsername).toLowerCase();
        return UserManagement.users.find(function (u) {
            return (u.email && u.email.toLowerCase() === needle) ||
                   (u.name && u.name.toLowerCase() === needle);
        }) || null;
    }

    function renderLockedPanel() {
        var panel = document.getElementById('locked-accounts-panel');
        var list = document.getElementById('locked-accounts-list');
        if (!panel || !list) return;

        // Only Admin sees locked accounts (spec: only admin can unlock).
        if (!isAdminSession()) {
            panel.style.display = 'none';
            return;
        }

        var locked = Lockout.getAllLockedAccounts();

        if (!locked.length) {
            panel.style.display = 'none';
            list.innerHTML = '';
            return;
        }

        panel.style.display = 'block';
        list.innerHTML = '';

        locked.forEach(function (entry) {
            var user = findUserRecord(entry.username);
            var displayName = user ? user.name : entry.username;
            var displaySub = user
                ? escapeHtml(user.email) + (user.department ? ' · ' + escapeHtml(user.department) : '')
                : 'User not found in directory';

            var row = document.createElement('div');
            row.className = 'locked-account-row';
            row.setAttribute('data-username', entry.username);
            row.innerHTML =
                '<div class="locked-account-info">' +
                    '<div class="locked-account-username">' +
                        '<i class="fas fa-user-lock"></i>' + escapeHtml(displayName) +
                    '</div>' +
                    '<div class="locked-account-meta">' +
                        displaySub +
                        '<br>' +
                        'Locked after <strong>' + entry.attempts + ' failed attempts</strong> · ' +
                        'Auto-unlock in <strong class="lock-remaining" data-until="' +
                            entry.lockedUntil.getTime() + '">' +
                            formatRemaining(entry.remainingMs) +
                        '</strong>' +
                    '</div>' +
                '</div>' +
                '<button class="btn-unlock" data-username="' + escapeHtml(entry.username) + '">' +
                    '<i class="fas fa-unlock"></i> Unlock' +
                '</button>';
            list.appendChild(row);
        });

        // Wire unlock buttons
        list.querySelectorAll('.btn-unlock').forEach(function (btn) {
            btn.addEventListener('click', handleUnlockClick);
        });

        startCountdownTicker();
    }

    function handleUnlockClick(e) {
        var btn = e.currentTarget;
        var username = btn.getAttribute('data-username');
        if (!username) return;

        if (!isAdminSession()) {
            alert('Only an authorised system administrator can unlock user accounts.');
            return;
        }

        var adminName = 'Administrator';
        try {
            var s = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
            adminName = s.userName || adminName;
        } catch (err) {}

        if (!confirm('Unlock account "' + username + '"?\n\nThis action will be logged in the audit trail.')) {
            return;
        }

        Lockout.resetAttempts(username, adminName);

        // Refresh both the locked panel and the main user table (row badges)
        renderLockedPanel();
        if (window.UserManagement && typeof UserManagement.renderUserTable === 'function') {
            UserManagement.renderUserTable();
        }

        // Small confirmation toast
        var toast = document.createElement('div');
        toast.textContent = '✓ Account unlocked: ' + username;
        toast.style.cssText =
            'position:fixed;bottom:24px;right:24px;background:#27ae60;color:#fff;' +
            'padding:12px 18px;border-radius:8px;font-weight:600;z-index:9999;' +
            'box-shadow:0 4px 12px rgba(0,0,0,0.2);';
        document.body.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 2500);
    }

    // ================================================================
    // 4. COUNTDOWN TICKER — live "auto-unlock in Xm Ys"
    // ================================================================
    var tickerHandle = null;
    function startCountdownTicker() {
        if (tickerHandle) return;
        tickerHandle = setInterval(function () {
            var els = document.querySelectorAll('.lock-remaining');
            if (!els.length) return;
            var now = Date.now();
            var anyAlive = false;
            els.forEach(function (el) {
                var until = parseInt(el.getAttribute('data-until'), 10);
                if (!until) return;
                var remain = until - now;
                if (remain <= 0) {
                    el.textContent = 'expired';
                } else {
                    el.textContent = formatRemaining(remain);
                    anyAlive = true;
                }
            });
            // If everything expired, re-render to remove the panel/rows.
            if (!anyAlive) {
                clearInterval(tickerHandle);
                tickerHandle = null;
                renderLockedPanel();
                if (window.UserManagement && typeof UserManagement.renderUserTable === 'function') {
                    UserManagement.renderUserTable();
                }
            }
        }, 1000);
    }

    // ================================================================
    // 5. ROW BADGE — decorate user rows whose account is locked
    //    (called after UserManagement.renderUserTable)
    // ================================================================
    function decorateLockedRows() {
        var tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        var lockedMap = {};
        Lockout.getAllLockedAccounts().forEach(function (e) {
            lockedMap[e.username.toLowerCase()] = e;
        });

        tbody.querySelectorAll('tr').forEach(function (tr) {
            var nameCell = tr.querySelector('.user-name');
            var emailCell = tr.children[1];
            if (!nameCell || !emailCell) return;

            var email = (emailCell.textContent || '').trim().toLowerCase();
            var name = (nameCell.textContent || '').trim().toLowerCase();
            var entry = lockedMap[email] || lockedMap[name];

            // Remove any previous badge
            var oldBadge = nameCell.querySelector('.account-locked-badge');
            if (oldBadge) oldBadge.remove();

            if (entry) {
                var badge = document.createElement('span');
                badge.className = 'account-locked-badge';
                badge.style.cssText =
                    'display:inline-block;margin-left:8px;padding:2px 8px;border-radius:10px;' +
                    'background:#e74c3c;color:#fff;font-size:11px;font-weight:600;';
                badge.innerHTML = '<i class="fas fa-lock"></i> LOCKED';
                badge.title = 'Locked until ' + entry.lockedUntil.toLocaleString();
                nameCell.appendChild(badge);
            }
        });
    }

    // ================================================================
    // 6. MONKEY-PATCH UserManagement.renderUserTable so the badge is
    //    applied automatically after every re-render.
    // ================================================================
    function patchRenderUserTable() {
        if (!window.UserManagement || typeof UserManagement.renderUserTable !== 'function') {
            return false;
        }
        if (UserManagement.__lockoutPatched) return true;
        var original = UserManagement.renderUserTable.bind(UserManagement);
        UserManagement.renderUserTable = function () {
            var result = original.apply(this, arguments);
            try { decorateLockedRows(); } catch (e) {}
            return result;
        };
        UserManagement.__lockoutPatched = true;
        return true;
    }

    // ================================================================
    // 7. PUBLIC API — helpers for the login page
    // ================================================================
    window.DWSS_UserLockoutUI = {
        Lockout: Lockout,

        /**
         * Call this from the login page when authentication fails.
         * Returns { locked: bool, attempts, remainingAttempts }.
         */
        onLoginFailure: function (username) {
            var entry = Lockout.recordFailedAttempt(username);
            var status = Lockout.isLocked(username);
            return {
                locked: status.locked,
                attempts: entry ? entry.attempts : 0,
                remainingAttempts: Lockout.getRemainingAttempts(username)
            };
        },

        /** Call this from the login page on successful authentication. */
        onLoginSuccess: function (username) {
            Lockout.recordSuccessfulAttempt(username);
        },

        /** Refresh the locked-accounts panel manually. */
        refresh: function () {
            renderLockedPanel();
            decorateLockedRows();
        },

        /** True if the account is currently suspended. */
        isLocked: function (username) {
            return Lockout.isLocked(username);
        }
    };

        // ================================================================
    // 8. BOOTSTRAP
    // ================================================================
    function boot() {
        // If UserManagement isn't defined yet (script order), wait a tick.
        if (!window.UserManagement) {
            setTimeout(boot, 100);
            return;
        }

        patchRenderUserTable();

        // Initial render
        renderLockedPanel();
        decorateLockedRows();

        // Re-render shortly after — session / lockout state may not have
        // been ready at first boot (e.g. straight after a login redirect).
        setTimeout(function () {
            renderLockedPanel();
            decorateLockedRows();
        }, 100);
        setTimeout(function () {
            renderLockedPanel();
            decorateLockedRows();
        }, 500);

        // Refresh when the tab regains focus
        window.addEventListener('focus', function () {
            renderLockedPanel();
            decorateLockedRows();
        });

        // Refresh when the page becomes visible again (switching tabs)
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                renderLockedPanel();
                decorateLockedRows();
            }
        });

        // Refresh when localStorage changes from another tab
        // (e.g. someone gets locked on the login tab, then you switch here)
        window.addEventListener('storage', function (e) {
            if (e.key === 'dwss_lockout_state' || e.key === null) {
                renderLockedPanel();
                decorateLockedRows();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    console.log('[UserLockoutUI] Loaded. Max attempts:',
        Lockout.CONFIG.maxAttempts, '| Lock duration (min):',
        Lockout.CONFIG.lockDurationMs / 60000);
})();