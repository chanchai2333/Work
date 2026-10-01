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
            /* 格子 8 (#29~#32) */ { id: 'g17_08', label: '', left: '76.15%', top: '4.31%',  width: '0.83%',  height: '1.00%' },
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
            { id: 'gf_01', label: '', left: '5.57%',  top: '5.17%',  width: '2.57%',  height: '1.08%' },
            { id: 'gf_02', label: '', left: '9.16%',  top: '5.07%',  width: '2.88%',  height: '1.27%' },
            { id: 'gf_03', label: '', left: '13.80%', top: '5.00%',  width: '1.84%',  height: '1.44%' },
            { id: 'gf_04', label: '', left: '16.03%', top: '5.00%',  width: '1.84%',  height: '1.26%' },
            { id: 'gf_05', label: '', left: '30.30%', top: '5.17%',  width: '6.34%',  height: '1.44%' },
            { id: 'gf_06', label: '', left: '45.22%', top: '4.80%',  width: '9.61%',  height: '1.81%' },
            { id: 'gf_07', label: '', left: '60.88%', top: '4.71%',  width: '6.73%',  height: '2.09%' },
            { id: 'gf_08', label: '', left: '70.15%', top: '4.31%',  width: '3.00%',  height: '1.00%' },
            /* gf45 - 中部主要欄位 */
            { id: 'gf_45',  label: '', left: '90.00%', top: '4.71%', width: '20.00%', height: '1.50%' },
            { id: 'gf_46', label: '', left: '30.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_47', label: '', left: '32.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_48', label: '', left: '34.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_49', label: '', left: '36.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_50', label: '', left: '38.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_51', label: '', left: '40.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_52', label: '', left: '42.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_53', label: '', left: '44.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_54', label: '', left: '46.10%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_55', label: '', left: '48.60%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_56', label: '', left: '50.10%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_57', label: '', left: '52.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_58', label: '', left: '54.20%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_59', label: '', left: '56.70%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_60', label: '', left: '58.20%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_61', label: '', left: '60.80%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_62', label: '', left: '62.30%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_63', label: '', left: '64.80%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_64', label: '', left: '66.30%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_65', label: '', left: '67.80%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_66', label: '', left: '69.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_67', label: '', left: '71.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_68', label: '', left: '72.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_69', label: '', left: '74.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_70', label: '', left: '75.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_71', label: '', left: '77.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_72', label: '', left: '78.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_73', label: '', left: '80.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_74', label: '', left: '81.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_75', label: '', left: '83.00%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_76', label: '', left: '84.50%', top: '11.10%', width: '1.47%', height: '1.56%' },
            { id: 'gf_77', label: '', left: '86.50%', top: '11.10%', width: '1.97%', height: '1.56%' },
            { id: 'gf_78', label: '', left: '88.50%', top: '11.10%', width: '2.47%', height: '1.56%' },
            { id: 'gf_79', label: '', left: '91.00%', top: '11.10%', width: '1.77%', height: '1.56%' },
            { id: 'gf_80', label: '', left: '93.00%', top: '11.10%', width: '1.77%', height: '1.56%' },
            { id: 'gf_81', label: '', left: '94.80%', top: '11.10%', width: '1.77%', height: '1.56%' },
            

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

    function buildField(field) {
        if (field.type === 'check') return buildCheckbox(field);
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
                var e2 = window.GF527_2017_BASE64 || window.GF527_REV_1_2017_PROTECTED_FONT_SIZE_26_BASE64;
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