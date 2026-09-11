import React, { useState } from 'react';
import {
  Files,
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  Plus,
  Tag,
  CheckCircle2,
  FileSpreadsheet,
  FileCheck,
  X,
} from 'lucide-react';
import { db } from '../../services/db';
import { PlantDocument, DocumentCategory } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

export const DocumentsModule: React.FC = () => {
  const { isArabic, t } = useLanguage();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [documents, setDocuments] = useState<PlantDocument[]>(() => db.getDocuments());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New doc state
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newCategory, setNewCategory] = useState<DocumentCategory>('manuals');
  const [newTagsInput, setNewTagsInput] = useState('');

  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle =
        doc.titleAr.toLowerCase().includes(q) || doc.titleEn.toLowerCase().includes(q);
      const matchTags = doc.tags.some((tg) => tg.toLowerCase().includes(q));
      return matchTitle || matchTags;
    }
    return true;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newTitleAr.trim()) return;

    const tags = newTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const created = db.createDocument(
      {
        titleAr: newTitleAr.trim(),
        titleEn: newTitleEn.trim() || newTitleAr.trim(),
        category: newCategory,
        fileType: 'pdf',
        fileSizeBytes: 2450000,
        url: '#',
        tags: tags.length > 0 ? tags : ['JBC', 'Manual'],
        uploadedById: currentUser.id,
      },
      currentUser.id,
      currentUser.nameAr
    );

    setDocuments(db.getDocuments());
    setShowUploadModal(false);
    setNewTitleAr('');
    setNewTitleEn('');
    setNewTagsInput('');
  };

  const getCategoryLabel = (cat: DocumentCategory) => {
    switch (cat) {
      case 'manuals':
        return isArabic ? 'كتيبات وأدلة تشغيل' : 'Manuals & Guides';
      case 'safety':
        return isArabic ? 'إجراءات السلامة العامة' : 'Safety & LOTO';
      case 'procedures':
        return isArabic ? 'إجراءات العمل القياسية SOP' : 'SOP Procedures';
      case 'reports':
        return isArabic ? 'تقارير فنية وبيئية' : 'Technical Reports';
      case 'permits':
        return isArabic ? 'تراخيص بيئية ورسمية' : 'Environmental Permits';
      case 'catalogs':
        return isArabic ? 'كتالوجات قطع الغيار' : 'Spare Parts Catalogs';
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
  };

  const handleDownload = (doc: PlantDocument) => {
    // Generate text/pdf simulated file download
    const content = `JORDAN BIOGAS COMPANY (JBC)\nDocument: ${doc.titleAr} / ${doc.titleEn}\nCategory: ${doc.category}\nDate: ${doc.createdAt}\nCertified Internal Copy.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.titleEn.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-14 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-500/30">
            <Files className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t('navDocuments')}</h2>
            <p className="text-xs text-slate-400">
              {documents.length} {isArabic ? 'مستندات وكتيبات ومخططات معتمدة' : 'approved documents & schematics'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>{isArabic ? 'رفع مستند جديد' : 'Upload Document'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث في الأرشيف بالعنوان أو الوسوم...' : 'Search archive by title or tags...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl ps-9 pe-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">{isArabic ? 'جميع التصنيفات' : 'All Categories'}</option>
          <option value="manuals">{isArabic ? 'كتيبات وأدلة تشغيل' : 'Manuals'}</option>
          <option value="safety">{isArabic ? 'إجراءات السلامة' : 'Safety'}</option>
          <option value="procedures">{isArabic ? 'إجراءات العمل القياسية SOP' : 'SOP'}</option>
          <option value="reports">{isArabic ? 'تقارير فنية' : 'Reports'}</option>
          <option value="catalogs">{isArabic ? 'كتالوجات قطع الغيار' : 'Spare Parts Catalogs'}</option>
        </select>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between space-y-3 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                  {doc.fileType.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatFileSize(doc.fileSizeBytes)}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1 leading-snug">
                {isArabic ? doc.titleAr : doc.titleEn}
              </h3>
              <p className="text-xs text-slate-400">{getCategoryLabel(doc.category)}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {doc.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                  >
                    <Tag className="w-2.5 h-2.5 text-blue-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {doc.createdAt.split('T')[0]}
              </span>
              <button
                onClick={() => handleDownload(doc)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تحميل' : 'Download'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  {isArabic ? 'أرشفة ورفع مستند جديد' : 'Upload Plant Document'}
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'عنوان المستند (العربية) *' : 'Document Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={newTitleAr}
                  onChange={(e) => setNewTitleAr(e.target.value)}
                  placeholder="مثال: دليل صيانة مضخات استخراج الغاز"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'عنوان المستند (English)' : 'Document Title (English)'}
                </label>
                <input
                  type="text"
                  value={newTitleEn}
                  onChange={(e) => setNewTitleEn(e.target.value)}
                  placeholder="e.g. Gas blower maintenance manual"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'التصنيف' : 'Category'} *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DocumentCategory)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="manuals">{isArabic ? 'كتيبات وأدلة تشغيل' : 'Manuals'}</option>
                  <option value="safety">{isArabic ? 'إجراءات السلامة العامة' : 'Safety'}</option>
                  <option value="procedures">{isArabic ? 'إجراءات العمل القياسية SOP' : 'SOP'}</option>
                  <option value="reports">{isArabic ? 'تقارير فنية وبيئية' : 'Reports'}</option>
                  <option value="catalogs">{isArabic ? 'كتالوجات قطع الغيار' : 'Spare Parts Catalogs'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'الوسوم (مفصولة بفواصل)' : 'Tags (comma separated)'}
                </label>
                <input
                  type="text"
                  value={newTagsInput}
                  onChange={(e) => setNewTagsInput(e.target.value)}
                  placeholder="MWM, TCG2020, Overhaul, Manual"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Drag & drop upload box */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 text-center transition cursor-pointer">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">
                  {isArabic
                    ? 'اسحب الملف وأفلته هنا، أو انقر للاستعراض من جهازك'
                    : 'Drag and drop file here, or click to browse'}
                </p>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  PDF, DWG, XLSX, DOCX (Max 25MB)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                >
                  {isArabic ? 'حفظ في الأرشيف' : 'Save to Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
