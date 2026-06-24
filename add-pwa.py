import os
import re

root = r"C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\learn-pi"
count = 0

for dirpath, dirnames, filenames in os.walk(root):
    for fname in filenames:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(dirpath, fname)

        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        changed = False

        # Add manifest link before </head> if not present
        if 'manifest.json' not in content:
            content = content.replace('</head>',
                '  <link rel="manifest" href="/manifest.json" />\n'
                '  <meta name="theme-color" content="#7c3aed" />\n</head>')
            changed = True

        # Fix any relative manifest paths (in case some were added earlier)
        content = re.sub(r'href="[^"]*/manifest\.json"', 'href="/manifest.json"', content)

        # Add service worker registration before </body> if not present
        if 'sw.js' not in content:
            sw_script = (
                '  <script>\n'
                "    if ('serviceWorker' in navigator) {\n"
                "      navigator.serviceWorker.register('/sw.js');\n"
                '    }\n'
                '  </script>\n'
            )
            content = content.replace('</body>', sw_script + '</body>')
            changed = True

        # Fix relative sw.js paths
        content = re.sub(r"register\('[^']*/sw\.js'\)", "register('/sw.js')", content)

        if changed:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            count += 1
            # progress indicator
            if count % 20 == 0:
                print(f"  processed {count}...")

print(f"\n✅ 已完成 {count} 个 HTML 文件 (UTF-8)")
