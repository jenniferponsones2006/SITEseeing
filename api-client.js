/* Shared same-origin API client. Cookies stay HttpOnly; only the CSRF token is held here. */
window.SITEseeingAPI = (() => {
    let csrf = null;
    async function request(path, options = {}, retry = true) {
        const method = options.method || 'GET';
        const route = new URL(path, window.location.href);
        const endpoint = new URL('api.php', window.location.href);
        endpoint.search = route.search;
        endpoint.searchParams.set('route', route.pathname);
        let response;
        try {
            response = await fetch(endpoint.href, {
                method, credentials: 'same-origin', signal: options.signal,
                headers: { 'Content-Type': 'application/json', 'X-SITEseeing-Request': '1',
                    ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
                ...(options.body ? { body: JSON.stringify(options.body) } : {})
            });
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            throw new Error('Cannot reach PHP. Start Apache and MySQL in XAMPP, then open http://localhost/SITEseeing/.');
        }
        let data;
        try { data = await response.json(); }
        catch { throw new Error('The server returned an unexpected response. Refresh the page.'); }
        if (!response.ok) {
            if (retry && response.status === 403 && data.error?.includes('session changed')) {
                await request('/api/session', {}, false);
                return request(path, options, false);
            }
            const error = new Error(data.error || 'The request failed. Please try again.');
            error.status = response.status;
            throw error;
        }
        if (Object.hasOwn(data, 'csrf')) csrf = data.csrf;
        return data;
    }
    return { request };
})();
