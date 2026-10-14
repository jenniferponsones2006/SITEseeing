/* One account/session flow shared by the public site and admin page. */
window.SITEseeingAuth = (() => {
    const { request } = window.SITEseeingAPI;
    const { escapeHTML, formatPrice } = window.SITEseeingUtils;
    let user = null, challenge = null, emailMode = 'smtp';
    const byId = id => document.getElementById(id);

    function status(message = '', error = false) {
        const element = byId('authStatus');
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('is-error', error);
    }

    function applyUser(account) {
        user = account;
        const button = byId('accountButton');
        if (button) {
            button.textContent = user ? user.name : 'Account';
            button.title = user ? `Signed in as ${user.name}` : 'Log in or sign up';
        }
        if (byId('logoutButton')) byId('logoutButton').hidden = !user;
        if (byId('signedInName')) byId('signedInName').textContent = user?.name || '';
    }

    function showTab(tab) {
        status();
        for (const name of ['login', 'signup', 'admin']) {
            byId(`${name}Form`)?.classList.toggle('hidden', tab !== name);
            byId(`${name}Tab`)?.classList.toggle('active', tab === name);
            byId(`${name}Tab`)?.setAttribute('aria-pressed', String(tab === name));
        }
        byId('verifyForm')?.classList.toggle('hidden', tab !== 'verify');
        byId('authTabs')?.classList.toggle('hidden', tab === 'verify');
    }

    function emailMessage() {
        return emailMode === 'local'
            ? 'Local testing: open the newest verification email in the private/outbox folder. No real email was sent.'
            : 'Check your inbox for the six-digit code. If delivery is delayed, wait a minute and resend.';
    }

    async function complete(data, message) {
        applyUser(data.user);
        window.closeModal?.('authModal');
        window.showToast?.(message);
        if (user.role === 'admin') { window.location.assign('admin.html'); return; }
        window.resumeReservationAfterLogin?.();
    }

    async function restore() {
        try {
            const data = await request('/api/session');
            emailMode = data.emailMode;
            applyUser(data.user);
        } catch (error) {
            applyUser(null);
            status(error.message, true);
        }
        return user;
    }

    function bindForm(id, handler) {
        const form = byId(id);
        if (!form) return;
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (form.dataset.busy || !form.reportValidity()) return;
            form.dataset.busy = 'true';
            const buttons = [...form.querySelectorAll('button')];
            buttons.forEach(button => button.disabled = true);
            status('Please wait…');
            try { await handler(form); }
            catch (error) { status(error.message, true); window.showToast?.(error.message); }
            finally { delete form.dataset.busy; buttons.forEach(button => button.disabled = false); }
        });
    }

    bindForm('loginForm', async () => {
        const data = await request('/api/auth/login', {method: 'POST', body: {
            email: byId('loginEmail').value.trim(), password: byId('loginPassword').value, role: 'customer'
        }});
        byId('loginPassword').value = '';
        await complete(data, 'Logged in successfully.');
    });
    bindForm('adminForm', async () => {
        const data = await request('/api/auth/login', {method: 'POST', body: {
            username: byId('adminUsername').value.trim(), password: byId('adminPassword').value, role: 'admin'
        }});
        byId('adminPassword').value = '';
        await complete(data, 'Admin signed in.');
    });
    bindForm('signupForm', async () => {
        const data = await request('/api/auth/signup', {method: 'POST', body: {
            name: byId('signupName').value.trim(), email: byId('signupEmail').value.trim(),
            password: byId('signupPassword').value
        }});
        challenge = data.challengeId;
        emailMode = data.emailMode;
        byId('signupPassword').value = '';
        byId('verifyCode').value = '';
        byId('verificationEmail').textContent = data.email;
        showTab('verify');
        status(emailMessage());
        byId('verifyCode').focus();
    });
    bindForm('verifyForm', async () => {
        if (!challenge) throw new Error('Start signup again to request a verification code.');
        const data = await request('/api/auth/verify', {method: 'POST', body: {
            challengeId: challenge, code: byId('verifyCode').value.trim()
        }});
        challenge = null;
        await complete(data, 'Email verified. Your account is ready.');
    });
    byId('resendCode')?.addEventListener('click', async () => {
        const button = byId('resendCode');
        button.disabled = true;
        try {
            const data = await request('/api/auth/resend', {method: 'POST', body: {challengeId: challenge}});
            emailMode = data.emailMode;
            status(emailMessage());
        } catch (error) { status(error.message, true); }
        finally { button.disabled = false; }
    });

    async function logout() {
        try {
            await request('/api/auth/logout', {method: 'POST', body: {}});
            applyUser(null);
            if (byId('adminApp')) window.location.replace('index.html');
            else { window.closeModal?.('accountModal'); window.showToast?.('Logged out.'); }
        } catch (error) { window.showToast?.(error.message); if (byId('adminMessage')) byId('adminMessage').textContent = error.message; }
    }

    async function openAccount() {
        await ready;
        if (!user) {
            showTab(challenge ? 'verify' : 'login');
            window.openModal('authModal');
            if (challenge) status(emailMessage());
            return;
        }
        if (user.role === 'admin') { window.location.assign('admin.html'); return; }
        byId('accountEmail').textContent = user.email;
        const content = byId('myBookings');
        content.textContent = 'Loading reservations…';
        window.openModal('accountModal');
        try {
            const data = await request('/api/bookings');
            content.innerHTML = data.bookings.length ? data.bookings.map(booking => `
                <article class="my-booking"><h3>${escapeHTML(booking.destination)} · ${escapeHTML(booking.packageName)}</h3>
                    <p>${escapeHTML(booking.bookingId)} · ${escapeHTML(booking.date)} · ${booking.guests} guest(s)</p>
                    <p>${escapeHTML(booking.status)} · ${escapeHTML(booking.paymentStatus)} · ${formatPrice(booking.total)}</p>
                </article>`).join('') : '<p>You have no reservations yet.</p>';
        } catch (error) {
            content.textContent = error.message;
            if (error.status === 401) { applyUser(null); window.closeModal('accountModal'); }
        }
    }

    const ready = restore();
    ready.then(() => {
        if (byId('authModal') && new URL(window.location.href).searchParams.get('admin') === '1' && !user) {
            showTab('admin');
            window.openModal?.('authModal');
        }
    });
    return { ready, restore, getUser: () => user, showTab, logout, openAccount, applyUser };
})();
