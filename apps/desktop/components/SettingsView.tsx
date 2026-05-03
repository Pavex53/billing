import React, { useState, useRef } from 'react';
import {
  Building2, Landmark, FileDigit, Scale,
  Save, CheckCircle, HelpCircle, AlertCircle, Tags, Plus, Trash2,
  Download, Upload, FolderOpen
} from 'lucide-react';
import { Button } from '@billme/ui';
import { AppSettings } from '../types';
import { MOCK_SETTINGS } from '../data/mockData';
import { ipc } from '../ipc/client';
import { useSetSettingsMutation, useSettingsQuery } from '../hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

const normalizeCategoryName = (value: string): string => value.trim();

export const SettingsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'company' | 'catalog' | 'finance' | 'numbers' | 'legal' | 'system'
  >('company');
  const { data: loadedSettings } = useSettingsQuery();
  const setSettingsMutation = useSetSettingsMutation();
  const [settings, setSettings] = useState<AppSettings>(loadedSettings ?? MOCK_SETTINGS);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (loadedSettings) setSettings(loadedSettings);
  }, [loadedSettings]);

  const handleSave = async () => {
    const normalizeCategoryList = (list: Array<{ id: string; name: string }>) => {
      const seen = new Set<string>();
      const out: Array<{ id: string; name: string }> = [];
      for (const item of list) {
        const normalized = normalizeCategoryName(item.name);
        if (!normalized) continue;
        const key = normalized.toLocaleLowerCase('de-DE');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...item, name: normalized });
      }
      return out;
    };

    const prevCategories = normalizeCategoryList(loadedSettings?.catalog?.categories ?? []);
    const nextCategories = normalizeCategoryList(settings.catalog?.categories ?? []);

    const prevById = new Map(prevCategories.map((c) => [c.id, c]));
    const nextById = new Map(nextCategories.map((c) => [c.id, c]));

    const renameMap = new Map<string, string>();
    const removedNames: string[] = [];

    for (const prev of prevCategories) {
      const next = nextById.get(prev.id);
      if (!next) {
        removedNames.push(prev.name);
        continue;
      }
      if (prev.name !== next.name) {
        renameMap.set(prev.name, next.name);
      }
    }

    const fallbackCategoryName =
      nextCategories[0]?.name?.trim() ||
      prevCategories[0]?.name?.trim() ||
      'Allgemein';
    const allowedCategoryNames = new Set(nextCategories.map((c) => c.name));

    if (renameMap.size > 0 || removedNames.length > 0 || allowedCategoryNames.size > 0) {
      const articles = await ipc.articles.list();
      let changed = 0;
      for (const a of articles) {
        const old = normalizeCategoryName(a.category);
        const renamed = renameMap.get(old);
        const moved = removedNames.includes(old) ? fallbackCategoryName : undefined;
        const categoryFromRules = renamed ?? moved ?? old;
        const nextCategory = allowedCategoryNames.has(categoryFromRules)
          ? categoryFromRules
          : fallbackCategoryName;
        if (!nextCategory || nextCategory === old) continue;
        changed++;
        await ipc.articles.upsert({ article: { ...a, category: nextCategory } });
      }
      if (changed > 0) {
        await queryClient.invalidateQueries({ queryKey: ['articles'] });
      }
    }

    const sanitizedSettings: AppSettings = {
      ...settings,
      catalog: {
        categories: nextCategories.length > 0
          ? nextCategories
          : [{ id: uuidv4(), name: 'Allgemein' }],
      },
    };

    setSettings(sanitizedSettings);
    await setSettingsMutation.mutateAsync(sanitizedSettings);

    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleExportSettings = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billme-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const imported: AppSettings = parsed?.settings ?? parsed;
        if (!imported?.company || !imported?.finance || !imported?.numbers) {
          throw new Error('Ungültige Einstellungsdatei.');
        }
        setSettings(imported);
        await setSettingsMutation.mutateAsync(imported);
        setImportStatus({ success: true, message: 'Einstellungen erfolgreich importiert!' });
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err) {
        setImportStatus({ success: false, message: `Import fehlgeschlagen: ${String(err)}` });
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const updateNested = (section: keyof AppSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const formatPreview = (prefix: string, counter: number, length: number) => {
    const safeCounter = Number.isFinite(counter) ? Math.max(1, Math.floor(counter)) : 1;
    const safeLength = Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 3;
    return prefix.replace(/%Y/g, new Date().getFullYear().toString())
      + safeCounter.toString().padStart(safeLength, '0');
  };

  const parsePositiveInteger = (value: string, fallback: number, min = 1) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, parsed);
  };
  const nextInvoicePreview = formatPreview(
    settings.numbers.invoicePrefix,
    settings.numbers.nextInvoiceNumber,
    settings.numbers.numberLength,
  );
  const nextCustomerPreview = formatPreview(
    settings.numbers.customerPrefix,
    settings.numbers.nextCustomerNumber,
    settings.numbers.customerNumberLength,
  );

  const navItems = [
    { id: 'company', label: 'Stammdaten', icon: Building2, desc: 'Adresse & Kontakt' },
    { id: 'catalog', label: 'Kategorien', icon: Tags, desc: 'Produkte & Leistungen' },
    { id: 'finance', label: 'Finanzen', icon: Landmark, desc: 'Bank & Steuern' },
    { id: 'numbers', label: 'Nummernkreise', icon: FileDigit, desc: 'Rechnungs-, Angebots- & Kundennr.' },
    { id: 'legal', label: 'Rechtliches', icon: Scale, desc: 'AGB & Steuerregeln' },
    { id: 'system', label: 'System', icon: AlertCircle, desc: 'Backup & Audit' },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'company':
        return (
          <div className="max-w-2xl space-y-8 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Unternehmensdaten</h3>
              <p className="text-gray-500 text-sm">Diese Informationen erscheinen im Kopf- und Fußbereich der Rechnung.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Firmenname</label>
                <input
                  type="text"
                  value={settings.company.name}
                  onChange={(e) => updateNested('company', 'name', e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-bold text-gray-900 focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Inhaber / Geschäftsführer</label>
                <input
                  type="text"
                  value={settings.company.owner}
                  onChange={(e) => updateNested('company', 'owner', e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Straße & Hausnr.</label>
                  <input
                    type="text"
                    value={settings.company.street}
                    onChange={(e) => updateNested('company', 'street', e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">PLZ</label>
                  <input
                    type="text"
                    value={settings.company.zip}
                    onChange={(e) => updateNested('company', 'zip', e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Stadt</label>
                <input
                  type="text"
                  value={settings.company.city}
                  onChange={(e) => updateNested('company', 'city', e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
              <div className="border-t border-gray-100 my-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">E-Mail Adresse</label>
                  <input
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => updateNested('company', 'email', e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Telefon</label>
                  <input
                    type="text"
                    value={settings.company.phone}
                    onChange={(e) => updateNested('company', 'phone', e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Webseite</label>
                <input
                  type="text"
                  value={settings.company.website}
                  onChange={(e) => updateNested('company', 'website', e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
            </div>
          </div>
        );
      case 'catalog':
        return (
          <div className="max-w-2xl space-y-8 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Kategorien</h3>
              <p className="text-gray-500 text-sm">
                Kategorien für „Produkte & Leistungen". Änderungen können beim Speichern automatisch in Artikeln
                übernommen werden.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm uppercase flex items-center gap-2">
                  <Tags size={16} /> Kategorien
                </h4>
                <button
                  onClick={() => {
                    setSettings((prev) => ({
                      ...prev,
                      catalog: {
                        categories: [
                          ...(prev.catalog?.categories ?? []),
                          { id: uuidv4(), name: 'Neu' },
                        ],
                      },
                    }));
                  }}
                  className="px-4 py-2 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Kategorie
                </button>
              </div>

              {(settings.catalog?.categories ?? []).length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-gray-100 text-sm text-gray-500">
                  Noch keine Kategorien. Lege Kategorien an, damit du sie bei Artikeln auswählen kannst.
                </div>
              ) : (
                <div className="space-y-3">
                  {(settings.catalog?.categories ?? []).map((cat, idx) => (
                    <div key={cat.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100 animate-enter" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Name
                        </label>
                        <input
                          value={cat.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setSettings((prev) => {
                              const list = [...(prev.catalog?.categories ?? [])];
                              list[idx] = { ...list[idx]!, name };
                              return { ...prev, catalog: { categories: list } };
                            });
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSettings((prev) => {
                            const list = (prev.catalog?.categories ?? []).filter((c) => c.id !== cat.id);
                            return { ...prev, catalog: { categories: list } };
                          });
                        }}
                        className="w-10 h-10 rounded-full bg-error-bg text-error hover:bg-error-bg/80 transition-colors flex items-center justify-center"
                        title="Kategorie entfernen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'finance':
        return (
          <div className="max-w-2xl space-y-8 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Bankverbindung & Steuer</h3>
              <p className="text-gray-500 text-sm">Wichtig für den Zahlungsverkehr und die Pflichtangaben auf der Rechnung.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase">
                <Landmark size={16} /> Bankkonto
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">Bankname</label>
                  <input
                    type="text"
                    value={settings.finance.bankName}
                    onChange={(e) => updateNested('finance', 'bankName', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">IBAN</label>
                    <input
                      type="text"
                      value={settings.finance.iban}
                      onChange={(e) => updateNested('finance', 'iban', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-accent outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">BIC</label>
                    <input
                      type="text"
                      value={settings.finance.bic}
                      onChange={(e) => updateNested('finance', 'bic', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-accent outline-none transition-shadow"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Steuernummer</label>
                <input
                  type="text"
                  value={settings.finance.taxId}
                  onChange={(e) => updateNested('finance', 'taxId', e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">USt-IdNr.</label>
                <input
                  type="text"
                  value={settings.finance.vatId}
                  onChange={(e) => updateNested('finance', 'vatId', e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Registergericht / HRB</label>
              <input
                type="text"
                value={settings.finance.registerCourt}
                onChange={(e) => updateNested('finance', 'registerCourt', e.target.value)}
                placeholder="z.B. Amtsgericht Berlin HRB 12345"
                className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow"
              />
            </div>
          </div>
        );
      case 'numbers':
        return (
          <div className="max-w-2xl space-y-8 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Nummernkreise</h3>
              <p className="text-gray-500 text-sm">Definieren Sie das Format für Ihre Rechnungs-, Angebots- und Kundennummern.</p>
            </div>

            <div className="bg-black/5 rounded-3xl p-6 border border-black/5">
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold flex items-center gap-2">
                  <FileDigit size={18} /> Rechnungen
                </h4>
                <div className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase mr-2">Vorschau:</span>
                  <span className="font-mono font-bold">{nextInvoicePreview}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Präfix Format</label>
                    <div className="group relative">
                      <HelpCircle size={12} className="text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black text-white text-xs p-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        %Y = Aktuelles Jahr (z.B. 2023)
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.numbers.invoicePrefix}
                    onChange={(e) => updateNested('numbers', 'invoicePrefix', e.target.value)}
                    className="w-full bg-white border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Nächste Nummer</label>
                  <input
                    type="number"
                    value={settings.numbers.nextInvoiceNumber}
                    min={1}
                    onChange={(e) => updateNested(
                      'numbers',
                      'nextInvoiceNumber',
                      parsePositiveInteger(e.target.value, settings.numbers.nextInvoiceNumber),
                    )}
                    className="w-full bg-white border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Mindestlänge (Padding)</label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={settings.numbers.numberLength}
                  onChange={(e) => updateNested(
                    'numbers',
                    'numberLength',
                    parsePositiveInteger(e.target.value, settings.numbers.numberLength),
                  )}
                  className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs font-bold text-gray-400 mt-1">
                  <span>1</span>
                  <span>{settings.numbers.numberLength} Stellen (z.B. 001)</span>
                  <span>6</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold flex items-center gap-2">
                  <FileDigit size={18} /> Angebote
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Präfix Format</label>
                  <input
                    type="text"
                    value={settings.numbers.offerPrefix}
                    onChange={(e) => updateNested('numbers', 'offerPrefix', e.target.value)}
                    className="w-full bg-white border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Nächste Nummer</label>
                  <input
                    type="number"
                    value={settings.numbers.nextOfferNumber}
                    min={1}
                    onChange={(e) => updateNested(
                      'numbers',
                      'nextOfferNumber',
                      parsePositiveInteger(e.target.value, settings.numbers.nextOfferNumber),
                    )}
                    className="w-full bg-white border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold flex items-center gap-2">
                  <FileDigit size={18} /> Kunden
                </h4>
                <div className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase mr-2">Vorschau:</span>
                  <span className="font-mono font-bold">{nextCustomerPreview}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Präfix Format</label>
                  <input
                    type="text"
                    value={settings.numbers.customerPrefix}
                    onChange={(e) => updateNested('numbers', 'customerPrefix', e.target.value)}
                    className="w-full bg-white border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Nächste Nummer</label>
                  <input
                    type="number"
                    value={settings.numbers.nextCustomerNumber}
                    min={1}
                    onChange={(e) => updateNested(
                      'numbers',
                      'nextCustomerNumber',
                      parsePositiveInteger(e.target.value, settings.numbers.nextCustomerNumber),
                    )}
                    className="w-full bg-white border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Mindestlänge (Padding)</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={settings.numbers.customerNumberLength}
                  onChange={(e) => updateNested(
                    'numbers',
                    'customerNumberLength',
                    parsePositiveInteger(e.target.value, settings.numbers.customerNumberLength),
                  )}
                  className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs font-bold text-gray-400 mt-1">
                  <span>1</span>
                  <span>{settings.numbers.customerNumberLength} Stellen (z.B. 0001)</span>
                  <span>8</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'legal':
        return (
          <div className="max-w-2xl space-y-8 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">Rechtliches & Texte</h3>
              <p className="text-gray-500 text-sm">Steuerliche Einstellungen und Standardtexte.</p>
            </div>

            <div
              className="bg-white border-2 border-gray-100 rounded-3xl p-6 hover:border-black transition-colors cursor-pointer"
              onClick={() => updateNested('legal', 'smallBusinessRule', !settings.legal.smallBusinessRule)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${settings.legal.smallBusinessRule ? 'bg-black border-black' : 'border-gray-300'}`}
                  >
                    {settings.legal.smallBusinessRule && <CheckCircle size={14} className="text-accent" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kleinunternehmerregelung anwenden</h4>
                    <p className="text-xs text-gray-500 mt-1">Keine Umsatzsteuerberechnung gem. § 19 UStG.</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="bg-white border-2 border-gray-100 rounded-3xl p-6 hover:border-black transition-colors cursor-pointer"
              onClick={() => updateNested('eInvoice', 'enabled', !settings.eInvoice.enabled)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${settings.eInvoice.enabled ? 'bg-black border-black' : 'border-gray-300'}`}
                  >
                    {settings.eInvoice.enabled && <CheckCircle size={14} className="text-accent" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">ZUGFeRD Export für Rechnungen aktivieren</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Exportiert Rechnungen als ZUGFeRD EN16931 (Profil {settings.eInvoice.profile}, Version {settings.eInvoice.version}).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className={settings.legal.smallBusinessRule ? 'opacity-30 pointer-events-none' : ''}>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Standard Umsatzsteuer (%)</label>
                <input
                  type="number"
                  value={settings.legal.defaultVatRate}
                  onChange={(e) => updateNested('legal', 'defaultVatRate', parseFloat(e.target.value))}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-bold text-gray-900 focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Zahlungsziel (Tage)</label>
                <input
                  type="number"
                  value={settings.legal.paymentTermsDays}
                  onChange={(e) => updateNested('legal', 'paymentTermsDays', parseInt(e.target.value))}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 font-bold text-gray-900 focus:ring-2 focus:ring-accent outline-none transition-shadow"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-6">
              <h4 className="font-bold text-sm mb-2">Umsatzsteuer-Basis (Dashboard)</h4>
              <p className="text-xs text-gray-500 mb-4">
                Soll: basiert auf gestellten Rechnungen (Status ≠ Entwurf) nach Rechnungsdatum. Ist: basiert auf erfassten Zahlungen nach Zahlungsdatum.
              </p>
              <div className="flex items-center gap-2 bg-gray-100/80 p-1.5 rounded-full border border-gray-200 w-fit">
                {(['soll', 'ist'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => updateNested('legal', 'taxAccountingMethod', m)}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                      (settings.legal.taxAccountingMethod ?? 'soll') === m
                        ? 'bg-black text-white shadow-md'
                        : 'text-gray-500 hover:bg-white hover:text-black hover:shadow-sm'
                    }`}
                  >
                    {m === 'soll' ? 'Soll' : 'Ist'}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-sm mb-4">Standardtexte</h4>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Einleitungstext (Standard)</label>
                <textarea
                  value={settings.legal.defaultIntroText}
                  onChange={(e) => updateNested('legal', 'defaultIntroText', e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-accent outline-none resize-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Fußzeilentext (Zusatz)</label>
                <textarea
                  value={settings.legal.defaultFooterText}
                  onChange={(e) => updateNested('legal', 'defaultFooterText', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-accent outline-none resize-none transition-shadow"
                />
              </div>
            </div>
          </div>
        );
      case 'system':
        return (
          <div className="max-w-2xl space-y-10 animate-enter">
            <div>
              <h3 className="text-xl font-bold mb-1">System</h3>
              <p className="text-gray-500 text-sm">PDF-Ausgabe, Audit-Log, Backup und Einstellungs-Export/Import.</p>
            </div>

            {/* PDF Output Path */}
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <FolderOpen size={20} className="text-gray-700" />
                <h4 className="text-lg font-bold text-gray-900">PDF Speicherordner</h4>
              </div>
              <p className="text-sm text-gray-500">
                Ordner, in dem exportierte PDFs automatisch gespeichert werden. Leer lassen für den Standard-Exportordner der App.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  placeholder="z.B. C:\Users\Enes\Dokumente\Rechnungen"
                  value={settings.output?.pdfOutputPath ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      output: { ...(prev.output ?? {}), pdfOutputPath: e.target.value },
                    }))
                  }
                />
                <button
                  onClick={async () => {
                    const res = await ipc.dialog.pickFolder({ title: 'PDF-Speicherordner auswählen' });
                    if (res?.path) {
                      setSettings((prev) => ({
                        ...prev,
                        output: { ...(prev.output ?? {}), pdfOutputPath: res.path },
                      }));
                    }
                  }}
                  className="px-4 py-3 rounded-xl font-bold bg-white border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                  title="Ordner auswählen"
                >
                  <FolderOpen size={16} />
                  Durchsuchen
                </button>
              </div>
              {settings.output?.pdfOutputPath ? (
                <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle size={13} />
                  PDFs werden gespeichert in: <span className="font-mono ml-1">{settings.output.pdfOutputPath}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400">Standard: App-Exportordner (userData/exports)</p>
              )}
            </div>

            {/* Audit */}
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Audit</h4>
                <p className="text-sm text-gray-500">Audit-Log prüfen und als CSV exportieren.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const result = await ipc.audit.verify();
                    alert(JSON.stringify(result, null, 2));
                  }}
                  className="px-5 py-3 rounded-xl font-bold bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Verify
                </button>
                <button
                  onClick={async () => {
                    const csv = await ipc.audit.exportCsv();
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-5 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* DB Backup */}
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Datenbank-Backup</h4>
                <p className="text-sm text-gray-500">
                  Komplette Datenbank sichern oder aus einer Sicherung wiederherstellen.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={async () => {
                    try {
                      const res = await ipc.db.backup();
                      alert(`Backup erstellt:\n${res.path}`);
                    } catch (e) {
                      alert(`Backup fehlgeschlagen: ${String(e)}`);
                    }
                  }}
                  className="px-5 py-3 rounded-xl font-bold bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Backup erstellen
                </button>

                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={backupPath}
                    onChange={(e) => setBackupPath(e.target.value)}
                    placeholder="Pfad zur Backup-Datei (.db)"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent outline-none transition-shadow"
                  />
                  <button
                    onClick={async () => {
                      if (!backupPath.trim()) return;
                      if (!confirm('Aktuelle Daten werden überschrieben. Fortfahren?')) return;
                      try {
                        await ipc.db.restore({ path: backupPath.trim() });
                        alert('Wiederhergestellt. App wird neu geladen...');
                        window.location.reload();
                      } catch (e) {
                        alert(`Wiederherstellung fehlgeschlagen: ${String(e)}`);
                      }
                    }}
                    disabled={!backupPath.trim()}
                    className="px-5 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    Wiederherstellen
                  </button>
                </div>
              </div>
            </div>

            {/* Settings Export / Import */}
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Einstellungen</h4>
                <p className="text-sm text-gray-500">
                  Alle Einstellungen als JSON-Datei exportieren oder aus einer Datei importieren &mdash; ideal beim Wechsel auf ein neues Gerät.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportSettings}
                  className="px-5 py-3 rounded-xl font-bold bg-white border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Einstellungen exportieren
                </button>

                <button
                  onClick={() => importFileRef.current?.click()}
                  className="px-5 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Einstellungen importieren
                </button>

                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportSettings}
                />
              </div>

              {importStatus && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold animate-enter ${
                  importStatus.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {importStatus.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {importStatus.message}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-100 p-4 flex flex-col gap-1 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3 group ${
              activeTab === item.id
                ? 'bg-black text-white'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-accent' : 'text-gray-400 group-hover:text-gray-600'} />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{item.label}</p>
              <p className={`text-xs truncate ${activeTab === item.id ? 'text-gray-300' : 'text-gray-400'}`}>{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderActiveTab()}
        </div>
      </div>

      {/* Save Button - Fixed */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={handleSave}
          disabled={setSettingsMutation.isPending}
          className="px-6 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center gap-2 active:scale-95"
        >
          <Save size={18} />
          {setSettingsMutation.isPending ? 'Speichern...' : 'Speichern'}
        </Button>
      </div>

      {/* Save Toast */}
      {showSaveToast && (
        <div className="fixed bottom-24 right-8 z-50 bg-success text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl animate-enter">
          <CheckCircle size={18} />
          Einstellungen gespeichert
        </div>
      )}
    </div>
  );
};
