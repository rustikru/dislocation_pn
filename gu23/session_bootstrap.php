<?php
/**
 */

const GU23_SESSION_LIFETIME = 28800; // 8 часов

ini_set('session.gc_maxlifetime', (string) GU23_SESSION_LIFETIME);
ini_set('session.cookie_lifetime', '0');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
