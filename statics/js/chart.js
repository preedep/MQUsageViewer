// Chart and graph functionality module
class ChartManager {
    constructor(apiService) {
        this.apiService = apiService;
        this.chartInstance = null;
    }

    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    createChart(ctx, config) {
        this.destroyChart();
        this.chartInstance = new Chart(ctx, config);
        return this.chartInstance;
    }

    async generateAggregateChart(startDate, endDate, grouping) {
        try {
            const payload = {
                from_datetime: Utils.buildIso(startDate, true),
                to_datetime: Utils.buildIso(endDate, false),
                mq_function_name: "" // Not used by all_summary endpoint
            };

            const result = await this.apiService.fetchAllTpsSummary(payload);
            
            if (!result.success || !result.data.length) {
                alert('No aggregate TPS data available for the selected time range.');
                return false;
            }

            const summaryData = result.data;
            const labels = summaryData.map(row => {
                const { key } = Utils.getSmartGroupKey(startDate, endDate, row.date_time, grouping);
                return key;
            });

            const values = summaryData.map(row => row.trans_per_sec);
            const maxValue = values.length ? Math.max(...values) : 0;

            const xAxisLabel = Utils.getSmartGroupKey(
                startDate,
                endDate,
                summaryData[0]?.date_time,
                grouping
            ).label;

            const ctx = document.getElementById('chart').getContext('2d');
            this.createChart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'TPS Summary (All MQ Functions)',
                        data: values,
                        borderColor: 'rgba(40,167,69,1)',
                        backgroundColor: 'rgba(40,167,69,0.2)',
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true },
                        title: { display: true, text: 'TPS Summary (All MQ Functions)', font: { size: 20 } }
                    },
                    scales: {
                        x: { title: { display: true, text: xAxisLabel, font: { size: 16 } }, ticks: { autoSkip: true, maxTicksLimit: 20 } },
                        y: { beginAtZero: true, suggestedMax: maxValue * 1.1, title: { display: true, text: 'Transactions per Second (TPS)', font: { size: 16 } } }
                    }
                }
            });
            return true;
        } catch (e) {
            console.error('Aggregate TPS graph error:', e);
            alert('Failed to generate aggregate TPS graph.');
            return false;
        }
    }

    async generateFunctionChart(startDate, endDate, grouping, func, sys) {
        try {
            const payload = {
                from_datetime: Utils.buildIso(startDate, true),
                to_datetime: Utils.buildIso(endDate, false),
                mq_function_name: func,
            };
            if (sys) payload.system_name = sys;

            const summaryData = await this.apiService.fetchTpsSummary(payload);
            
            if (!summaryData.length) {
                alert('No TPS data available for the selected function and time range.');
                return false;
            }

            const labels = summaryData.map(row => {
                const { key } = Utils.getSmartGroupKey(startDate, endDate, row.date_time, grouping);
                return key;
            });

            const values = summaryData.map(row => row.trans_per_sec);
            const maxValue = Math.max(...values);

            const xAxisLabel = Utils.getSmartGroupKey(
                startDate,
                endDate,
                summaryData[0]?.date_time,
                grouping
            ).label;

            const ctx = document.getElementById('chart').getContext('2d');
            this.createChart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: `TPS Summary`,
                        data: values,
                        borderColor: 'rgba(0,123,255,1)',
                        backgroundColor: 'rgba(0,123,255,0.2)',
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true },
                        title: {
                            display: true,
                            text: `TPS Summary (${func})`,
                            font: { size: 20 }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: xAxisLabel, font: { size: 16 } },
                            ticks: { autoSkip: true, maxTicksLimit: 20 }
                        },
                        y: {
                            beginAtZero: true,
                            suggestedMax: maxValue * 1.1,
                            title: { display: true, text: 'Transactions per Second (TPS)', font: { size: 16 } }
                        }
                    }
                }
            });
            return true;
        } catch (e) {
            console.error('Function TPS graph error:', e);
            alert('Failed to generate TPS graph.');
            return false;
        }
    }
}

// Export for use in other modules
window.ChartManager = ChartManager;
