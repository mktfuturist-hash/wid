import { NextResponse, type NextRequest } from "next/server";
import { KAKAO_URL } from "@/lib/links";
import { isPreviewBot, logClick, ensureOutboundLink } from "@/lib/click-log";

/* 나가는 링크: 랜딩의 [얼리버드 신청하기] → 오픈 카톡방.

   왜 한 번 거쳐 가나 —
   1차 전환(카톡방 입장)은 남의 서비스에서 일어나서 셀 수가 없다.
   그 직전인 **"카톡방 버튼을 몇 명이 눌렀나"** 까지는 내가 셀 수 있고,
   이 숫자가 있어야 "봤는데 안 눌렀다"와 "눌렀는데 카톡방에서 이탈했다"를
   구분할 수 있다.

   목적지는 코드 상수라서, DB에 행이 없어도 사람은 반드시 카톡방에 도착한다. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isPreviewBot(req.headers.get("user-agent"))) {
    const linkId = await ensureOutboundLink(
      "go-kakao",
      KAKAO_URL,
      "랜딩 CTA → 오픈 카톡방 (나가는 링크)"
    );
    if (linkId) await logClick(linkId, req);
  }
  return NextResponse.redirect(KAKAO_URL);
}
