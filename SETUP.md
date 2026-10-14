# Run with XAMPP, PHP, and MySQL

1. Install XAMPP with PHP 8.0 or later.
2. In the XAMPP Control Panel, start **Apache** and **MySQL**.
3. Extract this ZIP. It contains a folder named **SITEseeing**.
4. Move it into `C:\xampp\htdocs\SITEseeing`.
5. Open **http://localhost/phpmyadmin**. Select **Import** and choose
   `database/siteseeing.sql` from the project. The SQL creates the `siteseeing` database.
6. Open **http://localhost/SITEseeing/**.
7. Account → Admin: username **admin**, initial password **admin123**.
   Use Settings to change it. The database retains the changed password.

No Python is used. You do not need Node or Composer for local login, bookings, and
local email-code testing. Node is optional for developer checks. Composer is needed
only for real SMTP delivery through PHPMailer.

If your XAMPP folder, Apache port, or database credentials differ, update
`backend/config.php`. `site_url` must match your actual website address, including
its folder and port. You can put private overrides in `backend/config.local.php`
using the format shown in `backend/config.local.example.php`.

Opening index.html directly or using VS Code Live Server does not run PHP.
Use the localhost XAMPP URL above. Keep Apache and MySQL running while using the site.

# What happens when the site runs

- Apache serves the pages and executes api.php.
- PHP handles verified signup, login sessions, bookings, and admin requests.
- MySQL stores users, signup challenges, booking records, email jobs, and rate limits.
- PHP creates the administrator and its hashed password on the first API request.
- Account names appear after successful login or signup verification. Page refreshes
  restore the session. Account shows that customer's own saved reservations.
- Admin opens in the same tab and reads real MySQL booking records. Search, filters,
  pagination, View details, reservation/payment status changes, verified customers,
  and admin password changes use protected PHP endpoints.
- packages.js remains the single catalog for package details, prices, and photo counts.
  PHP parses its JSON without evaluating JavaScript and calculates booking totals.

# Local email-code testing

The default `email_mode` is `local`. No real email is sent.

1. Sign up using the Account tab.
2. Open the newest `private/outbox/*-verification.eml` file on your computer.
   A text editor can show the six-digit code; a mail app can open the complete message.
3. Enter that code on the signup screen. The account is created only after verification.
4. Book a tour. Its confirmation is saved as `private/outbox/*-booking.eml`.

Codes expire after ten minutes. Five incorrect attempts lock that signup challenge.
Resend is available after one minute. Signup verifies email ownership; subsequent
logins use a password. Passwords must be 8–72 bytes (bcrypt's input limit; ASCII
characters use one byte each). The initial admin password is a local-only exception.

# Real email delivery

1. Install Composer from its official installer.
2. In the project folder, run `composer install` to install PHPMailer.
3. Create `backend/config.local.php` using the example file.
4. Set `email_mode` to `smtp`, then fill the sender address, SMTP host, port, security,
   username, and provider-issued SMTP password/app password.
5. Use `starttls` for a provider's TLS-upgrade port (usually 587), or `ssl` for its
   TLS-from-connection port (usually 465). Follow your provider's actual settings.
6. Sign up with an inbox you control and test the email code and booking confirmation.

SMTP credentials were not provided. Live inbox delivery is not configured or tested.
Do not put mail credentials in JavaScript or share them in chat. TLS verification is
left enabled. The sender must be authorized by the provider. PHP's mail() is not used;
Windows XAMPP does not need a separate sendmail setup for the PHPMailer SMTP mode.

A booking survives delivery failure. Use the admin Retry confirmation email action or the scheduled CLI job to retry
queued or failed messages. Each signup/booking request attempts its own email once. For unattended retry,
run `C:\xampp\php\php.exe C:\xampp\htdocs\SITEseeing\process-mail.php` from Windows
Task Scheduler, or run `php process-mail.php` through cron on hosting. PHP does not
keep a background process running after a normal Apache request ends.

# Database and privacy

- View the tables in phpMyAdmin. No fake customer or reservation rows are seeded.
- The old SQLite database and browser-demo records are not automatically imported.
- Back up/export the MySQL database privately in phpMyAdmin. Updating source files
  does not overwrite saved users or bookings.
- The private directory holds session and local email files. Its .htaccess blocks
  web access, as do the backend, database, and tests folders. Apache must allow
  these rules. Verify a private-folder URL is denied before exposing the site.
- New non-cash bookings show Awaiting Payment; cash shows Pay at Venue. This website
  does not process or charge payments. Admins record confirmation after checking payment.
- Session cookies are HttpOnly and SameSite. Signup codes are signed server-side.
  Modifying API requests check the request origin and the current session's CSRF token.
- Admin password changes increment the session version, signing out older sessions.

# Developer checks and verification status

Available checks completed here:

- `node tests/check-account.cjs`: signup gate, name display, resend/errors, customer
  login/logout, same-tab admin navigation, CSRF refresh, and XAMPP-subfolder routing.
- `node tests/check-features.cjs`: existing ratings, previews, carousels, filters,
  detail closing, reservation forms/retry, mobile navigation, and sharing.
- JavaScript syntax, HTML structure, shared package data, and unchanged image assets.

PHP and MySQL executables were not available in the editing environment. PHP runtime,
SQL import, and live backend flows must be verified in XAMPP; they are not claimed as
already passing. The previous Python backend tests do not validate this PHP conversion.

With XAMPP PHP installed, run:

- `C:\xampp\php\php.exe -l api.php` (and -l on each backend/*.php file).
- `C:\xampp\php\php.exe tests\check-helpers.php`.
- `C:\xampp\php\php.exe tests\check-live.php` with Apache running and SQL imported.

check-live.php creates a test account/reservation and changes that reservation to
Cancelled. Run it against a disposable test database. It sends no real mail and does
not change the admin password. If the admin password was changed, set the
SITESEEING_TEST_ADMIN_PASSWORD environment variable before running the test.

# Hosting later

Use PHP/MySQL hosting with HTTPS and a private database account. XAMPP is for local
coursework. Configure the correct site_url, set production=true, use SMTP, change the
default administrator, and keep private files outside the public web root when
possible. A production database and mail retry job need private backups and monitoring.
Do not publish database exports, session files, config.local.php, or local test emails.
