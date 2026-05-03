import { dialog, shell, type BrowserWindow, type IpcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { IpcRouteKey, IpcArgs, IpcResult } from '../ipc/contract';
import { ipcRoutes } from '../ipc/contract';
import {
  listInvoices,
  upsertInvoice,
  deleteInvoice,
  listClients,
  upsertClient,
  deleteClient,
  listArticles,
  upsertArticle,
  deleteArticle,
  listAccounts,
  upsertAccount,
  deleteAccount,
  getSettings,
  setSettings,
  listTemplates,
  getActiveTemplate,
  upsertTemplate,
  deleteTemplate,
  setActiveTemplate,
  listOffers,
  upsertOffer,
  deleteOffer,
  listRecurringProfiles,
  upsertRecurringProfile,
  deleteRecurringProfile,
  listProjects,
  getProject,
  upsertProject,
  archiveProject,
  listTransactions,
  findMatchesForTransaction,
  linkTransaction,
  unlinkTransaction,
  getInvoiceDunningStatus,
  listImportBatches,
  getImportBatchDetails,
  rollbackImportBatch,
} from '../db';
import { requireDb } from '../db/requireDb';
import { verifyAuditChain, exportAuditCsv } from '../audit';
import { exportPdf } from './pdfExport';
import { reserveNumber, releaseNumber, finalizeNumber } from '../db/numbers';
import { createDocumentFromClient, convertOfferToInvoice } from '../db/documents';
import { sendEmail, testEmailConfig } from '../email';
import { getSecret, setSecret, deleteSecret } from './secrets';
import { backup, restore } from '../db/backup';
import {
  eurGetReport,
  eurListItems,
  eurUpsertClassification,
  eurExportCsv,
  eurExportPdf,
  eurListRules,
  eurUpsertRule,
  eurDeleteRule,
} from '../db/eur';
import { checkPortalHealth, publishOfferToPortal, publishInvoiceToPortal, syncOfferPortalStatus, createCustomerAccessLink, rotateCustomerAccessLink } from '../portal';
import { runDunningCycle } from './dunningScheduler';
import { runRecurringCycle } from './recurringScheduler';
import { getUpdaterStatus, downloadUpdate, quitAndInstall } from './updater';
import { previewCsv } from '../finance/csvImport';
import { commitCsvImport } from '../finance/csvCommit';

type RegisterFn = <K extends IpcRouteKey>(
  ipcMain: IpcMain,
  key: K,
  handler: (args: IpcArgs<K>) => Promise<IpcResult<K>>,
) => void;

const register: RegisterFn = (ipcMain, key, handler) => {
  const route = ipcRoutes[key];
  ipcMain.handle(route.channel, async (_event, rawArgs) => {
    const parsed = route.args.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(`[IPC] Invalid args for ${key}: ${parsed.error.message}`);
    }
    const result = await handler(parsed.data as IpcArgs<typeof key>);
    return result;
  });
};

