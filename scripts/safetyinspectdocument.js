// ===== Safety Inspection Document Viewer (PDF.js + Annotations) =====
(function() {
    'use strict';

    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let annotations = [];
    let currentDocId = null;
    let safetyFormData = null; // ★ 保存表單資料
    
    const baseScale = 1.0; 
    const renderScale = 2.0;

    // ---------- DOM 引用 ----------
    const pdfCanvas = document.getElementById('pdf-canvas');
    const annoCanvas = document.getElementById('annotation-canvas');
    const textContainer = document.getElementById('text-annotation-container');
    const ctx = pdfCanvas ? pdfCanvas.getContext('2d') : null;
    const annoCtx = annoCanvas ? annoCanvas.getContext('2d') : null;
    const loadingEl = document.getElementById('pdf-loading');
    const errorEl = document.getElementById('pdf-error');
    const noPdfEl = document.getElementById('no-pdf-message');
    const controlsEl = document.getElementById('pdf-controls');
    const currentPageSpan = document.getElementById('pdf-current-page');
    const totalPagesSpan = document.getElementById('pdf-total-pages');
    const printBtn = document.getElementById('print-pdf-btn');
    const downloadBtn = document.getElementById('download-pdf-btn');

    // ========================================
    // ★ Safety Inspection 固定表單 Layout (與編輯器一致)
    // ========================================
    var SAFETY_LAYOUT = {
        typeCheckboxes: {
            1: [
                { key: 'weekly', left: '27.72%', top: '17.00%', width: '1.08%', height: '0.89%' },
                { key: 'daily',  left: '37.14%', top: '17.00%', width: '1.16%', height: '0.89%' },
                { key: 'adhoc',  left: '44.72%', top: '17.00%', width: '1.17%', height: '0.83%' }
            ],
        },
        header: {
            '*': {
                Project:    { left: '55.00%', top: '4.50%',  width: '33.00%', height: '6.30%', multiline: true },
                ContractNo: { left: '61.64%', top: '11.00%', width: '29.58%', height: '1.71%' },
            },
            1: {
                location:  { left: '18.72%', top: '18.15%', width: '31.92%', height: '1.59%' },
                taskOrder: { left: '63.64%', top: '18.15%', width: '29.58%', height: '1.71%' },
                date:      { left: '15.89%', top: '20.00%', width: '34.75%', height: '1.59%' },
                time:      { left: '56.30%', top: '20.00%', width: '37.00%', height: '1.65%' },
            },
            7: {
                Detail:  { left: '10.72%', top: '52.15%', width: '80.92%', height: '25.59%', multiline: true},
                Inspectedbyname1:  { left: '17.72%', top: '86.15%', width: '10.92%', height: '2.59%'},
                Inspectedbypos1:   { left: '18.72%', top: '90.0%',  width: '10.92%', height: '2.59%'},
                Inspectedbysign1:  { left: '19.72%', top: '92.5%', width: '10.92%', height: '4.5%', sign: true },
                Inspectedbyname2:  { left: '47.72%', top: '86.15%', width: '10.92%', height: '2.59%'},
                Inspectedbypos2:   { left: '48.72%', top: '90.0%',  width: '10.92%', height: '2.59%'},
                Inspectedbysign2:  { left: '49.72%', top: '92.5%', width: '10.92%', height: '4.5%', sign: true },
                Witnessbyname1:    { left: '77.72%', top: '86.15%', width: '10.92%', height: '2.59%'},
                Witnessbypos1:     { left: '78.72%', top: '90.0%',  width: '10.92%', height: '2.59%'},
                Witnessbysign1:    { left: '79.72%', top: '92.5%', width: '10.92%', height: '4.5%', sign: true },
            },
            8: {
                PhotoNo1a: { left: '74.64%', top: '19.00%', width: '18.58%', height: '1.71%' },
                location1: { left: '64.00%', top: '21.00%', width: '24.58%', height: '1.71%' },
                Description1: { left: '64.00%', top: '23.00%',  width: '30.00%', height: '13.30%', multiline: true },
                PhotoNo1b: { left: '74.64%', top: '37.00%', width: '18.58%', height: '1.71%' },
                Action1: { left: '64.00%', top: '39.00%',  width: '30.00%', height: '5.30%', multiline: true },
                Reportedby1: { left: '64.00%', top: '45.50%', width: '24.58%', height: '1.71%' },
                Completiondate1: { left: '64.00%', top: '48.00%',  width: '30.00%', height: '5.30%', multiline: true },
                PhotoNo2a: { left: '74.64%', top: '56.00%', width: '18.58%', height: '1.71%' },
                location2: { left: '64.00%', top: '58.00%', width: '24.58%', height: '1.71%' },
                Description2: { left: '64.00%', top: '60.00%',  width: '30.00%', height: '13.30%', multiline: true },
                PhotoNo2b: { left: '74.64%', top: '74.00%', width: '18.58%', height: '1.71%' },
                Action2: { left: '64.00%', top: '76.00%',  width: '30.00%', height: '5.30%', multiline: true },
                Reportedby2: { left: '64.00%', top: '82.50%', width: '24.58%', height: '1.71%' },
                Completiondate2: { left: '64.00%', top: '85.00%',  width: '30.00%', height: '5.30%', multiline: true },
                Photo1: { left: '11.00%', top: '18.50%', width: '38.00%', height: '18.00%', image: true },
                Photo2: { left: '11.00%', top: '36.50%', width: '38.00%', height: '16.00%', image: true },
                Photo3: { left: '11.00%', top: '55.70%', width: '38.00%', height: '18.00%', image: true },
                Photo4: { left: '11.00%', top: '74.00%', width: '38.00%', height: '16.00%', image: true },
            }
        },
        ratingColumns: {
            A:     { left: '67.67%', width: '5.00%' },
            B:     { left: '73.95%', width: '5.00%' },
            C:     { left: '80.03%', width: '5.00%' },
            'N/A': { left: '86.91%', width: '5.00%' }
        },
        sections: [
            { letter: 'A',   page: 1, startY: '26.95%', rowHeight: '2.18%', cellHeight: '2.40%', itemCount: 13 },
            { letter: 'B',   page: 1, startY: '58.40%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 9 },
            { letter: 'C.i1to3', page: 1, startY: '81.80%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 3 },
            { letter: 'C.i4', page: 1, startY: '89.92%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 1 },
            { letter: 'C.i5', page: 1, startY: '93.00%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 1 },
            { letter: 'C.i6', page: 2, startY: '14.50%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 1 },
            { letter: 'C.ii1to4', page: 2, startY: '18.40%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'C.ii5to6', page: 2, startY: '28.40%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'C.ii7to8', page: 2, startY: '36.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'C.ii9', page: 2, startY: '41.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'C.iii1to2', page: 2, startY: '48.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'C.iii3', page: 2, startY: '54.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'C.iii4to7', page: 2, startY: '57.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'C.iii8', page: 2, startY: '67.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'C.iii9to10', page: 2, startY: '71.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'D.1to4', page: 2, startY: '79.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'D.5', page: 2, startY: '89.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'D.6to7', page: 2, startY: '92.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'D.8to12', page: 3, startY: '14.10%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 5 },
            { letter: 'D.13to14', page: 3, startY: '26.20%', rowHeight: '5.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'E.1to4', page: 3, startY: '40.80%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'E.5to6', page: 3, startY: '56.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'E.7', page: 3, startY: '62.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'E.8to10', page: 3, startY: '66.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 3 },
            { letter: 'E.11', page: 3, startY: '74.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'E.12', page: 3, startY: '76.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'E.13to16', page: 3, startY: '80.80%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'F.1to2', page: 4, startY: '18.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'F.3', page: 4, startY: '24.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'F.4to8', page: 4, startY: '27.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 5 },
            { letter: 'F.9', page: 4, startY: '39.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'G.1', page: 4, startY: '49.00%', rowHeight: '2.18%', cellHeight: '15.18%', itemCount: 1 },
            { letter: 'G.2to3', page: 4, startY: '69.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'G.4', page: 4, startY: '75.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'G.5', page: 4, startY: '80.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'G.6', page: 4, startY: '84.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'H.1to4', page: 5, startY: '17.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'H.5', page: 5, startY: '27.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'H.6', page: 5, startY: '30.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'I.1to10', page: 5, startY: '36.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 10 },
            { letter: 'J.1to5', page: 5, startY: '61.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 6 },
            { letter: 'J.7', page: 5, startY: '75.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'J.8', page: 5, startY: '78.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'J.9', page: 5, startY: '81.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'J.10', page: 5, startY: '85.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'K.1to3', page: 6, startY: '18.50%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 3 },
            { letter: 'K.4', page: 6, startY: '30.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'L.1to2', page: 6, startY: '36.50%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'L.3to6', page: 6, startY: '44.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'M.1', page: 6, startY: '57.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'M.2to5', page: 6, startY: '60.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'N.1to6', page: 6, startY: '73.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 6 },
            { letter: 'O.1to5', page: 7, startY: '17.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 5 },
            { letter: 'P.1to7', page: 7, startY: '31.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 7 },
        ]
    };

    // ---------- 輔助函數 ----------
    function syncGlobalDate() {
        const stored = sessionStorage.getItem('globalDate');
        const span = document.querySelector('.date-display span');
        if (stored && span) span.textContent = stored;
        else if (span) {
            span.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    function loadAnnotationsFromStorage(docId) {
        const STORAGE_KEY = 'inspectionData';
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        try {
            const inspectionData = JSON.parse(stored);
            const doc = inspectionData.find(d => String(d.id) === String(docId));
            return doc && doc.annotations ? doc.annotations : [];
        } catch (e) {
            console.error('Failed to load annotations:', e);
            return [];
        }
    }

    // ========================================
    // ★ 注入唯讀表單內容 (隱藏所有框框與背景)
    // ========================================
    function ensureReadOnlyStyle() {
        if (document.getElementById('safety-readonly-style')) return;
        var style = document.createElement('style');
        style.id = 'safety-readonly-style';
        style.textContent =
            '.pdf-checkbox-readonly {' +
                'display:flex;align-items:center;justify-content:center;' +
                'color:#0a1a5c;font-weight:bold;font-size:18px;' +
                'box-sizing:border-box;background:transparent !important;border:none !important;' + // 強制無背景、無邊框
                'font-family: Arial, sans-serif;' +
            '}' +
            '.pdf-checkbox-readonly.checked { ' +
                'color: #0a1a5c;' +
            '}' +
            '.pdf-field-readonly {' +
                'font-family: Arial;color:#0a1a5c;font-size:11px;' +
                'padding:1px 4px;box-sizing:border-box;overflow:hidden;' +
                'display:flex;align-items:center;' +
                'border:none !important;' + // ★ 強制移除邊框
                'background:transparent !important;' + // ★ 強制移除背景
            '}' +
            '.pdf-image-readonly, .pdf-sign-readonly {' +
                'object-fit:contain;display:block;' +
            '}';
        document.head.appendChild(style);
    }

    function injectReadOnlyFormFields(pageNum, formData) {
        if (!formData) return;
        var wrapper = document.getElementById('pdf-canvas-wrapper');
        if (!wrapper) return;
        
        var oldOverlay = wrapper.querySelector('.safety-form-overlay');
        if (oldOverlay) oldOverlay.remove();
        
        ensureReadOnlyStyle();
        
        var overlay = document.createElement('div');
        overlay.className = 'safety-form-overlay';
        overlay.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:50;pointer-events:none;';
        
        // 1. Type checkboxes
        var pageTypeCbs = SAFETY_LAYOUT.typeCheckboxes[pageNum] || [];
        pageTypeCbs.forEach(function (cb) {
            if (formData.type === cb.key) {
                var el = document.createElement('div');
                el.className = 'pdf-checkbox-readonly checked';
                el.style.cssText = 'position:absolute;left:'+cb.left+';top:'+cb.top+';width:'+cb.width+';height:'+cb.height+';';
                el.innerHTML = '✓';
                overlay.appendChild(el);
            }
        });
        
        // 2. Header
        var pageHeaderDefaults = SAFETY_LAYOUT.header['*'] || {};
        var pageHeaderOverride = SAFETY_LAYOUT.header[pageNum] || {};
        var pageHeader = Object.assign({}, pageHeaderDefaults, pageHeaderOverride);
        
        Object.keys(pageHeader).forEach(function (key) {
            var f = pageHeader[key];
            var val = formData.header && formData.header[key];
            if (val) {
                var el;
                if (f.sign === true || f.type === 'sign') {
                    el = document.createElement('img');
                    el.src = val; 
                    el.className = 'pdf-sign-readonly';
                    el.style.cssText = 'position:absolute;left:'+f.left+';top:'+f.top+';width:'+(f.width||'10%')+';height:'+(f.height||'3%')+';';
                } else if (f.image === true || f.type === 'image') {
                    el = document.createElement('img');
                    el.src = val; 
                    el.className = 'pdf-image-readonly';
                    el.style.cssText = 'position:absolute;left:'+f.left+';top:'+f.top+';width:'+(f.width||'10%')+';height:'+(f.height||'5%')+';';
                } else {
                    el = document.createElement('div');
                    el.textContent = val;
                    el.className = 'pdf-field-readonly';
                    el.style.cssText = 'position:absolute;left:'+f.left+';top:'+f.top+';width:'+(f.width||'8%')+';height:'+(f.height||'1.8%')+';';
                }
                overlay.appendChild(el);
            }
        });
        
        // 3. Ratings
        SAFETY_LAYOUT.sections.forEach(function (section) {
            if (section.page !== pageNum) return;
            var startY = parseFloat(section.startY);
            var rowH = parseFloat(section.rowHeight);
            var cellH = parseFloat(section.cellHeight);
            
            for (var i = 0; i < section.itemCount; i++) {
                var top = (startY + i * rowH) + '%';
                var rowKey = section.letter + '_' + i;
                var selectedRating = formData.ratings && formData.ratings[rowKey];
                if (selectedRating) {
                    var col = SAFETY_LAYOUT.ratingColumns[selectedRating];
                    if (col) {
                        var el = document.createElement('div');
                        el.className = 'pdf-checkbox-readonly checked';
                        el.style.cssText = 'position:absolute;left:'+col.left+';top:'+top+';width:'+col.width+';height:'+cellH+'%;';
                        el.innerHTML = '✓';
                        overlay.appendChild(el);
                    }
                }
            }
        });
        
        wrapper.appendChild(overlay);
    }

    function alignSafetyOverlay() {
        var wrapper = document.getElementById('pdf-canvas-wrapper');
        var canvas = document.getElementById('pdf-canvas');
        if (!wrapper || !canvas) return;
        var overlay = wrapper.querySelector('.safety-form-overlay');
        if (!overlay) return;
        if (canvas.offsetWidth === 0 && canvas.offsetHeight === 0) return;
        
        var canvasRect = canvas.getBoundingClientRect();
        var wrapperRect = wrapper.getBoundingClientRect();
        
        var left = canvasRect.left - wrapperRect.left;
        var top = canvasRect.top - wrapperRect.top;
        
        overlay.style.left = left + 'px';
        overlay.style.top = top + 'px';
        overlay.style.width = canvasRect.width + 'px';
        overlay.style.height = canvasRect.height + 'px';
    }

    // ---------- 绘制非文本注释 ----------
    function drawAnnotation(anno, scale) {
        if (!annoCtx) return;
        const ctx = annoCtx;

        switch (anno.type) {
            case 'highlight':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100 * 0.4;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = (anno.size || 3) * scale;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (anno.points && anno.points.length > 1) {
                    ctx.beginPath();
                    const first = anno.points[0];
                    ctx.moveTo(first.x * scale, first.y * scale);
                    for (let i = 1; i < anno.points.length; i++) {
                        ctx.lineTo(anno.points[i].x * scale, anno.points[i].y * scale);
                    }
                    ctx.stroke();
                }
                ctx.restore();
                break;
            case 'rectangle':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = (anno.size || 3) * scale;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const x = Math.min(anno.startX, anno.endX) * scale;
                    const y = Math.min(anno.startY, anno.endY) * scale;
                    const w = Math.abs(anno.endX - anno.startX) * scale;
                    const h = Math.abs(anno.endY - anno.startY) * scale;
                    ctx.strokeRect(x, y, w, h);
                }
                ctx.restore();
                break;
            case 'ellipse':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = (anno.size || 3) * scale;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const cx = (anno.startX + anno.endX) / 2 * scale;
                    const cy = (anno.startY + anno.endY) / 2 * scale;
                    const rx = Math.abs(anno.endX - anno.startX) / 2 * scale;
                    const ry = Math.abs(anno.endY - anno.startY) / 2 * scale;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
                break;
            case 'arrow':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.fillStyle = anno.color || '#3498db';
                ctx.lineWidth = (anno.size || 3) * scale;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const fromX = anno.startX * scale;
                    const fromY = anno.startY * scale;
                    const toX = anno.endX * scale;
                    const toY = anno.endY * scale;
                    ctx.beginPath();
                    ctx.moveTo(fromX, fromY);
                    ctx.lineTo(toX, toY);
                    ctx.stroke();
                    const angle = Math.atan2(toY - fromY, toX - fromX);
                    const headLen = 10 * scale / 2;
                    ctx.beginPath();
                    ctx.moveTo(toX, toY);
                    ctx.lineTo(toX - headLen * Math.cos(angle - 0.5), toY - headLen * Math.sin(angle - 0.5));
                    ctx.moveTo(toX, toY);
                    ctx.lineTo(toX - headLen * Math.cos(angle + 0.5), toY - headLen * Math.sin(angle + 0.5));
                    ctx.stroke();
                }
                ctx.restore();
                break;
            case 'line':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = (anno.size || 3) * scale;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    ctx.beginPath();
                    ctx.moveTo(anno.startX * scale, anno.startY * scale);
                    ctx.lineTo(anno.endX * scale, anno.endY * scale);
                    ctx.stroke();
                }
                ctx.restore();
                break;
            default:
                break;
        }
    }

    function redrawAnnotations(scale) {
        if (!annoCtx) return;
        annoCtx.clearRect(0, 0, annoCanvas.width, annoCanvas.height);
        annotations.forEach(anno => {
            if (anno.type !== 'text') {
                if (anno.page !== undefined && anno.page !== currentPage) return;
                if (anno.page === undefined && currentPage !== 1) return;
                
                drawAnnotation(anno, scale);
            }
        });
    }

    // ---------- 渲染文本框 ----------
    function renderTextAnnotations(scale) {
        if (!textContainer) return;
        textContainer.innerHTML = '';
        const textAnnos = annotations.filter(a => a.type === 'text' && (a.page === currentPage || (a.page === undefined && currentPage === 1)));
        
        textAnnos.forEach(anno => {
            const el = document.createElement('div');
            el.className = 'text-annotation-view';
            el.textContent = anno.text || '';
            el.style.color = anno.color || '#000000';
            el.style.opacity = (anno.opacity || 100) / 100;
            el.style.fontSize = (anno.size * 4 * scale) + 'px';
            el.style.left = (anno.x * scale) + 'px';
            el.style.top = (anno.y * scale) + 'px';
            textContainer.appendChild(el);
        });
    }

    function fitToWidth() {
        return Promise.resolve();
    }

    function renderPage(pageNum) {
        if (!pdfDoc) return Promise.reject('No PDF document');
        return pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: renderScale });
            const cssViewport = page.getViewport({ scale: baseScale });
            
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            annoCanvas.width = viewport.width;
            annoCanvas.height = viewport.height;

            const widthPx = cssViewport.width + 'px';
            const heightPx = cssViewport.height + 'px';
            
            pdfCanvas.style.width = widthPx;
            pdfCanvas.style.height = heightPx;
            annoCanvas.style.width = widthPx;
            annoCanvas.style.height = heightPx;

            const renderContext = { canvasContext: ctx, viewport: viewport };
            return page.render(renderContext).promise;
        }).then(() => {
            const offsetX = pdfCanvas.offsetLeft || 0;
            const offsetY = pdfCanvas.offsetTop || 0;
            
            annoCanvas.style.left = offsetX + 'px';
            annoCanvas.style.top = offsetY + 'px';
            
            textContainer.style.left = offsetX + 'px';
            textContainer.style.top = offsetY + 'px';
            textContainer.style.width = pdfCanvas.style.width;
            textContainer.style.height = pdfCanvas.style.height;

            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;

            // ★ 注入表單內容與對齊
            injectReadOnlyFormFields(pageNum, safetyFormData);
            alignSafetyOverlay();

            redrawAnnotations(renderScale);
            renderTextAnnotations(baseScale);
            
        }).catch(err => {
            console.error('Render page error:', err);
            throw err;
        });
    }

    function loadDocument() {
        // ★ 嘗試從多個 sessionStorage key 讀取
        let documentDataRaw = sessionStorage.getItem('currentDocument') || 
                              sessionStorage.getItem('editDocument') || 
                              sessionStorage.getItem('currentInspectionRecord');
                              
        // ★ 如果 sessionStorage 沒有資料，嘗試從 localStorage 中找最新的一筆
        if (!documentDataRaw) {
            try {
                const storedList = localStorage.getItem('inspectionData');
                if (storedList) {
                    const list = JSON.parse(storedList);
                    if (list.length > 0) {
                        const urlParams = new URLSearchParams(window.location.search);
                        const idParam = urlParams.get('id');
                        let record = null;
                        if (idParam) {
                            record = list.find(d => String(d.id) === String(idParam));
                        } else {
                            record = list[list.length - 1];
                        }
                        if (record) {
                            documentDataRaw = JSON.stringify(record);
                        }
                    }
                }
            } catch(e) {
                console.warn('Fallback to localStorage failed', e);
            }
        }

        if (!documentDataRaw) {
            loadingEl.style.display = 'none';
            errorEl.textContent = 'No document data available. Please go back and select a record.';
            errorEl.style.display = 'block';
            return;
        }

        let documentData;
        try {
            documentData = JSON.parse(documentDataRaw);
        } catch (e) {
            loadingEl.style.display = 'none';
            errorEl.textContent = 'Invalid document data.';
            errorEl.style.display = 'block';
            return;
        }

        // ★ 從 localStorage 補全最新資料
        try {
            const STORAGE_KEY = 'inspectionData';
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const inspectionData = JSON.parse(stored);
                const fullDoc = inspectionData.find(d => String(d.id) === String(documentData.id));
                if (fullDoc) {
                    if (!documentData.safetyFormData && fullDoc.safetyFormData) documentData.safetyFormData = fullDoc.safetyFormData;
                    if (!documentData.annotations && fullDoc.annotations) documentData.annotations = fullDoc.annotations;
                }
            }
        } catch (e) { console.warn('Failed to merge from localStorage', e); }

        currentDocId = documentData.id;
        document.getElementById('docId').textContent = documentData.id || 'N/A';
        document.getElementById('docTitle').textContent = `${documentData.site || ''} - Safety Inspection`;
        document.getElementById('docSite').textContent = documentData.site || 'N/A';
        document.getElementById('docDate').textContent = documentData.date || 'N/A';
        document.getElementById('docAuthor').textContent = documentData.inspector || documentData.submittedBy || 'N/A';
        const statusEl = document.getElementById('docStatus');
        if (statusEl) {
            statusEl.textContent = documentData.statusText || 'Draft';
            statusEl.className = `doc-status status-${documentData.status || 'draft'}`;
        }

        // ★ 載入註解與表單資料
        annotations = documentData.annotations || loadAnnotationsFromStorage(currentDocId);
        safetyFormData = documentData.safetyFormData || null;

        let pdfSrc = documentData.pdfData || documentData.pdfUrl || null;

        // ★ 使用 SafetyInspection-data.js 的變數名稱
        if (!pdfSrc && window.SAFETY_INSPECTION_BASE64) {
            console.log('[SafetyDoc] 使用 Safety Inspection 固定模板');
            pdfSrc = 'data:application/pdf;base64,' + window.SAFETY_INSPECTION_BASE64;
        }

        if (!pdfSrc) {
            loadingEl.style.display = 'none';
            noPdfEl.style.display = 'block';
            printBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
            console.warn('[SafetyDoc] 找不到 PDF 資料，請確認 SafetyInspection-data.js 是否正確載入。');
            return;
        }

        let pdfSource;
        if (typeof pdfSrc === 'string' && pdfSrc.startsWith('data:application/pdf;base64,')) {
            pdfSource = { url: pdfSrc };
        } else if (typeof pdfSrc === 'string' && pdfSrc.length > 1000 && !pdfSrc.startsWith('http')) {
            try {
                const binary = atob(pdfSrc);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                pdfSource = { data: bytes };
            } catch (e) {
                loadingEl.style.display = 'none';
                errorEl.textContent = 'Invalid PDF data (Base64 decode failed).';
                errorEl.style.display = 'block';
                return;
            }
        } else {
            pdfSource = { url: pdfSrc };
        }

        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        noPdfEl.style.display = 'none';
        printBtn.style.display = 'none';
        downloadBtn.style.display = 'none';

        pdfjsLib.getDocument(pdfSource).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            totalPagesSpan.textContent = totalPages;
            currentPage = 1;
            controlsEl.style.display = 'flex';
            loadingEl.style.display = 'none';
            
            // ★ PDF 載入成功，顯示按鈕
            printBtn.style.display = 'inline-flex';
            downloadBtn.style.display = 'inline-flex';

            return fitToWidth().then(() => renderPage(currentPage));
        }).catch(err => {
            console.error('PDF loading error:', err);
            loadingEl.style.display = 'none';
            errorEl.textContent = 'Failed to load PDF: ' + (err.message || 'Unknown error');
            errorEl.style.display = 'block';
            printBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
        });
    }

    async function generateAnnotatedPDF() {
        const wrapper = document.getElementById('pdf-canvas-wrapper');
        if (!wrapper) {
            alert('PDF content not available.');
            throw new Error('No wrapper');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        let firstPage = true;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            await renderPage(pageNum);
            await new Promise(resolve => requestAnimationFrame(resolve));

            const canvas = await html2canvas(wrapper, {
                scale: 2.0,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (firstPage) {
                pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
                firstPage = false;
            } else {
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }
        }

        await renderPage(1);
        return pdf;
    }

    async function saveAsPDF(pdf) {
        if (window.showSaveFilePicker) {
            try {
                const blob = pdf.output('blob');
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'safety_inspection_with_annotations.pdf',
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                console.warn('Save file picker failed, falling back to default download.', err);
            }
        }
        pdf.save('safety_inspection_with_annotations.pdf');
    }

    function printPDF() {
        generateAnnotatedPDF().then(pdf => {
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const win = window.open(url, '_blank');
            if (win) {
                win.onload = function() {
                    win.print();
                };
            } else {
                alert('Please allow pop-ups to print.');
            }
        }).catch(err => {
            alert('Print failed: ' + err.message);
        });
    }

    function downloadPDF() {
        generateAnnotatedPDF().then(pdf => {
            saveAsPDF(pdf);
        }).catch(err => {
            alert('Download failed: ' + err.message);
        });
    }

    function setupControls() {
        document.getElementById('pdf-prev').addEventListener('click', () => {
            if (currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('pdf-next').addEventListener('click', () => {
            if (currentPage < totalPages) renderPage(currentPage + 1);
        });
    }

    function bindEvents() {
        const backBtn = document.getElementById('back-to-inspection-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'safetyinspect.html';
            });
        }
        if (printBtn) printBtn.addEventListener('click', printPDF);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadPDF);
    }

    document.addEventListener('DOMContentLoaded', function() {
        syncGlobalDate();
        loadDocument();
        setupControls();
        bindEvents();
    });
})();