/**
 * labour-form-layouts.js
 * 供「查看頁 (labourdocument.html)」使用的表單欄位布局定義
 * 內容與 editlabour.js 完全同步（GF527A / GF527-2017 / GF527-2003）
 */
window.LABOUR_FORM_LAYOUTS = (function () {

    /* ============ GF527A : USER 欄位 ============ */
    var USER_FIELDS = [
        { id: 'f01', left: '34.64%', top: '9.04%',  width: '55%', height: '1.8%' },
        { id: 'f02', left: '28.78%', top: '10.92%', width: '55%', height: '1.8%' },
        { id: 'f09', left: '18.67%', top: '13.49%', width: '52%', height: '1.8%' },
        { id: 'f10', type: 'check', left: '10.67%', top: '15.79%', width: '3%', height: '1.8%' },
        { id: 'f12', left: '80.14%', top: '13.69%', width: '13%', height: '1.8%' },
        { id: 'f03', left: '41.14%', top: '22.89%', width: '34%', height: '1.8%' },
        { id: 'f04', left: '35.14%', top: '25.69%', width: '60%', height: '1.8%' },
        { id: 'f05', left: '15.14%', top: '27.69%', width: '60%', height: '1.8%' },
        { id: 'f06', left: '85.74%', top: '27.69%', width: '10%', height: '1.8%' },
        { id: 'f17', left: '19.51%', top: '18.44%', width: '77%', height: '1.8%' },
        { id: 'f18', left: '38.53%', top: '20.98%', width: '37%', height: '1.8%' },
        { id: 'f19', left: '80.80%', top: '20.62%', width: '15%', height: '1.8%' },
        { id: 'f20', left: '80.80%', top: '23.34%', width: '15%', height: '1.8%' }
    ];

    /* ============ GF527A : AI 欄位 ============ */
    var AI_FIELDS = [
        { id: 'ai01', type: 'check', left: '6.70%',  top: '33.91%', width: '2.24%', height: '1.59%' },
        { id: 'ai02', type: 'check', left: '6.70%',  top: '36.20%', width: '2.52%', height: '1.48%' },
        { id: 'ai03', type: 'check', left: '6.70%',  top: '38.28%', width: '2.20%', height: '1.50%' },
        { id: 'ai04', type: 'check', left: '38.54%', top: '34.00%', width: '2.52%', height: '1.29%' },
        { id: 'ai05', type: 'check', left: '38.54%', top: '36.00%', width: '2.52%', height: '1.58%' },
        { id: 'ai06', left: '72.88%', top: '33.91%', width: '12.46%', height: '1.59%' },
        { id: 'ai07', left: '26.94%', top: '41.04%', width: '10.50%', height: '1.68%' },
        { id: 'ai08', left: '65.87%', top: '41.34%', width: '7.71%',  height: '1.58%' },
        { id: 'ai09', left: '51.17%', top: '51.83%', width: '8.40%',  height: '2.18%' },
        { id: 'ai10', left: '51.59%', top: '54.20%', width: '7.56%',  height: '1.88%' },
        { id: 'ai11', left: '51.59%', top: '56.38%', width: '7.84%',  height: '1.78%' },
        { id: 'ai12', left: '51.45%', top: '58.76%', width: '7.84%',  height: '1.58%' },
        { id: 'ai13', left: '52.01%', top: '60.83%', width: '7.14%',  height: '1.39%' },
        { id: 'ai14', left: '51.73%', top: '62.81%', width: '7.56%',  height: '1.69%' },
        { id: 'ai15', left: '51.59%', top: '64.79%', width: '7.98%',  height: '2.08%' },
        { id: 'ai16', left: '62.51%', top: '52.03%', width: '7.42%',  height: '1.78%' },
        { id: 'ai17', left: '7.19%',  top: '74.20%', width: '50.14%', height: '2.0%' },
        { id: 'ai18', left: '7.19%',  top: '76.20%', width: '50.14%', height: '2.0%' },
        { id: 'ai19', left: '7.19%',  top: '78.40%', width: '50.14%', height: '2.0%' },
        { id: 'ai20', left: '7.19%',  top: '80.60%', width: '50.14%', height: '2.0%' },
        { id: 'ai21', left: '7.19%',  top: '82.60%', width: '50.14%', height: '2.0%' },
        { id: 'ai22', left: '62.79%', top: '74.30%', width: '7.98%',  height: '1.78%' },
        { id: 'ai23', left: '62.79%', top: '76.27%', width: '7.98%',  height: '2.08%' },
        { id: 'ai24', left: '62.79%', top: '78.60%', width: '7.98%',  height: '1.78%' },
        { id: 'ai25', left: '62.79%', top: '80.63%', width: '7.98%',  height: '1.88%' },
        { id: 'ai26', left: '62.79%', top: '82.71%', width: '7.98%',  height: '1.88%' },
        { id: 'ai27', left: '20.92%', top: '86.57%', width: '14.84%', height: '1.68%' },
        { id: 'ai28', left: '44.16%', top: '86.27%', width: '7.85%',  height: '2.08%' },
        { id: 'ai29', left: '60.97%', top: '86.27%', width: '5.88%',  height: '1.98%' },
        { id: 'ai30', left: '73.30%', top: '86.47%', width: '7.70%',  height: '1.98%' },
        { id: 'ai31', left: '76.94%', top: '52.12%', width: '19.33%', height: '1.29%' },
        { id: 'ai32', left: '75.96%', top: '56.08%', width: '2.94%',  height: '2.35%' },
        { id: 'ai33', left: '79.60%', top: '56.08%', width: '2.94%',  height: '2.35%' },
        { id: 'ai34', left: '83.10%', top: '56.08%', width: '2.94%',  height: '2.35%' },
        { id: 'ai35', left: '86.60%', top: '56.08%', width: '2.94%',  height: '2.35%' },
        { id: 'ai36', left: '90.10%', top: '56.08%', width: '2.94%',  height: '2.35%' },
        { id: 'ai37', left: '93.32%', top: '56.08%', width: '2.94%',  height: '2.35%' },
        { id: 'ai38', left: '76.38%', top: '60.24%', width: '2.94%',  height: '2.30%' },
        { id: 'ai39', left: '79.74%', top: '60.24%', width: '2.94%',  height: '2.30%' },
        { id: 'ai40', left: '83.36%', top: '60.24%', width: '3.00%',  height: '2.30%' },
        { id: 'ai41', left: '89.96%', top: '60.24%', width: '2.94%',  height: '2.30%' },
        { id: 'ai42', left: '75.96%', top: '64.79%', width: '2.94%',  height: '2.30%' },
        { id: 'ai43', left: '83.18%', top: '64.79%', width: '2.94%',  height: '2.30%' },
        { id: 'ai44', left: '86.74%', top: '64.79%', width: '2.94%',  height: '2.30%' },
        { id: 'ai45', left: '90.10%', top: '64.79%', width: '2.94%',  height: '2.30%' },
        { id: 'ai46', left: '93.20%', top: '64.79%', width: '2.94%',  height: '2.30%' },
        { id: 'ai47', left: '79.62%', top: '74.00%', width: '2.94%',  height: '2.30%' },
        { id: 'ai48', left: '83.18%', top: '74.09%', width: '2.94%',  height: '2.30%' },
        { id: 'ai49', left: '79.40%', top: '78.35%', width: '2.94%',  height: '2.30%' },
        { id: 'ai50', left: '83.10%', top: '78.35%', width: '2.94%',  height: '2.30%' },
        { id: 'ai51', left: '79.60%', top: '82.61%', width: '2.94%',  height: '2.30%' },
        { id: 'ai52', left: '82.82%', top: '82.61%', width: '2.94%',  height: '2.30%' }
    ];

    /* ============ GF527-2003 ============ */
    var GF527_2003_FIELDS = [
        { id: 'gf_01', left: '5.57%',  top: '5.17%',  width: '2.57%',  height: '1.08%' },
        { id: 'gf_02', left: '9.16%',  top: '5.07%',  width: '2.88%',  height: '1.27%' },
        { id: 'gf_03', left: '16.80%', top: '5.00%',  width: '1.84%',  height: '1.44%' },
        { id: 'gf_04', left: '19.03%', top: '5.00%',  width: '1.84%',  height: '1.26%' },
        { id: 'gf_05', left: '35.30%', top: '5.17%',  width: '6.34%',  height: '1.44%' },
        { id: 'gf_06', left: '50.22%', top: '4.80%',  width: '9.61%',  height: '1.81%' },
        { id: 'gf_07', left: '66.88%', top: '4.71%',  width: '6.73%',  height: '2.09%' },
        { id: 'gf_08', left: '76.15%', top: '4.31%',  width: '3.00%',  height: '1.00%' },
        { id: 'gf45',  left: '20.00%', top: '11.10%', width: '40.00%', height: '1.50%' }
    ];

    /* ============ GF527-2017 第1頁 ============ */
    /* 工具：依 left 陣列批次產生欄位 */
    function row(startId, top, height, lefts, widths) {
        return lefts.map(function (l, i) {
            return {
                id: 'g17_' + String(startId + i).padStart(2, '0'),
                left: l,
                top: top,
                width: (widths && widths[i]) || '1.47%',
                height: height
            };
        });
    }

    /* 共用 left 模式 (36 個欄位用) */
    var L36 = ['39.00%','40.50%','42.00%','43.50%','45.00%','46.50%','48.00%','49.50%',
               '51.10%','52.60%','54.10%','55.70%','57.20%','58.70%','60.20%','61.80%',
               '63.30%','64.80%','66.30%','67.80%','69.50%','71.00%','72.50%','74.00%',
               '75.50%','77.00%','78.50%','80.00%','81.50%','83.00%','84.50%','86.50%',
               '88.50%','91.00%','93.00%','94.80%'];

    var W36 = ['1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%',
               '1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%',
               '1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%',
               '1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.47%','1.97%',
               '2.47%','1.77%','1.77%','1.77%'];

    var G17_P1 = []
        .concat([
            { id: 'g17_01', left: '5.57%',  top: '5.17%',  width: '2.57%', height: '1.08%' },
            { id: 'g17_02', left: '9.16%',  top: '5.07%',  width: '2.88%', height: '1.27%' },
            { id: 'g17_03', left: '16.80%', top: '5.00%',  width: '1.84%', height: '1.44%' },
            { id: 'g17_04', left: '19.03%', top: '5.00%',  width: '1.84%', height: '1.26%' },
            { id: 'g17_05', left: '35.30%', top: '5.17%',  width: '6.34%', height: '1.44%' },
            { id: 'g17_06', left: '50.22%', top: '4.80%',  width: '9.61%', height: '1.81%' },
            { id: 'g17_07', left: '66.88%', top: '4.71%',  width: '6.73%', height: '2.09%' },
            { id: 'g17_08', left: '76.15%', top: '4.31%',  width: '0.83%', height: '1.00%' },
            { id: 'g17_09', left: '39.0%',  top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_10', left: '40.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_11', left: '42.00%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_12', left: '43.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_13', left: '45.00%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_14', left: '46.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_15', left: '48.00%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_16', left: '49.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_17', left: '51.10%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_18', left: '52.60%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_19', left: '54.10%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_20', left: '55.70%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_21', left: '57.20%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_22', left: '58.70%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_23', left: '60.20%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_24', left: '61.80%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_25', left: '63.30%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_26', left: '64.80%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_27', left: '66.30%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_28', left: '67.80%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_29', left: '69.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_30', left: '71.0%',  top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_31', left: '72.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_32', left: '74.0%',  top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_33', left: '75.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_34', left: '77.0%',  top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_35', left: '78.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_36', left: '80.0%',  top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_37', left: '81.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_38', left: '83.00%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_39', left: '84.50%', top: '11.10%', width: '1.47%', height: '1.26%' },
            { id: 'g17_40', left: '86.50%', top: '11.10%', width: '1.97%', height: '1.26%' },
            { id: 'g17_41', left: '88.50%', top: '11.10%', width: '2.47%', height: '1.26%' },
            { id: 'g17_42', left: '91.00%', top: '11.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_43', left: '93.00%', top: '11.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_44', left: '94.80%', top: '11.10%', width: '1.77%', height: '1.26%' },
            { id: 'g17_45', left: '91.00%', top: '5.00%',  width: '5.77%', height: '1.26%' }
        ])
        .concat(row(46,  '14.10%', '3.26%', L36, W36))
        .concat(row(82,  '19.40%', '2.76%', L36, W36))
        .concat(row(118, '26.10%', '1.26%', L36, W36))
        .concat(row(154, '22.30%', '1.26%', L36, W36))
        .concat(row(190, '23.8%',  '1.26%', L36, W36))
        .concat(row(226, '28.80%', '1.26%', L36, W36))
        .concat(row(262, '31.70%', '3.26%', L36, W36))
        .concat(row(298, '38.10%', '1.26%', L36, W36))
        .concat(row(334, '48.00%', '5.26%', L36, W36))
        .concat(row(370, '61.00%', '3.26%', L36, W36))
        .concat(row(406, '66.00%', '2.26%', L36, W36))
        .concat(row(442, '72.00%', '5.26%', L36, W36))
        .concat(row(478, '81.50%', '1.26%', L36, W36))
        .concat(row(514, '83.50%', '1.26%', L36, W36))
        .concat(row(550, '86.00%', '3.26%', L36, W36))
        .concat(row(586, '91.00%', '3.26%', L36, W36));

    /* ============ GF527-2017 第3頁 ============ */
    var G17_P3 = []
        .concat(row(622, '14.20%', '3.26%', L36, W36))
        .concat(row(658, '5.00%',  '3.26%', L36, W36))
        .concat(row(694, '9.20%',  '1.50%', L36, W36))
        .concat(row(730, '11.20%', '2.50%', L36, W36))
        .concat(row(765, '19.00%', '3.50%', L36, W36))
        .concat(row(801, '23.00%', '1.50%', L36, W36));

    return {
        'GF527A':              USER_FIELDS.concat(AI_FIELDS),
        'GF527-2003':          GF527_2003_FIELDS,
        'GF527-2017-page1':    G17_P1,
        'GF527-2017-page3':    G17_P3
    };
})();