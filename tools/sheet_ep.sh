#!/usr/bin/env bash
# Contact sheet so sánh: hàng trên = frame gốc (refs), hàng dưới = bản dựng, tại GIỮA mỗi shot.
#   tools/sheet_ep.sh <ep> <shot_đầu> <shot_cuối> <out.jpg>   (vd: tools/sheet_ep.sh ep001 1 12 /tmp/a.jpg)
set -e
EP=$1; A=$2; B=$3; OUT=$4
TMP=$(mktemp -d)
python3 - "$A" "$B" > $TMP/times <<'PY'
import json,sys
c=json.load(open('refs/ngoinha/cuts.json')); a,b=int(sys.argv[1]),int(sys.argv[2])
print(','.join(f"{((s['f0']+s['f1'])//2)/30+1/60:.4f}" for s in c[a-1:b]))
print(' '.join(f"refs/ngoinha/frames/F{(s['f0']+s['f1'])//2:04d}.jpg" for s in c[a-1:b]))
PY
T=$(sed -n 1p $TMP/times); IMGS=$(sed -n 2p $TMP/times)
N=$((B-A+1))
NODE_PATH=/opt/node-tools/node_modules node tools/peek.mjs "episodes/$EP/index.html?peek=1" "$T" $TMP/ours.png $N > /dev/null
python3 - "$OUT" "$TMP/ours.png" "$A" $IMGS <<'PY'
import sys
from PIL import Image, ImageDraw
out, ours, a = sys.argv[1], Image.open(sys.argv[2]), int(sys.argv[3]); refs = sys.argv[4:]
n=len(refs); W,H=180,320
sheet=Image.new('RGB',(n*W, 2*H+16),'white'); d=ImageDraw.Draw(sheet)
for i,r in enumerate(refs):
    sheet.paste(Image.open(r).resize((W,H)),(i*W,16))
    sheet.paste(ours.crop((i*270,0,i*270+270,480)).resize((W,H)),(i*W,16+H))
    d.text((i*W+3,2),f"s{a+i:03d}",fill='black')
sheet.save(out,quality=85)
PY
rm -rf $TMP
echo "$OUT"
