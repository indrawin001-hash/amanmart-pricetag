import React, { useState } from 'react';
import { X, Save, Barcode as BarcodeIcon, Sparkles } from 'lucide-react';
import { Product, StoreLocation } from '../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  productToEdit?: Product | null;
  stores: StoreLocation[];
  activeStoreId: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  stores,
  activeStoreId,
}) => {
  const [sku, setSku] = useState<string>(productToEdit?.sku || `100${Math.floor(1000 + Math.random() * 9000)}`);
  const [barcode, setBarcode] = useState<string>(
    productToEdit?.barcode || `899${Math.floor(1000000000 + Math.random() * 9000000000)}`
  );
  const [name, setName] = useState<string>(productToEdit?.name || '');
  const [category, setCategory] = useState<string>(productToEdit?.category || 'Grocery');
  const [brand, setBrand] = useState<string>(productToEdit?.brand || '');
  const [unitLabel, setUnitLabel] = useState<string>(productToEdit?.pricing.unitLabel || 'PCS');
  const [unitPrice, setUnitPrice] = useState<number>(productToEdit?.pricing.unitPrice || 5000);
  const [bulkLabel, setBulkLabel] = useState<string>(productToEdit?.pricing.bulkLabel || 'CRT');
  const [bulkQty, setBulkQty] = useState<number>(productToEdit?.pricing.bulkQuantity || 24);
  const [bulkPrice, setBulkPrice] = useState<number>(productToEdit?.pricing.bulkPrice || 110000);
  const [stockQuantity, setStockQuantity] = useState<number>(
    productToEdit?.stocks[activeStoreId]?.quantity || 50
  );
  const [minThreshold, setMinThreshold] = useState<number>(
    productToEdit?.stocks[activeStoreId]?.minThreshold || 20
  );

  if (!isOpen) return null;

  const handleGenerateEan13 = () => {
    // Generate valid 13-digit EAN barcode
    const raw12 = '899' + Math.floor(100000000 + Math.random() * 900000000).toString();
    // Compute checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const n = parseInt(raw12[i]);
      sum += i % 2 === 0 ? n : n * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    setBarcode(raw12 + check.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }

    const currentStocks = productToEdit?.stocks || {};
    stores.forEach((s) => {
      if (!currentStocks[s.id]) {
        currentStocks[s.id] = {
          storeId: s.id,
          quantity: s.id === activeStoreId ? stockQuantity : 25,
          minThreshold: minThreshold,
          lastUpdated: new Date().toISOString(),
        };
      } else if (s.id === activeStoreId) {
        currentStocks[s.id].quantity = stockQuantity;
        currentStocks[s.id].minThreshold = minThreshold;
        currentStocks[s.id].lastUpdated = new Date().toISOString();
      }
    });

    const newProduct: Product = {
      id: productToEdit?.id || `prod-${Date.now()}`,
      sku,
      barcode,
      barcodeType: 'EAN13',
      name: name.trim().toUpperCase(),
      category,
      brand: brand.trim() || 'Generic',
      department: `${category} / General`,
      currency: 'Rp.',
      pricing: {
        unitLabel: unitLabel.trim().toUpperCase(),
        unitQuantity: 1,
        unitPrice,
        bulkLabel: bulkLabel.trim().toUpperCase(),
        bulkQuantity: bulkQty,
        bulkPrice,
      },
      stocks: currentStocks,
      dateEffective: new Date().toLocaleDateString('en-GB'),
      locationBin: productToEdit?.locationBin || 'A-01-01',
    };

    onSave(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-blue-400" />
            {productToEdit ? 'Edit Product Label & Stock' : 'Add New Inventory Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Product Name */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
              Product Title / Shelf Label Description
            </label>
            <input
              type="text"
              placeholder="e.g. INDOMIE AYAM BAWANG BAG 69GR"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SKU and Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Internal SKU / PLU Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold uppercase tracking-wider text-slate-500">
                  Barcode (EAN-13 / 128)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateEan13}
                  className="text-blue-600 hover:text-blue-800 text-[10px] font-bold"
                >
                  Generate EAN-13
                </button>
              </div>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          {/* Category and Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>

          {/* Multi-Tier Pricing (As in Attached Example) */}
          <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 space-y-3">
            <span className="font-bold text-red-900 block text-xs uppercase tracking-wider">
              Multi-Tier Retail Pricing (Like Attached Example)
            </span>

            {/* Unit Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Single Unit Price (Rp.)
                </label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-red-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Unit Label (e.g. PCS, BTL)
                </label>
                <input
                  type="text"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold uppercase"
                />
              </div>
            </div>

            {/* Bulk / Carton Price */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Bulk Price (Rp.)
                </label>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Bulk Label (e.g. CRT)
                </label>
                <input
                  type="text"
                  value={bulkLabel}
                  onChange={(e) => setBulkLabel(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Items in Bulk (Qty)
                </label>
                <input
                  type="number"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Initial Stock Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Stock Quantity (Units)
              </label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Min Reorder Alert Threshold
              </label>
              <input
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-amber-700"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
