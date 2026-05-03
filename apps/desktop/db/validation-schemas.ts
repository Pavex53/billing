import { z } from 'zod';
import { logger } from '../utils/logger';

const TextElementSchema = z.object({
  id: z.string(),
  type: z.literal('TEXT'),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  content: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.string().optional(),
  textDecoration: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  color: z.string().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
});

const ImageElementSchema = z.object({
  id: z.string(),
  type: z.literal('IMAGE'),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  src: z.string().optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
});

const BoxElementSchema = z.object({
  id: z.string(),
  type: z.literal('BOX'),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  opacity: z.number().optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
});

const TableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  width: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

const TableRowSchema = z.object({
  cells: z.record(z.string()),
});

const TableElementSchema = z.object({
  id: z.string(),
  type: z.literal('TABLE'),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  tableData: z.object({
    columns: z.array(TableColumnSchema),
    rows: z.array(TableRowSchema),
  }).optional(),
  tableHeaderBg: z.string().optional(),
  tableHeaderColor: z.string().optional(),
  tableBorderColor: z.string().optional(),
  tableFontSize: z.number().optional(),
  tableCellPadding: z.number().optional(),
  tableHeaderStyle: z.enum(['bold', 'normal']).optional(),
  tableAlternateRow: z.boolean().optional(),
  tableAlternateColor: z.string().optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
});

const LineElementSchema = z.object({
  id: z.string(),
  type: z.literal('LINE'),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeDash: z.array(z.number()).optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
});

const QRCodeElementSchema = z.object({
  id: z.string(),
  type: z.literal('PLACEHOLDER'),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  placeholder: z.string().optional(),
  qrData: z.object({
    content: z.string(),
  }).optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
});

export const TemplateElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ImageElementSchema,
  BoxElementSchema,
  TableElementSchema,
  LineElementSchema,
  QRCodeElementSchema,
]);

export const AddressSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(['billing', 'shipping', 'other']).optional(),
  label: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isDefaultBilling: z.boolean().optional(),
  isDefaultShipping: z.boolean().optional(),
});

export const InvoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  price: z.number(),
  total: z.number(),
  articleId: z.string().optional(),
  category: z.string().optional(),
  vatRate: z.number().optional(),
  discount: z.number().optional(),
});

// Plural alias used by recurringRepo and other consumers
export const InvoiceItemsSchema = z.array(InvoiceItemSchema);

const CompanySettingsSchema = z.object({
  name: z.string(),
  owner: z.string().optional().default(''),
  street: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  city: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  website: z.string().optional().default(''),
  logoBase64: z.string().optional(),
});

const FinanceSettingsSchema = z.object({
  bankName: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  bic: z.string().optional().default(''),
  taxId: z.string().optional().default(''),
  vatId: z.string().optional().default(''),
  registerCourt: z.string().optional().default(''),
});

const NumbersSettingsSchema = z.object({
  invoicePrefix: z.string().optional().default('RE-%Y-'),
  nextInvoiceNumber: z.number().optional().default(1),
  numberLength: z.number().optional().default(3),
  offerPrefix: z.string().optional().default('ANG-%Y-'),
  nextOfferNumber: z.number().optional().default(1),
  customerPrefix: z.string().optional().default('KD-'),
  nextCustomerNumber: z.number().optional().default(1),
  customerNumberLength: z.number().optional().default(4),
});

const DunningLevelSchema = z.object({
  id: z.union([z.string(), z.number()]),
  level: z.number().optional(),
  name: z.string(),
  daysAfterDue: z.number().optional(),
  daysAfterDueDate: z.number().optional(),
  feeAmount: z.number().optional(),
  fee: z.number().optional(),
  introText: z.string().optional(),
  footerText: z.string().optional(),
  emailSubject: z.string().optional(),
  subject: z.string().optional(),
  emailBody: z.string().optional(),
  text: z.string().optional(),
  enabled: z.boolean().optional(),
});

const DunningSettingsSchema = z.object({
  levels: z.array(DunningLevelSchema).optional().default([]),
});

const LegalSettingsSchema = z.object({
  smallBusinessRule: z.boolean().optional().default(false),
  defaultVatRate: z.number().optional().default(19),
  taxAccountingMethod: z.enum(['soll', 'ist']).optional().default('soll'),
  paymentTermsDays: z.number().optional().default(14),
  defaultIntroText: z.string().optional().default(''),
  defaultFooterText: z.string().optional().default(''),
});

