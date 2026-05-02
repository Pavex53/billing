import React from 'react';
import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './components/DashboardViews';
import { DocumentsView } from './components/InvoicesView';
import { ClientsView } from './components/ClientsView';
import { ArticlesView } from './components/ArticlesView';
import { SettingsView } from './components/SettingsView';
import { InvoiceDocumentEditor } from './components/InvoiceDocumentEditor';
import { useUiStore } from './state/uiStore';
import { Invoice } from './types';
import { useUpsertInvoiceMutation } from './hooks/useInvoices';
import { ipc } from './ipc/client';

const RootLayout: React.FC = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activePage = (() => {
    if (pathname.startsWith('/documents')) return 'documents';
    if (pathname.startsWith('/clients')) return 'clients';
    if (pathname.startsWith('/articles')) return 'articles';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  })();

  const isEditorActive = pathname.includes('/edit') || pathname.includes('/editor');

  const handleNavigate = (page: string) => {
    const to = page === 'dashboard' ? '/' : `/${page}`;
    navigate({ to });
  };

  return (
    <DashboardLayout
      activePage={activePage}
      onNavigate={handleNavigate}
      isEditorActive={isEditorActive}
    >
      <Outlet />
    </DashboardLayout>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <DashboardHome
      onNavigate={(page) => {
        const to = page === 'dashboard' ? '/' : `/${page}`;
        navigate({ to });
      }}
    />
  );
};

const ClientsPage: React.FC = () => <ClientsView />;
const ArticlesPage: React.FC = () => <ArticlesView />;
const SettingsPage: React.FC = () => <SettingsView />;

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const setEditingInvoice = useUiStore((s) => s.setEditingInvoice);
  const locationSearch = window.location.search;
  const deepLink = React.useMemo(() => {
    const params = new URLSearchParams(locationSearch);
    const id = params.get('id');
    if (!id) return null;
    return { kind: 'invoice' as const, id };
  }, [locationSearch]);

  const handleCreateDocument = () => {
    void (async () => {
      try {
        const reservation = await ipc.numbers.reserve({ kind: 'invoice' });
        const newInvoice: Invoice = {
          id: Math.random().toString(36).substr(2, 9),
          number: reservation.number,
          numberReservationId: reservation.reservationId,
          client: '',
          clientEmail: '',
          date: new Date().toISOString().split('T')[0] ?? '',
          dueDate: '',
          amount: 0,
          status: 'draft',
          items: [],
          payments: [],
          history: [],
        };
        setEditingInvoice(newInvoice, 'invoice', 'create');
        navigate({ to: '/documents/edit' });
      } catch (error) {
        alert(`Nummer konnte nicht reserviert werden: ${String(error)}`);
      }
    })();
  };

  return (
    <DocumentsView
      onOpenTemplates={() => {}}
      onOpenRecurring={() => {}}
      onEditInvoice={(invoice, type) => {
        setEditingInvoice(invoice, type, 'edit');
        navigate({ to: '/documents/edit' });
      }}
      onCreateInvoice={handleCreateDocument}
      initialDocumentType={deepLink?.kind}
      initialSelectedId={deepLink?.id}
    />
  );
};

const DocumentEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const invoice = useUiStore((s) => s.editingInvoice);
  const clearEditingInvoice = useUiStore((s) => s.clearEditingInvoice);
  const docType = useUiStore((s) => s.editingDocumentType);
  const docMode = useUiStore((s) => s.editingDocumentMode);
  const upsertInvoice = useUpsertInvoiceMutation();

  if (!invoice) {
    return (
      <div className="bg-white rounded-[2.5rem] p-8 min-h-full shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Kein Dokument ausgewählt</h2>
        <p className="text-sm text-gray-500 mb-6">
          Bitte wähle zuerst ein Dokument aus der Liste aus.
        </p>
        <button
          onClick={() => navigate({ to: '/documents' })}
          className="px-6 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition-colors"
        >
          Zurück zu Dokumenten
        </button>
      </div>
    );
  }

  return (
    <InvoiceDocumentEditor
      invoice={invoice}
      templateType="invoice"
      mode={docMode ?? 'edit'}
      onSave={(updated) => {
        if (docMode === 'create') {
          const reservationId = updated.numberReservationId;
          const persistedDoc = { ...updated };
          delete persistedDoc.numberReservationId;

          void (async () => {
            try {
              const saved = await upsertInvoice.mutateAsync({ invoice: persistedDoc, reason: 'create' });
              if (reservationId) {
                await ipc.numbers.finalize({ reservationId, documentId: saved.id });
              }
              clearEditingInvoice();
              navigate({ to: '/documents' });
            } catch (error) {
              alert(`Speichern fehlgeschlagen: ${String(error)}`);
            }
          })();
          return;
        }

        upsertInvoice.mutate({ invoice: updated, reason: 'Bearbeitung' }, {
          onSettled: () => {
            clearEditingInvoice();
            navigate({ to: '/documents' });
          },
        });
      }}
      onCancel={() => {
        void (async () => {
          if (docMode === 'create' && invoice.numberReservationId) {
            try {
              await ipc.numbers.release({ reservationId: invoice.numberReservationId });
            } catch {
              // ignore
            }
          }
          clearEditingInvoice();
          navigate({ to: '/documents' });
        })();
      }}
    />
  );
};

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: DashboardPage });
const documentsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/documents', component: DocumentsPage });
const documentsEditRoute = createRoute({ getParentRoute: () => rootRoute, path: '/documents/edit', component: DocumentEditorPage });
const clientsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/clients', component: ClientsPage });
const articlesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/articles', component: ArticlesPage });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  documentsRoute,
  documentsEditRoute,
  clientsRoute,
  articlesRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const AppRouterProvider: React.FC = () => <RouterProvider router={router} />;
