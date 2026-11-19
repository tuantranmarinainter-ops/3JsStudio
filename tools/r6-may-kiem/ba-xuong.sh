# Kiểm cả 3 bộ xương (r6_halfmc, r6_roblox, r6_mc) × 2 bộ động tác (bbs, quaternius) một lượt.
#   bash tools/r6-may-kiem/ba-xuong.sh <lan> [--khong-anh]    → output/r6-bobj/<thư mục bộ/xương>/<lan>/
cd "$(dirname "$0")/../.."; L=$1; shift
for bo in bbs quaternius; do
  dung=""
  for ga in halfmc roblox mc; do
    base=$([ $bo = bbs ] && echo kiem || echo quaternius-kiem)$([ $ga = halfmc ] || echo -r6_$ga)
    echo "== $bo $ga → output/r6-bobj/$base/$L"
    node tools/r6-may-kiem.mjs --bo $bo --ga $ga $dung "$@" --out output/r6-bobj/$base/$L > output/_tmp/bx-$bo-$ga-$L.log 2>&1 || echo "  LỖI (xem output/_tmp/bx-$bo-$ga-$L.log)"
    grep -E "LỖI TRANG" output/_tmp/bx-$bo-$ga-$L.log | head -2; dung="--khong-dung"
  done
done
