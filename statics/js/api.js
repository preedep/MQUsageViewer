// API calls module
class ApiService {
    constructor(authManager) {
        this.auth = authManager;
    }

    async fetchMqFunctions() {
        try {
            const res = await fetch('/api/v1/mq/functions', {
                headers: { Authorization: `Bearer ${this.auth.getToken()}` }
            });
            const result = await res.json();
            return (res.ok && result.success && result.data) ? result.data : [];
        } catch (err) {
            console.error("Load MQ function error:", err);
            return [];
        }
    }

    async fetchSystemNames(funcName) {
        if (!funcName) return [];
        try {
            const res = await fetch(`/api/v1/mq/${encodeURIComponent(funcName)}/systems`, {
                headers: { Authorization: `Bearer ${this.auth.getToken()}` }
            });
            const result = await res.json();
            return (res.ok && result.success && result.data) ? result.data : [];
        } catch (err) {
            console.error("Load systems error:", err);
            return [];
        }
    }

    async searchMqData(payload) {
        try {
            console.log('=== API searchMqData() Debug ===');
            console.log('Payload received by API service:', payload);
            console.log('JSON stringified payload:', JSON.stringify(payload));
            
            const res = await fetch('/api/v1/mq/search', {
                method: 'POST',
                headers: this.auth.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            return { success: res.ok && result.success, data: result.data, message: result.message };
        } catch (err) {
            console.error("Search error:", err);
            return { success: false, message: err.message };
        }
    }

    async fetchTpsSummary(payload) {
        try {
            console.log('🔍 TPS Summary API Call:');
            console.log('   📤 Payload:', JSON.stringify(payload, null, 2));
            console.log('   🔗 URL: /api/v1/mq/tps/summary');
            
            const res = await fetch('/api/v1/mq/tps/summary', {
                method: 'POST',
                headers: this.auth.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            
            console.log('   📥 Response Status:', res.status, res.statusText);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('   ❌ Error Response:', errorText);
                return [];
            }
            
            const result = await res.json();
            console.log('   ✅ Response:', result);
            
            return (result.success && result.data) ? result.data : [];
        } catch (err) {
            console.error("TPS summary fetch error:", err);
            return [];
        }
    }

    async fetchAllTpsSummary(payload) {
        try {
            const res = await fetch('/api/v1/mq/tps/all_summary', {
                method: 'POST',
                headers: this.auth.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            return { success: res.ok && result.success, data: result.data || [] };
        } catch (err) {
            console.error("All TPS summary fetch error:", err);
            return { success: false, data: [] };
        }
    }
}

// Export for use in other modules
window.ApiService = ApiService;
