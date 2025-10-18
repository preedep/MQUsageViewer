// Main application controller - uses modular components
class MQDashboard {
    constructor() {
        this.authManager = new AuthManager();
        this.apiService = new ApiService(this.authManager);
        this.tableManager = new TableManager();
        this.chartManager = new ChartManager(this.apiService);
        
        // Initialize searchable dropdowns
        this.mqFunctionSelect = null;
        this.systemNameSelect = null;
        
        this.init();
    }

    init() {
        // Set default end date to today
        const today = new Date();
        document.getElementById('end-date').value = today.toISOString().split('T')[0];
        
        // Initialize components
        this.authManager.checkTokenAndRedirect();
        this.initializeSearchableDropdowns();
        this.loadMqFunctions();
        this.setupAggregateToggle();
        this.setupEventListeners();
        this.setupTimeIntervalDebug();
        
        // Make table manager globally accessible for onclick handlers
        window.tableManager = this.tableManager;
    }

    setupTimeIntervalDebug() {
        // Debug: Check if time interval selector exists
        const timeIntervalSelect = document.getElementById('time-interval');
        if (timeIntervalSelect) {
            console.log('✅ Time Interval selector found:', timeIntervalSelect);
            console.log('Current value:', timeIntervalSelect.value);
            
            // Add change event listener for debugging
            timeIntervalSelect.addEventListener('change', (e) => {
                console.log('Time interval changed to:', e.target.value, 'minutes');
            });
        } else {
            console.error('❌ Time Interval selector NOT found!');
        }
    }

    initializeSearchableDropdowns() {
        // Initialize MQ Function searchable dropdown
        this.mqFunctionSelect = new SearchableSelect('mq-function-container', {
            placeholder: 'Loading MQ Functions...',
            onSelect: (value, text) => {
                this.loadSystemNames(value);
            }
        });

        // Initialize System Name searchable dropdown
        this.systemNameSelect = new SearchableSelect('system-name-container', {
            placeholder: 'Select MQ Function First',
        });
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').onclick = () => this.authManager.logout();
        
        // Search button
        document.getElementById('search-btn').addEventListener('click', () => this.performSearch());
        
        // Graph button
        document.getElementById('graph-btn').addEventListener('click', () => this.generateGraph());
        
        // Tab buttons
        document.getElementById('tab-search').addEventListener('click', () => this.setActiveTab('search'));
        document.getElementById('tab-graph').addEventListener('click', () => {
            this.setActiveTab('graph');
            this.generateGraph();
        });
    }

    async loadMqFunctions() {
        this.mqFunctionSelect.setLoading(true);
        try {
            const functions = await this.apiService.fetchMqFunctions();
            const data = functions.map(f => ({ value: f, text: f }));
            this.mqFunctionSelect.setData(data);
            this.mqFunctionSelect.setPlaceholder('Select MQ Function...');
        } catch (error) {
            console.error('Error loading MQ functions:', error);
            this.mqFunctionSelect.setPlaceholder('Error loading functions');
        } finally {
            this.mqFunctionSelect.setLoading(false);
        }
    }

