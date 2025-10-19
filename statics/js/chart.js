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
        // Destroy any existing chart on this canvas
        this.destroyChart();
        
        // Also destroy any chart that might be attached to the canvas directly
        const canvasElement = ctx.canvas || ctx;
        if (canvasElement && canvasElement.id) {
            const existingChart = Chart.getChart(canvasElement.id);
            if (existingChart) {
                existingChart.destroy();
            }
        }
        
        this.chartInstance = new Chart(ctx, config);
        return this.chartInstance;
    }

    // Helper function to get month key from date string
    _getMonthKey(dateStr) {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // Check if the data represents monthly data points
    isMonthlyData(timestamps) {
        if (timestamps.length < 2) return false;
        
        // Check if all timestamps are on the 15th of the month (our monthly representative date)
        const monthlyPattern = timestamps.every(timestamp => {
            const date = new Date(timestamp);
            return date.getDate() === 15;
        });
        
        // Also check if the time intervals are roughly monthly (25-35 days apart)
        if (timestamps.length >= 2) {
            const firstDate = new Date(timestamps[0]);
            const secondDate = new Date(timestamps[1]);
            const daysDiff = (secondDate - firstDate) / (1000 * 60 * 60 * 24);
            
            // If the difference is between 25-35 days, likely monthly data
            return monthlyPattern || (daysDiff >= 25 && daysDiff <= 35);
        }
        
        return monthlyPattern;
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

    // Process data for multiple systems
    _processMultiSystemData(data, systemNames) {
        const processedData = {};
        
        systemNames.forEach(systemName => {
            processedData[systemName] = data.filter(item => item.system_name === systemName);
        });
        
        return processedData;
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
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgb(54, 162, 235)' + '20',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgb(54, 162, 235)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: 'rgb(54, 162, 235)',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3,
                        tension: 0.4,
                        fill: false,
                        spanGaps: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2.5,
                    layout: {
                        padding: {
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { 
                            position: 'top',
                            align: 'end',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        title: { 
                            display: true, 
                            text: 'TPS Summary (All MQ Functions)', 
                            font: { 
                                size: 18,
                                weight: 'bold'
                            },
                            color: '#2c3e50',
                            padding: 20
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#3498db',
                            borderWidth: 1,
                            cornerRadius: 6,
                            displayColors: true,
                            callbacks: {
                                title: function(context) {
                                    return '📅 ' + (showPeaks ? 'Month: ' : 'Date: ') + context[0].label;
                                },
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return label + ': ' + new Intl.NumberFormat('en-US', { 
                                        maximumFractionDigits: 2 
                                    }).format(value) + ' TPS';
                                },
                                afterBody: function(context) {
                                    const value = context[0].parsed.y;
                                    return [
                                        '',
                                        '📊 Combined Peak: ' + new Intl.NumberFormat('en-US', { 
                                            maximumFractionDigits: 2 
                                        }).format(value) + ' TPS',
                                        '💡 Note: Aggregated across all MQ functions'
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            display: true,
                            title: { 
                                display: true, 
                                text: xAxisLabel, 
                                font: { 
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#2c3e50'
                            }, 
                            ticks: { 
                                maxTicksLimit: 8,
                                font: {
                                    size: 11
                                },
                                color: '#7f8c8d'
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                lineWidth: 1
                            }
                        },
                        y: { 
                            display: true,
                            beginAtZero: true, 
                            suggestedMax: maxValue * 1.1, 
                            title: { 
                                display: true, 
                                text: 'Transactions Per Second (TPS)', 
                                font: { 
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#2c3e50'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                color: '#7f8c8d',
                                callback: function(value) {
                                    return new Intl.NumberFormat('en-US').format(value) + ' TPS';
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                lineWidth: 1
                            }
                        }
                    },
                    elements: {
                        line: {
                            borderJoinStyle: 'round'
                        },
                        point: {
                            hoverRadius: 8
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
            
            const maxValue = values.length > 0 ? Math.max(...values) : 10;
            
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
                                text: 'Date/Time', 
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

    // Generate chart for multiple systems
    async generateMultiSystemChart(containerId, data, systemNames, options = {}) {
        const datasets = [];
        const colors = [
            'rgb(54, 162, 235)',  // blue
            'rgb(255, 99, 132)',  // red
            'rgb(75, 192, 192)',  // teal
            'rgb(255, 159, 64)',  // orange
            'rgb(153, 102, 255)', // purple
            'rgb(255, 205, 86)',  // yellow
            'rgb(201, 203, 207)'  // grey
        ];
        
        // Get all unique timestamps and sort them
        const allTimestamps = new Set();
        systemNames.forEach(systemName => {
            const systemData = data[systemName] || [];
            systemData.forEach(item => allTimestamps.add(item.date_time));
        });
        
        const sortedTimestamps = Array.from(allTimestamps).sort();
        
        // Check if this is monthly data by looking at the data pattern
        const isMonthlyData = this.isMonthlyData(sortedTimestamps);
        
        const labels = sortedTimestamps.map(timestamp => {
            const date = new Date(timestamp);
            if (isMonthlyData) {
                // Format for monthly data: "Jan 2024"
                return date.toLocaleString('en-US', { 
                    month: 'short', 
                    year: 'numeric'
                });
            } else {
                // Format for daily data: "Jan 15, 12:00"
                return date.toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        });
        
        // Create a dataset for each system
        systemNames.forEach((systemName, index) => {
            const colorIndex = index % colors.length;
            const systemData = data[systemName] || [];
            
            console.log(`📊 Processing ${systemName}: ${systemData.length} data points`);
            
            // Create a map for quick lookup
            const dataMap = new Map();
            systemData.forEach(item => {
                const tpsValue = parseFloat(item.trans_per_sec) || 0;
                dataMap.set(item.date_time, tpsValue);
            });
            
            // Create values array matching the labels
            const values = sortedTimestamps.map(timestamp => dataMap.get(timestamp) || 0);
            
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            console.log(`📊 ${systemName} chart range: ${minValue} - ${maxValue}`);
            
            datasets.push({
                label: systemName,
                data: values,
                borderColor: colors[colorIndex],
                backgroundColor: colors[colorIndex] + '20', // More subtle transparency
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: colors[colorIndex],
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: colors[colorIndex],
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3,
                tension: 0.4, // Smoother curves
                fill: false,
                spanGaps: true
            });
        });
        
        const chartData = {
            labels: labels,
            datasets: datasets
        };
        
        // Generate the chart
        const chartElement = document.getElementById(containerId);
        if (!chartElement) {
            console.error(`Chart container '${containerId}' not found`);
            return null;
        }
        
        // Destroy any existing chart on this canvas
        const existingChart = Chart.getChart(containerId);
        if (existingChart) {
            existingChart.destroy();
        }
        
        // Destroy our instance too
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        const ctx = chartElement.getContext('2d');
        
        // Set data attribute to indicate if this is monthly data
        chartElement.dataset.isMonthly = isMonthlyData.toString();
        
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2.5,
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: options.title || 'Multi-System Daily Peak TPS Performance',
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        color: '#2c3e50',
                        padding: 20
                    },
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            filter: function(legendItem, chartData) {
                                // Only show legend items for datasets that have non-zero data
                                const dataset = chartData.datasets[legendItem.datasetIndex];
                                const hasData = dataset.data.some(value => value > 0);
                                return hasData;
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3498db',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                // Determine if this is monthly or daily data
                                const chartInstance = context[0].chart;
                                const isMonthly = chartInstance.canvas.dataset.isMonthly === 'true';
                                
                                return isMonthly ? '📅 Month: ' + context[0].label : '📅 Date: ' + context[0].label;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                const chartInstance = context.chart;
                                const isMonthly = chartInstance.canvas.dataset.isMonthly === 'true';
                                const tpsValue = context.parsed.y || 0;
                                
                                if (label) {
                                    label += isMonthly ? ' (Monthly Peak): ' : ' (Daily Peak): ';
                                }
                                
                                // Add indicator for zero/no data
                                if (tpsValue === 0) {
                                    label += '0 TPS (No Data)';
                                } else {
                                    label += new Intl.NumberFormat('en-US', { 
                                        maximumFractionDigits: 2 
                                    }).format(tpsValue) + ' TPS';
                                }
                                
                                return label;
                            },
                            afterBody: function(context) {
                                // Calculate total peak TPS for this time period
                                let total = 0;
                                context.forEach(item => {
                                    if (item.parsed.y !== null) {
                                        total += item.parsed.y;
                                    }
                                });
                                
                                const chartInstance = context[0].chart;
                                const isMonthly = chartInstance.canvas.dataset.isMonthly === 'true';
                                
                                return [
                                    '',
                                    '📊 Combined ' + (isMonthly ? 'Monthly' : 'Daily') + ' Peak: ' + new Intl.NumberFormat('en-US', { 
                                        maximumFractionDigits: 2 
                                    }).format(total) + ' TPS',
                                    '💡 Note: Shows highest TPS per system in this ' + (isMonthly ? 'month' : 'date')
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date/Time',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#2c3e50'
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            font: {
                                size: 11
                            },
                            color: '#7f8c8d'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            lineWidth: 1
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Transactions Per Second (TPS)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#2c3e50'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#7f8c8d',
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value) + ' TPS';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            lineWidth: 1
                        }
                    }
                },
                elements: {
                    line: {
                        borderJoinStyle: 'round'
                    },
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
        
        return this.chartInstance;
    }

    // Display TPS chart with proper error handling
    async displayTpsChart(containerId, data, options = {}) {
        try {
            if (!data || data.length === 0) {
                console.error('No data provided to displayTpsChart');
                return false;
            }

            const chartElement = document.getElementById(containerId);
            if (!chartElement) {
                console.error(`Chart container '${containerId}' not found`);
                return false;
            }
            
            // Destroy any existing chart on this canvas
            const existingChart = Chart.getChart(containerId);
            if (existingChart) {
                existingChart.destroy();
            }
            
            // Destroy our instance too
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }
            
            const ctx = chartElement.getContext('2d');
            
            // Process data for chart
            const labels = data.map(item => {
                if (options.grouping && window.Utils?.getSmartGroupKey) {
                    const { key } = window.Utils.getSmartGroupKey(
                        options.startDate || data[0].date_time,
                        options.endDate || data[data.length - 1].date_time,
                        item.date_time,
                        options.grouping
                    );
                    return key;
                }
                return new Date(item.date_time).toLocaleString();
            });

            const values = data.map(item => parseFloat(item.trans_per_sec) || 0);
            const maxValue = Math.max(...values);

            // Create new chart
            this.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: options.title || 'TPS Data',
                        data: values,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgb(54, 162, 235)' + '20',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgb(54, 162, 235)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: 'rgb(54, 162, 235)',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3,
                        tension: 0.4,
                        fill: false,
                        spanGaps: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2.5,
                    layout: {
                        padding: {
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: options.title || 'TPS Data',
                            font: { 
                                size: 18,
                                weight: 'bold'
                            },
                            color: '#2c3e50',
                            padding: 20
                        },
                        legend: {
                            position: 'top',
                            align: 'end',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#3498db',
                            borderWidth: 1,
                            cornerRadius: 6,
                            displayColors: true,
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Date/Time',
                                font: { 
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#2c3e50'
                            },
                            ticks: {
                                maxTicksLimit: 8,
                                font: {
                                    size: 11
                                },
                                color: '#7f8c8d'
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                lineWidth: 1
                            }
                        },
                        y: {
                            display: true,
                            beginAtZero: true,
                            suggestedMax: maxValue * 1.1,
                            title: {
                                display: true,
                                text: 'Transactions Per Second (TPS)',
                                font: { 
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#2c3e50'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                color: '#7f8c8d',
                                callback: function(value) {
                                    return new Intl.NumberFormat('en-US').format(value) + ' TPS';
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                lineWidth: 1
                            }
                        }
                    },
                    elements: {
                        line: {
                            borderJoinStyle: 'round'
                        },
                        point: {
                            hoverRadius: 8
                        }
                    }
                }
            });

            return true;
        } catch (error) {
            console.error('Error displaying TPS chart:', error);
            alert('Failed to display chart: ' + (error.message || 'Unknown error'));
            return false;
        }
    }
}

// Export for use in other modules
window.ChartManager = ChartManager;
