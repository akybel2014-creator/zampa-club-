import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Heart,
  Loader2,
  LogIn,
  LogOut,
  Package,
  Star,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { WOOCOMMERCE_CONFIG } from '../config/woocommerce';
import { useAuth } from '../context/AuthContext';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
  authContextMessage?: string | null;
  onAuthSuccess?: () => void;
}

type PetType = 'Dog' | 'Cat' | 'Small Pet' | 'Backyard Poultry';

const PET_PROFILE_STORAGE_KEY = 'zampaclub_pet_profile_v1';

function readLocalPetFallback(): { petName: string; petType: PetType } {
  try {
    const raw = localStorage.getItem(PET_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { petName?: string; petType?: string };
      const validType: PetType =
        parsed.petType === 'Dog' ||
        parsed.petType === 'Cat' ||
        parsed.petType === 'Small Pet' ||
        parsed.petType === 'Backyard Poultry'
          ? parsed.petType
          : 'Dog';
      return {
        petName: typeof parsed.petName === 'string' && parsed.petName.trim() ? parsed.petName : 'Cooper',
        petType: validType,
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { petName: 'Cooper', petType: 'Dog' };
}

export function AccountModal({
  isOpen,
  onClose,
  initialView = 'login',
  authContextMessage = null,
  onAuthSuccess,
}: AccountModalProps) {
  const { user, isAuthenticated, login, register, logout, savePetProfile } = useAuth();

  const [guestTab, setGuestTab] = useState<'login' | 'register'>(initialView);
  const [accountTab, setAccountTab] = useState<'pet' | 'orders'>('pet');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration fields
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPetName, setRegPetName] = useState('');
  const [regPetType, setRegPetType] = useState<PetType | ''>('');

  // Authenticated pet profile fields
  const [localFallback] = useState(() => readLocalPetFallback());
  const [petName, setPetName] = useState(user?.petName || localFallback.petName);
  const [petType, setPetType] = useState<PetType>(
    (user?.petType as PetType) || localFallback.petType
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedPetNotice, setSavedPetNotice] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGuestTab(initialView);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavedPetNotice(false);
  }, [isOpen, initialView]);

  useEffect(() => {
    if (user) {
      if (user.petName) setPetName(user.petName);
      if (
        user.petType === 'Dog' ||
        user.petType === 'Cat' ||
        user.petType === 'Small Pet' ||
        user.petType === 'Backyard Poultry'
      ) {
        setPetType(user.petType);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const storeBaseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL;
  const myAccountUrl = `${storeBaseUrl}/my-account/`;
  const ordersUrl = `${storeBaseUrl}/my-account/orders/`;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const res = await login(loginEmail.trim(), loginPassword);
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid email or password. Please try again.');
      return;
    }

    setLoginPassword('');
    setSuccessMsg('Welcome back! You are now signed in.');

    if (onAuthSuccess) {
      window.setTimeout(() => {
        onAuthSuccess();
      }, 450);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword.length < 6) {
      setErrorMsg('Please choose a password with at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const res = await register({
      email: regEmail.trim(),
      password: regPassword,
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      ...(regPetName.trim() ? { petName: regPetName.trim() } : {}),
      ...(regPetType ? { petType: regPetType } : {}),
    });
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to create your account. Please try again.');
      return;
    }

    if (regPetName.trim() || regPetType) {
      try {
        localStorage.setItem(
          PET_PROFILE_STORAGE_KEY,
          JSON.stringify({
            petName: regPetName.trim() || 'Cooper',
            petType: regPetType || 'Dog',
          })
        );
      } catch {
        // Ignore storage errors
      }
    }

    setRegPassword('');
    setSuccessMsg('Your Zampa Club account has been created and you are now signed in!');

    if (onAuthSuccess) {
      window.setTimeout(() => {
        onAuthSuccess();
      }, 650);
    }
  };

  const handleSavePetProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = petName.trim() || 'Your Pet';
    setPetName(cleanedName);
    setSubmitting(true);
    setErrorMsg(null);

    try {
      localStorage.setItem(
        PET_PROFILE_STORAGE_KEY,
        JSON.stringify({ petName: cleanedName, petType })
      );
    } catch {
      // Ignore storage errors
    }

    await savePetProfile({ petName: cleanedName, petType });
    setSubmitting(false);
    setSavedPetNotice(true);
    window.setTimeout(() => setSavedPetNotice(false), 2500);
  };

  const handleLogout = async () => {
    setSubmitting(true);
    await logout();
    setSubmitting(false);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleBrowseForReviews = () => {
    onClose();
    const el = document.getElementById('product-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white border border-[#E7E5E4] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E7E5E4] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#C2410C]/10 text-[#C2410C] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="account-modal-title"
                className="font-display text-base sm:text-lg font-bold text-[#1C1917] truncate"
              >
                {isAuthenticated
                  ? `Welcome back, ${user?.firstName || user?.displayName || 'Pet Parent'}`
                  : guestTab === 'login'
                    ? 'Sign In to Zampa Club'
                    : 'Create Your Account'}
              </h2>
              <p className="text-xs text-[#57534E] truncate">
                {isAuthenticated
                  ? user?.email
                  : 'Access your orders, pet profile & product reviews'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors shrink-0"
            aria-label="Close account modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        {!isAuthenticated ? (
          <div className="px-4 sm:px-6 pt-3 border-b border-[#E7E5E4] flex gap-2 bg-[#FAFAF9] overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => {
                setGuestTab('login');
                setErrorMsg(null);
              }}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                guestTab === 'login'
                  ? 'border-[#C2410C] text-[#1C1917] bg-white'
                  : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setGuestTab('register');
                setErrorMsg(null);
              }}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                guestTab === 'register'
                  ? 'border-[#C2410C] text-[#1C1917] bg-white'
                  : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="px-4 sm:px-6 pt-3 border-b border-[#E7E5E4] flex items-center justify-between gap-2 bg-[#FAFAF9] overflow-x-auto no-scrollbar shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAccountTab('pet')}
                className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  accountTab === 'pet'
                    ? 'border-[#C2410C] text-[#1C1917] bg-white'
                    : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                My Pet Profile
              </button>
              <button
                type="button"
                onClick={() => setAccountTab('orders')}
                className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  accountTab === 'orders'
                    ? 'border-[#C2410C] text-[#1C1917] bg-white'
                    : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Orders &amp; Reviews
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#C2410C] hover:bg-white border border-transparent hover:border-[#E7E5E4] transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain space-y-5">
          {authContextMessage && !isAuthenticated && (
            <div className="rounded-xl bg-[#C2410C]/10 border border-[#C2410C]/25 px-4 py-3 text-sm text-[#9A3412] font-medium">
              {authContextMessage}
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-[#0F766E]/10 border border-[#0F766E]/25 px-4 py-3 text-sm text-[#115E59] font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isAuthenticated ? (
            guestTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[#57534E] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#57534E]"
                    >
                      Password
                    </label>
                    <a
                      href={`${storeBaseUrl}/mio-account/lost-password/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[#C2410C] hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-[#57534E] pt-1">
                  New to Zampa Club?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setGuestTab('register');
                      setErrorMsg(null);
                    }}
                    className="font-semibold text-[#C2410C] hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="reg-first-name"
                      className="block text-xs font-semibold text-[#57534E] mb-1.5"
                    >
                      First Name
                    </label>
                    <input
                      id="reg-first-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      placeholder="Claire"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-last-name"
                      className="block text-xs font-semibold text-[#57534E] mb-1.5"
                    >
                      Last Name
                    </label>
                    <input
                      id="reg-last-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      placeholder="Bennett"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-[#57534E] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-[#57534E] mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                  />
                </div>

                <div className="pt-1 border-t border-[#F5F5F4]">
                  <p className="text-xs font-semibold text-[#78716C] mb-2.5">
                    Tell us about your pet (optional)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="reg-pet-name"
                        className="block text-xs font-semibold text-[#57534E] mb-1.5"
                      >
                        Pet&apos;s Name
                      </label>
                      <input
                        id="reg-pet-name"
                        type="text"
                        value={regPetName}
                        onChange={(e) => setRegPetName(e.target.value)}
                        placeholder="e.g. Cooper"
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reg-pet-type"
                        className="block text-xs font-semibold text-[#57534E] mb-1.5"
                      >
                        Pet Type
                      </label>
                      <select
                        id="reg-pet-type"
                        value={regPetType}
                        onChange={(e) => setRegPetType(e.target.value as PetType | '')}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] bg-white focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                      >
                        <option value="">Select pet type</option>
                        <option value="Dog">Dog</option>
                        <option value="Cat">Cat</option>
                        <option value="Small Pet">Small Pet</option>
                        <option value="Backyard Poultry">Backyard Poultry</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-[#57534E] pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setGuestTab('login');
                      setErrorMsg(null);
                    }}
                    className="font-semibold text-[#C2410C] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )
          ) : accountTab === 'pet' ? (
            <>
              <form onSubmit={handleSavePetProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="pet-profile-name"
                      className="block text-xs font-semibold text-[#57534E] mb-1.5"
                    >
                      Pet&apos;s Name
                    </label>
                    <input
                      id="pet-profile-name"
                      type="text"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="e.g. Cooper"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pet-profile-type"
                      className="block text-xs font-semibold text-[#57534E] mb-1.5"
                    >
                      Pet Type
                    </label>
                    <select
                      id="pet-profile-type"
                      value={petType}
                      onChange={(e) => setPetType(e.target.value as PetType)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] bg-white focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Small Pet">Small Pet</option>
                      <option value="Backyard Poultry">Backyard Poultry</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors"
                  >
                    Save Pet Profile
                  </button>
                  {savedPetNotice && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F766E]">
                      <CheckCircle2 className="w-4 h-4" />
                      Saved profile for {petName}
                    </span>
                  )}
                </div>
              </form>

              <div className="border-t border-[#E7E5E4] pt-5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#C2410C]" />
                    Member Perks &amp; Guarantee
                  </h3>
                  <button
                    type="button"
                    onClick={handleBrowseForReviews}
                    className="text-xs font-semibold text-[#C2410C] hover:underline whitespace-nowrap"
                  >
                    Rate &amp; Review Products
                  </button>
                </div>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  Your account is active. You can leave verified product reviews, save your
                  pet&apos;s details, and track every order with our 30-day return guarantee.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                    Signed In As
                  </div>
                  <div className="text-sm font-bold text-[#1C1917] truncate mt-0.5">
                    {user?.displayName || user?.email}
                  </div>
                  <div className="text-xs text-[#57534E] truncate">{user?.email}</div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={myAccountUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl border border-[#E7E5E4] bg-white hover:border-[#C2410C] p-4 space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <User className="w-4 h-4 text-[#C2410C]" />
                    <ExternalLink className="w-3.5 h-3.5 text-[#78716C] group-hover:text-[#C2410C]" />
                  </div>
                  <div className="text-sm font-semibold text-[#1C1917]">My Account</div>
                  <p className="text-xs text-[#57534E]">
                    Manage addresses &amp; account details
                  </p>
                </a>

                <a
                  href={ordersUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl border border-[#E7E5E4] bg-white hover:border-[#C2410C] p-4 space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Package className="w-4 h-4 text-[#0F766E]" />
                    <ExternalLink className="w-3.5 h-3.5 text-[#78716C] group-hover:text-[#C2410C]" />
                  </div>
                  <div className="text-sm font-semibold text-[#1C1917]">My Orders</div>
                  <p className="text-xs text-[#57534E]">
                    Track shipments &amp; request returns
                  </p>
                </a>

                <button
                  type="button"
                  onClick={handleBrowseForReviews}
                  className="group text-left rounded-xl border border-[#E7E5E4] bg-white hover:border-[#C2410C] p-4 space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Star className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="text-sm font-semibold text-[#1C1917]">Write a Review</div>
                  <p className="text-xs text-[#57534E]">
                    Browse products &amp; share feedback
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