const PortalSettingsSchema = z.object({
  baseUrl: z.string().optional().default(''),
});

const EInvoiceSettingsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  standard: z.literal('zugferd-en16931').optional().default('zugferd-en16931'),
  profile: z.literal('EN16931').optional().default('EN16931'),
  version: z.literal('2.3').optional().default('2.3'),
});

const EmailSettingsSchema = z.object({
  provider: z.enum(['smtp', 'resend', 'none']).optional().default('none'),
  smtpHost: z.string().optional().default(''),
  smtpPort: z.number().optional().default(587),
  smtpSecure: z.boolean().optional().default(true),
  smtpUser: z.string().optional().default(''),
  fromName: z.string().optional().default(''),
  fromEmail: z.string().optional().default(''),
});

const AutomationSettingsSchema = z.object({
  dunningEnabled: z.boolean().optional().default(false),
  dunningRunTime: z.string().optional().default('09:00'),
  lastDunningRun: z.string().optional(),
  recurringEnabled: z.boolean().optional().default(false),
  recurringRunTime: z.string().optional().default('03:00'),
  lastRecurringRun: z.string().optional(),
});

const CatalogSettingsSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional().default([]),
});

const DashboardSettingsSchema = z.object({
  monthlyRevenueGoal: z.number().optional().default(30000),
  dueSoonDays: z.number().optional().default(7),
  topCategoriesLimit: z.number().optional().default(5),
  recentPaymentsLimit: z.number().optional().default(5),
  topClientsLimit: z.number().optional().default(5),
});

const OutputSettingsSchema = z.object({
  pdfOutputPath: z.string().optional().default(''),
});

export const SettingsSchema = z.object({
  company: CompanySettingsSchema,
  finance: FinanceSettingsSchema,
  numbers: NumbersSettingsSchema,
  dunning: DunningSettingsSchema,
  legal: LegalSettingsSchema,
  portal: PortalSettingsSchema.optional().default({ baseUrl: '' }),
  eInvoice: EInvoiceSettingsSchema.optional().default({
    enabled: false,
    standard: 'zugferd-en16931',
    profile: 'EN16931',
    version: '2.3',
  }),
  email: EmailSettingsSchema.optional().default({
    provider: 'none',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    fromName: '',
    fromEmail: '',
  }),
  automation: AutomationSettingsSchema.optional().default({
    dunningEnabled: false,
    dunningRunTime: '09:00',
    recurringEnabled: false,
    recurringRunTime: '03:00',
  }),
  catalog: CatalogSettingsSchema.optional().default({ categories: [] }),
  dashboard: DashboardSettingsSchema.optional().default({
    monthlyRevenueGoal: 30000,
    dueSoonDays: 7,
    topCategoriesLimit: 5,
    recentPaymentsLimit: 5,
    topClientsLimit: 5,
  }),
  output: OutputSettingsSchema.optional().default({ pdfOutputPath: '' }),
});

// Tags schema (for clients)
export const TagsSchema = z.array(z.string());

// Generic fallback for unknown JSON structures
export const UnknownJsonSchema = z.unknown();

/**
 * Safe JSON parse with validation
 * Returns parsed data or default value on error
 */
export function safeJsonParse<T>(
  jsonString: string | null,
  schema: z.ZodType<T>,
  defaultValue: T,
  context?: string
): T {
  if (!jsonString || jsonString === 'null') {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return schema.parse(parsed);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('JSONValidation', `${context || 'Unknown context'}: ${errorMessage}`, error as Error, {
      rawJson: jsonString?.substring(0, 200)
    });
    return defaultValue;
  }
}

/**
 * Safe JSON parse that throws on error (for critical data)
 */
export function strictJsonParse<T>(
  jsonString: string | null,
  schema: z.ZodType<T>,
  context?: string
): T {
  if (!jsonString || jsonString === 'null') {
    throw new Error(`${context || 'JSON'}: Null or empty JSON string`);
  }

  try {
    const parsed = JSON.parse(jsonString);
    return schema.parse(parsed);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('JSONValidation', `${context || 'Unknown context'}: ${errorMessage}`, error as Error, {
      rawJson: jsonString?.substring(0, 200)
    });
    throw new Error(`${context || 'JSON'} validation failed: ${errorMessage}`);
  }
}
