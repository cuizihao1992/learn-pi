$root = "C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\learn-pi"
$htmlFiles = Get-ChildItem $root -Recurse -Filter "*.html"
$count = 0

foreach ($f in $htmlFiles) {
    $content = Get-Content $f.FullName -Raw

    # Calculate relative path to root for manifest and sw
    $rel = [System.IO.Path]::GetRelativePath($f.Directory.FullName, $root)
    if ($rel -eq '.' -or $rel -eq '') { $rel = '.' }
    $rel = $rel.Replace('\', '/')
    $manifestHref = "$rel/manifest.json"
    $swSrc = "$rel/sw.js"

    # Add manifest link after stylesheet link if not already present
    if ($content -notlike "*manifest.json*") {
        $content = $content -replace '(</head>)', "  <link rel=""manifest"" href=""$manifestHref"" />`n  <meta name=""theme-color"" content=""#7c3aed"" />`n$1"
    }

    # Add service worker registration before </body> if not already present
    if ($content -notlike "*sw.js*") {
        $swScript = "<script>`n    if ('serviceWorker' in navigator) {`n      navigator.serviceWorker.register('$swSrc');`n    }`n  </script>"
        $content = $content -replace '(</body>)', "  $swScript`n$1"
    }

    Set-Content $f.FullName $content -NoNewline
    $count++
}

Write-Host "✅ 已更新 $count 个 HTML 文件"
