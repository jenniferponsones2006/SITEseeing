/* Admin records are loaded from the protected database API, never from browser storage. */
(async () => {
    const { request } = window.SITEseeingAPI;
    const { escapeHTML, formatPrice } = window.SITEseeingUtils;
    const byId = id => document.getElementById(id);
    const account = await window.SITEseeingAuth.ready;
    if (account?.role !== 'admin') { window.location.replace('index.html?admin=1'); return; }
    byId('adminLoading').hidden = true;
    byId('adminApp').hidden = false;
    byId('defaultPasswordNotice').hidden = !account.mustChangePassword;
    let page = 1, pageCount = 1, peoplePage = 1, peoplePages = 1, controller, searchTimer;
    const dateFormatter = new Intl.DateTimeFormat('en-PH', {year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Manila'});
    const dateLabel = value => dateFormatter.format(typeof value === 'number' ? new Date(value*1000) : new Date(`${value}T00:00:00+08:00`));
    const emailLabel = state => ({sent:'Email sent', local:'Email saved locally for testing',queued:'Email queued',failed:'Email delivery failed; retry is scheduled',sending:'Email is being sent'}[state] || 'Email queued');
    const message = error => {
        byId('adminMessage').textContent = error?.message || '';
        if (error?.status === 401 || error?.status === 403) window.location.replace('index.html?admin=1');
    };

    async function loadBookings() {
        controller?.abort();
        controller = new AbortController();
        const params = new URLSearchParams({page, pageSize:8, q:byId('bookingSearch').value.trim(),status:byId('statusFilter').value});
        try {
            const data = await request(`/api/admin/bookings?${params}`, {signal:controller.signal});
            message();
            page = data.page; pageCount = Math.max(1,Math.ceil(data.total/data.pageSize));
            for (const key of ['total','confirmed','pending','cancelled']) byId(`${key}Reservations`).textContent = data.summary[key];
            const offset = (page-1)*data.pageSize;
            byId('bookingRows').innerHTML = data.bookings.length ? data.bookings.map((booking,index) => `
                <tr><td>${offset+index+1}</td><td>${escapeHTML(booking.customerName)}</td><td>${escapeHTML(booking.email)}</td>
                    <td><strong>${escapeHTML(booking.destination)}</strong><small>${escapeHTML(booking.packageName)}</small></td>
                    <td>${dateLabel(booking.date)}</td><td>${booking.guests}</td>
                    <td><span class="status-badge status-${booking.status.toLowerCase()}">${escapeHTML(booking.status)}</span></td>
                    <td><button type="button" class="view-booking" data-booking-id="${booking.id}" aria-label="View reservation ${escapeHTML(booking.bookingId)}">View</button></td></tr>`).join('')
                : '<tr><td colspan="8" class="empty-row">No reservations match these filters.</td></tr>';
            byId('bookingCount').textContent = data.total ? `Showing ${offset+1}–${offset+data.bookings.length} of ${data.total} reservations` : 'No reservations yet';
            byId('pageIndicator').textContent = `${page} / ${pageCount}`;
            byId('previousPage').disabled = page <= 1;
            byId('nextPage').disabled = page >= pageCount;
        } catch (error) { if (error.name !== 'AbortError') message(error); }
    }

    async function loadPeople() {
        try {
            const data = await request(`/api/admin/users?page=${peoplePage}&pageSize=20`);
            peoplePages = Math.max(1,Math.ceil(data.total/data.pageSize));
            byId('peopleRows').innerHTML = data.users.length ? data.users.map(person => `
                <tr><td>${escapeHTML(person.name)}</td><td>${escapeHTML(person.email)}</td>
                    <td>${dateLabel(person.created_at)}</td><td>${person.bookings}</td></tr>`).join('')
                : '<tr><td colspan="4" class="empty-row">No verified customer accounts yet.</td></tr>';
            byId('peopleCount').textContent = `${data.total} verified customer account(s)`;
            byId('peoplePage').textContent = `${peoplePage} / ${peoplePages}`;
            byId('peoplePrevious').disabled = peoplePage <= 1;
            byId('peopleNext').disabled = peoplePage >= peoplePages;
            message();
        } catch (error) { message(error); }
    }

    async function showBooking(id, refresh = false) {
        try {
            const { booking } = await request(`/api/admin/bookings/${id}`);
            const facts = [['Reference',booking.bookingId],['Name',booking.customerName],['Email',booking.email],
                ['Package',`${booking.destination} · ${booking.packageName}`],['Date of visit',dateLabel(booking.date)],
                ['Group size',booking.guests],['Total',formatPrice(booking.total)],['Payment method',booking.paymentMethod]];
            byId('bookingDetails').innerHTML = `<div class="booking-facts">${facts.map(([label,value]) => `<p><strong>${label}</strong>${escapeHTML(value)}</p>`).join('')}</div>
                <form id="bookingEditForm" class="booking-edit">
                    <label for="bookingStatus">Reservation status</label><select id="bookingStatus">${['Confirmed','Pending','Cancelled'].map(status=>`<option ${status===booking.status?'selected':''}>${status}</option>`).join('')}</select>
                    <label for="bookingPaymentStatus">Payment status</label><select id="bookingPaymentStatus">${['Awaiting Payment','Pay at Venue','Payment Confirmed'].map(status=>`<option ${status===booking.paymentStatus?'selected':''}>${status}</option>`).join('')}</select>
                    <button type="submit" class="button button-dark">Save changes</button><p id="bookingError" class="dialog-error" role="status"></p>
                </form><p class="email-state">${escapeHTML(emailLabel(booking.emailStatus))}</p>
                ${['failed','queued'].includes(booking.emailStatus)?'<button id="retryEmail" class="button button-gold" type="button">Retry confirmation email</button>':''}`;
            if (!refresh) byId('bookingDialog').showModal();
            byId('bookingEditForm').addEventListener('submit', async event => {
                event.preventDefault();
                const button = event.target.querySelector('button'); button.disabled = true;
                try {
                    await request(`/api/admin/bookings/${id}`, {method:'PATCH',body:{status:byId('bookingStatus').value,paymentStatus:byId('bookingPaymentStatus').value,version:booking.version}});
                    byId('bookingDialog').close(); await loadBookings();
                } catch (error) { byId('bookingError').textContent = error.message; }
                finally { button.disabled = false; }
            });
            byId('retryEmail')?.addEventListener('click', async event => {
                event.target.disabled = true;
                try { await request(`/api/admin/bookings/${id}/email`, {method:'POST',body:{}}); await showBooking(id,true); }
                catch (error) { byId('bookingError').textContent = error.message; event.target.disabled = false; }
            });
        } catch (error) { message(error); }
    }

    byId('bookingRows').addEventListener('click', event => {
        const button = event.target.closest('[data-booking-id]');
        if (button) showBooking(Number(button.dataset.bookingId));
    });
    byId('closeBooking').addEventListener('click', () => byId('bookingDialog').close());
    byId('bookingSearchForm').addEventListener('submit', event => {event.preventDefault();clearTimeout(searchTimer);page=1;loadBookings();});
    byId('bookingSearch').addEventListener('input', () => {clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;loadBookings();},300);});
    byId('statusFilter').addEventListener('change', () => {page=1;loadBookings();});
    byId('previousPage').addEventListener('click', () => {if(page>1){page--;loadBookings();}});
    byId('nextPage').addEventListener('click', () => {if(page<pageCount){page++;loadBookings();}});
    byId('peoplePrevious').addEventListener('click', () => {if(peoplePage>1){peoplePage--;loadPeople();}});
    byId('peopleNext').addEventListener('click', () => {if(peoplePage<peoplePages){peoplePage++;loadPeople();}});
    byId('adminLogout').addEventListener('click', window.SITEseeingAuth.logout);
    byId('sidebarToggle').addEventListener('click', () => {
        const mobile = window.matchMedia('(max-width: 900px)').matches;
        const open = mobile ? byId('adminSidebar').classList.toggle('is-open') : !document.querySelector('.admin-layout').classList.toggle('nav-collapsed');
        byId('sidebarToggle').setAttribute('aria-expanded',String(open));
    });
    document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
        const selected = button.dataset.panel;
        for (const panel of ['reservations','people','settings']) byId(`${panel}Panel`).hidden = panel!==selected;
        document.querySelectorAll('[data-panel]').forEach(link => link.classList.toggle('active',link===button));
        byId('adminSidebar').classList.remove('is-open');
        byId('sidebarToggle').setAttribute('aria-expanded','false');
        message();
        if (selected==='people') loadPeople();
        if (selected==='reservations') loadBookings();
    }));
    byId('passwordForm').addEventListener('submit', async event => {
        event.preventDefault();
        const form=event.target, button=form.querySelector('button');
        if (button.disabled || !form.reportValidity()) return;
        if (byId('newPassword').value !== byId('repeatPassword').value) {byId('passwordMessage').textContent='New passwords do not match.';return;}
        button.disabled=true;
        try {
            const data=await request('/api/admin/password',{method:'POST',body:{currentPassword:byId('currentPassword').value,newPassword:byId('newPassword').value}});
            window.SITEseeingAuth.applyUser(data.user); form.reset(); byId('defaultPasswordNotice').hidden=true;
            byId('passwordMessage').textContent='Admin password changed. Other admin sessions have been signed out.';
        } catch (error) {byId('passwordMessage').textContent=error.message;}
        finally {button.disabled=false;}
    });
    await loadBookings();
})().catch(error => {document.getElementById('adminLoading').textContent=error.message;});
