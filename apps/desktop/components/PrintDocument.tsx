import React from 'react';
import { A4_HEIGHT_PX, A4_WIDTH_PX, INITIAL_INVOICE_TEMPLATE, INITIAL_OFFER_TEMPLATE } from '../constants';
import { CanvasElement } from './CanvasElement';
import { useSettingsQuery } from '../hooks/useSettings';
import { useActiveTemplateQuery } from '../hooks/useTemplates';
import { MOCK_SETTINGS } from '../data/mockData';
import { useInvoicesQuery } from '../hooks/useInvoices';
import { useOffersQuery } from '../hooks/useOffers';
import { getPreviewElements } from '../utils/documentPreview';

/** Signal Electron that the PDF content is ready to capture. */
const signalReady = () => {
  (globalThis as any).__PDF_READY__ = true;
};

export const PrintDocument: React.FC<{ kind: 'invoice' | 'offer'; id: string }> = ({ kind, id }) => {
  const { data: settingsFromDb } = useSettingsQuery();
  const settings = settingsFromDb ?? MOCK_SETTINGS;
  const { data: activeTemplate } = useActiveTemplateQuery(kind);
  const template = activeTemplate?.elements ?? (kind === 'offer' ? INITIAL_OFFER_TEMPLATE : INITIAL_INVOICE_TEMPLATE);

  const invoicesQuery = useInvoicesQuery();
  const offersQuery = useOffersQuery();

  // Derive loading / success state
  const isLoading =
    kind === 'offer' ? offersQuery.isLoading : invoicesQuery.isLoading;
  const isSuccess =
    kind === 'offer' ? offersQuery.isSuccess : invoicesQuery.isSuccess;

  const doc =
    kind === 'offer'
      ? (offersQuery.data ?? []).find((o) => o.id === id)
      : (invoicesQuery.data ?? []).find((i) => i.id === id);

  const previewElements = React.useMemo(() => {
    if (!doc) return [];
    return getPreviewElements(doc, template as any, settings as any);
  }, [doc, template, settings]);

  // Reset flag on mount
  React.useEffect(() => {
    (globalThis as any).__PDF_READY__ = false;

    // Safety-net: signal ready after 12 s regardless, so Electron never times out
    const safetyTimer = setTimeout(signalReady, 12_000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Signal ready as soon as we have a result (found OR not found after load)
  React.useEffect(() => {
    // Still loading – wait
    if (isLoading) return;

    if (doc && previewElements.length > 0) {
      // Document found and elements computed – wait two animation frames so
      // the browser has fully painted the canvas before printToPDF.
      requestAnimationFrame(() => {
        requestAnimationFrame(signalReady);
      });
    } else if (isSuccess) {
      // Queries finished but doc not found – signal anyway so we get the
      // "not found" page instead of an Electron timeout error.
      requestAnimationFrame(signalReady);
    }
  }, [doc, previewElements.length, isLoading, isSuccess]);

  return (
    <div>
      <style>{`
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: white; }
        #root { height: auto !important; }
      `}</style>

      <div
        id="print-page"
        style={{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          background: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {doc ? (
          previewElements.map((el) => (
            <CanvasElement
              key={el.id}
              element={el}
              elements={previewElements}
              isSelected={false}
              scale={1}
              readOnly
            />
          ))
        ) : (
          <div style={{ padding: 24, fontFamily: 'system-ui' }}>
            <h1 style={{ fontSize: 18, margin: 0 }}>Dokument nicht gefunden</h1>
            <p style={{ marginTop: 8, color: '#666' }}>
              {kind} / {id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
