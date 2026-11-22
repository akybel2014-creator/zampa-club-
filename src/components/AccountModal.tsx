import { CheckCircle2, Code2, Copy, ExternalLink, Info, Package, Server, User, X } from 'lucide-react';
import { useState } from 'react';
import {
  isWooCommerceConfigured,
  WOOCOMMERCE_CONFIG,
  WPCODE_MULTI_CART_PHP_SNIPPET,
} from '../config/woocommerce';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceMode: 'woocommerce' | 'fallback';
  categorySourceMode: 'woocommerce' | 'fallback';
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
        className="w-full max-w-2xl rounded-2xl bg-white border border-[#E7E5E4] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 id="account-modal-title" className="font-display text-lg font-bold text-[#1C1917]">
                Account & Store Connection
              </h2>
              <p className="text-xs text-[#57534E]">
                Pet Lover profile & WooCommerce REST API status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors"
            aria-label="Close account modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-[#E7E5E4] flex gap-2 bg-[#FAFAF9]">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#F97316] text-[#1C1917] bg-white'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            My Pet Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('integration')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'integration'
                ? 'border-[#F97316] text-[#1C1917] bg-white'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            WooCommerce Connection
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-sm text-[#1C1917] bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
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
                    className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors"
                  >
                    Save Preferences
                  </button>
                  {savedNotice && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0D9488]">
                      <CheckCircle2 className="w-4 h-4" />
                      Saved preferences for {petName}
                    </span>
                  )}
                </div>
              </form>

              <div className="border-t border-[#E7E5E4] pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0D9488]" />
                    Orders & Returns
                  </h3>
                  <a
                    href={`${WOOCOMMERCE_CONFIG.WP_STORE_URL}/my-account/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
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
                <Server className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-[#1C1917]">
                    Active Catalog Source:{' '}
                    {sourceMode === 'woocommerce'
                      ? 'WooCommerce REST API Live'
                      : 'Curated Fallback Catalog'}
                  </div>
                  <p className="text-[#57534E] text-xs leading-relaxed">
                    Products loaded: <strong className="tabular-nums">{productCount}</strong> ·
                    Categories ({categorySourceMode === 'woocommerce' ? 'Live' : 'Fallback'}):{' '}
                    <strong className="tabular-nums">{categoryCount}</strong> · Store:{' '}
                    <span className="font-mono">{WOOCOMMERCE_CONFIG.WP_STORE_URL}</span>
                  </p>
                  {!configured && (
                    <p className="text-xs text-[#57534E] pt-1">
                      Replace the read-only API keys in{' '}
                      <code className="font-mono text-[#1C1917]">src/config/woocommerce.ts</code>{' '}
                      with your WooCommerce Consumer Key &amp; Secret.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#F97316]" />
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
                  <Info className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
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
