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
    _getMonthlyPeaks(data, timeInterval = 15, dateKey = 'date_time', valueKey = 'trans_per_sec') {
        // First group data by time intervals
        const intervalData = this._groupByTimeInterval(data, timeInterval, dateKey, valueKey);
        
        // Then find monthly peaks from the interval data
        const monthlyPeaks = new Map();
        
        intervalData.forEach(item => {
            const monthKey = this._getMonthKey(item.date);
            const currentValue = item.value;
            
            if (!monthlyPeaks.has(monthKey) || currentValue > monthlyPeaks.get(monthKey).value) {
                monthlyPeaks.set(monthKey, {
                    date: item.date,
                    value: currentValue,
                    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                });
            }
        });
        
        // Convert map to array and sort by date
        return Array.from(monthlyPeaks.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    // Helper function to group data by time intervals
    _groupByTimeInterval(data, intervalMinutes, dateKey, valueKey) {
        if (!data.length) return [];
        
        // Convert interval from minutes to milliseconds
        const intervalMs = intervalMinutes * 60 * 1000;
        
        // Sort data by date
        const sortedData = [...data].sort((a, b) => 
            new Date(a[dateKey]) - new Date(b[dateKey])
        );
        
        const result = [];
        let currentInterval = null;
        let currentMax = -Infinity;
        let currentMaxDate = null;
        
        sortedData.forEach(item => {
            const date = new Date(item[dateKey]);
            const timestamp = date.getTime();
            const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs;
            
            if (currentInterval !== intervalStart) {
                // Save previous interval's max if exists
                if (currentInterval !== null) {
                    result.push({
                        date: currentMaxDate,
                        value: currentMax
                    });
                }
                // Start new interval
                currentInterval = intervalStart;
                currentMax = -Infinity;
                currentMaxDate = null;
            }
            
            // Update max for current interval
            const value = parseFloat(item[valueKey]);
            if (value > currentMax) {
                currentMax = value;
                currentMaxDate = item[dateKey];
            }
        });
        
        // Add the last interval
        if (currentMax !== -Infinity) {
            result.push({
                date: currentMaxDate,
                value: currentMax
            });
        }
        
        return result;
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
            const showPeaks = document.getElementById('show-peaks')?.checked || false;
            const payload = {
                from_datetime: window.Utils?.buildIso?.(startDate, true) || startDate,
                to_datetime: window.Utils?.buildIso?.(endDate, false) || endDate,
                mq_function_name: func,
                time_interval_minutes: timeInterval || 15
            };
            
            if (sys && !Array.isArray(sys)) {
                payload.system_name = sys;
            } else if (Array.isArray(sys) && sys.length > 0) {
                // Handle multiple systems if needed
                payload.system_names = sys;
            }

            const summaryData = await this.apiService.fetchTpsSummary(payload);
            
            if (!summaryData || !Array.isArray(summaryData) || summaryData.length === 0) {
                console.error('No data returned from fetchTpsSummary');
                alert('No TPS data available for the selected function and time range.');
                return false;
            }

            let labels = [];
            let values = [];

            if (showPeaks) {
                const peaks = this._getMonthlyPeaks(summaryData);
                labels = peaks.map(peak => peak.label);
                values = peaks.map(peak => peak.value);
                grouping = 'monthly'; // Force monthly grouping for peaks
            } else {
                labels = summaryData.map(row => {
                    if (window.Utils?.getSmartGroupKey) {
                        const { key } = window.Utils.getSmartGroupKey(startDate, endDate, row.date_time, grouping);
                        return key;
                    }
                    return new Date(row.date_time).toLocaleString();
                });
                values = summaryData.map(row => parseFloat(row.trans_per_sec) || 0);
            }
            
            const maxValue = values.length > 0 ? Math.max(...values) * 1.1 : 10; // Add 10% padding
            
            // Format dates for tooltips
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    console.error('Error formatting date:', e);
                    return dateStr;
                }
            };
            
            // Get chart container
            const chartElement = document.getElementById('chart');
            if (!chartElement) {
                console.error('Chart container not found');
                return false;
            }
            
            // Destroy existing chart if it exists
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }
            
            // Create new chart instance
            const ctx = chartElement.getContext('2d');
            this.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${func}${sys ? ' - ' + (Array.isArray(sys) ? sys.join(', ') : sys) : ''}`,
                        data: values,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `TPS Data for ${func}${sys ? ' - ' + (Array.isArray(sys) ? sys.join(', ') : sys) : ''}`,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += new Intl.NumberFormat('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        }).format(context.parsed.y) + ' TPS';
                                    }
                                    return label;
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
            alert('Failed to generate TPS graph: ' + (e.message || 'Unknown error occurred'));
            return false;
        }
    }
}

// Export for use in other modules
window.ChartManager = ChartManager;
