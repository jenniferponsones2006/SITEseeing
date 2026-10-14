/* Page behavior. Editable destinations/packages are in site-data.js. */
const { escapeHTML, localDate, isTourDate, formatPrice, safeURL } = window.SITEseeingUtils;
const placesById = new Map(touristSpots.map(spot => [spot.id, spot]));
const placesByName = new Map(touristSpots.map(spot => [spot.name.toLowerCase(), spot]));
const packagesById = new Map(tourPackages.map(pkg => [pkg.id, pkg]));
const destinationCache = new Map();
const placeSearchText = new Map(touristSpots.map(spot => [spot.id, [spot.name, spot.location].map(text => text.toLowerCase())]));
const detailSections = [
    ['attractions', 'Attractions'], ['activities', 'Activities'], ['hotels', 'Hotels'],
    ['restaurants', 'Restaurants'], ['malls', 'Malls / Shopping'],
    ['nearbyAttractions', 'Nearby Attractions'], ['transportation', 'Transportation'], ['emergency', 'Emergency']
];
let pendingPackage = null;
let stopPackageSlides = () => {};
let heroTimer = null;

const paymentMethods = [
    ['GCash', 'GCash'], ['Maya', 'Maya'], ['Credit / Debit Card', 'Credit / Debit Card'], ['Cash', 'Cash / Pay at Venue']
];

function createInfoGrid(rows, destination = null) {
    return `<div class="info-grid">${rows.map(([label, value, section]) => `<div class="info-box">
        <strong>${escapeHTML(label)}</strong>${section ? createPlaceLink(value, section, destination) : escapeHTML(value)}
    </div>`).join('')}</div>`;
}

function createDestinationSections(destination, isPackage = false) {
    return detailSections.map(([field, label]) => createDetailSection(
        field === 'emergency' && isPackage ? 'Emergency Information' : label,
        destination[field], destination
    )).join('');
}

function createReviewRows(rows) {
    return rows.map(([label, value]) => `<p><strong>${escapeHTML(label)}</strong><span>${escapeHTML(value)}</span></p>`).join('');
}

function getCurrentUser() {
    return window.SITEseeingAuth.getUser();
}

function useFallbackImage(image) {
    image.onerror = null;
    const fallback = image.dataset.fallback;
    if (fallback) image.src = fallback;
}

/* =====================================================
   VARIABLES
===================================================== */

let currentHero = 0;

let selectedPackage = null;

let pendingReservation = null;

let currentPackageFilter = "all";

/* =====================================================
   HERO CAROUSEL
===================================================== */

// Home photos supplied by the team. Edit this list to update the carousel.
const heroImages = [
    "https://i.pinimg.com/1200x/ec/3a/66/ec3a66636db82d981827832193d0f38d.jpg",
    "https://i.pinimg.com/736x/1e/bf/cd/1ebfcdb2f977ba528084f624bddeb8b7.jpg",
    "https://i.pinimg.com/1200x/13/f5/04/13f5043296d0a015895bb3addd03900f.jpg",
    "https://i.pinimg.com/1200x/4d/e0/43/4de043ffebfe3f507c57b787c52c24cd.jpg",
    "https://vip-philippines.com/wp-content/uploads/2022/04/rizal-park-02.jpg",
    "https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/09/75/f5/db.jpg",
    "https://i.pinimg.com/originals/7e/91/03/7e91037e17607f110ef152c86d41eeec.jpg",
    "https://tse2.mm.bing.net/th/id/OIP.V-HKs59CpwnDA2UHrdA_fAHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    "https://media.istockphoto.com/photos/baywalk-in-the-late-afternoon-in-manila-the-philippines-picture-id1266380219?k=20&m=1266380219&s=612x612&w=0&h=AinmT8pKR6qnQtk8R2HNMWq7y6LfAjTHF3VbHn8QNe0=",
    "https://www.holidify.com/images/cmsuploads/compressed/800px-View_from_the_pathway_at_Paco_Park_20190704021800.jpg",
    "https://i.pinimg.com/736x/72/38/ba/7238baa80efcad26177e834f3bf62fad.jpg",
    "https://i.pinimg.com/1200x/90/5c/ab/905cabd44b2b3eba3faf0c314bd85bf1.jpg",
    "https://i.pinimg.com/1200x/06/20/42/0620420df4568daa6b1aea49eb840738.jpg",
    "https://i.pinimg.com/1200x/65/75/46/6575466db415893c0369ebe9c131baea.jpg",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZNbWRhP3a6rI5yq__BO2-wcyc90CuaPGBjDySDgSYBgoJO1A5XDLqFTk&s=10",
    "https://static.wixstatic.com/media/134f78_265c80bb6ca64561a644e5356cb7cc2c~mv2.jpg/v1/fill/w_980%2Ch_551%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/134f78_265c80bb6ca64561a644e5356cb7cc2c~mv2.jpg?utm_source=chatgpt.com",
    "https://i.pinimg.com/1200x/bd/c6/4a/bdc64ab2cb4b6fcebda94f03da88a490.jpg"
];

