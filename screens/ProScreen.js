// screens/ProScreen.js
// MelodyShift — Pro upgrade screen.
//
// EXPO GO (REVENUECAT_ENABLED = false in useSubscription.js):
//   Purchase and restore buttons show an informational Alert.
//   The full UI  plan cards, feature list, pricing is production-ready.
//
// DEV BUILD (REVENUECAT_ENABLED = true):
//   Uses RevenueCat's native paywall UI (react-native-purchases-ui).
//   Falls back to manual purchase flow if the paywall is not configured
//   in the RevenueCat dashboard.
//
// CUSTOMER CENTER:
//   The "Manage Subscription" button at the bottom presents RevenueCat's
//   pre-built customer management screen after a user has subscribed.
//   It handles cancellation, refund requests, and restore — no extra code needed.
//   Place a link to this from your Settings or Profile screen too.
//   Ref: https://www.revenuecat.com/docs/tools/customer-center
 
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import { useSubscription } from '../hooks/useSubscription';
 
// Configuration
//

// Must match the flag in useSubscription.js exactly.
// When true, real RevenueCat SDK calls are made. Requires dev build.
const REVENUECAT_ENABLED = true;

// Feature comparison rows shown on the paywall.
// Add or remove rows here without touching layout code.
const FEATURES = [
  { icon: 'music-note-plus',      label: 'Save unlimited melodies',         free: false },
  { icon: 'swap-horizontal',      label: 'Transpose into all 24 keys',      free: true  },
  { icon: 'chart-line',           label: 'Advanced melody analysis',         free: false },
  { icon: 'pencil-outline',       label: 'Enter melodies — full access',     free: true  },
  { icon: 'content-save-outline', label: 'Save up to 5 melodies',           free: true  },
  { icon: 'file-music-outline',   label: 'MusicXML export (coming soon)',    free: false },
  { icon: 'cloud-sync-outline',   label: 'Cloud sync (coming soon)',         free: false },
];

// Pricing display — update when you finalize App Store products.
const PRICE_MONTHLY = '$4.99';
const PRICE_YEARLY  = '$35.99';

//
// Component
//
 