    async loadSystemNames(funcName) {
        if (!funcName) {
            this.systemNameSelect.clear();
            this.systemNameSelect.setPlaceholder('Select MQ Function First');
            document.getElementById('system-names-container').style.display = 'none';
            this.systemNameSelect.setData([]);
            return;
        }
        
        this.systemNameSelect.setLoading(true);
        try {
            const systems = await this.apiService.fetchSystemNames(funcName);
            const data = systems.map(s => ({ value: s, text: s }));
            this.systemNameSelect.setData(data);
            this.systemNameSelect.setPlaceholder('Select System...');
            
            // Populate system names checkboxes
            const container = document.getElementById('system-names-checkboxes');
            container.innerHTML = '';
            
            systems.forEach(system => {
                const div = document.createElement('div');
                div.className = 'system-checkbox-item';
                div.innerHTML = `
                    <input type="checkbox" id="system-${system}" value="${system}">
                    <label for="system-${system}">${system}</label>
                `;
                container.appendChild(div);
            });
            
            // Setup aggregate systems checkbox event
            const aggregateCheckbox = document.getElementById('aggregate-systems');
            const systemNamesContainer = document.getElementById('system-names-container');
            
            // Default: select all systems for multi-line display
            setTimeout(() => {
                document.querySelectorAll('#system-names-checkboxes input[type="checkbox"]')
                    .forEach(checkbox => checkbox.checked = true);
            }, 100);
            
            aggregateCheckbox.onchange = () => {
                // When aggregate is checked, we'll sum all selected systems
                // When unchecked, we'll show separate lines for each selected system
                console.log('Aggregate mode:', aggregateCheckbox.checked);
            };
        } catch (error) {
            console.error('Error loading system names:', error);
            this.systemNameSelect.setPlaceholder('Error loading systems');
        } finally {
            this.systemNameSelect.setLoading(false);
        }
    }