function setupHero() {
    const dots = document.getElementById('heroDots');
    dots.innerHTML = '';
    heroImages.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'hero-dot';
        dot.setAttribute('aria-label', `Show hero photo ${index + 1}`);
        dot.onclick = () => selectHero(index);
        dots.appendChild(dot);
    });
    document.querySelector('.hero-prev').onclick = () => selectHero(currentHero - 1);
    document.querySelector('.hero-next').onclick = () => selectHero(currentHero + 1);
    changeHero();
    startHeroTimer();
}

function selectHero(index) {
    currentHero = (index + heroImages.length) % heroImages.length;
    changeHero();
    startHeroTimer(); // Give a manually selected photo its full display time.
}

function changeHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.45)), url("${heroImages[currentHero]}")`;
    document.querySelectorAll('.hero-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentHero);
        dot.setAttribute('aria-pressed', String(index === currentHero));
    });
}

function startHeroTimer() {
    clearInterval(heroTimer);
    if (document.hidden) return;
    heroTimer = setInterval(() => {
        currentHero = (currentHero + 1) % heroImages.length;
        changeHero();
    }, 4500);
}

document.addEventListener('visibilitychange', () => {
    clearInterval(heroTimer);
    stopPackageSlides();
    if (!document.hidden) startHeroTimer();
});

/* =====================================================
   PLACES
===================================================== */

// Ratings are rendered only by Tourist Places cards.
function renderPlaceRating(spot) {
    const entry = window.SITESEEING_PLACE_RATINGS?.[spot.id];
    if (!entry || typeof entry.rating !== "number" ||
        !Number.isFinite(entry.rating) || entry.rating < 0 || entry.rating > 5) return "";
    const score = entry.rating.toFixed(1);
    const stars = Array.from({ length: 5 }, (_, index) => {
        const fill = Math.round(Math.max(0, Math.min(1, entry.rating - index)) * 100);
        return `<span class="place-rating-star">★<span style="width:${fill}%">★</span></span>`;
    }).join("");
    const count = Number.isInteger(entry.reviewCount) && entry.reviewCount >= 0
        ? `, ${entry.reviewCount.toLocaleString("en-US")} reviews` : "";
    const description = `${spot.name}: ${score} out of 5${count}. ${entry.source || "Review score"}. Manually maintained snapshot, checked ${entry.checkedOn || "date unavailable"}. ${entry.note || ""}`;
    // Config links must be web URLs. Invalid links fall back to the existing map.
    const href = safeURL(entry.sourceUrl, spot.map);
    return `<a class="place-rating" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer"
        aria-label="${escapeHTML(description)} Open rating source." title="${escapeHTML(description)}">
        <span class="place-rating-score" aria-hidden="true"><span class="place-rating-stars">${stars}</span><span>${score}</span></span>
        <span class="place-rating-source" aria-hidden="true">${escapeHTML(entry.source || "Review score")}</span>
    </a>`;
}

function renderPlaces() {
    const grid = document.getElementById('placesGrid');
    const search = document.getElementById('placeSearch').value.trim().toLowerCase();
    const type = document.getElementById('typeFilter').value;
    const price = document.getElementById('priceFilter').value;
    const filtered = touristSpots.filter(spot =>
        placeSearchText.get(spot.id).some(text => text.includes(search)) &&
        (type === 'all' || spot.categories.includes(type)) &&
        (price === 'all' || spot.priceType === price)
    );
    grid.innerHTML = filtered.length ? filtered.map(spot => `
        <article class="place-card">
            <div class="place-image"><img src="${escapeHTML(spot.image)}" alt="${escapeHTML(spot.name)}" loading="lazy" decoding="async"></div>
            <div class="place-info">
                <div class="place-title-row"><h3>${escapeHTML(spot.name)}</h3>${renderPlaceRating(spot)}</div>
                <p class="detail-location">${escapeHTML(spot.location)}</p>
                <a href="${escapeHTML(spot.map)}" target="_blank" rel="noopener noreferrer" class="map-btn">View Location on ${spot.map.includes('bing.com') ? 'Bing' : 'Google'} Maps</a>
                <div class="place-meta"><span>${escapeHTML(spot.categories[0])}</span><span>${spot.priceType === 'free' ? 'Free' : 'Paid'}</span></div>
                <button type="button" class="view-btn" onclick="openPlaceDetails(${spot.id})">View Details</button>
            </div>
        </article>`).join('') : '<div class="empty-message">No places found.</div>';
}

/* =====================================================
   PLACE DETAILS
===================================================== */

function openPlaceDetails(id) {
    const spot = placesById.get(id);
    if (!spot) return;
    document.getElementById('placeDetailsContent').innerHTML = `
        <img class="place-detail-image" src="${escapeHTML(spot.image)}" alt="${escapeHTML(spot.name)}" decoding="async">
        <h2 class="place-detail-title">${escapeHTML(spot.name)}</h2>
        <p class="detail-location">${escapeHTML(spot.location)}</p>
        <div class="detail-section"><h3>About</h3><p>${escapeHTML(spot.description)}</p></div>
        <div class="detail-section"><h3>Information</h3>
            ${createInfoGrid([['Categories', spot.categories.join(', ')], ['Hours', spot.hours], ['Admission', spot.admission]])}
        </div>
        ${createDestinationSections(spot)}`;
    openModal('placeModal');
}

function createDetailSection(title, items, destination = null) {
    if (!items?.length) return '';
    return `<div class="detail-section">
        <h3>${escapeHTML(title)}</h3>
        <div class="info-box"><ul class="info-list">${items.map(item => `<li>${createPlaceLink(item, title, destination)}</li>`).join('')}</ul></div>
    </div>`;
}

/* =====================================================
   PACKAGES
===================================================== */

function renderPackages() {
    stopPackageSlides(); // Cancel timers before removing the previous cards.
    const grid = document.getElementById('packagesGrid');
    const filtered = currentPackageFilter === 'all' ? tourPackages : tourPackages.filter(pkg => pkg.name === currentPackageFilter);
    grid.innerHTML = filtered.map(pkg => `
        <article class="package-card" role="button" tabindex="0" aria-label="View ${escapeHTML(pkg.destination)} ${escapeHTML(pkg.name)} package" onclick="openPackageDetails('${pkg.id}')">
            <div class="package-card-media">
                ${pkg.images.map((src, index) => `<img class="${index === 0 ? 'active' : ''}"
                    ${index === 0 ? 'src' : 'data-src'}="${escapeHTML(src)}" loading="lazy" decoding="async"
                    data-fallback="${escapeHTML(pkg.fallbackImage)}" onerror="useFallbackImage(this)"
                    alt="${escapeHTML(pkg.destination)} - ${escapeHTML(pkg.name)} package photo ${index + 1}">`).join('')}
                ${pkg.images.length > 1 ? `<div class="package-card-dots">${pkg.images.map((_, index) => `<span class="${index === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
            </div>
            <div class="package-card-body"><h3>${escapeHTML(pkg.name)}</h3>
                <p class="package-destination">${escapeHTML(pkg.destination)}</p>
                <p class="package-price-small">${formatPrice(pkg.price)}</p>
            </div>
        </article>`).join('');
    stopPackageSlides = setupPackageHover(grid);
}

/* =====================================================
   PACKAGE CARD HOVER SLIDESHOW
   Hover a package card to rotate through its photos.
   Leaving the card resets it to the first photo.
===================================================== */

const PACKAGE_SLIDE_MS = 1000;

function setupPackageHover(grid) {
    const cleanup = [];
    grid.querySelectorAll('.package-card').forEach(card => {
        const media = card.querySelector('.package-card-media');
        const slides = media.querySelectorAll('img');
        const dots = media.querySelectorAll('.package-card-dots span');
        if (slides.length < 2) return;
        let current = 0, timer = null;
        function show(index) {
            if (slides[index].dataset.src) {
                slides[index].src = slides[index].dataset.src;
                delete slides[index].dataset.src;
            }
            slides[current].classList.remove('active');
            dots[current]?.classList.remove('active');
            current = index;
            slides[current].classList.add('active');
            dots[current]?.classList.add('active');
        }
        function start() {
            if (timer !== null) return;
            show((current + 1) % slides.length);
            timer = setInterval(() => show((current + 1) % slides.length), PACKAGE_SLIDE_MS);
        }
        function stop() {
            clearInterval(timer);
            timer = null;
            show(0);
        }
        card.addEventListener('mouseenter', start);
        card.addEventListener('mouseleave', stop);
        card.addEventListener('focusin', start);
        card.addEventListener('focusout', stop);
        cleanup.push(stop);
    });
    return () => cleanup.forEach(stop => stop());
}

function filterPackages(type, button) {
    currentPackageFilter = type;
    document.querySelectorAll('.package-filter').forEach(btn => btn.classList.toggle('active', btn === button));
    renderPackages();
}

/* =====================================================
   PACKAGE DETAILS
===================================================== */

function getPackageDestination(name) {
    const direct = placesByName.get(name?.toLowerCase());
    if (direct || name !== 'National Museum Complex') return direct;
    if (destinationCache.has(name)) return destinationCache.get(name);
    const museums = [3, 4, 5].map(id => placesById.get(id));
    const combined = { ...museums[0], name,
        description: 'Explore the National Museum of Fine Arts, Anthropology, and Natural History.' };
    ['categories', ...detailSections.map(([field]) => field)].forEach(field => {
        combined[field] = [...new Set(museums.flatMap(spot => spot[field] || []))];
    });
    const museumNames = new Set(museums.map(spot => spot.name));
    combined.attractions = [...new Set([...museumNames, ...combined.attractions])];
    combined.nearbyAttractions = combined.nearbyAttractions.filter(item => !museumNames.has(item));
    destinationCache.set(name, combined);
    return combined;
}

function openPackageDetails(packageId) {
    const pkg = packagesById.get(packageId);
    if (!pkg) return;
    selectedPackage = pkg;
    const destination = getPackageDestination(pkg.destination);
    document.getElementById('packageDetailsContent').innerHTML = `
        <div class="package-detail-header">
            <img src="${escapeHTML(pkg.image)}" data-fallback="${escapeHTML(pkg.fallbackImage)}" onerror="useFallbackImage(this)"
                alt="${escapeHTML(pkg.destination)} - ${escapeHTML(pkg.name)} package" decoding="async">
            <div class="package-detail-overlay">
                <h2>${escapeHTML(pkg.name)} Package</h2><p>${createPlaceLink(pkg.destination, 'Destination', destination)}</p>
                <div class="package-price">${formatPrice(pkg.price)}</div>
            </div>
        </div>
        <div class="package-info-section"><h3>Package Information</h3>
            ${createInfoGrid([
                ['Package Type', pkg.name], ['Destination', pkg.destination, 'Destination'], ['Hotel', pkg.hotel, 'Hotels'],
                ['Restaurant', pkg.restaurant, 'Restaurants'], ['Tour Guide Fee', pkg.guide], ['Estimated Package Price', formatPrice(pkg.price)]
            ], destination)}
        </div>
        ${destination ? `<div class="package-info-section"><h3>Destination Information</h3><div class="info-box">
            ${createReviewRows([['Location', destination.location], ['Categories', destination.categories.join(', ')],
                ['Description', destination.description], ['Hours', destination.hours], ['Admission', destination.admission]])}
        </div></div>${createDestinationSections(destination, true)}` : ''}
        <button type="button" class="package-reserve-btn" onclick="startReservation()">Reserve This Package</button>`;
    openModal('packageModal');
}

/* =====================================================
   RESERVATION
===================================================== */

async function startReservation() {
    await window.SITEseeingAuth.ready;
    if (!selectedPackage) { showToast('Please select a package first.'); return; }
    if (!getCurrentUser()) {
        pendingPackage = selectedPackage;
        closeModal('packageModal');
        showToast('Please log in or sign up first.');
        openAuthModal();
        return;
    }
    if (getCurrentUser().role !== 'customer') { showToast('Use a customer account to book a tour.'); return; }
    pendingReservation = null;
    openReservationForm();
}

/* =====================================================
   RESERVATION FORM
===================================================== */

function openReservationForm(draft = null) {
    const user = getCurrentUser();
    if (!user || !selectedPackage) return;
    closeModal('packageModal');
    const saved = draft?.packageId === selectedPackage.id ? draft : {};
    const guests = Number.isSafeInteger(saved.guests) && saved.guests > 0 ? saved.guests : 1;
    document.getElementById('reservationContent').innerHTML = `
        <div class="reservation-header"><h2>Make a Reservation</h2><p>Enter your trip details.</p></div>
        <div class="reservation-summary">
            <p><strong>Package:</strong> ${escapeHTML(selectedPackage.name)}</p>
            <p><strong>Destination:</strong> ${escapeHTML(selectedPackage.destination)}</p>
            <p><strong>Price per Guest:</strong> ${formatPrice(selectedPackage.price)}</p>
        </div>
        <form id="reservationForm">
            <div class="form-group"><label for="reservationName">Full Name</label>
                <input type="text" id="reservationName" value="${escapeHTML(saved.customerName ?? user.name ?? '')}" required>
            </div>
            <div class="form-group"><label for="reservationEmail">Email</label>
                <input type="email" id="reservationEmail" value="${escapeHTML(user.email)}" readonly required>
                <small>Confirmation goes to your verified account email.</small>
            </div>
            <div class="form-group"><label for="reservationDate">Tour Date</label>
                <input type="date" id="reservationDate" min="${localDate()}" value="${escapeHTML(saved.date || '')}" required>
            </div>
            <div class="form-group"><label for="reservationGuests">Number of Guests</label>
                <input type="number" id="reservationGuests" min="1" max="1000" step="1" value="${guests}" required oninput="updateReservationTotal()">
            </div>
            <div class="form-group"><label for="paymentMethod">Payment Method</label>
                <select id="paymentMethod" required><option value="">Select payment method</option>
                    ${paymentMethods.map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join('')}
                </select>
            </div>
            <div class="total-box"><span>Total</span><span id="reservationTotal">${formatPrice(selectedPackage.price * guests)}</span></div>
            <button type="submit" class="confirm-btn">Continue to Payment</button>
        </form>`;
    document.getElementById('paymentMethod').value = saved.paymentMethod || '';
    document.getElementById('reservationForm').addEventListener('submit', event => { event.preventDefault(); continueToPayment(); });
    openModal('reservationModal');
}

/* =====================================================
   TOTAL
===================================================== */

function updateReservationTotal() {
    if (!selectedPackage) return;
    const guests = Number(document.getElementById('reservationGuests').value);
    const total = Number.isSafeInteger(guests) && guests > 0 ? selectedPackage.price * guests : 0;
    document.getElementById('reservationTotal').textContent = formatPrice(total);
}

/* =====================================================
   PAYMENT REVIEW
===================================================== */

function continueToPayment() {
    if (!selectedPackage) return;
    const name = document.getElementById('reservationName').value.trim();
    const email = document.getElementById('reservationEmail').value.trim();
    const date = document.getElementById('reservationDate').value;
    const guests = Number(document.getElementById('reservationGuests').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (!name || !email || !date || !paymentMethod) { showToast('Please complete all fields.'); return; }
    if (!Number.isSafeInteger(guests) || guests < 1 || guests > 1000) { showToast('Enter a whole number of guests, from 1 to 1,000.'); return; }
    const total = selectedPackage.price * guests;
    if (!Number.isSafeInteger(total)) { showToast('The number of guests is too large.'); return; }
    if (!isTourDate(date)) {
        showToast('Choose a valid tour date, today or later.'); return;
    }
    if (!paymentMethods.some(([value]) => value === paymentMethod)) { showToast('Choose a payment method.'); return; }
    if (!document.getElementById('reservationForm').reportValidity()) return;
    pendingReservation = {
        packageId: selectedPackage.id, packageName: selectedPackage.name, destination: selectedPackage.destination,
        customerName: name, email, date, guests, paymentMethod,
        packagePrice: selectedPackage.price, total, requestKey: pendingReservation?.requestKey || crypto.randomUUID()
    };
    closeModal('reservationModal');
    showPaymentReview();
}

/* =====================================================
   PAYMENT REVIEW
===================================================== */

function showPaymentReview() {
    const booking = pendingReservation;
    if (!booking?.packageId) return;
    document.getElementById('paymentContent').innerHTML = `
        <div class="reservation-header"><h2>Review Your Reservation</h2><p>Confirm your tour details. No online payment is charged by this website.</p></div>
        <div class="payment-review">
            ${createReviewRows([
                ['Customer', booking.customerName], ['Email', booking.email], ['Package', booking.packageName],
                ['Destination', booking.destination], ['Tour Date', booking.date], ['Guests', booking.guests],
                ['Payment Method', booking.paymentMethod], ['Package Price', formatPrice(booking.packagePrice)]
            ])}
            <div class="payment-total"><span>Total Payment</span><span>${formatPrice(booking.total)}</span></div>
        </div>
        <button type="button" id="saveBookingButton" class="confirm-btn" onclick="confirmPayment()">Confirm Reservation</button>
        <button type="button" class="confirm-btn payment-back-btn" onclick="backToReservation()">Back</button>`;
    openModal('paymentModal');
}

/* =====================================================
   BACK TO RESERVATION
===================================================== */

function backToReservation() {
    closeModal('paymentModal');
    openReservationForm(pendingReservation);
}

/* =====================================================
   CONFIRM PAYMENT
===================================================== */

let bookingInFlight = false;
async function confirmPayment() {
    if (!pendingReservation?.packageId || bookingInFlight) return;
    bookingInFlight = true;
    const button = document.getElementById('saveBookingButton');
    button.disabled = true;
    button.textContent = 'Saving reservation…';
    try {
        const { booking } = await window.SITEseeingAPI.request('/api/bookings', {
            method: 'POST', body: pendingReservation
        });
        closeModal('paymentModal');
        showReservationSuccess(booking);
        pendingReservation = null;
    } catch (error) {
        showToast(error.message);
        if (error.status === 401) {
            window.SITEseeingAuth.applyUser(null);
            pendingPackage = selectedPackage;
            closeModal('paymentModal');
            openAuthModal();
        }
    } finally {
        bookingInFlight = false;
        button.disabled = false;
        button.textContent = 'Confirm Reservation';
    }
}

/* =====================================================
   SUCCESS
===================================================== */

function showReservationSuccess(booking) {
    document.getElementById('successContent').innerHTML = `
        <div class="success-message">
            <div class="success-icon">✅</div><h2>Reservation Confirmed!</h2>
            <p>Your SITEseeing reservation has been successfully recorded.</p>
            <p class="booking-email-note">${escapeHTML(booking.emailStatus === 'sent'
                ? `Confirmation email sent to ${booking.email}.`
                : booking.emailStatus === 'local'
                    ? 'Local testing: the confirmation email was saved in the private/outbox folder.'
                    : 'Your booking is saved. Confirmation email delivery is queued for retry.')}</p>
            <div class="booking-number">Booking Number<br><strong>${escapeHTML(booking.bookingId)}</strong></div>
            <div class="payment-review">
                ${createReviewRows([['Package', booking.packageName], ['Destination', booking.destination],
                    ['Date', booking.date], ['Guests', booking.guests], ['Payment', booking.paymentStatus]])}
                <div class="payment-total"><span>Total</span><span>${formatPrice(booking.total)}</span></div>
            </div>
            <button type="button" class="confirm-btn" onclick="closeModal('successModal')">Done</button>
        </div>`;
    openModal('successModal');
}

/* =====================================================
   AUTH
===================================================== */

function openAuthModal() {
    window.SITEseeingAuth.openAccount();
}

function showAuthTab(tab) {
    window.SITEseeingAuth.showTab(tab);
}

function resumeReservationAfterLogin() {
    if (!pendingPackage) return;
    selectedPackage = pendingPackage;
    pendingPackage = null;
    openReservationForm(pendingReservation);
}

/* =====================================================
   SHARE
===================================================== */

function shareFacebook() {
    openShareLink(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`);
}

