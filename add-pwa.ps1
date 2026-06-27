$root = "C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\learn-pi"
$manifestHref = "/learn-pi/manifest.json"
$swRegister = "navigator.serviceWorker.register('/learn-pi/sw.js', { scope: '/learn-pi/' })"
$themeColor = "#6366f1"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$pwaHead = @"
  <link rel="manifest" href="$manifestHref" />
  <meta name="theme-color" content="$themeColor" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="源码学吧" />
  <link rel="apple-touch-icon" href="/learn-pi/icon-192.png" />
"@

$swScript = @"
  <script>
    if ('serviceWorker' in navigator) {
      $swRegister;
    }
  </script>
"@

$htmlFiles = Get-ChildItem $root -Recurse -File -Filter "*.html"
$count = 0

foreach ($f in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    if ($content -notlike "*manifest.json*") {
        $content = $content -replace '(</head>)', "$pwaHead`n`$1"
    }

    $content = [regex]::Replace($content, 'href="(?:[^"]*/)?manifest\.json"', "href=`"$manifestHref`"")
    $content = [regex]::Replace($content, '(<meta\s+name="theme-color"\s+content=")[^"]+("\s*/?>)', "`${1}$themeColor`${2}")

    if ($content -notlike "*apple-mobile-web-app-capable*") {
        $mobileMeta = ($pwaHead -split "`n", 2)[1]
        $content = [regex]::Replace($content, '<meta\s+name="theme-color"\s+content="#6366f1"\s*/?>', $mobileMeta, 1)
    }

    if ($content -notlike "*sw.js*") {
        $content = $content -replace '(</body>)', "$swScript`n`$1"
    }

    $content = [regex]::Replace(
        $content,
        "navigator\.serviceWorker\.register\(\s*['""][^'""]*sw\.js['""]\s*\)",
        $swRegister
    )

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        $count++
    }
}

Write-Host "已更新 $count 个 HTML 文件"
