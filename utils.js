/* Small shared helpers. No build step or external JavaScript dependencies. */
window.SITEseeingUtils = (() => {
    const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const priceFormatter = new Intl.NumberFormat('en-PH');

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => htmlEntities[char]);
    }

    function localDate(date = new Date()) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(date);
        const value = type => parts.find(part => part.type === type).value;
        return `${value('year')}-${value('month')}-${value('day')}`;
    }

    function isTourDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= localDate();
    }

    function formatPrice(value) {
        return `₱${priceFormatter.format(value)}`;
    }

    function safeURL(value, fallback = '') {
        if (!value) return fallback;
        try {
            const url = new URL(value, window.location.href);
            return ['http:', 'https:'].includes(url.protocol) ||
                (url.protocol === 'file:' && !/^[a-z]+:/i.test(value)) ? url.href : fallback;
        } catch {
            return fallback;
        }
    }

    return { escapeHTML, localDate, isTourDate, formatPrice, safeURL };
})();