function shareMessenger() {
    openShareLink('https://www.messenger.com/');
    copyLink('Link copied. Paste it into Messenger.');
}

function shareTwitter() {
    openShareLink(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`);
}

function openShareLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
}

function shareInstagram() {
    openShareLink('https://www.instagram.com/');
    copyLink('Link copied. Paste it into Instagram.');
}

async function copyLink(message = 'Link copied!') {
    try {
        await navigator.clipboard.writeText(window.location.href);
        showToast(message);
        return true;
    } catch {
        window.prompt('Copy this website link:', window.location.href);
        return false;
    }
}

/* =====================================================
   MODALS
===================================================== */

const openModalOrder = [];
const modalReturnFocus = new Map();
let previousBodyOverflow = "";

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    stopPackageSlides();
    if (!openModalOrder.length) previousBodyOverflow = document.body.style.overflow;
    const previous = openModalOrder.indexOf(id);
    if (previous !== -1) openModalOrder.splice(previous, 1);
    else modalReturnFocus.set(id, document.activeElement);
    openModalOrder.push(id);
    modal.style.zIndex = String(3000 + openModalOrder.length);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    if (id === 'placeModal' || id === 'packageModal') {
        const body = modal.querySelector('.details-modal-body');
        if (body) body.scrollTop = 0;
        modal.querySelector('.details-close-btn')?.focus();
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal || !modal.classList.contains('show')) return;
    modal.classList.remove('show');
    modal.style.zIndex = '';
    const index = openModalOrder.indexOf(id);
    if (index !== -1) openModalOrder.splice(index, 1);
    document.body.style.overflow = openModalOrder.length ? 'hidden' : previousBodyOverflow;
    window.hidePlacePreview?.();
    if (id === 'placeModal' || id === 'packageModal') {
        const trigger = modalReturnFocus.get(id);
        if (trigger?.isConnected) trigger.focus();
    }
    modalReturnFocus.delete(id);
}

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const id = openModalOrder[openModalOrder.length - 1];
    if (id !== "placeModal" && id !== "packageModal") return;
    event.preventDefault();
    closeModal(id);
});

/* Close when clicking outside */

document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target === modal
                ) {

                    closeModal(modal.id);

                }

            }
        );

    });

/* =====================================================
   TOAST
===================================================== */

let toastTimer;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* =====================================================
   MOBILE MENU
===================================================== */

function toggleMobileMenu() {
    const nav = document.querySelector('.nav-links');
    const open = nav.classList.toggle('is-open');
    document.querySelector('.mobile-menu-btn').setAttribute('aria-expanded', String(open));
}

function closeMobileMenu() {
    document.querySelector('.nav-links').classList.remove('is-open');
    document.querySelector('.mobile-menu-btn').setAttribute('aria-expanded', 'false');
}

document.querySelector('.nav-links').addEventListener('click', closeMobileMenu);
matchMedia('(max-width: 700px)').addEventListener?.('change', closeMobileMenu);
document.getElementById('packagesGrid').addEventListener('keydown', event => {
    const card = event.target.closest('.package-card');
    if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); card.click(); }
});

/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        setupHero();

        renderPlaces();

        renderPackages();

    }
);
