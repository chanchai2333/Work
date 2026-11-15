/**
 * =====================================================
 * Dashboard Charts - index.html only
 * =====================================================
 */

(function () {

    if (!document.getElementById('siteDiaryChart')) return;

    function loadChartJs(callback) {
        if (window.Chart) {
            callback();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    function initCharts() {
        const labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);

        new Chart(siteDiaryChart, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Site Diary',
                    data: labels.map(() => Math.floor(Math.random() * 10) + 2),
                    borderColor: '#3498db',
                    fill: false
                }]
            }
        });

        new Chart(safetyInspectionChart, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Safety Inspection',
                    data: labels.map(() => Math.floor(Math.random() * 8) + 1),
                    borderColor: '#e67e22',
                    fill: false
                }]
            }
        });

        new Chart(labourWageChart, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Labour Wage',
                    data: labels.map(() => Math.floor(Math.random() * 6) + 1),
                    borderColor: '#2ecc71',
                    fill: false
                }]
            }
        });
    }

    loadChartJs(initCharts);

})();
