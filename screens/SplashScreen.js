// screens/SplashScreen.js
// MelodyShifter — Splash Screen
//
// Shows the app logo and branding for 2.5 seconds, then automatically
// navigates to Home. Uses navigation.replace() so the user cannot
// navigate back to the splash after it completes.

import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';

export default function SplashScreen() {
  const navigation = useNavigation();

  // useEffect with an empty dependency array runs once after first render.
  // The timer navigates to Home after 2.5 seconds.
  // The cleanup function cancels the timer if the component unmounts early,
  // preventing a memory leak.
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Main');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.splashContainer}>
      {/* Logo mark */}
      <View style={styles.logoWrap}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        {/* Outer glow ring */}
        <View style={styles.glowRing} />
      </View>

      {/* App name */}
      <Text style={styles.appName}>MELODYSHIFTER</Text>

      {/* Tagline */}
      <Text style={styles.splashTagline}>Analyze. Transpose. Compare.</Text>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: colors.accentGlow,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 6,
    marginBottom: 10,
  },
  splashTagline: {
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 2,
    fontWeight: '500',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
});