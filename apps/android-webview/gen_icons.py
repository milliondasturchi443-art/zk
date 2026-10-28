#!/usr/bin/env python3
"""Generate Android launcher icons from web/public/icon.svg"""
import subprocess
import os

svg = open('/home/anonymus/zk/apps/web/public/icon.svg', 'rb').read()
res = '/home/anonymus/zk/apps/android-webview/app/src/main/res'
sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}
for folder, size in sizes.items():
    out = f'{res}/{folder}/ic_launcher.png'
    p = subprocess.run(
        ['rsvg-convert', '-w', str(size), '-h', str(size), '-f', 'png'],
        input=svg, capture_output=True
    )
    if p.returncode != 0:
        print(f'ERR {folder}: {p.stderr.decode()}')
        continue
    open(out, 'wb').write(p.stdout)
    print(f'{folder}: {size}x{size} -> {os.path.getsize(out)} bytes')
print('done')