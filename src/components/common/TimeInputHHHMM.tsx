import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface TimeInputHHHMMProps {
  id?: string;
  label?: string;
  totalMinutes?: number;
  initialFormatted?: string;
  onChange: (totalMinutes: number, formatted: string, hours: number, minutes: number) => void;
  disabled?: boolean;
  required?: boolean;
  isArabic?: boolean;
}

/**
 * Format total minutes to HHH:MM string (e.g. 270 min -> "004:30")
 */
export function minutesToHHHMM(totalMinutes: number): string {
  const safeMin = Math.max(0, Math.round(totalMinutes || 0));
  const h = Math.min(999, Math.floor(safeMin / 60));
  const m = Math.min(59, safeMin % 60);
  return `${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format hours float to HHH:MM string (e.g. 4.5 hours -> "004:30")
 */
export function hoursFloatToHHHMM(hoursFloat: number): string {
  const safeFloat = Math.max(0, hoursFloat || 0);
  const totalMin = Math.round(safeFloat * 60);
  return minutesToHHHMM(totalMin);
}

/**
 * Parse HHH:MM string into { hours, minutes, totalMinutes }
 */
export function parseHHHMM(val: string): { hours: number; minutes: number; totalMinutes: number } {
  if (!val || typeof val !== 'string') return { hours: 0, minutes: 0, totalMinutes: 0 };
  const parts = val.split(':');
  const h = Math.min(999, Math.max(0, parseInt(parts[0], 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  return { hours: h, minutes: m, totalMinutes: h * 60 + m };
}

export const TimeInputHHHMM: React.FC<TimeInputHHHMMProps> = ({
  id = 'time-input-hhhmm',
  label,
  totalMinutes,
  initialFormatted,
  onChange,
  disabled = false,
  required = false,
  isArabic = true,
}) => {
  const [hoursStr, setHoursStr] = useState<string>('000');
  const [minutesStr, setMinutesStr] = useState<string>('00');
  const [error, setError] = useState<string | null>(null);

  // Sync from props
  useEffect(() => {
    if (initialFormatted && initialFormatted.includes(':')) {
      const parsed = parseHHHMM(initialFormatted);
      setHoursStr(String(parsed.hours).padStart(3, '0'));
      setMinutesStr(String(parsed.minutes).padStart(2, '0'));
    } else if (typeof totalMinutes === 'number') {
      const parsed = parseHHHMM(minutesToHHHMM(totalMinutes));
      setHoursStr(String(parsed.hours).padStart(3, '0'));
      setMinutesStr(String(parsed.minutes).padStart(2, '0'));
    }
  }, [initialFormatted, totalMinutes]);

  const updateValues = (newHStr: string, newMStr: string) => {
    const rawH = parseInt(newHStr, 10);
    const rawM = parseInt(newMStr, 10);

    let err: string | null = null;
    if (isNaN(rawH) || rawH < 0 || rawH > 999) {
      err = isArabic ? 'الساعات يجب أن تكون بين 000 و 999' : 'Hours must be 000 - 999';
    } else if (isNaN(rawM) || rawM < 0 || rawM > 59) {
      err = isArabic ? 'الدقائق يجب أن تكون بين 00 و 59' : 'Minutes must be 00 - 59';
    }
    setError(err);

    const safeH = isNaN(rawH) ? 0 : Math.min(999, Math.max(0, rawH));
    const safeM = isNaN(rawM) ? 0 : Math.min(59, Math.max(0, rawM));
    const totMin = safeH * 60 + safeM;
    const formatted = `${String(safeH).padStart(3, '0')}:${String(safeM).padStart(2, '0')}`;

    onChange(totMin, formatted, safeH, safeM);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setHoursStr(val);
    updateValues(val, minutesStr);
  };

  const handleHoursBlur = () => {
    const safeH = Math.min(999, Math.max(0, parseInt(hoursStr, 10) || 0));
    setHoursStr(String(safeH).padStart(3, '0'));
    updateValues(String(safeH), minutesStr);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMinutesStr(val);
    updateValues(hoursStr, val);
  };

  const handleMinutesBlur = () => {
    const safeM = Math.min(59, Math.max(0, parseInt(minutesStr, 10) || 0));
    setMinutesStr(String(safeM).padStart(2, '0'));
    updateValues(hoursStr, String(safeM));
  };

  const currentFormatted = `${String(Math.min(999, Math.max(0, parseInt(hoursStr, 10) || 0))).padStart(3, '0')}:${String(
    Math.min(59, Math.max(0, parseInt(minutesStr, 10) || 0))
  ).padStart(2, '0')}`;

  return (
    <div className="space-y-1.5" id={id}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{label}</span>
            {required && <span className="text-rose-400">*</span>}
          </label>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            {currentFormatted}
          </span>
        </div>
      )}

      <div
        className={`flex items-center gap-2 p-2 rounded-xl bg-slate-950 border ${
          error ? 'border-rose-500/70' : 'border-slate-700 focus-within:border-emerald-500'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Hours input (000 - 999) */}
        <div className="flex-1 text-center">
          <label className="block text-[9px] font-medium text-slate-400 mb-0.5">
            {isArabic ? 'الساعات (000 - 999)' : 'Hours (000 - 999)'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
            value={hoursStr}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            placeholder="000"
            className="w-full text-center text-sm font-mono font-bold text-emerald-400 bg-slate-900 border border-slate-800 rounded-lg py-1.5 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Colon separator */}
        <div className="pt-4 text-base font-black text-slate-400 font-mono">:</div>

        {/* Minutes input (00 - 59) */}
        <div className="flex-1 text-center">
          <label className="block text-[9px] font-medium text-slate-400 mb-0.5">
            {isArabic ? 'الدقائق (00 - 59)' : 'Minutes (00 - 59)'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
            value={minutesStr}
            onChange={handleMinutesChange}
            onBlur={handleMinutesBlur}
            placeholder="00"
            className="w-full text-center text-sm font-mono font-bold text-emerald-400 bg-slate-900 border border-slate-800 rounded-lg py-1.5 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {error ? (
        <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
          <span>{isArabic ? 'الصيغة المعتمدة: HHH:MM' : 'Format: HHH:MM'}</span>
          <span>{isArabic ? 'ساعات : دقائق' : 'Hours : Minutes'}</span>
        </div>
      )}
    </div>
  );
};
