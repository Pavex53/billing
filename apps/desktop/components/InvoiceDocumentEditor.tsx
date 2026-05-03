
import React, { useState, useEffect, useMemo } from 'react';
import type { AppSettings, Invoice, InvoiceElement, InvoiceItem } from '../types';
import { CanvasElement } from './CanvasElement';
import { useActiveTemplateQuery } from '../hooks/useTemplates';
import { INITIAL_INVOICE_TEMPLATE, INITIAL_OFFER_TEMPLATE, A4_WIDTH_PX, A4_HEIGHT_PX } from '../constants';
import { useSettingsQuery } from '../hooks/useSettings';
import { MOCK_SETTINGS } from '../data/mockData';
import { useArticlesQuery } from '../hooks/useArticles';
import { useClientsQuery } from '../hooks/useClients';
import { useProjectsQuery } from '../hooks/useProjects';
import { getPreviewElements } from '../utils/documentPreview';
import { Trash2, Plus, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface InvoiceDocumentEditorProps {
  invoice: Invoice;
  onSave: (invoice: Invoice) => void;
  onBack: () => void;
  mode: 'create' | 'edit';
  templateType?: 'invoice' | 'offer';
}

export const InvoiceDocumentEditor: React.FC<InvoiceDocumentEditorProps> = ({
  invoice,
  onSave,
  onBack,
  mode,
  templateType = 'invoice',
}) => {
  const { data: settingsFromDb } = useSettingsQuery();
  const effectiveSettings: AppSettings = settingsFromDb ?? MOCK_SETTINGS;
  const { data: articles = [] } = useArticlesQuery();
  const { data: clients = [] } = useClientsQuery();

  const [formData, setFormData] = useState<Invoice>({
    ...invoice,
    items: invoice.items?.length > 0 ? invoice.items : [{ description: '', quantity: 1, price: 0, total: 0 }],
    payments: invoice.payments ?? [],
    history: invoice.history ?? [],
  });

  const { data: activeTemplate } = useActiveTemplateQuery(templateType);
  const effectiveTemplate: InvoiceElement[] =
    activeTemplate?.elements && (activeTemplate.elements as InvoiceElement[]).length > 0
      ? (activeTemplate.elements as InvoiceElement[])
      : (templateType === 'offer' ? INITIAL_OFFER_TEMPLATE : INITIAL_INVOICE_TEMPLATE);

  const [selectedClientId, setSelectedClientId] = useState<string>(invoice.clientId ?? '');
  const [articleToAddId, setArticleToAddId] = useState<string>('');
  const { data: projects = [] } = useProjectsQuery(
    selectedClientId ? { clientId: selectedClientId, includeArchived: false } : undefined,
  );
  const projectTouchedRef = React.useRef(false);

  const previewElements = useMemo(() => {
    return getPreviewElements(formData, effectiveTemplate, effectiveSettings);
  }, [formData, effectiveSettings, effectiveTemplate]);

  const categoryOptions = useMemo(() => {
    const fromSettings = (effectiveSettings.catalog?.categories ?? []).map((c) => c.name).filter(Boolean);
    const fromArticles = articles.map((a) => a.category).filter(Boolean);
    return Array.from(new Set([...fromSettings, ...fromArticles])).sort();
  }, [effectiveSettings, articles]);

  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    setFormData((prev) => ({
      ...prev,
      clientId: client.id,
      clientNumber: client.number ?? prev.clientNumber,
      client: client.company || client.name || prev.client,
      clientEmail: client.email || prev.clientEmail,
      clientAddress: [client.name, client.street, `${client.zip ?? ''} ${client.city ?? ''}`.trim()]
        .filter(Boolean)
        .join('\n'),
    }));
    if (!projectTouchedRef.current) {
      setFormData((prev) => ({ ...prev, projectId: undefined }));
    }
  }, [selectedClientId, clients]);

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setFormData((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const q = field === 'quantity' ? Number(value) : item.quantity;
          const p = field === 'price' ? Number(value) : item.price;
          updated.total = Math.round(q * p * 100) / 100;
        }
        return updated;
      });
      const amount = items.reduce((sum, it) => sum + (it.total ?? 0), 0);
      return { ...prev, items, amount };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0, total: 0 }],
    }));
  };

  const removeItem = (idx: number) => {
    setFormData((prev) => {
      const items = prev.items.filter((_, i) => i !== idx);
      const amount = items.reduce((sum, it) => sum + (it.total ?? 0), 0);
      return { ...prev, items, amount };
    });
  };

  const addArticle = () => {
    if (!articleToAddId) return;
    const article = articles.find((a) => a.id === articleToAddId);
    if (!article) return;
    setFormData((prev) => {
      const newItem: InvoiceItem = {
        description: article.name,
        articleId: article.id,
        category: article.category ?? undefined,
        quantity: 1,
        price: article.price ?? 0,
        total: article.price ?? 0,
      };
      const items = [...prev.items, newItem];
      const amount = items.reduce((sum, it) => sum + (it.total ?? 0), 0);
      return { ...prev, items, amount };
    });
    setArticleToAddId('');
  };

  const handleSave = () => {
    onSave(formData);
  };

  const [openSections, setOpenSections] = useState({
    client: true,
    invoice: true,
    items: true,
    notes: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: [c.company, c.name].filter(Boolean).join(' – ') || c.id,
  }));

  const articleOptions = articles.map((a) => ({
    value: a.id,
    label: `${a.name}${a.price != null ? ` (${a.price.toFixed(2)} €)` : ''}`,
  }));

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-950">
      <div className="w-[450px] flex flex-col bg-white border-r border-gray-200 h-full shadow-xl z-10">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {templateType === 'offer' ? 'Angebot' : 'Rechnung'} {mode === 'create' ? 'erstellen' : 'bearbeiten'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{formData.number || 'Neue Nummer wird vergeben'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('client')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Empfänger</span>
              {openSections.client ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openSections.client && (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kunde auswählen</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={selectedClientId}
                      onChange={(e) => { setSelectedClientId(e.target.value); }}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                      <option value="">– Kein Kunde –</option>
                      {clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name / Firma</label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData((p) => ({ ...p, client: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Kundenname"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, clientEmail: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="kunde@beispiel.de"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
                  <textarea
                    value={formData.clientAddress ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, clientAddress: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    placeholder="Straße\nPLZ Ort"
                  />
                </div>
                {projectOptions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Projekt</label>
                    <select
                      value={formData.projectId ?? ''}
                      onChange={(e) => { projectTouchedRef.current = true; setFormData((p) => ({ ...p, projectId: e.target.value || undefined })); }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      <option value="">– Kein Projekt –</option>
                      {projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('invoice')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">{templateType === 'offer' ? 'Angebotsdaten' : 'Rechnungsdaten'}</span>
              {openSections.invoice ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openSections.invoice && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Datum</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{templateType === 'offer' ? 'Gültig bis' : 'Fällig am'}</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Leistungszeitraum</label>
                  <input
                    type="text"
                    value={formData.servicePeriod ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, servicePeriod: e.target.value || undefined }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="z.B. Januar 2025"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('items')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Positionen</span>
              {openSections.items ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openSections.items && (
              <div className="p-4 space-y-3">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-accent transition-colors group animate-enter" style={{ animationDelay: `${200 + idx * 50}ms` }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 bg-gray-50"
                          placeholder="Beschreibung"
                        />
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="mt-1 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Menge</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Einzelpreis €</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Gesamt €</label>
                        <input
                          type="number"
                          value={item.total}
                          readOnly
                          className="w-full px-2 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    {categoryOptions.length > 0 && (
                      <div className="mt-2">
                        <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Kategorie</label>
                        <select
                          value={item.category ?? ''}
                          onChange={(e) => updateItem(idx, 'category', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          <option value="">– keine –</option>
                          {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={addItem}
                  className="w-full py-2 text-sm text-accent border border-dashed border-accent/40 rounded-xl hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Position hinzufügen
                </button>

                {articleOptions.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={articleToAddId}
                      onChange={(e) => setArticleToAddId(e.target.value)}
                      className="flex-1 px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      <option value="">Artikel auswählen…</option>
                      {articleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button
                      onClick={addArticle}
                      disabled={!articleToAddId}
                      className="px-3 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Gesamtbetrag</span>
                  <span className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(formData.amount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('notes')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Notizen</span>
              {openSections.notes ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openSections.notes && (
              <div className="p-4">
                <textarea
                  value={(formData as any).notes ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  placeholder="Interne Notizen…"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white animate-enter" style={{ animationDelay: '450ms' }}>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-xl transition-colors shadow-sm"
            >
              {mode === 'create' ? 'Erstellen' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-8 overflow-auto bg-gray-950 px-8 pb-8">
        <div className="mb-4 text-white/50 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Live Vorschau
        </div>
        <div
          className="bg-white shadow-2xl relative transition-transform origin-top"
          style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, transform: 'scale(0.6)', transformOrigin: 'top center' }}
        >
          {previewElements.map((el) => (
            <CanvasElement
              key={el.id}
              element={el}
              elements={previewElements}
              isSelected={false}
              scale={1}
              readOnly={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
