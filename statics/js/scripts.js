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
        
        // Make table manager globally accessible for onclick handlers
        window.tableManager = this.tableManager;
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
            this.systemNameSelect.setData([]);
            return;
        }
        
        this.systemNameSelect.setLoading(true);
        try {
            const systems = await this.apiService.fetchSystemNames(funcName);
            const data = systems.map(s => ({ value: s, text: s }));
            this.systemNameSelect.setData(data);
            this.systemNameSelect.setPlaceholder('Select System Name...');
        } catch (error) {
            console.error('Error loading system names:', error);
            this.systemNameSelect.setPlaceholder('Error loading systems');
        } finally {
            this.systemNameSelect.setLoading(false);
        }
    }

    setupAggregateToggle() {
        const elements = {
            chk: document.getElementById('all-funcs'),
            searchBtn: document.getElementById('search-btn'),
            graphBtn: document.getElementById('graph-btn')
        };

        if (!Object.values(elements).every(el => el)) {
            console.error('Some elements not found for aggregate toggle');
            return;
        }

        const applyState = () => {
            const on = elements.chk.checked;
            console.log('Aggregate mode:', on);
            
            // Disable/enable searchable dropdowns
            if (on) {
                this.mqFunctionSelect.disable();
                this.systemNameSelect.disable();
                this.mqFunctionSelect.clear();
                this.systemNameSelect.clear();
            } else {
                this.mqFunctionSelect.enable();
                this.systemNameSelect.enable();
            }
            
            // Disable/enable search button
            elements.searchBtn.disabled = on;
            elements.searchBtn.style.opacity = on ? '0.5' : '1';
            elements.searchBtn.style.cursor = on ? 'not-allowed' : 'pointer';
            
            // Graph button always enabled
            elements.graphBtn.disabled = false;
        };
        
        elements.chk.addEventListener('change', applyState);
        applyState();
    }

    async performSearch() {
        const aggregate = document.getElementById('all-funcs')?.checked;
        if (aggregate) {
            return false; // Search disabled in aggregate mode
        }

        Utils.showLoading();
        
        const formData = this.getFormData();
        if (!formData.func) {
            alert("Please select an MQ Function before proceeding.");
            Utils.hideLoading();
            return false;
        }

        const payload = {
            from_datetime: Utils.buildIso(formData.startDate, true),
            to_datetime: Utils.buildIso(formData.endDate, false),
            mq_function_name: formData.func,
        };
        if (formData.sys) payload.system_name = formData.sys;

        const result = await this.apiService.searchMqData(payload);
        Utils.hideLoading();
        
        if (result.success && result.data) {
            this.tableManager.setData(result.data);
            this.tableManager.render();
            this.setActiveTab('search');
            return true;
        } else {
            document.getElementById('search-result').innerHTML = 
                `<p>Search failed: ${result.message || "Unknown error"}</p>`;
            return false;
        }
    }

    async generateGraph() {
        this.setActiveTab('graph');
        Utils.showLoading();

        const aggregate = document.getElementById('all-funcs')?.checked;
        const formData = this.getFormData();
        
        let success = false;
        
        if (aggregate) {
            success = await this.chartManager.generateAggregateChart(
                formData.startDate, formData.endDate, formData.grouping
            );
        } else {
            if (!formData.func) {
                alert("Please select an MQ Function before generating the graph.");
                Utils.hideLoading();
                return;
            }
            success = await this.chartManager.generateFunctionChart(
                formData.startDate, formData.endDate, formData.grouping, 
                formData.func, formData.sys
            );
        }
        
        Utils.hideLoading();
    }

    getFormData() {
        return {
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value,
            func: this.mqFunctionSelect.getValue(),
            sys: this.systemNameSelect.getValue(),
            grouping: document.getElementById('grouping')?.value || 'monthly'
        };
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