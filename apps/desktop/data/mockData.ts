import { v4 as uuidv4 } from 'uuid';
import type { AppSettings } from '../types';
import type { RecurringProfile } from '../types/recurring';

// ─── Mock Settings ───────────────────────────────────────────────────────────

export const MOCK_SETTINGS: AppSettings = {
  portal: {
    baseUrl: '',
  },
  eInvoice: {
    enabled: false,
    standard: 'zugferd-en16931',
    profile: 'EN16931',
    version: '2.3',
  },
  catalog: {
    categories: [
      { id: 'cat-webdesign', name: 'Webdesign' },
      { id: 'cat-consulting', name: 'Consulting' },
      { id: 'cat-dev', name: 'Entwicklung' },
      { id: 'cat-hosting', name: 'Hosting' },
    ],
  },
  company: {
    name: 'Mustermann GmbH',
    owner: 'Max Mustermann',
    street: 'Musterstraße 123',
    zip: '10115',
    city: 'Berlin',
    email: 'info@mustermann-gmbh.de',
    phone: '+49 30 1234567',
    website: 'www.mustermann-gmbh.de'
  },
  finance: {
    bankName: 'Berliner Sparkasse',
    iban: 'DE12 1005 0000 1234 5678 90',
    bic: 'BELA DE BE XXX',
    taxId: '12/345/67890',
    vatId: 'DE123456789',
    registerCourt: 'Amtsgericht Charlottenburg HRB 12345'
  },
  numbers: {
    invoicePrefix: 'RE-%Y-',
    nextInvoiceNumber: 104,
    numberLength: 3,
    offerPrefix: 'ANG-%Y-',
    nextOfferNumber: 42,
    customerPrefix: 'KD-',
    nextCustomerNumber: 4,
    customerNumberLength: 4,
  },
  dunning: {
    levels: [
      {
        id: 1,
        name: 'Zahlungserinnerung',
        enabled: true,
        daysAfterDueDate: 7,
        fee: 0,
        subject: 'Zahlungserinnerung zur Rechnung %N',
        text: 'Sicherlich haben Sie in der Hektik des Alltags übersehen, unsere Rechnung %N vom %D zu begleichen. Wir bitten Sie, den fälligen Betrag innerhalb der nächsten 7 Tage zu überweisen.'
      },
      {
        id: 2,
        name: '1. Mahnung',
        enabled: true,
        daysAfterDueDate: 14,
        fee: 2.50,
        subject: '1. Mahnung zur Rechnung %N',
        text: 'Leider konnten wir bisher keinen Zahlungseingang für die Rechnung %N feststellen. Bitte überweisen Sie den fälligen Betrag zzgl. der Mahngebühr umgehend.'
      },
      {
        id: 3,
        name: '2. Mahnung',
        enabled: true,
        daysAfterDueDate: 21,
        fee: 5.00,
        subject: 'Letzte Mahnung zur Rechnung %N',
        text: 'Dies ist die letzte Aufforderung, die offene Forderung zur Rechnung %N zu begleichen, bevor wir das gerichtliche Mahnverfahren einleiten.'
      }
    ]
  },
  legal: {
    smallBusinessRule: false,
    defaultVatRate: 19,
    taxAccountingMethod: 'soll',
    paymentTermsDays: 14,
    defaultIntroText: 'Vielen Dank für Ihren Auftrag. Wir stellen Ihnen folgende Leistungen in Rechnung:',
    defaultFooterText: 'Es gelten unsere Allgemeinen Geschäftsbedingungen.'
  },
  email: {
    provider: 'none',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    fromName: '',
    fromEmail: ''
  },
  automation: {
    dunningEnabled: false,
    dunningRunTime: '09:00',
    recurringEnabled: true,
    recurringRunTime: '03:00'
  },
  dashboard: {
    monthlyRevenueGoal: 30000,
    dueSoonDays: 7,
    topCategoriesLimit: 5,
    recentPaymentsLimit: 5,
    topClientsLimit: 5,
  },
  output: {
    pdfOutputPath: '',
  },
};
