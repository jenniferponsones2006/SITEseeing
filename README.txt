SITEseeing: tourist places, packages, ratings, and category photo previews

1. Use XAMPP with PHP 8 and MySQL. Start Apache and MySQL, place this folder at
   C:\xampp\htdocs\SITEseeing, import database/siteseeing.sql in phpMyAdmin, and open
   http://localhost/SITEseeing/. Read SETUP.md for the full setup and email instructions.

2. Hover or focus category links in Tourist Places or Tour Packages for the named place photo.
   On a phone, tap the category item to open the preview.
   The button "View place, ratings, and review" opens Google Maps. No API key is needed.

3. 136 individual place photos are mapped in preview-config.js.
   Hyperlink preview images use images/places.
   Package cards and carousels use your original stock photos in images/packages,
   including the photos with people. Destination images use the original selections; the home carousel uses the team's new photo list.
   Source links are in images/places/PHOTO-SOURCES.csv and PHOTO-SOURCES.json.
   The separate SITEseeing-place-photos.zip contains the original downloaded photographs.

4. Generic activities, transportation advice, and emergency advice open an information search.
   Unmatched venues do not borrow photos from another place.
   NPDC Museum and Archive Gallery uses the supplied photo of its entrance.

5. To change a photo, update its named entry in preview-config.js.
   Escape, the close button, scrolling, or clicking outside closes the preview.
   The original images/packages assets are preserved.

6. Tourist Places cards have five stars and a decimal score beside the title.
   Scores are Google ratings reported by Wanderlog, looked up on 2026-10-11.
   These are manual snapshots, not live Google Maps scores; cached source data may be older.
   Click the stars to open the source; hover for the lookup date and review count.
   Screen readers also announce the score, source, lookup date, and review count.
   Baywalk uses the Baywalk - Sea View listing in Ermita; Chinatown uses the Ongpin Street listing.
   Packages, category previews, detail windows, and all photos retain their existing behavior.

7. Developers: update place-ratings.js only to maintain the ratings.
   Each key matches touristSpots.id; the name is included to help identify the place.
   Check sourceUrl, then edit rating, reviewCount, checkedOn (YYYY-MM-DD), and the source if changed.
   Example: rating: 4.6, reviewCount: 4000, checkedOn: "2026-11-01".
   Scores must be numbers from 0 through 5. Set rating: null to hide an unverified score.
   Save and refresh the page, then upload the changed file when updating your hosted site.
   No API key or network request is used to display ratings. Automatic updates are not enabled;
   they would require a supported data feed and a scheduled server-side refresh.

8. Place and package details: press Escape or click the X in the top-right corner to close.
   The close button stays visible while you scroll through the details.

9. Code organization:
   site-data.js: tourist place data and package image initialization.
   script.js: filters, detail windows, reservation forms, and carousels.
   packages.js: shared browser/server package catalog, prices, and photo counts.
   account.js and api-client.js: verified signup, login, session state, and shared API access.
   api.php and backend/*.php: MySQL persistence, secure sessions, email queue, and admin APIs.
   database/siteseeing.sql: importable MySQL/MariaDB schema.
   admin.html, admin.css, and admin.js: booking records, filters, status edits, and settings.
   utils.js: shared escaping, URL checks, Manila calendar dates, and currency formatting.
   preview-config.js and place-previews.js: named category photo mappings and preview behavior.
   place-ratings.js: manually editable rating snapshots.
   index.html and style.css: markup and responsive styling.
   Keep the script order in index.html when updating the files.

10. Developer checks: with Node.js installed, run node tests/check-features.cjs.
    Also run node tests/check-account.cjs and the PHP checks listed in SETUP.md.
    No npm install or build step is needed. See CODE-REVIEW.md for changes and limitations.

11. Home carousel: 17 photos from the supplied PDF are in heroImages in script.js.
    Previous/next arrows and dots select a photo and restart the 4.5-second timer.
    The timer pauses while the browser tab is hidden. These are external image links.
    Typography follows the supplied style.css: Inter body text, Plus Jakarta Sans headings,
    Courier New for hero subtitles/section labels, and Times New Roman for About text.
    The source's "Italic" font-family is implemented as italic text. The large desktop
    hero title scales down on phones so the text and navigation stay usable.

12. Sign up now requires a six-digit email code. Login and signup display the account name
    in the navigation. Account shows the user's saved reservations. Booking emails use
    SMTP when configured; local mode explicitly saves test emails in private/outbox.
    Admin username is admin; its initial password is admin123 and can be changed in Settings.
    All new accounts and bookings use the server database rather than browser storage.
