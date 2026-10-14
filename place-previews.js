/* Shared category links and previews for Tourist Places and Tour Packages. */
(() => {
    const config = window.SITESEEING_PREVIEW_CONFIG || {};
    let popup, anchor, hideTimer, hoverTimer;
    const aliases = {
        'Diamond Hotel': 'Diamond Hotel Philippines',
        'Admiral Hotel Manila': 'Admiral Hotel Manila - MGallery Collection',
        'Cafe Adriatico': 'Café Adriatico',
        'San Agustin Church and Museum': 'San Agustin Church'
    };

    function canonical(name) { return aliases[name] || name; }
    const { escapeHTML, safeURL } = window.SITEseeingUtils;

    window.createPlaceLink = function(name, section = '', destination = null) {
        const data = (config.places || {})[canonical(name)] || {};
        const isService = /activities|transportation|emergency/i.test(section);
        const query = data.query || `${canonical(name)} ${destination?.name || ''} Manila Philippines`;
        const defaultURL = isService
            ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.query || `${canonical(name)} Manila Philippines`)}`;
        const href = safeURL(data.url, defaultURL);
        return `<a class="place-preview-link" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer"
            data-preview-name="${escapeHTML(name)}" data-preview-section="${escapeHTML(section.trim())}"
            data-preview-context="${escapeHTML(destination?.name || '')}" data-preview-service="${isService}"
            aria-haspopup="dialog" aria-expanded="false">${escapeHTML(name)}<span class="preview-link-arrow" aria-hidden="true">↗</span></a>`;
    };

    function getLocalData(link) {
        const name = canonical(link.dataset.previewName);
        const supplied = (config.places || {})[name] || {};
        const ownPhoto = (config.destinationPhotos || {})[name];
        const image = supplied.image || ownPhoto || '';
        return {
            name, image,
            imageCaption: supplied.imageCaption || '',
            imageAlt: supplied.imageAlt || name,
            url: safeURL(supplied.url, link.href),
            photoCredit: supplied.photoCredit,
            photoSource: safeURL(supplied.photoSource),
            service: link.dataset.previewService === 'true'
        };
    }

    function getPopup() {
        if (popup) return popup;
        popup = document.createElement('aside');
        popup.id = 'placeHoverPreview';
        popup.className = 'place-hover-preview';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', 'Place preview');
        popup.hidden = true;
        document.body.appendChild(popup); // Outside scrollable modals so it is never clipped.
        popup.addEventListener('pointerenter', () => clearTimeout(hideTimer));
        popup.addEventListener('pointerleave', scheduleHide);
        popup.addEventListener('focusout', event => {
            if (!popup.contains(event.relatedTarget) && event.relatedTarget !== anchor) scheduleHide();
        });
        return popup;
    }

    function renderPreview(data) {
        const panel = getPopup();
        const image = safeURL(data.image);
        panel.innerHTML = `<button class="preview-close" type="button" aria-label="Close preview">×</button>
            <div class="preview-photo-wrap"${data.service && !image ? ' hidden' : ''}>
                <div class="preview-photo-missing"${image ? ' hidden' : ''}>Photo unavailable</div>
                ${image ? `<img class="preview-photo" src="${escapeHTML(image)}" alt="${escapeHTML(data.imageAlt)}">` : ''}
            </div>
            <div class="preview-body">
                <p class="preview-category">${escapeHTML(anchor?.dataset.previewSection || 'Destination')}</p>
                <h3>${escapeHTML(data.name)}</h3>
                ${data.imageCaption ? `<p class="preview-photo-caption">${escapeHTML(data.imageCaption)}</p>` : ''}
                ${data.photoCredit ? `<p class="preview-credits">${data.photoSource ? `<a href="${escapeHTML(data.photoSource)}" target="_blank" rel="noopener noreferrer">${escapeHTML(data.photoCredit)}</a>` : escapeHTML(data.photoCredit)}</p>` : ''}
                <a class="preview-open" href="${escapeHTML(safeURL(data.url, anchor?.href))}" target="_blank" rel="noopener noreferrer">${data.service ? 'More information' : 'View place, ratings, and review'} <span aria-hidden="true">↗</span></a>
            </div>`;
        panel.querySelector('.preview-close').addEventListener('click', () => hidePreview(true));
        const photo = panel.querySelector('.preview-photo');
        const missingPhoto = panel.querySelector('.preview-photo-missing');
        if (photo) photo.addEventListener('error', () => {
            photo.hidden = true;
            missingPhoto.hidden = false;
        }, { once: true });
        panel.hidden = false;
        positionPreview();
    }

    function positionPreview() {
        if (!anchor || !popup || popup.hidden) return;
        const rect = anchor.getBoundingClientRect();
        const margin = 12;
        const width = popup.offsetWidth, height = popup.offsetHeight;
        const right = rect.right + margin;
        let left = right + width <= innerWidth - margin ? right : rect.left - width - margin;
        if (left < margin) left = rect.left;
        left = Math.max(margin, Math.min(left, innerWidth - width - margin));
        let top = rect.top;
        if (matchMedia('(max-width: 600px)').matches) top = rect.bottom + 8;
        top = Math.max(margin, Math.min(top, innerHeight - height - margin));
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    }

    function showPreview(link) {
        if (anchor === link && popup && !popup.hidden) { positionPreview(); return; }
        clearTimeout(hideTimer); clearTimeout(hoverTimer);
        if (anchor && anchor !== link) {
            anchor.setAttribute('aria-expanded', 'false');
            anchor.removeAttribute('aria-controls');
        }
        anchor = link;
        anchor.setAttribute('aria-expanded', 'true');
        anchor.setAttribute('aria-controls', 'placeHoverPreview');
        renderPreview(getLocalData(link));
    }

    function hidePreview(restoreFocus = false) {
        clearTimeout(hideTimer); clearTimeout(hoverTimer);
        if (popup) popup.hidden = true;
        const previous = anchor;
        anchor = null;
        if (previous) {
            previous.setAttribute('aria-expanded', 'false');
            previous.removeAttribute('aria-controls');
            if (restoreFocus) {
                previous.focus({ preventScroll: true });
                // focusin can reopen the preview; dismiss after focus restoration.
                if (popup) popup.hidden = true;
                previous.setAttribute('aria-expanded', 'false');
                previous.removeAttribute('aria-controls');
                anchor = null;
            }
        }
    }
    function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hidePreview, 220); }

    document.addEventListener('pointerover', event => {
        if (event.pointerType === 'touch') return;
        const link = event.target.closest('.place-preview-link');
        if (!link || link.contains(event.relatedTarget)) return;
        clearTimeout(hideTimer); clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => showPreview(link), 140);
    });
    document.addEventListener('pointerout', event => {
        const link = event.target.closest('.place-preview-link');
        if (!link || link.contains(event.relatedTarget)) return;
        clearTimeout(hoverTimer);
        if (popup?.contains(event.relatedTarget)) return;
        scheduleHide();
    });
    document.addEventListener('focusin', event => {
        const link = event.target.closest('.place-preview-link');
        if (link) showPreview(link);
        else if (!popup?.contains(event.target)) hidePreview();
    });
    document.addEventListener('click', event => {
        const link = event.target.closest('.place-preview-link');
        if (link && matchMedia('(hover: none)').matches && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            showPreview(link); // Touch users open the destination with the card's explicit link.
        } else if (!link && !popup?.contains(event.target)) hidePreview();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && popup && !popup.hidden) { event.preventDefault(); hidePreview(true); }
    });
    document.addEventListener('scroll', event => {
        if (popup && !popup.contains(event.target)) hidePreview();
    }, true);
    window.addEventListener('resize', positionPreview);
    // The shared modal close handler dismisses the preview and clears its state.
    window.hidePlacePreview = hidePreview;
})();
