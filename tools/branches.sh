#!/usr/bin/env bash
# branches.sh — mỗi phiên (cloud) đã đẩy gì lên remote?
#
# Cách dùng:
#   bash tools/branches.sh [--fetch]
#     --fetch   chạy `git fetch --all --prune` trước khi liệt kê
# Với mỗi nhánh remote (trừ HEAD): ngày + tiêu đề commit cuối, các commit chưa có trong HEAD hiện tại
# (tối đa 15), tóm tắt --stat file chúng đụng tới (15 dòng đầu). Sau đó: commit local chưa lên remote nào.
# Chạy được trong Git Bash trên Windows.

cd "$(dirname "$0")/.." || exit 1
export LC_ALL=C

[ "$1" = "--fetch" ] && { echo ">> git fetch --all --prune"; git fetch --all --prune 2>&1 | sed 's/^/   /'; }

cur=$(git rev-parse --abbrev-ref HEAD)
echo "Nhánh hiện tại: $cur ($(git rev-parse --short HEAD))"
nchg=$(git status --porcelain | wc -l | tr -d ' ')
[ "$nchg" -gt 0 ] && echo "  (còn $nchg file chưa commit trong working tree)"
echo

unmerged=()
merged=()
while read -r br; do
  [ -z "$br" ] && continue
  case "$br" in */HEAD|origin) continue ;; esac
  n=$(git rev-list --count "HEAD..$br")
  echo "=== $br"
  echo "  commit cuối: $(git log -1 --format='%ad  %an  %s' --date=format:'%Y-%m-%d %H:%M' "$br")"
  if [ "$n" -eq 0 ]; then
    echo "  chưa có commit nào ngoài HEAD (đã gộp / HEAD đã chứa nó)"
    merged+=("$br")
    echo
    continue
  fi
  unmerged+=("$br")
  echo "  $n commit chưa có trong HEAD:"
  git log --format='    %h %ad %s' --date=format:'%m-%d %H:%M' "HEAD..$br" | head -15
  [ "$n" -gt 15 ] && echo "    … và $((n - 15)) commit nữa"
  echo "  file đụng tới (git diff --stat HEAD...$br):"
  git diff --stat=100 "HEAD...$br" | head -15 | sed 's/^/   /'
  echo
done < <(git for-each-ref --format='%(refname:short)' --sort=-committerdate refs/remotes)

echo "=== Commit local chưa lên remote nào"
nl=$(git rev-list --count HEAD --not --remotes)
if [ "$nl" -eq 0 ]; then
  echo "  (không có)"
else
  echo "  $nl commit:"
  git log --format='    %h %ad %s' --date=format:'%m-%d %H:%M' HEAD --not --remotes | head -15
  [ "$nl" -gt 15 ] && echo "    … và $((nl - 15)) commit nữa"
fi
echo

if [ ${#unmerged[@]} -gt 0 ]; then
  echo "GỢI Ý: nhánh có vẻ CHƯA gộp vào $cur: ${unmerged[*]}"
else
  echo "GỢI Ý: mọi nhánh remote đã nằm trong $cur."
fi
[ "$nl" -gt 0 ] && echo "       $nl commit local chưa push."
exit 0
