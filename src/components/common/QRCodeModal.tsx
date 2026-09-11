import React from 'react';
import { QrCode, Printer, X, Download, Flame, ShieldCheck } from 'lucide-react';
import { Equipment } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  equipment,
}) => {
  const { isArabic, t } = useLanguage();

  if (!isOpen || !equipment) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate deterministic grid pattern based on string hash for authentic QR appearance
  const generateMatrix = (code: string) => {
    const size = 21; // 21x21 standard Version 1 QR matrix
    const matrix: boolean[][] = Array(size)
      .fill(false)
      .map(() => Array(size).fill(false));

    // Corner Finder Patterns
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0); // Top-left
    drawFinder(size - 7, 0); // Top-right
    drawFinder(0, size - 7); // Bottom-left

    // Deterministic pseudo data cells
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash << 5) - hash + code.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip corner finder zones
        const inFinder =
          (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
        if (!inFinder) {
          const bit = (Math.abs(hash * (r + 1) * (c + 1) * 31) % 100) > 46;
          matrix[r][c] = bit;
        }
      }
    }

    return { matrix, size };
  };

  const { matrix, size } = generateMatrix(equipment.code + '_' + equipment.qrCodeValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in print:p-0 print:bg-white">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Close Button (hidden on print) */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Content (Printable Asset Label) */}
        <div id="printable-qr-card" className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center text-amber-300">
              <Flame className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xs tracking-wider uppercase text-emerald-400 print:text-emerald-800">
              Jordan Biogas Company
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block">
              {isArabic ? 'بطاقة الأصل الرقمية الرسمية' : 'OFFICIAL ASSET QR IDENTIFIER'}
            </span>
            <h3 className="text-base font-black text-white print:text-black mt-0.5">
              {isArabic ? equipment.nameAr : equipment.nameEn}
            </h3>
            <p className="text-xs font-mono font-bold text-emerald-400 print:text-black mt-0.5">
              {equipment.code}
            </p>
          </div>

          {/* QR Code SVG */}
          <div className="bg-white p-4 rounded-2xl inline-block shadow-md mx-auto border-2 border-emerald-500/30">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-48 h-48 mx-auto"
              shapeRendering="crispEdges"
            >
              {matrix.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#022c22" />
                  ) : null
                )
              )}
            </svg>
          </div>

          {/* Details */}
          <div className="bg-slate-950/70 print:bg-slate-100 p-3 rounded-xl border border-slate-800 print:border-slate-300 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">{t('location')}:</span>
              <span className="font-semibold text-slate-200 print:text-black truncate max-w-[170px]">
                {equipment.location}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('equipModel')}:</span>
              <span className="font-mono text-slate-200 print:text-black">
                {equipment.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('operatingHours')}:</span>
              <span className="font-mono text-emerald-400 print:text-emerald-700 font-bold">
                {equipment.operatingHours.toLocaleString()} h
              </span>
            </div>
          </div>

          {/* Print Action Buttons (hidden during printing) */}
          <div className="pt-2 flex items-center justify-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{t('printQR')}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
