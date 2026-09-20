import React, { useState, useEffect } from 'react';
import { 
  Barcode as BarcodeIcon, 
  Printer, 
  Layers, 
  Building2, 
  BarChart3, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  WifiOff, 
  AlertTriangle,
  Plus,
  RotateCcw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { 
  Product, 
  StoreLocation, 
  LabelTemplateConfig, 
  User, 
  PrintQueueItem, 
  ThermalPrinterSettings, 
  StockAdjustment 
} from './types';
import { storageService } from './services/storageService';
import { thermalPrinterService } from './services/thermalPrinterService';
import { audioService } from './services/audioService';
import { LabelPreview } from './components/LabelPreview';
import { Navbar } from './components/Navbar';
import { ProductCatalog } from './components/ProductCatalog';
import { StockSyncMatrix } from './components/StockSyncMatrix';
import { InventoryDashboard } from './components/InventoryDashboard';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { BatchPrintModal } from './components/BatchPrintModal';
import { ThermalPrinterSettingsModal } from './components/ThermalPrinterSettingsModal';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import { NotificationCenter } from './components/NotificationCenter';
import { AuthModal } from './components/AuthModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { ProductFormModal } from './components/ProductFormModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { ProductImportModal } from './components/ProductImportModal';

export default function App() {
  // Core application states
  const [products, setProducts] = useState<Product[]>(storageService.getProducts());
  const [stores, setStores] = useState<StoreLocation[]>(storageService.getStores());
  const [templates, setTemplates] = useState<LabelTemplateConfig[]>(storageService.getTemplates());
  const [activeStoreId, setActiveStoreId] = useState<string>(storageService.getActiveStoreId());
  const [currentUser, setCurrentUser] = useState<User>(storageService.getCurrentUser());
  const [printerSettings, setPrinterSettings] = useState<ThermalPrinterSettings>(
    storageService.getPrinterSettings()
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tmpl-supermarket');

  // Navigation tab: 'catalog' | 'sync_matrix' | 'analytics'
  const [activeTab, setActiveTab] = useState<'catalog' | 'sync_matrix' | 'analytics'>('catalog');

  // Offline and sync state
  const [isOnline, setIsOnline] = useState<boolean>(storageService.isOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(
    storageService.isSimulatedOffline()
  );
  const [offlineQueue, setOfflineQueue] = useState(storageService.getOfflineQueue());
  const [alerts, setAlerts] = useState(storageService.getAlerts());

  // Print queue for bulk batch printing
  const [batchQueue, setBatchQueue] = useState<PrintQueueItem[]>([]);

  // Modals visibility
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState<boolean>(false);
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState<boolean>(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [deployGuideOpen, setDeployGuideOpen] = useState<boolean>(false);
  const [productFormOpen, setProductFormOpen] = useState<boolean>(false);
  const [productImportOpen, setProductImportOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustOpen, setStockAdjustOpen] = useState<boolean>(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Subscribe to storage changes & multi-store sync events
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setProducts([...storageService.getProducts()]);
      setStores([...storageService.getStores()]);
      setTemplates([...storageService.getTemplates()]);
      setCurrentUser(storageService.getCurrentUser());
      setActiveStoreId(storageService.getActiveStoreId());
      setPrinterSettings(storageService.getPrinterSettings());
      setIsOnline(storageService.isOnline());
      setIsSimulatedOffline(storageService.isSimulatedOffline());
      setOfflineQueue([...storageService.getOfflineQueue()]);
      setAlerts([...storageService.getAlerts()]);
    });

    const handleOnlineStatus = () => {
      setIsOnline(storageService.isOnline());
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  // Attached example products from image.png
  const attachedExample1 = products.find((p) => p.sku === '1001040') || products[0];
  const attachedExample2 = products.find((p) => p.sku === '1001041') || products[1];

  // Quick single print handler
  const handleQuickPrint = (product: Product) => {
    // Add single item and open batch print modal for instant thermal preview & print
    const newItem: PrintQueueItem = {
      id: `print-${Date.now()}-${product.id}`,
      product,
      quantity: 1,
      templateId: activeTemplateId,
      storeId: activeStore.id,
    };
    setBatchQueue([newItem]);
    setBatchPrintOpen(true);
    audioService.playScanBeep();
  };

  // Add to batch queue
  const handleAddToBatch = (product: Product, quantity: number = 1) => {
    setBatchQueue((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `queue-${Date.now()}-${product.id}`,
          product,
          quantity,
          templateId: activeTemplateId,
          storeId: activeStore.id,
        },
      ];
    });
  };

  // Batch queue updates
  const handleUpdateBatchQuantity = (id: string, delta: number) => {
    setBatchQueue((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBatchQueue = () => {
    setBatchQueue([]);
  };

  // Add multiple items to batch
  const handleAddBatchToQueue = (items: { product: Product; quantity: number }[]) => {
    items.forEach((item) => {
      handleAddToBatch(item.product, item.quantity);
    });
    setBatchPrintOpen(true);
    audioService.playPrintCompleteChime();
  };

  // Toggle offline simulation
  const handleToggleOffline = () => {
    storageService.setSimulatedOffline(!isSimulatedOffline);
  };

  // Quick print pair matching attached example
  const handlePrintAttachedPair = () => {
    setBatchQueue([
      {
        id: `pair-1-${Date.now()}`,
        product: attachedExample1,
        quantity: 1,
        templateId: 'tmpl-supermarket',
        storeId: activeStore.id,
      },
      {
        id: `pair-2-${Date.now()}`,
        product: attachedExample2,
        quantity: 1,
        templateId: 'tmpl-supermarket',
        storeId: activeStore.id,
      },
    ]);
    setActiveTemplateId('tmpl-supermarket');
    setBatchPrintOpen(true);
    audioService.playPrintCompleteChime();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        stores={stores}
        activeStore={activeStore}
        onSelectStore={(id) => storageService.setActiveStoreId(id)}
        currentUser={currentUser}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleOffline={handleToggleOffline}
        batchQueueCount={batchQueue.reduce((s, i) => s + i.quantity, 0)}
        unreadAlertsCount={alerts.filter((a) => !a.isRead).length}
        onOpenScanner={() => setScannerOpen(true)}
        onOpenBatchPrint={() => setBatchPrintOpen(true)}
        onOpenPrinterSettings={() => setPrinterSettingsOpen(true)}
        onOpenTemplateEditor={() => setTemplateEditorOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenDeployGuide={() => setDeployGuideOpen(true)}
        printerSettings={printerSettings}
      />

      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 text-amber-950 flex-shrink-0" />
            <span>
              Offline Mode Active (Local Database Working) —{' '}
              {offlineQueue.length > 0
                ? `${offlineQueue.length} pending transaction(s) will auto-sync when online.`
                : 'All scans and prints work offline.'}
            </span>
            {isSimulatedOffline && (
              <button
                onClick={handleToggleOffline}
                className="ml-auto underline hover:text-white text-[11px] font-extrabold"
              >
                Reconnect to Cloud
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Attached Example Showcase Card (Direct Visual Feedback) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 overflow-hidden relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-500/10 text-red-600 text-xs font-black px-2.5 py-0.5 rounded-full border border-red-500/20 uppercase tracking-wide">
                  Attached Reference Tag Example
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Indonesian Supermarket Dual-Tier Shelf Sticker
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Precision Thermal Print &amp; Barcode Integration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact replica of attached image: Dual-tier unit/carton price in bold red,
                EAN-13 barcode, SKU code &amp; effective date.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrintAttachedPair}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                Print This Pair (Like Example)
              </button>

              <button
                onClick={() => setScannerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <BarcodeIcon className="w-4 h-4 text-blue-600" />
                Test Scan Barcode
              </button>
            </div>
          </div>

          {/* Side-by-side sticker showcase matching attached image.png */}
          <div className="mt-5 p-4 sm:p-6 bg-slate-50/75 rounded-xl border border-slate-200/80 flex flex-wrap gap-4 sm:gap-6 justify-center items-center">
            {/* Tag 1: Indomie Ayam Bawang 69g */}
            <div className="flex flex-col items-center">
              <LabelPreview
                product={attachedExample1}
                template={templates.find((t) => t.id === 'tmpl-supermarket') || templates[0]}
                store={activeStore}
                scale={1.15}
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                SKU: {attachedExample1.sku} | Barcode: {attachedExample1.barcode}
              </span>
            </div>

            {/* Tag 2: Indomie Ayam Spesial 75g */}
            <div className="flex flex-col items-center">
              <LabelPreview
                product={attachedExample2}
                template={templates.find((t) => t.id === 'tmpl-supermarket') || templates[0]}
                store={activeStore}
                scale={1.15}
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                SKU: {attachedExample2.sku} | Barcode: {attachedExample2.barcode}
              </span>
            </div>
          </div>
        </div>

        {/* Primary View Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl shadow-xs gap-3 pt-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'catalog'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarcodeIcon className="w-4 h-4" />
            Product Catalog &amp; Label Printing ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('sync_matrix')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'sync_matrix'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Multi-Store Real-Time Cloud Sync ({stores.length} Branches)
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'analytics'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Inventory Analytics &amp; Reports
          </button>
        </div>

        {/* Tab 1: Product Catalog & Label Printing */}
        {activeTab === 'catalog' && (
          <ProductCatalog
            products={products}
            activeStore={activeStore}
            stores={stores}
            onQuickPrint={handleQuickPrint}
            onAddToBatch={handleAddToBatch}
            onAdjustStock={(p) => {
              setAdjustingProduct(p);
              setStockAdjustOpen(true);
            }}
            onEditProduct={(p) => {
              setEditingProduct(p);
              setProductFormOpen(true);
            }}
            onAddNewProduct={() => {
              setEditingProduct(null);
              setProductFormOpen(true);
            }}
            onDeleteProduct={(id) => storageService.deleteProduct(id)}
            onOpenImport={() => setProductImportOpen(true)}
            userRole={currentUser.role}
            templates={templates}
          />
        )}

        {/* Tab 2: Multi-Store Cloud Stock Synchronization */}
        {activeTab === 'sync_matrix' && (
          <StockSyncMatrix
            products={products}
            stores={stores}
            activeStore={activeStore}
            userRole={currentUser.role}
            userName={currentUser.name}
          />
        )}

        {/* Tab 3: Inventory Dashboard & Analytics */}
        {activeTab === 'analytics' && (
          <InventoryDashboard
            products={products}
            stores={stores}
            activeStore={activeStore}
            onQuickPrint={handleQuickPrint}
            onAddBatchToQueue={handleAddBatchToQueue}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Aman LabelPrint &amp; Inventory</span>
            <span>•</span>
            <span>Thermal ESC/POS &amp; TSPL Ready</span>
            <span>•</span>
            <span>PWA Offline Certified</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              onClick={() => setDeployGuideOpen(true)}
              className="hover:text-blue-600 font-semibold flex items-center gap-1"
            >
              AWS &amp; Vercel Deployment
            </button>
            <button
              onClick={() => setPrinterSettingsOpen(true)}
              className="hover:text-blue-600 font-semibold"
            >
              Printer Settings
            </button>
            <button
              onClick={() => setTemplateEditorOpen(true)}
              className="hover:text-blue-600 font-semibold"
            >
              Template Studio
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSelectProduct={(p) => {
          handleQuickPrint(p);
        }}
        onAddToBatchQueue={(p, qty) => {
          handleAddToBatch(p, qty);
        }}
        onQuickPrint={(p) => {
          handleQuickPrint(p);
        }}
        templates={templates}
        activeStore={activeStore}
      />

      <BatchPrintModal
        isOpen={batchPrintOpen}
        onClose={() => setBatchPrintOpen(false)}
        queue={batchQueue}
        onUpdateQuantity={handleUpdateBatchQuantity}
        onRemoveItem={handleRemoveBatchItem}
        onClearQueue={handleClearBatchQueue}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={setActiveTemplateId}
        activeStore={activeStore}
        printerSettings={printerSettings}
      />

      <ThermalPrinterSettingsModal
        isOpen={printerSettingsOpen}
        onClose={() => setPrinterSettingsOpen(false)}
        settings={printerSettings}
        onSaveSettings={(st) => storageService.savePrinterSettings(st)}
      />

      <TemplateEditorModal
        isOpen={templateEditorOpen}
        onClose={() => setTemplateEditorOpen(false)}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSaveTemplate={(tmpl) => storageService.saveTemplate(tmpl)}
        activeStore={activeStore}
      />

      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        alerts={alerts}
        onMarkAsRead={(id) => storageService.markAlertAsRead(id)}
        onMarkAllAsRead={() => storageService.markAllAlertsAsRead()}
        onClearAlerts={() => storageService.clearAlerts()}
        onQuickPrintFromAlert={(sku) => {
          const p = products.find((prod) => prod.sku === sku);
          if (p) {
            handleQuickPrint(p);
            setNotificationsOpen(false);
          }
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(u) => storageService.setCurrentUser(u)}
        stores={stores}
      />

      <DeployGuideModal
        isOpen={deployGuideOpen}
        onClose={() => setDeployGuideOpen(false)}
      />

      <ProductFormModal
        isOpen={productFormOpen}
        onClose={() => {
          setProductFormOpen(false);
          setEditingProduct(null);
        }}
        onSave={(p) => storageService.saveProduct(p)}
        productToEdit={editingProduct}
        stores={stores}
        activeStoreId={activeStore.id}
      />

      <StockAdjustModal
        isOpen={stockAdjustOpen}
        onClose={() => {
          setStockAdjustOpen(false);
          setAdjustingProduct(null);
        }}
        product={adjustingProduct}
        activeStore={activeStore}
        onConfirmAdjust={(prodId, stId, newQty, reason) => {
          storageService.adjustStock(prodId, stId, newQty, reason, currentUser.name);
          audioService.playPrintCompleteChime();
        }}
      />

      {productImportOpen && (
        <ProductImportModal
          isOpen={productImportOpen}
          onClose={() => setProductImportOpen(false)}
          stores={stores}
          activeStoreId={activeStore.id}
          existingProducts={products}
          onImportComplete={(imported, targetStoreId, updateExisting) => {
            storageService.importProducts(imported, targetStoreId, updateExisting);
          }}
        />
      )}
    </div>
  );
}
