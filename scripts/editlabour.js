/**
 * editlabour.js - Labour Wage 編輯器
 *   - 支援多頁 PDF 模板顯示
 *   - GF527A / GF527-2003 / GF527-2017 皆走同一套多頁 PDF 渲染
 *   - ★ GF527A：USER + AI 覆蓋層
 *   - ★ GF527-2017：新增 9 個格子覆蓋層（每 4 個座標一組）
 *   - ★ 新增：PDF 縮放控制（50% ~ 300%）
 *   - ★ 新增：模板載入超時保護
 *   - ★ 新增：更健壯的資料讀取 + fallback
 *   - ★ 新增：PDF 顯示寬度自適應容器
 *   - 已移除 Download / Upload Excel 按鈕
 */
(function () {
    'use strict';

    var PDF_RENDER_SCALE = 2.0;
    var PDF_DISPLAY_SCALE = 1.2;
    var PDF_CONTAINER_PADDING = 48;
    var TEMPLATE_LOAD_TIMEOUT = 15000;
    var DEFAULT_TOTAL_PAGES = 1;
    var STORAGE_KEY = 'labourWageData';

    var ZOOM_MIN  = 0.5;
    var ZOOM_MAX  = 3.0;
    var ZOOM_STEP = 0.2;
    var zoomLevel = 1.0;

    var TEMPLATE_FILES = {
        'GF527A':     null,
        'GF527-2003': 'gf527_rev_1_2003_protected_r1 (July 26).xls',
        'GF527-2017': null
    };

    if (window.pdfjsLib) {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        } catch (e) {}
    } else {
        console.error('[Labour] ✗ pdfjsLib 未載入！請確認 pdf.min.js 有正確載入');
    }

    var currentDoc = null;
    var activePageNum = 1;
    var totalVirtualPages = DEFAULT_TOTAL_PAGES;
    var currentPageObj = null;
    var pdfDoc = null;

    var templateImages = [];
    var pageCssSizes   = [];

    var pageWrapper = document.getElementById('page-wrapper');
    var loadingIndicator = document.getElementById('loading-indicator');

    /* ============================================================
       GF527A - 使用者自己做的格子
       ============================================================ */
    var USER_FORM_LAYOUT = {
        fields: [
            { id: 'f01', label: '',       left: '34.64%', top: '9.04%',  width: '55%', height: '1.8%' },
            { id: 'f02', label: '',       left: '28.78%', top: '10.92%', width: '55%', height: '1.8%' },
            { id: 'f09', label: '',       left: '18.67%', top: '13.49%', width: '52%', height: '1.8%' },
            { id: 'f10', label: '欄位10', type: 'check', left: '10.67%', top: '15.79%', width: '3%', height: '1.8%' },
            { id: 'f12', label: '',       left: '80.14%', top: '13.69%', width: '13%', height: '1.8%' },
            { id: 'f03', label: '',       left: '41.14%', top: '22.89%', width: '34%', height: '1.8%' },
            { id: 'f04', label: '',       left: '35.14%', top: '25.69%', width: '60%', height: '1.8%' },
            { id: 'f05', label: '',       left: '15.14%', top: '27.69%', width: '60%', height: '1.8%' },
            { id: 'f06', label: '',       left: '85.74%', top: '27.69%', width: '10%', height: '1.8%' },
            { id: 'f17', label: '',       left: '19.51%', top: '18.44%', width: '77%', height: '1.8%' },
            { id: 'f18', label: '',       left: '38.53%', top: '20.98%', width: '37%', height: '1.8%' },
            { id: 'f19', label: '',       left: '80.80%', top: '20.62%', width: '15%', height: '1.8%' },
            { id: 'f20', label: '',       left: '80.80%', top: '23.34%', width: '15%', height: '1.8%' }
        ]
    };

    /* ============================================================
       GF527A - AI 生成的 52 個格子
       ============================================================ */
    var AI_FORM_LAYOUT = {
        fields: [
            { id: 'ai01', label: 'AI01', type: 'check', left: '6.70%',  top: '33.91%', width: '2.24%',  height: '1.59%' },
            { id: 'ai02', label: 'AI02', type: 'check', left: '6.70%',  top: '36.20%', width: '2.52%',  height: '1.48%' },
            { id: 'ai03', label: 'AI03', type: 'check', left: '6.70%',  top: '38.28%', width: '2.20%',  height: '1.50%' },
            { id: 'ai04', label: 'AI04', type: 'check', left: '38.54%', top: '34.00%', width: '2.52%',  height: '1.29%' },
            { id: 'ai05', label: 'AI05', type: 'check', left: '38.54%', top: '36.00%', width: '2.52%',  height: '1.58%' },
            { id: 'ai06', label: '', left: '72.88%', top: '33.91%', width: '12.46%', height: '1.59%' },
            { id: 'ai07', label: '', left: '26.94%', top: '41.04%', width: '10.50%', height: '1.68%' },
            { id: 'ai08', label: '', left: '65.87%', top: '41.34%', width: '7.71%',  height: '1.58%' },
            { id: 'ai09', label: '', left: '51.17%', top: '51.83%', width: '8.40%',  height: '2.18%' },
            { id: 'ai10', label: '', left: '51.59%', top: '54.20%', width: '7.56%',  height: '1.88%' },
            { id: 'ai11', label: '', left: '51.59%', top: '56.38%', width: '7.84%',  height: '1.78%' },
            { id: 'ai12', label: '', left: '51.45%', top: '58.76%', width: '7.84%',  height: '1.58%' },
            { id: 'ai13', label: '', left: '52.01%', top: '60.83%', width: '7.14%',  height: '1.39%' },
            { id: 'ai14', label: '', left: '51.73%', top: '62.81%', width: '7.56%',  height: '1.69%' },
            { id: 'ai15', label: '', left: '51.59%', top: '64.79%', width: '7.98%',  height: '2.08%' },
            { id: 'ai16', label: '', left: '62.51%', top: '52.03%', width: '7.42%',  height: '1.78%' },
            { id: 'ai17', label: '', left: '7.19%',  top: '74.20%', width: '50.14%', height: '2.0%' },
            { id: 'ai18', label: '', left: '7.19%',  top: '76.20%', width: '50.14%', height: '2.0%' },
            { id: 'ai19', label: '', left: '7.19%',  top: '78.40%', width: '50.14%', height: '2.0%' },
            { id: 'ai20', label: '', left: '7.19%',  top: '80.60%', width: '50.14%', height: '2.0%' },
            { id: 'ai21', label: '', left: '7.19%',  top: '82.60%', width: '50.14%', height: '2.0%' },
            { id: 'ai22', label: '', left: '62.79%', top: '74.30%', width: '7.98%',  height: '1.78%' },
            { id: 'ai23', label: '', left: '62.79%', top: '76.27%', width: '7.98%',  height: '2.08%' },
            { id: 'ai24', label: '', left: '62.79%', top: '78.60%', width: '7.98%',  height: '1.78%' },
            { id: 'ai25', label: '', left: '62.79%', top: '80.63%', width: '7.98%',  height: '1.88%' },
            { id: 'ai26', label: '', left: '62.79%', top: '82.71%', width: '7.98%',  height: '1.88%' },
            { id: 'ai27', label: '', left: '20.92%', top: '86.57%', width: '14.84%', height: '1.68%' },
            { id: 'ai28', label: '', left: '44.16%', top: '86.27%', width: '7.85%',  height: '2.08%' },
            { id: 'ai29', label: '', left: '60.97%', top: '86.27%', width: '5.88%',  height: '1.98%' },
            { id: 'ai30', label: '', left: '73.30%', top: '86.47%', width: '7.70%',  height: '1.98%' },
            { id: 'ai31', label: '', left: '76.94%', top: '52.12%', width: '19.33%', height: '1.29%' },
            { id: 'ai32', label: '', left: '75.96%', top: '56.08%', width: '2.94%',  height: '2.35%' },
            { id: 'ai33', label: '', left: '79.60%', top: '56.08%', width: '2.94%',  height: '2.35%' },
            { id: 'ai34', label: '', left: '83.10%', top: '56.08%', width: '2.94%',  height: '2.35%' },
            { id: 'ai35', label: '', left: '86.60%', top: '56.08%', width: '2.94%',  height: '2.35%' },
            { id: 'ai36', label: '', left: '90.10%', top: '56.08%', width: '2.94%',  height: '2.35%' },
            { id: 'ai37', label: '', left: '93.32%', top: '56.08%', width: '2.94%',  height: '2.35%' },
            { id: 'ai38', label: '', left: '76.38%', top: '60.24%', width: '2.94%',  height: '2.30%' },
            { id: 'ai39', label: '', left: '79.74%', top: '60.24%', width: '2.94%',  height: '2.30%' },
            { id: 'ai40', label: '', left: '83.36%', top: '60.24%', width: '3.00%',  height: '2.30%' },
            { id: 'ai41', label: '', left: '89.96%', top: '60.24%', width: '2.94%',  height: '2.30%' },
            { id: 'ai42', label: '', left: '75.96%', top: '64.79%', width: '2.94%',  height: '2.30%' },
            { id: 'ai43', label: '', left: '83.18%', top: '64.79%', width: '2.94%',  height: '2.30%' },
            { id: 'ai44', label: '', left: '86.74%', top: '64.79%', width: '2.94%',  height: '2.30%' },
            { id: 'ai45', label: '', left: '90.10%', top: '64.79%', width: '2.94%',  height: '2.30%' },
            { id: 'ai46', label: '', left: '93.20%', top: '64.79%', width: '2.94%',  height: '2.30%' },
            { id: 'ai47', label: '', left: '79.62%', top: '74.00%', width: '2.94%',  height: '2.30%' },
            { id: 'ai48', label: '', left: '83.18%', top: '74.09%', width: '2.94%',  height: '2.30%' },
            { id: 'ai49', label: '', left: '79.40%', top: '78.35%', width: '2.94%',  height: '2.30%' },
            { id: 'ai50', label: '', left: '83.10%', top: '78.35%', width: '2.94%',  height: '2.30%' },
            { id: 'ai51', label: '', left: '79.60%', top: '82.61%', width: '2.94%',  height: '2.30%' },
            { id: 'ai52', label: '', left: '82.82%', top: '82.61%', width: '2.94%',  height: '2.30%' }
        ]
    };

    /* ============================================================
       ★ GF527-2017 - 新增的 9 個格子（每 4 個座標一組）
       ------------------------------------------------------------
       對應原始座標：
         格子 1 → #1~#4
         格子 2 → #5~#8
         格子 3 → #9~#12
         格子 4 → #13~#16
         格子 5 → #17~#20
         格子 6 → #21~#24
         格子 7 → #25~#28
         格子 8 → #29~#32
         格子 9 → #33~#36
       ============================================================ */
    var GF527_2017_FORM_LAYOUT = {
        fields: [
            /* 格子 1 (#1~#4)   */ { id: 'g17_01', label: '', left: '5.57%',  top: '5.17%',  width: '2.57%',  height: '1.08%' },
            /* 格子 2 (#5~#8)   */ { id: 'g17_02', label: '', left: '9.16%',  top: '5.07%',  width: '2.88%',  height: '1.27%' },
            /* 格子 3 (#9~#12)  */ { id: 'g17_03', label: '', left: '16.80%', top: '5.00%',  width: '1.84%',  height: '1.44%' },
            /* 格子 4 (#13~#16) */ { id: 'g17_04', label: '', left: '19.03%', top: '5.00%',  width: '1.84%',  height: '1.26%' },
            /* 格子 5 (#17~#20) */ { id: 'g17_05', label: '', left: '35.30%', top: '5.17%',  width: '6.34%',  height: '1.44%' },
            /* 格子 6 (#21~#24) */ { id: 'g17_06', label: '', left: '50.22%', top: '4.80%',  width: '9.61%',  height: '1.81%' },
            /* 格子 7 (#25~#28) */ { id: 'g17_07', label: '', left: '66.88%', top: '4.71%',  width: '6.73%',  height: '2.09%' },
            /* 格子 8 (#29~#32) */ { id: 'g17_08', label: '', type: 'check', left: '76.15%', top: '4.31%', width: '0.83%', height: '1.00%' },
            /* 格子 9 (#33~#36) */ { id: 'g17_09', label: '', left: '39.0%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 9 (#33~#36) */ { id: 'g17_10', label: '', left: '40.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
                                   { id: 'g17_11', label: '', left: '42.00%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 12           */ { id: 'g17_12', label: '', left: '43.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 13           */ { id: 'g17_13', label: '', left: '45.00%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 14           */ { id: 'g17_14', label: '', left: '46.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 15           */ { id: 'g17_15', label: '', left: '48.00%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 16           */ { id: 'g17_16', label: '', left: '49.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 17           */ { id: 'g17_17', label: '', left: '51.10%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 18           */ { id: 'g17_18', label: '', left: '52.60%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 19           */ { id: 'g17_19', label: '', left: '54.10%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 20           */ { id: 'g17_20', label: '', left: '55.70%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 21           */ { id: 'g17_21', label: '', left: '57.20%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 22           */ { id: 'g17_22', label: '', left: '58.70%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 23           */ { id: 'g17_23', label: '', left: '60.20%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 24           */ { id: 'g17_24', label: '', left: '61.80%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 25           */ { id: 'g17_25', label: '', left: '63.30%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 26           */ { id: 'g17_26', label: '', left: '64.80%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 27           */ { id: 'g17_27', label: '', left: '66.30%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 28           */ { id: 'g17_28', label: '', left: '67.80%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 29           */ { id: 'g17_29', label: '', left: '69.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 30           */ { id: 'g17_30', label: '', left: '71.0%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 31           */ { id: 'g17_31', label: '', left: '72.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 32           */ { id: 'g17_32', label: '', left: '74.0%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 33           */ { id: 'g17_33', label: '', left: '75.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 34           */ { id: 'g17_34', label: '', left: '77.0%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 35           */ { id: 'g17_35', label: '', left: '78.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 36           */ { id: 'g17_36', label: '', left: '80.0%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 37           */ { id: 'g17_37', label: '', left: '81.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 38           */ { id: 'g17_38', label: '', left: '83.00%', top: '11.10%', width: '1.47%',  height: '1.26%' },
            /* 格子 39           */ { id: 'g17_39', label: '', left: '84.50%', top: '11.10%', width: '1.47%',  height: '1.26%' },
                                    { id: 'g17_40', label: '', left: '86.50%', top: '11.10%', width: '1.97%',  height: '1.26%' },
            /* 格子 39           */ { id: 'g17_41', label: '', left: '88.50%', top: '11.10%', width: '2.47%',  height: '1.26%' },
                                    { id: 'g17_42', label: '', left: '91.00%', top: '11.10%', width: '1.77%',  height: '1.26%' },
            /* 格子 39           */ { id: 'g17_43', label: '', left: '93.00%', top: '11.10%', width: '1.77%',  height: '1.26%' },
                                    { id: 'g17_44', label: '', left: '94.80%', top: '11.10%', width: '1.77%',  height: '1.26%' },
                                    { id: 'g17_45', label: '', left: '91.00%', top: '5.00%', width: '5.77%',  height: '1.26%' },
            /* 第二排（top 16.10%，即原 top + 5%）*/
            { id: 'g17_46', label: '', left: '39.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_47', label: '', left: '40.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_48', label: '', left: '42.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_49', label: '', left: '43.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_50', label: '', left: '45.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_51', label: '', left: '46.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_52', label: '', left: '48.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_53', label: '', left: '49.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_54', label: '', left: '51.10%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_55', label: '', left: '52.60%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_56', label: '', left: '54.10%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_57', label: '', left: '55.70%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_58', label: '', left: '57.20%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_59', label: '', left: '58.70%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_60', label: '', left: '60.20%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_61', label: '', left: '61.80%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_62', label: '', left: '63.30%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_63', label: '', left: '64.80%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_64', label: '', left: '66.30%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_65', label: '', left: '67.80%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_66', label: '', left: '69.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_67', label: '', left: '71.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_68', label: '', left: '72.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_69', label: '', left: '74.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_70', label: '', left: '75.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_71', label: '', left: '77.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_72', label: '', left: '78.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_73', label: '', left: '80.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_74', label: '', left: '81.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_75', label: '', left: '83.00%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_76', label: '', left: '84.50%', top: '14.10%', width: '1.47%', height: '3.26%' },
            { id: 'g17_77', label: '', left: '86.50%', top: '14.10%', width: '1.97%', height: '3.26%' },
            { id: 'g17_78', label: '', left: '88.50%', top: '14.10%', width: '2.47%', height: '3.26%' },
            { id: 'g17_79', label: '', left: '91.00%', top: '14.10%', width: '1.77%', height: '3.26%' },
            { id: 'g17_80', label: '', left: '93.00%', top: '14.10%', width: '1.77%', height: '3.26%' },
            { id: 'g17_81', label: '', left: '94.80%', top: '14.10%', width: '1.77%', height: '3.26%' },
            /* 第三排（top 21.10%，即原 top + 10%）*/
            { id: 'g17_82', label: '', left: '39.00%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_83', label: '', left: '40.50%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_84', label: '', left: '42.00%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_85', label: '', left: '43.50%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_86', label: '', left: '45.00%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_87', label: '', left: '46.50%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_88', label: '', left: '48.00%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_89', label: '', left: '49.50%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_90', label: '', left: '51.10%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_91', label: '', left: '52.60%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_92', label: '', left: '54.10%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_93', label: '', left: '55.70%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_94', label: '', left: '57.20%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_95', label: '', left: '58.70%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_96', label: '', left: '60.20%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_97', label: '', left: '61.80%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_98', label: '', left: '63.30%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_99', label: '', left: '64.80%', top: '19.40%', width: '1.47%', height: '2.76%' },
            { id: 'g17_100', label: '', left: '66.30%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_101', label: '', left: '67.80%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_102', label: '', left: '69.50%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_103', label: '', left: '71.00%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_104', label: '', left: '72.50%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_105', label: '', left: '74.00%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_106', label: '', left: '75.50%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_107', label: '', left: '77.00%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_108', label: '', left: '78.50%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_109', label: '', left: '80.00%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_110', label: '', left: '81.50%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_111', label: '', left: '83.00%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_112', label: '', left: '84.50%', top: '19.70%', width: '1.47%', height: '2.76%' },
            { id: 'g17_113', label: '', left: '86.50%', top: '19.70%', width: '1.97%', height: '2.76%' },
            { id: 'g17_114', label: '', left: '88.50%', top: '19.70%', width: '2.47%', height: '2.76%' },
            { id: 'g17_115', label: '', left: '91.00%', top: '19.70%', width: '1.77%', height: '2.76%' },
            { id: 'g17_116', label: '', left: '93.00%', top: '19.70%', width: '1.77%', height: '2.76%' },
            { id: 'g17_117', label: '', left: '94.80%', top: '19.70%', width: '1.77%', height: '2.76%' },
            /* 第四排（top 26.10% = 原 11.10% + 15%）*/
            { id: 'g17_118', label: '', left: '39.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_119', label: '', left: '40.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_120', label: '', left: '42.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_121', label: '', left: '43.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_122', label: '', left: '45.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_123', label: '', left: '46.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_124', label: '', left: '48.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_125', label: '', left: '49.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_126', label: '', left: '51.10%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_127', label: '', left: '52.60%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_128', label: '', left: '54.10%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_129', label: '', left: '55.70%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_130', label: '', left: '57.20%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_131', label: '', left: '58.70%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_132', label: '', left: '60.20%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_133', label: '', left: '61.80%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_134', label: '', left: '63.30%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_135', label: '', left: '64.80%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_136', label: '', left: '66.30%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_137', label: '', left: '67.80%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_138', label: '', left: '69.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_139', label: '', left: '71.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_140', label: '', left: '72.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_141', label: '', left: '74.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_142', label: '', left: '75.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_143', label: '', left: '77.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_144', label: '', left: '78.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_145', label: '', left: '80.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_146', label: '', left: '81.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_147', label: '', left: '83.00%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_148', label: '', left: '84.50%', top: '26.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_149', label: '', left: '86.50%', top: '26.10%', width: '1.97%', height: '1.26%' },
            { id: 'g17_150', label: '', left: '88.50%', top: '26.10%', width: '2.47%', height: '1.26%' },
            { id: 'g17_151', label: '', left: '91.00%', top: '26.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_152', label: '', left: '93.00%', top: '26.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_153', label: '', left: '94.80%', top: '26.10%', width: '1.77%', height: '1.26%' },
            /* 第五排（top 23.10% = 原 11.10% + 12%）*/
            { id: 'g17_154', label: '', left: '39.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_155', label: '', left: '40.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_156', label: '', left: '42.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_157', label: '', left: '43.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_158', label: '', left: '45.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_159', label: '', left: '46.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_160', label: '', left: '48.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_161', label: '', left: '49.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_162', label: '', left: '51.10%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_163', label: '', left: '52.60%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_164', label: '', left: '54.10%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_165', label: '', left: '55.70%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_166', label: '', left: '57.20%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_167', label: '', left: '58.70%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_168', label: '', left: '60.20%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_169', label: '', left: '61.80%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_170', label: '', left: '63.30%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_171', label: '', left: '64.80%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_172', label: '', left: '66.30%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_173', label: '', left: '67.80%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_174', label: '', left: '69.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_175', label: '', left: '71.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_176', label: '', left: '72.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_177', label: '', left: '74.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_178', label: '', left: '75.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_179', label: '', left: '77.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_180', label: '', left: '78.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_181', label: '', left: '80.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_182', label: '', left: '81.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_183', label: '', left: '83.00%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_184', label: '', left: '84.50%', top: '22.30%', width: '1.47%', height: '1.26%' },
            { id: 'g17_185', label: '', left: '86.50%', top: '22.30%', width: '1.97%', height: '1.26%' },
            { id: 'g17_186', label: '', left: '88.50%', top: '22.30%', width: '2.47%', height: '1.26%' },
            { id: 'g17_187', label: '', left: '91.00%', top: '22.30%', width: '1.77%', height: '1.26%' },
            { id: 'g17_188', label: '', left: '93.00%', top: '22.30%', width: '1.77%', height: '1.26%' },
            { id: 'g17_189', label: '', left: '94.80%', top: '22.30%', width: '1.77%', height: '1.26%' },
            /* 新一排（top 24.10% = 原 11.10% + 13%）*/
            { id: 'g17_190', label: '', left: '39.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_191', label: '', left: '40.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_192', label: '', left: '42.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_193', label: '', left: '43.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_194', label: '', left: '45.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_195', label: '', left: '46.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_196', label: '', left: '48.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_197', label: '', left: '49.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_198', label: '', left: '51.10%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_199', label: '', left: '52.60%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_200', label: '', left: '54.10%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_201', label: '', left: '55.70%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_202', label: '', left: '57.20%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_203', label: '', left: '58.70%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_204', label: '', left: '60.20%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_205', label: '', left: '61.80%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_206', label: '', left: '63.30%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_207', label: '', left: '64.80%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_208', label: '', left: '66.30%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_209', label: '', left: '67.80%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_210', label: '', left: '69.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_211', label: '', left: '71.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_212', label: '', left: '72.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_213', label: '', left: '74.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_214', label: '', left: '75.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_215', label: '', left: '77.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_216', label: '', left: '78.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_217', label: '', left: '80.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_218', label: '', left: '81.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_219', label: '', left: '83.00%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_220', label: '', left: '84.50%', top: '23.8%', width: '1.47%', height: '1.26%' },
            { id: 'g17_221', label: '', left: '86.50%', top: '23.8%', width: '1.97%', height: '1.26%' },
            { id: 'g17_222', label: '', left: '88.50%', top: '23.8%', width: '2.47%', height: '1.26%' },
            { id: 'g17_223', label: '', left: '91.00%', top: '23.8%', width: '1.77%', height: '1.26%' },
            { id: 'g17_224', label: '', left: '93.00%', top: '23.8%', width: '1.77%', height: '1.26%' },
            { id: 'g17_225', label: '', left: '94.80%', top: '23.8%', width: '1.77%', height: '1.26%' },
            /* 新一排（top 31.10% = 原 11.10% + 20%）*/
            { id: 'g17_226', label: '', left: '39.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_227', label: '', left: '40.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_228', label: '', left: '42.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_229', label: '', left: '43.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_230', label: '', left: '45.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_231', label: '', left: '46.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_232', label: '', left: '48.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_233', label: '', left: '49.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_234', label: '', left: '51.10%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_235', label: '', left: '52.60%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_236', label: '', left: '54.10%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_237', label: '', left: '55.70%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_238', label: '', left: '57.20%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_239', label: '', left: '58.70%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_240', label: '', left: '60.20%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_241', label: '', left: '61.80%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_242', label: '', left: '63.30%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_243', label: '', left: '64.80%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_244', label: '', left: '66.30%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_245', label: '', left: '67.80%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_246', label: '', left: '69.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_247', label: '', left: '71.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_248', label: '', left: '72.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_249', label: '', left: '74.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_250', label: '', left: '75.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_251', label: '', left: '77.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_252', label: '', left: '78.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_253', label: '', left: '80.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_254', label: '', left: '81.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_255', label: '', left: '83.00%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_256', label: '', left: '84.50%', top: '28.80%', width: '1.47%', height: '1.26%' },
            { id: 'g17_257', label: '', left: '86.50%', top: '28.80%', width: '1.97%', height: '1.26%' },
            { id: 'g17_258', label: '', left: '88.50%', top: '28.80%', width: '2.47%', height: '1.26%' },
            { id: 'g17_259', label: '', left: '91.00%', top: '28.80%', width: '1.77%', height: '1.26%' },
            { id: 'g17_260', label: '', left: '93.00%', top: '28.80%', width: '1.77%', height: '1.26%' },
            { id: 'g17_261', label: '', left: '94.80%', top: '28.80%', width: '1.77%', height: '1.26%' },
            /* 新一排（top 31.10%，與上一排同高度）*/
            { id: 'g17_262', label: '', left: '39.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_263', label: '', left: '40.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_264', label: '', left: '42.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_265', label: '', left: '43.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_266', label: '', left: '45.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_267', label: '', left: '46.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_268', label: '', left: '48.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_269', label: '', left: '49.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_270', label: '', left: '51.10%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_271', label: '', left: '52.60%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_272', label: '', left: '54.10%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_273', label: '', left: '55.70%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_274', label: '', left: '57.20%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_275', label: '', left: '58.70%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_276', label: '', left: '60.20%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_277', label: '', left: '61.80%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_278', label: '', left: '63.30%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_279', label: '', left: '64.80%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_280', label: '', left: '66.30%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_281', label: '', left: '67.80%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_282', label: '', left: '69.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_283', label: '', left: '71.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_284', label: '', left: '72.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_285', label: '', left: '74.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_286', label: '', left: '75.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_287', label: '', left: '77.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_288', label: '', left: '78.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_289', label: '', left: '80.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_290', label: '', left: '81.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_291', label: '', left: '83.00%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_292', label: '', left: '84.50%', top: '31.70%', width: '1.47%', height: '3.26%' },
            { id: 'g17_293', label: '', left: '86.50%', top: '31.70%', width: '1.97%', height: '3.26%' },
            { id: 'g17_294', label: '', left: '88.50%', top: '31.70%', width: '2.47%', height: '3.26%' },
            { id: 'g17_295', label: '', left: '91.00%', top: '31.70%', width: '1.77%', height: '3.26%' },
            { id: 'g17_296', label: '', left: '93.00%', top: '31.70%', width: '1.77%', height: '3.26%' },
            { id: 'g17_297', label: '', left: '94.80%', top: '31.70%', width: '1.77%', height: '3.26%' },
            /* 新一排（top 32.10%）*/
            { id: 'g17_298', label: '', left: '39.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_299', label: '', left: '40.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_300', label: '', left: '42.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_301', label: '', left: '43.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_302', label: '', left: '45.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_303', label: '', left: '46.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_304', label: '', left: '48.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_305', label: '', left: '49.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_306', label: '', left: '51.10%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_307', label: '', left: '52.60%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_308', label: '', left: '54.10%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_309', label: '', left: '55.70%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_310', label: '', left: '57.20%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_311', label: '', left: '58.70%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_312', label: '', left: '60.20%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_313', label: '', left: '61.80%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_314', label: '', left: '63.30%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_315', label: '', left: '64.80%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_316', label: '', left: '66.30%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_317', label: '', left: '67.80%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_318', label: '', left: '69.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_319', label: '', left: '71.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_320', label: '', left: '72.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_321', label: '', left: '74.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_322', label: '', left: '75.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_323', label: '', left: '77.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_324', label: '', left: '78.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_325', label: '', left: '80.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_326', label: '', left: '81.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_327', label: '', left: '83.00%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_328', label: '', left: '84.50%', top: '38.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_329', label: '', left: '86.50%', top: '38.10%', width: '1.97%', height: '1.26%' },
            { id: 'g17_330', label: '', left: '88.50%', top: '38.10%', width: '2.47%', height: '1.26%' },
            { id: 'g17_331', label: '', left: '91.00%', top: '38.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_332', label: '', left: '93.00%', top: '38.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_333', label: '', left: '94.80%', top: '38.10%', width: '1.77%', height: '1.26%' },
            /* 新一排（top 50.00%）*/
            { id: 'g17_334', label: '', left: '39.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_335', label: '', left: '40.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_336', label: '', left: '42.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_337', label: '', left: '43.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_338', label: '', left: '45.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_339', label: '', left: '46.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_340', label: '', left: '48.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_341', label: '', left: '49.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_342', label: '', left: '51.10%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_343', label: '', left: '52.60%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_344', label: '', left: '54.10%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_345', label: '', left: '55.70%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_346', label: '', left: '57.20%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_347', label: '', left: '58.70%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_348', label: '', left: '60.20%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_349', label: '', left: '61.80%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_350', label: '', left: '63.30%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_351', label: '', left: '64.80%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_352', label: '', left: '66.30%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_353', label: '', left: '67.80%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_354', label: '', left: '69.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_355', label: '', left: '71.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_356', label: '', left: '72.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_357', label: '', left: '74.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_358', label: '', left: '75.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_359', label: '', left: '77.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_360', label: '', left: '78.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_361', label: '', left: '80.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_362', label: '', left: '81.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_363', label: '', left: '83.00%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_364', label: '', left: '84.50%', top: '48.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_365', label: '', left: '86.50%', top: '48.00%', width: '1.97%', height: '5.26%' },
            { id: 'g17_366', label: '', left: '88.50%', top: '48.00%', width: '2.47%', height: '5.26%' },
            { id: 'g17_367', label: '', left: '91.00%', top: '48.00%', width: '1.77%', height: '5.26%' },
            { id: 'g17_368', label: '', left: '93.00%', top: '48.00%', width: '1.77%', height: '5.26%' },
            { id: 'g17_369', label: '', left: '94.80%', top: '48.00%', width: '1.77%', height: '5.26%' },
            /* 新一排（top 60.00%）*/
            { id: 'g17_370', label: '', left: '39.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_371', label: '', left: '40.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_372', label: '', left: '42.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_373', label: '', left: '43.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_374', label: '', left: '45.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_375', label: '', left: '46.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_376', label: '', left: '48.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_377', label: '', left: '49.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_378', label: '', left: '51.10%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_379', label: '', left: '52.60%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_380', label: '', left: '54.10%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_381', label: '', left: '55.70%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_382', label: '', left: '57.20%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_383', label: '', left: '58.70%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_384', label: '', left: '60.20%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_385', label: '', left: '61.80%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_386', label: '', left: '63.30%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_387', label: '', left: '64.80%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_388', label: '', left: '66.30%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_389', label: '', left: '67.80%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_390', label: '', left: '69.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_391', label: '', left: '71.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_392', label: '', left: '72.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_393', label: '', left: '74.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_394', label: '', left: '75.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_395', label: '', left: '77.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_396', label: '', left: '78.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_397', label: '', left: '80.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_398', label: '', left: '81.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_399', label: '', left: '83.00%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_400', label: '', left: '84.50%', top: '61.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_401', label: '', left: '86.50%', top: '61.00%', width: '1.97%', height: '3.26%' },
            { id: 'g17_402', label: '', left: '88.50%', top: '61.00%', width: '2.47%', height: '3.26%' },
            { id: 'g17_403', label: '', left: '91.00%', top: '61.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_404', label: '', left: '93.00%', top: '61.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_405', label: '', left: '94.80%', top: '61.00%', width: '1.77%', height: '3.26%' },
            /* 新一排（top 63.00%）*/
            { id: 'g17_406', label: '', left: '39.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_407', label: '', left: '40.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_408', label: '', left: '42.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_409', label: '', left: '43.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_410', label: '', left: '45.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_411', label: '', left: '46.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_412', label: '', left: '48.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_413', label: '', left: '49.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_414', label: '', left: '51.10%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_415', label: '', left: '52.60%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_416', label: '', left: '54.10%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_417', label: '', left: '55.70%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_418', label: '', left: '57.20%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_419', label: '', left: '58.70%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_420', label: '', left: '60.20%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_421', label: '', left: '61.80%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_422', label: '', left: '63.30%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_423', label: '', left: '64.80%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_424', label: '', left: '66.30%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_425', label: '', left: '67.80%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_426', label: '', left: '69.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_427', label: '', left: '71.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_428', label: '', left: '72.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_429', label: '', left: '74.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_430', label: '', left: '75.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_431', label: '', left: '77.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_432', label: '', left: '78.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_433', label: '', left: '80.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_434', label: '', left: '81.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_435', label: '', left: '83.00%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_436', label: '', left: '84.50%', top: '66.00%', width: '1.47%', height: '2.26%' },
            { id: 'g17_437', label: '', left: '86.50%', top: '66.00%', width: '1.97%', height: '2.26%' },
            { id: 'g17_438', label: '', left: '88.50%', top: '66.00%', width: '2.47%', height: '2.26%' },
            { id: 'g17_439', label: '', left: '91.00%', top: '66.00%', width: '1.77%', height: '2.26%' },
            { id: 'g17_440', label: '', left: '93.00%', top: '66.00%', width: '1.77%', height: '2.26%' },
            { id: 'g17_441', label: '', left: '94.80%', top: '66.00%', width: '1.77%', height: '2.26%' },
            /* 新一排（top 71.00%）*/
            { id: 'g17_442', label: '', left: '39.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_443', label: '', left: '40.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_444', label: '', left: '42.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_445', label: '', left: '43.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_446', label: '', left: '45.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_447', label: '', left: '46.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_448', label: '', left: '48.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_449', label: '', left: '49.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_450', label: '', left: '51.10%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_451', label: '', left: '52.60%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_452', label: '', left: '54.10%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_453', label: '', left: '55.70%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_454', label: '', left: '57.20%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_455', label: '', left: '58.70%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_456', label: '', left: '60.20%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_457', label: '', left: '61.80%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_458', label: '', left: '63.30%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_459', label: '', left: '64.80%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_460', label: '', left: '66.30%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_461', label: '', left: '67.80%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_462', label: '', left: '69.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_463', label: '', left: '71.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_464', label: '', left: '72.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_465', label: '', left: '74.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_466', label: '', left: '75.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_467', label: '', left: '77.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_468', label: '', left: '78.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_469', label: '', left: '80.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_470', label: '', left: '81.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_471', label: '', left: '83.00%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_472', label: '', left: '84.50%', top: '72.00%', width: '1.47%', height: '5.26%' },
            { id: 'g17_473', label: '', left: '86.50%', top: '72.00%', width: '1.97%', height: '5.26%' },
            { id: 'g17_474', label: '', left: '88.50%', top: '72.00%', width: '2.47%', height: '5.26%' },
            { id: 'g17_475', label: '', left: '91.00%', top: '72.00%', width: '1.77%', height: '5.26%' },
            { id: 'g17_476', label: '', left: '93.00%', top: '72.00%', width: '1.77%', height: '5.26%' },
            { id: 'g17_477', label: '', left: '94.80%', top: '72.00%', width: '1.77%', height: '5.26%' },
            /* 新一排（top 77.00%）*/
            { id: 'g17_478', label: '', left: '39.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_479', label: '', left: '40.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_480', label: '', left: '42.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_481', label: '', left: '43.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_482', label: '', left: '45.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_483', label: '', left: '46.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_484', label: '', left: '48.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_485', label: '', left: '49.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_486', label: '', left: '51.10%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_487', label: '', left: '52.60%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_488', label: '', left: '54.10%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_489', label: '', left: '55.70%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_490', label: '', left: '57.20%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_491', label: '', left: '58.70%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_492', label: '', left: '60.20%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_493', label: '', left: '61.80%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_494', label: '', left: '63.30%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_495', label: '', left: '64.80%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_496', label: '', left: '66.30%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_497', label: '', left: '67.80%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_498', label: '', left: '69.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_499', label: '', left: '71.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_500', label: '', left: '72.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_501', label: '', left: '74.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_502', label: '', left: '75.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_503', label: '', left: '77.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_504', label: '', left: '78.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_505', label: '', left: '80.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_506', label: '', left: '81.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_507', label: '', left: '83.00%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_508', label: '', left: '84.50%', top: '81.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_509', label: '', left: '86.50%', top: '81.50%', width: '1.97%', height: '1.26%' },
            { id: 'g17_510', label: '', left: '88.50%', top: '81.50%', width: '2.47%', height: '1.26%' },
            { id: 'g17_511', label: '', left: '91.00%', top: '81.50%', width: '1.77%', height: '1.26%' },
            { id: 'g17_512', label: '', left: '93.00%', top: '81.50%', width: '1.77%', height: '1.26%' },
            { id: 'g17_513', label: '', left: '94.80%', top: '81.50%', width: '1.77%', height: '1.26%' },
            /* 新一排（top 84.00%）*/
            { id: 'g17_514', label: '', left: '39.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_515', label: '', left: '40.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_516', label: '', left: '42.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_517', label: '', left: '43.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_518', label: '', left: '45.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_519', label: '', left: '46.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_520', label: '', left: '48.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_521', label: '', left: '49.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_522', label: '', left: '51.10%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_523', label: '', left: '52.60%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_524', label: '', left: '54.10%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_525', label: '', left: '55.70%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_526', label: '', left: '57.20%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_527', label: '', left: '58.70%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_528', label: '', left: '60.20%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_529', label: '', left: '61.80%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_530', label: '', left: '63.30%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_531', label: '', left: '64.80%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_532', label: '', left: '66.30%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_533', label: '', left: '67.80%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_534', label: '', left: '69.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_535', label: '', left: '71.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_536', label: '', left: '72.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_537', label: '', left: '74.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_538', label: '', left: '75.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_539', label: '', left: '77.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_540', label: '', left: '78.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_541', label: '', left: '80.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_542', label: '', left: '81.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_543', label: '', left: '83.00%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_544', label: '', left: '84.50%', top: '83.50%', width: '1.47%', height: '1.26%' },
            { id: 'g17_545', label: '', left: '86.50%', top: '83.50%', width: '1.97%', height: '1.26%' },
            { id: 'g17_546', label: '', left: '88.50%', top: '83.50%', width: '2.47%', height: '1.26%' },
            { id: 'g17_547', label: '', left: '91.00%', top: '83.50%', width: '1.77%', height: '1.26%' },
            { id: 'g17_548', label: '', left: '93.00%', top: '83.50%', width: '1.77%', height: '1.26%' },
            { id: 'g17_549', label: '', left: '94.80%', top: '83.50%', width: '1.77%', height: '1.26%' },
            /* 新一排（top 87.00%）*/
            { id: 'g17_550', label: '', left: '39.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_551', label: '', left: '40.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_552', label: '', left: '42.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_553', label: '', left: '43.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_554', label: '', left: '45.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_555', label: '', left: '46.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_556', label: '', left: '48.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_557', label: '', left: '49.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_558', label: '', left: '51.10%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_559', label: '', left: '52.60%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_560', label: '', left: '54.10%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_561', label: '', left: '55.70%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_562', label: '', left: '57.20%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_563', label: '', left: '58.70%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_564', label: '', left: '60.20%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_565', label: '', left: '61.80%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_566', label: '', left: '63.30%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_567', label: '', left: '64.80%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_568', label: '', left: '66.30%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_569', label: '', left: '67.80%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_570', label: '', left: '69.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_571', label: '', left: '71.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_572', label: '', left: '72.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_573', label: '', left: '74.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_574', label: '', left: '75.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_575', label: '', left: '77.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_576', label: '', left: '78.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_577', label: '', left: '80.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_578', label: '', left: '81.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_579', label: '', left: '83.00%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_580', label: '', left: '84.50%', top: '86.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_581', label: '', left: '86.50%', top: '86.00%', width: '1.97%', height: '3.26%' },
            { id: 'g17_582', label: '', left: '88.50%', top: '86.00%', width: '2.47%', height: '3.26%' },
            { id: 'g17_583', label: '', left: '91.00%', top: '86.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_584', label: '', left: '93.00%', top: '86.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_585', label: '', left: '94.80%', top: '86.00%', width: '1.77%', height: '3.26%' },
            /* 新一排（top 90.00%）*/
            { id: 'g17_586', label: '', left: '39.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_587', label: '', left: '40.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_588', label: '', left: '42.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_589', label: '', left: '43.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_590', label: '', left: '45.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_591', label: '', left: '46.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_592', label: '', left: '48.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_593', label: '', left: '49.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_594', label: '', left: '51.10%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_595', label: '', left: '52.60%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_596', label: '', left: '54.10%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_597', label: '', left: '55.70%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_598', label: '', left: '57.20%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_599', label: '', left: '58.70%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_600', label: '', left: '60.20%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_601', label: '', left: '61.80%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_602', label: '', left: '63.30%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_603', label: '', left: '64.80%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_604', label: '', left: '66.30%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_605', label: '', left: '67.80%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_606', label: '', left: '69.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_607', label: '', left: '71.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_608', label: '', left: '72.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_609', label: '', left: '74.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_610', label: '', left: '75.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_611', label: '', left: '77.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_612', label: '', left: '78.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_613', label: '', left: '80.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_614', label: '', left: '81.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_615', label: '', left: '83.00%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_616', label: '', left: '84.50%', top: '91.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_617', label: '', left: '86.50%', top: '91.00%', width: '1.97%', height: '3.26%' },
            { id: 'g17_618', label: '', left: '88.50%', top: '91.00%', width: '2.47%', height: '3.26%' },
            { id: 'g17_619', label: '', left: '91.00%', top: '91.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_620', label: '', left: '93.00%', top: '91.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_621', label: '', left: '94.80%', top: '91.00%', width: '1.77%', height: '3.26%' },

        ]  

    };

        /* ============================================================
       ★ GF527-2017 - 第 3 頁專用格子（g17_622 ~ g17_657）
       ------------------------------------------------------------
       座標參考 g17_46 ~ g17_81（第 1 頁第二排），位置完全相同
       top: 14.10%，height: 3.26%
       ============================================================ */
    var GF527_2017_PAGE3_FORM_LAYOUT = {
        fields: [
            { id: 'g17_622', label: '', left: '39.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_623', label: '', left: '40.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_624', label: '', left: '42.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_625', label: '', left: '43.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_626', label: '', left: '45.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_627', label: '', left: '46.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_628', label: '', left: '48.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_629', label: '', left: '49.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_630', label: '', left: '51.10%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_631', label: '', left: '52.60%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_632', label: '', left: '54.10%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_633', label: '', left: '55.70%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_634', label: '', left: '57.20%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_635', label: '', left: '58.70%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_636', label: '', left: '60.20%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_637', label: '', left: '61.80%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_638', label: '', left: '63.30%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_639', label: '', left: '64.80%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_640', label: '', left: '66.30%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_641', label: '', left: '67.80%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_642', label: '', left: '69.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_643', label: '', left: '71.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_644', label: '', left: '72.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_645', label: '', left: '74.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_646', label: '', left: '75.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_647', label: '', left: '77.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_648', label: '', left: '78.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_649', label: '', left: '80.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_650', label: '', left: '81.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_651', label: '', left: '83.00%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_652', label: '', left: '84.50%', top: '14.20%', width: '1.47%', height: '3.26%' },
            { id: 'g17_653', label: '', left: '86.50%', top: '14.20%', width: '1.97%', height: '3.26%' },
            { id: 'g17_654', label: '', left: '88.50%', top: '14.20%', width: '2.47%', height: '3.26%' },
            { id: 'g17_655', label: '', left: '91.00%', top: '14.20%', width: '1.77%', height: '3.26%' },
            { id: 'g17_656', label: '', left: '93.00%', top: '14.20%', width: '1.77%', height: '3.26%' },
            { id: 'g17_657', label: '', left: '94.80%', top: '14.20%', width: '1.77%', height: '3.26%' },
                        /* 新一排（top 5.00%）*/
            { id: 'g17_658', label: '', left: '39.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_659', label: '', left: '40.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_660', label: '', left: '42.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_661', label: '', left: '43.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_662', label: '', left: '45.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_663', label: '', left: '46.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_664', label: '', left: '48.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_665', label: '', left: '49.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_666', label: '', left: '51.10%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_667', label: '', left: '52.60%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_668', label: '', left: '54.10%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_669', label: '', left: '55.70%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_670', label: '', left: '57.20%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_671', label: '', left: '58.70%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_672', label: '', left: '60.20%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_673', label: '', left: '61.80%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_674', label: '', left: '63.30%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_675', label: '', left: '64.80%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_676', label: '', left: '66.30%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_677', label: '', left: '67.80%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_678', label: '', left: '69.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_679', label: '', left: '71.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_680', label: '', left: '72.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_681', label: '', left: '74.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_682', label: '', left: '75.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_683', label: '', left: '77.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_684', label: '', left: '78.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_685', label: '', left: '80.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_686', label: '', left: '81.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_687', label: '', left: '83.00%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_688', label: '', left: '84.50%', top: '5.00%', width: '1.47%', height: '3.26%' },
            { id: 'g17_689', label: '', left: '86.50%', top: '5.00%', width: '1.97%', height: '3.26%' },
            { id: 'g17_690', label: '', left: '88.50%', top: '5.00%', width: '2.47%', height: '3.26%' },
            { id: 'g17_691', label: '', left: '91.00%', top: '5.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_692', label: '', left: '93.00%', top: '5.00%', width: '1.77%', height: '3.26%' },
            { id: 'g17_693', label: '', left: '94.80%', top: '5.00%', width: '1.77%', height: '3.26%' },
            /* 新一排（top 8.00%, height 1.50%）*/
            { id: 'g17_694', label: '', left: '39.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_695', label: '', left: '40.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_696', label: '', left: '42.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_697', label: '', left: '43.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_698', label: '', left: '45.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_699', label: '', left: '46.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_700', label: '', left: '48.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_701', label: '', left: '49.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_702', label: '', left: '51.10%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_703', label: '', left: '52.60%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_704', label: '', left: '54.10%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_705', label: '', left: '55.70%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_706', label: '', left: '57.20%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_707', label: '', left: '58.70%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_708', label: '', left: '60.20%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_709', label: '', left: '61.80%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_710', label: '', left: '63.30%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_711', label: '', left: '64.80%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_712', label: '', left: '66.30%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_713', label: '', left: '67.80%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_714', label: '', left: '69.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_715', label: '', left: '71.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_716', label: '', left: '72.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_717', label: '', left: '74.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_718', label: '', left: '75.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_719', label: '', left: '77.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_720', label: '', left: '78.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_721', label: '', left: '80.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_722', label: '', left: '81.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_723', label: '', left: '83.00%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_724', label: '', left: '84.50%', top: '9.20%', width: '1.47%', height: '1.50%' },
            { id: 'g17_725', label: '', left: '86.50%', top: '9.20%', width: '1.97%', height: '1.50%' },
            { id: 'g17_726', label: '', left: '88.50%', top: '9.20%', width: '2.47%', height: '1.50%' },
            { id: 'g17_727', label: '', left: '91.00%', top: '9.20%', width: '1.77%', height: '1.50%' },
            { id: 'g17_728', label: '', left: '93.00%', top: '9.20%', width: '1.77%', height: '1.50%' },
            { id: 'g17_729', label: '', left: '94.80%', top: '9.20%', width: '1.77%', height: '1.50%' },
            /* 新一排（top 10.50%, height 2.50%）*/
            { id: 'g17_729', label: '', left: '39.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_730', label: '', left: '40.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_731', label: '', left: '42.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_732', label: '', left: '43.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_733', label: '', left: '45.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_734', label: '', left: '46.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_735', label: '', left: '48.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_736', label: '', left: '49.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_737', label: '', left: '51.10%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_738', label: '', left: '52.60%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_739', label: '', left: '54.10%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_740', label: '', left: '55.70%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_741', label: '', left: '57.20%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_742', label: '', left: '58.70%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_743', label: '', left: '60.20%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_744', label: '', left: '61.80%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_745', label: '', left: '63.30%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_746', label: '', left: '64.80%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_747', label: '', left: '66.30%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_748', label: '', left: '67.80%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_749', label: '', left: '69.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_750', label: '', left: '71.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_751', label: '', left: '72.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_752', label: '', left: '74.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_753', label: '', left: '75.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_754', label: '', left: '77.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_755', label: '', left: '78.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_756', label: '', left: '80.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_757', label: '', left: '81.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_758', label: '', left: '83.00%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_759', label: '', left: '84.50%', top: '11.20%', width: '1.47%', height: '2.50%' },
            { id: 'g17_760', label: '', left: '86.50%', top: '11.20%', width: '1.97%', height: '2.50%' },
            { id: 'g17_761', label: '', left: '88.50%', top: '11.20%', width: '2.47%', height: '2.50%' },
            { id: 'g17_762', label: '', left: '91.00%', top: '11.20%', width: '1.77%', height: '2.50%' },
            { id: 'g17_763', label: '', left: '93.00%', top: '11.20%', width: '1.77%', height: '2.50%' },
            { id: 'g17_764', label: '', left: '94.80%', top: '11.20%', width: '1.77%', height: '2.50%' },
            /* 新一排（top 16.00%, height 3.50%）*/
            { id: 'g17_764', label: '', left: '39.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_765', label: '', left: '40.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_766', label: '', left: '42.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_767', label: '', left: '43.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_768', label: '', left: '45.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_769', label: '', left: '46.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_770', label: '', left: '48.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_771', label: '', left: '49.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_772', label: '', left: '51.10%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_773', label: '', left: '52.60%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_774', label: '', left: '54.10%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_775', label: '', left: '55.70%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_776', label: '', left: '57.20%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_777', label: '', left: '58.70%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_778', label: '', left: '60.20%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_779', label: '', left: '61.80%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_780', label: '', left: '63.30%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_781', label: '', left: '64.80%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_782', label: '', left: '66.30%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_783', label: '', left: '67.80%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_784', label: '', left: '69.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_785', label: '', left: '71.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_786', label: '', left: '72.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_787', label: '', left: '74.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_788', label: '', left: '75.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_789', label: '', left: '77.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_790', label: '', left: '78.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_791', label: '', left: '80.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_792', label: '', left: '81.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_793', label: '', left: '83.00%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_794', label: '', left: '84.50%', top: '19.00%', width: '1.47%', height: '3.50%' },
            { id: 'g17_795', label: '', left: '86.50%', top: '19.00%', width: '1.97%', height: '3.50%' },
            { id: 'g17_796', label: '', left: '88.50%', top: '19.00%', width: '2.47%', height: '3.50%' },
            { id: 'g17_797', label: '', left: '91.00%', top: '19.00%', width: '1.77%', height: '3.50%' },
            { id: 'g17_798', label: '', left: '93.00%', top: '19.00%', width: '1.77%', height: '3.50%' },
            { id: 'g17_799', label: '', left: '94.80%', top: '19.00%', width: '1.77%', height: '3.50%' },
            /* 新一排（top 20.00%, height 1.50%）*/
            { id: 'g17_800', label: '', left: '39.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_801', label: '', left: '40.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_802', label: '', left: '42.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_803', label: '', left: '43.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_804', label: '', left: '45.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_805', label: '', left: '46.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_806', label: '', left: '48.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_807', label: '', left: '49.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_808', label: '', left: '51.10%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_809', label: '', left: '52.60%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_810', label: '', left: '54.10%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_811', label: '', left: '55.70%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_812', label: '', left: '57.20%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_813', label: '', left: '58.70%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_814', label: '', left: '60.20%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_815', label: '', left: '61.80%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_816', label: '', left: '63.30%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_817', label: '', left: '64.80%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_818', label: '', left: '66.30%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_819', label: '', left: '67.80%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_820', label: '', left: '69.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_821', label: '', left: '71.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_822', label: '', left: '72.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_823', label: '', left: '74.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_824', label: '', left: '75.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_825', label: '', left: '77.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_826', label: '', left: '78.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_827', label: '', left: '80.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_828', label: '', left: '81.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_829', label: '', left: '83.00%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_830', label: '', left: '84.50%', top: '23.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_831', label: '', left: '86.50%', top: '23.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_832', label: '', left: '88.50%', top: '23.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_833', label: '', left: '91.00%', top: '23.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_834', label: '', left: '93.00%', top: '23.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_835', label: '', left: '94.80%', top: '23.00%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 24.50%, height 1.50%）*/
            { id: 'g17_836', label: '', left: '39.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_837', label: '', left: '40.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_838', label: '', left: '42.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_839', label: '', left: '43.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_840', label: '', left: '45.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_841', label: '', left: '46.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_842', label: '', left: '48.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_843', label: '', left: '49.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_844', label: '', left: '51.10%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_845', label: '', left: '52.60%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_846', label: '', left: '54.10%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_847', label: '', left: '55.70%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_848', label: '', left: '57.20%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_849', label: '', left: '58.70%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_850', label: '', left: '60.20%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_851', label: '', left: '61.80%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_852', label: '', left: '63.30%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_853', label: '', left: '64.80%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_854', label: '', left: '66.30%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_855', label: '', left: '67.80%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_856', label: '', left: '69.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_857', label: '', left: '71.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_858', label: '', left: '72.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_859', label: '', left: '74.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_860', label: '', left: '75.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_861', label: '', left: '77.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_862', label: '', left: '78.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_863', label: '', left: '80.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_864', label: '', left: '81.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_865', label: '', left: '83.00%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_866', label: '', left: '84.50%', top: '25.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_867', label: '', left: '86.50%', top: '25.50%', width: '1.97%', height: '1.50%' },
            { id: 'g17_868', label: '', left: '88.50%', top: '25.50%', width: '2.47%', height: '1.50%' },
            { id: 'g17_869', label: '', left: '91.00%', top: '25.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_870', label: '', left: '93.00%', top: '25.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_871', label: '', left: '94.80%', top: '25.50%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 30.00%, height 5.50%）*/
            { id: 'g17_872', label: '', left: '39.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_873', label: '', left: '40.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_874', label: '', left: '42.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_875', label: '', left: '43.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_876', label: '', left: '45.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_877', label: '', left: '46.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_878', label: '', left: '48.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_879', label: '', left: '49.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_880', label: '', left: '51.10%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_881', label: '', left: '52.60%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_882', label: '', left: '54.10%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_883', label: '', left: '55.70%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_884', label: '', left: '57.20%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_885', label: '', left: '58.70%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_886', label: '', left: '60.20%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_887', label: '', left: '61.80%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_888', label: '', left: '63.30%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_889', label: '', left: '64.80%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_890', label: '', left: '66.30%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_891', label: '', left: '67.80%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_892', label: '', left: '69.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_893', label: '', left: '71.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_894', label: '', left: '72.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_895', label: '', left: '74.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_896', label: '', left: '75.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_897', label: '', left: '77.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_898', label: '', left: '78.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_899', label: '', left: '80.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_900', label: '', left: '81.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_901', label: '', left: '83.00%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_902', label: '', left: '84.50%', top: '30.00%', width: '1.47%', height: '10.50%' },
            { id: 'g17_903', label: '', left: '86.50%', top: '30.00%', width: '1.97%', height: '10.50%' },
            { id: 'g17_904', label: '', left: '88.50%', top: '30.00%', width: '2.47%', height: '10.50%' },
            { id: 'g17_905', label: '', left: '91.00%', top: '30.00%', width: '1.77%', height: '10.50%' },
            { id: 'g17_906', label: '', left: '93.00%', top: '30.00%', width: '1.77%', height: '10.50%' },
            { id: 'g17_907', label: '', left: '94.80%', top: '30.00%', width: '1.77%', height: '10.50%' },
                        /* 新一排（top 50.00%, height 2.50%）*/
            { id: 'g17_908', label: '', left: '39.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_909', label: '', left: '40.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_910', label: '', left: '42.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_911', label: '', left: '43.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_912', label: '', left: '45.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_913', label: '', left: '46.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_914', label: '', left: '48.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_915', label: '', left: '49.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_916', label: '', left: '51.10%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_917', label: '', left: '52.60%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_918', label: '', left: '54.10%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_919', label: '', left: '55.70%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_920', label: '', left: '57.20%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_921', label: '', left: '58.70%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_922', label: '', left: '60.20%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_923', label: '', left: '61.80%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_924', label: '', left: '63.30%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_925', label: '', left: '64.80%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_926', label: '', left: '66.30%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_927', label: '', left: '67.80%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_928', label: '', left: '69.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_929', label: '', left: '71.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_930', label: '', left: '72.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_931', label: '', left: '74.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_932', label: '', left: '75.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_933', label: '', left: '77.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_934', label: '', left: '78.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_935', label: '', left: '80.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_936', label: '', left: '81.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_937', label: '', left: '83.00%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_938', label: '', left: '84.50%', top: '42.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_939', label: '', left: '86.50%', top: '42.00%', width: '1.97%', height: '2.50%' },
            { id: 'g17_940', label: '', left: '88.50%', top: '42.00%', width: '2.47%', height: '2.50%' },
            { id: 'g17_941', label: '', left: '91.00%', top: '42.00%', width: '1.77%', height: '2.50%' },
            { id: 'g17_942', label: '', left: '93.00%', top: '42.00%', width: '1.77%', height: '2.50%' },
            { id: 'g17_943', label: '', left: '94.80%', top: '42.00%', width: '1.77%', height: '2.50%' },
                        /* 新一排（top 48.00%, height 1.50%）*/
            { id: 'g17_943', label: '', left: '39.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_944', label: '', left: '40.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_945', label: '', left: '42.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_946', label: '', left: '43.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_947', label: '', left: '45.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_948', label: '', left: '46.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_949', label: '', left: '48.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_950', label: '', left: '49.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_951', label: '', left: '51.10%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_952', label: '', left: '52.60%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_953', label: '', left: '54.10%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_954', label: '', left: '55.70%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_955', label: '', left: '57.20%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_956', label: '', left: '58.70%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_957', label: '', left: '60.20%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_958', label: '', left: '61.80%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_959', label: '', left: '63.30%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_960', label: '', left: '64.80%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_961', label: '', left: '66.30%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_962', label: '', left: '67.80%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_963', label: '', left: '69.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_964', label: '', left: '71.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_965', label: '', left: '72.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_966', label: '', left: '74.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_967', label: '', left: '75.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_968', label: '', left: '77.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_969', label: '', left: '78.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_970', label: '', left: '80.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_971', label: '', left: '81.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_972', label: '', left: '83.00%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_973', label: '', left: '84.50%', top: '48.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_974', label: '', left: '86.50%', top: '48.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_975', label: '', left: '88.50%', top: '48.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_976', label: '', left: '91.00%', top: '48.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_977', label: '', left: '93.00%', top: '48.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_978', label: '', left: '94.80%', top: '48.00%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 46.00%, height 1.50%）*/
            { id: 'g17_978', label: '', left: '39.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_979', label: '', left: '40.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_980', label: '', left: '42.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_981', label: '', left: '43.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_982', label: '', left: '45.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_983', label: '', left: '46.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_984', label: '', left: '48.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_985', label: '', left: '49.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_986', label: '', left: '51.10%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_987', label: '', left: '52.60%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_988', label: '', left: '54.10%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_989', label: '', left: '55.70%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_990', label: '', left: '57.20%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_991', label: '', left: '58.70%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_992', label: '', left: '60.20%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_993', label: '', left: '61.80%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_994', label: '', left: '63.30%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_995', label: '', left: '64.80%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_996', label: '', left: '66.30%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_997', label: '', left: '67.80%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_998', label: '', left: '69.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_999', label: '', left: '71.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1000', label: '', left: '72.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1001', label: '', left: '74.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1002', label: '', left: '75.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1003', label: '', left: '77.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1004', label: '', left: '78.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1005', label: '', left: '80.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1006', label: '', left: '81.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1007', label: '', left: '83.00%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1008', label: '', left: '84.50%', top: '46.40%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1009', label: '', left: '86.50%', top: '46.40%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1010', label: '', left: '88.50%', top: '46.40%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1011', label: '', left: '91.00%', top: '46.40%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1012', label: '', left: '93.00%', top: '46.40%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1013', label: '', left: '94.80%', top: '46.40%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 44.00%, height 1.50%）*/
            { id: 'g17_1014', label: '', left: '39.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1015', label: '', left: '40.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1016', label: '', left: '42.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1017', label: '', left: '43.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1018', label: '', left: '45.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1019', label: '', left: '46.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1020', label: '', left: '48.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1021', label: '', left: '49.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1022', label: '', left: '51.10%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1023', label: '', left: '52.60%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1024', label: '', left: '54.10%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1025', label: '', left: '55.70%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1026', label: '', left: '57.20%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1027', label: '', left: '58.70%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1028', label: '', left: '60.20%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1029', label: '', left: '61.80%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1030', label: '', left: '63.30%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1031', label: '', left: '64.80%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1032', label: '', left: '66.30%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1033', label: '', left: '67.80%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1034', label: '', left: '69.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1035', label: '', left: '71.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1036', label: '', left: '72.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1037', label: '', left: '74.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1038', label: '', left: '75.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1039', label: '', left: '77.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1040', label: '', left: '78.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1041', label: '', left: '80.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1042', label: '', left: '81.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1043', label: '', left: '83.00%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1044', label: '', left: '84.50%', top: '45.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1045', label: '', left: '86.50%', top: '45.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1046', label: '', left: '88.50%', top: '45.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1047', label: '', left: '91.00%', top: '45.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1048', label: '', left: '93.00%', top: '45.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1049', label: '', left: '94.80%', top: '45.00%', width: '1.77%', height: '1.50%' },
                        /* ============================================================
               新增五排（top 46.50% 起，每排 +1.5%，height 1.50%）
               ============================================================ */

            /* 第 1 排（top 46.50%）g17_1049 ~ g17_1084 */
            { id: 'g17_1049', label: '', left: '39.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1050', label: '', left: '40.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1051', label: '', left: '42.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1052', label: '', left: '43.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1053', label: '', left: '45.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1054', label: '', left: '46.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1055', label: '', left: '48.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1056', label: '', left: '49.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1057', label: '', left: '51.10%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1058', label: '', left: '52.60%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1059', label: '', left: '54.10%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1060', label: '', left: '55.70%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1061', label: '', left: '57.20%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1062', label: '', left: '58.70%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1063', label: '', left: '60.20%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1064', label: '', left: '61.80%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1065', label: '', left: '63.30%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1066', label: '', left: '64.80%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1067', label: '', left: '66.30%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1068', label: '', left: '67.80%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1069', label: '', left: '69.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1070', label: '', left: '71.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1071', label: '', left: '72.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1072', label: '', left: '74.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1073', label: '', left: '75.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1074', label: '', left: '77.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1075', label: '', left: '78.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1076', label: '', left: '80.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1077', label: '', left: '81.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1078', label: '', left: '83.00%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1079', label: '', left: '84.50%', top: '49.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1080', label: '', left: '86.50%', top: '49.50%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1081', label: '', left: '88.50%', top: '49.50%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1082', label: '', left: '91.00%', top: '49.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1083', label: '', left: '93.00%', top: '49.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1084', label: '', left: '94.80%', top: '49.50%', width: '1.77%', height: '1.50%' },

            /* 第 2 排（top 48.00%）g17_1085 ~ g17_1120 */
            { id: 'g17_1085', label: '', left: '39.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1086', label: '', left: '40.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1087', label: '', left: '42.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1088', label: '', left: '43.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1089', label: '', left: '45.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1090', label: '', left: '46.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1091', label: '', left: '48.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1092', label: '', left: '49.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1093', label: '', left: '51.10%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1094', label: '', left: '52.60%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1095', label: '', left: '54.10%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1096', label: '', left: '55.70%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1097', label: '', left: '57.20%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1098', label: '', left: '58.70%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1099', label: '', left: '60.20%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1100', label: '', left: '61.80%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1101', label: '', left: '63.30%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1102', label: '', left: '64.80%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1103', label: '', left: '66.30%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1104', label: '', left: '67.80%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1105', label: '', left: '69.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1106', label: '', left: '71.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1107', label: '', left: '72.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1108', label: '', left: '74.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1109', label: '', left: '75.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1110', label: '', left: '77.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1111', label: '', left: '78.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1112', label: '', left: '80.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1113', label: '', left: '81.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1114', label: '', left: '83.00%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1115', label: '', left: '84.50%', top: '51.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1116', label: '', left: '86.50%', top: '51.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1117', label: '', left: '88.50%', top: '51.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1118', label: '', left: '91.00%', top: '51.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1119', label: '', left: '93.00%', top: '51.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1120', label: '', left: '94.80%', top: '51.00%', width: '1.77%', height: '1.50%' },

            /* 第 3 排（top 49.50%）g17_1121 ~ g17_1156 */
            { id: 'g17_1121', label: '', left: '39.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1122', label: '', left: '40.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1123', label: '', left: '42.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1124', label: '', left: '43.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1125', label: '', left: '45.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1126', label: '', left: '46.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1127', label: '', left: '48.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1128', label: '', left: '49.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1129', label: '', left: '51.10%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1130', label: '', left: '52.60%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1131', label: '', left: '54.10%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1132', label: '', left: '55.70%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1133', label: '', left: '57.20%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1134', label: '', left: '58.70%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1135', label: '', left: '60.20%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1136', label: '', left: '61.80%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1137', label: '', left: '63.30%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1138', label: '', left: '64.80%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1139', label: '', left: '66.30%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1140', label: '', left: '67.80%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1141', label: '', left: '69.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1142', label: '', left: '71.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1143', label: '', left: '72.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1144', label: '', left: '74.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1145', label: '', left: '75.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1146', label: '', left: '77.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1147', label: '', left: '78.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1148', label: '', left: '80.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1149', label: '', left: '81.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1150', label: '', left: '83.00%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1151', label: '', left: '84.50%', top: '52.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1152', label: '', left: '86.50%', top: '52.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1153', label: '', left: '88.50%', top: '52.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1154', label: '', left: '91.00%', top: '52.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1155', label: '', left: '93.00%', top: '52.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1156', label: '', left: '94.80%', top: '52.00%', width: '1.77%', height: '1.50%' },

            /* 第 4 排（top 51.00%）g17_1157 ~ g17_1192 */
            { id: 'g17_1157', label: '', left: '39.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1158', label: '', left: '40.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1159', label: '', left: '42.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1160', label: '', left: '43.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1161', label: '', left: '45.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1162', label: '', left: '46.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1163', label: '', left: '48.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1164', label: '', left: '49.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1165', label: '', left: '51.10%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1166', label: '', left: '52.60%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1167', label: '', left: '54.10%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1168', label: '', left: '55.70%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1169', label: '', left: '57.20%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1170', label: '', left: '58.70%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1171', label: '', left: '60.20%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1172', label: '', left: '61.80%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1173', label: '', left: '63.30%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1174', label: '', left: '64.80%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1175', label: '', left: '66.30%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1176', label: '', left: '67.80%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1177', label: '', left: '69.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1178', label: '', left: '71.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1179', label: '', left: '72.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1180', label: '', left: '74.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1181', label: '', left: '75.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1182', label: '', left: '77.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1183', label: '', left: '78.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1184', label: '', left: '80.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1185', label: '', left: '81.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1186', label: '', left: '83.00%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1187', label: '', left: '84.50%', top: '53.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1188', label: '', left: '86.50%', top: '53.50%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1189', label: '', left: '88.50%', top: '53.50%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1190', label: '', left: '91.00%', top: '53.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1191', label: '', left: '93.00%', top: '53.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1192', label: '', left: '94.80%', top: '53.50%', width: '1.77%', height: '1.50%' },

            /* 第 5 排（top 52.50%）g17_1193 ~ g17_1228 */
            { id: 'g17_1193', label: '', left: '39.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1194', label: '', left: '40.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1195', label: '', left: '42.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1196', label: '', left: '43.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1197', label: '', left: '45.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1198', label: '', left: '46.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1199', label: '', left: '48.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1200', label: '', left: '49.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1201', label: '', left: '51.10%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1202', label: '', left: '52.60%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1203', label: '', left: '54.10%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1204', label: '', left: '55.70%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1205', label: '', left: '57.20%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1206', label: '', left: '58.70%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1207', label: '', left: '60.20%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1208', label: '', left: '61.80%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1209', label: '', left: '63.30%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1210', label: '', left: '64.80%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1211', label: '', left: '66.30%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1212', label: '', left: '67.80%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1213', label: '', left: '69.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1214', label: '', left: '71.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1215', label: '', left: '72.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1216', label: '', left: '74.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1217', label: '', left: '75.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1218', label: '', left: '77.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1219', label: '', left: '78.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1220', label: '', left: '80.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1221', label: '', left: '81.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1222', label: '', left: '83.00%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1223', label: '', left: '84.50%', top: '55.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1224', label: '', left: '86.50%', top: '55.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1225', label: '', left: '88.50%', top: '55.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1226', label: '', left: '91.00%', top: '55.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1227', label: '', left: '93.00%', top: '55.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1228', label: '', left: '94.80%', top: '55.00%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 57.50%, height 2.50%）g17_1049 ~ g17_1084 */
            { id: 'g17_1049', label: '', left: '39.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1050', label: '', left: '40.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1051', label: '', left: '42.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1052', label: '', left: '43.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1053', label: '', left: '45.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1054', label: '', left: '46.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1055', label: '', left: '48.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1056', label: '', left: '49.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1057', label: '', left: '51.10%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1058', label: '', left: '52.60%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1059', label: '', left: '54.10%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1060', label: '', left: '55.70%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1061', label: '', left: '57.20%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1062', label: '', left: '58.70%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1063', label: '', left: '60.20%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1064', label: '', left: '61.80%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1065', label: '', left: '63.30%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1066', label: '', left: '64.80%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1067', label: '', left: '66.30%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1068', label: '', left: '67.80%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1069', label: '', left: '69.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1070', label: '', left: '71.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1071', label: '', left: '72.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1072', label: '', left: '74.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1073', label: '', left: '75.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1074', label: '', left: '77.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1075', label: '', left: '78.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1076', label: '', left: '80.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1077', label: '', left: '81.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1078', label: '', left: '83.00%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1079', label: '', left: '84.50%', top: '57.00%', width: '1.47%', height: '2.50%' },
            { id: 'g17_1080', label: '', left: '86.50%', top: '57.00%', width: '1.97%', height: '2.50%' },
            { id: 'g17_1081', label: '', left: '88.50%', top: '57.00%', width: '2.47%', height: '2.50%' },
            { id: 'g17_1082', label: '', left: '91.00%', top: '57.00%', width: '1.77%', height: '2.50%' },
            { id: 'g17_1083', label: '', left: '93.00%', top: '57.00%', width: '1.77%', height: '2.50%' },
            { id: 'g17_1084', label: '', left: '94.80%', top: '57.00%', width: '1.77%', height: '2.50%' },
                        /* 新一排（top 61.50%, height 1.50%）g17_1084 ~ g17_1119 */
            { id: 'g17_1084', label: '', left: '39.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1085', label: '', left: '40.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1086', label: '', left: '42.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1087', label: '', left: '43.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1088', label: '', left: '45.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1089', label: '', left: '46.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1090', label: '', left: '48.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1091', label: '', left: '49.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1092', label: '', left: '51.10%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1093', label: '', left: '52.60%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1094', label: '', left: '54.10%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1095', label: '', left: '55.70%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1096', label: '', left: '57.20%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1097', label: '', left: '58.70%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1098', label: '', left: '60.20%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1099', label: '', left: '61.80%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1100', label: '', left: '63.30%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1101', label: '', left: '64.80%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1102', label: '', left: '66.30%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1103', label: '', left: '67.80%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1104', label: '', left: '69.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1105', label: '', left: '71.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1106', label: '', left: '72.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1107', label: '', left: '74.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1108', label: '', left: '75.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1109', label: '', left: '77.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1110', label: '', left: '78.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1111', label: '', left: '80.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1112', label: '', left: '81.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1113', label: '', left: '83.00%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1114', label: '', left: '84.50%', top: '60.00%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1115', label: '', left: '86.50%', top: '60.00%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1116', label: '', left: '88.50%', top: '60.00%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1117', label: '', left: '91.00%', top: '60.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1118', label: '', left: '93.00%', top: '60.00%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1119', label: '', left: '94.80%', top: '60.00%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 63.50%, height 4.50%）g17_1120 ~ g17_1155 */
            { id: 'g17_1120', label: '', left: '39.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1121', label: '', left: '40.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1122', label: '', left: '42.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1123', label: '', left: '43.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1124', label: '', left: '45.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1125', label: '', left: '46.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1126', label: '', left: '48.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1127', label: '', left: '49.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1128', label: '', left: '51.10%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1129', label: '', left: '52.60%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1130', label: '', left: '54.10%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1131', label: '', left: '55.70%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1132', label: '', left: '57.20%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1133', label: '', left: '58.70%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1134', label: '', left: '60.20%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1135', label: '', left: '61.80%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1136', label: '', left: '63.30%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1137', label: '', left: '64.80%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1138', label: '', left: '66.30%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1139', label: '', left: '67.80%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1140', label: '', left: '69.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1141', label: '', left: '71.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1142', label: '', left: '72.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1143', label: '', left: '74.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1144', label: '', left: '75.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1145', label: '', left: '77.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1146', label: '', left: '78.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1147', label: '', left: '80.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1148', label: '', left: '81.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1149', label: '', left: '83.00%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1150', label: '', left: '84.50%', top: '63.50%', width: '1.47%', height: '4.50%' },
            { id: 'g17_1151', label: '', left: '86.50%', top: '63.50%', width: '1.97%', height: '4.50%' },
            { id: 'g17_1152', label: '', left: '88.50%', top: '63.50%', width: '2.47%', height: '4.50%' },
            { id: 'g17_1153', label: '', left: '91.00%', top: '63.50%', width: '1.77%', height: '4.50%' },
            { id: 'g17_1154', label: '', left: '93.00%', top: '63.50%', width: '1.77%', height: '4.50%' },
            { id: 'g17_1155', label: '', left: '94.80%', top: '63.50%', width: '1.77%', height: '4.50%' },
                        /* 新一排（top 66.50%, height 2.50%）g17_1156 ~ g17_1191 */
            { id: 'g17_1156', label: '', left: '39.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1157', label: '', left: '40.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1158', label: '', left: '42.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1159', label: '', left: '43.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1160', label: '', left: '45.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1161', label: '', left: '46.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1162', label: '', left: '48.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1163', label: '', left: '49.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1164', label: '', left: '51.10%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1165', label: '', left: '52.60%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1166', label: '', left: '54.10%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1167', label: '', left: '55.70%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1168', label: '', left: '57.20%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1169', label: '', left: '58.70%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1170', label: '', left: '60.20%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1171', label: '', left: '61.80%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1172', label: '', left: '63.30%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1173', label: '', left: '64.80%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1174', label: '', left: '66.30%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1175', label: '', left: '67.80%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1176', label: '', left: '69.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1177', label: '', left: '71.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1178', label: '', left: '72.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1179', label: '', left: '74.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1180', label: '', left: '75.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1181', label: '', left: '77.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1182', label: '', left: '78.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1183', label: '', left: '80.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1184', label: '', left: '81.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1185', label: '', left: '83.00%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1186', label: '', left: '84.50%', top: '69.50%', width: '1.47%', height: '3.50%' },
            { id: 'g17_1187', label: '', left: '86.50%', top: '69.50%', width: '1.97%', height: '3.50%' },
            { id: 'g17_1188', label: '', left: '88.50%', top: '69.50%', width: '2.47%', height: '3.50%' },
            { id: 'g17_1189', label: '', left: '91.00%', top: '69.50%', width: '1.77%', height: '3.50%' },
            { id: 'g17_1190', label: '', left: '93.00%', top: '69.50%', width: '1.77%', height: '3.50%' },
            { id: 'g17_1191', label: '', left: '94.80%', top: '69.50%', width: '1.77%', height: '3.50%' },
                        /* 新一排（top 72.50%, height 3.50%）g17_1192 ~ g17_1227 */
            { id: 'g17_1192', label: '', left: '39.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1193', label: '', left: '40.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1194', label: '', left: '42.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1195', label: '', left: '43.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1196', label: '', left: '45.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1197', label: '', left: '46.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1198', label: '', left: '48.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1199', label: '', left: '49.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1200', label: '', left: '51.10%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1201', label: '', left: '52.60%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1202', label: '', left: '54.10%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1203', label: '', left: '55.70%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1204', label: '', left: '57.20%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1205', label: '', left: '58.70%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1206', label: '', left: '60.20%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1207', label: '', left: '61.80%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1208', label: '', left: '63.30%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1209', label: '', left: '64.80%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1210', label: '', left: '66.30%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1211', label: '', left: '67.80%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1212', label: '', left: '69.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1213', label: '', left: '71.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1214', label: '', left: '72.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1215', label: '', left: '74.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1216', label: '', left: '75.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1217', label: '', left: '77.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1218', label: '', left: '78.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1219', label: '', left: '80.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1220', label: '', left: '81.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1221', label: '', left: '83.00%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1222', label: '', left: '84.50%', top: '74.50%', width: '1.47%', height: '3.00%' },
            { id: 'g17_1223', label: '', left: '86.50%', top: '74.50%', width: '1.97%', height: '3.00%' },
            { id: 'g17_1224', label: '', left: '88.50%', top: '74.50%', width: '2.47%', height: '3.00%' },
            { id: 'g17_1225', label: '', left: '91.00%', top: '74.50%', width: '1.77%', height: '3.00%' },
            { id: 'g17_1226', label: '', left: '93.00%', top: '74.50%', width: '1.77%', height: '3.00%' },
            { id: 'g17_1227', label: '', left: '94.80%', top: '74.50%', width: '1.77%', height: '3.00%' },
                        /* 新一排（top 78.50%, height 1.50%）g17_1228 ~ g17_1263 */
            { id: 'g17_1228', label: '', left: '39.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1229', label: '', left: '40.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1230', label: '', left: '42.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1231', label: '', left: '43.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1232', label: '', left: '45.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1233', label: '', left: '46.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1234', label: '', left: '48.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1235', label: '', left: '49.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1236', label: '', left: '51.10%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1237', label: '', left: '52.60%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1238', label: '', left: '54.10%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1239', label: '', left: '55.70%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1240', label: '', left: '57.20%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1241', label: '', left: '58.70%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1242', label: '', left: '60.20%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1243', label: '', left: '61.80%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1244', label: '', left: '63.30%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1245', label: '', left: '64.80%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1246', label: '', left: '66.30%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1247', label: '', left: '67.80%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1248', label: '', left: '69.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1249', label: '', left: '71.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1250', label: '', left: '72.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1251', label: '', left: '74.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1252', label: '', left: '75.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1253', label: '', left: '77.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1254', label: '', left: '78.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1255', label: '', left: '80.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1256', label: '', left: '81.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1257', label: '', left: '83.00%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1258', label: '', left: '84.50%', top: '77.50%', width: '1.47%', height: '1.50%' },
            { id: 'g17_1259', label: '', left: '86.50%', top: '77.50%', width: '1.97%', height: '1.50%' },
            { id: 'g17_1260', label: '', left: '88.50%', top: '77.50%', width: '2.47%', height: '1.50%' },
            { id: 'g17_1261', label: '', left: '91.00%', top: '77.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1262', label: '', left: '93.00%', top: '77.50%', width: '1.77%', height: '1.50%' },
            { id: 'g17_1263', label: '', left: '94.80%', top: '77.50%', width: '1.77%', height: '1.50%' },
                        /* 新一排（top 79.00%, height 1.50%）g17_1264 ~ g17_1299 */
            { id: 'g17_1264', label: '', left: '39.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1265', label: '', left: '40.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1266', label: '', left: '42.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1267', label: '', left: '43.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1268', label: '', left: '45.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1269', label: '', left: '46.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1270', label: '', left: '48.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1271', label: '', left: '49.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1272', label: '', left: '51.10%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1273', label: '', left: '52.60%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1274', label: '', left: '54.10%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1275', label: '', left: '55.70%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1276', label: '', left: '57.20%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1277', label: '', left: '58.70%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1278', label: '', left: '60.20%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1279', label: '', left: '61.80%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1280', label: '', left: '63.30%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1281', label: '', left: '64.80%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1282', label: '', left: '66.30%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1283', label: '', left: '67.80%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1284', label: '', left: '69.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1285', label: '', left: '71.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1286', label: '', left: '72.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1287', label: '', left: '74.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1288', label: '', left: '75.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1289', label: '', left: '77.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1290', label: '', left: '78.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1291', label: '', left: '80.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1292', label: '', left: '81.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1293', label: '', left: '83.00%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1294', label: '', left: '84.50%', top: '79.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1295', label: '', left: '86.50%', top: '79.00%', width: '1.97%', height: '1.00%' },
            { id: 'g17_1296', label: '', left: '88.50%', top: '79.00%', width: '2.47%', height: '1.00%' },
            { id: 'g17_1297', label: '', left: '91.00%', top: '79.00%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1298', label: '', left: '93.00%', top: '79.00%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1299', label: '', left: '94.80%', top: '79.00%', width: '1.77%', height: '1.00%' },
                        /* 新一排（top 80.00%, height 1.00%）g17_1300 ~ g17_1335 */
            { id: 'g17_1300', label: '', left: '39.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1301', label: '', left: '40.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1302', label: '', left: '42.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1303', label: '', left: '43.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1304', label: '', left: '45.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1305', label: '', left: '46.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1306', label: '', left: '48.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1307', label: '', left: '49.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1308', label: '', left: '51.10%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1309', label: '', left: '52.60%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1310', label: '', left: '54.10%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1311', label: '', left: '55.70%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1312', label: '', left: '57.20%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1313', label: '', left: '58.70%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1314', label: '', left: '60.20%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1315', label: '', left: '61.80%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1316', label: '', left: '63.30%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1317', label: '', left: '64.80%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1318', label: '', left: '66.30%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1319', label: '', left: '67.80%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1320', label: '', left: '69.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1321', label: '', left: '71.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1322', label: '', left: '72.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1323', label: '', left: '74.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1324', label: '', left: '75.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1325', label: '', left: '77.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1326', label: '', left: '78.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1327', label: '', left: '80.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1328', label: '', left: '81.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1329', label: '', left: '83.00%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1330', label: '', left: '84.50%', top: '80.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1331', label: '', left: '86.50%', top: '80.00%', width: '1.97%', height: '1.00%' },
            { id: 'g17_1332', label: '', left: '88.50%', top: '80.00%', width: '2.47%', height: '1.00%' },
            { id: 'g17_1333', label: '', left: '91.00%', top: '80.00%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1334', label: '', left: '93.00%', top: '80.00%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1335', label: '', left: '94.80%', top: '80.00%', width: '1.77%', height: '1.00%' },
                        /* 新一排（top 81.00%, height 1.00%）g17_1336 ~ g17_1371 */
            { id: 'g17_1336', label: '', left: '39.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1337', label: '', left: '40.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1338', label: '', left: '42.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1339', label: '', left: '43.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1340', label: '', left: '45.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1341', label: '', left: '46.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1342', label: '', left: '48.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1343', label: '', left: '49.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1344', label: '', left: '51.10%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1345', label: '', left: '52.60%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1346', label: '', left: '54.10%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1347', label: '', left: '55.70%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1348', label: '', left: '57.20%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1349', label: '', left: '58.70%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1350', label: '', left: '60.20%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1351', label: '', left: '61.80%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1352', label: '', left: '63.30%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1353', label: '', left: '64.80%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1354', label: '', left: '66.30%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1355', label: '', left: '67.80%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1356', label: '', left: '69.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1357', label: '', left: '71.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1358', label: '', left: '72.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1359', label: '', left: '74.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1360', label: '', left: '75.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1361', label: '', left: '77.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1362', label: '', left: '78.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1363', label: '', left: '80.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1364', label: '', left: '81.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1365', label: '', left: '83.00%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1366', label: '', left: '84.50%', top: '81.00%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1367', label: '', left: '86.50%', top: '81.00%', width: '1.97%', height: '1.00%' },
            { id: 'g17_1368', label: '', left: '88.50%', top: '81.00%', width: '2.47%', height: '1.00%' },
            { id: 'g17_1369', label: '', left: '91.00%', top: '81.00%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1370', label: '', left: '93.00%', top: '81.00%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1371', label: '', left: '94.80%', top: '81.00%', width: '1.77%', height: '1.00%' },
                        /* 新一排（top 82.30%, height 1.00%）g17_1372 ~ g17_1407 */
            { id: 'g17_1372', label: '', left: '39.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1373', label: '', left: '40.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1374', label: '', left: '42.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1375', label: '', left: '43.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1376', label: '', left: '45.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1377', label: '', left: '46.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1378', label: '', left: '48.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1379', label: '', left: '49.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1380', label: '', left: '51.10%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1381', label: '', left: '52.60%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1382', label: '', left: '54.10%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1383', label: '', left: '55.70%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1384', label: '', left: '57.20%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1385', label: '', left: '58.70%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1386', label: '', left: '60.20%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1387', label: '', left: '61.80%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1388', label: '', left: '63.30%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1389', label: '', left: '64.80%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1390', label: '', left: '66.30%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1391', label: '', left: '67.80%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1392', label: '', left: '69.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1393', label: '', left: '71.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1394', label: '', left: '72.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1395', label: '', left: '74.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1396', label: '', left: '75.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1397', label: '', left: '77.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1398', label: '', left: '78.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1399', label: '', left: '80.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1400', label: '', left: '81.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1401', label: '', left: '83.00%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1402', label: '', left: '84.50%', top: '82.30%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1403', label: '', left: '86.50%', top: '82.30%', width: '1.97%', height: '1.00%' },
            { id: 'g17_1404', label: '', left: '88.50%', top: '82.30%', width: '2.47%', height: '1.00%' },
            { id: 'g17_1405', label: '', left: '91.00%', top: '82.30%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1406', label: '', left: '93.00%', top: '82.30%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1407', label: '', left: '94.80%', top: '82.30%', width: '1.77%', height: '1.00%' },
                        /* 新一排（top 83.50%, height 1.00%）g17_1408 ~ g17_1443 */
            { id: 'g17_1408', label: '', left: '39.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1409', label: '', left: '40.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1410', label: '', left: '42.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1411', label: '', left: '43.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1412', label: '', left: '45.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1413', label: '', left: '46.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1414', label: '', left: '48.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1415', label: '', left: '49.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1416', label: '', left: '51.10%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1417', label: '', left: '52.60%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1418', label: '', left: '54.10%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1419', label: '', left: '55.70%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1420', label: '', left: '57.20%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1421', label: '', left: '58.70%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1422', label: '', left: '60.20%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1423', label: '', left: '61.80%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1424', label: '', left: '63.30%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1425', label: '', left: '64.80%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1426', label: '', left: '66.30%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1427', label: '', left: '67.80%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1428', label: '', left: '69.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1429', label: '', left: '71.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1430', label: '', left: '72.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1431', label: '', left: '74.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1432', label: '', left: '75.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1433', label: '', left: '77.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1434', label: '', left: '78.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1435', label: '', left: '80.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1436', label: '', left: '81.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1437', label: '', left: '83.00%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1438', label: '', left: '84.50%', top: '83.50%', width: '1.47%', height: '1.00%' },
            { id: 'g17_1439', label: '', left: '86.50%', top: '83.50%', width: '1.97%', height: '1.00%' },
            { id: 'g17_1440', label: '', left: '88.50%', top: '83.50%', width: '2.47%', height: '1.00%' },
            { id: 'g17_1441', label: '', left: '91.00%', top: '83.50%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1442', label: '', left: '93.00%', top: '83.50%', width: '1.77%', height: '1.00%' },
            { id: 'g17_1443', label: '', left: '94.80%', top: '83.50%', width: '1.77%', height: '1.00%' },
            //code//
            { id: 'g17_1444', label: '', left: '33.50%', top: '79.00%', width: '5.50%', height: '1.00%' },
            { id: 'g17_1445', label: '', left: '33.50%', top: '80.00%', width: '5.50%', height: '1.00%' },
            { id: 'g17_1446', label: '', left: '33.50%', top: '81.00%', width: '5.50%', height: '1.00%' },
            { id: 'g17_1447', label: '', left: '33.50%', top: '82.30%', width: '5.50%', height: '1.00%' },
            { id: 'g17_1448', label: '', left: '33.50%', top: '83.50%', width: '5.50%', height: '1.00%' },
            //telno//
            { id: 'g17_1449', label: '', left: '34.50%', top: '84.80%', width: '4.00%', height: '1.60%' },
            { id: 'g17_1450', label: '', left: '34.50%', top: '86.50%', width: '4.00%', height: '1.60%' },
            //tradename//
            { id: 'g17_1451', label: '', left: '9.00%', top: '79.00%', width: '20.50%', height: '1.00%' },
            { id: 'g17_1452', label: '', left: '9.00%', top: '80.00%', width: '20.50%', height: '1.00%' },
            { id: 'g17_1453', label: '', left: '9.00%', top: '81.00%', width: '20.50%', height: '1.00%' },
            { id: 'g17_1454', label: '', left: '9.00%', top: '82.30%', width: '20.50%', height: '1.00%' },
            { id: 'g17_1455', label: '', left: '9.00%', top: '83.50%', width: '20.50%', height: '1.00%' },
            //name//
            { id: 'g17_1456', label: '', left: '21.50%', top: '84.80%', width: '5.00%', height: '1.60%' },
            { id: 'g17_1457', label: '', left: '21.50%', top: '86.50%', width: '5.00%', height: '1.60%' },
            //sign//
            { id: 'g17_1458', label: '', type: 'signature', left: '26.50%', top: '84.80%', width: '4.00%', height: '1.60%' },
            { id: 'g17_1459', label: '', type: 'signature', left: '26.50%', top: '86.50%', width: '4.00%', height: '1.60%' },


        ]
    };

    /* ============================================================
       ★ GF527-2003 - 表單覆蓋層（gf_01 ~ gf_08, gf45）
       ------------------------------------------------------------
       參考 GF527-2017 的格子風格生成
       - gf_01 ~ gf_08：對應上方單行欄位
       - gf45        ：對應中部主要欄位
       ============================================================ */
    var GF527_2003_FORM_LAYOUT = {
        fields: [
            { id: 'gf_01', label: '', left: '5.20%',  top: '5.90%',  width: '2.57%',  height: '1.08%' },
            { id: 'gf_02', label: '', left: '8.16%',  top: '5.90%',  width: '2.57%',  height: '1.27%' },
            { id: 'gf_03', label: '', left: '14.50%', top: '5.90%',  width: '1.54%',  height: '1.44%' },
            { id: 'gf_04', label: '', left: '16.53%', top: '5.90%',  width: '1.54%',  height: '1.44%' },
            { id: 'gf_05', label: '', left: '28.30%', top: '5.90%',  width: '6.34%',  height: '1.44%' },
            { id: 'gf_06', label: '', left: '40.22%', top: '5.70%',  width: '15.61%',  height: '1.81%' },
            { id: 'gf_07', label: '', left: '60.88%', top: '5.30%',  width: '8.73%',  height: '2.09%' },
            { id: 'gf_08', label: '', type: 'check', left: '72.15%', top: '6.10%',  width: '0.90%',  height: '1.00%' },
            /* gf45 - 中部主要欄位 */
            { id: 'gf_45', label: '', left: '88.00%', top: '5.90%', width: '6.00%', height: '1.50%' },
            { id: 'gf_46', label: '', left: '30.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_47', label: '', left: '31.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_48', label: '', left: '33.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_49', label: '', left: '35.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_50', label: '', left: '36.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_51', label: '', left: '38.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_52', label: '', left: '40.30%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_53', label: '', left: '41.90%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_54', label: '', left: '43.60%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_55', label: '', left: '45.60%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_56', label: '', left: '47.20%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_57', label: '', left: '49.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_58', label: '', left: '50.60%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_59', label: '', left: '52.30%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_60', label: '', left: '54.20%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_61', label: '', left: '56.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_62', label: '', left: '57.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_63', label: '', left: '59.30%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_64', label: '', left: '61.10%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_65', label: '', left: '62.80%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_66', label: '', left: '64.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_67', label: '', left: '66.30%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_68', label: '', left: '68.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_69', label: '', left: '69.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_70', label: '', left: '71.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_71', label: '', left: '73.20%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_72', label: '', left: '74.90%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_73', label: '', left: '76.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_74', label: '', left: '78.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_75', label: '', left: '80.20%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_76', label: '', left: '82.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_77', label: '', left: '84.30%', top: '11.10%', width: '1.97%', height: '1.56%' },
            { id: 'gf_78', label: '', left: '87.20%', top: '11.10%', width: '2.47%', height: '1.56%' },
            { id: 'gf_79', label: '', left: '90.20%', top: '11.10%', width: '1.77%', height: '1.56%' },
            { id: 'gf_80', label: '', left: '92.70%', top: '11.10%', width: '1.77%', height: '1.56%' },
            { id: 'gf_81', label: '', left: '94.80%', top: '11.10%', width: '1.77%', height: '1.56%' },
            /* ============================================================
               ★ 新增一排（top 13%）對應 gf_46 ~ gf_81
               ============================================================ */
            { id: 'gf_82',  label: '', left: '30.00%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_83',  label: '', left: '31.70%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_84',  label: '', left: '33.50%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_85',  label: '', left: '35.00%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_86',  label: '', left: '36.70%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_87',  label: '', left: '38.50%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_88',  label: '', left: '40.30%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_89',  label: '', left: '41.90%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_90',  label: '', left: '43.60%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_91',  label: '', left: '45.60%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_92',  label: '', left: '47.20%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_93',  label: '', left: '49.00%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_94',  label: '', left: '50.60%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_95',  label: '', left: '52.30%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_96',  label: '', left: '54.20%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_97',  label: '', left: '56.00%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_98',  label: '', left: '57.70%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_99',  label: '', left: '59.30%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_100', label: '', left: '61.10%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_101', label: '', left: '62.80%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_102', label: '', left: '64.50%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_103', label: '', left: '66.30%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_104', label: '', left: '68.00%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_105', label: '', left: '69.70%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_106', label: '', left: '71.50%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_107', label: '', left: '73.20%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_108', label: '', left: '74.90%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_109', label: '', left: '76.70%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_110', label: '', left: '78.50%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_111', label: '', left: '80.20%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_112', label: '', left: '82.00%', top: '12.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_113', label: '', left: '84.30%', top: '12.80%', width: '1.97%', height: '1.56%' },
            { id: 'gf_114', label: '', left: '87.20%', top: '12.80%', width: '2.47%', height: '1.56%' },
            { id: 'gf_115', label: '', left: '90.20%', top: '12.80%', width: '1.77%', height: '1.56%' },
            { id: 'gf_116', label: '', left: '92.70%', top: '12.80%', width: '1.77%', height: '1.56%' },
            { id: 'gf_117', label: '', left: '94.80%', top: '12.80%', width: '1.77%', height: '1.56%' },
            /* ============================================================
            ★ 新增 4 排（top 14.50% / 16.00% / 17.50% / 19.00%）
            對應 gf_46 ~ gf_81，left / width / height 不變
            ============================================================ */

            /* 第 1 排（top 14.50%）gf_118 ~ gf_153 */
            { id: 'gf_118', label: '', left: '30.00%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_119', label: '', left: '31.70%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_120', label: '', left: '33.50%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_121', label: '', left: '35.00%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_122', label: '', left: '36.70%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_123', label: '', left: '38.50%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_124', label: '', left: '40.30%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_125', label: '', left: '41.90%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_126', label: '', left: '43.60%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_127', label: '', left: '45.60%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_128', label: '', left: '47.20%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_129', label: '', left: '49.00%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_130', label: '', left: '50.60%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_131', label: '', left: '52.30%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_132', label: '', left: '54.20%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_133', label: '', left: '56.00%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_134', label: '', left: '57.70%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_135', label: '', left: '59.30%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_136', label: '', left: '61.10%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_137', label: '', left: '62.80%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_138', label: '', left: '64.50%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_139', label: '', left: '66.30%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_140', label: '', left: '68.00%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_141', label: '', left: '69.70%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_142', label: '', left: '71.50%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_143', label: '', left: '73.20%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_144', label: '', left: '74.90%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_145', label: '', left: '76.70%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_146', label: '', left: '78.50%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_147', label: '', left: '80.20%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_148', label: '', left: '82.00%', top: '14.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_149', label: '', left: '84.30%', top: '14.30%', width: '1.97%', height: '1.56%' },
            { id: 'gf_150', label: '', left: '87.20%', top: '14.30%', width: '2.47%', height: '1.56%' },
            { id: 'gf_151', label: '', left: '90.20%', top: '14.30%', width: '1.77%', height: '1.56%' },
            { id: 'gf_152', label: '', left: '92.70%', top: '14.30%', width: '1.77%', height: '1.56%' },
            { id: 'gf_153', label: '', left: '94.80%', top: '14.30%', width: '1.77%', height: '1.56%' },

            /* 第 2 排（top 16.00%）gf_154 ~ gf_189 */
            { id: 'gf_154', label: '', left: '30.00%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_155', label: '', left: '31.70%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_156', label: '', left: '33.50%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_157', label: '', left: '35.00%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_158', label: '', left: '36.70%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_159', label: '', left: '38.50%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_160', label: '', left: '40.30%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_161', label: '', left: '41.90%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_162', label: '', left: '43.60%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_163', label: '', left: '45.60%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_164', label: '', left: '47.20%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_165', label: '', left: '49.00%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_166', label: '', left: '50.60%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_167', label: '', left: '52.30%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_168', label: '', left: '54.20%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_169', label: '', left: '56.00%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_170', label: '', left: '57.70%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_171', label: '', left: '59.30%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_172', label: '', left: '61.10%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_173', label: '', left: '62.80%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_174', label: '', left: '64.50%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_175', label: '', left: '66.30%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_176', label: '', left: '68.00%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_177', label: '', left: '69.70%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_178', label: '', left: '71.50%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_179', label: '', left: '73.20%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_180', label: '', left: '74.90%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_181', label: '', left: '76.70%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_182', label: '', left: '78.50%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_183', label: '', left: '80.20%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_184', label: '', left: '82.00%', top: '15.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_185', label: '', left: '84.30%', top: '15.80%', width: '1.97%', height: '1.56%' },
            { id: 'gf_186', label: '', left: '87.20%', top: '15.80%', width: '2.47%', height: '1.56%' },
            { id: 'gf_187', label: '', left: '90.20%', top: '15.80%', width: '1.77%', height: '1.56%' },
            { id: 'gf_188', label: '', left: '92.70%', top: '15.80%', width: '1.77%', height: '1.56%' },
            { id: 'gf_189', label: '', left: '94.80%', top: '15.80%', width: '1.77%', height: '1.56%' },

            /* 第 3 排（top 17.50%）gf_190 ~ gf_225 */
            { id: 'gf_190', label: '', left: '30.00%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_191', label: '', left: '31.70%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_192', label: '', left: '33.50%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_193', label: '', left: '35.00%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_194', label: '', left: '36.70%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_195', label: '', left: '38.50%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_196', label: '', left: '40.30%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_197', label: '', left: '41.90%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_198', label: '', left: '43.60%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_199', label: '', left: '45.60%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_200', label: '', left: '47.20%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_201', label: '', left: '49.00%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_202', label: '', left: '50.60%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_203', label: '', left: '52.30%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_204', label: '', left: '54.20%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_205', label: '', left: '56.00%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_206', label: '', left: '57.70%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_207', label: '', left: '59.30%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_208', label: '', left: '61.10%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_209', label: '', left: '62.80%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_210', label: '', left: '64.50%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_211', label: '', left: '66.30%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_212', label: '', left: '68.00%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_213', label: '', left: '69.70%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_214', label: '', left: '71.50%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_215', label: '', left: '73.20%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_216', label: '', left: '74.90%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_217', label: '', left: '76.70%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_218', label: '', left: '78.50%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_219', label: '', left: '80.20%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_220', label: '', left: '82.00%', top: '17.30%', width: '1.47%', height: '1.56%' },
            { id: 'gf_221', label: '', left: '84.30%', top: '17.30%', width: '1.97%', height: '1.56%' },
            { id: 'gf_222', label: '', left: '87.20%', top: '17.30%', width: '2.47%', height: '1.56%' },
            { id: 'gf_223', label: '', left: '90.20%', top: '17.30%', width: '1.77%', height: '1.56%' },
            { id: 'gf_224', label: '', left: '92.70%', top: '17.30%', width: '1.77%', height: '1.56%' },
            { id: 'gf_225', label: '', left: '94.80%', top: '17.30%', width: '1.77%', height: '1.56%' },

            /* 第 4 排（top 19.00%）gf_226 ~ gf_261 */
            { id: 'gf_226', label: '', left: '30.00%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_227', label: '', left: '31.70%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_228', label: '', left: '33.50%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_229', label: '', left: '35.00%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_230', label: '', left: '36.70%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_231', label: '', left: '38.50%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_232', label: '', left: '40.30%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_233', label: '', left: '41.90%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_234', label: '', left: '43.60%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_235', label: '', left: '45.60%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_236', label: '', left: '47.20%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_237', label: '', left: '49.00%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_238', label: '', left: '50.60%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_239', label: '', left: '52.30%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_240', label: '', left: '54.20%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_241', label: '', left: '56.00%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_242', label: '', left: '57.70%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_243', label: '', left: '59.30%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_244', label: '', left: '61.10%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_245', label: '', left: '62.80%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_246', label: '', left: '64.50%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_247', label: '', left: '66.30%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_248', label: '', left: '68.00%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_249', label: '', left: '69.70%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_250', label: '', left: '71.50%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_251', label: '', left: '73.20%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_252', label: '', left: '74.90%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_253', label: '', left: '76.70%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_254', label: '', left: '78.50%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_255', label: '', left: '80.20%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_256', label: '', left: '82.00%', top: '18.80%', width: '1.47%', height: '1.56%' },
            { id: 'gf_257', label: '', left: '84.30%', top: '18.80%', width: '1.97%', height: '1.56%' },
            { id: 'gf_258', label: '', left: '87.20%', top: '18.80%', width: '2.47%', height: '1.56%' },
            { id: 'gf_259', label: '', left: '90.20%', top: '18.80%', width: '1.77%', height: '1.56%' },
            { id: 'gf_260', label: '', left: '92.70%', top: '18.80%', width: '1.77%', height: '1.56%' },
            { id: 'gf_261', label: '', left: '94.80%', top: '18.80%', width: '1.77%', height: '1.56%' },
            /* ============================================================
   ★ 新增 4 排（top 20.3% / 21.80% / 23.3% / 24.8%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */

/* 第 1 排（top 20.3%）gf_262 ~ gf_297 */
{ id: 'gf_262', label: '', left: '30.00%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_263', label: '', left: '31.70%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_264', label: '', left: '33.50%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_265', label: '', left: '35.00%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_266', label: '', left: '36.70%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_267', label: '', left: '38.50%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_268', label: '', left: '40.30%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_269', label: '', left: '41.90%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_270', label: '', left: '43.60%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_271', label: '', left: '45.60%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_272', label: '', left: '47.20%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_273', label: '', left: '49.00%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_274', label: '', left: '50.60%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_275', label: '', left: '52.30%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_276', label: '', left: '54.20%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_277', label: '', left: '56.00%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_278', label: '', left: '57.70%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_279', label: '', left: '59.30%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_280', label: '', left: '61.10%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_281', label: '', left: '62.80%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_282', label: '', left: '64.50%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_283', label: '', left: '66.30%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_284', label: '', left: '68.00%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_285', label: '', left: '69.70%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_286', label: '', left: '71.50%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_287', label: '', left: '73.20%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_288', label: '', left: '74.90%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_289', label: '', left: '76.70%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_290', label: '', left: '78.50%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_291', label: '', left: '80.20%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_292', label: '', left: '82.00%', top: '21.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_293', label: '', left: '84.30%', top: '21.80%',  width: '1.97%', height: '1.56%' },
{ id: 'gf_294', label: '', left: '87.20%', top: '21.80%',  width: '2.47%', height: '1.56%' },
{ id: 'gf_295', label: '', left: '90.20%', top: '21.80%',  width: '1.77%', height: '1.56%' },
{ id: 'gf_296', label: '', left: '92.70%', top: '21.80%',  width: '1.77%', height: '1.56%' },
{ id: 'gf_297', label: '', left: '94.80%', top: '21.80%',  width: '1.77%', height: '1.56%' },

/* 第 2 排（top 21.80%）gf_298 ~ gf_333 */
{ id: 'gf_298', label: '', left: '30.00%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_299', label: '', left: '31.70%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_300', label: '', left: '33.50%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_301', label: '', left: '35.00%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_302', label: '', left: '36.70%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_303', label: '', left: '38.50%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_304', label: '', left: '40.30%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_305', label: '', left: '41.90%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_306', label: '', left: '43.60%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_307', label: '', left: '45.60%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_308', label: '', left: '47.20%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_309', label: '', left: '49.00%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_310', label: '', left: '50.60%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_311', label: '', left: '52.30%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_312', label: '', left: '54.20%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_313', label: '', left: '56.00%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_314', label: '', left: '57.70%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_315', label: '', left: '59.30%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_316', label: '', left: '61.10%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_317', label: '', left: '62.80%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_318', label: '', left: '64.50%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_319', label: '', left: '66.30%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_320', label: '', left: '68.00%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_321', label: '', left: '69.70%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_322', label: '', left: '71.50%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_323', label: '', left: '73.20%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_324', label: '', left: '74.90%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_325', label: '', left: '76.70%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_326', label: '', left: '78.50%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_327', label: '', left: '80.20%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_328', label: '', left: '82.00%', top: '23.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_329', label: '', left: '84.30%', top: '23.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_330', label: '', left: '87.20%', top: '23.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_331', label: '', left: '90.20%', top: '23.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_332', label: '', left: '92.70%', top: '23.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_333', label: '', left: '94.80%', top: '23.30%', width: '1.77%', height: '1.56%' },

/* 第 3 排（top 23.3%）gf_334 ~ gf_369 */
{ id: 'gf_334', label: '', left: '30.00%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_335', label: '', left: '31.70%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_336', label: '', left: '33.50%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_337', label: '', left: '35.00%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_338', label: '', left: '36.70%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_339', label: '', left: '38.50%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_340', label: '', left: '40.30%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_341', label: '', left: '41.90%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_342', label: '', left: '43.60%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_343', label: '', left: '45.60%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_344', label: '', left: '47.20%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_345', label: '', left: '49.00%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_346', label: '', left: '50.60%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_347', label: '', left: '52.30%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_348', label: '', left: '54.20%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_349', label: '', left: '56.00%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_350', label: '', left: '57.70%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_351', label: '', left: '59.30%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_352', label: '', left: '61.10%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_353', label: '', left: '62.80%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_354', label: '', left: '64.50%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_355', label: '', left: '66.30%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_356', label: '', left: '68.00%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_357', label: '', left: '69.70%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_358', label: '', left: '71.50%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_359', label: '', left: '73.20%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_360', label: '', left: '74.90%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_361', label: '', left: '76.70%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_362', label: '', left: '78.50%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_363', label: '', left: '80.20%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_364', label: '', left: '82.00%', top: '24.80%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_365', label: '', left: '84.30%', top: '24.80%',  width: '1.97%', height: '1.56%' },
{ id: 'gf_366', label: '', left: '87.20%', top: '24.80%',  width: '2.47%', height: '1.56%' },
{ id: 'gf_367', label: '', left: '90.20%', top: '24.80%',  width: '1.77%', height: '1.56%' },
{ id: 'gf_368', label: '', left: '92.70%', top: '24.80%',  width: '1.77%', height: '1.56%' },
{ id: 'gf_369', label: '', left: '94.80%', top: '24.80%',  width: '1.77%', height: '1.56%' },

/* 第 4 排（top 24.8%）gf_370 ~ gf_405 */
{ id: 'gf_370', label: '', left: '30.00%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_371', label: '', left: '31.70%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_372', label: '', left: '33.50%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_373', label: '', left: '35.00%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_374', label: '', left: '36.70%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_375', label: '', left: '38.50%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_376', label: '', left: '40.30%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_377', label: '', left: '41.90%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_378', label: '', left: '43.60%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_379', label: '', left: '45.60%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_380', label: '', left: '47.20%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_381', label: '', left: '49.00%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_382', label: '', left: '50.60%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_383', label: '', left: '52.30%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_384', label: '', left: '54.20%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_385', label: '', left: '56.00%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_386', label: '', left: '57.70%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_387', label: '', left: '59.30%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_388', label: '', left: '61.10%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_389', label: '', left: '62.80%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_390', label: '', left: '64.50%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_391', label: '', left: '66.30%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_392', label: '', left: '68.00%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_393', label: '', left: '69.70%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_394', label: '', left: '71.50%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_395', label: '', left: '73.20%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_396', label: '', left: '74.90%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_397', label: '', left: '76.70%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_398', label: '', left: '78.50%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_399', label: '', left: '80.20%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_400', label: '', left: '82.00%', top: '26.70%',  width: '1.47%', height: '1.56%' },
{ id: 'gf_401', label: '', left: '84.30%', top: '26.70%',  width: '1.97%', height: '1.56%' },
{ id: 'gf_402', label: '', left: '87.20%', top: '26.70%',  width: '2.47%', height: '1.56%' },
{ id: 'gf_403', label: '', left: '90.20%', top: '26.70%',  width: '1.77%', height: '1.56%' },
{ id: 'gf_404', label: '', left: '92.70%', top: '26.70%',  width: '1.77%', height: '1.56%' },
{ id: 'gf_405', label: '', left: '94.80%', top: '26.70%',  width: '1.77%', height: '1.56%' },
/* ============================================================
   ★ 新增 1 排（top 28.40%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */
{ id: 'gf_406', label: '', left: '30.00%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_407', label: '', left: '31.70%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_408', label: '', left: '33.50%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_409', label: '', left: '35.00%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_410', label: '', left: '36.70%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_411', label: '', left: '38.50%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_412', label: '', left: '40.30%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_413', label: '', left: '41.90%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_414', label: '', left: '43.60%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_415', label: '', left: '45.60%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_416', label: '', left: '47.20%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_417', label: '', left: '49.00%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_418', label: '', left: '50.60%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_419', label: '', left: '52.30%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_420', label: '', left: '54.20%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_421', label: '', left: '56.00%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_422', label: '', left: '57.70%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_423', label: '', left: '59.30%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_424', label: '', left: '61.10%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_425', label: '', left: '62.80%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_426', label: '', left: '64.50%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_427', label: '', left: '66.30%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_428', label: '', left: '68.00%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_429', label: '', left: '69.70%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_430', label: '', left: '71.50%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_431', label: '', left: '73.20%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_432', label: '', left: '74.90%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_433', label: '', left: '76.70%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_434', label: '', left: '78.50%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_435', label: '', left: '80.20%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_436', label: '', left: '82.00%', top: '28.40%', width: '1.47%', height: '1.56%' },
{ id: 'gf_437', label: '', left: '84.30%', top: '28.40%', width: '1.97%', height: '1.56%' },
{ id: 'gf_438', label: '', left: '87.20%', top: '28.40%', width: '2.47%', height: '1.56%' },
{ id: 'gf_439', label: '', left: '90.20%', top: '28.40%', width: '1.77%', height: '1.56%' },
{ id: 'gf_440', label: '', left: '92.70%', top: '28.40%', width: '1.77%', height: '1.56%' },
{ id: 'gf_441', label: '', left: '94.80%', top: '28.40%', width: '1.77%', height: '1.56%' },
/* ============================================================
   ★ 新增 1 排（top 31.40%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */
{ id: 'gf_442', label: '', left: '30.00%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_443', label: '', left: '31.70%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_444', label: '', left: '33.50%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_445', label: '', left: '35.00%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_446', label: '', left: '36.70%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_447', label: '', left: '38.50%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_448', label: '', left: '40.30%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_449', label: '', left: '41.90%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_450', label: '', left: '43.60%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_451', label: '', left: '45.60%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_452', label: '', left: '47.20%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_453', label: '', left: '49.00%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_454', label: '', left: '50.60%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_455', label: '', left: '52.30%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_456', label: '', left: '54.20%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_457', label: '', left: '56.00%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_458', label: '', left: '57.70%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_459', label: '', left: '59.30%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_460', label: '', left: '61.10%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_461', label: '', left: '62.80%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_462', label: '', left: '64.50%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_463', label: '', left: '66.30%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_464', label: '', left: '68.00%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_465', label: '', left: '69.70%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_466', label: '', left: '71.50%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_467', label: '', left: '73.20%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_468', label: '', left: '74.90%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_469', label: '', left: '76.70%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_470', label: '', left: '78.50%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_471', label: '', left: '80.20%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_472', label: '', left: '82.00%', top: '31.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_473', label: '', left: '84.30%', top: '31.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_474', label: '', left: '87.20%', top: '31.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_475', label: '', left: '90.20%', top: '31.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_476', label: '', left: '92.70%', top: '31.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_477', label: '', left: '94.80%', top: '31.30%', width: '1.77%', height: '1.56%' },
/* ============================================================
   ★ 新增 10 排（top 32.80% 起，每排 +1.5%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */

/* 第 1 排（top 32.80%）gf_478 ~ gf_513 */
{ id: 'gf_478', label: '', left: '30.00%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_479', label: '', left: '31.70%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_480', label: '', left: '33.50%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_481', label: '', left: '35.00%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_482', label: '', left: '36.70%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_483', label: '', left: '38.50%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_484', label: '', left: '40.30%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_485', label: '', left: '41.90%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_486', label: '', left: '43.60%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_487', label: '', left: '45.60%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_488', label: '', left: '47.20%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_489', label: '', left: '49.00%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_490', label: '', left: '50.60%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_491', label: '', left: '52.30%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_492', label: '', left: '54.20%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_493', label: '', left: '56.00%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_494', label: '', left: '57.70%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_495', label: '', left: '59.30%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_496', label: '', left: '61.10%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_497', label: '', left: '62.80%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_498', label: '', left: '64.50%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_499', label: '', left: '66.30%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_500', label: '', left: '68.00%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_501', label: '', left: '69.70%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_502', label: '', left: '71.50%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_503', label: '', left: '73.20%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_504', label: '', left: '74.90%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_505', label: '', left: '76.70%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_506', label: '', left: '78.50%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_507', label: '', left: '80.20%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_508', label: '', left: '82.00%', top: '32.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_509', label: '', left: '84.30%', top: '32.80%', width: '1.97%', height: '1.56%' },
{ id: 'gf_510', label: '', left: '87.20%', top: '32.80%', width: '2.47%', height: '1.56%' },
{ id: 'gf_511', label: '', left: '90.20%', top: '32.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_512', label: '', left: '92.70%', top: '32.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_513', label: '', left: '94.80%', top: '32.80%', width: '1.77%', height: '1.56%' },

/* 第 2 排（top 34.30%）gf_514 ~ gf_549 */
{ id: 'gf_514', label: '', left: '30.00%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_515', label: '', left: '31.70%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_516', label: '', left: '33.50%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_517', label: '', left: '35.00%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_518', label: '', left: '36.70%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_519', label: '', left: '38.50%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_520', label: '', left: '40.30%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_521', label: '', left: '41.90%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_522', label: '', left: '43.60%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_523', label: '', left: '45.60%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_524', label: '', left: '47.20%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_525', label: '', left: '49.00%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_526', label: '', left: '50.60%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_527', label: '', left: '52.30%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_528', label: '', left: '54.20%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_529', label: '', left: '56.00%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_530', label: '', left: '57.70%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_531', label: '', left: '59.30%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_532', label: '', left: '61.10%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_533', label: '', left: '62.80%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_534', label: '', left: '64.50%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_535', label: '', left: '66.30%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_536', label: '', left: '68.00%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_537', label: '', left: '69.70%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_538', label: '', left: '71.50%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_539', label: '', left: '73.20%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_540', label: '', left: '74.90%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_541', label: '', left: '76.70%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_542', label: '', left: '78.50%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_543', label: '', left: '80.20%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_544', label: '', left: '82.00%', top: '34.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_545', label: '', left: '84.30%', top: '34.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_546', label: '', left: '87.20%', top: '34.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_547', label: '', left: '90.20%', top: '34.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_548', label: '', left: '92.70%', top: '34.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_549', label: '', left: '94.80%', top: '34.30%', width: '1.77%', height: '1.56%' },

/* 第 3 排（top 35.80%）gf_550 ~ gf_585 */
{ id: 'gf_550', label: '', left: '30.00%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_551', label: '', left: '31.70%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_552', label: '', left: '33.50%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_553', label: '', left: '35.00%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_554', label: '', left: '36.70%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_555', label: '', left: '38.50%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_556', label: '', left: '40.30%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_557', label: '', left: '41.90%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_558', label: '', left: '43.60%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_559', label: '', left: '45.60%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_560', label: '', left: '47.20%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_561', label: '', left: '49.00%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_562', label: '', left: '50.60%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_563', label: '', left: '52.30%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_564', label: '', left: '54.20%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_565', label: '', left: '56.00%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_566', label: '', left: '57.70%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_567', label: '', left: '59.30%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_568', label: '', left: '61.10%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_569', label: '', left: '62.80%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_570', label: '', left: '64.50%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_571', label: '', left: '66.30%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_572', label: '', left: '68.00%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_573', label: '', left: '69.70%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_574', label: '', left: '71.50%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_575', label: '', left: '73.20%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_576', label: '', left: '74.90%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_577', label: '', left: '76.70%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_578', label: '', left: '78.50%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_579', label: '', left: '80.20%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_580', label: '', left: '82.00%', top: '35.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_581', label: '', left: '84.30%', top: '35.80%', width: '1.97%', height: '1.56%' },
{ id: 'gf_582', label: '', left: '87.20%', top: '35.80%', width: '2.47%', height: '1.56%' },
{ id: 'gf_583', label: '', left: '90.20%', top: '35.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_584', label: '', left: '92.70%', top: '35.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_585', label: '', left: '94.80%', top: '35.80%', width: '1.77%', height: '1.56%' },

/* 第 4 排（top 37.30%）gf_586 ~ gf_621 */
{ id: 'gf_586', label: '', left: '30.00%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_587', label: '', left: '31.70%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_588', label: '', left: '33.50%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_589', label: '', left: '35.00%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_590', label: '', left: '36.70%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_591', label: '', left: '38.50%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_592', label: '', left: '40.30%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_593', label: '', left: '41.90%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_594', label: '', left: '43.60%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_595', label: '', left: '45.60%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_596', label: '', left: '47.20%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_597', label: '', left: '49.00%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_598', label: '', left: '50.60%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_599', label: '', left: '52.30%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_600', label: '', left: '54.20%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_601', label: '', left: '56.00%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_602', label: '', left: '57.70%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_603', label: '', left: '59.30%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_604', label: '', left: '61.10%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_605', label: '', left: '62.80%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_606', label: '', left: '64.50%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_607', label: '', left: '66.30%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_608', label: '', left: '68.00%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_609', label: '', left: '69.70%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_610', label: '', left: '71.50%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_611', label: '', left: '73.20%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_612', label: '', left: '74.90%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_613', label: '', left: '76.70%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_614', label: '', left: '78.50%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_615', label: '', left: '80.20%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_616', label: '', left: '82.00%', top: '37.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_617', label: '', left: '84.30%', top: '37.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_618', label: '', left: '87.20%', top: '37.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_619', label: '', left: '90.20%', top: '37.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_620', label: '', left: '92.70%', top: '37.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_621', label: '', left: '94.80%', top: '37.30%', width: '1.77%', height: '1.56%' },

/* 第 5 排（top 38.80%）gf_622 ~ gf_657 */
{ id: 'gf_622', label: '', left: '30.00%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_623', label: '', left: '31.70%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_624', label: '', left: '33.50%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_625', label: '', left: '35.00%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_626', label: '', left: '36.70%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_627', label: '', left: '38.50%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_628', label: '', left: '40.30%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_629', label: '', left: '41.90%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_630', label: '', left: '43.60%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_631', label: '', left: '45.60%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_632', label: '', left: '47.20%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_633', label: '', left: '49.00%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_634', label: '', left: '50.60%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_635', label: '', left: '52.30%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_636', label: '', left: '54.20%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_637', label: '', left: '56.00%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_638', label: '', left: '57.70%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_639', label: '', left: '59.30%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_640', label: '', left: '61.10%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_641', label: '', left: '62.80%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_642', label: '', left: '64.50%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_643', label: '', left: '66.30%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_644', label: '', left: '68.00%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_645', label: '', left: '69.70%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_646', label: '', left: '71.50%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_647', label: '', left: '73.20%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_648', label: '', left: '74.90%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_649', label: '', left: '76.70%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_650', label: '', left: '78.50%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_651', label: '', left: '80.20%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_652', label: '', left: '82.00%', top: '38.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_653', label: '', left: '84.30%', top: '38.80%', width: '1.97%', height: '1.56%' },
{ id: 'gf_654', label: '', left: '87.20%', top: '38.80%', width: '2.47%', height: '1.56%' },
{ id: 'gf_655', label: '', left: '90.20%', top: '38.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_656', label: '', left: '92.70%', top: '38.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_657', label: '', left: '94.80%', top: '38.80%', width: '1.77%', height: '1.56%' },

/* 第 6 排（top 40.30%）gf_658 ~ gf_693 */
{ id: 'gf_658', label: '', left: '30.00%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_659', label: '', left: '31.70%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_660', label: '', left: '33.50%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_661', label: '', left: '35.00%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_662', label: '', left: '36.70%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_663', label: '', left: '38.50%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_664', label: '', left: '40.30%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_665', label: '', left: '41.90%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_666', label: '', left: '43.60%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_667', label: '', left: '45.60%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_668', label: '', left: '47.20%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_669', label: '', left: '49.00%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_670', label: '', left: '50.60%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_671', label: '', left: '52.30%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_672', label: '', left: '54.20%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_673', label: '', left: '56.00%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_674', label: '', left: '57.70%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_675', label: '', left: '59.30%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_676', label: '', left: '61.10%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_677', label: '', left: '62.80%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_678', label: '', left: '64.50%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_679', label: '', left: '66.30%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_680', label: '', left: '68.00%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_681', label: '', left: '69.70%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_682', label: '', left: '71.50%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_683', label: '', left: '73.20%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_684', label: '', left: '74.90%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_685', label: '', left: '76.70%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_686', label: '', left: '78.50%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_687', label: '', left: '80.20%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_688', label: '', left: '82.00%', top: '40.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_689', label: '', left: '84.30%', top: '40.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_690', label: '', left: '87.20%', top: '40.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_691', label: '', left: '90.20%', top: '40.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_692', label: '', left: '92.70%', top: '40.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_693', label: '', left: '94.80%', top: '40.30%', width: '1.77%', height: '1.56%' },

/* 第 7 排（top 41.80%）gf_694 ~ gf_729 */
{ id: 'gf_694', label: '', left: '30.00%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_695', label: '', left: '31.70%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_696', label: '', left: '33.50%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_697', label: '', left: '35.00%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_698', label: '', left: '36.70%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_699', label: '', left: '38.50%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_700', label: '', left: '40.30%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_701', label: '', left: '41.90%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_702', label: '', left: '43.60%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_703', label: '', left: '45.60%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_704', label: '', left: '47.20%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_705', label: '', left: '49.00%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_706', label: '', left: '50.60%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_707', label: '', left: '52.30%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_708', label: '', left: '54.20%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_709', label: '', left: '56.00%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_710', label: '', left: '57.70%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_711', label: '', left: '59.30%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_712', label: '', left: '61.10%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_713', label: '', left: '62.80%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_714', label: '', left: '64.50%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_715', label: '', left: '66.30%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_716', label: '', left: '68.00%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_717', label: '', left: '69.70%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_718', label: '', left: '71.50%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_719', label: '', left: '73.20%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_720', label: '', left: '74.90%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_721', label: '', left: '76.70%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_722', label: '', left: '78.50%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_723', label: '', left: '80.20%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_724', label: '', left: '82.00%', top: '41.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_725', label: '', left: '84.30%', top: '41.80%', width: '1.97%', height: '1.56%' },
{ id: 'gf_726', label: '', left: '87.20%', top: '41.80%', width: '2.47%', height: '1.56%' },
{ id: 'gf_727', label: '', left: '90.20%', top: '41.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_728', label: '', left: '92.70%', top: '41.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_729', label: '', left: '94.80%', top: '41.80%', width: '1.77%', height: '1.56%' },

/* 第 8 排（top 43.30%）gf_730 ~ gf_765 */
{ id: 'gf_730', label: '', left: '30.00%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_731', label: '', left: '31.70%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_732', label: '', left: '33.50%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_733', label: '', left: '35.00%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_734', label: '', left: '36.70%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_735', label: '', left: '38.50%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_736', label: '', left: '40.30%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_737', label: '', left: '41.90%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_738', label: '', left: '43.60%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_739', label: '', left: '45.60%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_740', label: '', left: '47.20%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_741', label: '', left: '49.00%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_742', label: '', left: '50.60%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_743', label: '', left: '52.30%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_744', label: '', left: '54.20%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_745', label: '', left: '56.00%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_746', label: '', left: '57.70%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_747', label: '', left: '59.30%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_748', label: '', left: '61.10%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_749', label: '', left: '62.80%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_750', label: '', left: '64.50%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_751', label: '', left: '66.30%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_752', label: '', left: '68.00%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_753', label: '', left: '69.70%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_754', label: '', left: '71.50%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_755', label: '', left: '73.20%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_756', label: '', left: '74.90%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_757', label: '', left: '76.70%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_758', label: '', left: '78.50%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_759', label: '', left: '80.20%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_760', label: '', left: '82.00%', top: '43.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_761', label: '', left: '84.30%', top: '43.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_762', label: '', left: '87.20%', top: '43.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_763', label: '', left: '90.20%', top: '43.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_764', label: '', left: '92.70%', top: '43.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_765', label: '', left: '94.80%', top: '43.30%', width: '1.77%', height: '1.56%' },

/* 第 9 排（top 44.80%）gf_766 ~ gf_801 */
{ id: 'gf_766', label: '', left: '30.00%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_767', label: '', left: '31.70%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_768', label: '', left: '33.50%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_769', label: '', left: '35.00%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_770', label: '', left: '36.70%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_771', label: '', left: '38.50%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_772', label: '', left: '40.30%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_773', label: '', left: '41.90%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_774', label: '', left: '43.60%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_775', label: '', left: '45.60%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_776', label: '', left: '47.20%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_777', label: '', left: '49.00%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_778', label: '', left: '50.60%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_779', label: '', left: '52.30%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_780', label: '', left: '54.20%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_781', label: '', left: '56.00%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_782', label: '', left: '57.70%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_783', label: '', left: '59.30%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_784', label: '', left: '61.10%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_785', label: '', left: '62.80%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_786', label: '', left: '64.50%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_787', label: '', left: '66.30%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_788', label: '', left: '68.00%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_789', label: '', left: '69.70%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_790', label: '', left: '71.50%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_791', label: '', left: '73.20%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_792', label: '', left: '74.90%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_793', label: '', left: '76.70%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_794', label: '', left: '78.50%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_795', label: '', left: '80.20%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_796', label: '', left: '82.00%', top: '44.80%', width: '1.47%', height: '1.56%' },
{ id: 'gf_797', label: '', left: '84.30%', top: '44.80%', width: '1.97%', height: '1.56%' },
{ id: 'gf_798', label: '', left: '87.20%', top: '44.80%', width: '2.47%', height: '1.56%' },
{ id: 'gf_799', label: '', left: '90.20%', top: '44.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_800', label: '', left: '92.70%', top: '44.80%', width: '1.77%', height: '1.56%' },
{ id: 'gf_801', label: '', left: '94.80%', top: '44.80%', width: '1.77%', height: '1.56%' },

/* 第 10 排（top 46.30%）gf_802 ~ gf_837 */
{ id: 'gf_802', label: '', left: '30.00%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_803', label: '', left: '31.70%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_804', label: '', left: '33.50%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_805', label: '', left: '35.00%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_806', label: '', left: '36.70%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_807', label: '', left: '38.50%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_808', label: '', left: '40.30%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_809', label: '', left: '41.90%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_810', label: '', left: '43.60%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_811', label: '', left: '45.60%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_812', label: '', left: '47.20%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_813', label: '', left: '49.00%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_814', label: '', left: '50.60%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_815', label: '', left: '52.30%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_816', label: '', left: '54.20%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_817', label: '', left: '56.00%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_818', label: '', left: '57.70%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_819', label: '', left: '59.30%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_820', label: '', left: '61.10%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_821', label: '', left: '62.80%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_822', label: '', left: '64.50%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_823', label: '', left: '66.30%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_824', label: '', left: '68.00%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_825', label: '', left: '69.70%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_826', label: '', left: '71.50%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_827', label: '', left: '73.20%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_828', label: '', left: '74.90%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_829', label: '', left: '76.70%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_830', label: '', left: '78.50%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_831', label: '', left: '80.20%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_832', label: '', left: '82.00%', top: '46.30%', width: '1.47%', height: '1.56%' },
{ id: 'gf_833', label: '', left: '84.30%', top: '46.30%', width: '1.97%', height: '1.56%' },
{ id: 'gf_834', label: '', left: '87.20%', top: '46.30%', width: '2.47%', height: '1.56%' },
{ id: 'gf_835', label: '', left: '90.20%', top: '46.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_836', label: '', left: '92.70%', top: '46.30%', width: '1.77%', height: '1.56%' },
{ id: 'gf_837', label: '', left: '94.80%', top: '46.30%', width: '1.77%', height: '1.56%' },
/* ============================================================
   ★ 新增 12 排（top 47.70% 起，每排 +1.5%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */

/* 第 1 排（top 47.70%）gf_838 ~ gf_873 */
{ id: 'gf_838', label: '', left: '30.00%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_839', label: '', left: '31.70%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_840', label: '', left: '33.50%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_841', label: '', left: '35.00%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_842', label: '', left: '36.70%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_843', label: '', left: '38.50%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_844', label: '', left: '40.30%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_845', label: '', left: '41.90%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_846', label: '', left: '43.60%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_847', label: '', left: '45.60%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_848', label: '', left: '47.20%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_849', label: '', left: '49.00%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_850', label: '', left: '50.60%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_851', label: '', left: '52.30%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_852', label: '', left: '54.20%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_853', label: '', left: '56.00%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_854', label: '', left: '57.70%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_855', label: '', left: '59.30%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_856', label: '', left: '61.10%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_857', label: '', left: '62.80%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_858', label: '', left: '64.50%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_859', label: '', left: '66.30%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_860', label: '', left: '68.00%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_861', label: '', left: '69.70%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_862', label: '', left: '71.50%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_863', label: '', left: '73.20%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_864', label: '', left: '74.90%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_865', label: '', left: '76.70%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_866', label: '', left: '78.50%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_867', label: '', left: '80.20%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_868', label: '', left: '82.00%', top: '47.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_869', label: '', left: '84.30%', top: '47.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_870', label: '', left: '87.20%', top: '47.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_871', label: '', left: '90.20%', top: '47.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_872', label: '', left: '92.70%', top: '47.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_873', label: '', left: '94.80%', top: '47.70%', width: '1.77%', height: '1.56%' },

/* 第 2 排（top 49.20%）gf_874 ~ gf_909 */
{ id: 'gf_874', label: '', left: '30.00%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_875', label: '', left: '31.70%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_876', label: '', left: '33.50%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_877', label: '', left: '35.00%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_878', label: '', left: '36.70%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_879', label: '', left: '38.50%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_880', label: '', left: '40.30%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_881', label: '', left: '41.90%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_882', label: '', left: '43.60%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_883', label: '', left: '45.60%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_884', label: '', left: '47.20%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_885', label: '', left: '49.00%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_886', label: '', left: '50.60%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_887', label: '', left: '52.30%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_888', label: '', left: '54.20%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_889', label: '', left: '56.00%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_890', label: '', left: '57.70%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_891', label: '', left: '59.30%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_892', label: '', left: '61.10%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_893', label: '', left: '62.80%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_894', label: '', left: '64.50%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_895', label: '', left: '66.30%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_896', label: '', left: '68.00%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_897', label: '', left: '69.70%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_898', label: '', left: '71.50%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_899', label: '', left: '73.20%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_900', label: '', left: '74.90%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_901', label: '', left: '76.70%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_902', label: '', left: '78.50%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_903', label: '', left: '80.20%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_904', label: '', left: '82.00%', top: '49.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_905', label: '', left: '84.30%', top: '49.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_906', label: '', left: '87.20%', top: '49.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_907', label: '', left: '90.20%', top: '49.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_908', label: '', left: '92.70%', top: '49.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_909', label: '', left: '94.80%', top: '49.20%', width: '1.77%', height: '1.56%' },

/* 第 3 排（top 50.70%）gf_910 ~ gf_945 */
{ id: 'gf_910', label: '', left: '30.00%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_911', label: '', left: '31.70%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_912', label: '', left: '33.50%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_913', label: '', left: '35.00%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_914', label: '', left: '36.70%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_915', label: '', left: '38.50%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_916', label: '', left: '40.30%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_917', label: '', left: '41.90%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_918', label: '', left: '43.60%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_919', label: '', left: '45.60%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_920', label: '', left: '47.20%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_921', label: '', left: '49.00%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_922', label: '', left: '50.60%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_923', label: '', left: '52.30%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_924', label: '', left: '54.20%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_925', label: '', left: '56.00%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_926', label: '', left: '57.70%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_927', label: '', left: '59.30%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_928', label: '', left: '61.10%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_929', label: '', left: '62.80%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_930', label: '', left: '64.50%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_931', label: '', left: '66.30%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_932', label: '', left: '68.00%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_933', label: '', left: '69.70%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_934', label: '', left: '71.50%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_935', label: '', left: '73.20%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_936', label: '', left: '74.90%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_937', label: '', left: '76.70%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_938', label: '', left: '78.50%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_939', label: '', left: '80.20%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_940', label: '', left: '82.00%', top: '50.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_941', label: '', left: '84.30%', top: '50.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_942', label: '', left: '87.20%', top: '50.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_943', label: '', left: '90.20%', top: '50.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_944', label: '', left: '92.70%', top: '50.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_945', label: '', left: '94.80%', top: '50.70%', width: '1.77%', height: '1.56%' },

/* 第 4 排（top 52.20%）gf_946 ~ gf_981 */
{ id: 'gf_946', label: '', left: '30.00%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_947', label: '', left: '31.70%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_948', label: '', left: '33.50%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_949', label: '', left: '35.00%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_950', label: '', left: '36.70%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_951', label: '', left: '38.50%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_952', label: '', left: '40.30%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_953', label: '', left: '41.90%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_954', label: '', left: '43.60%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_955', label: '', left: '45.60%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_956', label: '', left: '47.20%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_957', label: '', left: '49.00%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_958', label: '', left: '50.60%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_959', label: '', left: '52.30%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_960', label: '', left: '54.20%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_961', label: '', left: '56.00%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_962', label: '', left: '57.70%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_963', label: '', left: '59.30%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_964', label: '', left: '61.10%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_965', label: '', left: '62.80%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_966', label: '', left: '64.50%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_967', label: '', left: '66.30%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_968', label: '', left: '68.00%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_969', label: '', left: '69.70%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_970', label: '', left: '71.50%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_971', label: '', left: '73.20%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_972', label: '', left: '74.90%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_973', label: '', left: '76.70%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_974', label: '', left: '78.50%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_975', label: '', left: '80.20%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_976', label: '', left: '82.00%', top: '52.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_977', label: '', left: '84.30%', top: '52.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_978', label: '', left: '87.20%', top: '52.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_979', label: '', left: '90.20%', top: '52.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_980', label: '', left: '92.70%', top: '52.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_981', label: '', left: '94.80%', top: '52.20%', width: '1.77%', height: '1.56%' },

/* 第 5 排（top 53.70%）gf_982 ~ gf_1017 */
{ id: 'gf_982', label: '', left: '30.00%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_983', label: '', left: '31.70%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_984', label: '', left: '33.50%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_985', label: '', left: '35.00%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_986', label: '', left: '36.70%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_987', label: '', left: '38.50%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_988', label: '', left: '40.30%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_989', label: '', left: '41.90%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_990', label: '', left: '43.60%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_991', label: '', left: '45.60%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_992', label: '', left: '47.20%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_993', label: '', left: '49.00%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_994', label: '', left: '50.60%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_995', label: '', left: '52.30%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_996', label: '', left: '54.20%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_997', label: '', left: '56.00%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_998', label: '', left: '57.70%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_999', label: '', left: '59.30%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1000', label: '', left: '61.10%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1001', label: '', left: '62.80%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1002', label: '', left: '64.50%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1003', label: '', left: '66.30%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1004', label: '', left: '68.00%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1005', label: '', left: '69.70%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1006', label: '', left: '71.50%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1007', label: '', left: '73.20%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1008', label: '', left: '74.90%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1009', label: '', left: '76.70%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1010', label: '', left: '78.50%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1011', label: '', left: '80.20%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1012', label: '', left: '82.00%', top: '53.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1013', label: '', left: '84.30%', top: '53.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1014', label: '', left: '87.20%', top: '53.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1015', label: '', left: '90.20%', top: '53.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1016', label: '', left: '92.70%', top: '53.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1017', label: '', left: '94.80%', top: '53.70%', width: '1.77%', height: '1.56%' },

/* 第 6 排（top 55.20%）gf_1018 ~ gf_1053 */
{ id: 'gf_1018', label: '', left: '30.00%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1019', label: '', left: '31.70%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1020', label: '', left: '33.50%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1021', label: '', left: '35.00%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1022', label: '', left: '36.70%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1023', label: '', left: '38.50%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1024', label: '', left: '40.30%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1025', label: '', left: '41.90%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1026', label: '', left: '43.60%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1027', label: '', left: '45.60%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1028', label: '', left: '47.20%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1029', label: '', left: '49.00%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1030', label: '', left: '50.60%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1031', label: '', left: '52.30%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1032', label: '', left: '54.20%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1033', label: '', left: '56.00%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1034', label: '', left: '57.70%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1035', label: '', left: '59.30%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1036', label: '', left: '61.10%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1037', label: '', left: '62.80%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1038', label: '', left: '64.50%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1039', label: '', left: '66.30%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1040', label: '', left: '68.00%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1041', label: '', left: '69.70%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1042', label: '', left: '71.50%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1043', label: '', left: '73.20%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1044', label: '', left: '74.90%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1045', label: '', left: '76.70%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1046', label: '', left: '78.50%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1047', label: '', left: '80.20%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1048', label: '', left: '82.00%', top: '55.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1049', label: '', left: '84.30%', top: '55.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1050', label: '', left: '87.20%', top: '55.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1051', label: '', left: '90.20%', top: '55.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1052', label: '', left: '92.70%', top: '55.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1053', label: '', left: '94.80%', top: '55.20%', width: '1.77%', height: '1.56%' },

/* 第 7 排（top 56.70%）gf_1054 ~ gf_1089 */
{ id: 'gf_1054', label: '', left: '30.00%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1055', label: '', left: '31.70%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1056', label: '', left: '33.50%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1057', label: '', left: '35.00%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1058', label: '', left: '36.70%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1059', label: '', left: '38.50%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1060', label: '', left: '40.30%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1061', label: '', left: '41.90%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1062', label: '', left: '43.60%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1063', label: '', left: '45.60%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1064', label: '', left: '47.20%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1065', label: '', left: '49.00%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1066', label: '', left: '50.60%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1067', label: '', left: '52.30%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1068', label: '', left: '54.20%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1069', label: '', left: '56.00%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1070', label: '', left: '57.70%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1071', label: '', left: '59.30%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1072', label: '', left: '61.10%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1073', label: '', left: '62.80%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1074', label: '', left: '64.50%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1075', label: '', left: '66.30%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1076', label: '', left: '68.00%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1077', label: '', left: '69.70%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1078', label: '', left: '71.50%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1079', label: '', left: '73.20%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1080', label: '', left: '74.90%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1081', label: '', left: '76.70%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1082', label: '', left: '78.50%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1083', label: '', left: '80.20%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1084', label: '', left: '82.00%', top: '56.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1085', label: '', left: '84.30%', top: '56.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1086', label: '', left: '87.20%', top: '56.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1087', label: '', left: '90.20%', top: '56.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1088', label: '', left: '92.70%', top: '56.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1089', label: '', left: '94.80%', top: '56.70%', width: '1.77%', height: '1.56%' },

/* 第 8 排（top 58.20%）gf_1090 ~ gf_1125 */
{ id: 'gf_1090', label: '', left: '30.00%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1091', label: '', left: '31.70%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1092', label: '', left: '33.50%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1093', label: '', left: '35.00%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1094', label: '', left: '36.70%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1095', label: '', left: '38.50%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1096', label: '', left: '40.30%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1097', label: '', left: '41.90%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1098', label: '', left: '43.60%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1099', label: '', left: '45.60%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1100', label: '', left: '47.20%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1101', label: '', left: '49.00%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1102', label: '', left: '50.60%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1103', label: '', left: '52.30%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1104', label: '', left: '54.20%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1105', label: '', left: '56.00%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1106', label: '', left: '57.70%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1107', label: '', left: '59.30%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1108', label: '', left: '61.10%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1109', label: '', left: '62.80%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1110', label: '', left: '64.50%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1111', label: '', left: '66.30%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1112', label: '', left: '68.00%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1113', label: '', left: '69.70%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1114', label: '', left: '71.50%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1115', label: '', left: '73.20%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1116', label: '', left: '74.90%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1117', label: '', left: '76.70%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1118', label: '', left: '78.50%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1119', label: '', left: '80.20%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1120', label: '', left: '82.00%', top: '58.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1121', label: '', left: '84.30%', top: '58.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1122', label: '', left: '87.20%', top: '58.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1123', label: '', left: '90.20%', top: '58.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1124', label: '', left: '92.70%', top: '58.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1125', label: '', left: '94.80%', top: '58.20%', width: '1.77%', height: '1.56%' },

/* 第 9 排（top 59.70%）gf_1126 ~ gf_1161 */
{ id: 'gf_1126', label: '', left: '30.00%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1127', label: '', left: '31.70%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1128', label: '', left: '33.50%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1129', label: '', left: '35.00%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1130', label: '', left: '36.70%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1131', label: '', left: '38.50%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1132', label: '', left: '40.30%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1133', label: '', left: '41.90%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1134', label: '', left: '43.60%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1135', label: '', left: '45.60%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1136', label: '', left: '47.20%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1137', label: '', left: '49.00%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1138', label: '', left: '50.60%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1139', label: '', left: '52.30%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1140', label: '', left: '54.20%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1141', label: '', left: '56.00%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1142', label: '', left: '57.70%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1143', label: '', left: '59.30%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1144', label: '', left: '61.10%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1145', label: '', left: '62.80%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1146', label: '', left: '64.50%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1147', label: '', left: '66.30%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1148', label: '', left: '68.00%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1149', label: '', left: '69.70%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1150', label: '', left: '71.50%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1151', label: '', left: '73.20%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1152', label: '', left: '74.90%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1153', label: '', left: '76.70%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1154', label: '', left: '78.50%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1155', label: '', left: '80.20%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1156', label: '', left: '82.00%', top: '59.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1157', label: '', left: '84.30%', top: '59.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1158', label: '', left: '87.20%', top: '59.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1159', label: '', left: '90.20%', top: '59.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1160', label: '', left: '92.70%', top: '59.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1161', label: '', left: '94.80%', top: '59.70%', width: '1.77%', height: '1.56%' },

/* 第 10 排（top 61.20%）gf_1162 ~ gf_1197 */
{ id: 'gf_1162', label: '', left: '30.00%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1163', label: '', left: '31.70%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1164', label: '', left: '33.50%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1165', label: '', left: '35.00%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1166', label: '', left: '36.70%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1167', label: '', left: '38.50%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1168', label: '', left: '40.30%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1169', label: '', left: '41.90%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1170', label: '', left: '43.60%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1171', label: '', left: '45.60%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1172', label: '', left: '47.20%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1173', label: '', left: '49.00%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1174', label: '', left: '50.60%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1175', label: '', left: '52.30%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1176', label: '', left: '54.20%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1177', label: '', left: '56.00%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1178', label: '', left: '57.70%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1179', label: '', left: '59.30%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1180', label: '', left: '61.10%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1181', label: '', left: '62.80%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1182', label: '', left: '64.50%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1183', label: '', left: '66.30%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1184', label: '', left: '68.00%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1185', label: '', left: '69.70%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1186', label: '', left: '71.50%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1187', label: '', left: '73.20%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1188', label: '', left: '74.90%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1189', label: '', left: '76.70%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1190', label: '', left: '78.50%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1191', label: '', left: '80.20%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1192', label: '', left: '82.00%', top: '61.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1193', label: '', left: '84.30%', top: '61.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1194', label: '', left: '87.20%', top: '61.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1195', label: '', left: '90.20%', top: '61.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1196', label: '', left: '92.70%', top: '61.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1197', label: '', left: '94.80%', top: '61.20%', width: '1.77%', height: '1.56%' },

/* 第 11 排（top 62.70%）gf_1198 ~ gf_1233 */
{ id: 'gf_1198', label: '', left: '30.00%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1199', label: '', left: '31.70%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1200', label: '', left: '33.50%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1201', label: '', left: '35.00%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1202', label: '', left: '36.70%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1203', label: '', left: '38.50%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1204', label: '', left: '40.30%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1205', label: '', left: '41.90%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1206', label: '', left: '43.60%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1207', label: '', left: '45.60%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1208', label: '', left: '47.20%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1209', label: '', left: '49.00%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1210', label: '', left: '50.60%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1211', label: '', left: '52.30%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1212', label: '', left: '54.20%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1213', label: '', left: '56.00%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1214', label: '', left: '57.70%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1215', label: '', left: '59.30%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1216', label: '', left: '61.10%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1217', label: '', left: '62.80%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1218', label: '', left: '64.50%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1219', label: '', left: '66.30%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1220', label: '', left: '68.00%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1221', label: '', left: '69.70%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1222', label: '', left: '71.50%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1223', label: '', left: '73.20%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1224', label: '', left: '74.90%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1225', label: '', left: '76.70%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1226', label: '', left: '78.50%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1227', label: '', left: '80.20%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1228', label: '', left: '82.00%', top: '62.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1229', label: '', left: '84.30%', top: '62.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1230', label: '', left: '87.20%', top: '62.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1231', label: '', left: '90.20%', top: '62.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1232', label: '', left: '92.70%', top: '62.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1233', label: '', left: '94.80%', top: '62.70%', width: '1.77%', height: '1.56%' },

/* 第 12 排（top 64.20%）gf_1234 ~ gf_1269 */
{ id: 'gf_1234', label: '', left: '30.00%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1235', label: '', left: '31.70%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1236', label: '', left: '33.50%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1237', label: '', left: '35.00%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1238', label: '', left: '36.70%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1239', label: '', left: '38.50%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1240', label: '', left: '40.30%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1241', label: '', left: '41.90%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1242', label: '', left: '43.60%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1243', label: '', left: '45.60%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1244', label: '', left: '47.20%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1245', label: '', left: '49.00%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1246', label: '', left: '50.60%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1247', label: '', left: '52.30%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1248', label: '', left: '54.20%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1249', label: '', left: '56.00%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1250', label: '', left: '57.70%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1251', label: '', left: '59.30%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1252', label: '', left: '61.10%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1253', label: '', left: '62.80%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1254', label: '', left: '64.50%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1255', label: '', left: '66.30%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1256', label: '', left: '68.00%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1257', label: '', left: '69.70%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1258', label: '', left: '71.50%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1259', label: '', left: '73.20%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1260', label: '', left: '74.90%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1261', label: '', left: '76.70%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1262', label: '', left: '78.50%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1263', label: '', left: '80.20%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1264', label: '', left: '82.00%', top: '64.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1265', label: '', left: '84.30%', top: '64.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1266', label: '', left: '87.20%', top: '64.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1267', label: '', left: '90.20%', top: '64.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1268', label: '', left: '92.70%', top: '64.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1269', label: '', left: '94.80%', top: '64.20%', width: '1.77%', height: '1.56%' },
/* ============================================================
   ★ 新增 11 排（top 65.50% 起，每排 +1.5%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */

/* 第 1 排（top 65.50%）gf_1270 ~ gf_1305 */
{ id: 'gf_1270', label: '', left: '30.00%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1271', label: '', left: '31.70%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1272', label: '', left: '33.50%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1273', label: '', left: '35.00%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1274', label: '', left: '36.70%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1275', label: '', left: '38.50%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1276', label: '', left: '40.30%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1277', label: '', left: '41.90%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1278', label: '', left: '43.60%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1279', label: '', left: '45.60%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1280', label: '', left: '47.20%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1281', label: '', left: '49.00%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1282', label: '', left: '50.60%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1283', label: '', left: '52.30%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1284', label: '', left: '54.20%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1285', label: '', left: '56.00%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1286', label: '', left: '57.70%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1287', label: '', left: '59.30%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1288', label: '', left: '61.10%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1289', label: '', left: '62.80%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1290', label: '', left: '64.50%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1291', label: '', left: '66.30%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1292', label: '', left: '68.00%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1293', label: '', left: '69.70%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1294', label: '', left: '71.50%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1295', label: '', left: '73.20%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1296', label: '', left: '74.90%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1297', label: '', left: '76.70%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1298', label: '', left: '78.50%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1299', label: '', left: '80.20%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1300', label: '', left: '82.00%', top: '65.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1301', label: '', left: '84.30%', top: '65.50%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1302', label: '', left: '87.20%', top: '65.50%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1303', label: '', left: '90.20%', top: '65.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1304', label: '', left: '92.70%', top: '65.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1305', label: '', left: '94.80%', top: '65.50%', width: '1.77%', height: '1.56%' },

/* 第 2 排（top 67.00%）gf_1306 ~ gf_1341 */
{ id: 'gf_1306', label: '', left: '30.00%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1307', label: '', left: '31.70%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1308', label: '', left: '33.50%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1309', label: '', left: '35.00%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1310', label: '', left: '36.70%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1311', label: '', left: '38.50%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1312', label: '', left: '40.30%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1313', label: '', left: '41.90%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1314', label: '', left: '43.60%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1315', label: '', left: '45.60%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1316', label: '', left: '47.20%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1317', label: '', left: '49.00%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1318', label: '', left: '50.60%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1319', label: '', left: '52.30%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1320', label: '', left: '54.20%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1321', label: '', left: '56.00%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1322', label: '', left: '57.70%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1323', label: '', left: '59.30%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1324', label: '', left: '61.10%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1325', label: '', left: '62.80%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1326', label: '', left: '64.50%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1327', label: '', left: '66.30%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1328', label: '', left: '68.00%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1329', label: '', left: '69.70%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1330', label: '', left: '71.50%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1331', label: '', left: '73.20%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1332', label: '', left: '74.90%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1333', label: '', left: '76.70%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1334', label: '', left: '78.50%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1335', label: '', left: '80.20%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1336', label: '', left: '82.00%', top: '67.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1337', label: '', left: '84.30%', top: '67.00%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1338', label: '', left: '87.20%', top: '67.00%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1339', label: '', left: '90.20%', top: '67.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1340', label: '', left: '92.70%', top: '67.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1341', label: '', left: '94.80%', top: '67.00%', width: '1.77%', height: '1.56%' },

/* 第 3 排（top 68.50%）gf_1342 ~ gf_1377 */
{ id: 'gf_1342', label: '', left: '30.00%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1343', label: '', left: '31.70%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1344', label: '', left: '33.50%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1345', label: '', left: '35.00%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1346', label: '', left: '36.70%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1347', label: '', left: '38.50%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1348', label: '', left: '40.30%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1349', label: '', left: '41.90%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1350', label: '', left: '43.60%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1351', label: '', left: '45.60%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1352', label: '', left: '47.20%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1353', label: '', left: '49.00%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1354', label: '', left: '50.60%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1355', label: '', left: '52.30%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1356', label: '', left: '54.20%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1357', label: '', left: '56.00%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1358', label: '', left: '57.70%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1359', label: '', left: '59.30%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1360', label: '', left: '61.10%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1361', label: '', left: '62.80%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1362', label: '', left: '64.50%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1363', label: '', left: '66.30%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1364', label: '', left: '68.00%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1365', label: '', left: '69.70%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1366', label: '', left: '71.50%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1367', label: '', left: '73.20%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1368', label: '', left: '74.90%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1369', label: '', left: '76.70%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1370', label: '', left: '78.50%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1371', label: '', left: '80.20%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1372', label: '', left: '82.00%', top: '68.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1373', label: '', left: '84.30%', top: '68.50%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1374', label: '', left: '87.20%', top: '68.50%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1375', label: '', left: '90.20%', top: '68.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1376', label: '', left: '92.70%', top: '68.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1377', label: '', left: '94.80%', top: '68.50%', width: '1.77%', height: '1.56%' },

/* 第 4 排（top 70.00%）gf_1378 ~ gf_1413 */
{ id: 'gf_1378', label: '', left: '30.00%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1379', label: '', left: '31.70%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1380', label: '', left: '33.50%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1381', label: '', left: '35.00%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1382', label: '', left: '36.70%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1383', label: '', left: '38.50%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1384', label: '', left: '40.30%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1385', label: '', left: '41.90%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1386', label: '', left: '43.60%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1387', label: '', left: '45.60%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1388', label: '', left: '47.20%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1389', label: '', left: '49.00%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1390', label: '', left: '50.60%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1391', label: '', left: '52.30%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1392', label: '', left: '54.20%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1393', label: '', left: '56.00%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1394', label: '', left: '57.70%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1395', label: '', left: '59.30%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1396', label: '', left: '61.10%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1397', label: '', left: '62.80%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1398', label: '', left: '64.50%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1399', label: '', left: '66.30%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1400', label: '', left: '68.00%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1401', label: '', left: '69.70%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1402', label: '', left: '71.50%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1403', label: '', left: '73.20%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1404', label: '', left: '74.90%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1405', label: '', left: '76.70%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1406', label: '', left: '78.50%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1407', label: '', left: '80.20%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1408', label: '', left: '82.00%', top: '70.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1409', label: '', left: '84.30%', top: '70.00%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1410', label: '', left: '87.20%', top: '70.00%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1411', label: '', left: '90.20%', top: '70.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1412', label: '', left: '92.70%', top: '70.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1413', label: '', left: '94.80%', top: '70.00%', width: '1.77%', height: '1.56%' },

/* 第 5 排（top 71.50%）gf_1414 ~ gf_1449 */
{ id: 'gf_1414', label: '', left: '30.00%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1415', label: '', left: '31.70%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1416', label: '', left: '33.50%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1417', label: '', left: '35.00%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1418', label: '', left: '36.70%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1419', label: '', left: '38.50%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1420', label: '', left: '40.30%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1421', label: '', left: '41.90%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1422', label: '', left: '43.60%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1423', label: '', left: '45.60%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1424', label: '', left: '47.20%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1425', label: '', left: '49.00%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1426', label: '', left: '50.60%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1427', label: '', left: '52.30%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1428', label: '', left: '54.20%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1429', label: '', left: '56.00%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1430', label: '', left: '57.70%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1431', label: '', left: '59.30%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1432', label: '', left: '61.10%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1433', label: '', left: '62.80%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1434', label: '', left: '64.50%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1435', label: '', left: '66.30%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1436', label: '', left: '68.00%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1437', label: '', left: '69.70%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1438', label: '', left: '71.50%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1439', label: '', left: '73.20%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1440', label: '', left: '74.90%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1441', label: '', left: '76.70%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1442', label: '', left: '78.50%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1443', label: '', left: '80.20%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1444', label: '', left: '82.00%', top: '71.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1445', label: '', left: '84.30%', top: '71.50%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1446', label: '', left: '87.20%', top: '71.50%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1447', label: '', left: '90.20%', top: '71.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1448', label: '', left: '92.70%', top: '71.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1449', label: '', left: '94.80%', top: '71.50%', width: '1.77%', height: '1.56%' },

/* 第 6 排（top 73.00%）gf_1450 ~ gf_1485 */
{ id: 'gf_1450', label: '', left: '30.00%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1451', label: '', left: '31.70%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1452', label: '', left: '33.50%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1453', label: '', left: '35.00%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1454', label: '', left: '36.70%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1455', label: '', left: '38.50%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1456', label: '', left: '40.30%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1457', label: '', left: '41.90%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1458', label: '', left: '43.60%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1459', label: '', left: '45.60%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1460', label: '', left: '47.20%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1461', label: '', left: '49.00%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1462', label: '', left: '50.60%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1463', label: '', left: '52.30%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1464', label: '', left: '54.20%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1465', label: '', left: '56.00%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1466', label: '', left: '57.70%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1467', label: '', left: '59.30%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1468', label: '', left: '61.10%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1469', label: '', left: '62.80%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1470', label: '', left: '64.50%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1471', label: '', left: '66.30%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1472', label: '', left: '68.00%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1473', label: '', left: '69.70%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1474', label: '', left: '71.50%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1475', label: '', left: '73.20%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1476', label: '', left: '74.90%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1477', label: '', left: '76.70%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1478', label: '', left: '78.50%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1479', label: '', left: '80.20%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1480', label: '', left: '82.00%', top: '73.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1481', label: '', left: '84.30%', top: '73.00%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1482', label: '', left: '87.20%', top: '73.00%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1483', label: '', left: '90.20%', top: '73.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1484', label: '', left: '92.70%', top: '73.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1485', label: '', left: '94.80%', top: '73.00%', width: '1.77%', height: '1.56%' },

/* 第 7 排（top 74.50%）gf_1486 ~ gf_1521 */
{ id: 'gf_1486', label: '', left: '30.00%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1487', label: '', left: '31.70%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1488', label: '', left: '33.50%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1489', label: '', left: '35.00%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1490', label: '', left: '36.70%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1491', label: '', left: '38.50%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1492', label: '', left: '40.30%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1493', label: '', left: '41.90%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1494', label: '', left: '43.60%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1495', label: '', left: '45.60%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1496', label: '', left: '47.20%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1497', label: '', left: '49.00%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1498', label: '', left: '50.60%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1499', label: '', left: '52.30%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1500', label: '', left: '54.20%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1501', label: '', left: '56.00%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1502', label: '', left: '57.70%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1503', label: '', left: '59.30%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1504', label: '', left: '61.10%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1505', label: '', left: '62.80%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1506', label: '', left: '64.50%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1507', label: '', left: '66.30%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1508', label: '', left: '68.00%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1509', label: '', left: '69.70%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1510', label: '', left: '71.50%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1511', label: '', left: '73.20%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1512', label: '', left: '74.90%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1513', label: '', left: '76.70%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1514', label: '', left: '78.50%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1515', label: '', left: '80.20%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1516', label: '', left: '82.00%', top: '74.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1517', label: '', left: '84.30%', top: '74.50%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1518', label: '', left: '87.20%', top: '74.50%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1519', label: '', left: '90.20%', top: '74.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1520', label: '', left: '92.70%', top: '74.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1521', label: '', left: '94.80%', top: '74.50%', width: '1.77%', height: '1.56%' },

/* 第 8 排（top 76.00%）gf_1522 ~ gf_1557 */
{ id: 'gf_1522', label: '', left: '30.00%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1523', label: '', left: '31.70%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1524', label: '', left: '33.50%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1525', label: '', left: '35.00%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1526', label: '', left: '36.70%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1527', label: '', left: '38.50%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1528', label: '', left: '40.30%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1529', label: '', left: '41.90%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1530', label: '', left: '43.60%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1531', label: '', left: '45.60%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1532', label: '', left: '47.20%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1533', label: '', left: '49.00%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1534', label: '', left: '50.60%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1535', label: '', left: '52.30%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1536', label: '', left: '54.20%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1537', label: '', left: '56.00%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1538', label: '', left: '57.70%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1539', label: '', left: '59.30%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1540', label: '', left: '61.10%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1541', label: '', left: '62.80%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1542', label: '', left: '64.50%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1543', label: '', left: '66.30%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1544', label: '', left: '68.00%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1545', label: '', left: '69.70%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1546', label: '', left: '71.50%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1547', label: '', left: '73.20%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1548', label: '', left: '74.90%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1549', label: '', left: '76.70%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1550', label: '', left: '78.50%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1551', label: '', left: '80.20%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1552', label: '', left: '82.00%', top: '76.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1553', label: '', left: '84.30%', top: '76.00%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1554', label: '', left: '87.20%', top: '76.00%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1555', label: '', left: '90.20%', top: '76.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1556', label: '', left: '92.70%', top: '76.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1557', label: '', left: '94.80%', top: '76.00%', width: '1.77%', height: '1.56%' },

/* 第 9 排（top 77.50%）gf_1558 ~ gf_1593 */
{ id: 'gf_1558', label: '', left: '30.00%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1559', label: '', left: '31.70%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1560', label: '', left: '33.50%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1561', label: '', left: '35.00%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1562', label: '', left: '36.70%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1563', label: '', left: '38.50%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1564', label: '', left: '40.30%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1565', label: '', left: '41.90%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1566', label: '', left: '43.60%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1567', label: '', left: '45.60%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1568', label: '', left: '47.20%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1569', label: '', left: '49.00%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1570', label: '', left: '50.60%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1571', label: '', left: '52.30%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1572', label: '', left: '54.20%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1573', label: '', left: '56.00%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1574', label: '', left: '57.70%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1575', label: '', left: '59.30%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1576', label: '', left: '61.10%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1577', label: '', left: '62.80%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1578', label: '', left: '64.50%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1579', label: '', left: '66.30%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1580', label: '', left: '68.00%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1581', label: '', left: '69.70%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1582', label: '', left: '71.50%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1583', label: '', left: '73.20%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1584', label: '', left: '74.90%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1585', label: '', left: '76.70%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1586', label: '', left: '78.50%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1587', label: '', left: '80.20%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1588', label: '', left: '82.00%', top: '77.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1589', label: '', left: '84.30%', top: '77.50%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1590', label: '', left: '87.20%', top: '77.50%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1591', label: '', left: '90.20%', top: '77.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1592', label: '', left: '92.70%', top: '77.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1593', label: '', left: '94.80%', top: '77.50%', width: '1.77%', height: '1.56%' },

/* 第 10 排（top 79.00%）gf_1594 ~ gf_1629 */
{ id: 'gf_1594', label: '', left: '30.00%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1595', label: '', left: '31.70%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1596', label: '', left: '33.50%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1597', label: '', left: '35.00%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1598', label: '', left: '36.70%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1599', label: '', left: '38.50%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1600', label: '', left: '40.30%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1601', label: '', left: '41.90%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1602', label: '', left: '43.60%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1603', label: '', left: '45.60%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1604', label: '', left: '47.20%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1605', label: '', left: '49.00%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1606', label: '', left: '50.60%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1607', label: '', left: '52.30%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1608', label: '', left: '54.20%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1609', label: '', left: '56.00%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1610', label: '', left: '57.70%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1611', label: '', left: '59.30%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1612', label: '', left: '61.10%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1613', label: '', left: '62.80%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1614', label: '', left: '64.50%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1615', label: '', left: '66.30%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1616', label: '', left: '68.00%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1617', label: '', left: '69.70%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1618', label: '', left: '71.50%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1619', label: '', left: '73.20%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1620', label: '', left: '74.90%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1621', label: '', left: '76.70%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1622', label: '', left: '78.50%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1623', label: '', left: '80.20%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1624', label: '', left: '82.00%', top: '79.00%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1625', label: '', left: '84.30%', top: '79.00%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1626', label: '', left: '87.20%', top: '79.00%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1627', label: '', left: '90.20%', top: '79.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1628', label: '', left: '92.70%', top: '79.00%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1629', label: '', left: '94.80%', top: '79.00%', width: '1.77%', height: '1.56%' },

/* 第 11 排（top 80.50%）gf_1630 ~ gf_1665 */
{ id: 'gf_1630', label: '', left: '30.00%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1631', label: '', left: '31.70%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1632', label: '', left: '33.50%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1633', label: '', left: '35.00%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1634', label: '', left: '36.70%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1635', label: '', left: '38.50%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1636', label: '', left: '40.30%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1637', label: '', left: '41.90%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1638', label: '', left: '43.60%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1639', label: '', left: '45.60%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1640', label: '', left: '47.20%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1641', label: '', left: '49.00%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1642', label: '', left: '50.60%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1643', label: '', left: '52.30%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1644', label: '', left: '54.20%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1645', label: '', left: '56.00%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1646', label: '', left: '57.70%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1647', label: '', left: '59.30%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1648', label: '', left: '61.10%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1649', label: '', left: '62.80%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1650', label: '', left: '64.50%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1651', label: '', left: '66.30%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1652', label: '', left: '68.00%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1653', label: '', left: '69.70%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1654', label: '', left: '71.50%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1655', label: '', left: '73.20%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1656', label: '', left: '74.90%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1657', label: '', left: '76.70%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1658', label: '', left: '78.50%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1659', label: '', left: '80.20%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1660', label: '', left: '82.00%', top: '80.50%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1661', label: '', left: '84.30%', top: '80.50%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1662', label: '', left: '87.20%', top: '80.50%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1663', label: '', left: '90.20%', top: '80.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1664', label: '', left: '92.70%', top: '80.50%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1665', label: '', left: '94.80%', top: '80.50%', width: '1.77%', height: '1.56%' },
/* ============================================================
   ★ 新增 7 排（top 81.70% 起，每排 +1.5%）
   對應 gf_46 ~ gf_81，left / width / height 不變
   ============================================================ */

/* 第 1 排（top 81.70%）gf_1666 ~ gf_1701 */
{ id: 'gf_1666', label: '', left: '30.00%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1667', label: '', left: '31.70%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1668', label: '', left: '33.50%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1669', label: '', left: '35.00%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1670', label: '', left: '36.70%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1671', label: '', left: '38.50%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1672', label: '', left: '40.30%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1673', label: '', left: '41.90%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1674', label: '', left: '43.60%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1675', label: '', left: '45.60%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1676', label: '', left: '47.20%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1677', label: '', left: '49.00%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1678', label: '', left: '50.60%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1679', label: '', left: '52.30%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1680', label: '', left: '54.20%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1681', label: '', left: '56.00%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1682', label: '', left: '57.70%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1683', label: '', left: '59.30%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1684', label: '', left: '61.10%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1685', label: '', left: '62.80%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1686', label: '', left: '64.50%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1687', label: '', left: '66.30%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1688', label: '', left: '68.00%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1689', label: '', left: '69.70%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1690', label: '', left: '71.50%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1691', label: '', left: '73.20%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1692', label: '', left: '74.90%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1693', label: '', left: '76.70%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1694', label: '', left: '78.50%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1695', label: '', left: '80.20%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1696', label: '', left: '82.00%', top: '81.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1697', label: '', left: '84.30%', top: '81.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1698', label: '', left: '87.20%', top: '81.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1699', label: '', left: '90.20%', top: '81.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1700', label: '', left: '92.70%', top: '81.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1701', label: '', left: '94.80%', top: '81.70%', width: '1.77%', height: '1.56%' },

/* 第 2 排（top 83.20%）gf_1702 ~ gf_1737 */
{ id: 'gf_1702', label: '', left: '30.00%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1703', label: '', left: '31.70%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1704', label: '', left: '33.50%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1705', label: '', left: '35.00%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1706', label: '', left: '36.70%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1707', label: '', left: '38.50%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1708', label: '', left: '40.30%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1709', label: '', left: '41.90%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1710', label: '', left: '43.60%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1711', label: '', left: '45.60%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1712', label: '', left: '47.20%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1713', label: '', left: '49.00%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1714', label: '', left: '50.60%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1715', label: '', left: '52.30%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1716', label: '', left: '54.20%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1717', label: '', left: '56.00%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1718', label: '', left: '57.70%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1719', label: '', left: '59.30%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1720', label: '', left: '61.10%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1721', label: '', left: '62.80%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1722', label: '', left: '64.50%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1723', label: '', left: '66.30%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1724', label: '', left: '68.00%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1725', label: '', left: '69.70%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1726', label: '', left: '71.50%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1727', label: '', left: '73.20%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1728', label: '', left: '74.90%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1729', label: '', left: '76.70%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1730', label: '', left: '78.50%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1731', label: '', left: '80.20%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1732', label: '', left: '82.00%', top: '83.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1733', label: '', left: '84.30%', top: '83.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1734', label: '', left: '87.20%', top: '83.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1735', label: '', left: '90.20%', top: '83.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1736', label: '', left: '92.70%', top: '83.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1737', label: '', left: '94.80%', top: '83.20%', width: '1.77%', height: '1.56%' },

/* 第 3 排（top 84.70%）gf_1738 ~ gf_1773 */
{ id: 'gf_1738', label: '', left: '30.00%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1739', label: '', left: '31.70%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1740', label: '', left: '33.50%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1741', label: '', left: '35.00%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1742', label: '', left: '36.70%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1743', label: '', left: '38.50%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1744', label: '', left: '40.30%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1745', label: '', left: '41.90%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1746', label: '', left: '43.60%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1747', label: '', left: '45.60%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1748', label: '', left: '47.20%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1749', label: '', left: '49.00%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1750', label: '', left: '50.60%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1751', label: '', left: '52.30%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1752', label: '', left: '54.20%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1753', label: '', left: '56.00%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1754', label: '', left: '57.70%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1755', label: '', left: '59.30%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1756', label: '', left: '61.10%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1757', label: '', left: '62.80%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1758', label: '', left: '64.50%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1759', label: '', left: '66.30%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1760', label: '', left: '68.00%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1761', label: '', left: '69.70%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1762', label: '', left: '71.50%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1763', label: '', left: '73.20%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1764', label: '', left: '74.90%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1765', label: '', left: '76.70%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1766', label: '', left: '78.50%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1767', label: '', left: '80.20%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1768', label: '', left: '82.00%', top: '84.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1769', label: '', left: '84.30%', top: '84.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1770', label: '', left: '87.20%', top: '84.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1771', label: '', left: '90.20%', top: '84.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1772', label: '', left: '92.70%', top: '84.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1773', label: '', left: '94.80%', top: '84.70%', width: '1.77%', height: '1.56%' },

/* 第 4 排（top 86.20%）gf_1774 ~ gf_1809 */
{ id: 'gf_1774', label: '', left: '30.00%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1775', label: '', left: '31.70%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1776', label: '', left: '33.50%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1777', label: '', left: '35.00%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1778', label: '', left: '36.70%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1779', label: '', left: '38.50%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1780', label: '', left: '40.30%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1781', label: '', left: '41.90%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1782', label: '', left: '43.60%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1783', label: '', left: '45.60%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1784', label: '', left: '47.20%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1785', label: '', left: '49.00%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1786', label: '', left: '50.60%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1787', label: '', left: '52.30%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1788', label: '', left: '54.20%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1789', label: '', left: '56.00%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1790', label: '', left: '57.70%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1791', label: '', left: '59.30%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1792', label: '', left: '61.10%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1793', label: '', left: '62.80%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1794', label: '', left: '64.50%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1795', label: '', left: '66.30%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1796', label: '', left: '68.00%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1797', label: '', left: '69.70%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1798', label: '', left: '71.50%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1799', label: '', left: '73.20%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1800', label: '', left: '74.90%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1801', label: '', left: '76.70%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1802', label: '', left: '78.50%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1803', label: '', left: '80.20%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1804', label: '', left: '82.00%', top: '86.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1805', label: '', left: '84.30%', top: '86.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1806', label: '', left: '87.20%', top: '86.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1807', label: '', left: '90.20%', top: '86.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1808', label: '', left: '92.70%', top: '86.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1809', label: '', left: '94.80%', top: '86.20%', width: '1.77%', height: '1.56%' },

/* 第 5 排（top 87.70%）gf_1810 ~ gf_1845 */
{ id: 'gf_1810', label: '', left: '30.00%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1811', label: '', left: '31.70%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1812', label: '', left: '33.50%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1813', label: '', left: '35.00%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1814', label: '', left: '36.70%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1815', label: '', left: '38.50%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1816', label: '', left: '40.30%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1817', label: '', left: '41.90%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1818', label: '', left: '43.60%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1819', label: '', left: '45.60%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1820', label: '', left: '47.20%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1821', label: '', left: '49.00%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1822', label: '', left: '50.60%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1823', label: '', left: '52.30%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1824', label: '', left: '54.20%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1825', label: '', left: '56.00%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1826', label: '', left: '57.70%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1827', label: '', left: '59.30%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1828', label: '', left: '61.10%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1829', label: '', left: '62.80%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1830', label: '', left: '64.50%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1831', label: '', left: '66.30%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1832', label: '', left: '68.00%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1833', label: '', left: '69.70%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1834', label: '', left: '71.50%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1835', label: '', left: '73.20%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1836', label: '', left: '74.90%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1837', label: '', left: '76.70%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1838', label: '', left: '78.50%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1839', label: '', left: '80.20%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1840', label: '', left: '82.00%', top: '87.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1841', label: '', left: '84.30%', top: '87.70%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1842', label: '', left: '87.20%', top: '87.70%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1843', label: '', left: '90.20%', top: '87.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1844', label: '', left: '92.70%', top: '87.70%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1845', label: '', left: '94.80%', top: '87.70%', width: '1.77%', height: '1.56%' },

/* 第 6 排（top 89.20%）gf_1846 ~ gf_1881 */
{ id: 'gf_1846', label: '', left: '30.00%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1847', label: '', left: '31.70%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1848', label: '', left: '33.50%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1849', label: '', left: '35.00%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1850', label: '', left: '36.70%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1851', label: '', left: '38.50%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1852', label: '', left: '40.30%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1853', label: '', left: '41.90%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1854', label: '', left: '43.60%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1855', label: '', left: '45.60%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1856', label: '', left: '47.20%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1857', label: '', left: '49.00%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1858', label: '', left: '50.60%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1859', label: '', left: '52.30%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1860', label: '', left: '54.20%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1861', label: '', left: '56.00%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1862', label: '', left: '57.70%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1863', label: '', left: '59.30%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1864', label: '', left: '61.10%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1865', label: '', left: '62.80%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1866', label: '', left: '64.50%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1867', label: '', left: '66.30%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1868', label: '', left: '68.00%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1869', label: '', left: '69.70%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1870', label: '', left: '71.50%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1871', label: '', left: '73.20%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1872', label: '', left: '74.90%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1873', label: '', left: '76.70%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1874', label: '', left: '78.50%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1875', label: '', left: '80.20%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1876', label: '', left: '82.00%', top: '89.20%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1877', label: '', left: '84.30%', top: '89.20%', width: '1.97%', height: '1.56%' },
{ id: 'gf_1878', label: '', left: '87.20%', top: '89.20%', width: '2.47%', height: '1.56%' },
{ id: 'gf_1879', label: '', left: '90.20%', top: '89.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1880', label: '', left: '92.70%', top: '89.20%', width: '1.77%', height: '1.56%' },
{ id: 'gf_1881', label: '', left: '94.80%', top: '89.20%', width: '1.77%', height: '1.56%' },

/* 第 7 排（top 90.70%）gf_1882 ~ gf_1917 */
{ id: 'gf_1882', label: '', left: '30.00%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1883', label: '', left: '31.70%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1884', label: '', left: '33.50%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1885', label: '', left: '35.00%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1886', label: '', left: '36.70%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1887', label: '', left: '38.50%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1888', label: '', left: '40.30%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1889', label: '', left: '41.90%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1890', label: '', left: '43.60%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1891', label: '', left: '45.60%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1892', label: '', left: '47.20%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1893', label: '', left: '49.00%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1894', label: '', left: '50.60%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1895', label: '', left: '52.30%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1896', label: '', left: '54.20%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1897', label: '', left: '56.00%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1898', label: '', left: '57.70%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1899', label: '', left: '59.30%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1900', label: '', left: '61.10%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1901', label: '', left: '62.80%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1902', label: '', left: '64.50%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1903', label: '', left: '66.30%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1904', label: '', left: '68.00%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1905', label: '', left: '69.70%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1906', label: '', left: '71.50%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1907', label: '', left: '73.20%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1908', label: '', left: '74.90%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1909', label: '', left: '76.70%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1910', label: '', left: '78.50%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1911', label: '', left: '80.20%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1912', label: '', left: '82.00%', top: '90.70%', width: '1.47%', height: '1.56%' },
{ id: 'gf_1913', label: '', left: '84.30%', top: '90.70%', width: '1.97%', height: '1.56%' },
//code//
{ id: 'gf_1913', label: '', left: '23.00%', top: '81.70%', width: '6.47%', height: '1.56%' },
{ id: 'gf_1914', label: '', left: '23.00%', top: '83.20%', width: '6.47%', height: '1.56%' },
{ id: 'gf_1915', label: '', left: '23.00%', top: '84.70%', width: '6.47%', height: '1.56%' },
{ id: 'gf_1916', label: '', left: '23.00%', top: '86.20%', width: '6.47%', height: '1.56%' },
{ id: 'gf_1917', label: '', left: '23.00%', top: '87.70%', width: '6.47%', height: '1.56%' },
//tradename//
{ id: 'gf_1918', label: '', left: '10.00%', top: '81.70%', width: '9.47%', height: '1.56%' },
{ id: 'gf_1919', label: '', left: '10.00%', top: '83.20%', width: '9.47%', height: '1.56%' },
{ id: 'gf_1920', label: '', left: '10.00%', top: '84.70%', width: '9.47%', height: '1.56%' },
{ id: 'gf_1921', label: '', left: '10.00%', top: '86.20%', width: '9.47%', height: '1.56%' },
{ id: 'gf_1922', label: '', left: '10.00%', top: '87.70%', width: '9.47%', height: '1.56%' },
            

        ]
    };

    var FORM_KEY_PREFIX = 'labour_formdata_';
    var formData = {};
    var formDocId = 'default';

    function getFormDocId() {
        return (currentDoc && currentDoc.id) ? String(currentDoc.id) : 'default';
    }
    function formStorageKey() {
        return FORM_KEY_PREFIX + formDocId;
    }
    function loadFormData() {
        if (currentDoc && currentDoc.formData && typeof currentDoc.formData === 'object') {
            return JSON.parse(JSON.stringify(currentDoc.formData));
        }
        try {
            var raw = sessionStorage.getItem(formStorageKey());
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }
    function persistFormData() {
        if (!currentDoc) return;
        currentDoc.formData = formData;
        try {
            sessionStorage.setItem(formStorageKey(), JSON.stringify(formData));
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
        } catch (e) {
            console.warn('[Labour] formData 儲存失敗', e);
        }
    }

    /* ========== 打勾格 CSS ========== */
    function ensureCheckboxStyle() {
        if (document.getElementById('pdf-checkbox-style')) return;
        var style = document.createElement('style');
        style.id = 'pdf-checkbox-style';
        style.textContent =
            '.pdf-form-overlay .pdf-checkbox {' +
                'position: absolute;border:1px solid rgba(52,152,219,0.4);' +
                'background: rgba(255,255,255,0.2);cursor:pointer;box-sizing:border-box;' +
                'display:flex;align-items:center;justify-content:center;user-select:none;' +
                'line-height:1;border-radius:2px;pointer-events:auto;' +
                'transition: background 0.12s ease, box-shadow 0.12s ease;' +
            '}' +
            '.pdf-form-overlay .pdf-checkbox:hover {background:rgba(52,152,219,0.15);box-shadow:inset 0 0 0 1px #3498db;}' +
            '.pdf-form-overlay .pdf-checkbox.checked {background:rgba(46,204,113,0.15);border-color:#27ae60;}' +
            '.pdf-form-overlay .pdf-checkbox .tick {display:none;color:#0a1a5c;font-weight:bold;font-size:0.9em;}' +
            '.pdf-form-overlay .pdf-checkbox.checked .tick {display:inline-block;}';
        document.head.appendChild(style);
    }

    function buildTextField(field) {
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'pdf-field';
        input.dataset.fieldId = field.id;
        if (field.label) { input.placeholder = field.label; input.title = field.label; }
        input.style.left = field.left; input.style.top = field.top;
        input.style.width = field.width || '8%';
        input.style.height = field.height || '1.8%';
        input.value = formData[field.id] || '';
        input.autocomplete = 'off';
        input.addEventListener('input', function () {
            formData[field.id] = input.value; persistFormData();
        });
        input.addEventListener('change', function () {
            formData[field.id] = input.value; persistFormData();
        });
        return input;
    }

    function buildCheckbox(field) {
        ensureCheckboxStyle();
        var box = document.createElement('div');
        box.className = 'pdf-checkbox';
        box.dataset.fieldId = field.id;
        box.dataset.fieldType = 'check';
        if (field.label) box.title = field.label;
        box.style.left = field.left; box.style.top = field.top;
        box.style.width = field.width || '2%';
        box.style.height = field.height || '1.8%';
        var tick = document.createElement('span');
        tick.className = 'tick'; tick.textContent = '✓';
        box.appendChild(tick);
        var initVal = formData[field.id];
        if (initVal === '1' || initVal === '✓' || initVal === true || initVal === 'true') {
            box.classList.add('checked');
        }
        box.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            box.classList.toggle('checked');
            formData[field.id] = box.classList.contains('checked') ? '1' : '';
            persistFormData();
        });
        return box;
    }

    /* ============================================================
   ★ 簽名格（參考 editdsdsitediary.js 的簽名 Modal 做法）
   ============================================================ */
function ensureSignatureStyle() {
    if (document.getElementById('pdf-signature-style')) return;
    var style = document.createElement('style');
    style.id = 'pdf-signature-style';
    style.textContent =
        /* 簽名格本體 */
        '.pdf-form-overlay .pdf-signature-cell {' +
            'position:absolute;border:1px solid rgba(52,152,219,0.4);' +
            'background:rgba(255,255,255,0.2);cursor:pointer;box-sizing:border-box;' +
            'display:flex;align-items:center;justify-content:center;user-select:none;' +
            'line-height:1;border-radius:2px;pointer-events:auto;overflow:hidden;' +
            'transition: background 0.12s ease, box-shadow 0.12s ease;' +
        '}' +
        '.pdf-form-overlay .pdf-signature-cell:hover {' +
            'background:rgba(52,152,219,0.15);box-shadow:inset 0 0 0 1px #3498db;' +
        '}' +
        '.pdf-form-overlay .pdf-signature-cell .signature-img {' +
            'max-width:100%;max-height:100%;width:100%;height:100%;' +
            'object-fit:contain;pointer-events:none;display:block;' +
        '}' +
        '.pdf-form-overlay .pdf-signature-cell .signature-placeholder {' +
            'font-size:9px;color:#cbd5e1;font-style:italic;' +
            'user-select:none;pointer-events:none;' +
        '}' +
        /* Modal */
        '.labour-signature-modal-overlay {' +
            'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(15,23,42,0.6);backdrop-filter:blur(2px);' +
            'z-index:99999;display:none;justify-content:center;align-items:center;' +
        '}' +
        '.labour-signature-modal-overlay.visible {display:flex;}' +
        '.labour-signature-modal {' +
            'background:#fff;border-radius:12px;width:960px;max-width:95vw;' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.35);overflow:hidden;' +
            'display:flex;flex-direction:column;' +
            'animation:labourSigSlideIn 0.2s ease-out;' +
        '}' +
        '@keyframes labourSigSlideIn {' +
            'from { transform: scale(0.95); opacity: 0; }' +
            'to   { transform: scale(1);    opacity: 1; }' +
        '}' +
        '.labour-signature-modal-header {' +
            'padding:14px 20px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;' +
            'display:flex;justify-content:space-between;align-items:center;' +
        '}' +
        '.labour-signature-modal-header h3 {' +
            'color:#1e293b;font-size:1.05rem;font-weight:600;' +
            'display:flex;align-items:center;gap:8px;' +
        '}' +
        '.labour-signature-modal-close {' +
            'background:transparent;border:none;font-size:1.6rem;cursor:pointer;' +
            'color:#64748b;line-height:1;padding:0 6px;transition: color 0.15s;' +
        '}' +
        '.labour-signature-modal-close:hover {color:#e74c3c;}' +
        '.labour-signature-modal-body {padding:20px;background:#f8fafc;}' +
        '.labour-signature-canvas-wrapper {' +
            'position:relative;background:#fff;border:2px dashed #cbd5e1;' +
            'border-radius:8px;overflow:hidden;' +
        '}' +
        '#labour-signature-canvas {' +
            'display:block;width:100%;height:300px;cursor:crosshair;' +
            'touch-action:none;background:#fff;' +
        '}' +
        '.labour-signature-canvas-hint {' +
            'position:absolute;bottom:8px;right:12px;font-size:11px;' +
            'color:#cbd5e1;pointer-events:none;font-style:italic;' +
        '}' +
        '.labour-signature-modal-footer {' +
            'padding:12px 20px;background:#fff;border-top:1px solid #e2e8f0;' +
            'display:flex;justify-content:space-between;align-items:center;' +
            'gap:10px;flex-wrap:wrap;' +
        '}' +
        '.labour-sig-footer-right {display:flex;gap:8px;flex-wrap:wrap;}' +
        '.labour-sig-btn {' +
            'padding:8px 18px;border:none;border-radius:6px;font-weight:600;' +
            'cursor:pointer;font-size:0.9rem;transition: all 0.2s;' +
            'display:inline-flex;align-items:center;gap:6px;' +
        '}' +
        '.labour-sig-btn:hover {transform: translateY(-1px);}' +
        '.labour-sig-btn-clear  {background:#f1f5f9;color:#475569;}' +
        '.labour-sig-btn-clear:hover  {background:#e2e8f0;}' +
        '.labour-sig-btn-cancel {background:#94a3b8;color:#fff;}' +
        '.labour-sig-btn-cancel:hover {background:#64748b;}' +
        '.labour-sig-btn-save   {background:#10b981;color:#fff;}' +
        '.labour-sig-btn-save:hover   {background:#059669;}';
    document.head.appendChild(style);
}

/* --- 渲染簽名格內容 --- */
function renderLabourSignatureCellContent(cell, value) {
    cell.innerHTML = '';
    if (value && typeof value === 'string' && value.indexOf('data:image') === 0) {
        var img = document.createElement('img');
        img.src = value;
        img.className = 'signature-img';
        img.alt = '簽名';
        cell.appendChild(img);
    } else {
        var span = document.createElement('span');
        span.className = 'signature-placeholder';
        span.textContent = '點擊簽名';
        cell.appendChild(span);
    }
}

/* --- 建立簽名格 --- */
function buildSignatureCell(field) {
    ensureSignatureStyle();
    var cell = document.createElement('div');
    cell.className = 'pdf-signature-cell';
    cell.dataset.fieldId   = field.id;
    cell.dataset.fieldType = 'signature';
    if (field.label) cell.title = field.label;
    cell.style.left   = field.left;
    cell.style.top    = field.top;
    cell.style.width  = field.width  || '4%';
    cell.style.height = field.height || '1.6%';
    renderLabourSignatureCellContent(cell, formData[field.id]);

    cell.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    cell.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    cell.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLabourSignatureModal(field.id);
    });
    return cell;
}

/* --- 簽名 Modal 狀態 --- */
var labourSig = {
    modal: null, canvas: null, ctx: null,
    targetFieldId: null,
    isDrawing: false, lastX: 0, lastY: 0, hasContent: false
};

function createLabourSignatureModal() {
    if (labourSig.modal) return;
    ensureSignatureStyle();

    var overlay = document.createElement('div');
    overlay.className = 'labour-signature-modal-overlay';
    overlay.id = 'labour-signature-modal-overlay';
    overlay.innerHTML =
        '<div class="labour-signature-modal">' +
            '<div class="labour-signature-modal-header">' +
                '<h3><i class="fas fa-signature"></i> 手寫簽名</h3>' +
                '<button class="labour-signature-modal-close" id="labour-signature-close-btn" title="關閉">&times;</button>' +
            '</div>' +
            '<div class="labour-signature-modal-body">' +
                '<div class="labour-signature-canvas-wrapper">' +
                    '<canvas id="labour-signature-canvas" width="900" height="300"></canvas>' +
                    '<div class="labour-signature-canvas-hint">在此簽名（滑鼠或觸控筆）</div>' +
                '</div>' +
            '</div>' +
            '<div class="labour-signature-modal-footer">' +
                '<button class="labour-sig-btn labour-sig-btn-clear" id="labour-signature-clear-btn"><i class="fas fa-eraser"></i> 清除</button>' +
                '<div class="labour-sig-footer-right">' +
                    '<button class="labour-sig-btn labour-sig-btn-cancel" id="labour-signature-cancel-btn"><i class="fas fa-times"></i> 取消</button>' +
                    '<button class="labour-sig-btn labour-sig-btn-save"   id="labour-signature-save-btn"><i class="fas fa-check"></i> 儲存</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);

    labourSig.modal  = overlay;
    labourSig.canvas = document.getElementById('labour-signature-canvas');
    labourSig.ctx    = labourSig.canvas.getContext('2d');
    labourSig.ctx.lineWidth   = 7;
    labourSig.ctx.lineCap     = 'round';
    labourSig.ctx.lineJoin    = 'round';
    labourSig.ctx.strokeStyle = '#0a1a5c';

    labourSig.canvas.addEventListener('mousedown',  labourSigStart);
    labourSig.canvas.addEventListener('mousemove',  labourSigMove);
    labourSig.canvas.addEventListener('mouseup',    labourSigEnd);
    labourSig.canvas.addEventListener('mouseleave', labourSigEnd);
    labourSig.canvas.addEventListener('touchstart', labourSigStart, { passive: false });
    labourSig.canvas.addEventListener('touchmove',  labourSigMove,  { passive: false });
    labourSig.canvas.addEventListener('touchend',   labourSigEnd,   { passive: false });

    document.getElementById('labour-signature-close-btn').addEventListener('click',  closeLabourSignatureModal);
    document.getElementById('labour-signature-cancel-btn').addEventListener('click', closeLabourSignatureModal);
    document.getElementById('labour-signature-clear-btn').addEventListener('click',  clearLabourSignatureCanvas);
    document.getElementById('labour-signature-save-btn').addEventListener('click',   saveLabourSignature);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLabourSignatureModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) closeLabourSignatureModal();
    });
}

function labourSigGetCoords(e) {
    var rect = labourSig.canvas.getBoundingClientRect();
    var cx, cy;
    if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    return {
        x: (cx - rect.left) * (labourSig.canvas.width  / rect.width),
        y: (cy - rect.top ) * (labourSig.canvas.height / rect.height)
    };
}
function labourSigStart(e) {
    e.preventDefault();
    labourSig.isDrawing = true;
    var p = labourSigGetCoords(e);
    labourSig.lastX = p.x; labourSig.lastY = p.y;
    labourSig.ctx.beginPath();
    labourSig.ctx.moveTo(p.x, p.y);
    labourSig.ctx.lineTo(p.x + 0.1, p.y + 0.1);
    labourSig.ctx.stroke();
    labourSig.hasContent = true;
}
function labourSigMove(e) {
    if (!labourSig.isDrawing) return;
    e.preventDefault();
    var p = labourSigGetCoords(e);
    labourSig.ctx.beginPath();
    labourSig.ctx.moveTo(labourSig.lastX, labourSig.lastY);
    labourSig.ctx.lineTo(p.x, p.y);
    labourSig.ctx.stroke();
    labourSig.lastX = p.x; labourSig.lastY = p.y;
}
function labourSigEnd(e) {
    if (!labourSig.isDrawing) return;
    if (e && e.preventDefault) e.preventDefault();
    labourSig.isDrawing = false;
}
function clearLabourSignatureCanvas() {
    if (!labourSig.ctx) return;
    labourSig.ctx.clearRect(0, 0, labourSig.canvas.width, labourSig.canvas.height);
    labourSig.hasContent = false;
}
function loadLabourSignatureImage(base64) {
    if (!base64 || typeof base64 !== 'string' || base64.indexOf('data:image') !== 0) {
        clearLabourSignatureCanvas(); return;
    }
    var img = new Image();
    img.onload = function () {
        labourSig.ctx.clearRect(0, 0, labourSig.canvas.width, labourSig.canvas.height);
        var ratio = Math.min(labourSig.canvas.width / img.width, labourSig.canvas.height / img.height);
        var w = img.width * ratio, h = img.height * ratio;
        var x = (labourSig.canvas.width  - w) / 2;
        var y = (labourSig.canvas.height - h) / 2;
        labourSig.ctx.drawImage(img, x, y, w, h);
        labourSig.hasContent = true;
    };
    img.onerror = function () { clearLabourSignatureCanvas(); };
    img.src = base64;
}
function openLabourSignatureModal(fieldId) {
    createLabourSignatureModal();
    labourSig.targetFieldId = fieldId;
    clearLabourSignatureCanvas();
    var existing = formData[fieldId];
    if (existing) loadLabourSignatureImage(existing);
    labourSig.modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}
function closeLabourSignatureModal() {
    if (!labourSig.modal) return;
    labourSig.modal.classList.remove('visible');
    document.body.style.overflow = '';
    clearLabourSignatureCanvas();
    labourSig.targetFieldId = null;
}
function isLabourCanvasBlank() {
    if (!labourSig.canvas || !labourSig.ctx) return true;
    try {
        var data = labourSig.ctx.getImageData(0, 0, labourSig.canvas.width, labourSig.canvas.height).data;
        for (var i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 0) return false;
        }
    } catch (e) { return false; }
    return true;
}
function getLabourSignatureBase64() {
    if (!labourSig.canvas) return '';
    if (isLabourCanvasBlank()) return '';
    return labourSig.canvas.toDataURL('image/png');
}
function saveLabourSignature() {
    if (!labourSig.targetFieldId) { closeLabourSignatureModal(); return; }
    var base64 = getLabourSignatureBase64();
    if (!base64) {
        if (!confirm('尚未簽名，是否清空此格簽名？')) return;
        formData[labourSig.targetFieldId] = '';
    } else {
        formData[labourSig.targetFieldId] = base64;
    }
    persistFormData();
    refreshLabourSignatureCell(labourSig.targetFieldId);
    closeLabourSignatureModal();
}
function refreshLabourSignatureCell(fieldId) {
    var cell = document.querySelector('.pdf-signature-cell[data-field-id="' + fieldId + '"]');
    if (!cell) return;
    renderLabourSignatureCellContent(cell, formData[fieldId]);
}



        function buildField(field) {
            if (field.type === 'check')     return buildCheckbox(field);
            if (field.type === 'signature') return buildSignatureCell(field);
            return buildTextField(field);
        }

    /* ============================================================
       ★ 依文件類型注入對應的覆蓋層
       ============================================================ */
    /* ============================================================
       ★ 依文件類型注入對應的覆蓋層
       ★ 只在第 1 頁顯示（第 2 頁之後不注入任何格子）
       ------------------------------------------------------------
       - 呼叫時可傳 pageNum：injectFormFields(pageDiv, activePageNum)
       - 若沒傳（injectFormFields(pageDiv)），會自動讀全域 activePageNum
       - 用 Number() 寬鬆比較，避免 "1" !== 1 的問題
       ============================================================ */
     /* ============================================================
       ★ 依文件類型 + 頁碼注入對應的覆蓋層
       ------------------------------------------------------------
       GF527A     → 只第 1 頁（USER + AI）
       GF527-2017 → 第 1 頁：g17_01  ~ g17_621
                    第 3 頁：g17_622 ~ g17_657
       其他       → 不注入
       ============================================================ */
    function injectFormFields(pageDiv, pageNum) {
        if (!currentDoc) return;
        if (pageDiv.querySelector('.pdf-form-overlay')) return;

        /* ★ 決定目前頁碼（呼叫時可傳，沒傳就用 activePageNum） */
        var page = (pageNum !== undefined && pageNum !== null) ? pageNum : activePageNum;
        page = Number(page);

        var docType = currentDoc.type || 'GF527A';
        var fields = [];

        if (docType === 'GF527A') {
            /* GF527A 只在第 1 頁顯示 */
            if (page !== 1) {
                console.log('[Labour] GF527A 第 ' + page + ' 頁：不注入格子（只限第 1 頁）');
                return;
            }
            fields = USER_FORM_LAYOUT.fields.concat(AI_FORM_LAYOUT.fields);

        } else if (docType === 'GF527-2017') {
            if (page === 1) {
                fields = GF527_2017_FORM_LAYOUT.fields;
            } else if (page === 3) {
                fields = GF527_2017_PAGE3_FORM_LAYOUT.fields;
            } else {
                console.log('[Labour] GF527-2017 第 ' + page + ' 頁：不注入格子');
                return;
            }

             } else if (docType === 'GF527-2003') {
            /* ★ GF527-2003：只在第 1 頁顯示（gf_01 ~ gf_08 + gf45） */
            if (page === 1) {
                fields = GF527_2003_FORM_LAYOUT.fields;
            } else {
                console.log('[Labour] GF527-2003 第 ' + page + ' 頁：不注入格子');
                return;
            }



        } else {
            console.log('[Labour] ' + docType + '：不注入覆蓋層');
            return;
        }

        if (!fields.length) return;

        var overlay = document.createElement('div');
        overlay.className = 'pdf-form-overlay';
        fields.forEach(function (f) { overlay.appendChild(buildField(f)); });
        pageDiv.appendChild(overlay);

        console.log('[Labour] ✓ ' + docType + ' 覆蓋層已注入 (第 ' + page + ' 頁, ' + fields.length + ' 欄位)');
    }

    /* ========== 工具 ========== */
    function syncGlobalDate() {
        var dateSpan = document.querySelector('.date-display span');
        if (!dateSpan) return;
        var storedDate = sessionStorage.getItem('globalDate');
        dateSpan.textContent = storedDate || new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    function showLoading(msg) {
        if (!loadingIndicator) return;
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (msg || 'Loading...');
        loadingIndicator.classList.add('visible');
    }
    function hideLoading() {
        if (loadingIndicator) loadingIndicator.classList.remove('visible');
    }

    function updatePageInfo() {
        var t = document.getElementById('total-pages');
        var c = document.getElementById('current-page');
        if (t) t.textContent = totalVirtualPages;
        if (c) c.textContent = activePageNum;
        var prevBtn = document.getElementById('prev-page');
        var nextBtn = document.getElementById('next-page');
        if (prevBtn) {
            prevBtn.disabled = (activePageNum <= 1);
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            prevBtn.style.cursor  = prevBtn.disabled ? 'not-allowed' : 'pointer';
        }
        if (nextBtn) {
            nextBtn.disabled = (activePageNum >= totalVirtualPages);
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            nextBtn.style.cursor  = nextBtn.disabled ? 'not-allowed' : 'pointer';
        }
        var pageInput = document.getElementById('page-input');
        if (pageInput) {
            pageInput.value = activePageNum;
            pageInput.max   = totalVirtualPages;
        }
    }

    /* ========== 縮放控制 ========== */
    function updateZoomDisplay() {
        var el = document.getElementById('zoom-level');
        if (el) el.textContent = Math.round(zoomLevel * 100) + '%';
        var zoomOutBtn = document.getElementById('zoom-out-btn');
        var zoomInBtn  = document.getElementById('zoom-in-btn');
        if (zoomOutBtn) {
            zoomOutBtn.disabled = (zoomLevel <= ZOOM_MIN + 0.001);
            zoomOutBtn.style.opacity = zoomOutBtn.disabled ? '0.5' : '1';
            zoomOutBtn.style.cursor  = zoomOutBtn.disabled ? 'not-allowed' : 'pointer';
        }
        if (zoomInBtn) {
            zoomInBtn.disabled = (zoomLevel >= ZOOM_MAX - 0.001);
            zoomInBtn.style.opacity = zoomInBtn.disabled ? '0.5' : '1';
            zoomInBtn.style.cursor  = zoomInBtn.disabled ? 'not-allowed' : 'pointer';
        }
    }

    function setZoom(newZoom) {
        if (newZoom < ZOOM_MIN) newZoom = ZOOM_MIN;
        if (newZoom > ZOOM_MAX) newZoom = ZOOM_MAX;
        zoomLevel = Math.round(newZoom * 100) / 100;
        console.log('[Labour] 縮放至 ' + Math.round(zoomLevel * 100) + '%');
        updateZoomDisplay();
        try { captureFormDataFromDom(); } catch (e) {}
        renderCurrentPage();
    }

    function setupZoom() {
        var zoomInBtn    = document.getElementById('zoom-in-btn');
        var zoomOutBtn   = document.getElementById('zoom-out-btn');
        var zoomResetBtn = document.getElementById('zoom-reset-btn');

        if (zoomInBtn)    zoomInBtn.addEventListener('click',    function () { setZoom(zoomLevel + ZOOM_STEP); });
        if (zoomOutBtn)   zoomOutBtn.addEventListener('click',   function () { setZoom(zoomLevel - ZOOM_STEP); });
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', function () { setZoom(1.0); });

        updateZoomDisplay();
    }

    /* ========== 讀取 sessionStorage 文件資料 ========== */
    function loadDocumentData() {
        var sources = ['editDocument', 'currentWageRecord', 'currentRecord'];
        for (var i = 0; i < sources.length; i++) {
            var raw = sessionStorage.getItem(sources[i]);
            if (!raw || raw === 'null' || raw === 'undefined') continue;
            try {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object' && d.id) {
                    console.log('[Labour] ✓ 讀取文件資料來源:', sources[i], '→ id:', d.id);
                    return d;
                }
            } catch (e) {
                console.warn('[Labour] 解析 ' + sources[i] + ' 失敗:', e);
            }
        }
        console.warn('[Labour] ✗ 所有來源都找不到有效文件，將使用 fallback');
        return null;
    }

    function buildFallbackDoc() {
        return {
            id: 'GF527A-TEMP-' + Date.now(),
            status: 'draft',
            approvalStatus: 'draft',
            type: 'GF527A',
            typeText: 'GF527A - Return on Construction Site Employment',
            site: '',
            period: '',
            submittedBy: ''
        };
    }

    function updateDocumentInfo(doc) {
        function setText(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = (val === undefined || val === null || val === '') ? 'N/A' : val;
        }
        setText('docId', doc.id);

        var typeText = doc.typeText;
        if (!typeText && doc.type) {
            if (doc.type === 'GF527A') typeText = 'GF527A - Return on Construction Site Employment';
            else if (doc.type === 'GF527-2003') typeText = 'GF527 (2003) - Labour Wage';
            else if (doc.type === 'GF527-2017') typeText = 'GF527 (2017) - Labour Wage';
            else typeText = doc.type;
        }
        setText('docType', typeText);
        setText('docSite', doc.site || doc.siteName);

        var periodText = doc.period;
        if (!periodText && doc.startDate && doc.endDate) {
            periodText = doc.startDate + ' to ' + doc.endDate;
        }
        setText('docPeriod', periodText);
        setText('docAuthor', doc.submittedBy || doc.author);

        var titleEl = document.getElementById('docTitle');
        if (titleEl) titleEl.textContent = doc.title || typeText || 'Labour Wage Document';

        var statusEl = document.getElementById('docStatus');
        if (statusEl) {
            var statusMap = {
                'draft': 'Draft', 'submitted': 'Submitted',
                'approved': 'Approved', 'rejected': 'Rejected',
                'pending': 'Pending Approval', 'cancelled': 'Cancelled'
            };
            var clsMap = {
                'draft': 'status-draft', 'submitted': 'status-submitted',
                'approved': 'status-approved', 'rejected': 'status-rejected',
                'pending': 'status-pending', 'cancelled': 'status-cancelled'
            };
            var key = doc.approvalStatus || doc.status || 'draft';
            statusEl.textContent = statusMap[key] || doc.statusText || 'Draft';
            statusEl.className = 'doc-status';
            if (clsMap[key]) statusEl.classList.add(clsMap[key]);
        }
    }

    function base64ToUint8(base64) {
        if (base64.indexOf('base64,') !== -1) base64 = base64.split('base64,')[1];
        var binaryString = atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }
    function arrayBufferToBase64(buf) {
        var binary = '';
        var bytes = new Uint8Array(buf);
        var CHUNK = 0x8000;
        for (var i = 0; i < bytes.length; i += CHUNK) {
            var chunk = bytes.subarray(i, i + CHUNK);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    /* ========== 取得 PDF base64（含超時機制） ========== */
    function getTemplateBase64() {
        return new Promise(function (resolve, reject) {
            var docType = (currentDoc && currentDoc.type) || 'GF527A';
            console.log('[Labour] 取得 PDF 模板，類型 =', docType);

            var fromSession = sessionStorage.getItem('labour_template_' + docType);
            if (fromSession && fromSession.length > 100) {
                console.log('[Labour] ✓ 使用 sessionStorage 快取模板:', docType);
                resolve(fromSession); return;
            }

            if (docType === 'GF527A') {
                var e1 = window.LABOURWAGE_BASE64 || window.SITE_DIARY_TEMPLATE_BASE64 || window.GF527A_BASE64;
                if (e1 && e1.length > 100) {
                    console.log('[Labour] ✓ 使用內嵌 GF527A base64 (' + (e1.length/1024).toFixed(0) + ' KB)');
                    resolve(e1); return;
                }
                console.warn('[Labour] ✗ 找不到 GF527A 內嵌 base64，檢查 GF527A-data.js');
            }

             if (docType === 'GF527-2017') {
                var e2 = window.GF527_2017_BASE64;
                if (e2 && e2.length > 100) {
                    console.log('[Labour] ✓ 使用內嵌 GF527-2017 base64 (' + (e2.length/1024).toFixed(0) + ' KB)');
                    resolve(e2); return;
                }
                console.warn('[Labour] ✗ 找不到 GF527-2017 內嵌 base64，檢查 GF5272017-data.js');
            }

            /* ★ GF527-2003：優先使用內嵌 base64（GF527_2003-data.js） */
            if (docType === 'GF527-2003') {
                var e3 = window.GF527_2003_BASE64;
                if (e3 && e3.length > 100) {
                    console.log('[Labour] ✓ 使用內嵌 GF527-2003 base64 (' + (e3.length/1024).toFixed(0) + ' KB)');
                    resolve(e3); return;
                }
                console.warn('[Labour] ✗ 找不到 GF527-2003 內嵌 base64，檢查 GF527_2003-data.js');
            }

            var defaultTpl = sessionStorage.getItem('DEFAULT_PDF_TEMPLATE');

            if (defaultTpl && defaultTpl.length > 100) {
                console.log('[Labour] ✓ 使用 DEFAULT_PDF_TEMPLATE');
                resolve(defaultTpl); return;
            }

            var file = TEMPLATE_FILES[docType];
            if (!file) {
                reject(new Error('沒有對應的模板檔案（' + docType + '）'));
                return;
            }

            console.log('[Labour] 從檔案 fetch PDF 模板:', file);
            var timer = setTimeout(function () {
                reject(new Error('載入模板超時（15 秒）'));
            }, TEMPLATE_LOAD_TIMEOUT);

            fetch(file).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.arrayBuffer();
            }).then(function (buf) {
                clearTimeout(timer);
                var b64 = arrayBufferToBase64(buf);
                try { sessionStorage.setItem('labour_template_' + docType, b64); } catch (e) {}
                resolve(b64);
            }).catch(function (err) {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    function loadPdfFromBase64() {
        return new Promise(function (resolve, reject) {
            getTemplateBase64().then(function (data) {
                if (!data || typeof data !== 'string' || data.length < 100) {
                    reject(new Error('無法取得模板 base64'));
                    return;
                }
                if (!window.pdfjsLib) {
                    reject(new Error('pdfjsLib 未載入'));
                    return;
                }
                try {
                    var bytes = base64ToUint8(data);
                    pdfjsLib.getDocument({ data: bytes }).promise
                        .then(resolve)
                        .catch(function (e) {
                            reject(new Error('PDF 解析失敗: ' + (e && e.message ? e.message : e)));
                        });
                } catch (e) {
                    reject(e);
                }
            }).catch(reject);
        });
    }

    function loadPdfTemplate() {
        return loadPdfFromBase64().then(function (pdf) {
            pdfDoc = pdf;
            totalVirtualPages = pdf.numPages;
            templateImages = [];
            pageCssSizes   = [];
            console.log('[Labour] PDF 載入完成，共 ' + pdf.numPages + ' 頁');

            var chain = Promise.resolve();
            for (var i = 1; i <= pdf.numPages; i++) {
                (function (pageNum) {
                    chain = chain.then(function () {
                        return pdf.getPage(pageNum).then(function (page) {
                            var viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
                            var canvas = document.createElement('canvas');
                            canvas.width  = viewport.width;
                            canvas.height = viewport.height;
                            var ctx = canvas.getContext('2d');
                            return page.render({ canvasContext: ctx, viewport: viewport }).promise
                                .then(function () {
                                    templateImages[pageNum - 1] = canvas.toDataURL('image/png');
                                    pageCssSizes[pageNum - 1] = {
                                        w: (viewport.width  / PDF_RENDER_SCALE) * PDF_DISPLAY_SCALE,
                                        h: (viewport.height / PDF_RENDER_SCALE) * PDF_DISPLAY_SCALE
                                    };
                                    console.log('[Labour] ✓ 第 ' + pageNum + ' 頁渲染完成');
                                    canvas.width = 0; canvas.height = 0;
                                });
                        });
                    });
                })(i);
            }
            return chain;
        });
    }

    function loadTemplate() {
        var type = currentDoc && currentDoc.type;
        console.log('[Labour] 載入模板：' + type);
        return loadPdfTemplate();
    }

    /* ========== 顯示尺寸：容器自適應 + 縮放 ========== */
    function computeDisplaySize(naturalSize) {
        var baseW = naturalSize.w;
        var baseH = naturalSize.h;

        var pdfContainer = document.getElementById('pdf-container');
        if (pdfContainer) {
            var availW = pdfContainer.clientWidth - PDF_CONTAINER_PADDING;
            if (availW > 100 && baseW > availW) {
                var ratio = availW / baseW;
                baseW = availW;
                baseH = baseH * ratio;
            }
        }

        return {
            w: baseW * zoomLevel,
            h: baseH * zoomLevel
        };
    }

    function renderCurrentPage() {
        var idx = activePageNum - 1;
        var imgData = templateImages[idx];
        var naturalSize = pageCssSizes[idx];
        if (!imgData || !naturalSize) {
            console.warn('[Labour] 第 ' + activePageNum + ' 頁尚未渲染');
            return;
        }

        pageWrapper.innerHTML = '';

        var displaySize = computeDisplaySize(naturalSize);

        var pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page active-page';
        pageDiv.dataset.page = activePageNum;
        pageDiv.style.width  = displaySize.w + 'px';
        pageDiv.style.height = displaySize.h + 'px';

        var img = document.createElement('img');
        img.src = imgData;
        img.className = 'pdf-bg';
        img.draggable = false;
        img.alt = 'Labour Wage Template - Page ' + activePageNum;
        pageDiv.appendChild(img);

        injectFormFields(pageDiv);
        pageWrapper.appendChild(pageDiv);

        currentPageObj = { pageNum: activePageNum, container: pageDiv };
        updatePageInfo();
    }

    function goToPage(n) {
        if (n < 1 || n > totalVirtualPages) return;
        activePageNum = n;
        renderCurrentPage();
    }

    function setupNavigation() {
        var prevBtn  = document.getElementById('prev-page');
        var nextBtn  = document.getElementById('next-page');
        var pageInput = document.getElementById('page-input');

        if (prevBtn) prevBtn.addEventListener('click', function () {
            if (activePageNum > 1) goToPage(activePageNum - 1);
        });
        if (nextBtn) nextBtn.addEventListener('click', function () {
            if (activePageNum < totalVirtualPages) goToPage(activePageNum + 1);
        });
        if (pageInput) pageInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                var t = parseInt(pageInput.value, 10);
                if (isNaN(t) || t < 1 || t > totalVirtualPages) {
                    alert('請輸入 1 到 ' + totalVirtualPages + ' 之間的頁碼');
                    pageInput.value = activePageNum;
                    return;
                }
                goToPage(t);
                pageInput.blur();
            } else if (e.key === 'Escape' || e.keyCode === 27) {
                e.preventDefault();
                pageInput.value = activePageNum;
                pageInput.blur();
            }
        });
        if (pageInput) pageInput.addEventListener('focus', function () {
            try { pageInput.select(); } catch (e) {}
        });
    }

    var _resizeTimer = null;
    function bindResizeListener() {
        window.addEventListener('resize', function () {
            if (_resizeTimer) clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(function () {
                if (!templateImages.length) return;
                try { captureFormDataFromDom(); } catch (e) {}
                renderCurrentPage();
            }, 250);
        });
    }

    /* ========== 儲存 / 提交 / 審批 ========== */
    function captureFormDataFromDom() {
        if (!currentDoc) return;
        var docType = currentDoc.type || 'GF527A';
        if (docType !== 'GF527A' && docType !== 'GF527-2017') return;

        var overlay = pageWrapper.querySelector('.pdf-form-overlay');
        if (!overlay) return;
        var inputs = overlay.querySelectorAll('input[data-field-id]');
        for (var i = 0; i < inputs.length; i++) {
            var id = inputs[i].dataset.fieldId;
            if (id) formData[id] = inputs[i].value;
        }
        var checks = overlay.querySelectorAll('.pdf-checkbox[data-field-id]');
        for (var j = 0; j < checks.length; j++) {
            var cid = checks[j].dataset.fieldId;
            if (cid) formData[cid] = checks[j].classList.contains('checked') ? '1' : '';
        }
        persistFormData();
    }

    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }
        captureFormDataFromDom();
        currentDoc.totalPages = totalVirtualPages;
        currentDoc.formData = formData;
        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
        } catch (e) {}
        var stored = localStorage.getItem(STORAGE_KEY);
        var data = [];
        if (stored) { try { var p = JSON.parse(stored); if (Array.isArray(p)) data = p; } catch (e) { data = []; } }
        var idx = -1;
        for (var i = 0; i < data.length; i++) {
            if (String(data[i].id) === String(currentDoc.id)) { idx = i; break; }
        }
        try {
            if (idx !== -1) data[idx] = currentDoc; else data.push(currentDoc);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
        alert('✅ Changes saved successfully!');
    }

    function submitDocument() {
        if (!currentDoc) { alert('No document to submit.'); return; }
        if (!confirm('Submit this document for approval?')) return;
        captureFormDataFromDom();
        currentDoc.approvalStatus = 'pending';
        currentDoc.submittedDate = new Date().toISOString();
        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
        currentDoc.submittedBy = sessionData.userName || currentDoc.submittedBy || 'Unknown';
        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('✅ Document submitted for approval!');
    }

    function approveDocument() {
        if (!currentDoc) return;
        if (!confirm('Approve this document?')) return;
        currentDoc.approvalStatus = 'approved';
        currentDoc.approvedDate = new Date().toISOString();
        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('✅ Document approved!');
    }

    function rejectDocument() {
        if (!currentDoc) return;
        if (!confirm('Reject this document?')) return;
        currentDoc.approvalStatus = 'rejected';
        currentDoc.rejectedDate = new Date().toISOString();
        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('❌ Document rejected.');
    }

    function updateApprovalButtons() {
        var approveBtn = document.getElementById('approve-btn');
        var rejectBtn  = document.getElementById('reject-btn');
        var submitBtn  = document.getElementById('submit-btn');
        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
        var canApprove = sessionData.permissions && sessionData.permissions.canChangeStatus;
        if (!canApprove) {
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn)  rejectBtn.style.display  = 'none';
        } else {
            if (approveBtn) approveBtn.style.display = 'inline-flex';
            if (rejectBtn)  rejectBtn.style.display  = 'inline-flex';
        }
        if (submitBtn) {
            var disabled = !!(currentDoc && currentDoc.approvalStatus === 'approved');
            submitBtn.disabled = disabled;
            submitBtn.style.opacity = disabled ? '0.5' : '1';
        }
    }

    function cancelEditing() { window.location.href = 'labourwage.html'; }

    function bindActionButtons() {
        var saveBtn    = document.getElementById('save-btn');
        var cancelBtn  = document.getElementById('cancel-btn');
        var submitBtn  = document.getElementById('submit-btn');
        var approveBtn = document.getElementById('approve-btn');
        var rejectBtn  = document.getElementById('reject-btn');
        if (saveBtn)    saveBtn.addEventListener('click', saveChanges);
        if (cancelBtn)  cancelBtn.addEventListener('click', cancelEditing);
        if (submitBtn)  submitBtn.addEventListener('click', submitDocument);
        if (approveBtn) approveBtn.addEventListener('click', approveDocument);
        if (rejectBtn)  rejectBtn.addEventListener('click', rejectDocument);
    }

    function setupSidebar() {
        function saveSidebarState() {
            var sb = document.querySelector('.sidebar');
            if (sb) localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed') ? 'true' : 'false');
        }
        var sb = document.querySelector('.sidebar');
        if (sb && localStorage.getItem('sidebarCollapsed') === 'true') sb.classList.add('collapsed');
        var tb = document.querySelector('.toggle-btn');
        if (tb) tb.addEventListener('click', function () { setTimeout(saveSidebarState, 50); });
    }

    /* ========== 初始化 ========== */
    document.addEventListener('DOMContentLoaded', function () {
        console.log('[Labour] ====== 初始化開始 ======');
        try {
            syncGlobalDate();
            setupSidebar();
            bindResizeListener();
            setupZoom();

            var doc = loadDocumentData();
            if (!doc) {
                console.warn('[Labour] 使用 fallback 文件（GF527A 預設）');
                doc = buildFallbackDoc();
            }
            currentDoc = doc;

            if (!currentDoc.type) currentDoc.type = 'GF527A';
            if (!currentDoc.typeText) {
                if (currentDoc.type === 'GF527A') currentDoc.typeText = 'GF527A - Return on Construction Site Employment';
                else if (currentDoc.type === 'GF527-2003') currentDoc.typeText = 'GF527 (2003) - Labour Wage';
                else if (currentDoc.type === 'GF527-2017') currentDoc.typeText = 'GF527 (2017) - Labour Wage';
            }

            formDocId = getFormDocId();
            formData = loadFormData();
            console.log('[Labour] 表單 docId:', formDocId, '已載入欄位:', Object.keys(formData).length);

            totalVirtualPages = 1;
            updateDocumentInfo(currentDoc);
            updatePageInfo();

            var loadingMsg = 'Loading ' + (currentDoc.type || 'GF527A') + ' template...';
            showLoading(loadingMsg);

            loadTemplate().then(function () {
                console.log('[Labour] ✓ 模板載入成功');
                hideLoading();
                renderCurrentPage();
                setupNavigation();
                bindActionButtons();
                updatePageInfo();
                updateZoomDisplay();
                setTimeout(function () { updateApprovalButtons(); }, 500);
                console.log('[Labour] Editor ready. Type:', currentDoc.type, 'Total pages:', totalVirtualPages);
            }).catch(function (err) {
                console.error('[Labour] ✗ 模板載入失敗:', err);
                hideLoading();
                if (pageWrapper) {
                    pageWrapper.innerHTML =
                        '<div style="padding:40px;text-align:center;color:#e74c3c;background:#fff;border-radius:8px;">' +
                        '<i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br><br>' +
                        '<strong>Failed to load template</strong><br>' +
                        '<small>Type: ' + ((currentDoc && currentDoc.type) || 'GF527A') + '</small><br>' +
                        '<small>Error: ' + (err && err.message ? err.message : 'unknown') + '</small><br><br>' +
                        '<small style="color:#94a3b8;">請檢查 Console 的詳細錯誤訊息</small>' +
                        '</div>';
                }
            });

        } catch (err) {
            console.error('[Labour] ✗ Init failed:', err);
            if (pageWrapper) {
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;">' +
                    'Init error: ' + (err && err.message ? err.message : 'unknown') +
                    '</div>';
            }
        }
    });

})();