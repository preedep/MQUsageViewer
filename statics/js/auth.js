// Authentication and token management module
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('access_token');
    }

    isTokenExpired(token) {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp < Math.floor(Date.now() / 1000);
        } catch (_) {
            return true;
        }
    }

    checkTokenAndRedirect() {
        if (!this.token || this.isTokenExpired(this.token)) {
            localStorage.removeItem('access_token');
            window.location.href = "/login.html";
            return false;
        }
        return true;
    }

    logout() {
        localStorage.removeItem('access_token');
        window.location.href = "/login.html";
    }

    getToken() {
        return this.token;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Export for use in other modules
window.AuthManager = AuthManager;
