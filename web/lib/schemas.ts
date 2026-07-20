import { z } from "zod";

/* ─── primitives ────────────────────────────────────────────────────── */
export const Uuid = z.string().uuid();
/** Russian month name as stored in DB ("Январь"…"Декабрь") */
export const MonthName = z.string().min(1).max(20);
export const Year = z.coerce.number().int().min(2020).max(2100);
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
  month: MonthName,
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
  month: MonthName,
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
  month: MonthName,
  year: Year,
  gross: z.coerce.number(),
  total: z.coerce.number(),
});
export type Salary = z.infer<typeof Salary>;

/* ─── project_revenues ───────────────────────────────────────────────── */
export const ProjectRevenue = z.object({
  id: Uuid,
  project_name: z.string().max(200),
  month: MonthName,
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
  .enum(["active", "support", "paused", "completed"])
  .catch("active");

export const BillingMode = z.enum(["fixed", "tm"]).catch("fixed");

export const Project = z.object({
  id: Uuid,
  name: z.string().min(1).max(200),
  status: ProjectStatus.optional(),
  start_date: ISODate,
  expected_duration: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  payment_terms: z.string().max(2000).nullable().optional(),
  manager_emails: z.string().max(2000).nullable().optional(),
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
  sort_order: z.number().int().optional(),
  group_label: z.string().max(80).nullable().optional(),
  proxy_role: z.enum(["face", "worker"]).nullable().optional(),
  proxy_bonus: z.coerce.number().nullable().optional(),
  billing_mode: BillingMode.optional(),
  created_at: z.string().optional(),
});
export type ProjectMember = z.infer<typeof ProjectMember>;

export const ProjectMemberInsert = ProjectMember.omit({
  id: true,
  created_at: true,
});

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

/* ─── invoices ───────────────────────────────────────────────────────── */
export const InvoiceFrequency = z
  .enum(["monthly", "quarterly", "once"])
  .catch("monthly");
export const InvoiceStatus = z
  .enum(["to_issue", "issued", "paid", "cancelled"])
  .catch("to_issue");

export const InvoiceTemplate = z.object({
  id: Uuid,
  project_id: Uuid,
  client_name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  amount: z.coerce.number(),
  currency: z.string().min(1).max(8).default("USD"),
  frequency: InvoiceFrequency.optional(),
  issue_day: z.coerce.number().int().min(1).max(28).nullable().optional(),
  payment_terms_days: z.coerce.number().int().min(0).default(14),
  next_issue_date: ISODate,
  last_issued_at: z.string().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type InvoiceTemplate = z.infer<typeof InvoiceTemplate>;

export const InvoiceTemplateInsert = InvoiceTemplate.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const InvoiceTemplateUpdate = InvoiceTemplateInsert.partial();

export const Invoice = z.object({
  id: Uuid,
  template_id: Uuid.nullable().optional(),
  project_id: Uuid,
  client_name: z.string().min(1).max(200),
  invoice_number: z.string().max(80).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  planned_amount: z.coerce.number().nullable().optional(),
  amount: z.coerce.number(),
  currency: z.string().min(1).max(8).default("USD"),
  status: InvoiceStatus.optional(),
  scheduled_date: ISODate,
  issue_date: ISODate,
  due_date: ISODate,
  paid_date: ISODate,
  paid_amount: z.coerce.number().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type Invoice = z.infer<typeof Invoice>;

export const InvoiceInsert = Invoice.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const InvoiceUpdate = InvoiceInsert.partial();

/* ─── document reminders ─────────────────────────────────────────── */
export const DocumentReminder = z.object({
  id: Uuid,
  project_id: Uuid,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  expected_day: z.coerce.number().int().min(1).max(28),
  recurring: z.boolean().optional(),
  last_received_at: z.string().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type DocumentReminder = z.infer<typeof DocumentReminder>;

export const DocumentReminderInsert = DocumentReminder.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const DocumentReminderUpdate = DocumentReminderInsert.partial();

/* ─── developer_status ───────────────────────────────────────────────── */
export const DevStatus = z.object({
  dev_name: z.string().max(120),
  status: z.enum(["active", "inactive"]).default("active"),
  role: z.string().max(80).nullable().optional(),
  employment_type: EmploymentType.optional().nullable(),
  salary: z.coerce.number().nullable().optional(),
  default_hours_load: z.coerce.number().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  updated_at: z.string().optional(),
});
export type DevStatus = z.infer<typeof DevStatus>;
