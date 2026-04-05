// screens/HomeScreen.js
// MelodyShifter — Home Screen
//
// App landing page. Describes what MelodyShift does and provides entry points
// to start a new melody, view the library, and upgrade to Pro.
// The melody count is loaded from storage on every screen focus so the number
// stays accurate after saves, deletes, and edits on other screens.
//
// useState is a hook that gives a functional component its own memory.
// It returns a pair. [currentValue, setterFunction].
// Calling the setter causes Reaxt to re-render the component with a new value.
//
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
//React Navigation is the standard library for moving between screens
//in React Navtive apps.
//useNavigation is a hook that gives any component access to the navigation
// object, which has methods like navigation(), replace(), and goback().
//
// A live melody count is loaded from Asyncstorage on every focus event so the number
//stays current after saves, deletes, and edits. It re-runs Callback everytime screen comes into focus,
//including when the user navigates back from the library.
// Ref:https://reactnavigation.org/docs/use-focus-effect/
import { useFocusEffect, useNavigation } from '@react-navigation/native';
// Icons library from Expo's the community package.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
//App wide color theme constants defined in a seperate file.
//The app color theme stays consistent. Centralizing colors allows changing
//values will update the entire app's look.
import colors from '../constants/colors';
import { loadLibrary } from '../utils/storage';
// Subscription entitlement hook — mock in Phase 1, real RevenueCat in Phase 2.
// See hooks/useSubscription.js for the swap instructions.
import { FREE_MELODY_LIMIT, useSubscription } from '../hooks/useSubscription';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { isPro } = useSubscription();

  // melodyCount holds the number of saved melodies read from AsyncStorage.
  // Initialized to null so we can show a loading state before the first read.
  const [melodyCount, setMelodyCount] = useState(null);

  // useFocusEffect runs loadCount every time the Home screen comes into focus.
  // useCallback keeps the reference stable so useFocusEffect does not loop.
  useFocusEffect(
    useCallback(() => {
      const loadCount = async () => {
        const library = await loadLibrary();
        setMelodyCount(library.length);
      };
      loadCount();
    }, [])
  );

  // atFreeLimit is true when a free user has reached or exceeded the 5-melody cap.
  const atFreeLimit =
    !isPro && melodyCount !== null && melodyCount >= FREE_MELODY_LIMIT;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <Text style={styles.appTitle}>MELODY SHIFTER</Text>
        <Text style={styles.appTagline}>Analyze. Transpose. Compare.</Text>
      </View>

      {/* Instructions */}
      <TouchableOpacity
        style={styles.howItWorksCard}
        onPress={() => navigation.navigate('HowItWorks')}
        activeOpacity={0.8}>
        <View style={styles.howItWorksLeft}>
          <MaterialCommunityIcons name="play-circle" size={28} color={colors.accent} />
          <View>
            <Text style={styles.howItWorksTitle}>How Melody Shifter Works</Text>
            <Text style={styles.howItWorksSub}>Watch the 45-second walkthrough</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
      </TouchableOpacity>

      {/* Scrollable content */}
      <View style={styles.homeContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          <Text style={styles.paragraph}>
            Enter a melody, save it with a name, transpose it in any key, and
            build your library of musical ideas.
          </Text>

          {/* Live melody count from AsyncStorage */}
          <View style={styles.countBox}>
            <MaterialCommunityIcons
              name="music-note-plus"
              size={18}
              color={atFreeLimit ? colors.error : colors.accent}
            />
            <Text
              style={[
                styles.countBoxText,
                atFreeLimit && styles.countBoxTextWarn,
              ]}>
              {melodyCount === null
                ? 'Loading...'
                : melodyCount === 0
                ? 'No melodies saved yet'
                : isPro
                ? `${melodyCount} ${melodyCount === 1 ? 'melody' : 'melodies'} saved`
                : `${melodyCount} / ${FREE_MELODY_LIMIT} free melodies saved`}
            </Text>
          </View>

          {/* Upgrade banner — shown when free user hits the limit */}
          {atFreeLimit && (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => navigation.navigate('SettingsTab', { screen: 'Pro' })}
              activeOpacity={0.85}>
              <MaterialCommunityIcons name="crown" size={16} color={colors.accent} />
              <Text style={styles.upgradeBannerText}>
                Upgrade to Pro for unlimited melodies
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={colors.accent}
              />
            </TouchableOpacity>
          )}

          <View style={styles.homeDivider} />

          {/* Feature summary */}
          {[
            { icon: 'pencil-outline',       label: 'Enter notes using the chromatic keyboard' },
            { icon: 'swap-horizontal',      label: 'Transpose into any of 24 keys' },
            { icon: 'content-save-outline', label: 'Save and revisit your melody library' },
          ].map((item, index) => (
            <View key={index} style={styles.featureRow}>
              <MaterialCommunityIcons
                name={item.icon}
                size={18}
                color={colors.accent}
              />
              <Text style={styles.featureText}>{item.label}</Text>
            </View>
          ))}

        </ScrollView>
      </View>

      {/* Footer actions */}
      <View style={styles.homeFooter}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
          onPress={() => navigation.navigate('MelodyTab', {screen: 'Setup'})}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.buttonText} />
          <Text style={styles.primaryBtnText}>Start Melody</Text>
        </Pressable>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('LibraryTab', {screen: 'Library' })}
          activeOpacity={0.8}>
          <MaterialCommunityIcons name="bookshelf" size={20} color={colors.accent} />
          <Text style={styles.secondaryBtnText}>My Melodies</Text>
        </TouchableOpacity>

        {/* Pro crown button — only shown when user is already subscribed */}
        {isPro && (
          <TouchableOpacity
            style={styles.proFooterBtn}
            onPress={() => navigation.navigate('SettingsTab', {screen: 'Pro'})}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="crown" size={15} color={colors.accent} />
          </TouchableOpacity>
        )}

        <Text style={styles.homeFooterText}>
          Built for melody exploration, music learning, and creative workflow.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  homeHeader:  { paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 6,
  },
  appTagline: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 2,
    fontWeight: '500',
    marginTop: 6,
  },
  homeContent:   { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  scrollContent: { paddingTop: 12, paddingBottom: 24 },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  countBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
    alignSelf: 'center',
  },
  countBoxText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  countBoxTextWarn: { color: colors.error },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSubtle,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: 16,
  },
  upgradeBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  homeDivider: { height: 1, backgroundColor: colors.line, marginBottom: 20 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  featureText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  homeFooter: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnPressed: { backgroundColor: colors.accentDark },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  proFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  homeFooterText: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  howItWorksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accentGlow,
  },
  howItWorksLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  howItWorksTitle: {
    fontSize: 15, fontWeight: '700', color: colors.text,
  },
  howItWorksSub: {
    fontSize: 12, color: colors.muted, marginTop: 1,
  },
});