import { Landing } from "@/components/landing";
import { getEarlybird } from "@/lib/earlybird";

/* 공유 미리보기에도 정원이 들어간다. 여기만 상수로 두면 랜딩은 10명인데
   카톡·슬랙 링크 카드에는 30명으로 뜨는 일이 생긴다. */
export async function generateMetadata() {
  const eb = await getEarlybird();
  return {
    title: "멈추지 않는 올해 - WID 얼리버드",
    description: `올해 마지막 100일, 루틴 챌린지. 목표를 구조화하고, 할 일을 설정하고, 루틴화하세요. 얼리버드 ${eb.capacity}명 한정.`,
  };
}

// 로그인 여부와 무관하게 랜딩을 미리 볼 수 있는 경로 (공유·검증용)
export default function LandingPage() {
  return <Landing />;
}
