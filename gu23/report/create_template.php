<?php
/**
 * create_template.php
 *
 * Создаёт шаблон DOCX с плейсхолдерами для генератора отчётов.
 * Запускать ОДИН РАЗ из командной строки или через браузер (только admin).
 *
 * Использование:
 *   php gu23/report/create_template.php
 *
 * После создания шаблон можно доработать в MS Word:
 *   – Добавить логотип, изменить шрифты и т.д.
 *   – Не переименовывать плейсхолдеры {{...}}, иначе генератор их не найдёт.
 *
 * Доступные плейсхолдеры:
 *   {{ACT_NUMBER}}     – номер акта
 *   {{CEX}}            – цех
 *   {{STATION}}        – станция составления
 *   {{ST_FROM}}        – станция отправления
 *   {{ST_TO}}          – станция назначения
 *   {{REASON_NAME}}    – причина
 *   {{CARGO_REF}}      – груз
 *   {{START_AT}}       – дата/время начала простоя
 *   {{END_AT}}         – дата/время окончания простоя
 *   {{CIRCUMSTANCES}}  – обстоятельства (многострочный)
 *   {{CREATED_AT}}     – дата создания акта
 *   {{SIGNER_N_POST}}  – должность подписанта N (1, 2, 3)
 *   {{SIGNER_N_FIO}}   – ФИО подписанта N (1, 2, 3)
 *
 * Строки таблицы вагонов (первая строка с {{WAGON_NO}} повторяется):
 *   {{WAGON_IDX}}      – порядковый номер
 *   {{WAGON_NO}}       – номер вагона
 *   {{WAGON_KIND}}     – род вагона
 *   {{WAGON_CARGO}}    – наименование груза
 *   {{WAGON_WEIGHT}}   – вес кг
 *   {{WAGON_OWNER}}    – собственник
 *   {{WAGON_ST_FROM}}  – станция отправления вагона
 *   {{WAGON_ST_TO}}    – станция назначения вагона
 */

$outputDir = __DIR__ . '/template/';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0777, true);
}

$outputFile = $outputDir . 'act23_general.docx';

// Предупреждение при перезаписи
if (file_exists($outputFile)) {
    echo "ВНИМАНИЕ: файл $outputFile уже существует и будет перезаписан.\n";
}

// ============================================================
// Строим минимальный валидный DOCX в памяти
// ============================================================

$tmp = tempnam(sys_get_temp_dir(), 'gu23_tpl_');
$zip = new ZipArchive();
$zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);

// ---- [Content_Types].xml ----
$zip->addFromString('[Content_Types].xml', <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
XML);

// ---- _rels/.rels ----
$zip->addFromString('_rels/.rels', <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>
XML);

// ---- word/_rels/document.xml.rels ----
$zip->addFromString('word/_rels/document.xml.rels', <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>
XML);

// ---- word/styles.xml (минимальный) ----
$zip->addFromString('word/styles.xml', buildStylesXml());

// ---- word/document.xml (шаблон с плейсхолдерами) ----
$zip->addFromString('word/document.xml', buildDocumentXml());

$zip->close();

copy($tmp, $outputFile);
unlink($tmp);

echo "Шаблон создан: $outputFile\n";
echo "Откройте его в Word чтобы настроить форматирование. Плейсхолдеры {{...}} не удаляйте.\n";

// ============================================================
// Построение XML стилей
// ============================================================
function buildStylesXml(): string
{
    return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="ru-RU"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="table" w:styleId="tbl">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left   w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right  w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>
XML;
}

