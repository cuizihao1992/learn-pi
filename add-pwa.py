import os
import re

ROOT = r"C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\learn-pi"
MANIFEST_HREF = "/learn-pi/manifest.json"
SW_REGISTER = "navigator.serviceWorker.register('/learn-pi/sw.js', { scope: '/learn-pi/' })"
THEME_COLOR = "#6366f1"

PWA_HEAD = (
    f'  <link rel="manifest" href="{MANIFEST_HREF}" />\n'
    f'  <meta name="theme-color" content="{THEME_COLOR}" />\n'
    '  <meta name="mobile-web-app-capable" content="yes" />\n'
    '  <meta name="apple-mobile-web-app-capable" content="yes" />\n'
    '  <meta name="apple-mobile-web-app-title" content="源码学吧" />\n'
    '  <link rel="apple-touch-icon" href="/learn-pi/icon-192.png" />'
)

SW_SCRIPT = (
    "  <script>\n"
    "    if ('serviceWorker' in navigator) {\n"
    f"      {SW_REGISTER};\n"
    "    }\n"
    "  </script>\n"
)

count = 0

for dirpath, _, filenames in os.walk(ROOT):
    for fname in filenames:
        if not fname.endswith(".html"):
            continue

        fpath = os.path.join(dirpath, fname)
        with open(fpath, "r", encoding="utf-8") as file:
            content = file.read()

        original = content

        if "manifest.json" not in content:
            content = content.replace("</head>", f"{PWA_HEAD}\n</head>")

        content = re.sub(r'href="(?:[^"]*/)?manifest\.json"', f'href="{MANIFEST_HREF}"', content)
        content = re.sub(
            r'(<meta\s+name="theme-color"\s+content=")[^"]+("\s*/?>)',
            rf"\1{THEME_COLOR}\2",
            content,
        )

        if "apple-mobile-web-app-capable" not in content:
            content = re.sub(
                r'<meta\s+name="theme-color"\s+content="#6366f1"\s*/?>',
                PWA_HEAD.split("\n", 1)[1],
                content,
                count=1,
            )

        if "sw.js" not in content:
            content = content.replace("</body>", f"{SW_SCRIPT}</body>")

        content = re.sub(
            r"navigator\.serviceWorker\.register\(\s*['\"][^'\"]*sw\.js['\"]\s*\)",
            SW_REGISTER,
            content,
        )

        if content != original:
            with open(fpath, "w", encoding="utf-8") as file:
                file.write(content)
            count += 1

print(f"已更新 {count} 个 HTML 文件")
