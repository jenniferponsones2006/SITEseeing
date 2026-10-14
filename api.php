<?php
// One entry point: api.php?route=/api/session (works in any XAMPP subfolder).
declare(strict_types=1);
define('SITESEEING', true);
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
try {
    require __DIR__ . '/backend/bootstrap.php';
    require __DIR__ . '/backend/mailer.php';
    require __DIR__ . '/backend/accounts.php';
    require __DIR__ . '/backend/bookings.php';
    start_app_session();
    $user = current_user(); $method = $_SERVER['REQUEST_METHOD']; $route = $_GET['route'] ?? '';
    require_value(is_string($route),'Invalid route.');
    $data = in_array($method,['POST','PATCH'],true) ? read_request($user) : [];
    $result = null; $status = 200;
    if ($method === 'GET' && $route === '/api/session') {
        // Connect here too, so missing XAMPP/SQL setup is reported before a login attempt.
        database();
        $result = ['user'=>$user ? public_user($user) : null,'csrf'=>$user ? $_SESSION['csrf'] : null,'emailMode'=>config()['email_mode']];
    } elseif ($method === 'POST' && $route === '/api/auth/signup') { $result = signup($data); $status = 202;
    } elseif ($method === 'POST' && $route === '/api/auth/verify') { $result = verify_signup($data); $status = 201;
    } elseif ($method === 'POST' && $route === '/api/auth/resend') { $result = resend_code($data); $status = 202;
    } elseif ($method === 'POST' && $route === '/api/auth/login') { $result = login($data);
    } elseif ($method === 'POST' && $route === '/api/auth/logout') {
        authenticated($user); $_SESSION = []; session_destroy();
        $params = session_get_cookie_params();
        setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>$params['path'],'secure'=>$params['secure'],'httponly'=>true,'samesite'=>'Lax']);
        $result = ['user'=>null,'csrf'=>null];
    } elseif ($method === 'GET' && $route === '/api/bookings') {
        authenticated($user,'customer');
        $rows = execute_query(database(),BOOKING_SELECT . ' WHERE b.user_id=? ORDER BY b.id DESC LIMIT 100',[$user['id']])->fetchAll();
        $result = ['bookings'=>array_map('booking_data',$rows)];
    } elseif ($method === 'POST' && $route === '/api/bookings') { $result = save_booking($data,authenticated($user,'customer')); $status = 201;
    } elseif (str_starts_with($route,'/api/admin/')) {
        authenticated($user,'admin');
        if ($method === 'GET' && $route === '/api/admin/bookings') { $result = list_bookings($_GET);
        } elseif ($method === 'GET' && $route === '/api/admin/users') { $result = list_users($_GET);
        } elseif ($method === 'POST' && $route === '/api/admin/password') { $result = change_admin_password($data,$user);
        } elseif (preg_match('#^/api/admin/bookings/([0-9]+)(/email)?$#',$route,$match)) {
            $id = (int)$match[1]; $isEmail = isset($match[2]) && $match[2] !== '';
            if ($method === 'GET' && !$isEmail) { $result = ['booking'=>get_booking($id)];
            } elseif ($method === 'PATCH' && !$isEmail) { $result = update_booking($data,$id);
            } elseif ($method === 'POST' && $isEmail) {
                rate_limit('retry-email',3,60,(string)$id); $db = database();
                $row = execute_query($db,"SELECT state FROM mail_queue WHERE kind='booking' AND related_id=?",[(string)$id])->fetch();
                require_value((bool)$row,'Booking not found.',404);
                require_value(in_array($row['state'],['queued','failed'],true),'This confirmation has already been processed.',409);
                execute_query($db,"UPDATE mail_queue SET next_attempt=?,state='queued' WHERE kind='booking' AND related_id=?",[time(),(string)$id]);
                deliver_pending(1,'booking',(string)$id); $result = ['booking'=>get_booking($id)];
            }
        }
    }
    require_value($result !== null,'API endpoint not found.',404);
    http_response_code($status);
    echo json_encode($result,JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (ApiError $error) {
    http_response_code($error->status); echo json_encode(['error'=>$error->getMessage()]);
} catch (Throwable $error) {
    error_log('SITEseeing request failed: ' . get_class($error));
    http_response_code(500); echo json_encode(['error'=>'The server could not complete this request. Check the Apache error log or try again.']);
}
