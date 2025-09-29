// Main application controller - uses modular components
class MQDashboard {
    constructor() {
        this.authManager = new AuthManager();
        this.apiService = new ApiService(this.authManager);
        this.tableManager = new TableManager();
        this.chartManager = new ChartManager(this.apiService);
        
        this.init();
    }

    init() {
        // Set default end date to today
        const today = new Date();
        document.getElementById('end-date').value = today.toISOString().split('T')[0];
        
        // Initialize components
        this.authManager.checkTokenAndRedirect();
        this.loadMqFunctions();
        this.setupAggregateToggle();
        this.setupEventListeners();
        
        // Make table manager globally accessible for onclick handlers
        window.tableManager = this.tableManager;
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').onclick = () => this.authManager.logout();
        
        // MQ Function change
        document.getElementById('mq-function').addEventListener('change', e => {
            this.loadSystemNames(e.target.value);
        });
        
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
        const sel = document.getElementById('mq-function');
        const functions = await this.apiService.fetchMqFunctions();
        
        sel.innerHTML = '<option value="">-- Select MQ Function --</option>';
        functions.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            sel.appendChild(opt);
        });
    }

    async loadSystemNames(funcName) {
        const sel = document.getElementById('system-name');
        if (!funcName) {
            sel.innerHTML = '<option value="">-- Select MQ Function First --</option>';
            return;
        }
        
        const systems = await this.apiService.fetchSystemNames(funcName);
        sel.innerHTML = '<option value="">-- Select System Name --</option>';
        systems.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            sel.appendChild(opt);
        });
    }

    setupAggregateToggle() {
        const elements = {
            chk: document.getElementById('all-funcs'),
            mqSel: document.getElementById('mq-function'),
            sysSel: document.getElementById('system-name'),
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
            
            [elements.mqSel, elements.sysSel, elements.searchBtn].forEach(el => {
                el.disabled = on;
                el.style.opacity = on ? '0.5' : '1';
            });
            
            elements.searchBtn.style.cursor = on ? 'not-allowed' : 'pointer';
            
            if (on) {
                elements.mqSel.value = '';
                elements.sysSel.value = '';
            }
            
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
            func: document.getElementById('mq-function').value,
            sys: document.getElementById('system-name').value,
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