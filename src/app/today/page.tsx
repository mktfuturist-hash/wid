import { redirect } from "next/navigation";

/* ☀️ 오늘은 🔁 데일리 루틴에 통합됐다 (9/12) - 옛 북마크·모바일 탭을 위해 리다이렉트만 남긴다 */
export default function TodayPage() {
  redirect("/routines");
}
