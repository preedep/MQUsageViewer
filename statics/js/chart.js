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

    // Helper function to get month key from date string
    _getMonthKey(dateStr) {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // Process data to get monthly peaks
    _getMonthlyPeaks(data, dateKey = 'date_time', valueKey = 'trans_per_sec') {
        const monthlyPeaks = new Map();
        
        data.forEach(item => {
            const monthKey = this._getMonthKey(item[dateKey]);
            const currentValue = parseFloat(item[valueKey]);
            
            if (!monthlyPeaks.has(monthKey) || currentValue > monthlyPeaks.get(monthKey).value) {
                monthlyPeaks.set(monthKey, {
                    date: item[dateKey],
                    value: currentValue,
                    label: new Date(item[dateKey]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                });
            }
        });
        
        // Convert map to array and sort by date
        return Array.from(monthlyPeaks.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    async generateAggregateChart(startDate, endDate, grouping, timeInterval) {
        try {
            const showPeaks = document.getElementById('show-peaks').checked;
            const payload = {
                from_datetime: Utils.buildIso(startDate, true),
                to_datetime: Utils.buildIso(endDate, false),
                mq_function_name: "", // Not used by all_summary endpoint
                time_interval_minutes: timeInterval
            };

            const result = await this.apiService.fetchAllTpsSummary(payload);
            
            if (!result.success || !result.data.length) {
                alert('No aggregate TPS data available for the selected time range.');
                return false;
            }

            let summaryData = result.data;
            let labels, values;

            if (showPeaks) {
                const peaks = this._getMonthlyPeaks(summaryData);
                labels = peaks.map(peak => peak.label);
                values = peaks.map(peak => peak.value);
                grouping = 'monthly'; // Force monthly grouping for peaks
            } else {
                labels = summaryData.map(row => {
                    const { key } = Utils.getSmartGroupKey(startDate, endDate, row.date_time, grouping);
                    return key;
                });
                values = summaryData.map(row => row.trans_per_sec);
            }
            
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
                        title: { 
                            display: true, 
                            text: 'TPS Summary (All MQ Functions)', 
                            font: { size: 20 } 
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    const date = showPeaks 
                                        ? new Date(summaryData.find(d => d.trans_per_sec === value)?.date_time)
                                        : new Date(summaryData[context.dataIndex]?.date_time);
                                    const formattedDate = date ? date.toLocaleString('th-TH', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : '';
                                    return `${label}: ${value} TPS\n${formattedDate}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            title: { 
                                display: true, 
                                text: xAxisLabel, 
                                font: { size: 16 } 
                            }, 
                            ticks: { 
                                autoSkip: true, 
                                maxTicksLimit: 20 
                            } 
                        },
                        y: { 
                            beginAtZero: true, 
                            suggestedMax: maxValue * 1.1, 
                            title: { 
                                display: true, 
                                text: 'Transactions per Second (TPS)', 
                                font: { size: 16 } 
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('en-US');
                                }
                            }
                        }
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

    async generateFunctionChart(startDate, endDate, grouping, func, sys, timeInterval) {
        try {
            const showPeaks = document.getElementById('show-peaks').checked;
            const payload = {
                from_datetime: Utils.buildIso(startDate, true),
                to_datetime: Utils.buildIso(endDate, false),
                mq_function_name: func,
                time_interval_minutes: timeInterval
            };
            if (sys) payload.system_name = sys;

            let summaryData = await this.apiService.fetchTpsSummary(payload);
            
            if (!summaryData.length) {
                alert('No TPS data available for the selected function and time range.');
                return false;
            }

            let labels, values;

            if (showPeaks) {
                const peaks = this._getMonthlyPeaks(summaryData);
                labels = peaks.map(peak => peak.label);
                values = peaks.map(peak => peak.value);
                grouping = 'monthly'; // Force monthly grouping for peaks
            } else {
                labels = summaryData.map(row => {
                    const { key } = Utils.getSmartGroupKey(startDate, endDate, row.date_time, grouping);
                    return key;
                });
                values = summaryData.map(row => row.trans_per_sec);
            }
            
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
                        },
                        subtitle: sys ? {
                            display: true,
                            text: `System: ${sys}`,
                            font: { size: 16 },
                            padding: { bottom: 10 }
                        } : null,
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    const date = showPeaks 
                                        ? new Date(summaryData.find(d => d.trans_per_sec === value)?.date_time)
                                        : new Date(summaryData[context.dataIndex]?.date_time);
                                    const formattedDate = date ? date.toLocaleString('th-TH', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : '';
                                    return `${label}: ${value} TPS\n${formattedDate}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            title: { 
                                display: true, 
                                text: xAxisLabel, 
                                font: { size: 16 } 
                            }, 
                            ticks: { 
                                autoSkip: true, 
                                maxTicksLimit: 20 
                            } 
                        },
                        y: { 
                            beginAtZero: true, 
                            suggestedMax: maxValue * 1.1, 
                            title: { 
                                display: true, 
                                text: 'Transactions per Second (TPS)', 
                                font: { size: 16 } 
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('en-US');
                                }
                            }
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
