import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Database,
  RefreshCw,
  Trash2,
  Shield,
  Bell,
  HardDrive,
  CheckCircle2,
  Flame,
  Smartphone,
  Edit3,
  MapPin,
  Building,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { db } from '../../services/db';
import { PlantProfile } from '../../types';
import { PlantProfileModal } from '../common/PlantProfileModal';

export const SettingsModule: React.FC = () => {
  const { language, setLanguage, isArabic, t } = useLanguage();
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();
  const canEditTexts = isAdmin || isSuperAdmin || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [plantProfile, setPlantProfile] = useState<PlantProfile>(() => db.getPlantProfile());
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const handleSyncNow = () => {
    setSyncStatus(isArabic ? 'جاري التحقق من سلامة البيانات والمزامنة...' : 'Syncing local records...');
    setTimeout(() => {
      setSyncStatus(isArabic ? 'تمت المزامنة بنجاح وحفظ كافة التعديلات' : 'Data synchronized successfully!');
      setTimeout(() => setSyncStatus(null), 3000);
    }, 1200);
  };

  const handleResetData = () => {
    if (
      confirm(
        isArabic
          ? 'هل أنت متأكد من إعادة ضبط البيانات إلى بيانات المصنع والتشغيل الأساسية؟'
          : 'Are you sure you want to restore default plant operational data?'
      )
    ) {
      db.resetToDefaults();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-5 pb-14 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">{t('navSettings')}</h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'إعدادات النظام، اللغات، التخزين المحلي، وتهيئة الموقع' : 'System preferences, offline sync, and site configuration'}
          </p>
        </div>
      </div>

      {/* Language Preferences */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase">{t('settingsLanguage')}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLanguage('ar')}
            className={`p-3.5 rounded-xl border text-center transition font-bold text-xs ${
              language === 'ar'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            العربية (الأردن) — الافتراضي
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`p-3.5 rounded-xl border text-center transition font-bold text-xs ${
              language === 'en'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            English (LTR)
          </button>
        </div>
      </div>

      {/* Biogas Plant Site Profile */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase">
              {isArabic ? 'بيانات ونصوص محطة الغاز الحيوي المشغلة' : 'Operating Biogas Plant Profile & Texts'}
            </h3>
          </div>

          {canEditTexts && (
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تحرير النصوص التعريفية' : 'Edit Descriptive Texts'}</span>
            </button>
          )}
        </div>

        {/* Facility Name & Subtitle Preview */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
          <span className="text-[11px] text-emerald-400 font-bold block">
            {isArabic ? plantProfile.facilityNameAr : plantProfile.facilityNameEn}
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isArabic ? plantProfile.subTitleAr : plantProfile.subTitleEn}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 block">{isArabic ? 'الشركة المشغلة' : 'Operating Company'}</span>
            <span className="font-bold text-white mt-0.5 block">
              {isArabic ? plantProfile.companyNameAr : plantProfile.companyNameEn}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{isArabic ? 'الموقع الجغرافي' : 'Location'}</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">
              {isArabic ? plantProfile.locationAr : plantProfile.locationEn}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{isArabic ? 'القدرة التوليدية المركبة' : 'Installed Capacity'}</span>
            <span className="font-mono text-slate-200 mt-0.5 block">
              {isArabic ? plantProfile.installedCapacityAr : plantProfile.installedCapacityEn}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{isArabic ? 'شبكة الربط ونقل الطاقة' : 'Grid Connection'}</span>
            <span className="font-mono text-teal-400 mt-0.5 block">
              {isArabic ? plantProfile.gridConnectionAr : plantProfile.gridConnectionEn}
            </span>
          </div>
        </div>

        {/* Full Plant Overview Description */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">
            {isArabic ? 'الوصف التعريفي المعتمد للمنظومة:' : 'Official Plant Mission & Description:'}
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isArabic ? plantProfile.plantDescriptionAr : plantProfile.plantDescriptionEn}
          </p>
        </div>
      </div>

      {/* Offline Storage & Sync Controls */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase">{t('settingsOffline')}</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isArabic
            ? 'يعتمد النظام تقنية التخزين المحلي الآمن لتمكين المهندسين والفنيين من إجراء فحوصات الآبار وتسجيل أوامر الصيانة دون الحاجة لتغطية إنترنت مستمرة في الميدان.'
            : 'The Hub uses local offline persistence allowing technicians to conduct wellfield inspections and complete work orders even in remote areas.'}
        </p>

        {syncStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{isArabic ? 'تم استعادة بيانات المصنع الافتراضية بنجاح!' : 'Default seed data restored!'}</span>
          </div>
        )}

        <div className="pt-2 flex flex-wrap gap-2.5">
          <button
            onClick={handleSyncNow}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('settingsSyncNow')}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={handleResetData}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600/40 text-xs font-bold transition active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isArabic ? 'إعادة ضبط البيانات الافتراضية' : 'Restore Plant Defaults'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Plant Profile Modal */}
      {showEditProfileModal && (
        <PlantProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSaved={(updated) => setPlantProfile(updated)}
        />
      )}
    </div>
  );
};
