import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  real,
  bigint,
} from "drizzle-orm/pg-core";

// ── 사용자: 구글 로그인 = 회원가입. 모든 데이터는 user_id로 격리 ──
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  // 개인정보 수집·이용 동의 입증용 - 최초 가입 시 기록
  privacyAgreedAt: timestamp("privacy_agreed_at"),
  privacyPolicyVersion: text("privacy_policy_version"),
  /* 관리자 플래그 - /admin 접근 권한. 환경변수 대신 DB로 판별한다 */
  isAdmin: boolean("is_admin").notNull().default(false),
  /* 유입 추적 - 첫 가입 시 타고 들어온 숏링크 코드 (퍼스트터치, 이후 로그인에 덮이지 않음) */
  signupLinkCode: text("signup_link_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── UTM 채널 프리셋: 뿌리는 곳(스레드·인스타·오카방…)을 카드로 관리 ──
export const utmChannels = pgTable("utm_channels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  source: text("source").notNull(),
  medium: text("medium").notNull(),
  /* 숏링크 코드 접두어 (예: th-post → /l/th-post-reel02) */
  slug: text("slug").notNull(),
  /* 이 채널에 링크 걸 때의 팁 한 줄 */
  hint: text("hint"),
  sort: integer("sort").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
});

// ── UTM 숏링크: 어드민이 만드는 유입 추적 링크 (/l/{code} → 타겟+UTM 리다이렉트) ──
export const shortLinks = pgTable("short_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  code: text("code").notNull().unique(),
  targetPath: text("target_path").notNull().default("/landing"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  /* 어디에 뿌렸는지 메모 - 나중에 성과와 붙이기 위한 기록 */
  note: text("note"),
  /* 채널 프리셋으로 만든 링크면 그 채널 */
  channelId: integer("channel_id").references(() => utmChannels.id),
  /* 만든 사람 (팀으로 쓸 때 구분용) */
  creator: text("creator"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 숏링크 클릭 로그: 익명 집계용 (개인정보 없음 - 시각·리퍼러만) ──
export const linkClicks = pgTable("link_clicks", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id")
    .notNull()
    .references(() => shortLinks.id),
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
  referer: text("referer"),
});

// ── 영역: 최상위 카테고리. pillar = Work/Life/Money 3기둥 ──
export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  icon: text("icon"),
  pillar: text("pillar", { enum: ["work", "life", "money"] })
    .notNull()
    .default("life"),
  guideline: text("guideline"),
  sort: integer("sort").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
});

// ── 목표: metric_* 컬럼이 자동 진척률 엔진 ──
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  areaId: integer("area_id").references(() => areas.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: text("status", { enum: ["active", "done", "hold"] })
    .notNull()
    .default("active"),
  metricType: text("metric_type", {
    enum: ["manual", "milestone", "routine_count", "task_rate", "money"],
  })
    .notNull()
    .default("milestone"),
  metricTarget: real("metric_target"),
  metricCurrent: real("metric_current"),
  /* 감소형 목표(감량 등)의 출발점 - 있으면 (현재-시작)/(목표-시작)으로 진척률 계산 */
  metricStart: real("metric_start"),
  metricUnit: text("metric_unit"),
  moneyAccountId: integer("money_account_id"),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("done_at"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  areaId: integer("area_id").references(() => areas.id),
  goalId: integer("goal_id").references(() => goals.id),
  title: text("title").notNull(),
  purpose: text("purpose"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status", { enum: ["planned", "active", "done", "hold"] })
    .notNull()
    .default("active"),
  guideline: text("guideline"),
  retro: text("retro"),
});

// 인박스 = projectId IS NULL AND dueDate IS NULL
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  areaId: integer("area_id").references(() => areas.id),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("done_at"),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kpis = pgTable("kpis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  target: real("target"),
  actual: real("actual"),
  unit: text("unit"),
});

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  goalId: integer("goal_id").references(() => goals.id),
  areaId: integer("area_id").references(() => areas.id),
  title: text("title").notNull(),
  status: text("status", { enum: ["active", "stopped"] })
    .notNull()
    .default("active"),
  targetFreqWeekly: integer("target_freq_weekly"),
  /* 루틴 기간 - 둘 다 있으면 기간 히트맵, 없으면 상시(매일) 루틴 */
  startDate: date("start_date"),
  endDate: date("end_date"),
});

// 루틴 원터치 기록 - 클릭 시각 자동 저장
export const routineLogs = pgTable("routine_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  routineId: integer("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  areaId: integer("area_id").references(() => areas.id),
  goalId: integer("goal_id").references(() => goals.id),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  type: text("type", { enum: ["note", "file", "link", "reference"] })
    .notNull()
    .default("note"),
  importance: integer("importance").notNull().default(1),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  bodyMd: text("body_md"),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  scope: text("scope", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  date: date("date").notNull(),
  planMd: text("plan_md"),
  retroMd: text("retro_md"),
});

// ── 돈: 자산 계좌(수기 잔액) + 월별 스냅샷 + 일일가계부 ──
export const moneyAccounts = pgTable("money_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", {
    enum: ["savings", "invest", "realestate", "loan", "pension"],
  }).notNull(),
  name: text("name").notNull(),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const moneySnapshots = pgTable("money_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => moneyAccounts.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // YYYY-MM
  balance: bigint("balance", { mode: "number" }).notNull(),
});

export const moneyTxns = pgTable("money_txns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  date: date("date").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  direction: text("direction", { enum: ["income", "expense"] }).notNull(),
  category: text("category").notNull(),
  accountId: integer("account_id").references(() => moneyAccounts.id),
  memo: text("memo"),
});
