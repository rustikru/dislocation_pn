<?php

require_once __DIR__ . '/Gu23Db.php';
require_once __DIR__ . '/../lib/text_clean.php';

class Gu23NoticeRepository
{
    private const RS = "\x1E";
    private const US = "\x1F";

    private Gu23Db $db;
    private AuthClass $auth;

    public function __construct($conn, AuthClass $auth)
    {
        $this->db = new Gu23Db($conn);
        $this->auth = $auth;
    }

    public static function supports(string $action): bool
    {
        return str_starts_with($action, 'gu23_notice')
            || $action === 'gu23_notices'
            || $action === 'gu23_notices_all';
    }

    public function runAction(string $action): void
    {
        $method = [
            'gu23_notices' => 'notices',
            'gu23_notice_count' => 'noticeCount',
            'gu23_notice_read' => 'noticeRead',
            'gu23_notice_read_set' => 'noticeReadSet',
            'gu23_notice_favorite' => 'noticeFavorite',
            'gu23_notice_read_all' => 'noticeReadAll',
            'gu23_notices_all' => 'noticesAll',
            'gu23_notice_save' => 'noticeSave',
            'gu23_notice_toggle' => 'noticeToggle',
            'gu23_notice_image_upload' => 'noticeImageUpload',
            'gu23_notice_file_upload' => 'noticeFileUpload',
            'gu23_notice_files' => 'noticeFiles',
        ][$action] ?? null;

        if ($method === null) {
            http_response_code(400);
            $this->error('Неизвестное действие уведомлений');
            return;
        }
        $this->{$method}();
    }

    private function notices(): void
    {
        $rows = $this->db->rows(
            'select * from table(xx_disl_gu23_pkg.gu23_notices(:p_user_id))',
            [':p_user_id' => (int) $this->auth->getUserId()]
        );
        echo json_encode(['ok' => true, 'rows' => $rows]);
    }

    private function noticeCount(): void
    {
        $count = (int) $this->db->value(
            'xx_disl_gu23_pkg.gu23_notice_count(:p_user_id)',
            [':p_user_id' => (int) $this->auth->getUserId()],
            20
        );
        echo json_encode(['ok' => true, 'count' => $count]);
    }

    private function noticeRead(): void
    {
        $this->userNoticeAction('xx_disl_gu23_pkg.gu23_notice_read(:p_user_id, :p_notice_id)');
    }

    private function noticeReadSet(): void
    {
        $id = $this->noticeId();
        if ($id === null) return;
        $read = strtoupper(trim((string) filter_input(INPUT_POST, 'read'))) === 'Y' ? 'Y' : 'N';
        $result = $this->db->value(
            'xx_disl_gu23_pkg.gu23_notice_read_set(:p_user_id, :p_notice_id, :p_read_flag)',
            [
                ':p_user_id' => (int) $this->auth->getUserId(),
                ':p_notice_id' => $id,
                ':p_read_flag' => $read,
            ],
            1000
        );
        if (str_starts_with((string) $result, 'OK')) {
            echo json_encode(['ok' => true, 'is_read' => $read]);
        } else {
            $this->packageError($result);
        }
    }

    private function noticeFavorite(): void
    {
        $id = $this->noticeId();
        if ($id === null) return;
        $result = $this->db->value(
            'xx_disl_gu23_pkg.gu23_notice_favorite(:p_user_id, :p_notice_id)',
            [':p_user_id' => (int) $this->auth->getUserId(), ':p_notice_id' => $id],
            1000
        );
        $parts = explode(self::US, (string) $result);
        if (str_starts_with((string) $result, 'OK')) {
            echo json_encode(['ok' => true, 'favorite' => $parts[1] ?? 'N']);
        } else {
            $this->error($parts[1] ?? 'Ошибка');
        }
    }

    private function noticeReadAll(): void
    {
        $result = $this->db->value(
            'xx_disl_gu23_pkg.gu23_notice_read_all(:p_user_id)',
            [':p_user_id' => (int) $this->auth->getUserId()],
            1000
        );
        $this->simpleResult($result);
    }

    private function noticesAll(): void
    {
        if (!$this->manageRefsAllowed()) return;
        $rows = $this->db->rows(
            "select * from table(xx_disl_gu23_pkg.gu23_notices(p_user_id => :p_user_id, p_all => 'Y'))",
            [':p_user_id' => (int) $this->auth->getUserId()]
        );
        echo json_encode(['ok' => true, 'rows' => $rows]);
    }

    private function noticeSave(): void
    {
        if (!$this->manageRefsAllowed()) return;
        $files = json_decode((string) filter_input(INPUT_POST, 'files'), true);
        if (!is_array($files)) $files = [];

        $result = $this->db->value(
            'xx_disl_gu23_pkg.gu23_notice_save(:p_id, :p_title, :p_body, :p_notice_type, :p_image_path, :p_files, :p_user_id)',
            [
                ':p_id' => (int) filter_input(INPUT_POST, 'id'),
                ':p_title' => $this->clean((string) filter_input(INPUT_POST, 'title')),
                ':p_body' => $this->clean((string) filter_input(INPUT_POST, 'body')),
                ':p_notice_type' => trim((string) filter_input(INPUT_POST, 'notice_type')),
                ':p_image_path' => $this->clean((string) filter_input(INPUT_POST, 'image_path')),
                ':p_files' => $this->packRows($files, ['path', 'name', 'mime']),
                ':p_user_id' => (int) $this->auth->getUserId(),
            ],
            1000
        );
        $this->simpleResult($result);
    }

