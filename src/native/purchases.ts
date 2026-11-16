import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

/*
 * The bridge to our own native plugin Purchases: StoreKit 2 on the iPhone
 * (PurchasesPlugin.swift), Google Play Billing on Android
 * (PurchasesPlugin.kt). One non-consumable / one-time product, the same id in
 * both stores. No purchase server, no SDK: the store app itself is the only
 * one that talks to the store.
 */

/** The unlock's product id in App Store Connect and the Play Console. */
export const PRODUCT_ID = 'com.habboubah.bildklar.unlock';

export interface Product {
  id: string;
  /** The price as the store shows it, in the user's currency ("4,99 €"). */
  price: string;
}

export type PurchaseState = 'purchased' | 'pending' | 'cancelled' | 'failed';

export interface PurchasesPlugin {
  /** The product, or null when the store can't be reached (offline, no account). */
  getProduct(options: { id: string }): Promise<{ product: Product | null }>;
  purchase(options: { id: string }): Promise<{ state: PurchaseState }>;
  /** Whether the unlock is owned, as the store says now. */
  isOwned(options: { id: string }): Promise<{ owned: boolean }>;
  /** Asks the store again (iPhone: AppStore.sync, which may ask for the Apple ID password). */
  restore(options: { id: string }): Promise<{ owned: boolean }>;
  /** A purchase finished outside a purchase() call: a pending one went through, Family Sharing, a refund. */
  addListener(event: 'ownedChanged', fn: (e: { owned: boolean }) => void): Promise<PluginListenerHandle>;
}

let demo: Promise<PurchasesPlugin> | null = null;
export const Purchases = registerPlugin<PurchasesPlugin>('Purchases', {
  web: () => (__DEMO__
    ? (demo ??= import('./demo/purchases').then(m => new m.DemoPurchases()))
    : Promise.reject(new Error('No store on the web'))),
});
