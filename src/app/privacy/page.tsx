import Link from "next/link";

export const metadata = { title: "개인정보처리방침 — WID" };

const EFFECTIVE = "2026년 9월 6일";
const FIRST_EFFECTIVE = "2026년 8월 29일";
const CONTACT = "mktfuturist@gmail.com";
const OFFICER = "최주희";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-neutral-200 px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-16 pt-4">
      <header className="space-y-2">
        <p className="text-sm text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">← WID 홈으로</Link>
        </p>
        <h1 className="text-3xl font-bold">개인정보처리방침</h1>
        <p className="text-sm text-neutral-500">시행일: {EFFECTIVE}</p>
      </header>

      <section className="space-y-6 text-[15px] leading-relaxed text-neutral-700">
        <p>
          WID(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 소중하게 생각하며, 「개인정보
          보호법」을 준수합니다. 이 방침은 서비스가 어떤 개인정보를 어떤 목적으로 처리하고,
          얼마나 보관하며, 어떻게 파기하는지를 안내합니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목과 이용 목적">
          <Table
            head={["구분", "수집 항목", "이용 목적", "수집 방법"]}
            rows={[
              [
                "필수",
                "이메일 주소, 이름, 프로필 사진",
                "회원 식별 및 로그인, 사용자별 데이터 분리",
                "구글 계정 로그인(Google OAuth) 시 구글로부터 제공받음",
              ],
              ["자동 수집", "로그인 세션 쿠키", "로그인 상태 유지", "서비스 이용 과정에서 자동 생성"],
              ["자동 수집", "접속 IP, 접속 기록", "서비스 운영 및 보안(호스팅 로그)", "서비스 이용 과정에서 자동 생성"],
              [
                "선택",
                "이용자가 업로드한 이미지(일정표·메모 등)",
                "AI 분석으로 할 일 목록 추출",
                "「이미지로 할 일 추출」 기능 이용 시 직접 업로드",
              ],
            ]}
          />
          <p className="mt-2">
            서비스는 위 항목 외의 개인정보를 수집하지 않습니다. 비밀번호는 수집하지
            않습니다(구글 로그인만 사용). 이용자가 서비스에 직접 입력하는
            목표·할 일·루틴·노트·가계부 등의 데이터는 서비스 제공 목적으로만 저장되며,{" "}
            <b>본인 계정으로만 접근할 수 있습니다.</b>
          </p>
          <p className="mt-2">
            <b>AI 기능 안내</b> — 「이미지로 할 일 추출」 기능을 이용하면 업로드한 이미지가
            분석을 위해 Anthropic, PBC의 AI 서비스(Claude API)로 전송됩니다. 서비스는 이미지를
            저장하지 않으며, 추출된 할 일 목록만 이용자가 확인·수정한 뒤 저장됩니다. Anthropic의
            정책상 API로 전송된 데이터는 AI 모델 학습에 이용되지 않습니다. 이 기능을 이용하지
            않으면 이미지가 전송되지 않습니다.
          </p>
        </Section>

        <Section title="2. 개인정보의 처리 및 보유 기간">
          <Table
            head={["항목", "보유 기간", "근거"]}
            rows={[
              ["회원 정보(이메일, 이름, 프로필 사진)", "회원 탈퇴(삭제 요청) 시까지", "이용자 동의"],
              ["이용자가 입력한 데이터", "회원 탈퇴(삭제 요청) 시까지", "서비스 제공"],
            ]}
          />
          <p className="mt-2">보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다.</p>
        </Section>

        <Section title="3. 개인정보의 파기 절차 및 방법">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>파기 절차</b> — 보유 기간이 지나거나 처리 목적이 달성된 개인정보는 지체 없이
              파기합니다.
            </li>
            <li>
              <b>파기 방법</b> — 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 영구
              삭제합니다.
            </li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>
            서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 따른 요구가
            있는 경우에 한해 제공할 수 있습니다. 광고 목적으로 개인정보를 사용하지 않습니다.
          </p>
        </Section>

        <Section title="5. 개인정보 처리의 위탁">
          <p className="mb-2">서비스는 원활한 운영을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
          <Table
            head={["수탁자", "위탁 업무"]}
            rows={[
              ["Vercel Inc.", "서비스 호스팅"],
              ["Neon Inc.", "데이터베이스 운영 및 보관"],
              ["Anthropic, PBC", "AI 이미지 분석(할 일 추출)"],
              ["Google LLC", "서비스 이용 통계 분석(구글 애널리틱스)"],
            ]}
          />
          <p className="mt-2">
            위탁 계약 시 개인정보가 안전하게 관리되도록 필요한 사항을 규정하고 있으며, 수탁자가
            변경되면 이 방침을 통해 공개합니다.
          </p>
        </Section>

        <Section title="6. 개인정보의 국외 이전">
          <p className="mb-2">서비스는 아래와 같이 개인정보를 국외로 이전하고 있습니다.</p>
          <Table
            head={["이전받는 자", "이전 국가", "이전 항목", "이용 목적", "보유 기간"]}
            rows={[
              [
                "Vercel Inc.",
                "미국",
                "접속 기록, 서비스 이용 기록",
                "서비스 호스팅",
                "위탁 계약 종료 시까지",
              ],
              [
                "Neon Inc.",
                "싱가포르",
                "이메일, 이름, 프로필 사진, 이용자가 입력한 데이터",
                "데이터 보관",
                "위탁 계약 종료 시까지",
              ],
              [
                "Anthropic, PBC",
                "미국",
                "이용자가 업로드한 이미지(AI 기능 이용 시)",
                "AI 분석(할 일 추출)",
                "분석 처리 시까지 (서비스는 이미지를 저장하지 않음)",
              ],
              [
                "Google LLC",
                "미국",
                "접속 기록, 유입 경로, 화면 이동 기록 (구글 애널리틱스 쿠키)",
                "서비스 이용 통계 분석",
                "구글 애널리틱스 보관 기간(최대 14개월)",
              ],
            ]}
          />
          <p className="mt-2">
            위 이전은 정보주체와의 계약 체결·이행을 위한 개인정보 처리위탁·보관에
            근거하며(「개인정보 보호법」 제28조의8에 따름), 서비스 이용 시 네트워크를 통한
            전송으로 이루어집니다. 이용자는 국외 이전을 거부할 수 있으며, 거부 시 서비스
            이용이 제한될 수 있습니다.
          </p>
        </Section>

        <Section title="7. 정보주체의 권리와 행사 방법">
          <p className="mb-2">이용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>개인정보 열람 요구</li>
            <li>오류가 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          <p className="mt-2">
            권리 행사는 <b>{CONTACT}</b> 로 요청하실 수 있으며, 서비스는 지체 없이 조치합니다.
          </p>
        </Section>

        <Section title="8. 개인정보의 안전성 확보 조치">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>관리적 조치</b> — 개인정보에 접근할 수 있는 인원을 운영자로 최소화
            </li>
            <li>
              <b>기술적 조치</b> — 데이터베이스 접근 권한 관리 및 접근 통제, 전송 구간
              암호화(HTTPS) 적용, 비밀번호를 직접 저장하지 않음(구글 로그인만 사용)
            </li>
            <li>
              <b>물리적 조치</b> — 개인정보는 클라우드 서비스에 보관되며, 별도의 물리적 보관
              장소를 두지 않습니다
            </li>
          </ul>
        </Section>

        <Section title="9. 자동 수집 장치(쿠키 등)의 설치·운영 및 거부">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>사용 목적</b> — 로그인 상태 유지, 유입 경로 파악 및 서비스 이용 통계
            </li>
            <li>
              <b>로그인 세션 쿠키</b> — 로그인 상태를 유지합니다. 로그아웃하거나 만료되면
              사라집니다.
            </li>
            <li>
              <b>유입 경로 쿠키(wid_ref)</b> — 어떤 홍보 링크를 통해 방문했는지를 기록해
              가입까지 이어졌는지 확인하는 데 씁니다. <b>30일</b> 뒤 자동으로 사라지며,
              링크 식별 코드만 담고 개인을 식별하는 정보는 담지 않습니다.
            </li>
            <li>
              <b>구글 애널리틱스(GA4)</b> — 방문자 수, 어느 경로로 들어왔는지, 어느 화면에서
              머물다 나갔는지를 집계하기 위해 구글의 분석 도구를 사용합니다. 이 과정에서
              구글이 자체 쿠키를 설치하며, 집계된 정보는 미국의 Google LLC 서버로 전송됩니다.
              이름·이메일 등 개인을 특정하는 정보는 보내지 않습니다.{" "}
              <a
                className="underline"
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noreferrer"
              >
                구글 애널리틱스 차단 부가기능
              </a>
              으로 수집을 거부할 수 있습니다.
            </li>
            <li>
              <b>홍보 링크 클릭 기록</b> — 홍보용 짧은 링크(<code>/l/…</code>,{" "}
              <code>/go/…</code>)를 누르면 클릭 시각과 직전 페이지 주소가 서버에 남습니다.
              누가 눌렀는지는 저장하지 않습니다.
            </li>
            <li>
              <b>거부 방법</b> — 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다. (예: Chrome
              → 설정 → 개인정보 보호 및 보안 → 쿠키) 쿠키 저장을 거부하면 로그인이 필요한
              기능을 이용할 수 없습니다.
            </li>
          </ul>
        </Section>

        <Section title="10. 개인정보 보호책임자">
          <p>
            서비스는 개인정보 처리에 관한 업무를 총괄하여 책임지는 개인정보 보호책임자를 아래와
            같이 지정하고 있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <b>개인정보 보호책임자</b>: {OFFICER}
            </li>
            <li>
              <b>연락처</b>: {CONTACT}
            </li>
          </ul>
          <p className="mt-2">
            개인정보 보호와 관련한 문의, 불만 처리, 피해 구제에 관한 사항을 위 연락처로
            문의하실 수 있습니다.
          </p>
        </Section>

        <Section title="11. 권익 침해 구제 방법">
          <p className="mb-2">개인정보 침해로 인한 상담·신고가 필요한 경우 아래 기관에 문의하실 수 있습니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>개인정보 침해신고센터 (한국인터넷진흥원) — privacy.kisa.or.kr / 국번 없이 118</li>
            <li>개인정보 분쟁조정위원회 — kopico.go.kr / 1833-6972</li>
            <li>대검찰청 사이버수사과 — spo.go.kr / 1301</li>
            <li>경찰청 사이버수사국 — ecrm.police.go.kr / 182</li>
          </ul>
        </Section>

        <Section title="12. 개인정보 유출 시 조치">
          <p>
            서비스는 개인정보의 분실·도난·유출·위조·변조·훼손 사실을 알게 된 경우, 「개인정보
            보호법」 제34조에 따라 이용자에게 알리고 필요한 경우 관계 기관에 신고합니다.
          </p>
        </Section>

        <Section title="13. 개인정보 처리방침의 변경">
          <p>
            이 방침은 {EFFECTIVE}부터 적용됩니다. (최초 시행: {FIRST_EFFECTIVE}) 내용의
            추가·삭제·수정이 있을 경우 변경 사항을 시행 최소 7일 전부터 서비스 내에 공지합니다.
          </p>
        </Section>
      </section>

      <footer className="border-t border-neutral-200 pt-4 text-sm text-neutral-400">
        본 방침은 서비스 변경에 따라 갱신될 수 있으며, 변경 시 이 페이지에 반영됩니다.
      </footer>
    </div>
  );
}
