import { 
  Product, 
  ProductStock,
  StoreLocation, 
  LabelTemplateConfig, 
  User, 
  StockAdjustment, 
  StockTransfer, 
  LowStockAlert, 
  SyncQueueItem,
  ThermalPrinterSettings
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_STORES, INITIAL_TEMPLATES, INITIAL_USERS } from '../data/initialData';
import { audioService } from './audioService';

const STORAGE_KEYS = {
  PRODUCTS: 'aman_label_products_v1',
  STORES: 'aman_label_stores_v1',
  TEMPLATES: 'aman_label_templates_v1',
  CURRENT_USER: 'aman_label_current_user_v1',
  ACTIVE_STORE: 'aman_label_active_store_v1',
  PRINTER_SETTINGS: 'aman_label_printer_settings_v1',
  ADJUSTMENTS: 'aman_label_adjustments_v1',
  TRANSFERS: 'aman_label_transfers_v1',
  ALERTS: 'aman_label_alerts_v1',
  OFFLINE_QUEUE: 'aman_label_offline_queue_v1',
  SIMULATED_OFFLINE: 'aman_label_simulated_offline_v1',
};

class StorageService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('aman_inventory_sync_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_EVENT') {
            this.notifyListeners();
          }
        };
      } catch {
        // Fallback to window storage events
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => this.notifyListeners());
      window.addEventListener('online', () => this.handleNetworkRestored());
    }

    this.initDefaults();
  }

  private initDefaults() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0])); // Default to Admin
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_STORE)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify('store-1')); // Default to Jakarta
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRINTER_SETTINGS)) {
      const defaultSettings: ThermalPrinterSettings = {
        connectionType: 'browser_print',
        printerLanguage: 'TSPL',
        paperWidthMm: 65,
        labelWidthMm: 65,
        labelHeightMm: 28,
        dpi: 203,
        darkness: 10,
        autoCut: true,
        feedLines: 2,
      };
      localStorage.setItem(STORAGE_KEYS.PRINTER_SETTINGS, JSON.stringify(defaultSettings));
    }

    // Run initial alert evaluation
    setTimeout(() => this.evaluateStockAlerts(), 500);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  private broadcastChange() {
    this.notifyListeners();
    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC_EVENT', timestamp: Date.now() });
    }
  }

  // --- Network & Offline Status ---
  isSimulatedOffline(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  }

  setSimulatedOffline(offline: boolean) {
    localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, offline ? 'true' : 'false');
    this.broadcastChange();
    if (!offline) {
      this.processOfflineQueue();
    }
  }

  isOnline(): boolean {
    if (this.isSimulatedOffline()) return false;
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  private handleNetworkRestored() {
    if (!this.isSimulatedOffline()) {
      this.processOfflineQueue();
    }
  }

  // --- Products Management ---
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  findProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim().toLowerCase();
    return this.getProducts().find(
      (p) => p.barcode.toLowerCase() === clean || p.sku.toLowerCase() === clean
    );
  }

  saveProduct(product: Product): Product {
    const products = this.getProducts();
    const existingIndex = products.findIndex((p) => p.id === product.id);

    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.unshift(product);
    }

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    if (!this.isOnline()) {
      this.enqueueOfflineItem({
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'PRODUCT_UPDATE',
        payload: product,
        timestamp: Date.now(),
        status: 'QUEUED',
      });
    }

    this.evaluateStockAlerts();
    this.broadcastChange();
    return product;
  }

  deleteProduct(productId: string) {
    const products = this.getProducts().filter((p) => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.broadcastChange();
  }

  // --- Stock Adjustments & Real-Time Sync ---
  adjustStock(
    productId: string,
    storeId: string,
    newQuantity: number,
    reason: StockAdjustment['reason'],
    userName: string
  ): ProductStock {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');

    const prevStock = product.stocks[storeId]?.quantity ?? 0;
    const minThreshold = product.stocks[storeId]?.minThreshold ?? 20;

    const updatedStock: ProductStock = {
      storeId,
      quantity: Math.max(0, newQuantity),
      minThreshold,
      lastUpdated: new Date().toISOString(),
    };

    product.stocks[storeId] = updatedStock;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    // Log adjustment transaction
    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      storeId,
      productId,
      productName: product.name,
      sku: product.sku,
      previousQty: prevStock,
      newQty: newQuantity,
      delta: newQuantity - prevStock,
      reason,
      performedBy: userName,
      timestamp: new Date().toISOString(),
    };

    const adjustments = this.getAdjustments();
    adjustments.unshift(adjustment);
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments.slice(0, 300)));

    if (!this.isOnline()) {
      this.enqueueOfflineItem({
        id: `queue-adj-${Date.now()}`,
        type: 'STOCK_ADJUSTMENT',
        payload: adjustment,
        timestamp: Date.now(),
        status: 'QUEUED',
      });
    }

    this.evaluateStockAlerts();
    this.broadcastChange();
    return updatedStock;
  }

  // Inter-Store Stock Transfer
  transferStock(
    fromStoreId: string,
    toStoreId: string,
    productId: string,
    quantity: number,
    userName: string
  ): StockTransfer {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');

    const sourceQty = product.stocks[fromStoreId]?.quantity ?? 0;
    if (sourceQty < quantity) {
      throw new Error(`Insufficient stock in origin store (${sourceQty} available)`);
    }

    // Deduct from source, add to destination
    const fromStock = product.stocks[fromStoreId];
    if (fromStock) {
      fromStock.quantity -= quantity;
      fromStock.lastUpdated = new Date().toISOString();
    }

    if (!product.stocks[toStoreId]) {
      product.stocks[toStoreId] = {
        storeId: toStoreId,
        quantity: 0,
        minThreshold: 20,
        lastUpdated: new Date().toISOString(),
      };
    }
    product.stocks[toStoreId].quantity += quantity;
    product.stocks[toStoreId].lastUpdated = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    const transfer: StockTransfer = {
      id: `trf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromStoreId,
      toStoreId,
      productId,
      productName: product.name,
      sku: product.sku,
      quantity,
      status: 'COMPLETED',
      initiatedBy: userName,
      timestamp: new Date().toISOString(),
    };

    const transfers = this.getTransfers();
    transfers.unshift(transfer);
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers.slice(0, 200)));

    if (!this.isOnline()) {
      this.enqueueOfflineItem({
        id: `queue-trf-${Date.now()}`,
        type: 'STOCK_TRANSFER',
        payload: transfer,
        timestamp: Date.now(),
        status: 'QUEUED',
      });
    }

    this.evaluateStockAlerts();
    this.broadcastChange();
    return transfer;
  }

  getAdjustments(): StockAdjustment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getTransfers(): StockTransfer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // --- Offline Sync Queue ---
  getOfflineQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private enqueueOfflineItem(item: SyncQueueItem) {
    const queue = this.getOfflineQueue();
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    this.broadcastChange();
  }

  async processOfflineQueue(): Promise<{ syncedCount: number }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0 };

    // Simulate reliable cloud background sync
    const syncedCount = queue.length;
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    this.broadcastChange();

    // Trigger push notification of sync completion
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Cloud Synchronization Completed', {
        body: `${syncedCount} queued inventory update(s) successfully synced across all store locations.`,
        icon: '/icon-192.svg',
      });
    }

    return { syncedCount };
  }

  // --- Low-Stock Push Alerts & Notification System ---
  getAlerts(): LowStockAlert[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALERTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  markAlertAsRead(alertId: string) {
    const alerts = this.getAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
      this.broadcastChange();
    }
  }

  markAllAlertsAsRead() {
    const alerts = this.getAlerts().map((a) => ({ ...a, isRead: true }));
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    this.broadcastChange();
  }

  clearAlerts() {
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    this.broadcastChange();
  }

  evaluateStockAlerts() {
    const products = this.getProducts();
    const stores = this.getStores();
    const existingAlerts = this.getAlerts();
    const newAlerts: LowStockAlert[] = [...existingAlerts];
    let triggeredNew = false;

    products.forEach((product) => {
      stores.forEach((store) => {
        const stock = product.stocks[store.id];
        const currentQty = stock?.quantity ?? 0;
        const threshold = stock?.minThreshold ?? 20;

        if (currentQty <= threshold) {
          // Check if alert already exists for this product and store today
          const today = new Date().toISOString().split('T')[0];
          const exists = existingAlerts.some(
            (a) => a.productId === product.id && a.storeId === store.id && a.timestamp.startsWith(today)
          );

          if (!exists) {
            const alert: LowStockAlert = {
              id: `alert-${product.id}-${store.id}-${Date.now()}`,
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              barcode: product.barcode,
              storeId: store.id,
              storeName: store.name,
              currentStock: currentQty,
              minThreshold: threshold,
              timestamp: new Date().toISOString(),
              isRead: false,
            };
            newAlerts.unshift(alert);
            triggeredNew = true;

            // Trigger system browser push notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`⚠️ Low Stock Alert: ${product.name}`, {
                body: `Only ${currentQty} units left at ${store.name} (Min threshold: ${threshold}). Tap to print reorder labels.`,
                icon: '/icon-192.svg',
              });
            }
          }
        }
      });
    });

    if (triggeredNew) {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(newAlerts.slice(0, 100)));
      audioService.playAlertTone();
      this.broadcastChange();
    }
  }

  // --- Stores ---
  getStores(): StoreLocation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORES);
      return data ? JSON.parse(data) : INITIAL_STORES;
    } catch {
      return INITIAL_STORES;
    }
  }

  getActiveStoreId(): string {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_STORE) || '"store-1"');
    } catch {
      return 'store-1';
    }
  }

  setActiveStoreId(storeId: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(storeId));
    this.broadcastChange();
  }

  // --- Templates ---
  getTemplates(): LabelTemplateConfig[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      return data ? JSON.parse(data) : INITIAL_TEMPLATES;
    } catch {
      return INITIAL_TEMPLATES;
    }
  }

  saveTemplate(template: LabelTemplateConfig) {
    const templates = this.getTemplates();
    const idx = templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      templates[idx] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    this.broadcastChange();
  }

  // --- Auth & Users ---
  getCurrentUser(): User {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  }

  setCurrentUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.broadcastChange();
  }

  getAvailableUsers(): User[] {
    return INITIAL_USERS;
  }

  // --- Thermal Printer Settings ---
  getPrinterSettings(): ThermalPrinterSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRINTER_SETTINGS);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      connectionType: 'browser_print',
      printerLanguage: 'TSPL',
      paperWidthMm: 65,
      labelWidthMm: 65,
      labelHeightMm: 28,
      dpi: 203,
      darkness: 10,
      autoCut: true,
      feedLines: 2,
    };
  }

  savePrinterSettings(settings: ThermalPrinterSettings) {
    localStorage.setItem(STORAGE_KEYS.PRINTER_SETTINGS, JSON.stringify(settings));
    this.broadcastChange();
  }
}

export const storageService = new StorageService();