export default function ProScreen({ navigation }) {
  const { isPro, refreshSubscription } = useSubscription();
 
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [purchasing,   setPurchasing]   = useState(false);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
 
  
  // Customer Center 
  // RevenueCat's pre-built subscription management screen.
  // Handles: view active plan, cancel, restore, refund requests.
  // Ref: https://www.revenuecat.com/docs/tools/customer-center
  if (showCustomerCenter && REVENUECAT_ENABLED) {
    try {
      const { RevenueCatUI } = require('react-native-purchases-ui');
      return (
        <RevenueCatUI.CustomerCenter
          onClose={() => setShowCustomerCenter(false)}
        />
      );
    } catch {
      // RevenueCatUI not available — fall through to manual screen
    }
  }
  
  // Purchase handler 
  const handlePurchase = async () => {
    // 1. If we are in Expo Go/Mock Mode, show the Alert and STOP
    if (!REVENUECAT_ENABLED) {
      // Mock mode — inform the user
      Alert.alert(
        'Purchases Coming Soon',
        'In-app purchases will be active in the full build after the App Store submission.',
        [{ text: 'Got it' }]
      );
      return;
    }
    
    // DEV BUILD — real RevenueCat purchase flow
    // 2. If we ARE in a Real Build, try the RevenueCat code
    // Strategy: try the native paywall UI first (best UX, configured in dashboard).
    // If no paywall is configured or it fails, fall back to manual package purchase.
    setPurchasing(true);
    try {
      // This part safely loads the Paywall UI only when clicked
      const RevenueCatUI = require('react-native-purchases-ui').default;
      const { PAYWALL_RESULT } = require('react-native-purchases-ui');
 
      // Present the paywall configured in your RevenueCat dashboard.
      // EXACT REVENUECAT CODE
      // Ref: https://www.revenuecat.com/docs/tools/paywalls
      const result = await RevenueCatUI.presentPaywall();
      
      // Handle the result using the switch logic
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          // Purchase or restore succeeded — refresh entitlement state.
          await refreshSubscription();
          Alert.alert('Welcome to Pro!', 'Your subscription is now active.');
          navigation.goBack();
          break;
        case PAYWALL_RESULT.NOT_PRESENTED:
          // No paywall configured in dashboard — fall back to manual flow.
          await handleManualPurchase();
          break;
        case PAYWALL_RESULT.ERROR:
          Alert.alert('Something went wrong', 'Please try again.');
          break;
        case PAYWALL_RESULT.CANCELLED:
        default:
          // User dismissed — do nothing.
          break;
      }
    } catch (error) {
      console.error('[ProScreen] handlePurchase failed:', error);
      // RevenueCatUI not available — fall back to manual purchase.
      await handleManualPurchase();
    } finally {
      setPurchasing(false);
    }
  };

  // Manual purchase flow — used when RevenueCatUI paywall is not configured.
  // Fetches the current offering and purchases the selected package directly.
  const handleManualPurchase = async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const offerings = await Purchases.getOfferings();
      const offering  = offerings.current;
 
      if (!offering) {
        Alert.alert('Not Available', 'No subscription products found. Please try again later.');
        return;
      }
 
      // Map the selected plan UI choice to the offering package.
      // 'monthly' and 'yearly' must match the product identifiers
      // configured in your RevenueCat dashboard.
      // Ref: https://www.revenuecat.com/docs/getting-started/entitlements
      const pkg = selectedPlan === 'yearly'
        ? offering.annual
        : offering.monthly;
 
      if (!pkg) {
        Alert.alert('Plan Unavailable', 'This plan is not available. Please try another.');
        return;
      }
 
      await Purchases.purchasePackage(pkg);
      await refreshSubscription();
      Alert.alert('Welcome to Pro!', 'Your subscription is now active.');
      navigation.goBack();
    } catch (error) {
      // userCancelled is a normal exit, not an error condition.
      if (!error.userCancelled) {
        console.error('[ProScreen] handleManualPurchase failed:', error);
        Alert.alert('Purchase Failed', error.message ?? 'Please try again.');
      }
    }
  };

  // Restore Handler
  const handleRestore = async () => {
    if (!REVENUECAT_ENABLED) {
      Alert.alert(
        'Restore Purchases',
        'Purchase restoration will be active in the full build.',
        [{ text: 'OK' }]
      );
      return;
    }
 
    setPurchasing(true);
    try {
      const Purchases = require('react-native-purchases').default;
      const customerInfo = await Purchases.restorePurchases();
      await refreshSubscription();
 
      const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
      if (hasActive) {
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Nothing to Restore',
          'No previous purchases were found for this account.'
        );
      }
    } catch (error) {
      console.error('[ProScreen] handleRestore failed:', error);
      Alert.alert('Restore Failed', error.message ?? 'Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // Already Pro 
  if (isPro) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.proActiveContainer}>
          <MaterialCommunityIcons name="check-circle" size={64} color={colors.accent} />
          <Text style={styles.proActiveTitle}>You are on Pro</Text>
          <Text style={styles.proActiveSubtitle}>
            All features are unlocked. Thank you for supporting MelodyShift.
          </Text>
 
          {/* Manage Subscription — opens Customer Center */}
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => {
              if (REVENUECAT_ENABLED) {
                setShowCustomerCenter(true);
              } else {
                Alert.alert(
                  'Manage Subscription',
                  'Subscription management will be available in the full build.'
                );
              }
            }}>
            <MaterialCommunityIcons name="cog-outline" size={16} color={colors.accent} />
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
 
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
 
  // Paywall UI 
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
 
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
        </TouchableOpacity>
 
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.proIcon}>
            <MaterialCommunityIcons name="crown" size={36} color={colors.accent} />
          </View>
          <Text style={styles.proTitle}>MelodyShift Pro</Text>
          <Text style={styles.proSubtitle}>
            Unlimited melodies, advanced analysis, and every feature we build next.
          </Text>
        </View>
 
        {/* Plan selector */}
        <View style={styles.planRow}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}>
            <Text style={[styles.planLabel, selectedPlan === 'monthly' && styles.planLabelActive]}>
              Monthly
            </Text>
            <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceActive]}>
              {PRICE_MONTHLY}
            </Text>
            <Text style={[styles.planPeriod, selectedPlan === 'monthly' && styles.planPeriodActive]}>
              per month
            </Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>BEST VALUE</Text>
              </View>
            </View>
            <Text style={[styles.planLabel, selectedPlan === 'yearly' && styles.planLabelActive]}>
              Yearly
            </Text>
            <Text style={[styles.planPrice, selectedPlan === 'yearly' && styles.planPriceActive]}>
              {PRICE_YEARLY}
            </Text>
            <Text style={[styles.planPeriod, selectedPlan === 'yearly' && styles.planPeriodActive]}>
              per year · save 40%
            </Text>
          </TouchableOpacity>
        </View>
 
        {/* Feature list */}
        <View style={styles.featureList}>
          <Text style={styles.featureListLabel}>WHAT YOU GET</Text>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <MaterialCommunityIcons
                name={feature.free ? 'check' : 'crown'}
                size={16}
                color={feature.free ? colors.muted : colors.accent}
              />
              <Text style={[styles.featureText, !feature.free && styles.featureTextPro]}>
                {feature.label}
              </Text>
              {!feature.free && (
                <View style={styles.proTag}>
                  <Text style={styles.proTagText}>PRO</Text>
                </View>
              )}
            </View>
          ))}
        </View>
 
        {/* Subscribe */}
        <TouchableOpacity
          style={[styles.subscribeBtn, purchasing && styles.subscribeBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.85}>
          {purchasing ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <>
              <MaterialCommunityIcons name="crown" size={18} color={colors.buttonText} />
              <Text style={styles.subscribeBtnText}>
                {selectedPlan === 'yearly'
                  ? `Subscribe Yearly · ${PRICE_YEARLY}`
                  : `Subscribe Monthly · ${PRICE_MONTHLY}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
 
        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={purchasing}>
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        </TouchableOpacity>
 
        {/* Legal */}
        <Text style={styles.legalText}>
          Subscriptions renew automatically. Cancel anytime in your{' '}
          {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account settings.
          Prices shown in USD.
        </Text>
 
      </ScrollView>
    </SafeAreaView>
  );
} 

// Styles
//

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: 24, paddingBottom: 48 },
 
  closeBtn: {
    alignSelf: 'flex-end',
    paddingTop: 16,
    paddingBottom: 8,
    paddingLeft: 8,
  },
 
  // Header
  headerSection: { alignItems: 'center', marginBottom: 28 },
  proIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.accent,
    marginBottom: 16,
  },
  proTitle: {
    fontSize: 26, fontWeight: '900', color: colors.text,
    letterSpacing: 0.5, marginBottom: 10,
  },
  proSubtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 8,
  },
 
  // Plan cards
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  planCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 14, padding: 16,
  borderWidth: 1.5, borderColor: colors.line,
    alignItems: 'center', minHeight: 110, justifyContent: 'center',
  },
  planCardActive:  { borderColor: colors.accent, backgroundColor: colors.accentWash },
  badgeRow:  { marginBottom: 6 },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText:       { fontSize: 9, fontWeight: '800', color: colors.buttonText, letterSpacing: 1 },
  planLabel:       { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  planLabelActive: { color: colors.accent },
  planPrice:       { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 2 },
  planPriceActive: { color: colors.accent },
  planPeriod:      { fontSize: 11, color: colors.muted, textAlign: 'center' },
  planPeriodActive:{ color: colors.textSecondary },
 
  // Feature list
  featureList: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: colors.line,
  },
  featureListLabel: {
    fontSize: 11, fontWeight: '700', color: colors.muted,
    letterSpacing: 1, marginBottom: 14,
  },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  featureText:    { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  featureTextPro: { color: colors.text },
  proTag: {
    backgroundColor: colors.accentSubtle,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  proTagText: { fontSize: 9, fontWeight: '800', color: colors.accent, letterSpacing: 0.8 },
 
  // Subscribe button
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 18, marginBottom: 14,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  subscribeBtnDisabled: { backgroundColor: colors.accentDark, shadowOpacity: 0 },
  subscribeBtnText:     { color: colors.buttonText, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
 
  // Restore
  restoreBtn:     { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  restoreBtnText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
 
  // Legal
  legalText: {
    fontSize: 11, color: colors.muted, textAlign: 'center',
    lineHeight: 17, paddingHorizontal: 8, marginBottom: 16,
  },
 
  // Already Pro state
  proActiveContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  proActiveTitle:    { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 16, marginBottom: 10 },
  proActiveSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1, borderColor: colors.accent,
    marginBottom: 16,
  },
  manageBtnText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  backBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  backBtnText: { color: colors.buttonText, fontWeight: '700', fontSize: 15 },
});