    private function noticeToggle(): void
    {
        if (!$this->manageRefsAllowed()) return;
        $id = $this->noticeId();
        if ($id === null) return;
        $result = $this->db->value(
            'xx_disl_gu23_pkg.gu23_notice_toggle(:p_notice_id)',
            [':p_notice_id' => $id],
            1000
        );
        $this->simpleResult($result);
    }

    private function noticeFiles(): void
    {
        $id = (int) filter_input(INPUT_POST, 'notice_id');
        if ($id <= 0) {
            $this->error('Не указано уведомление');
            return;
        }
        $rows = $this->db->rows(
            'select * from table(xx_disl_gu23_pkg.gu23_notice_files(:p_notice_id))',
            [':p_notice_id' => $id]
        );
        echo json_encode(
            ['ok' => true, 'files' => $rows],
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
    }

    private function noticeImageUpload(): void
    {
        if (!$this->manageRefsAllowed() || !$this->hasUpload()) return;
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            $this->error('Можно загрузить только изображение');
            return;
        }
        $dir = dirname(__DIR__) . '/storage/notices';
        if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
            $this->error('Не удалось создать папку для картинок');
            return;
        }
        $name = 'notice_' . date('Ymd_His') . '_' . mt_rand(1000, 9999) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
            $this->error('Не удалось сохранить файл');
            return;
        }
        echo json_encode(['ok' => true, 'path' => '/gu23/storage/notices/' . $name]);
    }

    private function noticeFileUpload(): void
    {
        if (!$this->manageRefsAllowed() || !$this->hasUpload()) return;
        $file = $_FILES['file'];
        if ((int) ($file['size'] ?? 0) > 20 * 1024 * 1024) {
            $this->error('Размер файла превышает 20 МБ');
            return;
        }
        $originalName = basename((string) ($file['name'] ?? ''));
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($ext, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip'], true)) {
            $this->error('Допустимы PDF, Word, Excel, TXT, CSV и ZIP');
            return;
        }
        $mime = 'application/octet-stream';
        if (class_exists('finfo')) {
            $detected = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            if (is_string($detected) && $detected !== '') $mime = $detected;
        }
        $dir = dirname(__DIR__) . '/storage/notices/files';
        if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
            $this->error('Не удалось создать папку для файлов');
            return;
        }
        $storedName = 'notice_file_' . date('Ymd_His') . '_'
            . bin2hex(random_bytes(4)) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $storedName)) {
            $this->error('Не удалось сохранить файл');
            return;
        }
        echo json_encode([
            'ok' => true,
            'path' => 'storage/notices/files/' . $storedName,
            'name' => $originalName,
            'mime' => $mime,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    private function userNoticeAction(string $function): void
    {
        $id = $this->noticeId();
        if ($id === null) return;
        $result = $this->db->value(
            $function,
            [':p_user_id' => (int) $this->auth->getUserId(), ':p_notice_id' => $id],
            1000
        );
        $this->simpleResult($result);
    }

    private function noticeId(): ?int
    {
        $id = (int) filter_input(INPUT_POST, 'id');
        if ($id <= 0) {
            $this->error('Не указана запись');
            return null;
        }
        return $id;
    }

    private function hasUpload(): bool
    {
        if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            $this->error('Файл не выбран');
            return false;
        }
        if (($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->error('Ошибка загрузки файла');
            return false;
        }
        return true;
    }

    private function manageRefsAllowed(): bool
    {
        if ($this->auth->isAuthAdmin()) return true;
        // Сохраняем существующее поведение локальной среды разработки.
        if (file_exists(dirname(__DIR__) . '/db_config.local.php')) return true;
        $uid = $this->auth->getUserId();
        if ($uid) {
            try {
                if ($this->db->value(
                    'xx_disl_gu23_pkg.gu23_has_perm(:p_user_id, :p_perm_code)',
                    [':p_user_id' => $uid, ':p_perm_code' => 'MANAGE_REFS'],
                    2
                ) === 'Y') return true;
            } catch (\RuntimeException $e) {
            }
        }
        $this->error('Недостаточно прав');
        return false;
    }

    private function packRows(array $rows, array $fields): string
    {
        $packed = [];
        foreach ($rows as $row) {
            $values = [];
            foreach ($fields as $field) {
                $value = isset($row[$field]) ? $this->clean((string) $row[$field]) : '';
                $values[] = str_replace([self::RS, self::US], ' ', $value);
            }
            $packed[] = implode(self::US, $values);
        }
        return implode(self::RS, $packed);
    }

    private function clean(string $value): string
    {
        return gu23_clean_text_for_oracle(trim($value));
    }

    private function simpleResult(?string $result): void
    {
        if (str_starts_with((string) $result, 'OK')) {
            echo json_encode(['ok' => true]);
        } else {
            $this->packageError($result);
        }
    }

    private function packageError(?string $result): void
    {
        $parts = explode(self::US, (string) $result);
        $this->error($parts[1] ?? 'Ошибка');
    }

    private function error(string $message): void
    {
        echo json_encode(['ok' => false, 'msg' => $message]);
    }
}
