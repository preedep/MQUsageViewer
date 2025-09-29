// Utility functions module
class Utils {
    static buildIso(dateStr, isStart) {
        if (!dateStr) return null;
        return `${dateStr}T${isStart ? '00:00:00' : '23:59:59'}+07:00`;
    }

    static getSmartGroupKey(startDateStr, endDateStr, dtStr, selectedGrouping = 'monthly') {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const rangeInDays = (end - start) / (1000 * 60 * 60 * 24);
        const dt = new Date(dtStr);
        let label = '';

        if (selectedGrouping === 'auto') {
            if (rangeInDays <= 2) selectedGrouping = '15min';
            else if (rangeInDays <= 60) selectedGrouping = 'daily';
            else if (rangeInDays <= 180) selectedGrouping = 'weekly';
            else selectedGrouping = 'monthly';
        }

        if (selectedGrouping === '15min') {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hour = String(dt.getHours()).padStart(2, '0');
            const minuteGroup = Math.floor(dt.getMinutes() / 15) * 15;
            const minute = String(minuteGroup).padStart(2, '0');
            label = '15-Min Interval';
            return {key: `${year}-${month}-${day} ${hour}:${minute}`, label};
        }

        if (selectedGrouping === 'daily') {
            label = 'Daily';
            return {key: dt.toISOString().split('T')[0], label};
        }

        if (selectedGrouping === 'weekly') {
            const year = dt.getFullYear();
            const week = Math.ceil((((dt - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
            label = 'Weekly';
            return {key: `${year}-W${week}`, label};
        }

        if (selectedGrouping === 'monthly') {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            label = 'Monthly';
            return {key: `${year}-${month}`, label};
        }

        return {key: dt.toISOString(), label: 'Time'};
    }

    static formatWorkTotal(value) {
        if (value === undefined || value === null || value === '') return value;
        let raw = String(value).replace(/,/g, '').trim();
        let num = Number(raw);
        return !isNaN(num) ? num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : value;
    }

    static showLoading() {
        document.getElementById('loading-overlay').style.display = 'block';
    }

    static hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }
}

// Export for use in other modules
window.Utils = Utils;
