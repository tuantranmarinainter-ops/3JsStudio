#!/usr/bin/env bash
# ref_remote.sh — Claude dùng: xếp hàng video, push, chờ GitHub Actions phân tích xong, kéo kết quả về.
#   tools/ref_remote.sh "ytsearch5:In This Town roblox story" "https://youtube.com/shorts/XXXX"
# Chạy trong thư mục repo (đã có quyền push). Chờ tối đa 40 phút.
set -euo pipefail
[ $# -ge 1 ] || { echo "Dùng: $0 <url|ytsearchN:từ khoá> ..."; exit 1; }

git pull --rebase -q origin main
touch refs/done.txt
before=$(wc -l < refs/done.txt 2>/dev/null || echo 0)
for t in "$@"; do echo "$t" >> refs/queue.txt; done
git add refs/queue.txt
git commit -qm "refs: xếp hàng $# mục"
git push -q
echo "Đã đẩy hàng đợi ($# mục). Đang chờ GitHub Actions…"

for i in $(seq 1 80); do          # 80 × 30s = 40 phút
  sleep 30
  git pull --rebase -q origin main 2>/dev/null || true
  after=$(wc -l < refs/done.txt 2>/dev/null || echo 0)
  if [ "$after" -gt "$before" ]; then
    echo "Xong sau ~$((i / 2)) phút."
    tail -n "$((after - before))" refs/done.txt
    [ -f refs/errors.md ] && { echo "--- Lỗi:"; cat refs/errors.md; }
    [ -f refs/summary.md ] && cat refs/summary.md
    exit 0
  fi
done
echo "Hết 40 phút chưa có kết quả — kiểm tra tab Actions của repo."
exit 2
