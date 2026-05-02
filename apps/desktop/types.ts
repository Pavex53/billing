

export enum ElementType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  BOX = 'BOX',
  LINE = 'LINE',
  TABLE = 'TABLE',
  PLACEHOLDER = 'PLACEHOLDER',
}

export interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  // TEXT
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  placeholder?: string; // for PLACEHOLDER type
  // IMAGE
  src?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  // BOX
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  // LINE
  strokeColor?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  // TABLE
  tableData?: string[][];
  tableHeaderBg?: string;
  tableHeaderColor?: string;
  tableBorderColor?: string;
  tableFontSize?: number;
  tableCellPadding?: number;
  tableHeaderStyle?: 'bold' | 'normal';
  tableAlternateRow?: boolean;
  tableAlternateColor?: string;
  zIndex?: number;
  locked?: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  pageWidth: number;
  pageHeight: number;
  elements: TemplateElement[];
  createdAt: string;
  updatedAt: string;
}

export interface DunningLevel {
  id: string;
  level: number; // 1, 2, 3 ...
  name: string; // "1. Mahnung", "2. Mahnung" ...
  daysAfterDue: number; // trigger X days after due date
  feeAmount: number; // additional fee in EUR
  introText: string;
  footerText: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface AppSettings {
  company: {
    name: string;
    owner: string;
    street: string;
    zip: string;
    city: string;
    email: string;
    phone: string;
    website: string;
  };
  catalog: {
    categories: Array<{
      id: string;
      name: string;
    }>;
  };
  finance: {
    bankName: string;
    iban: string;
    bic: string;
    taxId: string; // Steuernummer
    vatId: string; // USt-IdNr
    registerCourt: string; // Amtsgericht
  };
  numbers: {
    invoicePrefix: string; // e.g. "RE-2023-"
    nextInvoiceNumber: number; // e.g. 104
    numberLength: number; // e.g. 3 for "001"
    offerPrefix: string;
    nextOfferNumber: number;
    customerPrefix: string;
    nextCustomerNumber: number;
    customerNumberLength: number;
  };
  dunning: {
    levels: DunningLevel[];
  };
  legal: {
    smallBusinessRule: boolean; // Kleinunternehmer §19
    defaultVatRate: number;
    taxAccountingMethod: 'soll' | 'ist'; // Soll-/Ist-Versteuerung (default: soll)
    paymentTermsDays: number;
    defaultIntroText: string;
    defaultFooterText: string;
  };
  portal: {
    baseUrl: string;
  };
  eInvoice: {
    enabled: boolean;
    standard: 'zugferd-en16931';
    profile: 'EN16931';
    version: '2.3';
  };
  email: {
    provider: 'smtp' | 'resend' | 'none';
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    // smtpPassword is stored in OS keychain as 'smtp.password'
    fromName: string;
    fromEmail: string;
    // resendApiKey is stored in OS keychain as 'resend.apiKey'
  };
  automation: {
    dunningEnabled: boolean;
    dunningRunTime: string; // HH:MM format, e.g., "09:00"
    lastDunningRun?: string; // ISO timestamp
    recurringEnabled: boolean; // Auto-generate recurring invoices
    recurringRunTime: string; // HH:MM format, e.g., "03:00"
    lastRecurringRun?: string; // ISO timestamp
  };
  dashboard: {
    monthlyRevenueGoal: number;
    dueSoonDays: number;
    topCategoriesLimit: number;
    recentPaymentsLimit: number;
    topClientsLimit: number;
  };
  output: {
    pdfOutputPath: string; // custom folder for saved PDFs
  };
}

// --- Invoice Data Types ---

export type InvoiceStatus = 'paid' | 'open' | 'overdue' | 'draft' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
  articleId?: string;
  category?: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method?: string;
  note?: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string; // client id
  clientSnapshot?: ClientSnapshot;
  date: string; // ISO date string
  dueDate?: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  notes?: string;
  introText?: string;
  footerText?: string;
  templateId?: string;
  payments?: Payment[];
  type: 'invoice' | 'offer';
  projectId?: string;
  dunningLevel?: number; // 0 = no dunning, 1 = first dunning, etc.
  lastDunningDate?: string; // ISO date string
  dunningFeeTotal?: number; // accumulated dunning fees
  recurringSourceId?: string; // id of the recurring config that spawned this invoice
  attachments?: InvoiceAttachment[];
  eInvoiceXml?: string; // ZUGFeRD XML string, if generated
}

export interface ClientSnapshot {
  name: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  email?: string;
  vatId?: string;
  taxId?: string;
  customerNumber?: string;
}

export interface InvoiceAttachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64
  size: number;
  createdAt: string;
}

export type ClientStatus = 'active' | 'inactive' | 'lead';

export interface Client {
  id: string;
  customerNumber?: string;
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxId?: string;
  notes?: string;
  status?: ClientStatus;
  createdAt?: string;
  tags?: string[];
  contactPersons?: ContactPerson[];
  iban?: string;
  bic?: string;
  bankName?: string;
  paymentTermsDays?: number;
  defaultDiscount?: number;
}

export interface ContactPerson {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface Article {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  vatRate?: number;
  category?: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  status: 'active' | 'completed' | 'paused';
  startDate?: string;
  endDate?: string;
  budget?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export type RecurringFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface RecurringConfig {
  id: string;
  name: string;
  clientId: string;
  templateInvoiceId?: string;
  frequency: RecurringFrequency;
  startDate: string; // ISO date
  endDate?: string; // ISO date, optional
  nextRunDate: string; // ISO date
  lastRunDate?: string; // ISO date
  enabled: boolean;
  items: InvoiceItem[];
  introText?: string;
  footerText?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}
