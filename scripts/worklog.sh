#!/usr/bin/env bash
# 세션 종료(Stop 훅) 시 그날 커밋을 docs/WORKLOG.md 에 자동 기록한다.
#
# - 날짜는 KST 기준 (Vercel UTC 이슈와 같은 사고 방지)
# - 커밋이 없는 날은 아무것도 쓰지 않는다
# - <!-- auto:날짜 --> ~ <!-- /auto:날짜 --> 사이만 갱신하므로
#   블록 바깥에 손으로 적은 서술은 절대 덮어쓰지 않는다
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$ROOT"

LOG="docs/WORKLOG.md"
# Windows Git Bash 에선 TZ=Asia/Seoul 이 date 에 안 먹힌다 → UTC+9 를 직접 계산
TODAY="$(date -u -d '+9 hours' +%Y-%m-%d)"
DOWS=(일 월 화 수 목 금 토)
DOW="${DOWS[$(date -u -d '+9 hours' +%w)]}"

# git 쪽도 타임존을 명시해 KST 하루 경계로 자른다
COMMITS="$(git log --since="$TODAY 00:00:00 +0900" --until="$TODAY 23:59:59 +0900" \
  --reverse --pretty=format:'- %s `%h`' 2>/dev/null || true)"
[ -n "$COMMITS" ] || exit 0

BEGIN="<!-- auto:$TODAY -->"
END="<!-- /auto:$TODAY -->"

TMP="$(mktemp)"
trap 'rm -f "$TMP" "$TMP.out"' EXIT
printf '%s\n' "$COMMITS" > "$TMP"

if [ ! -f "$LOG" ]; then
  mkdir -p "$(dirname "$LOG")"
  printf '# Livo 워크로그\n\n> 주요 작업 내용을 날짜별로 기록.\n' > "$LOG"
fi

if grep -qF "$BEGIN" "$LOG"; then
  # 이미 오늘 블록이 있으면 그 안만 통째로 갱신
  awk -v b="$BEGIN" -v e="$END" -v bf="$TMP" '
    $0 == b { print; while ((getline l < bf) > 0) print l; close(bf); skip = 1; next }
    $0 == e { skip = 0; print; next }
    skip    { next }
              { print }
  ' "$LOG" > "$TMP.out"
elif grep -q "^## $TODAY" "$LOG"; then
  # 손으로 쓴 오늘 섹션은 있는데 블록이 없으면 제목 바로 뒤에 삽입
  awk -v d="^## $TODAY" -v b="$BEGIN" -v e="$END" -v bf="$TMP" '
    { print }
    !done && $0 ~ d {
      print ""; print b
      while ((getline l < bf) > 0) print l
      close(bf); print e
      done = 1
    }
  ' "$LOG" > "$TMP.out"
else
  # 오늘 섹션 자체가 없으면 파일 끝에 새로 추가
  { cat "$LOG"; printf '\n## %s (%s)\n\n%s\n' "$TODAY" "$DOW" "$BEGIN"
    cat "$TMP"; printf '%s\n' "$END"; } > "$TMP.out"
fi

mv "$TMP.out" "$LOG"
