<?php
// Optional Task Scheduler/cron command for unattended retries: php process-mail.php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
define('SITESEEING',true);
require __DIR__ . '/backend/bootstrap.php';
require __DIR__ . '/backend/mailer.php';
try {
    deliver_pending(50);
    execute_query(database(),'DELETE FROM rate_limits WHERE window_start<?',[time()-86400]);
    execute_query(database(),'DELETE FROM signup_challenges WHERE expires_at<?',[time()-86400]);
    execute_query(database(),"DELETE FROM mail_queue WHERE kind='verification' AND created_at<?",[time()-86400]);
    echo "Email queue processed.\n";
} catch (Throwable $error) { fwrite(STDERR,"Email queue failed: " . $error->getMessage() . "\n"); exit(1); }
