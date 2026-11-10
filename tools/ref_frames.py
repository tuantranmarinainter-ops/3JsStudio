#!/usr/bin/env python3
"""Trích frame tham chiếu từ tài liệu bàn giao HTML (atlas 10×10, ô 160×284) ra JPEG từng frame.

  python tools/ref_frames.py OUT_DIR PART1.html PART2.html ...
Kết quả: OUT_DIR/frames/F0000.jpg…, OUT_DIR/subtitles.json, OUT_DIR/scenes.json, OUT_DIR/subtitles.srt, OUT_DIR/ref.mp4
"""
import base64, io, json, re, subprocess, sys
from pathlib import Path
from PIL import Image

CW, CH = 160, 284

def script(s, sid):
    m = re.search(r'<script id="%s"[^>]*>(.*?)</script>' % sid, s, re.S)
    return json.loads(m.group(1)) if m else None

def srt_t(t):
    ms = round(t * 1000); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"

def main():
    out = Path(sys.argv[1]); fr = out / 'frames'; fr.mkdir(parents=True, exist_ok=True)
    subs = scenes = None; n = 0
    for p in sys.argv[2:]:
        s = open(p, encoding='utf-8').read()
        subs = subs or script(s, 'subtitle-data'); scenes = scenes or script(s, 'scene-data')
        m = re.search(r'Phần này nhúng frame F(\d+)', s); first = int(m.group(1))
        atl = script(s, 'reference-atlases')
        for ai, uri in enumerate(atl):
            img = Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1])))
            for c in range(100):
                f = first + ai * 100 + c
                if f > 5131: break
                x, y = (c % 10) * CW, (c // 10) * CH
                tile = img.crop((x, y, x + CW, y + CH))
                if tile.getbbox() is None and f > first + ai*100: continue
                tile.save(fr / f'F{f:04d}.jpg', quality=92); n += 1
    json.dump(subs, open(out / 'subtitles.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(scenes, open(out / 'scenes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(out / 'subtitles.srt', 'w', encoding='utf-8') as f:
        for c in subs: f.write(f"{c['id']}\n{srt_t(c['start'])} --> {srt_t(c['end'])}\n{c['text']}\n\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', str(fr / 'F%04d.jpg'),
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'pad=160:284', str(out / 'ref.mp4')], check=True)
    print('frames', n)

if __name__ == '__main__':
    main()
