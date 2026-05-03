

import React, { useState } from 'react';
import {
  Building2, Landmark, FileDigit, Scale,
  Save, CheckCircle, HelpCircle, AlertCircle, Megaphone, Globe, Tags, Plus, Trash2, AlertTriangle, Mail, Repeat, FolderOpen
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppSettings, EmailProvider, AutomationSettings } from '../ipc/schemas';
import { useIpc } from '../hooks/useIpc';
import { Switch } from './ui/Switch';

type SettingsTab = 'company' | 'invoice' | 'email' | 'automation' | 'system' | 'account' | 'pdf';

export const SettingsView: React.FC = () => {
  const ipc = useIpc();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [backupPath, setBackupPath] = useState('');
  const [pdfExportPath, setPdfExportPath] = useState('');

  const { data: loadedSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => ipc.settings.get(),
  });

  const [settings, setSettings] = useState<AppSettings>(() => ({
    company: {
      name: '',
      street: '',
      zip: '',
      city: '',
      country: 'DE',
      email: '',
      phone: '',
      website: '',
      taxId: '',
      vatId: '',
      registerCourt: '',
      registerNumber: '',
      bankName: '',
      iban: '',
      bic: '',
      logo: '',
    },
    invoice: {
      defaultDueDays: 14,
      defaultTaxRate: 19,
      defaultCurrency: 'EUR',
      invoicePrefix: 'RE',
      offerPrefix: 'AN',
      customerPrefix: 'KD',
      nextInvoiceNumber: 1,
      nextOfferNumber: 1,
      nextCustomerNumber: 1,
      defaultPaymentTerms: '',
      defaultNotes: '',
      showLogo: true,
      showSignatureLine: false,
    },
    email: {
      provider: 'smtp' as EmailProvider,
      fromName: '',
      fromEmail: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
    },
    automation: {} as AutomationSettings,
    system: {},
  }));

  React.useEffect(() => {
    if (loadedSettings) {
      setSettings(loadedSettings);
      setPdfExportPath(loadedSettings.system?.exportPath ?? '');
    }
  }, [loadedSettings]);

  const setSettingsMutation = useMutation({
    mutationFn: (s: AppSettings) => ipc.settings.set(s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const sanitizedSettings: AppSettings = {
        ...settings,
        company: {
          ...settings.company,
          logo: settings.company?.logo ?? '',
        },
      };
      const finalSettings = {
        ...sanitizedSettings,
        system: {
          ...sanitizedSettings.system,
          exportPath: pdfExportPath.trim() || undefined,
        },
      };
      setSettings(finalSettings);
      await setSettingsMutation.mutateAsync(finalSettings);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'Firma', icon: <Building2 size={16} /> },
    { id: 'invoice', label: 'Rechnungen', icon: <FileDigit size={16} /> },
    { id: 'email', label: 'E-Mail', icon: <Mail size={16} /> },
    { id: 'automation', label: 'Automatisierung', icon: <Repeat size={16} /> },
    { id: 'system', label: 'System', icon: <Scale size={16} /> },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'company':
        return (
          <div className="max-w-2xl space-y-10 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Firmendaten</h3>
              <p className="text-sm text-gray-500">Diese Daten erscheinen auf deinen Rechnungen und Angeboten.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Allgemein</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">FIRMENNAME</label>
                    <input
                      value={settings.company?.name ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, name: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Muster GmbH"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">STRASSE</label>
                    <input
                      value={settings.company?.street ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, street: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Musterstraße 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">PLZ</label>
                    <input
                      value={settings.company?.zip ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, zip: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">STADT</label>
                    <input
                      value={settings.company?.city ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, city: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Musterstadt"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">LAND</label>
                    <input
                      value={settings.company?.country ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, country: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="DE"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Kontakt</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">E-MAIL</label>
                    <input
                      value={settings.company?.email ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, email: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="info@musterfirma.de"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">TELEFON</label>
                    <input
                      value={settings.company?.phone ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, phone: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">WEBSITE</label>
                    <input
                      value={settings.company?.website ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, website: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="https://musterfirma.de"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Steuern & Register</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">STEUERNUMMER</label>
                    <input
                      value={settings.company?.taxId ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, taxId: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="123/456/78901"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">UST-ID</label>
                    <input
                      value={settings.company?.vatId ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, vatId: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="DE123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">REGISTERGERICHT</label>
                    <input
                      value={settings.company?.registerCourt ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, registerCourt: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Amtsgericht Musterstadt"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">REGISTERNUMMER</label>
                    <input
                      value={settings.company?.registerNumber ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, registerNumber: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="HRB 12345"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Bankverbindung</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">BANK</label>
                    <input
                      value={settings.company?.bankName ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, bankName: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Musterbank"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">IBAN</label>
                    <input
                      value={settings.company?.iban ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, iban: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="DE12 3456 7890 1234 5678 90"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">BIC</label>
                    <input
                      value={settings.company?.bic ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, company: { ...s.company, bic: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="MUSTDEBBXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Logo</h4>
                  <p className="text-sm text-gray-500">Wird auf Rechnungen und Angeboten angezeigt.</p>
                </div>
                <div className="space-y-3">
                  {settings.company?.logo && (
                    <div className="flex items-center gap-3">
                      <img
                        src={settings.company.logo}
                        alt="Logo"
                        className="h-16 w-auto object-contain rounded-lg border border-gray-200 bg-white p-2"
                      />
                      <button
                        onClick={() => setSettings(s => ({ ...s, company: { ...s.company, logo: '' } }))}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                      >
                        Entfernen
                      </button>
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <Plus size={14} />
                    <span className="text-sm font-medium">Logo hochladen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result as string;
                          setSettings(s => ({ ...s, company: { ...s.company, logo: result } }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'invoice':
        return (
          <div className="max-w-2xl space-y-10 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Rechnungseinstellungen</h3>
              <p className="text-sm text-gray-500">Standardwerte für neue Rechnungen und Angebote.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Nummernkreise</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">RECHNUNGS-PRÄFIX</label>
                    <input
                      value={settings.invoice?.invoicePrefix ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, invoicePrefix: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="RE"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">ANGEBOTS-PRÄFIX</label>
                    <input
                      value={settings.invoice?.offerPrefix ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, offerPrefix: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="AN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">KUNDEN-PRÄFIX</label>
                    <input
                      value={settings.invoice?.customerPrefix ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, customerPrefix: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="KD"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Standardwerte</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">ZAHLUNGSZIEL (TAGE)</label>
                    <input
                      type="number"
                      value={settings.invoice?.defaultDueDays ?? 14}
                      onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, defaultDueDays: parseInt(e.target.value) || 14 } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">STEUERSATZ (%)</label>
                    <input
                      type="number"
                      value={settings.invoice?.defaultTaxRate ?? 19}
                      onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, defaultTaxRate: parseFloat(e.target.value) || 19 } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">WÄHRUNG</label>
                    <input
                      value={settings.invoice?.defaultCurrency ?? 'EUR'}
                      onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, defaultCurrency: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="EUR"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">ZAHLUNGSBEDINGUNGEN</label>
                  <textarea
                    value={settings.invoice?.defaultPaymentTerms ?? ''}
                    onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, defaultPaymentTerms: e.target.value } }))}
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Zahlbar innerhalb von 14 Tagen ohne Abzug."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">STANDARD-FUSSZEILE</label>
                  <textarea
                    value={settings.invoice?.defaultNotes ?? ''}
                    onChange={(e) => setSettings(s => ({ ...s, invoice: { ...s.invoice, defaultNotes: e.target.value } }))}
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Vielen Dank für Ihren Auftrag."
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Anzeige</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">Logo auf Rechnungen anzeigen</span>
                    <Switch
                      checked={settings.invoice?.showLogo ?? true}
                      onChange={(v) => setSettings(s => ({ ...s, invoice: { ...s.invoice, showLogo: v } }))}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">Unterschriftszeile anzeigen</span>
                    <Switch
                      checked={settings.invoice?.showSignatureLine ?? false}
                      onChange={(v) => setSettings(s => ({ ...s, invoice: { ...s.invoice, showSignatureLine: v } }))}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="max-w-2xl space-y-10 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">E-Mail</h3>
              <p className="text-sm text-gray-500">Konfiguriere deinen Mail-Server für den Versand von Rechnungen.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Absender</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">NAME</label>
                    <input
                      value={settings.email?.fromName ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, email: { ...s.email, fromName: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">E-MAIL</label>
                    <input
                      value={settings.email?.fromEmail ?? ''}
                      onChange={(e) => setSettings(s => ({ ...s, email: { ...s.email, fromEmail: e.target.value } }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      placeholder="rechnungen@musterfirma.de"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Anbieter</h4>
                <div className="flex gap-3">
                  {(['smtp', 'resend'] as EmailProvider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSettings(s => ({ ...s, email: { ...s.email, provider: p } }))}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                        settings.email?.provider === p
                          ? 'bg-accent text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {settings.email?.provider === 'smtp' && (
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold">SMTP-Konfiguration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-2">SMTP-HOST</label>
                      <input
                        value={settings.email?.smtpHost ?? ''}
                        onChange={(e) => setSettings(s => ({ ...s, email: { ...s.email, smtpHost: e.target.value } }))}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">PORT</label>
                      <input
                        type="number"
                        value={settings.email?.smtpPort ?? 587}
                        onChange={(e) => setSettings(s => ({ ...s, email: { ...s.email, smtpPort: parseInt(e.target.value) || 587 } }))}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch
                        checked={settings.email?.smtpSecure ?? false}
                        onChange={(v) => setSettings(s => ({ ...s, email: { ...s.email, smtpSecure: v } }))}
                      />
                      <span className="text-sm font-medium">SSL/TLS</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">BENUTZERNAME</label>
                      <input
                        value={settings.email?.smtpUser ?? ''}
                        onChange={(e) => setSettings(s => ({ ...s, email: { ...s.email, smtpUser: e.target.value } }))}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">PASSWORT</label>
                      <SmtpPasswordField settings={settings} setSettings={setSettings} ipc={ipc} />
                    </div>
                  </div>
                </div>
              )}

              {settings.email?.provider === 'resend' && (
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold">Resend API-Konfiguration</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">API-SCHLÜSSEL</label>
                    <ResendApiKeyField settings={settings} setSettings={setSettings} ipc={ipc} />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Verbindung testen</h4>
                <EmailTestSection settings={settings} ipc={ipc} />
              </div>
            </div>
          </div>
        );

      case 'automation':
        return (
          <div className="max-w-2xl space-y-10 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Automatisierung</h3>
              <p className="text-sm text-gray-500">Automatische Erinnerungen und Mahnungen konfigurieren.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Mahnsystem</h4>
                    <p className="text-sm text-gray-500">Automatisch Mahnungen bei überfälligen Rechnungen versenden.</p>
                  </div>
                  <Switch
                    checked={settings.automation?.dunning?.enabled ?? false}
                    onChange={(v) => setSettings(s => ({
                      ...s,
                      automation: {
                        ...s.automation,
                        dunning: { ...s.automation?.dunning, enabled: v }
                      }
                    }))}
                  />
                </div>

                {settings.automation?.dunning?.enabled && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">MAHNGEBÜHR (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.automation?.dunning?.feeAmount ?? 0}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          automation: {
                            ...s.automation,
                            dunning: { ...s.automation?.dunning, feeAmount: parseFloat(e.target.value) || 0 }
                          }
                        }))}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-3">MAHNSTUFEN</label>
                      <DunningLevelsEditor settings={settings} setSettings={setSettings} />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Wiederkehrende Rechnungen</h4>
                    <p className="text-sm text-gray-500">Automatisch Rechnungen aus Vorlagen erstellen.</p>
                  </div>
                  <Switch
                    checked={settings.automation?.recurring?.enabled ?? false}
                    onChange={(v) => setSettings(s => ({
                      ...s,
                      automation: {
                        ...s.automation,
                        recurring: { ...s.automation?.recurring, enabled: v }
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="max-w-2xl space-y-10 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">System</h3>
              <p className="text-sm text-gray-500">Datenbankpfade, Backups und Systemeinstellungen.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">PDF-Exportpfad</h4>
                  <p className="text-sm text-gray-500">
                    Ordner, in dem exportierte PDFs gespeichert werden. Leer lassen für Standard.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={pdfExportPath}
                    onChange={(e) => setPdfExportPath(e.target.value)}
                    placeholder="Standard-Downloadordner"
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    onClick={async () => {
                      const res = await ipc.dialog.pickFolder({ title: 'PDF-Exportpfad auswählen' });
                      if (res.path) setPdfExportPath(res.path);
                    }}
                    className="px-4 py-3 rounded-xl font-bold bg-white border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
                    title="Ordner auswählen"
                  >
                    <FolderOpen size={16} />
                    Durchsuchen
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Backup</h4>
                  <p className="text-sm text-gray-500">Erstelle eine Sicherungskopie deiner Datenbank.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={backupPath}
                      onChange={(e) => setBackupPath(e.target.value)}
                      placeholder="Backup-Pfad (optional)"
                      className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <BackupButton ipc={ipc} backupPath={backupPath} />
                    <RestoreButton ipc={ipc} />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Audit</h4>
                  <p className="text-sm text-gray-500">Überprüfe die Integrität deiner Buchhaltungsdaten.</p>
                </div>
                <AuditSection ipc={ipc} />
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Updates</h4>
                </div>
                <UpdateSection ipc={ipc} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 border-r border-gray-100 p-4 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-accent/10 text-accent'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        {renderTab()}
      </div>

      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white shadow-lg transition-all ${
            saveState === 'saved'
              ? 'bg-green-500'
              : saveState === 'error'
              ? 'bg-red-500'
              : 'bg-accent hover:bg-accent/90'
          }`}
        >
          {saveState === 'saved' ? (
            <><CheckCircle size={18} /> Gespeichert</>
          ) : saveState === 'error' ? (
            <><AlertCircle size={18} /> Fehler</>
          ) : saveState === 'saving' ? (
            <><Save size={18} className="animate-pulse" /> Speichern...</>
          ) : (
            <><Save size={18} /> Speichern</>
          )}
        </button>
      </div>
    </div>
  );
};

const SmtpPasswordField: React.FC<{ settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; ipc: ReturnType<typeof useIpc> }> = ({ ipc }) => {
  const [value, setValue] = useState('');
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    ipc.secrets.get({ key: 'smtp.password' }).then((v) => {
      if (v) setValue(v);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <div className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-400">Laden...</div>;

  return (
    <input
      type="password"
      value={value}
      onChange={async (e) => {
        setValue(e.target.value);
        if (e.target.value) {
          await ipc.secrets.set({ key: 'smtp.password', value: e.target.value });
        } else {
          await ipc.secrets.delete({ key: 'smtp.password' });
        }
      }}
      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
      placeholder="••••••••"
    />
  );
};

const ResendApiKeyField: React.FC<{ settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; ipc: ReturnType<typeof useIpc> }> = ({ ipc }) => {
  const [value, setValue] = useState('');
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    ipc.secrets.get({ key: 'resend.apiKey' }).then((v) => {
      if (v) setValue(v);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <div className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-400">Laden...</div>;

  return (
    <input
      type="password"
      value={value}
      onChange={async (e) => {
        setValue(e.target.value);
        if (e.target.value) {
          await ipc.secrets.set({ key: 'resend.apiKey', value: e.target.value });
        } else {
          await ipc.secrets.delete({ key: 'resend.apiKey' });
        }
      }}
      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
      placeholder="re_••••••••"
    />
  );
};

const EmailTestSection: React.FC<{ settings: AppSettings; ipc: ReturnType<typeof useIpc> }> = ({ settings, ipc }) => {
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTest = async () => {
    setStatus('sending');
    try {
      const res = await ipc.email.testConfig({
        provider: settings.email?.provider ?? 'smtp',
        smtpHost: settings.email?.smtpHost,
        smtpPort: settings.email?.smtpPort,
        smtpSecure: settings.email?.smtpSecure,
        smtpUser: settings.email?.smtpUser,
      });
      if (res.success) {
        setStatus('ok');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setErrorMsg(res.error ?? 'Unbekannter Fehler');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Fehler');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="test@example.com"
          className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleTest}
          disabled={status === 'sending'}
          className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors"
        >
          {status === 'sending' ? 'Senden...' : 'Testen'}
        </button>
      </div>
      {status === 'ok' && <p className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle size={14} /> Test erfolgreich</p>}
      {status === 'error' && <p className="text-sm text-red-600 font-medium flex items-center gap-1"><AlertCircle size={14} /> {errorMsg}</p>}
    </div>
  );
};

const BackupButton: React.FC<{ ipc: ReturnType<typeof useIpc>; backupPath: string }> = ({ ipc }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle');

  const handleBackup = async () => {
    setStatus('running');
    try {
      await ipc.db.backup();
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleBackup}
      disabled={status === 'running'}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
        status === 'ok' ? 'bg-green-500 text-white' :
        status === 'error' ? 'bg-red-500 text-white' :
        'bg-white border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {status === 'running' ? 'Backup...' : status === 'ok' ? 'Gesichert ✓' : status === 'error' ? 'Fehler' : 'Backup erstellen'}
    </button>
  );
};

const RestoreButton: React.FC<{ ipc: ReturnType<typeof useIpc> }> = ({ ipc }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle');

  const handleRestore = async () => {
    const res = await ipc.dialog.pickCsv({ title: 'Backup-Datei wählen' });
    if (!res.path) return;
    setStatus('running');
    try {
      await ipc.db.restore({ path: res.path });
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleRestore}
      disabled={status === 'running'}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
        status === 'ok' ? 'bg-green-500 text-white' :
        status === 'error' ? 'bg-red-500 text-white' :
        'bg-white border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {status === 'running' ? 'Wiederherstellen...' : status === 'ok' ? 'Wiederhergestellt ✓' : status === 'error' ? 'Fehler' : 'Wiederherstellen'}
    </button>
  );
};

const AuditSection: React.FC<{ ipc: ReturnType<typeof useIpc> }> = ({ ipc }) => {
  const [result, setResult] = useState<{ ok: boolean; count: number; errors: { sequence: number; message: string }[] } | null>(null);
  const [running, setRunning] = useState(false);

  const handleVerify = async () => {
    setRunning(true);
    try {
      const res = await ipc.audit.verify();
      setResult(res);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleVerify}
        disabled={running}
        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
      >
        {running ? 'Prüfe...' : 'Audit durchführen'}
      </button>
      {result && (
        <div className={`p-3 rounded-xl text-sm ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.ok ? (
            <p className="font-medium">✓ Audit OK — {result.count} Einträge geprüft</p>
          ) : (
            <div>
              <p className="font-bold mb-1">✗ {result.errors.length} Fehler gefunden</p>
              {result.errors.slice(0, 3).map((e) => (
                <p key={e.sequence} className="text-xs">{e.sequence}: {e.message}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const UpdateSection: React.FC<{ ipc: ReturnType<typeof useIpc> }> = ({ ipc }) => {
  const { data: status, refetch } = useQuery({
    queryKey: ['updater-status'],
    queryFn: () => ipc.updater.getStatus(),
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {status?.status === 'idle' && <span>Kein Update verfügbar</span>}
        {status?.status === 'checking' && <span>Prüfe auf Updates...</span>}
        {status?.status === 'available' && <span className="font-medium text-accent">Version {status.version} verfügbar</span>}
        {status?.status === 'downloading' && <span>Lädt herunter... {status.progress?.toFixed(0)}%</span>}
        {status?.status === 'downloaded' && <span className="font-medium text-green-600">Bereit zur Installation</span>}
        {status?.status === 'error' && <span className="text-red-500">{status.error}</span>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Prüfen
        </button>
        {status?.status === 'available' && (
          <button
            onClick={() => ipc.updater.downloadUpdate()}
            className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors"
          >
            Herunterladen
          </button>
        )}
        {status?.status === 'downloaded' && (
          <button
            onClick={() => ipc.updater.quitAndInstall()}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
          >
            Jetzt installieren
          </button>
        )}
      </div>
    </div>
  );
};

const DunningLevelsEditor: React.FC<{ settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ settings, setSettings }) => {
  const levels = settings.automation?.dunning?.levels ?? [];

  const addLevel = () => {
    const newLevel = { level: levels.length + 1, daysAfterDue: (levels.length + 1) * 7, subject: '', body: '' };
    setSettings(s => ({
      ...s,
      automation: {
        ...s.automation,
        dunning: { ...s.automation?.dunning, levels: [...levels, newLevel] }
      }
    }));
  };

  const removeLevel = (index: number) => {
    setSettings(s => ({
      ...s,
      automation: {
        ...s.automation,
        dunning: { ...s.automation?.dunning, levels: levels.filter((_, i) => i !== index) }
      }
    }));
  };

  const updateLevel = (index: number, field: string, value: unknown) => {
    setSettings(s => ({
      ...s,
      automation: {
        ...s.automation,
        dunning: {
          ...s.automation?.dunning,
          levels: levels.map((l, i) => i === index ? { ...l, [field]: value } : l)
        }
      }
    }));
  };

  return (
    <div className="space-y-3">
      {levels.map((level, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Mahnstufe {level.level}</span>
            <button onClick={() => removeLevel(index)} className="text-red-500 hover:text-red-700">
              <Trash2 size={14} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">TAGE NACH FÄLLIGKEIT</label>
            <input
              type="number"
              value={level.daysAfterDue}
              onChange={(e) => updateLevel(index, 'daysAfterDue', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">BETREFF</label>
            <input
              value={level.subject}
              onChange={(e) => updateLevel(index, 'subject', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              placeholder="Mahnung: Rechnung {invoiceNumber} überfällig"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">NACHRICHTENTEXT</label>
            <textarea
              value={level.body}
              onChange={(e) => updateLevel(index, 'body', e.target.value)}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="Sehr geehrte/r {clientName}, ..."
            />
          </div>
        </div>
      ))}
      <button
        onClick={addLevel}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Plus size={14} />
        Mahnstufe hinzufügen
      </button>
    </div>
  );
};