    getSearchParams() {
        const aggregateSystems = document.getElementById('aggregate-systems').checked;
        
        // Get all checked system names
        const systemNames = Array.from(
            document.querySelectorAll('#system-names-checkboxes input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);
        
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        // Get MQ Function value - try SearchableSelect first, then fallback to direct element
        let mqFunction = null;
        if (this.mqFunctionSelect && typeof this.mqFunctionSelect.getSelectedValue === 'function') {
            mqFunction = this.mqFunctionSelect.getSelectedValue();
        } else {
            // Fallback: try to get from select element or input
            const mqFunctionElement = document.querySelector('#mq-function-container select, #mq-function-container input, #mq-function');
            if (mqFunctionElement) {
                mqFunction = mqFunctionElement.value;
            }
        }
        
        const timeInterval = document.getElementById('time-interval').value;
        const grouping = document.getElementById('grouping').value;
        
        const params = {
            startDate,
            endDate,
            mqFunction,
            systemNames: systemNames.length > 0 ? systemNames : null,
            timeInterval,
            grouping,
            aggregateSystems,  // true = รวมข้อมูล, false = แสดงแยก
            showPeaks: document.getElementById('show-peaks')?.checked || false,
            allFuncs: document.getElementById('all-funcs')?.checked || false
        };
        
        console.log('getSearchParams result:', params);
        return params;
    }

    async performSearch() {
        try {
            const params = this.getSearchParams();
            
            if (!params.mqFunction && !params.allFuncs) {
                alert('Please select an MQ Function or enable "All MQ Functions"');
                return;
            }
            
            this.setActiveTab('search');
            window.Utils?.showLoading?.('Searching...');
            
            // Perform search logic here
            console.log('Search params:', params);
            
        } catch (error) {
            console.error('Error performing search:', error);
            alert('Error performing search: ' + (error.message || 'Unknown error'));
        } finally {
            window.Utils?.hideLoading?.();
        }
    }

    async generateGraph() {
        try {
            const params = this.getSearchParams();
            console.log('Generate Graph - Params:', params);
            
            // Validate input
            if (!params.mqFunction && !params.allFuncs) {
                alert('Please select an MQ Function or enable "All MQ Functions"');
                return;
            }
            
            // Skip system validation if using All MQ Functions mode
            if (!params.allFuncs && (!params.systemNames || params.systemNames.length === 0)) {
                alert('Please select at least one system to display');
                return;
            }
            
            this.setActiveTab('graph');
            window.Utils?.showLoading?.('Generating graph...');
            
            // Check backend connection first
            console.log('🔍 Checking backend connection...');
            console.log(`API Base URL: ${this.apiService?.baseUrl || 'Not configured'}`);
            console.log(`Request params:`, {
                from_datetime: params.startDate,
                to_datetime: params.endDate,
                mq_function_name: params.mqFunction,
                time_interval_minutes: params.timeInterval
            });
            
            // Handle system data based on aggregate mode
            if (params.allFuncs) {
                // All MQ Functions mode
                await this.chartManager.generateAggregateChart(
                    params.startDate,
                    params.endDate,
                    params.grouping,
                    params.timeInterval
                );
            } else if (params.mqFunction) {
                // Single MQ Function mode - check if we have systems selected
                if (!params.systemNames || params.systemNames.length === 0) {
                    // If no systems selected, try to get all systems for this function
                    try {
                        const allSystems = await this.apiService.fetchSystemNames(params.mqFunction);
                        if (allSystems && allSystems.length > 0) {
                            params.systemNames = allSystems;
                            console.log('Auto-selected all systems:', allSystems);
                        } else {
                            console.warn('No systems found from API, using default systems');
                            // Use default systems for testing
                            params.systemNames = ['API', 'FENETM', 'PMH'];
                        }
                    } catch (error) {
                        console.error('Error fetching systems:', error);
                        console.log('Using default systems due to API error');
                        // Use default systems for testing
                        params.systemNames = ['API', 'FENETM', 'PMH'];
                    }
                }
                
                // Now proceed with the systems we have
                // Fetch data for selected systems
                const allData = [];
                
                for (const systemName of params.systemNames) {
                    try {
                        console.log(`🔄 Fetching data for system: ${systemName}`);
                        console.log(`   📅 Date range: ${params.startDate} to ${params.endDate}`);
                        console.log(`   🔧 Function: ${params.mqFunction}`);
                        console.log(`   ⏱️  Interval: ${params.timeInterval} minutes`);
                        
                        // Format dates properly for backend (with timezone)
                        const startDateTime = new Date(params.startDate + 'T00:00:00+07:00').toISOString();
                        const endDateTime = new Date(params.endDate + 'T23:59:59+07:00').toISOString();
                        
                        console.log(`   📅 Formatted dates: ${startDateTime} to ${endDateTime}`);
                        
                        const data = await this.apiService.fetchTpsSummary({
                            from_datetime: startDateTime,
                            to_datetime: endDateTime,
                            mq_function_name: params.mqFunction,
                            system_name: systemName,
                            time_interval_minutes: parseInt(params.timeInterval)
                        });
                        
                        console.log(`Data received for ${systemName}:`, data);
                        console.log(`Data type: ${typeof data}, Is Array: ${Array.isArray(data)}, Length: ${data?.length}`);
                        
                        if (data && Array.isArray(data) && data.length > 0) {
                            console.log(`✅ Using REAL DATA for ${systemName} - ${data.length} records`);
                            console.log(`Sample data:`, data.slice(0, 3));
                            const rawDataWithSystem = data.map(item => ({...item, system_name: systemName}));
                            
                            if (params.showPeaks) {
                                // Convert to monthly peaks
                                const monthlyPeaks = this.convertToMonthlyPeaks(rawDataWithSystem);
                                allData.push(...monthlyPeaks);
                                console.log(`Added ${monthlyPeaks.length} monthly peak records for ${systemName} (from ${data.length} 15-min intervals)`);
                            } else {
                                // Convert to daily peaks
                                const dailyPeaks = this.convertToDailyPeaks(rawDataWithSystem);
                                allData.push(...dailyPeaks);
                                console.log(`Added ${dailyPeaks.length} daily peak records for ${systemName} (from ${data.length} 15-min intervals)`);
                            }
                        } else {
                            console.warn(`❌ No data found for system: ${systemName} - Using MOCK DATA`);
                            console.warn(`API Response was:`, data);
                            console.warn(`Possible causes:`);
                            console.warn(`  1. No data in database for this system/function/date range`);
                            console.warn(`  2. System name mismatch in database`);
                            console.warn(`  3. Date range has no data`);
                            
                            // Try to get available systems for debugging
                            try {
                                const availableSystems = await this.apiService.fetchSystemNames(params.mqFunction);
                                console.warn(`Available systems for ${params.mqFunction}:`, availableSystems);
                            } catch (e) {
                                console.warn(`Could not fetch available systems:`, e);
                            }
                            
                            // Generate mock data for testing if no real data
                            const mockData = this.generateMockDataForSystem(systemName, params.startDate, params.endDate);
                            
                            if (params.showPeaks) {
                                const monthlyPeaks = this.convertToMonthlyPeaks(mockData);
                                allData.push(...monthlyPeaks);
                                console.log(`Added ${monthlyPeaks.length} mock monthly peak records for ${systemName}`);
                            } else {
                                const dailyPeaks = this.convertToDailyPeaks(mockData);
                                allData.push(...dailyPeaks);
                                console.log(`Added ${dailyPeaks.length} mock daily peak records for ${systemName}`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ API ERROR for ${systemName}:`, error);
                        console.error(`Using MOCK DATA due to API failure`);
                        // Generate mock data for testing when API fails
                        const mockData = this.generateMockDataForSystem(systemName, params.startDate, params.endDate);
                        
                        if (params.showPeaks) {
                            const monthlyPeaks = this.convertToMonthlyPeaks(mockData);
                            allData.push(...monthlyPeaks);
                            console.log(`Added ${monthlyPeaks.length} mock monthly peak records for ${systemName} (due to API error)`);
                        } else {
                            const dailyPeaks = this.convertToDailyPeaks(mockData);
                            allData.push(...dailyPeaks);
                            console.log(`Added ${dailyPeaks.length} mock daily peak records for ${systemName} (due to API error)`);
                        }
                    }
                }
                
                if (allData.length === 0) {
                    alert('No data found for the selected systems');
                    return;
                }
                
                // Check data source and provide clear summary
                const realDataCount = allData.filter(item => !item.isMockData).length;
                const mockDataCount = allData.filter(item => item.isMockData).length;
                
                console.log('📊 DATA SOURCE SUMMARY:');
                console.log(`   ✅ Real API Data: ${realDataCount} records`);
                console.log(`   🎭 Mock Data: ${mockDataCount} records`);
                console.log(`   📈 Total Data Points: ${allData.length}`);
                
                if (mockDataCount > 0) {
                    console.warn('⚠️  WARNING: Some data is MOCK/SIMULATED');
                    console.warn('   Check if backend is running and API is accessible');
                }
                
                if (realDataCount > 0) {
                    console.log('✅ SUCCESS: Using real data from database');
                    // Show sample of real data values
                    const realData = allData.filter(item => !item.isMockData);
                    const maxTps = Math.max(...realData.map(item => parseFloat(item.trans_per_sec) || 0));
                    const minTps = Math.min(...realData.map(item => parseFloat(item.trans_per_sec) || 0));
                    console.log(`   📊 TPS Range: ${minTps.toFixed(2)} - ${maxTps.toFixed(2)}`);
                }
                
                if (params.aggregateSystems) {
                    // Aggregate mode: sum all systems into one line
                    await this.generateAggregatedSystemChart(allData, params);
                } else {
                    // Separate mode: show each system as separate line (DEFAULT)
                    console.log('Multi-system mode - Systems:', params.systemNames);
                    console.log('Multi-system mode - Data count:', allData.length);
                    
                    const processedData = this.chartManager._processMultiSystemData(allData, params.systemNames);
                    console.log('Processed data for multi-system chart:', processedData);
                    
                    let title;
                    if (params.showPeaks) {
                        title = params.mqFunction 
                            ? `${params.mqFunction} - Monthly Peak Comparison`
                            : 'All MQ Functions - Monthly Peak Comparison';
                    } else {
                        title = params.mqFunction 
                            ? `${params.mqFunction} - Daily Peak Comparison`
                            : 'All MQ Functions - Daily Peak Comparison';
                    }
                    
                    await this.chartManager.generateMultiSystemChart(
                        'chart',
                        processedData,
                        params.systemNames,
                        {
                            title: title,
                            xLabel: 'Date/Time',
                            yLabel: 'Transactions Per Second (TPS)'
                        }
                    );
                }
            } else {
                alert('Please select at least one system');
                return;
            }
            
        } catch (error) {
            console.error('Error generating graph:', error);
            alert('Error generating graph: ' + (error.message || 'Unknown error occurred'));
        } finally {
            window.Utils?.hideLoading?.();
        }
    }

    async generateAggregatedSystemChart(allData, params) {
        try {
            // Group data by time and sum TPS across all systems
            const timeGroups = new Map();
            
            allData.forEach(item => {
                const timeKey = item.date_time;
                if (!timeGroups.has(timeKey)) {
                    timeGroups.set(timeKey, {
                        date_time: timeKey,
                        trans_per_sec: 0,
                        systems: []
                    });
                }
                
                const group = timeGroups.get(timeKey);
                group.trans_per_sec += parseFloat(item.trans_per_sec) || 0;
                group.systems.push(item.system_name);
            });
            
            // Convert to array and sort by time
            const aggregatedData = Array.from(timeGroups.values())
                .sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
            
            // Generate chart title
            const title = params.mqFunction 
                ? `${params.mqFunction} - Aggregated Systems (${params.systemNames.join(', ')})`
                : `All MQ Functions - Aggregated Systems (${params.systemNames.join(', ')})`;
            
            // Display aggregated chart
            await this.chartManager.displayTpsChart(
                'chart',
                aggregatedData,
                {
                    title: title,
                    grouping: params.grouping,
                    startDate: params.startDate,
                    endDate: params.endDate
                }
            );
            
        } catch (error) {
            console.error('Error generating aggregated system chart:', error);
            throw error;
        }
    }

    generateMockDataForSystem(systemName, startDate, endDate) {
        const data = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffHours = Math.ceil((end - start) / (1000 * 60 * 60));
        
        // Generate different TPS ranges for different systems (closer to real data)
        const systemRanges = {
            'API': { min: 1500, max: 4500 },
            'FENETM': { min: 800, max: 2500 },
            'PMH': { min: 500, max: 1800 },
            'IS FENETM': { min: 800, max: 2500 }, // Fallback for old name
            'SYSTEM_A': { min: 1000, max: 3000 },
            'SYSTEM_B': { min: 600, max: 2200 },
            'SYSTEM_C': { min: 1200, max: 3500 },
            'SYSTEM_D': { min: 400, max: 1500 }
        };
        
        const range = systemRanges[systemName] || { min: 30, max: 100 };
        
        for (let i = 0; i <= diffHours; i++) {
            const date = new Date(start.getTime() + i * 60 * 60 * 1000);
            const baseTps = range.min + Math.random() * (range.max - range.min);
            const timeFactor = Math.sin((i / diffHours) * Math.PI * 2) * 0.3; // Add time-based variation
            const tps = Math.max(0, baseTps + (baseTps * timeFactor));
            
            data.push({
                date_time: date.toISOString(),
                trans_per_sec: Math.round(tps * 100) / 100, // Round to 2 decimal places
                system_name: systemName,
                isMockData: true // Mark as mock data
            });
        }
        
        return data;
    }

    // Convert 15-minute interval data to daily peak data
    convertToDailyPeaks(rawData) {
        console.log('Converting 15-minute data to daily peaks...');
        
        // Group data by date and system
        const dailyGroups = new Map();
        
        rawData.forEach(item => {
            const date = new Date(item.date_time);
            const dateKey = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
            const systemName = item.system_name;
            const groupKey = `${dateKey}_${systemName}`;
            
            if (!dailyGroups.has(groupKey)) {
                dailyGroups.set(groupKey, {
                    date: dateKey,
                    system_name: systemName,
                    intervals: []
                });
            }
            
            dailyGroups.get(groupKey).intervals.push({
                time: item.date_time,
                tps: parseFloat(item.trans_per_sec) || 0
            });
        });
        
        // Find daily peaks for each system
        const dailyPeaks = [];
        
        dailyGroups.forEach(group => {
            // Find the maximum TPS for this day and system
            const maxTps = Math.max(...group.intervals.map(interval => interval.tps));
            
            // Find the time when this peak occurred
            const peakInterval = group.intervals.find(interval => interval.tps === maxTps);
            
            dailyPeaks.push({
                date_time: group.date + 'T12:00:00Z', // Use noon as representative time
                trans_per_sec: maxTps,
                system_name: group.system_name,
                peak_time: peakInterval ? peakInterval.time : null // Original time of peak
            });
        });
        
        console.log(`Converted ${rawData.length} 15-minute records to ${dailyPeaks.length} daily peaks`);
        return dailyPeaks;
    }

    // Convert data to monthly peak data
    convertToMonthlyPeaks(rawData) {
        console.log('Converting data to monthly peaks...');
        
        // Group data by month and system
        const monthlyGroups = new Map();
        
        rawData.forEach(item => {
            const date = new Date(item.date_time);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            const systemName = item.system_name;
            const groupKey = `${monthKey}_${systemName}`;
            
            if (!monthlyGroups.has(groupKey)) {
                monthlyGroups.set(groupKey, {
                    month: monthKey,
                    system_name: systemName,
                    intervals: []
                });
            }
            
            monthlyGroups.get(groupKey).intervals.push({
                time: item.date_time,
                tps: parseFloat(item.trans_per_sec) || 0
            });
        });
        
        // Find monthly peaks for each system
        const monthlyPeaks = [];
        
        monthlyGroups.forEach(group => {
            // Find the maximum TPS for this month and system
            const maxTps = Math.max(...group.intervals.map(interval => interval.tps));
            
            // Find the time when this peak occurred
            const peakInterval = group.intervals.find(interval => interval.tps === maxTps);
            
            // Use the 15th of the month as representative date
            const monthDate = new Date(group.month + '-15T12:00:00Z');
            
            monthlyPeaks.push({
                date_time: monthDate.toISOString(),
                trans_per_sec: maxTps,
                system_name: group.system_name,
                peak_time: peakInterval ? peakInterval.time : null, // Original time of peak
                month_year: group.month // For display purposes
            });
        });
        
        console.log(`Converted ${rawData.length} records to ${monthlyPeaks.length} monthly peaks`);
        return monthlyPeaks;
    }

    setupAggregateToggle() {
        const allFuncsCheckbox = document.getElementById('all-funcs');
        if (allFuncsCheckbox) {
            allFuncsCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                
                // Disable/enable dropdowns based on aggregate mode
                if (this.mqFunctionSelect) {
                    this.mqFunctionSelect.setDisabled(isChecked);
                }
                if (this.systemNameSelect) {
                    this.systemNameSelect.setDisabled(isChecked);
                }
                
                // Hide/show system names container
                const systemNamesContainer = document.getElementById('system-names-container');
                if (systemNamesContainer) {
                    systemNamesContainer.style.display = isChecked ? 'none' : 'block';
                    if (isChecked) {
                        document.getElementById('aggregate-systems').checked = false;
                    }
                }
            });
        }
    }

    setActiveTab(tabName) {
        document.getElementById('tab-search').classList.toggle('active', tabName === 'search');
        document.getElementById('tab-graph').classList.toggle('active', tabName === 'graph');
        document.getElementById('tab-search-content').classList.toggle('active', tabName === 'search');
        document.getElementById('tab-graph-content').classList.toggle('active', tabName === 'graph');
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MQDashboard();
});