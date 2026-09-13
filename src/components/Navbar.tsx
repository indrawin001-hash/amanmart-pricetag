import React from 'react';
import { 
  Printer, 
  Barcode as BarcodeIcon, 
  Layers, 
  Bell, 
  Building2, 
  Wifi, 
  WifiOff, 
  Settings, 
  Cloud, 
  ShieldCheck,
  LayoutTemplate,
  HelpCircle
} from 'lucide-react';
import { StoreLocation, User, ThermalPrinterSettings, LabelTemplateConfig } from '../types';

interface NavbarProps {
  stores: StoreLocation[];
  activeStore: StoreLocation;
  onSelectStore: (storeId: string) => void;
  currentUser: User;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleOffline: () => void;
  batchQueueCount: number;
  unreadAlertsCount: number;
  onOpenScanner: () => void;
  onOpenBatchPrint: () => void;
  onOpenPrinterSettings: () => void;
  onOpenTemplateEditor: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onOpenDeployGuide: () => void;
  printerSettings: ThermalPrinterSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  stores,
  activeStore,
  onSelectStore,
  currentUser,
  isOnline,
  isSimulatedOffline,
  onToggleOffline,
  batchQueueCount,
  unreadAlertsCount,
  onOpenScanner,
  onOpenBatchPrint,
  onOpenPrinterSettings,
  onOpenTemplateEditor,
  onOpenNotifications,
  onOpenAuth,
  onOpenDeployGuide,
  printerSettings,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <BarcodeIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white leading-none">
                Aman LabelPrint
              </h1>
              <span className="hidden sm:inline-block bg-blue-500/20 text-blue-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-wide">
                Thermal POS &amp; Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden md:block">
              Multi-store barcode pricing stickers &amp; inventory
            </p>
          </div>
        </div>

        {/* Store Location Selector */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={activeStore.id}
            onChange={(e) => onSelectStore(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls Group */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Offline / Online Sync Toggle */}
          <button
            onClick={onToggleOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title={
              isSimulatedOffline
                ? 'Currently in simulated offline mode. Click to restore online sync.'
                : 'Online and synced with cloud. Click to simulate offline mode.'
            }
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Online Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline Mode</span>
              </>
            )}
          </button>

          {/* Barcode Scanner Button */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            title="Open Camera / Hardware Scanner"
          >
            <BarcodeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>

          {/* Batch Print Queue Button */}
          <button
            onClick={onOpenBatchPrint}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60"
            title="Open Bulk Batch Print Queue"
          >
            <Layers className="w-4 h-4" />
            {batchQueueCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                {batchQueueCount}
              </span>
            )}
          </button>

          {/* Thermal Printer Settings */}
          <button
            onClick={onOpenPrinterSettings}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60"
            title="Configure Thermal Printer (Bluetooth/Serial/TSPL)"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Template Designer */}
          <button
            onClick={onOpenTemplateEditor}
            className="hidden md:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60"
            title="Custom Template Studio"
          >
            <LayoutTemplate className="w-4 h-4" />
          </button>

          {/* Notification Center */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60"
            title="Low-Stock Alerts & Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Cloud Deploy Guide */}
          <button
            onClick={onOpenDeployGuide}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60"
            title="Cloud Deployment (AWS, Vercel, PWA)"
          >
            <Cloud className="w-4 h-4" />
          </button>

          {/* User Profile / RBAC Switcher */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition"
            title="Switch User Role & Permissions"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden xl:block">
              <div className="text-[11px] font-bold text-slate-200 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                {currentUser.role}
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
