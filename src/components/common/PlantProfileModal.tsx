import React, { useState } from 'react';
import {
  X,
  Edit3,
  Check,
  RefreshCw,
  Eye,
  FileText,
  Flame,
  Building,
  MapPin,
  Zap,
  Leaf,
  Info,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { db } from '../../services/db';
import { PlantProfile } from '../../types';

interface PlantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedProfile: PlantProfile) => void;
}

export const PlantProfileModal: React.FC<PlantProfileModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { isArabic } = useLanguage();
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'main' | 'specs' | 'description' | 'preview'>('main');
  const [formData, setFormData] = useState<PlantProfile>(() => db.getPlantProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updated = db.updatePlantProfile(
      formData,
      currentUser.id,
      currentUser.nameAr || currentUser.username
    );

    setSavedSuccess(true);
    if (onSaved) onSaved(updated);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetToDefaults = () => {
    if (!currentUser) return;
    const restored = db.resetPlantProfile(
      currentUser.id,
      currentUser.nameAr || currentUser.username
    );
    setFormData(restored);
    setResetConfirm(false);
    if (onSaved) onSaved(restored);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isArabic ? 'تحرير النصوص والبيانات التعريفية عن المحطة والنظام' : 'Edit Plant & System Descriptive Texts'}
              </h2>
              <p className="text-xs text-slate-400">
                {isArabic
                  ? 'صلاحية كاملة لإدارة النصوص الرسمية للوحة التحكم والتعريف بالمنظومة'
                  : 'Full editorial control over plant profile, telemetry headers, and mission statements'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'main'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isArabic ? 'العناوين والنصوص التعريفية' : 'Headings & Overview'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'specs'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>{isArabic ? 'بيانات الموقع والمواصفات' : 'Site & Specs'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'description'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>{isArabic ? 'الوصف الفني والأثر البيئي' : 'Technical & Environmental'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isArabic ? 'معاينة العرض الحي' : 'Live Preview'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-md">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isArabic ? 'تم حفظ وتحديث النصوص التعريفية بنجاح!' : 'Descriptive texts updated successfully!'}</span>
            </div>
          )}

          {activeTab === 'main' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'يتم عرض هذه العناوين والنصوص أعلى لوحة التحكم الرئيسية وشاشات القياسات المباشرة لنظام السكادا.'
                    : 'These titles and descriptions appear on the main dashboard header and SCADA live telemetry banner.'}
                </span>
              </div>

              {/* Facility Name (Arabic) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'اسم المحطة الرسمي (باللغة العربية) *' : 'Facility Official Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.facilityNameAr}
                  onChange={(e) => setFormData({ ...formData, facilityNameAr: e.target.value })}
                  placeholder="محطة توليد الكهرباء من الغاز الحيوي - مكب الغباوي الهندسي"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-medium"
                />
              </div>

              {/* Facility Name (English) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'اسم المحطة الرسمي (باللغة الإنجليزية) *' : 'Facility Official Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.facilityNameEn}
                  onChange={(e) => setFormData({ ...formData, facilityNameEn: e.target.value })}
                  placeholder="Al-Ghabawi Landfill Biogas Power Generation Facility"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-medium"
                />
              </div>

              {/* Subtitle / Telemetry Summary (Arabic) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'النص التعريفي والموجز الفني المباشر (باللغة العربية) *' : 'Introductory Subtitle & Technical Overview (Arabic) *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.subTitleAr}
                  onChange={(e) => setFormData({ ...formData, subTitleAr: e.target.value })}
                  placeholder="تشغيل مستمر لـ 3 مولدات MWM بقدرة إجمالية 4.68 MWe..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Subtitle / Telemetry Summary (English) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'النص التعريفي والموجز الفني المباشر (باللغة الإنجليزية) *' : 'Introductory Subtitle & Technical Overview (English) *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.subTitleEn}
                  onChange={(e) => setFormData({ ...formData, subTitleEn: e.target.value })}
                  placeholder="Continuous operation of 3x MWM gensets at 4.68 MWe..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Operating Company (Arabic) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'الشركة المشغلة (عربي)' : 'Operating Company (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.companyNameAr}
                    onChange={(e) => setFormData({ ...formData, companyNameAr: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Operating Company (English) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'الشركة المشغلة (إنجليزي)' : 'Operating Company (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.companyNameEn}
                    onChange={(e) => setFormData({ ...formData, companyNameEn: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Geographical Location (Arabic) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'الموقع الجغرافي (عربي)' : 'Location (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.locationAr}
                    onChange={(e) => setFormData({ ...formData, locationAr: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Geographical Location (English) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'الموقع الجغرافي (إنجليزي)' : 'Location (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.locationEn}
                    onChange={(e) => setFormData({ ...formData, locationEn: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Installed Capacity (Arabic) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'القدرة التوليدية المركبة (عربي)' : 'Installed Capacity (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.installedCapacityAr}
                    onChange={(e) => setFormData({ ...formData, installedCapacityAr: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                </div>

                {/* Installed Capacity (English) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'القدرة التوليدية المركبة (إنجليزي)' : 'Installed Capacity (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.installedCapacityEn}
                    onChange={(e) => setFormData({ ...formData, installedCapacityEn: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                </div>

                {/* Grid Interconnection (Arabic) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'شبكة الربط الكهربائي (عربي)' : 'Grid Interconnection (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.gridConnectionAr}
                    onChange={(e) => setFormData({ ...formData, gridConnectionAr: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Grid Interconnection (English) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    {isArabic ? 'شبكة الربط الكهربائي (إنجليزي)' : 'Grid Interconnection (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.gridConnectionEn}
                    onChange={(e) => setFormData({ ...formData, gridConnectionEn: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'description' && (
            <div className="space-y-4 animate-fade-in">
              {/* Detailed Plant Overview (Arabic) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'النص التعريفي والوصفي الشامل عن المنظومة والمحطة (عربي) *' : 'Detailed System & Plant Description (Arabic) *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.plantDescriptionAr}
                  onChange={(e) => setFormData({ ...formData, plantDescriptionAr: e.target.value })}
                  placeholder="مشروع بيئي وهندسي ريادي يهدف إلى استخلاص ومعالجة غاز الميثان الحيوي..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition leading-relaxed"
                />
              </div>

              {/* Detailed Plant Overview (English) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'النص التعريفي والوصفي الشامل عن المنظومة والمحطة (إنجليزي) *' : 'Detailed System & Plant Description (English) *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.plantDescriptionEn}
                  onChange={(e) => setFormData({ ...formData, plantDescriptionEn: e.target.value })}
                  placeholder="A pioneering environmental and engineering initiative aimed at extracting..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition leading-relaxed"
                />
              </div>

              {/* Environmental Impact (Arabic) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'الأثر البيئي وخفض الانبعاثات الكربونية (عربي)' : 'Environmental & Carbon Impact (Arabic)'}
                </label>
                <textarea
                  rows={3}
                  value={formData.environmentalImpactAr}
                  onChange={(e) => setFormData({ ...formData, environmentalImpactAr: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition leading-relaxed"
                />
              </div>

              {/* Environmental Impact (English) */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  {isArabic ? 'الأثر البيئي وخفض الانبعاثات الكربونية (إنجليزي)' : 'Environmental & Carbon Impact (English)'}
                </label>
                <textarea
                  rows={3}
                  value={formData.environmentalImpactEn}
                  onChange={(e) => setFormData({ ...formData, environmentalImpactEn: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Eye className="w-4 h-4 shrink-0" />
                <span>{isArabic ? 'معاينة فورية لكيفية ظهور النصوص على لوحة التحكم:' : 'Live preview of how the texts appear on the dashboard:'}</span>
              </div>

              {/* Live Banner Preview */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 p-4 sm:p-5 shadow-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono text-emerald-300 font-bold uppercase">
                    LIVE BIOGAS SCADA TELEMETRY
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isArabic ? formData.facilityNameAr : formData.facilityNameEn}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isArabic ? formData.subTitleAr : formData.subTitleEn}
                </p>
              </div>

              {/* Live Card Preview */}
              <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Flame className="w-4 h-4" />
                  <span>{isArabic ? 'نبذة تفصيلية عن المحطة والمنظومة' : 'Plant System Overview'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isArabic ? formData.plantDescriptionAr : formData.plantDescriptionEn}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800 text-slate-400">
                  <div>
                    <span className="block text-slate-500">{isArabic ? 'الموقع' : 'Location'}:</span>
                    <span className="font-bold text-white">{isArabic ? formData.locationAr : formData.locationEn}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">{isArabic ? 'القدرة التوليدية' : 'Capacity'}:</span>
                    <span className="font-bold text-emerald-400">{isArabic ? formData.installedCapacityAr : formData.installedCapacityEn}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              {resetConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-300">{isArabic ? 'هل تؤكد استعادة الافتراضي؟' : 'Confirm restore?'}</span>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
                  >
                    {isArabic ? 'نعم، استعد' : 'Yes, Restore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirm(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'استعادة النصوص الافتراضية' : 'Restore Default Texts'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition"
              >
                <Check className="w-4 h-4" />
                <span>{isArabic ? 'حفظ النصوص والبيانات' : 'Save Texts & Profile'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
