<?php
class Response
{
    /**
     * Успешный JSON-ответ
     */
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
        );
        exit;
    }

    /**
     *  ответ API
     */
    public static function build(
        $statusResponse = null,
        $errorMessage = null,
        $data = null
        //Logger::info($this->$data);
    ): array {
        return [
            'status'  => $statusResponse,
            'message' => $errorMessage,
            'data'    => $data
        ];
    }

    /**
     * Ответ с ошибкой
     */
    public static function error(
        string $message,
        int $httpStatus = 500,
        string $statusCode = 'E'
    ): void {
        self::json([
            'status'  => $statusCode,
            'message' => $message,
            'data'    => null
        ], $httpStatus);
    }
}
