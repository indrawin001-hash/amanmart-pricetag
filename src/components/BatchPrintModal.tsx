import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Printer, 
  Trash2, 
  Plus, 
  Minus, 
  X, 
  Layers, 
  Settings2, 
  FileCode, 
  Check, 
  Copy, 
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Product, LabelTemplateConfig, StoreLocation, PrintQueueItem, ThermalPrinterSettings } from '../types';
import { LabelPreview } from './LabelPreview';
import { thermalPrinterService } from '../services/thermalPrinterService';
import { audioService } from '../services/audioService';

interface BatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: PrintQueueItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  templates: LabelTemplateConfig[];
  activeTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  activeStore: StoreLocation;
  printerSettings: ThermalPrinterSettings;
}

export const BatchPrintModal: React.FC<BatchPrintModalProps> = ({
  isOpen,
  onClose,
  queue,
  onUpdateQuantity,
  onRemoveItem,
  onClearQueue,
  templates,
  activeTemplateId,
  onSelectTemplate,
  activeStore,
  printerSettings,
}) => {
  const [layoutMode, setLayoutMode] = useState<'side_by_side' | 'single_roll' | 'sheet_grid'>('side_by_side');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [showRawCommands, setShowRawCommands] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];
  const totalLabels = queue.reduce((sum, item) => sum + item.quantity, 0);

  // Flattened array for printing each individual copy
  const flattenedLabels: { item: PrintQueueItem; copyIndex: number }[] = [];
  queue.forEach((item) => {
    for (let c = 0; c < item.quantity; c++) {
      flattenedLabels.push({ item, copyIndex: c + 1 });
    }
  });

  // Trigger Print Execution
  const handleExecutePrint = async () => {
    if (flattenedLabels.length === 0) return;

    setIsPrinting(true);

    try {
      if (printerSettings.connectionType === 'browser_print') {
        thermalPrinterService.triggerSystemPrint('batch-printable-labels-area');
      } else {
        // Bluetooth or Serial TSPL direct print
        thermalPrinterService.triggerSystemPrint('batch-printable-labels-area');
      }

      // Play audio chime and trigger confetti
      audioService.playPrintCompleteChime();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      alert('Print error: ' + (err.message || 'Failed to communicate with printer'));
    } finally {
      setTimeout(() => setIsPrinting(false), 800);
    }
  };

  // Generate TSPL script for all queue items
  const generatedTsplCode = queue
    .map((item) => thermalPrinterService.generateTSPL(item.product, currentTemplate, item.quantity))
    .join('\r\n\r\n');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedTsplCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400 flex items-center justify-center text-red-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Bulk Batch Printing</h2>
                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold border border-red-500/30">
                  {totalLabels} Labels in Batch
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous thermal roll, multi-column shelf stickers, or A4 sticker sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawCommands(!showRawCommands)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              <FileCode className="w-3.5 h-3.5" />
              {showRawCommands ? 'Hide TSPL' : 'Raw TSPL / ESC-POS'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Template:</span>
            <select
              value={activeTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.widthMm}x{tmpl.heightMm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Layout Mode */}
          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setLayoutMode('side_by_side')}
              className={`px-3 py-1 rounded font-semibold transition ${
                layoutMode === 'side_by_side'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side-by-Side (Like Example)
            </button>
            <button
              onClick={() => setLayoutMode('single_roll')}
              className={`px-3 py-1 rounded font-semibold transition ${
                layoutMode === 'single_roll'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Roll (58/80mm)
            </button>
            <button
              onClick={() => setLayoutMode('sheet_grid')}
              className={`px-3 py-1 rounded font-semibold transition ${
                layoutMode === 'sheet_grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Sheet Grid
            </button>
          </div>

          {/* Clear Queue */}
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Queue
            </button>
          )}
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Queue Items List */}
          <div className="w-full md:w-72 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden max-h-56 md:max-h-none">
            <div className="p-3 border-b border-slate-200 font-bold text-xs text-slate-600 uppercase tracking-wider flex justify-between items-center">
              <span>Items in Batch ({queue.length})</span>
              <span className="text-slate-400">{totalLabels} total</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {queue.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Batch queue is empty. Scan barcodes or select products to add labels.
                </div>
              ) : (
                queue.map((qItem) => (
                  <div
                    key={qItem.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-xs text-slate-800 line-clamp-1">
                        {qItem.product.name}
                      </div>
                      <button
                        onClick={() => onRemoveItem(qItem.id)}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span className="font-mono">{qItem.product.sku}</span>
                      <span className="font-bold text-red-600">
                        {qItem.product.currency} {qItem.product.pricing.unitPrice.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium">Copies:</span>
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(qItem.id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-800">
                          {qItem.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(qItem.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Live Printable Stage Preview */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex flex-col items-center">
            {showRawCommands ? (
              <div className="w-full h-full bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-auto flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                  <span className="text-slate-300 font-bold">TSPL Direct Command Buffer</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px]"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? 'Copied' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="flex-1 whitespace-pre-wrap">{generatedTsplCode}</pre>
              </div>
            ) : (
              <div className="w-full max-w-3xl flex flex-col items-center space-y-4">
                <div className="text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    High-Fidelity Thermal Label Print Preview
                  </span>
                  <p className="text-xs text-slate-500">
                    Showing {flattenedLabels.length} formatted labels ready for printer feed
                  </p>
                </div>

                {/* Printable container targeted by Thermal Print Service */}
                <div
                  id="batch-printable-labels-area"
                  className={`bg-white p-4 rounded-xl shadow-md border border-slate-300 transition-all ${
                    layoutMode === 'side_by_side'
                      ? 'flex flex-wrap gap-4 justify-center items-start'
                      : layoutMode === 'single_roll'
                      ? 'flex flex-col gap-3 items-center'
                      : 'grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 border-dashed border-2 border-slate-400 max-w-2xl'
                  }`}
                >
                  {flattenedLabels.length === 0 ? (
                    <div className="py-12 px-8 text-center text-slate-400 text-sm">
                      No labels queued for printing.
                    </div>
                  ) : (
                    flattenedLabels.map(({ item, copyIndex }, idx) => (
                      <div key={`${item.id}-${copyIndex}-${idx}`} className="flex flex-col items-center">
                        <LabelPreview
                          product={item.product}
                          template={currentTemplate}
                          store={activeStore}
                          scale={1.05}
                          isPrintMode={false}
                        />
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 print:hidden">
                          #{idx + 1} of {totalLabels}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Destination:{' '}
            <span className="font-semibold text-slate-800">
              {printerSettings.connectionType === 'browser_print'
                ? 'Standard Thermal / System Print Dialog'
                : 'Direct Hardware Device'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Close
            </button>

            <button
              onClick={handleExecutePrint}
              disabled={flattenedLabels.length === 0 || isPrinting}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Printing Labels...' : `Print All ${totalLabels} Labels`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
