import { redirect } from "next/navigation";
import { auth, authEnabled } from "@/auth";
import { LoginCard } from "./login-card";

export const metadata = {
  title: "로그인 - WID",
  description: "구글 계정으로 WID에 로그인하세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // 이미 로그인한 사용자는 홈으로
  if (authEnabled && (await auth())) redirect("/");
  const { error } = await searchParams;
  return (
    <LoginCard
      authEnabled={authEnabled}
      // 구글 OAuth 클라이언트 ID는 공개값 - GIS 버튼 초기화에 필요
      googleClientId={process.env.AUTH_GOOGLE_ID ?? null}
      loginError={error ?? null}
    />
  );
}
