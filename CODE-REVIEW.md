# PHP/MySQL conversion

The account/admin version was converted to the course's PHP and SQL stack. Python,
SQLite, Python startup scripts, and Python-only backend tests were removed from this
ZIP. The existing public-site features, photos, account UI, and admin layout remain.

## Changes and reuse

- api.php is a single PHP entry point that works under a XAMPP project subfolder.
- backend/bootstrap.php shares configuration, PDO prepared queries, transactions,
  validation, password hashing, session/CSRF checks, rate limits, and the package catalog.
- backend/accounts.php handles signup email codes, verification/resend, customer and
  admin login, and admin password changes.
- backend/bookings.php handles database records, server-calculated totals, request-key
  duplicate prevention, customer history, and admin search/filter/pagination/editing.
- backend/mailer.php shares durable queued email handling. Default local mode saves
  private .eml files. Real SMTP uses PHPMailer installed with Composer.
- database/siteseeing.sql creates an InnoDB MySQL/MariaDB schema importable in phpMyAdmin.
  Passwords are hashed by PHP; no plaintext password or fake booking seed is in the SQL.
- The shared API client maps /api routes to api.php and retains query parameters, so
  hosting in htdocs/SITEseeing requires no rewrite configuration.
- Browser account/storage duplication remains removed. packages.js is one shared
  catalog for prices and photo counts, and existing stock-photo sequences are retained.
- Admin session versions invalidate older sessions after a password change.
- Private folders use Apache denial rules. process-mail.php is restricted to CLI use
  and supplies an optional scheduled retry/cleanup command.

## Validation

Account UI/API-client checks and existing public-feature checks pass, including XAMPP
subfolder routing, 1,717 category previews, nine tourist-place ratings, 30 packages,
and the 17-slide home carousel. JavaScript syntax, HTML structure, package data, and
image integrity were checked.

PHP/MySQL runtime verification remains pending because neither executable is installed
in this editing environment. Included PHP helper/live smoke tests and SETUP.md describe
how to verify the conversion with XAMPP. Previous Python test results do not apply to
this PHP backend. No real email has been sent or tested.

## Remaining setup

- Start Apache/MySQL, import the SQL, and use the localhost project URL.
- Supply real SMTP credentials and install PHPMailer before enabling SMTP mode.
- Use a scheduled CLI mail job if failed confirmations must retry without site activity.
- Browser-demo/SQLite data is not migrated. A real payment gateway and password-recovery
  workflow remain outside this update. Ratings remain manually maintained.
- Change admin123 before public hosting, use HTTPS/private database credentials, and
  protect private files and backups.