// ============================================================
// Построение основного XML документа с плейсхолдерами
// ============================================================
function buildDocumentXml(): string
{
    $ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

    // Параграф с выравниванием
    $rp = static fn(string $align, string $xml): string =>
        "<w:p><w:pPr><w:jc w:val=\"$align\"/></w:pPr>$xml</w:p>";

    // Параграф по умолчанию (по левому краю)
    $p = static fn(string $xml): string => "<w:p>$xml</w:p>";

    // Ран: обычный текст
    $r = static fn(string $text, bool $bold = false, bool $preserve = false): string =>
        '<w:r>'
        . ($bold ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : '')
        . '<w:t' . ($preserve ? ' xml:space="preserve"' : '') . '>'
        . htmlspecialchars($text, ENT_XML1, 'UTF-8')
        . '</w:t></w:r>';

    // Ран с жирным лейблом + обычный хвост
    $rl = static fn(string $label, string $tail): string =>
        '<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>' . htmlspecialchars($label, ENT_XML1) . '</w:t></w:r>'
        . '<w:r><w:t xml:space="preserve">' . htmlspecialchars($tail, ENT_XML1) . '</w:t></w:r>';

    // Пустой параграф
    $empty = '<w:p/>';

    // Заголовок таблицы — колонки
    $cols = [
        ['w' => 700,  't' => '№№'],
        ['w' => 1400, 't' => '№ вагона'],
        ['w' => 1600, 't' => 'Род вагона'],
        ['w' => 2500, 't' => 'Наименование груза'],
        ['w' => 1419, 't' => 'Вес(кг)'],
        ['w' => 1419, 't' => 'Собственник'],
    ];
    $totalW = array_sum(array_column($cols, 'w'));

    $tblGrid = '';
    foreach ($cols as $c) {
        $tblGrid .= "<w:gridCol w:w=\"$c[w]\"/>";
    }

    $headerCells = '';
    foreach ($cols as $c) {
        $headerCells .= "<w:tc><w:tcPr><w:tcW w:w=\"$c[w]\" w:type=\"dxa\"/></w:tcPr>"
            . '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
            . '<w:r><w:rPr><w:b/></w:rPr><w:t>'
            . htmlspecialchars($c['t'], ENT_XML1)
            . '</w:t></w:r></w:p></w:tc>';
    }

    $wagColW = [700, 1400, 1600, 2500, 1419, 1419];
    $wagPh   = ['{{WAGON_IDX}}', '{{WAGON_NO}}', '{{WAGON_KIND}}', '{{WAGON_CARGO}}', '{{WAGON_WEIGHT}}', '{{WAGON_OWNER}}'];
    $dataRow = '';
    foreach ($wagPh as $i => $ph) {
        $dataRow .= "<w:tc><w:tcPr><w:tcW w:w=\"{$wagColW[$i]}\" w:type=\"dxa\"/></w:tcPr>"
            . "<w:p><w:r><w:t>$ph</w:t></w:r></w:p></w:tc>";
    }

    $xml = <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document $ns>
<w:body>

  {$rp('right',
      '<w:r><w:t>Форма ГУ-23 ВЦ</w:t></w:r>'
    . '<w:r><w:br/><w:t>утверждена в 2003 г.</w:t></w:r>')}

  {$rp('center',
      '<w:r><w:rPr><w:b/></w:rPr><w:t>АКТ ОБЩЕЙ ФОРМЫ № {{ACT_NUMBER}}</w:t></w:r>'
    . '<w:r><w:rPr><w:b/></w:rPr><w:br/></w:r>'
    . '<w:r><w:t>Цех: {{CEX}}</w:t></w:r>')}

  $empty

  {$p($r('Настоящий акт составлен в присутствии следующих лиц:'))}

  {$p($rl('Должность', ': {{SIGNER_1_POST}}    Ф.И.О.: {{SIGNER_1_FIO}}'))}
  {$p($rl('Должность', ': {{SIGNER_2_POST}}    Ф.И.О.: {{SIGNER_2_FIO}}'))}
  {$p($rl('Участник',  ': {{SIGNER_3_FIO}}'))}
  {$p($rl('Перевозчик', ': ОАО "РЖД"'))}
  {$p($rl('Станция составления', ': {{STATION}}'))}
  {$p($rl('Станция отправления', ': {{ST_FROM}}'))}
  {$p($rl('Станция назначения',  ': {{ST_TO}}'))}
  {$p($rl('Причина', ': {{REASON_NAME}}'))}

  {$p($rl('Сведения о времени', ':'))}
  {$p($r('Время начала задержки: {{START_AT}}'))}

  $empty

  {$p($rl('Обстоятельства, вызвавшие составление акта', ':'))}
  {$p('<w:r><w:t xml:space="preserve">{{CIRCUMSTANCES}}</w:t></w:r>')}

  $empty

  <w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="tbl"/>
      <w:tblW w:w="$totalW" w:type="dxa"/>
    </w:tblPr>
    <w:tblGrid>$tblGrid</w:tblGrid>
    <w:tr>$headerCells</w:tr>
    <w:tr>$dataRow</w:tr>
  </w:tbl>

  <w:p/>

  <w:sectPr>
    <w:pgSz w:w="12240" w:h="15840"/>
    <w:pgMar w:top="1134" w:right="851" w:bottom="1134" w:left="1134"
             w:header="720" w:footer="720" w:gutter="0"/>
  </w:sectPr>
</w:body>
</w:document>
XML;

    return $xml;
}
