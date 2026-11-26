declare global {
  interface Window {
    tidioChatApi?: {
      hide: () => void;
      show: () => void;
    };
  }
}

const rawTidioKey = (import.meta.env.VITE_TIDIO_KEY || '').trim();

/**
 * Chiave pubblica Tidio Live Chat configurabile tramite variabile d'ambiente VITE_TIDIO_KEY.
 */
export const TIDIO_PUBLIC_KEY = /^[a-zA-Z0-9_-]{8,64}$/.test(rawTidioKey)
  ? rawTidioKey
  : '';

export function isTidioConfigured(): boolean {
  return Boolean(TIDIO_PUBLIC_KEY);
}

/**
 * Nasconde temporaneamente il widget Tidio quando un drawer o modale
 * (carrello, scheda prodotto, account) è aperto, evitando sovrapposizioni sui pulsanti d'acquisto su mobile.
 */
export function syncTidioOverlayState(hasOpenOverlay: boolean): void {
  if (typeof document === 'undefined') return;

  if (hasOpenOverlay) {
    document.body.dataset.overlayOpen = 'true';
    window.tidioChatApi?.hide();
  } else {
    delete document.body.dataset.overlayOpen;
    window.tidioChatApi?.show();
  }
}
