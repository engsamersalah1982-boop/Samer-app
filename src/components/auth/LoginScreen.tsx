import React, { useState } from 'react';
import {
  Flame,
  Globe,
  Lock,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, isArabic, t } = useLanguage();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!usernameOrEmail.trim() || !password.trim()) {
      setErrorMessage(
        isArabic
          ? 'يرجى إدخال اسم المستخدم وكلمة المرور للمتابعة.'
          : 'Please enter both your username and password.'
      );
      return;
    }

    setIsLoading(true);

    // Simulate minor authentication delay for security and natural feedback
    setTimeout(() => {
      const success = login(usernameOrEmail.trim(), password.trim());
      setIsLoading(false);

      if (!success) {
        setErrorMessage(
          isArabic
            ? 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى مراجعة إدارة النظام للحصول على بيانات الدخول المعتمدة.'
            : 'Invalid username or password. Please contact the System Administrator to receive your credentials.'
        );
      }
    }, 400);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitted(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSubmitted(false);
      setForgotInput('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Top Bar with Branding & Language Switcher */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center text-amber-300 shadow-lg shadow-emerald-950">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight block">
              Jordan Biogas Company (JBC)
            </span>
            <span className="text-[11px] text-emerald-400 font-medium block">
              {isArabic ? 'شركة الغاز الحيوي الأردنية • محطة الغباوي والرصيفة' : 'Biogas Power Facility • Al-Ghabawi & Rusaifeh'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition active:scale-95"
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Main Secure Login Area */}
      <main className="my-auto max-w-md w-full mx-auto z-10 py-6 space-y-5 animate-fade-in">
        {/* System Emblem & Titles */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-700 to-teal-500 border border-emerald-400/40 mx-auto flex items-center justify-center shadow-xl shadow-emerald-950/80">
            <Flame className="w-8 h-8 text-amber-300 drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isArabic ? 'بوابة إدارة عمليات وتشغيل المحطة' : 'Plant Operations & Maintenance Portal'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isArabic
                ? 'نظام إدارة الأصول، أوامر الصيانة، والفحوصات الميدانية'
                : 'Asset Registry, CMMS Work Orders & Field Inspection System'}
            </p>
          </div>
        </div>

        {/* Security & Privacy Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs flex items-start gap-3 shadow-inner">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-200 text-[11px]">
              {isArabic ? 'نظام تشغيلي آمن ومحمي' : 'Secure Corporate Operations System'}
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {isArabic
                ? 'تسجيل الدخول مخصص لموظفي وفنيي المحطة المصرح لهم. يتم تزويد اسم المستخدم وكلمة المرور مباشرة من قبل إدارة النظام.'
                : 'Access restricted to authorized plant personnel. User credentials are provided exclusively by the System Administration.'}
            </p>
          </div>
        </div>

        {/* Protected Login Form */}
        <div className="rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-600/60 text-rose-200 text-xs flex items-start gap-2.5 animate-fade-in shadow-md">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Username or Corporate Email Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {isArabic ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Corporate Email'} *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter your username'}
                  className="w-full ps-10 pe-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('loginPassword')} *
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 transition"
                >
                  {t('loginForgot')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter your password'}
                  className="w-full ps-10 pe-11 py-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <span>{isArabic ? 'جاري التحقق وتأمين الجلسة...' : 'Authenticating...'}</span>
              ) : (
                <>
                  <span>{isArabic ? 'تسجيل الدخول الآمن' : 'Secure Sign In'}</span>
                  <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Support Note */}
        <div className="text-center text-[11px] text-slate-400">
          <p>
            {isArabic
              ? 'للحصول على حساب جديد أو في حال نسيان كلمة المرور، يرجى مراجعة إدارة المحطة.'
              : 'For account credentials or password reset, contact the Plant System Administrator.'}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3 z-10">
        <p>© {new Date().getFullYear()} Jordan Biogas Company (JBC). {isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
          Rusaifeh & Al-Ghabawi Landfill Biogas Facilities • Amman, Jordan
        </p>
      </footer>

      {/* Ambient background glow */}
      <div className="absolute top-1/3 start-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Info className="w-4 h-4 text-emerald-400" />
                <h3>{isArabic ? 'استعادة كلمة المرور' : 'Password Assistance'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="p-4 text-center text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1" />
                <p className="font-bold">
                  {isArabic ? 'تم تسجيل طلبك بنجاح' : 'Request Logged'}
                </p>
                <p className="text-[11px] text-slate-300">
                  {isArabic
                    ? 'يرجى مراجعة المهندس سامر صلاح (مدير النظام) أو المشرف لإعادة تعيين كلمة المرور فورياً.'
                    : 'Please contact Eng. Samer Salah (System Administrator) to reset your credentials.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isArabic
                    ? 'لدواعي الأمان والخصوصية في محطة الغاز الحيوي، يتم تغيير كلمات المرور مباشرة من خلال لوحة تحكم إدارة النظام.'
                    : 'For security reasons, password resets are processed directly by the System Administration.'}
                </p>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {isArabic ? 'اسم المستخدم أو الرقم الوظيفي' : 'Username or Employee ID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotInput}
                    onChange={(e) => setForgotInput(e.target.value)}
                    placeholder={isArabic ? 'مثال: user_1 أو JBC-E001' : 'e.g., user_1 or JBC-E001'}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    {isArabic ? 'إرسال للمسؤول' : 'Submit to Admin'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