export const registerIpcHandlers = (ipcMain: IpcMain, win: BrowserWindow) => {
  let db: ReturnType<typeof requireDb> | null = null;

  function requireDb() {
    if (!db) throw new Error('DB not initialized');
    return db;
  }

  register(ipcMain, 'invoices:list', async () => {
    const database = requireDb();
    return listInvoices(database);
  });

  register(ipcMain, 'invoices:upsert', async (args) => {
    const database = requireDb();
    return upsertInvoice(database, args);
  });

  register(ipcMain, 'invoices:delete', async (args) => {
    const database = requireDb();
    deleteInvoice(database, args.id, args.reason);
    return { ok: true as const };
  });

  register(ipcMain, 'offers:list', async () => {
    const database = requireDb();
    return listOffers(database);
  });

  register(ipcMain, 'offers:upsert', async (args) => {
    const database = requireDb();
    return upsertOffer(database, args);
  });

  register(ipcMain, 'offers:delete', async (args) => {
    const database = requireDb();
    deleteOffer(database, args.id, args.reason);
    return { ok: true as const };
  });

  register(ipcMain, 'clients:list', async () => {
    const database = requireDb();
    return listClients(database);
  });

  register(ipcMain, 'clients:upsert', async (args) => {
    const database = requireDb();
    return upsertClient(database, args);
  });

  register(ipcMain, 'clients:delete', async (args) => {
    const database = requireDb();
    deleteClient(database, args.id);
    return { ok: true as const };
  });

  register(ipcMain, 'projects:list', async (args) => {
    const database = requireDb();
    return listProjects(database, args);
  });

  register(ipcMain, 'projects:get', async (args) => {
    const database = requireDb();
    return getProject(database, args.id);
  });

  register(ipcMain, 'projects:upsert', async (args) => {
    const database = requireDb();
    return upsertProject(database, args.project, args.reason);
  });

  register(ipcMain, 'projects:archive', async (args) => {
    const database = requireDb();
    return archiveProject(database, args.id, args.reason);
  });

  register(ipcMain, 'articles:list', async () => {
    const database = requireDb();
    return listArticles(database);
  });

  register(ipcMain, 'articles:upsert', async (args) => {
    const database = requireDb();
    return upsertArticle(database, args);
  });

  register(ipcMain, 'articles:delete', async (args) => {
    const database = requireDb();
    deleteArticle(database, args.id);
    return { ok: true as const };
  });

  register(ipcMain, 'accounts:list', async () => {
    const database = requireDb();
    return listAccounts(database);
  });

  register(ipcMain, 'accounts:upsert', async (args) => {
    const database = requireDb();
    return upsertAccount(database, args);
  });

  register(ipcMain, 'accounts:delete', async (args) => {
    const database = requireDb();
    deleteAccount(database, args.id);
    return { ok: true as const };
  });

  register(ipcMain, 'recurring:list', async () => {
    const database = requireDb();
    return listRecurringProfiles(database);
  });

  register(ipcMain, 'recurring:upsert', async (args) => {
    const database = requireDb();
    return upsertRecurringProfile(database, args);
  });

  register(ipcMain, 'recurring:delete', async (args) => {
    const database = requireDb();
    deleteRecurringProfile(database, args.id);
    return { ok: true as const };
  });

  register(ipcMain, 'settings:get', async () => {
    const database = requireDb();
    return getSettings(database);
  });

  register(ipcMain, 'settings:set', async (args) => {
    const database = requireDb();
    setSettings(database, args);
    return { ok: true as const };
  });

  register(ipcMain, 'numbers:reserve', async (args) => {
    const database = requireDb();
    return reserveNumber(database, args.kind);
  });

  register(ipcMain, 'numbers:release', async (args) => {
    const database = requireDb();
    releaseNumber(database, args.reservationId);
    return { ok: true as const };
  });

  register(ipcMain, 'numbers:finalize', async (args) => {
    const database = requireDb();
    finalizeNumber(database, args.reservationId, args.documentId);
    return { ok: true as const };
  });

  register(ipcMain, 'documents:createFromClient', async (args) => {
    const database = requireDb();
    return createDocumentFromClient(database, args);
  });

  register(ipcMain, 'documents:convertOfferToInvoice', async (args) => {
    const database = requireDb();
    return convertOfferToInvoice(database, args.offerId);
  });

  register(ipcMain, 'templates:list', async (args) => {
    const database = requireDb();
    return listTemplates(database, args);
  });

  register(ipcMain, 'templates:active', async (args) => {
    const database = requireDb();
    return getActiveTemplate(database, args.kind);
  });

  register(ipcMain, 'templates:upsert', async (args) => {
    const database = requireDb();
    return upsertTemplate(database, args);
  });

  register(ipcMain, 'templates:delete', async (args) => {
    const database = requireDb();
    deleteTemplate(database, args.id);
    return { ok: true as const };
  });

  register(ipcMain, 'templates:setActive', async (args) => {
    const database = requireDb();
    setActiveTemplate(database, args);
    return { ok: true as const };
  });

  register(ipcMain, 'audit:verify', async () => {
    const database = requireDb();
    return verifyAuditChain(database);
  });

  register(ipcMain, 'audit:exportCsv', async () => {
    const database = requireDb();
    return exportAuditCsv(database);
  });

  register(ipcMain, 'pdf:export', async (args) => {
    const database = requireDb();
    return exportPdf(database, win, args);
  });

  register(ipcMain, 'window:minimize', async () => {
    win.minimize();
    return { ok: true as const };
  });

  register(ipcMain, 'window:toggleMaximize', async () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return { ok: true as const };
  });

  register(ipcMain, 'window:close', async () => {
    win.close();
    return { ok: true as const };
  });

  register(ipcMain, 'window:isMaximized', async () => {
    return { isMaximized: win.isMaximized() };
  });

  register(ipcMain, 'shell:openPath', async ({ path: filePath }) => {
    await shell.openPath(filePath);
    return { ok: true as const };
  });

  register(ipcMain, 'shell:openExportsDir', async () => {
    const exportsDir = path.join(app.getPath('userData'), 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    await shell.openPath(exportsDir);
    return { ok: true as const };
  });

  register(ipcMain, 'shell:openExternal', async ({ url }) => {
    await shell.openExternal(url);
    return { ok: true as const };
  });

  register(ipcMain, 'dialog:pickCsv', async ({ title }) => {
    const res = await dialog.showOpenDialog({
      title: title ?? 'CSV ausw\u00e4hlen',
      properties: ['openFile'],
      filters: [
        { name: 'CSV', extensions: ['csv', 'txt'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (res.canceled || res.filePaths.length === 0) return { path: null };
    return { path: res.filePaths[0] ?? null };
  });

  register(ipcMain, 'dialog:pickFolder', async ({ title }) => {
    const res = await dialog.showOpenDialog({
      title: title ?? 'Ordner ausw\u00e4hlen',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || res.filePaths.length === 0) return { path: null };
    return { path: res.filePaths[0] ?? null };
  });

  register(ipcMain, 'finance:importPreview', async (args) => {
    return previewCsv({
      filePath: args.path,
      encoding: args.encoding,
      delimiter: args.delimiter,
      profile: args.profile ?? 'auto',
      mapping: args.mapping,
      maxRows: args.maxRows,
      accountIdForDedupHash: args.accountIdForDedupHash,
    });
  });

  register(ipcMain, 'finance:importCommit', async (args) => {
    const database = requireDb();
    return commitCsvImport(database, args);
  });

  register(ipcMain, 'finance:listImportBatches', async (args) => {
    const database = requireDb();
    return listImportBatches(database, args);
  });

  register(ipcMain, 'finance:getImportBatchDetails', async (args) => {
    const database = requireDb();
    return getImportBatchDetails(database, args.batchId);
  });

  register(ipcMain, 'finance:rollbackImportBatch', async (args) => {
    const database = requireDb();
    return rollbackImportBatch(database, args.batchId, args.reason);
  });

  register(ipcMain, 'eur:getReport', async (args) => {
    const database = requireDb();
    return eurGetReport(database, args);
  });

  register(ipcMain, 'eur:listItems', async (args) => {
    const database = requireDb();
    return eurListItems(database, args);
  });

  register(ipcMain, 'eur:upsertClassification', async (args) => {
    const database = requireDb();
    return eurUpsertClassification(database, args);
  });

  register(ipcMain, 'eur:exportCsv', async (args) => {
    const database = requireDb();
    return eurExportCsv(database, args);
  });

  register(ipcMain, 'eur:exportPdf', async (args) => {
    const database = requireDb();
    return eurExportPdf(database, win, args);
  });

  register(ipcMain, 'eur:listRules', async (args) => {
    const database = requireDb();
    return eurListRules(database, args);
  });

  register(ipcMain, 'eur:upsertRule', async (args) => {
    const database = requireDb();
    return eurUpsertRule(database, args);
  });

  register(ipcMain, 'eur:deleteRule', async (args) => {
    const database = requireDb();
    const { id } = args;
    deleteEurRule(db, id);
    return { ok: true };
  });

  register(ipcMain, 'portal:health', async (args) => {
    return checkPortalHealth(args.baseUrl);
  });

  register(ipcMain, 'portal:publishOffer', async (args) => {
    const database = requireDb();
    return publishOfferToPortal(database, args);
  });

  register(ipcMain, 'portal:publishInvoice', async (args) => {
    const database = requireDb();
    return publishInvoiceToPortal(database, args);
  });

  register(ipcMain, 'portal:syncOfferStatus', async (args) => {
    const database = requireDb();
    return syncOfferPortalStatus(database, args.offerId);
  });

  register(ipcMain, 'portal:createCustomerAccessLink', async (args) => {
    const database = requireDb();
    return createCustomerAccessLink(database, args);
  });

  register(ipcMain, 'portal:rotateCustomerAccessLink', async (args) => {
    const database = requireDb();
    return rotateCustomerAccessLink(database, args);
  });

  register(ipcMain, 'secrets:get', async ({ key }) => {
    return getSecret(key);
  });

  register(ipcMain, 'secrets:set', async ({ key, value }) => {
    setSecret(key, value);
  });

  register(ipcMain, 'secrets:delete', async ({ key }) => {
    return deleteSecret(key);
  });

  register(ipcMain, 'db:backup', async () => {
    return backup();
  });

  register(ipcMain, 'db:restore', async (args) => {
    const database = requireDb();
    return restore(database, args.path);
  });

  register(ipcMain, 'email:send', async (args) => {
    const database = requireDb();
    return sendEmail(database, args);
  });

  register(ipcMain, 'email:testConfig', async (args) => {
    return testEmailConfig(args);
  });

  register(ipcMain, 'transactions:list', async (args) => {
    const database = requireDb();
    return listTransactions(database, args);
  });

  register(ipcMain, 'transactions:findMatches', async (args) => {
    const database = requireDb();
    return findMatchesForTransaction(database, args.transactionId);
  });

  register(ipcMain, 'transactions:link', async (args) => {
    const database = requireDb();
    return linkTransaction(database, args.transactionId, args.invoiceId);
  });

  register(ipcMain, 'transactions:unlink', async (args) => {
    const database = requireDb();
    return unlinkTransaction(database, args.transactionId);
  });

  register(ipcMain, 'dunning:manualRun', async () => {
    const database = requireDb();
    return runDunningCycle(database);
  });

  register(ipcMain, 'dunning:getInvoiceStatus', async (args) => {
    const database = requireDb();
    return getInvoiceDunningStatus(database, args.invoiceId);
  });

  register(ipcMain, 'recurring:manualRun', async () => {
    const database = requireDb();
    return runRecurringCycle(database);
  });

  register(ipcMain, 'updater:getStatus', async () => {
    return getUpdaterStatus();
  });

  register(ipcMain, 'updater:downloadUpdate', async () => {
    await downloadUpdate();
    return { ok: true as const };
  });

  register(ipcMain, 'updater:quitAndInstall', async () => {
    quitAndInstall();
    return { ok: true as const };
  });

  return {
    setDb: (database: ReturnType<typeof requireDb>) => {
      db = database;
    },
  };
};
