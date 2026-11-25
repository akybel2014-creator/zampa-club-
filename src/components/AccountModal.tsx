import { CheckCircle2, Code2, Copy, ExternalLink, Info, Package, Server, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  isWooCommerceConfigured,
  WOOCOMMERCE_CONFIG,
  WPCODE_MULTI_CART_PHP_SNIPPET,
} from '../config/woocommerce';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceMode: 'loading' | 'woocommerce' | 'error';
  categorySourceMode: 'loading' | 'woocommerce' | 'error';
  productCount: number;
  categoryCount: number;
}

export function AccountModal({
  isOpen,
  onClose,
  sourceMode,
  categorySourceMode,
  productCount,
  categoryCount,
}: AccountModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'integration'>('profile');
  const [copied, setCopied] = useState(false);
  const [petName, setPetName] = useState('Cooper');
  const [petType, setPetType] = useState<'Dog' | 'Cat' | 'Small Pet'>('Dog');
  const [savedNotice, setSavedNotice] = useState(false);

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

  const configured = isWooCommerceConfigured();

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(WPCODE_MULTI_CART_PHP_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white border border-[#E7E5E4] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E7E5E4] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#C2410C]/10 text-[#C2410C] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="account-modal-title" className="font-display text-base sm:text-lg font-bold text-[#1C1917] truncate">
                Account & Store Connection
              </h2>
              <p className="text-xs text-[#57534E] truncate">
                Pet Lover profile & WooCommerce REST API status
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

        <div className="px-4 sm:px-6 pt-3 border-b border-[#E7E5E4] flex gap-2 bg-[#FAFAF9] overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'profile'
                ? 'border-[#C2410C] text-[#1C1917] bg-white'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            My Pet Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('integration')}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'integration'
                ? 'border-[#C2410C] text-[#1C1917] bg-white'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            WooCommerce Connection
          </button>
        </div>

        <div className="p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain space-y-6">
          {activeTab === 'profile' ? (
            <>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      Pet&apos;s Name
                    </label>
                    <input
                      type="text"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      Pet Type
                    </label>
                    <select
                      value={petType}
                      onChange={(e) =>
                        setPetType(e.target.value as 'Dog' | 'Cat' | 'Small Pet')
                      }
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] bg-white focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Small Pet">Small Pet</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors"
                  >
                    Save Preferences
                  </button>
                  {savedNotice && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F766E]">
                      <CheckCircle2 className="w-4 h-4" />
                      Saved preferences for {petName}
                    </span>
                  )}
                </div>
              </form>

              <div className="border-t border-[#E7E5E4] pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0F766E]" />
                    Orders & Returns
                  </h3>
                  <a
                    href={`${WOOCOMMERCE_CONFIG.WP_STORE_URL}/my-account/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] hover:underline"
                  >
                    Sign in on Store
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  Orders placed at checkout are fulfilled through your WooCommerce store
                  connected to CJ Dropshipping, with tracking numbers emailed automatically.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 flex items-start gap-3">
                <Server className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-[#1C1917]">
                    Active Catalog Source:{' '}
                    {sourceMode === 'woocommerce'
                      ? 'WooCommerce REST API Live'
                      : sourceMode === 'loading'
                        ? 'Connecting to WooCommerce...'
                        : 'WooCommerce Connection Error'}
                  </div>
                  <p className="text-[#57534E] text-xs leading-relaxed">
                    Products loaded: <strong className="tabular-nums">{productCount}</strong> ·
                    Categories (
                    {categorySourceMode === 'woocommerce'
                      ? 'Live'
                      : categorySourceMode === 'loading'
                        ? 'Loading'
                        : 'Unavailable'}
                    ):{' '}
                    <strong className="tabular-nums">{categoryCount}</strong> · Store:{' '}
                    <span className="font-mono">{WOOCOMMERCE_CONFIG.WP_STORE_URL}</span> ·
                    Proxy:{' '}
                    <span className="font-mono">{WOOCOMMERCE_CONFIG.WC_PROXY_URL}</span>
                  </p>
                  {!configured && (
                    <p className="text-xs text-[#57534E] pt-1">
                      Configure <code className="font-mono text-[#1C1917]">VITE_WC_PROXY_URL</code>{' '}
                      or set <code className="font-mono text-[#1C1917]">WC_CONSUMER_KEY</code> and{' '}
                      <code className="font-mono text-[#1C1917]">WC_CONSUMER_SECRET</code> in server
                      environment variables.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#C2410C]" />
                    WPCode Snippet for Multi-Item Checkout
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-xs font-medium text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy PHP'}
                  </button>
                </div>
                <p className="text-xs text-[#57534E] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0F766E] shrink-0 mt-0.5" />
                  <span>
                    Paste this snippet in WordPress using the free WPCode plugin so
                    WooCommerce accepts comma-separated product/variation IDs and
                    quantities (<code className="font-mono">?add-to-cart=101:2,105:1</code>).
                  </span>
                </p>
                <pre className="p-3.5 rounded-xl bg-[#1C1917] text-[#FAFAF9] text-xs font-mono overflow-x-auto leading-relaxed">
                  {WPCODE_MULTI_CART_PHP_SNIPPET}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
