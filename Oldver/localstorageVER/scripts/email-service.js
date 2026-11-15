// scripts/email-service.js
// ============================================================
// DWSS Email Service (Mock)
// Spec 1.37.3(4)(d): 帳戶設定後以電郵發放登入名稱及密碼
// ============================================================

(function () {
    'use strict';

    var EMAIL_LOG_KEY = 'dwss_email_log';
    var MAX_LOG = 200;

    function logEmail(email) {
        try {
            var logs = JSON.parse(localStorage.getItem(EMAIL_LOG_KEY) || '[]');
            logs.unshift(email);
            if (logs.length > MAX_LOG) logs.length = MAX_LOG;
            localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(logs));
        } catch (e) {
            console.warn('[Email] Failed to log:', e);
        }
    }

    function sendEmail(options) {
        return new Promise(function (resolve) {
            var email = {
                id: 'EMAIL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                to: options.to,
                subject: options.subject,
                body: options.body,
                type: options.type || 'general',
                sentAt: new Date().toISOString(),
                status: 'sent'
            };

            logEmail(email);

            setTimeout(function () {
                console.log('[Email] ✓ Sent to:', email.to, '| Subject:', email.subject);
                resolve(email);
            }, 300);
        });
    }

    function sendAccountIssuanceEmail(user, plainPassword) {
        var subject = '[AEL DWSS] Your Account Has Been Created - ' + (user.contractNo || 'Contract No. DE/2024/12');
        var body =
            'Dear ' + user.name + ',\n\n' +
            'Your AEL DWSS account has been created.\n\n' +
            'Contract: ' + (user.contractNo || 'Contract No. DE/2024/12') + '\n' +
            'Organization: ' + (user.companyName || user.organization) + '\n' +
            'Role: ' + (user.role || '') + '\n\n' +
            'Login Details:\n' +
            '  Username: ' + (user.username || user.email) + '\n' +
            '  Email:    ' + user.email + '\n' +
            '  Password: ' + plainPassword + '\n\n' +
            'IMPORTANT:\n' +
            '  • You will be required to change your password on first login\n' +
            '  • Your password will expire after 90 days\n' +
            '  • Never share your credentials with anyone\n\n' +
            'Login URL: ' + window.location.origin + '/login.html\n\n' +
            'Regards,\n' +
            'AEL DWSS System Administrator\n' +
            'AEL - Associated Engineers Ltd.';

        return sendEmail({
            to: user.email,
            subject: subject,
            body: body,
            type: 'account_issuance'
        });
    }

    function sendPasswordResetEmail(user, resetToken) {
        var subject = '[AEL DWSS] Password Reset Request';
        var body =
            'Dear ' + user.name + ',\n\n' +
            'We received a request to reset your password.\n\n' +
            'Click the link below to reset:\n' +
            '  ' + window.location.origin + '/reset-password.html?token=' + resetToken + '\n\n' +
            'This link will expire in 30 minutes.\n\n' +
            'If you did not request this, please ignore this email.\n\n' +
            'Regards,\n' +
            'AEL DWSS System';

        return sendEmail({
            to: user.email,
            subject: subject,
            body: body,
            type: 'password_reset'
        });
    }

    function sendPasswordExpiryReminderEmail(user, daysLeft) {
        var subject = '[AEL DWSS] Password Expiry Reminder';
        var body =
            'Dear ' + user.name + ',\n\n' +
            'Your AEL DWSS password will expire in ' + daysLeft + ' day(s).\n\n' +
            'Please change your password before it expires to avoid login issues.\n\n' +
            'Login URL: ' + window.location.origin + '/login.html\n\n' +
            'Regards,\n' +
            'AEL DWSS System';

        return sendEmail({
            to: user.email,
            subject: subject,
            body: body,
            type: 'password_expiry'
        });
    }

    window.DWSS_EmailService = {
        send: sendEmail,
        sendAccountIssuance: sendAccountIssuanceEmail,
        sendPasswordReset: sendPasswordResetEmail,
        sendPasswordExpiryReminder: sendPasswordExpiryReminderEmail,

        getLog: function () {
            try {
                return JSON.parse(localStorage.getItem(EMAIL_LOG_KEY) || '[]');
            } catch (e) { return []; }
        },

        clearLog: function () {
            localStorage.removeItem(EMAIL_LOG_KEY);
        }
    };

    console.log('[EmailService] Module loaded (mock mode)');

})();