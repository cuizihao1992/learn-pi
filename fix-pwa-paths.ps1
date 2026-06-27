$root = "C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\learn-pi"
$manifestHref = "/learn-pi/manifest.json"
$swRegister = "navigator.serviceWorker.register('/learn-pi/sw.js', { scope: '/learn-pi/' })"
$themeColor = "#6366f1"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$htmlFiles = Get-ChildItem $root -Recurse -File -Filter "*.html"
$count = 0

foreach ($f in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    $content = [regex]::Replace($content, 'href="(?:[^"]*/)?manifest\.json"', "href=`"$manifestHref`"")
    $content = [regex]::Replace($content, '(<meta\s+name="theme-color"\s+content=")[^"]+("\s*/?>)', "`${1}$themeColor`${2}")
    $content = [regex]::Replace(
        $content,
        "navigator\.serviceWorker\.register\(\s*['""][^'""]*sw\.js['""]\s*\)",
        $swRegister
    )

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        Write-Host "fixed $($f.FullName)"
        $count++
    }
}

Write-Host "已修复 $count 个 HTML 文件"
