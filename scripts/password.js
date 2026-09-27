/**
 * password policy
 */

(function() {
    'use strict';

    // ==================== CONFIG ====================
    const POLICY = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
        // Common weak passwords to reject
        blacklist: [
            'password', 'password1', 'password123',
            'admin', 'admin123', 'administrator',
            '12345678', 'qwerty123', 'letmein',
            'welcome1', 'changeme', 'abc12345'
        ]
    };

    // ==================== VALIDATION ====================

    /**
     * Check password strength
     * Returns { valid: boolean, score: 0-4, errors: [], suggestions: [] }
     */
    function checkPassword(password) {
        const errors = [];
        const suggestions = [];

        if (!password || typeof password !== 'string') {
            return {
                valid: false,
                score: 0,
                errors: ['Password is required'],
                suggestions: []
            };
        }

        // Length check
        if (password.length < POLICY.minLength) {
            errors.push(`Must be at least ${POLICY.minLength} characters long`);
        }

        // Character class checks
        if (POLICY.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Must contain at least one uppercase letter (A-Z)');
        }
        if (POLICY.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Must contain at least one lowercase letter (a-z)');
        }
        if (POLICY.requireNumber && !/[0-9]/.test(password)) {
            errors.push('Must contain at least one number (0-9)');
        }
        if (POLICY.requireSpecial && !/[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/~`';]/.test(password)) {
            errors.push('Must contain at least one special character (!@#$%^&* etc.)');
        }

        // Blacklist check
        const lower = password.toLowerCase();
        if (POLICY.blacklist.some(b => lower.includes(b) || b.includes(lower))) {
            errors.push('This password is too common — please choose a different one');
        }

        // Suggestions for improvement
        if (password.length < 12) suggestions.push('Longer passwords are stronger');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) suggestions.push('Add more special characters');
        if (!/[0-9].*[0-9]/.test(password)) suggestions.push('Add more numbers');

        // Score (0-4)
        let score = 0;
        if (password.length >= POLICY.minLength) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

        return {
            valid: errors.length === 0,
            score: score,
            errors: errors,
            suggestions: suggestions
        };
    }

    /**
     * Format a validation result as an HTML message
     */
    function formatFeedback(result) {
        if (result.valid) {
            return {
                cssClass: 'password-valid',
                icon: 'fa-check-circle',
                message: 'Password meets requirements ✓'
            };
        }
        return {
            cssClass: 'password-invalid',
            icon: 'fa-exclamation-circle',
            message: result.errors[0] || 'Password does not meet requirements',
            details: result.errors
        };
    }

    // ==================== EXPORT ====================
    window.DWSS_PasswordPolicy = {
        POLICY,
        check: checkPassword,
        formatFeedback
    };

    console.log('[PasswordPolicy] Loaded. Min length:', POLICY.minLength);
})();