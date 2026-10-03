'use client';

import React, { useState, useRef } from 'react';
import { FileText, Upload, X, AlertCircle, Check, Layers } from 'lucide-react';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPdfPages: (pages: Array<{ assetUrl: string; pageNumber: number; width: number; height: number }>) => void;
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({ isOpen, onClose, onImportPdfPages }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; dataUrl: string; width: number; height: number }>>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPdfFile(file);
  };

  const processPdfFile = async (file: File) => {
    setError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF document (.pdf).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('PDF file size exceeds maximum limit of 25MB.');
      return;
    }

    setIsProcessing(true);

    try {
      // Load PDFjs dynamically from CDN script tag if window.pdfjsLib is not present
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load PDF rendering library.'));
          document.head.appendChild(script);
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = (window as any).pdfjsLib;
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      if (pdf.numPages > 100) {
        setError('PDF document contains more than 100 pages maximum limit.');
        setIsProcessing(false);
        return;
      }

      const pagesList: Array<{ pageNumber: number; dataUrl: string; width: number; height: number }> = [];

      for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          pagesList.push({
            pageNumber: i,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
          });
        }
      }

      setPdfPages(pagesList);
      setSelectedPages(pagesList.map((p) => p.pageNumber)); // Default select all pages
      setIsProcessing(false);
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setError(err?.message || 'Failed to render PDF pages.');
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === pdfPages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pdfPages.map((p) => p.pageNumber));
    }
  };

  const handleConfirmImport = async () => {
    if (selectedPages.length === 0) {
      setError('Please select at least one page to import.');
      return;
    }

    setIsProcessing(true);
    const pagesToImport = pdfPages.filter((p) => selectedPages.includes(p.pageNumber));
    const importedPages: Array<{ assetUrl: string; pageNumber: number; width: number; height: number }> = [];

    for (const pageItem of pagesToImport) {
      try {
        const res = await fetch('http://localhost:4000/api/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: `pdf_page_${pageItem.pageNumber}.png`, dataUrl: pageItem.dataUrl }),
        });

        const data = await res.json();
        if (res.ok && data.assetUrl) {
          const fullAssetUrl = data.assetUrl.startsWith('http')
            ? data.assetUrl
            : `http://localhost:4000${data.assetUrl}`;

          importedPages.push({
            assetUrl: fullAssetUrl,
            pageNumber: pageItem.pageNumber,
            width: pageItem.width,
            height: pageItem.height,
          });
        }
      } catch (e) {
        console.error(`Failed to upload page ${pageItem.pageNumber}:`, e);
      }
    }

    setIsProcessing(false);
    onImportPdfPages(importedPages);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Import PDF Document</h3>
            <p className="text-xs text-slate-400">Select individual pages or import all pages onto whiteboard</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pdfPages.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-850 hover:bg-slate-800/50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group my-auto"
          >
            <Upload className="w-12 h-12 text-slate-400 group-hover:text-purple-400 mb-3 transition-colors" />
            <p className="text-sm font-medium text-slate-200">Click or Drag & Drop PDF Here</p>
            <p className="text-xs text-slate-500 mt-1">PDF files up to 25MB (Max 100 pages)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-3 text-xs">
              <span className="text-slate-400">
                {pdfPages.length} Pages Detected ({selectedPages.length} Selected)
              </span>
              <button
                onClick={handleSelectAll}
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                {selectedPages.length === pdfPages.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 pr-1">
              {pdfPages.map((page) => {
                const isSelected = selectedPages.includes(page.pageNumber);
                return (
                  <div
                    key={page.pageNumber}
                    onClick={() => togglePageSelection(page.pageNumber)}
                    className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                        : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-32 object-contain bg-white/5" />
                    <div className="p-1.5 bg-slate-900/90 backdrop-blur-sm flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300">Page {page.pageNumber}</span>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-purple-500 text-white' : 'border border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-purple-400">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span>Rendering PDF pages...</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>

          {pdfPages.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={isProcessing || selectedPages.length === 0}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors shadow-lg shadow-purple-600/20 flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5" />
              Import {selectedPages.length} Pages
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
