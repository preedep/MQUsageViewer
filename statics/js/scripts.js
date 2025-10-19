// Main application controller - uses modular components
class MQDashboard {
    constructor() {
        this.authManager = new AuthManager();
        this.apiService = new ApiService(this.authManager);
        this.tableManager = new TableManager();
        this.chartManager = new ChartManager(this.apiService);
        
        // Initialize searchable dropdowns
        this.mqFunctionSelect = null;
        // Note: systemNameSelect removed - using checkboxes only
        
        // Loading overlay
        this.loadingOverlay = null;
        
        this.init();
    }
    
    showLoading(text = 'Loading...', subtext = 'Please wait while we process your data') {
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.getElementById('loading-overlay');
            console.log('Loading overlay element:', this.loadingOverlay);
        }
        if (this.loadingOverlay) {
            console.log('🔄 Showing loading overlay:', text);
            
            // Update text
            const loadingText = document.getElementById('loading-text');
            const loadingSubtext = document.getElementById('loading-subtext');
            if (loadingText) loadingText.textContent = text;
            if (loadingSubtext) loadingSubtext.textContent = subtext;
            
            this.loadingOverlay.classList.add('show');
        } else {
            console.error('❌ Loading overlay element not found!');
        }
    }
    
    hideLoading() {
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.getElementById('loading-overlay');
        }
        if (this.loadingOverlay) {
            console.log('✅ Hiding loading overlay');
            this.loadingOverlay.classList.remove('show');
        }
    }

    init() {
        // Set default datetime values
        this.initializeDateTimeInputs();
        
        // Initialize components
        this.authManager.checkTokenAndRedirect();
        this.initializeSearchableDropdowns();
        this.loadMqFunctions();
        this.setupAggregateToggle();
        this.setupEventListeners();
        this.setupTimeIntervalDebug();
        this.setupTimePresets();
        
        // Make table manager globally accessible for onclick handlers
        window.tableManager = this.tableManager;
    }

    initializeDateTimeInputs() {
        // Start: 01/01/2023 00:00 (Database data start)
        const defaultStart = new Date(2023, 0, 1, 0, 0);
        
        // End: Current time (allow analysis up to now)
        const defaultEnd = new Date();
        
        // Format: YYYY-MM-DDTHH:mm
        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        const startInput = document.getElementById('start-datetime');
        const endInput = document.getElementById('end-datetime');
        
        if (startInput) {
            startInput.value = formatDateTime(defaultStart);
        }
        if (endInput) {
            endInput.value = formatDateTime(defaultEnd);
        }
        
        console.log('📅 DateTime inputs initialized:', {
            start: startInput?.value,
            end: endInput?.value,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            note: 'Start: Database start (2023-01-01), End: Current time'
        });
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

        // Note: System Name dropdown removed - using checkboxes only
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
            document.getElementById('system-names-container').style.display = 'none';
            return;
        }
        
        // Show loading state in the container
        const systemNamesContainer = document.getElementById('system-names-container');
        if (systemNamesContainer) {
            systemNamesContainer.style.display = 'block';
        }
        
        try {
            const systems = await this.apiService.fetchSystemNames(funcName);
            
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
            
            console.log('✅ System names loaded and checkboxes created');
        } catch (error) {
            console.error('Error loading system names:', error);
            // Show error message in the container
            const container = document.getElementById('system-names-checkboxes');
            container.innerHTML = '<div class="error-message">Error loading systems</div>';
        }
    }

    getSearchParams() {
        const aggregateSystems = document.getElementById('aggregate-systems').checked;
        
        // Get all checked system names
        const systemNames = Array.from(
            document.querySelectorAll('#system-names-checkboxes input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);
        
        // Get datetime values (format: YYYY-MM-DDTHH:mm)
        const startDateTime = document.getElementById('start-datetime')?.value;
        const endDateTime = document.getElementById('end-datetime')?.value;
        
        // Extract date only for backward compatibility
        const startDate = startDateTime ? startDateTime.split('T')[0] : null;
        const endDate = endDateTime ? endDateTime.split('T')[0] : null;
        
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
        
        // Get peak selection from Advanced Filters
        const peakSelection = document.getElementById('peak-selection')?.value || 'all';
        
        // Get TPS threshold values
        const minTps = parseFloat(document.getElementById('min-tps')?.value) || null;
        const maxTps = parseFloat(document.getElementById('max-tps')?.value) || null;
        
        // Get time aggregation setting
        const timeAggregation = document.getElementById('time-aggregation')?.value || '15min';
        
        const params = {
            startDate,
            endDate,
            startDateTime,  // Full datetime with time
            endDateTime,    // Full datetime with time
            mqFunction,
            systemNames: systemNames.length > 0 ? systemNames : null,
            timeInterval,
            grouping,
            aggregateSystems,  // true = รวมข้อมูล, false = แสดงแยก
            showPeaks: document.getElementById('show-peaks')?.checked || false,
            allFuncs: document.getElementById('all-funcs')?.checked || false,
            peakSelection: peakSelection,  // 'all', 'specific', 'weekdays', 'weekends'
            minTps: minTps,      // Minimum TPS threshold
            maxTps: maxTps,      // Maximum TPS threshold
            timeAggregation: timeAggregation  // Time aggregation method
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
            
            if (!params.systemNames || params.systemNames.length === 0) {
                alert('Please select at least one system');
                return;
            }
            
            this.setActiveTab('search');
            this.showLoading('Searching...', 'Please wait while we search for your data');
            
            console.log('🔍 Performing search with params:', params);
            
            // Show advanced filters status
            if (params.minTps || params.maxTps || (params.timeAggregation && params.timeAggregation !== '15min') || (params.peakSelection && params.peakSelection !== 'all')) {
                console.log('🔧 Advanced Filters Active:', {
                    minTps: params.minTps || 'None',
                    maxTps: params.maxTps || 'None', 
                    timeAggregation: params.timeAggregation || '15min',
                    peakSelection: params.peakSelection || 'all'
                });
            } else {
                console.log('🔧 No advanced filters applied');
            }
            
            // Format dates for API
            const { startDateTime, endDateTime } = this.formatDatesForAPI(params);
            
            // Search for each system
            const allResults = [];
            for (const systemName of params.systemNames) {
                console.log(`Searching for system: ${systemName}`);
                
                const response = await this.apiService.searchMqData({
                    from_datetime: startDateTime,
                    to_datetime: endDateTime,
                    mq_function_name: params.mqFunction,
                    system_name: systemName
                });
                
                if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
                    console.log(`Found ${response.data.length} records for ${systemName}`);
                    
                    // Apply advanced filters to search results
                    let filteredData = response.data.map(item => ({...item, system_name: systemName}));
                    
                    // Apply TPS filtering if specified
                    if (params.minTps || params.maxTps) {
                        const beforeCount = filteredData.length;
                        filteredData = this.applyTpsFiltering(filteredData, params.minTps, params.maxTps);
                        console.log(`🔍 TPS Filter applied to ${systemName}: ${beforeCount} → ${filteredData.length} records`);
                    }
                    
                    // Apply time aggregation if specified
                    if (params.timeAggregation && params.timeAggregation !== '15min') {
                        const beforeCount = filteredData.length;
                        filteredData = this.applyTimeAggregation(filteredData, params.timeAggregation);
                        console.log(`⏱️ Time Aggregation applied to ${systemName}: ${beforeCount} → ${filteredData.length} records`);
                    }
                    
                    // Apply peak selection if specified
                    if (params.peakSelection && params.peakSelection !== 'all') {
                        const beforeCount = filteredData.length;
                        filteredData = this.applyPeakSelection(filteredData, params.peakSelection);
                        console.log(`🎯 Peak Selection applied to ${systemName}: ${beforeCount} → ${filteredData.length} records`);
                    }
                    
                    allResults.push(...filteredData);
                } else {
                    console.log(`No data found for ${systemName}`);
                    console.log(`API Response:`, response);
                    console.log(`Search params used:`, {
                        from_datetime: startDateTime,
                        to_datetime: endDateTime,
                        mq_function_name: params.mqFunction,
                        system_name: systemName
                    });
                }
            }
            
            console.log(`Total search results: ${allResults.length}`);
            
            // Show filter summary if filters were applied
            if (params.minTps || params.maxTps || (params.timeAggregation && params.timeAggregation !== '15min')) {
                console.log('📊 Advanced Filters Summary:', {
                    originalRecords: 'Check individual system logs above',
                    finalRecords: allResults.length,
                    filtersApplied: {
                        tpsFilter: params.minTps || params.maxTps ? `${params.minTps || 0} - ${params.maxTps || '∞'}` : 'None',
                        timeAggregation: params.timeAggregation || '15min'
                    }
                });
            }
            
            if (allResults.length > 0) {
                // Display results in table
                this.tableManager.displayData(allResults);
            } else {
                alert('No data found for the selected criteria');
                this.tableManager.clearTable();
            }
            
        } catch (error) {
            console.error('Error performing search:', error);
            alert('Error performing search: ' + (error.message || 'Unknown error'));
        } finally {
            this.hideLoading();
        }
    }

    async generateGraph() {
        console.log('🎯 generateGraph() called');
        try {
            // Show loading overlay
            this.showLoading('Generating Graph...', 'Please wait while we process your data');
            
            const params = this.getSearchParams();
            console.log('Generate Graph - Params:', params);
            
            if (!this.validateGraphParams(params)) {
                this.hideLoading();
                return;
            }
            
            this.prepareGraphGeneration();
            this.logBackendConnection(params);
            
            if (params.allFuncs) {
                await this.generateAllFunctionsChart(params);
            } else if (params.mqFunction) {
                await this.generateSingleFunctionChart(params);
            } else {
                alert('Please select an MQ Function or enable "All MQ Functions" mode');
            }
        } catch (error) {
            console.error('Error generating graph:', error);
            alert('Error generating graph: ' + (error.message || 'Unknown error'));
        } finally {
            // Hide loading overlay
            this.hideLoading();
        }
    }

    validateGraphParams(params) {
        if (!params.mqFunction && !params.allFuncs) {
            alert('Please select an MQ Function or enable "All MQ Functions"');
            return false;
        }
        
        if (!params.allFuncs && (!params.systemNames || params.systemNames.length === 0)) {
            alert('Please select at least one system to display');
            return false;
        }
        
        return true;
    }

    prepareGraphGeneration() {
        this.setActiveTab('graph');
        window.Utils?.showLoading?.('Generating graph...');
    }

    logBackendConnection(params) {
        console.log('🔍 Checking backend connection...');
        console.log(`API Base URL: ${this.apiService?.baseUrl || 'Not configured'}`);
        console.log(`Request params:`, {
            from_datetime: params.startDate,
            to_datetime: params.endDate,
            mq_function_name: params.mqFunction,
            time_interval_minutes: params.timeInterval
        });
    }

    async generateAllFunctionsChart(params) {
        await this.chartManager.generateAggregateChart(
            params.startDate,
            params.endDate,
            params.grouping,
            params.timeInterval
        );
    }

    async generateSingleFunctionChart(params) {
        await this.ensureSystemNames(params);
        const allData = await this.fetchSystemsData(params);
        
        if (allData.length === 0) {
            alert('No data found for the selected systems');
            return;
        }
        
        this.logDataSourceSummary(allData);
        await this.renderChart(allData, params);
    }

    async ensureSystemNames(params) {
        if (!params.systemNames || params.systemNames.length === 0) {
            await this.autoSelectSystems(params);
        } else {
            await this.validateSelectedSystems(params);
        }
    }

    async autoSelectSystems(params) {
        try {
            const allSystems = await this.apiService.fetchSystemNames(params.mqFunction);
            if (allSystems && allSystems.length > 0) {
                params.systemNames = allSystems;
                console.log('✅ Auto-selected systems from API:', allSystems);
            } else {
                this.useDefaultSystems(params, 'No systems found from API');
            }
        } catch (error) {
            console.error('❌ Error fetching systems:', error);
            this.useDefaultSystems(params, 'API error');
        }
    }

    async validateSelectedSystems(params) {
        try {
            const availableSystems = await this.apiService.fetchSystemNames(params.mqFunction);
            if (availableSystems && availableSystems.length > 0) {
                const validationResult = this.filterValidSystems(params.systemNames, availableSystems);
                this.applySystemValidation(params, validationResult, availableSystems);
            }
        } catch (error) {
            console.warn('Could not validate system names:', error);
        }
    }

    useDefaultSystems(params, reason) {
        console.warn(`⚠️  ${reason}, using default systems`);
        params.systemNames = ['API', 'FENETM', 'PMH'];
    }

    filterValidSystems(selectedSystems, availableSystems) {
        const validSystems = selectedSystems.filter(system => 
            availableSystems.includes(system)
        );
        const invalidSystems = selectedSystems.filter(system => 
            !availableSystems.includes(system)
        );
        
        return { validSystems, invalidSystems };
    }

    applySystemValidation(params, validationResult, availableSystems) {
        const { validSystems, invalidSystems } = validationResult;
        
        if (validSystems.length > 0) {
            params.systemNames = validSystems;
            console.log('✅ Validated systems:', validSystems);
            
            if (invalidSystems.length > 0) {
                console.warn(`⚠️  Removed invalid systems: ${invalidSystems.join(', ')}`);
            }
        } else {
            console.warn('⚠️  None of selected systems are available, using API systems');
            params.systemNames = availableSystems;
        }
    }

    async fetchSystemsData(params) {
        const allData = [];
                
        for (const systemName of params.systemNames) {
            try {
                const systemData = await this.fetchSingleSystemData(systemName, params);
                allData.push(...systemData);
            } catch (error) {
                console.error(`❌ API ERROR for ${systemName}:`, error);
                const mockData = await this.generateFallbackData(systemName, params);
                allData.push(...mockData);
            }
        }
        
        return allData;
    }

    async fetchSingleSystemData(systemName, params) {
        console.log(`🔄 Fetching data for system: ${systemName}`);
        console.log(`   📅 Date range: ${params.startDate} to ${params.endDate}`);
        console.log(`   🔧 Function: ${params.mqFunction}`);
        console.log(`   ⏱️  Interval: ${params.timeInterval} minutes`);
        
        const { startDateTime, endDateTime } = this.formatDatesForAPI(params);
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
            return await this.processRealData(data, systemName, params);
        } else {
            return await this.handleNoData(systemName, params);
        }
    }

    formatDatesForAPI(params) {
        // If we have full datetime, use it; otherwise fallback to date only
        let startDateTime, endDateTime;
        
        if (params.startDateTime && params.endDateTime) {
            // Use datetime-local values (format: YYYY-MM-DDTHH:mm)
            // Create dates in local timezone, then convert to ISO
            const startDate = new Date(params.startDateTime + ':00');
            const endDate = new Date(params.endDateTime + ':59');
            
            startDateTime = startDate.toISOString();
            endDateTime = endDate.toISOString();
            
            // Check if dates are outside known data range
            const dataStartDate = new Date('2023-01-01T00:00:00');
            const dataEndDate = new Date('2023-12-31T23:59:59');
            
            let warnings = [];
            if (startDate < dataStartDate) {
                warnings.push(`⚠️ Start date (${startDate.toLocaleDateString()}) is before available data (Jan 1, 2023)`);
            }
            if (endDate > new Date() && endDate > dataEndDate) {
                warnings.push(`ℹ️ End date (${endDate.toLocaleDateString()}) is beyond known data range (Dec 31, 2023) - may return no results`);
            }
            
            console.log('📅 Using datetime inputs:', {
                input: { start: params.startDateTime, end: params.endDateTime },
                local: { start: startDate.toString(), end: endDate.toString() },
                iso: { start: startDateTime, end: endDateTime },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                warnings: warnings.length > 0 ? warnings : 'None'
            });
            
            // Show warnings to user
            if (warnings.length > 0) {
                warnings.forEach(warning => console.warn(warning));
            }
        } else {
            // Fallback to date only (backward compatibility)
            const startDate = new Date(params.startDate + 'T00:00:00');
            const endDate = new Date(params.endDate + 'T23:59:59');
            
            startDateTime = startDate.toISOString();
            endDateTime = endDate.toISOString();
            console.log('📅 Using date inputs (fallback):', {
                input: { start: params.startDate, end: params.endDate },
                iso: { start: startDateTime, end: endDateTime }
            });
        }
        
        return { startDateTime, endDateTime };
    }

    async processRealData(data, systemName, params) {
        console.log(`✅ Using REAL DATA for ${systemName} - ${data.length} records`);
        console.log(`Sample data:`, data.slice(0, 3));
        
        // Check TPS values in raw data
        const tpsValues = data.map(item => parseFloat(item.trans_per_sec) || 0);
        const maxTps = Math.max(...tpsValues);
        const minTps = Math.min(...tpsValues);
        console.log(`📊 ${systemName} TPS range: ${minTps} - ${maxTps}`);
        
        let processedData = data.map(item => ({...item, system_name: systemName}));
        
        // Apply TPS filtering if specified
        if (params.minTps || params.maxTps) {
            processedData = this.applyTpsFiltering(processedData, params.minTps, params.maxTps);
        }
        
        // Apply time aggregation if specified
        if (params.timeAggregation && params.timeAggregation !== '15min') {
            processedData = this.applyTimeAggregation(processedData, params.timeAggregation);
        }
        
        // Apply peak selection if specified
        if (params.peakSelection && params.peakSelection !== 'all') {
            processedData = this.applyPeakSelection(processedData, params.peakSelection);
        }
        
        // For aggregate mode, return processed data (will be processed later)
        if (params.aggregateSystems) {
            console.log(`Returning processed data for aggregate mode: ${processedData.length} records`);
            return processedData;
        }
        
        // For non-aggregate mode, convert to peaks per system
        if (params.showPeaks) {
            const monthlyPeaks = this.convertToMonthlyPeaks(processedData);
            console.log(`Added ${monthlyPeaks.length} monthly peak records for ${systemName} (from ${data.length} 15-min intervals)`);
            console.log(`Monthly peaks sample:`, monthlyPeaks.slice(0, 2));
            return monthlyPeaks;
        } else {
            const dailyPeaks = this.convertToDailyPeaks(processedData);
            console.log(`Added ${dailyPeaks.length} daily peak records for ${systemName} (from ${data.length} 15-min intervals)`);
            console.log(`Daily peaks sample:`, dailyPeaks.slice(0, 2));
            return dailyPeaks;
        }
    }

    async handleNoData(systemName, params) {
        console.warn(`❌ No data found for system: ${systemName}`);
        console.warn(`API Response was: []`);
        console.warn(`Possible causes:`);
        console.warn(`  1. No data in database for this system/function/date range`);
        console.warn(`  2. System name mismatch in database`);
        console.warn(`  3. Date range has no data`);
        
        try {
            const availableSystems = await this.apiService.fetchSystemNames(params.mqFunction);
            console.warn(`Available systems for ${params.mqFunction}:`, availableSystems);
            
            // If this system is not in available systems, suggest alternatives
            if (availableSystems && availableSystems.length > 0 && !availableSystems.includes(systemName)) {
                console.warn(`⚠️  System "${systemName}" not found in available systems.`);
                console.warn(`   Available systems: ${availableSystems.join(', ')}`);
                console.warn(`   Returning empty data for missing system.`);
                
                // Return empty data instead of mock data for systems not in available list
                return [];
            }
        } catch (e) {
            console.warn(`Could not fetch available systems:`, e);
        }
        
        // Only use fallback data if system exists but has no data for this date range
        console.warn(`   System exists but no data for date range - using minimal fallback data`);
        return await this.generateMinimalFallbackData(systemName, params);
    }

    async generateMinimalFallbackData(systemName, params) {
        console.warn(`Using minimal fallback data (mostly zeros) for ${systemName}`);
        
        // Generate minimal data with mostly zero values
        const startDate = new Date(params.startDate);
        const endDate = new Date(params.endDate);
        const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const minimalData = [];
        for (let i = 0; i <= Math.min(diffDays, 30); i++) { // Limit to 30 days max
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            minimalData.push({
                date_time: date.toISOString().split('T')[0] + 'T12:00:00Z',
                trans_per_sec: 0, // Always 0 for missing systems
                system_name: systemName,
                isMockData: true,
                isMinimalData: true
            });
        }
        
        console.log(`Generated ${minimalData.length} minimal data points for ${systemName}`);
        return minimalData;
    }

    async generateFallbackData(systemName, params) {
        console.error(`Using MOCK DATA due to API failure`);
        const mockData = this.generateMockDataForSystem(systemName, params.startDate, params.endDate);
        
        // For aggregate mode, return raw data
        if (params.aggregateSystems) {
            console.log(`Returning mock raw data for aggregate mode: ${mockData.length} records`);
            return mockData;
        }
        
        // For non-aggregate mode, convert to peaks
        if (params.showPeaks) {
            const monthlyPeaks = this.convertToMonthlyPeaks(mockData);
            console.log(`Added ${monthlyPeaks.length} mock monthly peak records for ${systemName}`);
            return monthlyPeaks;
        } else {
            const dailyPeaks = this.convertToDailyPeaks(mockData);
            console.log(`Added ${dailyPeaks.length} mock daily peak records for ${systemName}`);
            return dailyPeaks;
        }
    }

    logDataSourceSummary(allData) {
        try {
            // Prevent infinite recursion - check if allData is valid
            if (!allData || !Array.isArray(allData)) {
                console.warn('⚠️  Invalid data provided to logDataSourceSummary');
                return;
            }
            
            const realDataCount = allData.filter(item => !item.isMockData).length;
            const mockDataCount = allData.filter(item => item.isMockData).length;
            
            console.log('📊 DATA SOURCE SUMMARY:');
            console.log(`   ✅ Real API Data: ${realDataCount} records`);
            console.log(`   🎭 Mock Data: ${mockDataCount} records`);
            console.log(`   📈 Total Data Points: ${allData.length}`);
            
            if (mockDataCount > 0) {
                console.warn('⚠️  WARNING: Some data is MOCK/SIMULATED');
                console.warn('   Possible reasons:');
                console.warn('   - Backend not running or not accessible');
                console.warn('   - No data in database for selected systems/date range');
                console.warn('   - System names not matching database records');
            }
            
            if (realDataCount > 0) {
                console.log('✅ SUCCESS: Using real data from database');
                
                // Safely calculate min/max TPS without spreading large arrays
                let maxTps = -Infinity;
                let minTps = Infinity;
                let validCount = 0;
                
                for (const item of allData) {
                    if (!item.isMockData && item.trans_per_sec != null) {
                        const tps = parseFloat(item.trans_per_sec) || 0;
                        if (tps > maxTps) maxTps = tps;
                        if (tps < minTps) minTps = tps;
                        validCount++;
                    }
                }
                
                if (validCount > 0 && maxTps !== -Infinity && minTps !== Infinity) {
                    console.log(`   📊 TPS Range: ${minTps.toFixed(2)} - ${maxTps.toFixed(2)}`);
                    
                    if (maxTps > 1000) {
                        console.log('   🎉 TPS values look realistic (>1000)');
                    }
                }
            } else {
                console.warn('⚠️  NO REAL DATA - All data is simulated');
                console.warn('   Please check:');
                console.warn('   1. Backend server is running on port 8888');
                console.warn('   2. Database contains data for selected MQ function');
                console.warn('   3. Date range contains actual data');
            }
        } catch (error) {
            console.error('Error in logDataSourceSummary:', error.message);
        }
    }

    async renderChart(allData, params) {
        if (params.aggregateSystems) {
            await this.generateAggregatedSystemChart(allData, params);
        } else {
            await this.generateMultiSystemChart(allData, params);
        }
    }

    async generateMultiSystemChart(allData, params) {
        console.log('Multi-system mode - Systems:', params.systemNames);
        console.log('Multi-system mode - Data count:', allData.length);
        
        const processedData = this.chartManager._processMultiSystemData(allData, params.systemNames);
        console.log('Processed data for multi-system chart:', processedData);
        
        // Filter out systems with no real data (only zeros or empty)
        const systemsWithData = [];
        const filteredData = {};
        
        params.systemNames.forEach(systemName => {
            const systemData = processedData[systemName] || [];
            
            // Check if system has any non-zero TPS values
            const hasRealData = systemData.some(item => {
                const tps = parseFloat(item.trans_per_sec) || 0;
                return tps > 0 && !item.isMinimalData;
            });
            
            if (hasRealData) {
                systemsWithData.push(systemName);
                filteredData[systemName] = systemData;
                console.log(`✅ Including ${systemName} - has real data`);
            } else {
                console.log(`❌ Excluding ${systemName} - no real data (only zeros or minimal data)`);
            }
        });
        
        if (systemsWithData.length === 0) {
            console.warn('No systems with real data found');
            alert('No systems have data for the selected time range and MQ function.');
            return;
        }
        
        console.log(`Filtered systems with data: ${systemsWithData.join(', ')}`);
        
        const title = this.generateChartTitle({...params, systemNames: systemsWithData});
        
        await this.chartManager.generateMultiSystemChart(
            'chart',
            filteredData,
            systemsWithData,
            {
                title: title,
                xLabel: 'Date/Time',
                yLabel: 'Transactions Per Second (TPS)'
            }
        );
        
        console.log('✅ Multi-system chart generated successfully!');
    }

    generateChartTitle(params) {
        if (params.showPeaks) {
            return params.mqFunction 
                ? `${params.mqFunction} - Monthly Peak Comparison`
                : 'All MQ Functions - Monthly Peak Comparison';
        } else {
            return params.mqFunction 
                ? `${params.mqFunction} - Daily Peak Comparison`
                : 'All MQ Functions - Daily Peak Comparison';
        }
    }

    async generateAggregatedSystemChart(allData, params) {
        try {
            // Step 1: Group by exact timestamp and sum TPS across all systems
            const timeGroups = new Map();
            
            allData.forEach(item => {
                const timeKey = item.date_time;
                if (!timeGroups.has(timeKey)) {
                    timeGroups.set(timeKey, {
                        date_time: timeKey,
                        trans_per_sec: 0,
                        systemData: {}
                    });
                }
                
                const group = timeGroups.get(timeKey);
                const tps = parseFloat(item.trans_per_sec) || 0;
                group.trans_per_sec += tps;
                group.systemData[item.system_name] = tps;
            });
            
            // Step 2: Convert to array with combined TPS
            const combinedData = Array.from(timeGroups.values())
                .sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
            
            console.log('Combined data points:', combinedData.length);
            
            // Step 3: Find peaks based on the combined TPS
            let aggregatedData;
            if (params.showPeaks) {
                // Monthly peaks of COMBINED data
                aggregatedData = this.findMonthlyPeaksFromCombined(combinedData);
                console.log('Monthly peaks found:', aggregatedData.length);
            } else {
                // Daily peaks of COMBINED data
                aggregatedData = this.findDailyPeaksFromCombined(combinedData, params.peakSelection);
                console.log('Daily peaks found:', aggregatedData.length);
                if (params.peakSelection === 'specific') {
                    console.log('🎯 Filtered to specific days (1st, 16th, last of month)');
                }
            }
            
            // Generate chart title
            const title = params.mqFunction 
                ? `${params.mqFunction} - Aggregated Systems (${params.systemNames.join(', ')})`
                : `All MQ Functions - Aggregated Systems (${params.systemNames.join(', ')})`;
            
            // Create custom chart with enhanced tooltip
            const chartElement = document.getElementById('chart');
            if (!chartElement) {
                console.error('Chart container not found');
                return;
            }
            
            // Destroy any existing chart
            const existingChart = Chart.getChart('chart');
            if (existingChart) {
                existingChart.destroy();
            }
            
            if (this.chartManager.chartInstance) {
                this.chartManager.chartInstance.destroy();
                this.chartManager.chartInstance = null;
            }
            
            const ctx = chartElement.getContext('2d');
            
            // Check if this is monthly data
            const timestamps = aggregatedData.map(d => d.date_time);
            
            // Inline isMonthlyData check
            let isMonthlyData = false;
            if (timestamps.length >= 2) {
                // Check if all timestamps are on the 15th of the month
                const monthlyPattern = timestamps.every(timestamp => {
                    const date = new Date(timestamp);
                    return date.getDate() === 15;
                });
                
                // Check if the time intervals are roughly monthly (25-35 days apart)
                const firstDate = new Date(timestamps[0]);
                const secondDate = new Date(timestamps[1]);
                const daysDiff = (secondDate - firstDate) / (1000 * 60 * 60 * 24);
                
                isMonthlyData = monthlyPattern || (daysDiff >= 25 && daysDiff <= 35);
            }
            
            const labels = aggregatedData.map(item => {
                const date = new Date(item.date_time);
                if (isMonthlyData) {
                    return date.toLocaleString('en-US', { 
                        month: 'short', 
                        year: 'numeric'
                    });
                } else {
                    // Use consistent timezone formatting
                    const label = date.toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'Asia/Bangkok'
                    });
                    
                    // Debug: Log first few labels to check timezone consistency
                    if (aggregatedData.indexOf(item) < 3) {
                        console.log(`📅 Chart label debug:`, {
                            original: item.date_time,
                            dateObject: date.toString(),
                            label: label,
                            timezone: 'Asia/Bangkok'
                        });
                    }
                    
                    return label;
                }
            });
            
            const values = aggregatedData.map(item => item.trans_per_sec);
            const maxValue = Math.max(...values);
            
            this.chartManager.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Aggregated (${params.systemNames.join(', ')})`,
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
                            text: title,
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
                            callbacks: {
                                title: function(context) {
                                    return '📅 ' + (isMonthlyData ? 'Month: ' : 'Date: ') + context[0].label;
                                },
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return label + ': ' + new Intl.NumberFormat('en-US', { 
                                        maximumFractionDigits: 2 
                                    }).format(value) + ' TPS';
                                },
                                afterBody: function(context) {
                                    const dataIndex = context[0].dataIndex;
                                    const systemData = aggregatedData[dataIndex].systemData;
                                    const peakDateTime = aggregatedData[dataIndex].date_time;
                                    
                                    const breakdown = [''];
                                    
                                    // Show actual peak date/time
                                    if (peakDateTime) {
                                        const date = new Date(peakDateTime);
                                        const formattedDate = date.toLocaleString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'Asia/Bangkok'
                                        });
                                        
                                        // Debug: Log tooltip date formatting
                                        console.log(`📅 Tooltip date debug:`, {
                                            original: peakDateTime,
                                            dateObject: date.toString(),
                                            formatted: formattedDate,
                                            timezone: 'Asia/Bangkok'
                                        });
                                        
                                        breakdown.push(`🎯 Peak occurred at: ${formattedDate}`);
                                        breakdown.push('');
                                    }
                                    
                                    breakdown.push('📊 System Breakdown at Peak:');
                                    
                                    // Show each system's contribution at this peak time
                                    let total = 0;
                                    Object.entries(systemData).forEach(([system, tps]) => {
                                        total += tps;
                                        breakdown.push(`  • ${system}: ${new Intl.NumberFormat('en-US', { 
                                            maximumFractionDigits: 2 
                                        }).format(tps)} TPS`);
                                    });
                                    
                                    breakdown.push('');
                                    breakdown.push(`📈 Combined Total: ${new Intl.NumberFormat('en-US', { 
                                        maximumFractionDigits: 2 
                                    }).format(total)} TPS`);
                                    breakdown.push('');
                                    breakdown.push('💡 All systems combined at same time');
                                    
                                    return breakdown;
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
        console.log(`Input data sample:`, rawData.slice(0, 2));
        
        // Group data by date and system
        const dailyGroups = new Map();
        
        rawData.forEach(item => {
            const date = new Date(item.date_time);
            const dateKey = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
            const systemName = item.system_name;
            const groupKey = `${dateKey}_${systemName}`;
            const tpsValue = parseFloat(item.trans_per_sec) || 0;
            
            if (!dailyGroups.has(groupKey)) {
                dailyGroups.set(groupKey, {
                    date: dateKey,
                    system_name: systemName,
                    intervals: []
                });
            }
            
            dailyGroups.get(groupKey).intervals.push({
                time: item.date_time,
                tps: tpsValue
            });
        });
        
        console.log(`Created ${dailyGroups.size} daily groups`);
        
        // Find daily peaks for each system
        const dailyPeaks = [];
        
        dailyGroups.forEach((group, groupKey) => {
            // Find the maximum TPS for this day and system
            const tpsValues = group.intervals.map(interval => interval.tps);
            const maxTps = Math.max(...tpsValues);
            
            // Find the time when this peak occurred
            const peakInterval = group.intervals.find(interval => interval.tps === maxTps);
            
            const peakRecord = {
                date_time: group.date + 'T12:00:00Z', // Use noon as representative time
                trans_per_sec: maxTps,
                system_name: group.system_name,
                peak_time: peakInterval ? peakInterval.time : null // Original time of peak
            };
            
            dailyPeaks.push(peakRecord);
        });
        
        console.log(`Converted ${rawData.length} 15-minute records to ${dailyPeaks.length} daily peaks`);
        console.log(`Daily peaks sample:`, dailyPeaks.slice(0, 2));
        return dailyPeaks;
    }

    // Find daily peaks from combined data (sum first, then find peak)
    findDailyPeaksFromCombined(combinedData, peakSelection = 'all') {
        console.log('Finding daily peaks from combined data, items:', combinedData.length);
        console.log('Peak selection:', peakSelection);
        
        if (!combinedData || combinedData.length === 0) {
            console.warn('No combined data to process');
            return [];
        }
        
        const dailyGroups = new Map();
        
        combinedData.forEach(item => {
            const date = new Date(item.date_time);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!dailyGroups.has(dateKey)) {
                dailyGroups.set(dateKey, []);
            }
            
            dailyGroups.get(dateKey).push(item);
        });
        
        console.log('Daily groups created:', dailyGroups.size);
        
        // Find peak for each day
        const dailyPeaks = [];
        dailyGroups.forEach((items, dateKey) => {
            // Find the item with maximum combined TPS
            const peakItem = items.reduce((max, item) => 
                (item.trans_per_sec || 0) > (max.trans_per_sec || 0) ? item : max
            );
            
            dailyPeaks.push({
                date_time: peakItem.date_time,
                trans_per_sec: peakItem.trans_per_sec || 0,
                systemData: peakItem.systemData || {},
                peak_date: dateKey
            });
        });
        
        console.log('Daily peaks found:', dailyPeaks.length);
        
        // Apply peak selection filtering using the unified function
        const sortedPeaks = dailyPeaks.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
        
        if (peakSelection && peakSelection !== 'all') {
            const filteredPeaks = this.applyPeakSelection(sortedPeaks, peakSelection);
            console.log(`🎯 Peak selection (${peakSelection}) applied: ${sortedPeaks.length} → ${filteredPeaks.length} peaks`);
            
            // Show selected dates for debugging
            if (filteredPeaks.length > 0) {
                const selectedDates = filteredPeaks.map(peak => {
                    const date = new Date(peak.date_time);
                    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                });
                console.log(`📅 Selected dates (${peakSelection}):`, selectedDates);
            }
            
            return filteredPeaks;
        }
        
        return sortedPeaks;
    }
    
    filterSpecificDayPeaks(dailyPeaks) {
        // Group by month
        const monthlyGroups = new Map();
        
        dailyPeaks.forEach(peak => {
            const date = new Date(peak.date_time);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyGroups.has(monthKey)) {
                monthlyGroups.set(monthKey, []);
            }
            
            monthlyGroups.get(monthKey).push(peak);
        });
        
        // Filter to keep only 1st, 16th, and last day of each month
        const filteredPeaks = [];
        
        monthlyGroups.forEach((peaks, monthKey) => {
            const [year, month] = monthKey.split('-').map(Number);
            
            peaks.forEach(peak => {
                const date = new Date(peak.date_time);
                const day = date.getDate();
                
                // Get last day of month
                const lastDay = new Date(year, month, 0).getDate();
                
                // Keep if day is 1, 16, or last day
                if (day === 1 || day === 16 || day === lastDay) {
                    filteredPeaks.push(peak);
                }
            });
        });
        
        return filteredPeaks.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    }
    
    // Find monthly peaks from combined data (sum first, then find peak)
    findMonthlyPeaksFromCombined(combinedData) {
        console.log('Finding monthly peaks from combined data, items:', combinedData.length);
        
        if (!combinedData || combinedData.length === 0) {
            console.warn('No combined data to process');
            return [];
        }
        
        const monthlyGroups = new Map();
        
        combinedData.forEach(item => {
            const date = new Date(item.date_time);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            
            if (!monthlyGroups.has(monthKey)) {
                monthlyGroups.set(monthKey, []);
            }
            
            monthlyGroups.get(monthKey).push(item);
        });
        
        console.log('Monthly groups created:', monthlyGroups.size);
        
        // Find peak for each month
        const monthlyPeaks = [];
        monthlyGroups.forEach((items, monthKey) => {
            // Find the item with maximum combined TPS
            const peakItem = items.reduce((max, item) => 
                (item.trans_per_sec || 0) > (max.trans_per_sec || 0) ? item : max
            );
            
            // Use actual peak date for display (not 15th)
            monthlyPeaks.push({
                date_time: peakItem.date_time, // Use actual peak date/time
                trans_per_sec: peakItem.trans_per_sec || 0,
                systemData: peakItem.systemData || {},
                peak_date: peakItem.date_time, // Same as date_time
                month_year: monthKey
            });
        });
        
        console.log('Monthly peaks found:', monthlyPeaks.length);
        return monthlyPeaks.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
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
            
            // Use actual peak date/time (not 15th)
            const peakDateTime = peakInterval ? peakInterval.time : new Date(group.month + '-15T12:00:00Z').toISOString();
            
            monthlyPeaks.push({
                date_time: peakDateTime, // Use actual peak date/time
                trans_per_sec: maxTps,
                system_name: group.system_name,
                peak_time: peakDateTime, // Same as date_time
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
                
                console.log('🔄 All MQ Functions toggled:', isChecked);
                
                // Disable/enable and clear MQ Function dropdown
                if (this.mqFunctionSelect) {
                    this.mqFunctionSelect.setDisabled(isChecked);
                    if (isChecked) {
                        // Clear selection when enabling "All MQ Functions"
                        this.mqFunctionSelect.clearSelection();
                        console.log('✅ Cleared MQ Function selection');
                    }
                }
                
                // Note: System Name dropdown removed - no longer needed
                
                // Hide/show system names container
                const systemNamesContainer = document.getElementById('system-names-container');
                if (systemNamesContainer) {
                    systemNamesContainer.style.display = isChecked ? 'none' : 'none'; // Hide when checked, also hide when unchecked until MQ Function is selected
                    
                    if (isChecked) {
                        // Uncheck aggregate systems when using all functions
                        document.getElementById('aggregate-systems').checked = false;
                        
                        // Clear all system checkboxes
                        const checkboxes = document.querySelectorAll('#system-names-checkboxes input[type="checkbox"]');
                        checkboxes.forEach(cb => cb.checked = false);
                        console.log('✅ Cleared all system selections');
                    } else {
                        // When unchecking "All MQ Functions", clear system checkboxes and hide container
                        const checkboxes = document.querySelectorAll('#system-names-checkboxes input[type="checkbox"]');
                        checkboxes.forEach(cb => cb.checked = false);
                        
                        // Clear the checkboxes container
                        const container = document.getElementById('system-names-checkboxes');
                        if (container) {
                            container.innerHTML = '';
                        }
                        
                        // Reset aggregate systems checkbox
                        document.getElementById('aggregate-systems').checked = false;
                        
                        console.log('✅ Cleared all system selections and reset container');
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

    setupTimePresets() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        const customRange = document.getElementById('custom-range');
        const startInput = document.getElementById('start-datetime');
        const endInput = document.getElementById('end-datetime');

        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                presetButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');

                const now = new Date();
                let startDate, endDate;

                if (btn.dataset.custom) {
                    // Show custom range inputs and hide date info
                    customRange.style.display = 'block';
                    
                    // Set custom range: start = 2023-01-01, end = current time
                    const customStartDate = new Date(2023, 0, 1, 0, 0); // 2023-01-01 00:00
                    const customEndDate = new Date(); // Current time
                    
                    startInput.value = formatDateTime(customStartDate);
                    endInput.value = formatDateTime(customEndDate);
                    
                    console.log(`📅 Applied Custom preset:`);
                    console.log(`   📊 Start: ${formatDateTime(customStartDate)} (Database start)`);
                    console.log(`   📊 End: ${formatDateTime(customEndDate)} (Current time)`);
                    
                    const dateRangeInfo = document.getElementById('date-range-info');
                    if (dateRangeInfo) {
                        dateRangeInfo.style.display = 'none';
                    }
                    return;
                }

                // Hide custom range inputs for presets
                customRange.style.display = 'none';

                if (btn.dataset.days) {
                    const days = parseInt(btn.dataset.days);
                    // Use database data range (from 2023-01-01 to 2023-12-31)
                    const dataStartDate = new Date(2023, 0, 1, 0, 0); // 2023-01-01 00:00
                    const dataEndDate = new Date(2023, 11, 31, 23, 59); // 2023-12-31 23:59
                    
                    startDate = new Date(dataEndDate.getTime() - (days * 24 * 60 * 60 * 1000));
                    
                    // Ensure start date doesn't go before database start
                    if (startDate < dataStartDate) {
                        startDate = dataStartDate;
                    }
                    
                    endDate = dataEndDate;
                } else if (btn.dataset.full) {
                    // Full year 2023
                    startDate = new Date(2023, 0, 1, 0, 0); // 2023-01-01 00:00
                    endDate = new Date(2023, 11, 31, 23, 59); // 2023-12-31 23:59
                }

                // Format dates for datetime-local input
                const formatDateTime = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                };

                startInput.value = formatDateTime(startDate);
                endInput.value = formatDateTime(endDate);

                // Show detailed date range info
                const startDateStr = startDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    weekday: 'short'
                });
                const endDateStr = endDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    weekday: 'short'
                });

                // Update UI info display
                const dateRangeInfo = document.getElementById('date-range-info');
                const dateRangeText = document.getElementById('date-range-text');
                
                if (dateRangeInfo && dateRangeText) {
                    dateRangeInfo.style.display = 'block';
                    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                    dateRangeText.textContent = `${startDateStr} → ${endDateStr} (${duration} days)`;
                }

                console.log(`📅 Applied preset: ${btn.textContent}`);
                console.log(`   📊 Date Range: ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`);
                console.log(`   🗓️  From: ${startDateStr}`);
                console.log(`   🗓️  To: ${endDateStr}`);
                console.log(`   ⏱️  Duration: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days`);
            });
        });

        // Initially show custom range (default)
        customRange.style.display = 'block';
    }

    // Apply TPS threshold filtering to data
    applyTpsFiltering(data, minTps, maxTps) {
        if (!minTps && !maxTps) {
            return data; // No filtering needed
        }

        console.log(`🔍 Applying TPS filtering: min=${minTps}, max=${maxTps}`);
        
        const filteredData = data.filter(item => {
            const tps = parseFloat(item.trans_per_sec) || 0;
            
            if (minTps && tps < minTps) {
                return false;
            }
            
            if (maxTps && tps > maxTps) {
                return false;
            }
            
            return true;
        });

        console.log(`📊 TPS filtering: ${data.length} → ${filteredData.length} records`);
        return filteredData;
    }

    // Apply time aggregation to data
    applyTimeAggregation(data, aggregationType) {
        if (aggregationType === '15min') {
            return data; // No aggregation needed
        }

        console.log(`⏱️ Applying time aggregation: ${aggregationType}`);
        
        const timeGroups = new Map();
        let intervalMinutes;

        switch (aggregationType) {
            case '1hour':
                intervalMinutes = 60;
                break;
            case '1day':
                intervalMinutes = 24 * 60;
                break;
            default:
                return data;
        }

        data.forEach(item => {
            const date = new Date(item.date_time);
            let groupKey;

            if (aggregationType === '1hour') {
                // Group by hour
                groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00:00Z`;
            } else if (aggregationType === '1day') {
                // Group by day
                groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T12:00:00Z`;
            }

            if (!timeGroups.has(groupKey)) {
                timeGroups.set(groupKey, {
                    date_time: groupKey,
                    tps_values: [],
                    system_name: item.system_name
                });
            }

            timeGroups.get(groupKey).tps_values.push(parseFloat(item.trans_per_sec) || 0);
        });

        // Calculate averages
        const aggregatedData = Array.from(timeGroups.values()).map(group => ({
            date_time: group.date_time,
            trans_per_sec: group.tps_values.reduce((sum, val) => sum + val, 0) / group.tps_values.length,
            system_name: group.system_name,
            aggregated: true,
            aggregation_type: aggregationType,
            sample_count: group.tps_values.length
        }));

        console.log(`📊 Time aggregation: ${data.length} → ${aggregatedData.length} records`);
        return aggregatedData;
    }

    // Apply peak selection filtering to data
    applyPeakSelection(data, peakSelection) {
        if (peakSelection === 'all') {
            return data; // No filtering needed
        }

        console.log(`🎯 Applying peak selection: ${peakSelection}`);
        
        const filteredData = data.filter(item => {
            const date = new Date(item.date_time);
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const dayOfMonth = date.getDate();
            const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

            let isSelected = false;
            switch (peakSelection) {
                case 'specific':
                    // 1st, 16th, and last day of month
                    isSelected = dayOfMonth === 1 || dayOfMonth === 16 || dayOfMonth === lastDayOfMonth;
                    break;
                
                case 'weekdays':
                    // Monday to Friday (1-5)
                    isSelected = dayOfWeek >= 1 && dayOfWeek <= 5;
                    break;
                
                case 'weekends':
                    // Saturday and Sunday (0, 6)
                    isSelected = dayOfWeek === 0 || dayOfWeek === 6;
                    break;
                
                default:
                    isSelected = true;
            }

            // Debug log for specific days
            if (peakSelection === 'specific' && isSelected) {
                console.log(`✅ Selected specific day: ${dayOfMonth}/${date.getMonth() + 1}/${date.getFullYear()} (${dayOfMonth === 1 ? '1st' : dayOfMonth === 16 ? '16th' : 'last'})`);
            }

            return isSelected;
        });

        console.log(`🎯 Peak selection: ${data.length} → ${filteredData.length} records`);
        return filteredData;
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MQDashboard();
});