import type Database from 'better-sqlite3';
import type { AppSettings } from '../types';
import { SettingsSchema } from './validation-schemas';
import { logger } from '../utils/logger';

const normalizeSettings = (settings: unknown): AppSettings => {
  const next = settings as Partial<AppSettings>;
  if (!next.portal) {
    next.portal = { baseUrl: '' };
  } else if (typeof next.portal.baseUrl !== 'string') {
    next.portal.baseUrl = '';
  }
  if (!next.eInvoice) {
    next.eInvoice = {
      enabled: false,
      standard: 'zugferd-en16931',
      profile: 'EN16931',
      version: '2.3',
    };
  } else {
    if (typeof next.eInvoice.enabled !== 'boolean') next.eInvoice.enabled = false;
    if (next.eInvoice.standard !== 'zugferd-en16931') next.eInvoice.standard = 'zugferd-en16931';
    if (next.eInvoice.profile !== 'EN16931') next.eInvoice.profile = 'EN16931';
    if (next.eInvoice.version !== '2.3') next.eInvoice.version = '2.3';
  }
  if (!next.email) {
    next.email = {
      provider: 'none',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      fromName: '',
      fromEmail: '',
    };
  }
  if (!next.numbers) {
    next.numbers = {
      invoicePrefix: 'RE-%Y-',
      nextInvoiceNumber: 1,
      numberLength: 3,
      offerPrefix: 'ANG-%Y-',
      nextOfferNumber: 1,
      customerPrefix: 'KD-',
      nextCustomerNumber: 1,
      customerNumberLength: 4,
    };
  } else {
    if (typeof next.numbers.customerPrefix !== 'string') next.numbers.customerPrefix = 'KD-';
    if (typeof next.numbers.nextCustomerNumber !== 'number' || !Number.isFinite(next.numbers.nextCustomerNumber)) next.numbers.nextCustomerNumber = 1;
    if (typeof next.numbers.customerNumberLength !== 'number' || !Number.isFinite(next.numbers.customerNumberLength)) next.numbers.customerNumberLength = 4;
  }
  if (!next.automation) {
    next.automation = {
      dunningEnabled: false,
      dunningRunTime: '09:00',
      recurringEnabled: false,
      recurringRunTime: '03:00',
    };
  } else {
    if (typeof next.automation.recurringEnabled !== 'boolean') next.automation.recurringEnabled = false;
    if (typeof next.automation.recurringRunTime !== 'string') next.automation.recurringRunTime = '03:00';
  }
  if (!next.output) {
    next.output = { pdfOutputPath: '' };
  } else if (typeof next.output.pdfOutputPath !== 'string') {
    next.output.pdfOutputPath = '';
  }
  return next as AppSettings;
};

export const getSettings = (db: Database.Database): AppSettings | null => {
  const row = db.prepare('SELECT settings_json FROM settings WHERE id = 1').get() as
    | { settings_json: string | object }
    | undefined;
  if (!row) return null;
  try {
    // better-sqlite3 may return already-parsed object if column was stored without JSON.stringify
    const raw = row.settings_json;
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return normalizeSettings(parsed);
  } catch (e) {
    logger.error('Failed to parse settings', { error: String(e) });
    return null;
  }
};

export const setSettings = (db: Database.Database, settings: AppSettings): void => {
  const validation = SettingsSchema.safeParse(settings);
  if (!validation.success) {
    logger.warn('Settings validation warning', { issues: validation.error.issues });
  }
  db.prepare('UPDATE settings SET settings_json = ? WHERE id = 1').run(
    JSON.stringify(settings),
  );
};
