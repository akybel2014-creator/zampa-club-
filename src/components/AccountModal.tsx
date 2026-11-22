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
  productCount: number;
}

export function AccountModal({
  isOpen,
  onClose,
  sourceMode,
  productCount,
}: AccountModalProps) {
  const [activeTab, setActiveTab] = useState<'profilo' | 'integrazione'>('profilo');
  const [copied, setCopied] = useState(false);
  const [petName, setPetName] = useState('Brando');
  const [petType, setPetType] = useState<'Cane' | 'Gatto' | 'Piccoli Animali'>('Cane');
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
                Area Clienti & Connessione Store
              </h2>
              <p className="text-xs text-[#57534E]">
                Profilo Pet Lover e stato ponte WooCommerce + CJ Dropshipping
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors"
            aria-label="Chiudi finestra account"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-[#E7E5E4] flex gap-2 bg-[#FAFAF9]">
          <button
            type="button"
            onClick={() => setActiveTab('profilo')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'profilo'
                ? 'border-[#F97316] text-[#1C1917] bg-white'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Il mio Profilo Pet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('integrazione')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'integrazione'
                ? 'border-[#F97316] text-[#1C1917] bg-white'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Configurazione WooCommerce
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'profilo' ? (
            <>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      Nome del tuo animale
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
                      Compagno di avventure
                    </label>
                    <select
                      value={petType}
                      onChange={(e) =>
                        setPetType(e.target.value as 'Cane' | 'Gatto' | 'Piccoli Animali')
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-sm text-[#1C1917] bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                    >
                      <option value="Cane">Cane</option>
                      <option value="Gatto">Gatto</option>
                      <option value="Piccoli Animali">Piccoli Animali</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors"
                  >
                    Salva Preferenze
                  </button>
                  {savedNotice && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0D9488]">
                      <CheckCircle2 className="w-4 h-4" />
                      Preferenze aggiornate per {petName}
                    </span>
                  )}
                </div>
              </form>

              <div className="border-t border-[#E7E5E4] pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0D9488]" />
                    Gestione Ordini & Resi
                  </h3>
                  <a
                    href={`${WOOCOMMERCE_CONFIG.WP_STORE_URL}/mio-account/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
                  >
                    Accedi su WordPress
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  Gli ordini completati al checkout vengono gestiti dal tuo account WooCommerce
                  collegato a CJ Dropshipping, con codice di tracciamento inviato automaticamente
                  via email.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 flex items-start gap-3">
                <Server className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-[#1C1917]">
                    Origine catalogo attiva:{' '}
                    {sourceMode === 'woocommerce'
                      ? 'API REST WooCommerce Live'
                      : 'Catalogo Curato Zampa Club (Fallback)'}
                  </div>
                  <p className="text-[#57534E] text-xs leading-relaxed">
                    Articoli caricati: <strong className="tabular-nums">{productCount}</strong> ·
                    URL Store: <span className="font-mono">{WOOCOMMERCE_CONFIG.WP_STORE_URL}</span>
                  </p>
                  {!configured && (
                    <p className="text-xs text-[#57534E] pt-1">
                      Sostituisci <code className="font-mono text-[#1C1917]">INCOLLA_QUI_LA_TUA_CK</code> e{' '}
                      <code className="font-mono text-[#1C1917]">INCOLLA_QUI_LA_TUA_CS</code> in{' '}
                      <code className="font-mono text-[#1C1917]">src/config/woocommerce.ts</code>{' '}
                      con le tue chiavi REST API (permessi Solo Lettura) di zampaclub.it.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#F97316]" />
                    Snippet WPCode per Checkout Multi-Prodotto
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-xs font-medium text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copiato!' : 'Copia PHP'}
                  </button>
                </div>
                <p className="text-xs text-[#57534E] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>
                    Incolla questo snippet in WordPress tramite il plugin gratuito WPCode per
                    aggiungere più ID prodotto/variante separati da virgola nel checkout
                    (<code className="font-mono">?add-to-cart=101:1,105:2</code>).
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
