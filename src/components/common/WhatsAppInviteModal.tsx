import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  User as UserIcon,
  Globe,
  Flame,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { User } from '../../types';
import { db } from '../../services/db';

interface WhatsAppInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUser?: User | null;
}

export const WhatsAppInviteModal: React.FC<WhatsAppInviteModalProps> = ({
  isOpen,
  onClose,
  initialUser,
}) => {
  const { isArabic } = useLanguage();
  const allUsers = db.getUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialUser?.id || allUsers[0]?.id || ''
  );
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customPhone, setCustomPhone] = useState<string>(
    initialUser?.phone?.replace(/[^0-9]/g, '') || ''
  );

  if (!isOpen) return null;

  const selectedUser = allUsers.find((u) => u.id === selectedUserId) || initialUser || allUsers[0];

  // Base URL calculation: automatically converts internal dev URL to public shared URL
  const rawUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jbc-biogas.web.app';
  const appUrl = rawUrl.replace('ais-dev-', 'ais-pre-');

  const userPhone = customPhone || selectedUser?.phone?.replace(/[^0-9]/g, '') || '';

  // Generate WhatsApp message text
  const messageText = `🏭 *شركة الغاز الحيوي الأردنية (Jordan Biogas Company)*
⚡ *محطة توليد كهرباء الغاز الحيوي - مكب الغباوي*

مرحباً *${selectedUser?.nameAr || 'الزميل العزيز'}*،
إليك رابط وبيانات تسجيل الدخول الرسمية الخاصة بك إلى *نظام إدارة وتشغيل وصيانة المحطة*:

🌐 *رابط الدخول المباشر:*
${appUrl}

👤 *اسم المستخدم (Username):*
${selectedUser?.username || 'user'}

🔑 *كلمة المرور (Password):*
${selectedUser?.password || 'pass123'}

💼 *المسمى الوظيفي:* ${selectedUser?.jobTitleAr || 'موظف المحطة'}
🏢 *القسم:* ${selectedUser?.department || 'العمليات والصيانة'}

📱 *تعليمات الدخول:*
1. اضغط على الرابط أعلاه لفتح النظام على متصفح هاتفك أو حاسوبك.
2. أدخل اسم المستخدم وكلمة المرور الموضحة أعلاه.
3. يمكنك حفظ الرابط في المفضلة أو تثبيته كتطبيق على شاشة هاتفك مباشرة (PWA).

دمتم بحفظ الله ورعايته،
*إدارة محطة كهرباء الغاز الحيوي - JBC*`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2200);
  };

  const handleCopyLinkOnly = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleOpenWhatsApp = () => {
    const encodedText = encodeURIComponent(messageText);
    let url = `https://api.whatsapp.com/send?text=${encodedText}`;
    if (userPhone && userPhone.length >= 8) {
      url = `https://api.whatsapp.com/send?phone=${userPhone}&text=${encodedText}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{isArabic ? 'مشاركة رابط الدخول عبر الواتساب' : 'Share Login Link via WhatsApp'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  WhatsApp Web / App
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic
                  ? 'إرسال رابط المحطة المباشر واسم المستخدم ورمز المرور للموظف بنقرة واحدة'
                  : 'Send direct system URL and credentials to any staff member instantly'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            {isArabic ? 'اختر الموظف / المستخدم لإرسال الدعوة:' : 'Select Employee / User to Invite:'}
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              const found = allUsers.find((u) => u.id === e.target.value);
              if (found?.phone) {
                setCustomPhone(found.phone.replace(/[^0-9]/g, ''));
              }
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameAr} ({u.jobTitleAr}) - @{u.username} [{u.role}]
              </option>
            ))}
          </select>
        </div>

        {/* Phone number input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 block">
            {isArabic ? 'رقم هاتف الواتساب (مع رمز الدولة، مثال: 962791112233):' : 'WhatsApp Phone Number:'}
          </label>
          <input
            type="text"
            value={customPhone}
            onChange={(e) => setCustomPhone(e.target.value)}
            placeholder="962790001122"
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Credentials Card Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{isArabic ? 'رابط النظام المباشر:' : 'Direct URL:'}</span>
            <button
              onClick={handleCopyLinkOnly}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? (isArabic ? 'تم النسخ!' : 'Copied!') : isArabic ? 'نسخ الرابط' : 'Copy Link'}</span>
            </button>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 break-all">
            {appUrl}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{isArabic ? 'اسم المستخدم:' : 'Username:'}</span>
              <span className="font-mono font-bold text-amber-300">@{selectedUser?.username}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{isArabic ? 'كلمة المرور:' : 'Password:'}</span>
              <span className="font-mono font-bold text-teal-300">{selectedUser?.password || 'pass123'}</span>
            </div>
          </div>
        </div>

        {/* Preview Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              {isArabic ? 'معاينة نص الرسالة الجاهزة للإرسال:' : 'Prepared Message Preview:'}
            </label>
            <button
              onClick={handleCopyMessage}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? (isArabic ? 'تم نسخ الرسالة!' : 'Copied!') : isArabic ? 'نسخ كامل الرسالة' : 'Copy Full Message'}</span>
            </button>
          </div>
          <textarea
            rows={7}
            readOnly
            value={messageText}
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-sans focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleOpenWhatsApp}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{isArabic ? 'فتح واتساب وإرسال الرسالة الآن' : 'Open WhatsApp & Send Now'}</span>
          </button>
          <button
            onClick={handleCopyMessage}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700 active:scale-95"
          >
            {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isArabic ? 'نسخ النص' : 'Copy Text'}</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
