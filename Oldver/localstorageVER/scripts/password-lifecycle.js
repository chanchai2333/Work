// scripts/password-lifecycle.js
// ============================================================
// DWSS Password Lifecycle
// Spec 1.37.3(4)(d): 首次登入改密碼、3 個月到期
// ============================================================

(function () {
    'use strict';

    var PASSWORD_EXPIRY_DAYS = 90;
    var REMINDER_DAYS = 7;

    function checkPasswordStatus(user) {
        if (!user) return { required: false, reason: 'no_user', daysLeft: 0 };

        if (!user.passwordChanged || user.passwordChanged === false) {
            return {
                required: true,
                reason: 'first_login',
                message: 'You must change your password on first login.'
            };
        }

        if (user.passwordExpiresAt) {
            var expiresAt = new Date(user.passwordExpiresAt).getTime();
            var now = Date.now();
            var daysLeft = Math.ceil((expiresAt - now) / 86400000);

            if (now >= expiresAt) {
                return {
                    required: true,
                    reason: 'expired',
                    daysLeft: 0,
                    message: 'Your password has expired. Please change it to continue.'
                };
            }

            if (daysLeft <= REMINDER_DAYS) {
                return {
                    required: false,
                    reason: 'expiring_soon',
                    daysLeft: daysLeft,
                    message: 'Your password will expire in ' + daysLeft + ' day(s).'
                };
            }

            return { required: false, reason: 'valid', daysLeft: daysLeft };
        }

        return { required: false, reason: 'valid', daysLeft: 0 };
    }

    function updatePasswordMetadata(user) {
        var now = new Date();
        var expiry = new Date(now.getTime() + PASSWORD_EXPIRY_DAYS * 86400000);

        user.passwordChanged = true;
        user.passwordChangedAt = now.toISOString();
        user.passwordExpiresAt = expiry.toISOString();
        return user;
    }

    function persistUserUpdate(user) {
        var USERS_KEY = 'dwss_users_db';
        try {
            var users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            var idx = users.findIndex(function (u) { return u.id === user.id; });
            if (idx !== -1) {
                users[idx] = user;
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                return true;
            }
        } catch (e) {
            console.error('[PasswordLifecycle] Failed to persist:', e);
        }
        return false;
    }

    function enforcePasswordPolicy(user) {
        var status = checkPasswordStatus(user);
        if (status.required) {
            sessionStorage.setItem('password_change_required', JSON.stringify({
                userId: user.id,
                reason: status.reason,
                message: status.message
            }));
        }
        return status;
    }

    window.DWSS_PasswordLifecycle = {
        PASSWORD_EXPIRY_DAYS: PASSWORD_EXPIRY_DAYS,
        REMINDER_DAYS: REMINDER_DAYS,

        checkStatus: checkPasswordStatus,
        updateMetadata: updatePasswordMetadata,
        persist: persistUserUpdate,
        enforce: enforcePasswordPolicy,

        changePassword: function (userId, newPassword) {
            var USERS_KEY = 'dwss_users_db';
            try {
                var users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                var user = users.find(function (u) { return u.id === userId; });
                if (!user) return { success: false, error: 'User not found' };

                user.password = newPassword;
                updatePasswordMetadata(user);
                localStorage.setItem(USERS_KEY, JSON.stringify(users));

                return { success: true, user: user };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    };

    console.log('[PasswordLifecycle] Module loaded');
    console.log('  - Expiry:', PASSWORD_EXPIRY_DAYS, 'days');
    console.log('  - Reminder:', REMINDER_DAYS, 'days before expiry');

})();