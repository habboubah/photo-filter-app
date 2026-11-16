import { WebPlugin } from '@capacitor/core';
import type { PurchasesPlugin, PurchaseState } from '../purchases';
import { demoOwnedKey } from './library';

/** The store in a browser: the unlock "costs" 4,99 € and is bought at once (no money, no server). */
export class DemoPurchases extends WebPlugin implements PurchasesPlugin {
  private owned() { try { return localStorage.getItem(demoOwnedKey) === '1'; } catch { return false; } }

  async getProduct({ id }: { id: string }) {
    const de = (navigator.language || 'de').startsWith('de');
    return { product: { id, price: de ? '4,99 €' : '€4.99' } };
  }

  async purchase(): Promise<{ state: PurchaseState }> {
    await new Promise(r => setTimeout(r, 500));
    try { localStorage.setItem(demoOwnedKey, '1'); } catch { /* storage is unavailable */ }
    this.notifyListeners('ownedChanged', { owned: true });
    return { state: 'purchased' };
  }

  async isOwned() { return { owned: this.owned() }; }
  /** `bildklar-demo-restorable` = "1" stands for a purchase made earlier (the App Review rehearsal restores it). */
  async restore() {
    try { if (localStorage.getItem('bildklar-demo-restorable') === '1') localStorage.setItem(demoOwnedKey, '1'); } catch { /* storage is unavailable */ }
    return { owned: this.owned() };
  }
}
