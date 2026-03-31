/**
 * hooks/useSubscription.js
 * MelodyShift — Subscription entitlement hook.
 *
 * TWO MODES — controlled by the REVENUECAT_ENABLED flag below:
 *
 * MODE 1 — EXPO GO (REVENUECAT_ENABLED = false)
 *   Uses a local mock. No native modules. App runs in Expo Go.
 *   Set MOCK_IS_PRO = true to test Pro UI without a purchase.
 *
 * MODE 2 — DEV BUILD (REVENUECAT_ENABLED = true)
 *   Uses the real RevenueCat SDK. Requires a custom dev build.
 *   Run: npx expo run:android  OR  npx expo run:ios
 *   RevenueCat docs: https://www.revenuecat.com/docs/getting-started/installation/reactnative
 *
 * The hook's return shape is identical in both modes:
 *   { isPro, loading, refreshSubscription }
 * No other file needs to change when you flip the flag.
 */
 
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

// CONFIGURATION, change these two lines when switching modes
//
/**
 * Set to true ONLY in a dev build with react-native-purchases installed.
 * Keeping this false lets the app run in Expo Go without native modules.
 */
const REVENUECAT_ENABLED = true;

/**
 * Mock Pro status for UI development in Expo Go.
 * Set to true to see all Pro-gated features without purchasing.
 * Only used when REVENUECAT_ENABLED = false.
 */
const MOCK_IS_PRO = false;

// API Key logic here
const REVENUECAT_API_KEY = __DEV__
  ? 'test_fnpyGdKIargMBOrXUwpQXQwfAOR' 
  : Platform.select({
      ios: 'appl_placeholder',
      android: 'goog_placeholder',
    });

// CONSTANTS — must match RevenueCat dashboard exactly
//
/**
 * The entitlement identifier configured in your RevenueCat dashboard.
 * Dashboard → Entitlements → "pro"
 * RevenueCat entitlement IDs are case-sensitive. Must match exactly.
 */
export const PRO_ENTITLEMENT_ID = 'pro';

/**
 * The free-tier save limit enforced throughout the app.
 * Changing this value here updates every gate in the app automatically.
 */
export const FREE_MELODY_LIMIT = 5;

// HOOK
//

export function useSubscription() {
  // State to track if the user has an active subscription.
  const [isPro, setIsPro] = useState(false);
  // State to handle the UI's loading transition during the initial SDK handshake.
  const [loading, setLoading] = useState(true);

  /**
   * refreshSubscription — re-queries entitlement status on demand.
   * Call this after a purchase or restore to update UI immediately.
   * In mock mode it simply re-applies the MOCK_IS_PRO value.
   */
  const refreshSubscription = useCallback(async () => {
    try {
      setLoading(true);
      
      // We try to "require" the library only when this function runs.
      // This prevents Expo Go from crashing on startup.
      // Check if native module exists- EXPO GP
      let Purchases;
      try {
        Purchases = require('react-native-purchases').default;
      } catch (_e) {
        Purchases = null;
      }
 
      if (REVENUECAT_ENABLED) {
        // REAL REVENUECAT (dev build only)
        // Requires react-native-purchases to be natively linked.
        // Will throw in Expo Go — keep REVENUECAT_ENABLED = false there.
        //Configure the SDK using the key defined above
        await Purchases.configure({apiKey: REVENUECAT_API_KEY});
        const customerInfo = await Purchases.getCustomerInfo();
        setIsPro(!!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
      } else {
        // ── MOCK (Expo Go safe Mock logic) 
        await new Promise((resolve) => setTimeout(resolve, 250));
        setIsPro(MOCK_IS_PRO);
        // 
      }
    } catch (error) {
      console.error('[useSubscription] refreshSubscription failed:', error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    refreshSubscription();
 
    if (REVENUECAT_ENABLED) {
      // OBSERVER (dev build only) 
      // Fires in real time whenever the customer's entitlement state changes
      // after a purchase or a subscription expiry 
      // Ref: https://www.revenuecat.com/docs/customers/customer-info#listening-for-customer-info-updates
      
      const listener = (customerInfo) => {
        setIsPro(!!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
      };
 
      Purchases.addCustomerInfoUpdateListener(listener);
 
      // Cleanup on unmount — prevents memory leaks from stale listeners.
      return () => {
        Purchases.removeCustomerInfoUpdateListener(listener);
      };
      // 
    }
  }, [refreshSubscription]);
 
  return { isPro, loading, refreshSubscription };
}