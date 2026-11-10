/**
 * security-settings.js
 * 統一管理「Submit / Approve / Reject 是否需要重新輸入密碼」的開關
 *
 * Key 約定（與 settings.html 一致）：
 *   項目級: dwss_require_submit_password:<PROJECT_ID>
 *   全局默認: dwss_require_submit_password
 *
 * 讀取順序：項目級 → 全局 → 默認 true（需要密碼）
 */
(function () {
    'use strict';

    var GLOBAL_KEY = 'dwss_require_submit_password';

    function normalizeProjectId(p) {
        if (!p) return null;
        if (typeof p === 'object') {
            p = p.id || p.projectId || p.project_id || p.code || p.name;
        }
        if (!p) return null;
        p = String(p).trim();
        if (!p || p === 'ALL' || p === 'null' || p === 'undefined') return null;
        return p;
    }

    function getCurrentProjectId() {
        try {
            if (window.DWSS_Permissions && typeof window.DWSS_Permissions.getCurrentProject === 'function') {
                var pid = normalizeProjectId(window.DWSS_Permissions.getCurrentProject());
                if (pid) return pid;
            }
        } catch (e) {}
        return normalizeProjectId(sessionStorage.getItem('currentProjectId'));
    }

    function keyForProject(projectId) {
        return GLOBAL_KEY + ':' + (projectId || 'GLOBAL');
    }

    function isPasswordRequired() {
        try {
            var pid = getCurrentProjectId();
            if (pid) {
                var v = localStorage.getItem(keyForProject(pid));
                if (v === 'true' || v === 'false') return v === 'true';
            }
            var g = localStorage.getItem(GLOBAL_KEY);
            if (g === 'true' || g === 'false') return g === 'true';
            return true;
        } catch (e) {
            return true;
        }
    }

    function setPasswordRequired(val) {
        var v = (val === false || val === 'false') ? 'false' : 'true';
        var pid = getCurrentProjectId();
        try {
            if (pid) localStorage.setItem(keyForProject(pid), v);
            localStorage.setItem(GLOBAL_KEY, v);
        } catch (e) {}
        return v;
    }

    window.DWSS_Security = {
        isPasswordRequired: isPasswordRequired,
        setPasswordRequired: setPasswordRequired,
        getCurrentProjectId: getCurrentProjectId,
        normalizeProjectId: normalizeProjectId
    };
})();