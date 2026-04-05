// March 13, 2026
// app/index.js or App.js at root
//MelodyShifter - App entry point and root navigator.
// A melody analysis and transposition app built with React NAtive and Expo.
// Expected project hours of completion 140hrs
//
// All screen components have been moved to their own files under screens/.
// All shared constants live in constants/musicConstants.js.
// All storage helpers and transposition logic live in utils/storage.js.
//
// This file now only wires up the navigator, the RevenueCat SDK, and the
// root providers. Nothing else lives here.
//
//React is the core library. We import it because JSX compiles down to element calls.
import React, { useEffect } from 'react';
// React Native provides platform specific UI primitives tha map to native views.
// Importing the basic visual components for the UI
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
//Create Native stack Navigator creates a stack navigator. A screen history
// where each new screen is pushed on top and removed when the user goes back.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
//Mobile phones have notches, status bars, and home indicators that can overlap
//app content. SafeAreaProvider calculates the safe inserts for the device.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import colors from '../constants/colors';

// Screen imports — each screen is its own file
import EnterMelodyScreen from '../screens/EnterMelodyScreen';
import HomeScreen from '../screens/HomeScreen';
import HowItWorksScreen from '../screens/HowItWorksScreen';
import LibraryScreen from '../screens/LibraryScreen';
import MelodyDetailScreen from '../screens/MelodyDetailScreen';
import ProScreen from '../screens/ProScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SetupScreen from '../screens/SetUpScreen';
import SplashScreen from '../screens/SplashScreen';




// RevenueCat SDK — imported conditionally so it does not crash Expo Go.
// Purchases and LOG_LEVEL will be undefined in Expo Go, that is intentional.
// In Expo Go, Purchases and LOG_LEVEL will be undefined, that is intentional.
let Purchases, LOG_LEVEL;
try {
  const rc = require('react-native-purchases');
  Purchases  = rc.default;
  LOG_LEVEL  = rc.LOG_LEVEL;
} catch {
  // react-native-purchases is not available in Expo Go — safe to ignore.
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
// createNativeStackNavigator returns a stack object with two components;
// stackNavigator, which is the container that merges the screen stack and its state
//stack,Screen registers a single screen with a name and component reference
// Intial router name sets which screen appears first on launch.
// scrren options hides the default navigateion header globally.
//Individual screens can override this with theit own opitons prop.
const RootStack = createNativeStackNavigator();

// Tab-specific stacks
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
    </Stack.Navigator>
  );
}

function MelodyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Setup" component={SetupScreen} />
      <Stack.Screen name="EnterMelody" component={EnterMelodyScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="MelodyDetail" component={MelodyDetailScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Pro" component={ProScreen} />
    </Stack.Navigator>
  );
}

// Tab icons
const TAB_ICONS = {
  HomeTab:     { active: 'home',            inactive: 'home-outline' },
  MelodyTab:   { active: 'music-note-plus', inactive: 'music-note-plus' },
  LibraryTab:  { active: 'bookshelf',       inactive: 'bookshelf' },
  SettingsTab: { active: 'cog',             inactive: 'cog-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          paddingBottom: 6,
          height: 60,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}>
      <Tab.Screen name="HomeTab"     component={HomeStack}     options={{ title: 'Home' }} />
      <Tab.Screen name="MelodyTab"   component={MelodyStack}   options={{ title: 'New Melody' }} />
      <Tab.Screen name="LibraryTab"  component={LibraryStack}  options={{ title: 'Library' }} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

// Root navigator 
// Handles the Splash to Main transition. Once splashDone flips to true,
// the Splash screen is replaced by the full tab shell and cannot be
// navigated back to.
function RootNavigator() {
  return (
    <RootStack.Navigator 
      initialRouteName= "Splash"
      screenOptions ={{headerShown: false}}>
      <RootStack.Screen name="Splash" component={SplashScreen} />
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen name="Pro" component={ProScreen} />
      <RootStack.Screen name="HowItWorks" component={HowItWorksScreen} />
    </RootStack.Navigator>
  );
}


export default function App() {
  //https://app.revenuecat.com/projects/b7899cce/get-started/install-sdk
  useEffect(() => {
    // Check if purchases exists 
    // Guard against Expo Go where Purchases is undefined.
    if (Purchases && LOG_LEVEL) return; // Return if they DON'T exist
    // Enable verbose logging to help debug during development
    // If they do exist, proceed with config
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    const iosApiKey = 'test_fnpyGdKIargMBOrXUwpQXQwfAOR';
    const androidApiKey = 'test_fnpyGdKIargMBOrXUwpQXQwfAOR';

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: iosApiKey });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: androidApiKey });
    }
  }, []);

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

