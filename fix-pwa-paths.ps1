$root = "C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\learn-pi"
$htmlFiles = Get-ChildItem $root -Recurse -Filter "*.html"
$count = 0

foreach ($f in $htmlFiles) {
    $content = Get-Content $f.FullName -Raw

    $changed = $false

    # Fix manifest href to absolute path
    if ($content -like "*manifest.json*") {
        $content = $content -replace 'href="[^"]*/manifest\.json"', 'href="/manifest.json"'
        $changed = $true
    }

    # Fix sw.js src to absolute path
    if ($content -like "*sw.js*") {
        $content = $content -replace "register\('[^']*/sw\.js'\)", "register('/sw.js')"
        $changed = $true
    }

    # Fix theme-color if it has relative path
    if ($content -like "*theme-color*") {
        $content = $content -replace 'content="[^"]*#7c3aed"', 'content="#7c3aed"'
        $changed = $true
    }

    if ($changed) {
        Set-Content $f.FullName $content -NoNewline
        Write-Host "✓ $($f.Name)"
    }
    $count++
}

Write-Host "✅ 已处理 $count 个 HTML 文件"
