/* Manually maintained Tourist Places ratings, keyed by touristSpots.id.
 * Edit rating (0 through 5), reviewCount, and checkedOn after checking sourceUrl.
 * These are Google review scores reported by Wanderlog, not live API results.
 * checkedOn is our lookup date; the source may contain an older cached score.
 * Set rating to null to hide an unverified rating. No API key is required.
 */
window.SITESEEING_PLACE_RATINGS = {
    1: {
        name: "Intramuros", rating: 4.7, reviewCount: 3874,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/478032"
    },
    2: {
        name: "Rizal Park", rating: 4.5, reviewCount: 30563,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/828/rizal-park"
    },
    3: {
        name: "National Museum of Fine Arts", rating: 4.7, reviewCount: 8785,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/7028455/museo-nacional-de-filipinas"
    },
    4: {
        name: "National Museum of Anthropology", rating: 4.6, reviewCount: 1790,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/52240/national-museum-of-anthropology"
    },
    5: {
        name: "National Museum of Natural History", rating: 4.7, reviewCount: 6066,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/47620/national-museum-of-natural-history"
    },
    6: {
        name: "Manila Ocean Park", rating: 4.2, reviewCount: 18053,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/19800/manila-ocean-park"
    },
    7: {
        name: "Manila Baywalk", rating: 4.1, reviewCount: 241,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/tl/place/details/51951/baywalk-sea-view",
        note: "Rating for the Baywalk - Sea View listing in Ermita, Manila."
    },
    8: {
        name: "Binondo Chinatown", rating: 4.1, reviewCount: 588,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/4701983",
        note: "Rating for the Chinatown listing on Ongpin Street."
    },
    9: {
        name: "Paco Park", rating: 4.5, reviewCount: 1478,
        source: "Google via Wanderlog", checkedOn: "2026-10-11",
        sourceUrl: "https://wanderlog.com/place/details/827/paco-park"
    }
};
