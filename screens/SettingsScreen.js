// screens/SettingsScreen.js
// MelodyShifter — Settings Screen
//
// This screen organizes account, help, and app information in one place.
// It also gives users access to the instructional video screen and Pro features.
// Grouping these options into sections improves clarity and overall UX.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ScrollView, StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
// SafeAreaView protects the layout from overlapping with phone hardware areas.
import { SafeAreaView } from 'react-native-safe-area-context';
// Shared color system keeps visual design consistent across the app.
import colors from '../constants/colors';
// This custom hook checks whether the user has an active Pro subscription.
import { useSubscription } from '../hooks/useSubscription';

// This function builds the settings menu based on whether the user is Pro.
// Dynamic content allows the app to show either "Upgrade to Pro" or
// "MelodyShifter Pro — Active" without needing separate screens.
const SETTINGS_ROWS = (isPro) => [
  {
    section: 'Account',
    items: [
      {
        icon: isPro ? 'crown' : 'crown-outline',
        label: isPro ? 'MelodyShifter Pro — Active' : 'Upgrade to Pro',
        sublabel: isPro ? 'Manage your subscription' : 'Unlock unlimited melodies & more',
        screen: 'Pro',
        accent: true,
      },
    ],
  },
  {
    section: 'Help',
    items: [
      {
        icon: 'play-circle-outline',
        label: 'How It Works',
        sublabel: 'Watch the app walkthrough',
        screen: 'HowItWorks',
        tab: 'HomeTab',
      },
    ],
  },
  {
    section: 'About',
    items: [
      {
        icon: 'information-outline',
        label: 'Version 1.0',
        sublabel: 'MelodyShifter — Melody analysis & transposition',
        screen: null,
      },
    ],
  },
];

export default function SettingsScreen({ navigation }) {
  // Reads the user's Pro access state from the subscription hook.
  const { isPro } = useSubscription();
  // Generates the visible settings rows based on subscription status.
  const rows = SETTINGS_ROWS(isPro);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings </Text>

        {/* map() is used to render each settings section dynamically.
            This keeps the screen easy to update later. */}
        {rows.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.section.toUpperCase()}</Text>
            <View style={styles.card}>   
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.row,
                    i < section.items.length - 1 && styles.rowBorder,
                  ]}
                  onPress={() => {
                    // If a row does not have a destination screen,
                    // it behaves like display-only information.
                    if (!item.screen) return;
                    // If the row belongs to a nested navigator tab,
                    // navigate through the tab first and then to the target screen.
                    if (item.tab) {
                      navigation.navigate(item.tab, { screen: item.screen});
                    } else {
                      // Otherwise navigate directly to the screen.
                      navigation.navigate(item.screen);
                    }
                  }}
                  // Only clickable rows should show button-style touch behavior.
                  activeOpacity={item.screen ? 0.7 : 1}
                  disabled={!item.screen}>
                
                {/* Icon container gives each row a recognizable visual marker */}
                <View style={[styles.iconWrap, item.accent && styles.iconWrapAccent]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color={item.accent ? colors.accent : colors.muted}
                  />
                  </View>
                  
                  {/* Text area shows the main label and optional supporting description */}
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, item.accent && styles.rowLabelAccent]}>
                      {item.label}
                    </Text>
                    {item.sublabel && (
                      <Text style={styles.rowSublabel}>{item.sublabel}</Text>
                    )}
                  </View>
                  
                  {/* Chevron is only shown when the row leads to another screen */}
                  {item.screen && (
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
                  )} 

                </TouchableOpacity>
              ))}                
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: {
    fontSize: 28, fontWeight: '900', color: colors.text,
    letterSpacing: -0.5, marginBottom: 24, marginTop: 8,
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.muted,
    letterSpacing: 1, marginBottom: 8,
  },
  // Card container gives each section a clean grouped appearance
  // that is easier to scan on mobile.
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconWrap: {
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapAccent: {
    backgroundColor: colors.accentWash,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowLabelAccent: { color: colors.accent },
  rowSublabel: { fontSize: 12, color: colors.muted, marginTop: 1 },
});