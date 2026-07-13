<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: dejavusans, sans-serif; font-size: 10pt; color: #111; }
        .top { text-align: right; font-size: 9pt; }
        h1 { text-align: center; font-size: 12pt; margin: 8px 0 2px; }
        .center { text-align: center; }
        .section { margin-top: 12px; }
        .label { font-weight: bold; }
        table { border-collapse: collapse; width: 100%; }
        .info td { padding: 2px 5px; vertical-align: top; }
        .wagons th, .wagons td { border: 1px solid #333; padding: 2px 3px; font-size: 8pt; }
        .wagons th { font-weight: bold; text-align: center; }
        .sign { margin-top: 18px; }
        .sign td { padding-top: 8px; padding-bottom: 8px; vertical-align: middle; }
        .sign-line { text-align: center; font-size: 12pt; line-height: 8px; white-space: nowrap; }
        .small { font-size: 8pt; text-align: center; line-height: 1; }
    </style>
</head>
<body>
<div class="top">Форма ГУ-23 ВЦ<br>утверждена в 2003 г.</div>
<h1>АКТ ОБЩЕЙ ФОРМЫ № <?= $h($act['ACT_NUMBER'] ?? '') ?></h1>
<div class="center">Цех: <?= $h($act['DEPT'] ?? '') ?></div>

<div class="section">Настоящий акт составлен в присутствии следующих лиц:</div>
<?php foreach ($signers as $signer): ?>
    <?php if (strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd'): ?>
        <div><b>Участник:</b></div>
    <?php endif; ?>
    <div><b>Должность:</b> <?= $h($signer['POST'] ?? '') ?> &nbsp;&nbsp; <b>Ф.И.О.:</b> <?= $h($signer['FIO'] ?? '') ?></div>
<?php endforeach; ?>

<table class="info section">
    <tr><td class="label" width="190">Перевозчик:</td><td>ОАО "РЖД"</td></tr>
    <tr><td class="label">Акт начала простоя:</td><td><?= $h($act['LINKED_START_NUMBER'] ?? $act['ACT_START_NUMBER'] ?? '') ?></td></tr>
    <tr><td class="label">Станция составления:</td><td><?= $h($act['STATION'] ?? '') ?></td></tr>
    <tr><td class="label">Станция отправления:</td><td><?= $h($act['ST_FROM'] ?? '') ?></td></tr>
    <tr><td class="label">Станция назначения:</td><td><?= $h($act['ST_TO'] ?? '') ?></td></tr>
    <tr><td class="label">Причина:</td><td><?= $h($act['REASON_NAME'] ?? '') ?></td></tr>
    <tr><td class="label">Сведения о времени:</td><td></td></tr>
    <tr><td>Время начала задержки:</td><td><?= $h($date($act['START_AT'] ?? '')) ?></td></tr>
    <tr><td>Время окончания задержки:</td><td><?= $h($date($act['END_AT'] ?? '')) ?></td></tr>
    <tr><td>Продолжительность, часов:</td><td><?= $h($act['DUR_TOTAL_H'] ?? '') ?></td></tr>
</table>

<div class="section"><b>Обстоятельства, вызвавшие составление акта:</b><br><?= nl2br($h($act['CIRCUMSTANCES'] ?? '')) ?></div>

<table class="wagons section">
    <thead>
    <tr>
        <th width="34">№</th>
        <th>№ вагона</th>
        <th>Акт начала</th>
        <th>№ накладной</th>
        <th>Род вагона</th>
        <th>Наименование груза</th>
        <th>Время простоя, ч</th>
    </tr>
    </thead>
    <tbody>
    <?php foreach ($wagons as $i => $wagon): ?>
        <tr>
            <td align="center"><?= $i + 1 ?></td>
            <td><?= $h($wagon['WAGON_NO'] ?? '') ?></td>
            <td><?= $h($wagon['ACT_START_NUM'] ?? '') ?></td>
            <td><?= $h($wagon['WAYBILL_NO'] ?? '') ?></td>
            <td><?= $h($wagon['KIND'] ?? '') ?></td>
            <td><?= $h($wagon['CARGO'] ?? '') ?></td>
            <td><?= $h($wagon['DUR_TOTAL_H'] ?? '') ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<table class="sign section">
    <?php foreach ($signers as $signer): ?>
        <?php $isRzd = strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd'; ?>
        <?php if ($isRzd): ?><tr><td colspan="3"><b>Участник:</b></td></tr><?php endif; ?>
        <tr class="signer-row">
            <td width="35%"><?= $h($signer['POST'] ?? '') ?></td>
            <td width="30%"><div class="sign-line">________________________</div><div class="small">(подпись)</div></td>
            <td width="35%" align="right"><?= $h($signer['FIO'] ?? '') ?></td>
        </tr>
    <?php endforeach; ?>
</table>
</body>
</html>
