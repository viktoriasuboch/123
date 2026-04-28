import { z } from "zod";

/* ─── primitives ────────────────────────────────────────────────────── */
export const Uuid = z.string().uuid();
export const MonthIdx = z.number().int().min(0).max(11); // legacy uses 0-based months
export const Year = z.number().int().min(2020).max(2100);
export const ISODate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .nullable()
  .optional();

/* ─── people / entries (leadgen) ─────────────────────────────────────── */
export const Person = z.object({
  id: Uuid,
  name: z.string().min(1).max(100),
  sort_order: z.number().int().nullable().optional(),
});
export type Person = z.infer<typeof Person>;

export const Entry = z.object({
  id: Uuid,
  person_id: Uuid,
  month: MonthIdx,
  year: Year.nullable(),
  cat: z.string().max(50),
  name: z.string().max(200),
  comment: z.string().max(1000).nullable().optional(),
  bonus: z.coerce.number(),
  sort_order: z.number().int().nullable().optional(),
});
export type Entry = z.infer<typeof Entry>;

/* ─── deals ──────────────────────────────────────────────────────────── */
export const DealType = z.enum(["sql", "qualified", "closed"]).catch("sql");
export const Deal = z.object({
  id: Uuid,
  project: z.string().max(200),
  leadgen: z.string().max(100).nullable().optional(),
  month: MonthIdx,
  year: Year.nullable(),
  bonus: z.coerce.number(),
  revenue: z.coerce.string().nullable().optional(),
  comment: z.string().max(1000).nullable().optional(),
  deal_type: DealType.optional(),
  created_at: z.string().optional(),
});
export type Deal = z.infer<typeof Deal>;

export const DealInsert = Deal.omit({ id: true, created_at: true });
export const DealUpdate = DealInsert.partial();

/* ─── salaries ───────────────────────────────────────────────────────── */
export const Salary = z.object({
  id: Uuid,
  leadgen_name: z.string().max(100),
  month: MonthIdx,
  year: Year,
  gross: z.coerce.number(),
  total: z.coerce.number(),
});
export type Salary = z.infer<typeof Salary>;

/* ─── project_revenues ───────────────────────────────────────────────── */
export const ProjectRevenue = z.object({
  id: Uuid,
  project_name: z.string().max(200),
  month: MonthIdx,
  year: Year.nullable(),
  amount: z.coerce.number(),
  note: z.string().max(1000).nullable().optional(),
  created_at: z.string().optional(),
});
export type ProjectRevenue = z.infer<typeof ProjectRevenue>;

export const ProjectRevenueInsert = ProjectRevenue.omit({
  id: true,
  created_at: true,
});

/* ─── projects + members + events ────────────────────────────────────── */
export const ProjectStatus = z
  .enum(["active", "completed", "paused"])
  .catch("active");

export const Project = z.object({
  id: Uuid,
  name: z.string().min(1).max(200),
  status: ProjectStatus.optional(),
  start_date: ISODate,
  expected_duration: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  created_at: z.string().optional(),
});
export type Project = z.infer<typeof Project>;

export const ProjectInsert = Project.omit({ id: true, created_at: true });
export const ProjectUpdate = ProjectInsert.partial();

export const EmploymentType = z.enum(["staff", "freelancer"]).catch("freelancer");

export const ProjectMember = z.object({
  id: Uuid,
  project_id: Uuid,
  dev_name: z.string().max(120),
  role: z.string().max(80).nullable().optional(),
  employment_type: EmploymentType.optional(),
  buy_rate: z.coerce.number().default(0),
  sell_rate: z.coerce.number().default(0),
  salary: z.coerce.number().default(0),
  hours_load: z.coerce.number().default(0),
  dev_start_date: ISODate,
  dev_end_date: ISODate,
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
});
export type ProjectMember = z.infer<typeof ProjectMember>;

export const ProjectMemberInsert = ProjectMember.omit({
  id: true,
  created_at: true,
});
export const ProjectMemberUpdate = ProjectMemberInsert.partial();

export const EventType = z.enum([
  "note",
  "rate_change",
  "join",
  "leave",
  "status_change",
]).catch("note");

export const ProjectEvent = z.object({
  id: Uuid,
  project_id: Uuid,
  event_type: EventType.optional(),
  description: z.string().max(2000).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
  created_at: z.string().optional(),
});
export type ProjectEvent = z.infer<typeof ProjectEvent>;

export const ProjectEventInsert = ProjectEvent.omit({
  id: true,
  created_at: true,
});

/* ─── developer_status ───────────────────────────────────────────────── */
export const DevStatus = z.object({
  dev_name: z.string().max(120),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().max(1000).nullable().optional(),
  updated_at: z.string().optional(),
});
export type DevStatus = z.infer<typeof DevStatus>;
