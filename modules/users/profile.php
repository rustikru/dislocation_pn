<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
ob_start();

$answer = function (array $data, int $code = 200): void {
    $text = trim((string) ob_get_clean());
    if ($text !== '') {
        error_log('[profile output] ' . $text);
    }

    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
};

if (empty($_SESSION['is_auth'])) {
    $answer(['ok' => false, 'message' => 'Сессия не найдена'], 401);
}

try {
    require_once __DIR__ . '/../../connection.php';
    if (empty($conn1)) {
        header_remove('Location');
        throw new RuntimeException('Не удалось подключиться к базе данных');
    }

    $login = (string) ($_SESSION['login'] ?? '');
    if ($login === '') {
        throw new RuntimeException('В сессии нет логина пользователя');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $fullName = trim((string) ($_POST['full_name'] ?? ''));
        $phoneNum = trim((string) ($_POST['phone_num'] ?? ''));
        $emailAddress = trim((string) ($_POST['email_address'] ?? ''));
        $defaultStation = trim((string) ($_POST['default_station'] ?? ''));
        $pwdChanged = strtoupper((string) ($_POST['pwd_changed'] ?? 'N')) === 'Y';
        $newPwd1 = $pwdChanged ? (string) ($_POST['new_pwd1'] ?? '') : '';
        $newPwd2 = $pwdChanged ? (string) ($_POST['new_pwd2'] ?? '') : '';

        if ($fullName === '') {
            throw new InvalidArgumentException('Укажите ФИО');
        }

        if ($newPwd1 !== '' || $newPwd2 !== '') {
            if ($newPwd1 !== $newPwd2) {
                throw new InvalidArgumentException('Пароли не совпадают');
            }
        }

        $sql = 'begin xx_dislocation.user_profile_save(:login, :full_name, :phone_num, :email_address, :default_station); end;';
        $stmt = oci_parse($conn1, $sql);
        if (!$stmt) {
            $err = oci_error($conn1);
            throw new RuntimeException($err['message'] ?? 'Не удалось подготовить сохранение');
        }

        oci_bind_by_name($stmt, ':login', $login);
        oci_bind_by_name($stmt, ':full_name', $fullName);
        oci_bind_by_name($stmt, ':phone_num', $phoneNum);
        oci_bind_by_name($stmt, ':email_address', $emailAddress);
        oci_bind_by_name($stmt, ':default_station', $defaultStation);

        if (!oci_execute($stmt)) {
            $err = oci_error($stmt);
            throw new RuntimeException($err['message'] ?? 'Не удалось сохранить профиль');
        }

        oci_free_statement($stmt);

        if ($newPwd1 !== '') {
            $pwdSql = 'begin :result := xx_dislocation.change_pwd(:login, :new_pwd); end;';
            $pwdStmt = oci_parse($conn1, $pwdSql);
            if (!$pwdStmt) {
                $err = oci_error($conn1);
                throw new RuntimeException($err['message'] ?? 'Не удалось подготовить смену пароля');
            }

            $pwdHash = md5($newPwd1);
            $pwdResult = '';
            oci_bind_by_name($pwdStmt, ':result', $pwdResult, 100);
            oci_bind_by_name($pwdStmt, ':login', $login);
            oci_bind_by_name($pwdStmt, ':new_pwd', $pwdHash);

            if (!oci_execute($pwdStmt)) {
                $err = oci_error($pwdStmt);
                throw new RuntimeException($err['message'] ?? 'Не удалось изменить пароль');
            }

            oci_free_statement($pwdStmt);

            if ($pwdResult !== 'done') {
                throw new RuntimeException('Не удалось изменить пароль');
            }

            $_SESSION['flag_change_pwd'] = 'N';
        }

        $_SESSION['full_name'] = $fullName;

        $answer(['ok' => true]);
    }

    $sql = 'begin :cur := xx_dislocation.user_profile(:login); end;';
    $stmt = oci_parse($conn1, $sql);
    if (!$stmt) {
        $err = oci_error($conn1);
        throw new RuntimeException($err['message'] ?? 'Не удалось подготовить запрос');
    }

    $cur = oci_new_cursor($conn1);
    oci_bind_by_name($stmt, ':cur', $cur, -1, OCI_B_CURSOR);
    oci_bind_by_name($stmt, ':login', $login);

    if (!oci_execute($stmt)) {
        $err = oci_error($stmt);
        throw new RuntimeException($err['message'] ?? 'Не удалось выполнить запрос');
    }

    if (!oci_execute($cur)) {
        $err = oci_error($cur);
        throw new RuntimeException($err['message'] ?? 'Не удалось получить данные профиля');
    }

    $row = oci_fetch_assoc($cur);
    oci_free_statement($cur);
    oci_free_statement($stmt);

    $answer([
        'ok' => true,
        'data' => $row ?: [],
    ]);
} catch (Throwable $e) {
    error_log('[profile] ' . $e->getMessage());
    if ($e instanceof InvalidArgumentException) {
        $answer(['ok' => false, 'message' => $e->getMessage()], 400);
    }

    $message = $_SERVER['REQUEST_METHOD'] === 'POST'
        ? 'Не удалось сохранить профиль: ' . $e->getMessage()
        : 'Не удалось получить данные профиля';
    $answer(['ok' => false, 'message' => $message], 500);
}
