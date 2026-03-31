// March 13, 2026
// MelodyShifter - App.js
// A melody analysis and transposition app built with React NAtive and Expo.
// Expected project hours of completion 140hrs
//
//React is the core library. We import it because JSX compiles down to element calls.
//
// useState is a hook that gives a functional component its own memory.
// It returns a pair. [currentValue, setterFunction].
// Calling the setter causes Reaxt to re-render the component with a new value.
//
// useEffect is a hook for running side effects code that interacts with something
// outside the component, such as device storage or a timer.
//It runs after the component renders to thhe screen.
//
//useCallback memorizes the load count function so useFocusEffect does not create a new
//function reference on every render, which would cause an infinite re-run loop.
// Ref: https://react.dev/reference/react/useCallback
import React, { useCallback, useEffect, useState } from 'react';
//
// React Native provides platform specific UI primitives tha map to native views.
// Importing the basic visual components for the UI
// FlatList for rendering the melody list
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
//
//Mobile phones have notches, status bars, and home indicators that can overlap
//app content. SafeAreaProvider calculates the safe inserts for the device.
//and SafeAreaView applies tha padding per screen so content is never hidden.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
//App wide color theme constants defined in a seperate file.
//The app color theme stays consistent. Centralizing colors allows changing
//values will update the entire app's look.
import colors from '../constants/colors';
//
//React Navigation is the standard library for moving between screens
//in React Navtive apps.
//useNavigation is a hook that gives any component access to the navigation
// object, which has methods like navigation(), replace(), and goback().
//
//NavigationContainer is the root wrapper that holds navigation state
// for the entire app.
//
// A live melody count is loaded from Asyncstorage on every focus event so the number
//stays current after saves, deletes, and edits. It re-runs Callback everytime screen comes into focus,
//including when the user navigates back from the library.
// Ref:https://reactnavigation.org/docs/use-focus-effect/
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
//Create Native stack Navigator creates a stack navigator. A screen history
// where each new screen is pushed on top and removed when the user goes back.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Icons library from Expo's the community package.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Provider as PaperProvider } from 'react-native-paper';
//AsyncStorage is a key storage value store for persisting data on the device between
//app launches. It is asynchronous meaning it doeas not block the UI while reading and //
//writing. We use async-await syntax to handle its non blocking operations.
import AsyncStorage from '@react-native-async-storage/async-storage';
// Subscription entitlement hook — mock in Phase 1, real RevenueCat in Phase 2.
// See hooks/useSubscription.js for the swap instructions.
import { FREE_MELODY_LIMIT, useSubscription } from '../hooks/useSubscription';
import ProScreen from '../screens/ProScreen';
// We need a melody detail screen
import MelodyDetailScreen from '../screens/MelodyDetailScreen';

// RevenueCat SDK — imported conditionally so the module load itself
// does not crash Expo Go. The actual initialization is guarded below
// by the REVENUECAT_ENABLED flag.
// In Expo Go, Purchases and LOG_LEVEL will be undefined — that is intentional.
let Purchases, LOG_LEVEL;
try {
  const rc = require('react-native-purchases');
  Purchases  = rc.default;
  LOG_LEVEL  = rc.LOG_LEVEL;
} catch {
  // react-native-purchases is not available in Expo Go — safe to ignore.
}

// Storage Keys
//
// Saves the current working melody notes to device storage while the user
// is still building it on the MelodyScreen. This is separate from saveLibrary,
// which saves a completed, named melody to the permanent library.
// This acts as a draft if the app is closed mid-entry, the notes
// are not lost. Uses the same stringify pattern as saveLibrary.
const DRAFT_KEY = 'melody_draft';
// Library Key stores the full array of saved, named , and named melodies.
const LIBRARY_KEY = 'melodyshift_library';

// Draft helpers async- Asyncstorage
//
//save notes draft wwrites the users currrent notes,
//Called on every add, remove, and clear so the draft is always current
const saveNotesDraft = async (notes = []) => {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
};
//
// Load notes draft reads the draft from storage and returns its array
// Returns an empty array if nothing has been saved yet.
const loadNotesDraft = async () => {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load draft', error);
    return [];
  }
};
//
// Clear notes draft wipes the draft after a melody is saved or discarded
const clearNotesDraft = async () => {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
};

// Library helpers asyn -AsyncStorage
//
// Load library reads the saved melody library off the device and returns as an array
//JSON.parse converts the stored string back into a usable array
// If nothing has been saved yet, we return an empty array.
const loadLibrary = async () => {
  try {
    const data = await AsyncStorage.getItem(LIBRARY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading melody library', error);
    return [];
  }
};

// save library writes the full melody library array to the device
//JSON stringify serializes the arry into text before saving
//because AsyncStorage only holds strings.
const saveLibrary = async (updatedLibrary) => {
  try {
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error('Error saving melody library', error);
  }
};

// Constants
// Constants are values that never change during the apps lifecycle.
// In JavaScript, const declares a variable whose binding cannot be reassigned.
// Placing constants outside of components means they are created once in memory.
// not re-created every time a component renders.
//

//  The chromatic scale contains all 12 pitvh classes in western music theory.
// Index 0 = C, Index 1 = C#... Index 11 = B.
// This array serves two purposes.
// 1. Mapping a note name to its numeric pitch class index.
// 2. Converting a semitone number back into a note name after transposition.
const CHROMATIC = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
// Treble clef spans C4 (middle C) through C7
// Octave numbers follow scientific pitch notation, where C4 = middle C = 261 Hz.
const TREBLE_OCTAVES = [4, 5, 6];
// Octave options shown when bass clef is selected
// Bass clef spans E2 through E5, covering lower-range instruments and voices.
const BASS_OCTAVES = [2, 3, 4];
// Melody length limit. Keeping the list short makes analysis
// readable on a mobile phone.
const MAX_NOTES = 16;
// An array of 24 key objects. All 12 chromatic roots in major and minor.
// Each object carries three related values. A display label, the root note value,
// and the scale type. Using objects instead of plain strings keeps related
// data grouped together cleanly.
const KEYS = [
  { label: 'C Major', value: 'C', type: 'major' },
  { label: 'C Minor', value: 'C', type: 'minor' },
  { label: 'C# Major', value: 'C#', type: 'major' },
  { label: 'C# Minor', value: 'C#', type: 'minor' },
  { label: 'D Major', value: 'D', type: 'major' },
  { label: 'D Minor', value: 'D', type: 'minor' },
  { label: 'D# Major', value: 'D#', type: 'major' },
  { label: 'D# Minor', value: 'D#', type: 'minor' },
  { label: 'E Major', value: 'E', type: 'major' },
  { label: 'E Minor', value: 'E', type: 'minor' },
  { label: 'F Major', value: 'F', type: 'major' },
  { label: 'F Minor', value: 'F', type: 'minor' },
  { label: 'F# Major', value: 'F#', type: 'major' },
  { label: 'F# Minor', value: 'F#', type: 'minor' },
  { label: 'G Major', value: 'G', type: 'major' },
  { label: 'G Minor', value: 'G', type: 'minor' },
  { label: 'G# Major', value: 'G#', type: 'major' },
  { label: 'G# Minor', value: 'G#', type: 'minor' },
  { label: 'A Major', value: 'A', type: 'major' },
  { label: 'A Minor', value: 'A', type: 'minor' },
  { label: 'A# Major', value: 'A#', type: 'major' },
  { label: 'A# Minor', value: 'A#', type: 'minor' },
  { label: 'B Major', value: 'B', type: 'major' },
  { label: 'B Minor', value: 'B', type: 'minor' },
];
// Clef dediniton with display metadta.
// Ican Name references the MaterialCommunityIcons name for each clef type.
// The range field is shown as a hint to help users choose the correct clef.
const CLEFS = [
  {
    id: 'treble',
    label: 'Treble Clef',
    iconName: 'music-clef-treble',
    range: 'C4 -C7',
  },
  {
    id: 'bass',
    label: 'Bass Clef',
    iconName: 'music-clef-bass',
    range: 'E2 - E5',
  },
];
const MOOD_PRESETS = ['Calm', 'Energetic', 'Uplifting', 'Dramatic', 'Custom'];

// Transposition Logic
//
// These are pure functions. They take inputs, return outputs, and produce
// no side effevts. Pure functions are predictable. The same input always
// give the same output, making them easy to reason about and test.
//  They are declared outside of any componet so they are not re-created
// on every render.

// getSemitones (noteStrings) converts a note string like 'C4" or 'A#5' into an
// absolute semitone number.
// This is the foundation for all pitvh arithmetic in the app.
// Formula: semitone = (octave x 12) + noteIndex
// Each octave contains exacrtly 12 semitones (the chromativ scale)
// Example: C4 -> octave 4, noteIndex 0 ->  (4 x 12) + 0 = 48
//Example: A#5 -> octave 5, noteIndex 10 -> (5 x 12) + 10 = 70
const getSemitones = (noteString = '') => {
  //Check if note string is empty. Return a default value middle C
  if (!noteString) return 0;
  // String methods used.
  //Get the  note name without the last character.
  const noteName = noteString.slice(0, -1); // 'C#' from 'C#4'
  // slice (-1) returns only the last character, isolating the octave digit
  // ParseInt converts the octave string into an interger.
  //Get the octave, take only the last character.
  // Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice
  const octaveString = noteString.slice(-1);
  //Convert the text to a number. 4 text becomes math number 4.
  const octave = parseInt(octaveString, 10); // e.g. 4 from 'C#4'
  // Indexof Return the 0 based position of the note in the CHROMATIC array
  //Finds where the is on the CHROMATIC list (0-11)
  //Ref:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
  const noteIndex = CHROMATIC.indexOf(noteName); // e.g. 1 for 'C#'
  //Every octave has 12 notes , so (octave *12), then + the postion of the note
  //The math  octave * 12 + the note position
  return octave * 12 + noteIndex;
};

// validateClefRange of notes and clef
//Accept an array of note strings and a clef type (treble or bass).
// Returns a new array containg only the notes that fall outside the
//expected range for the selected clef.
//If all notes are in range, the returned array is empty.
const validateClefRange = (notes = [], clef = '') => {
  // Treble clef: C4 to C7
  const trebleMin = getSemitones('C4');
  const trebleMax = getSemitones('C7');
  // Bass clef: E2 to E5
  const bassMin = getSemitones('E2');
  const bassMax = getSemitones('E5');
  // The array filter returns a new array of only the elemens where the
  //callback function returns true. The original array is never modified.
  //Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
  return notes.filter((note) => {
    const semitones = getSemitones(note);
    //The || operator is the logical OR if any condition is true,
    // the note is flagged as out of range.
    if (clef === 'treble')
      return semitones < trebleMin || semitones > trebleMax;
    if (clef === 'bass') return semitones < bassMin || semitones > bassMax;
    return false;
  });
};

// transposeNote shifts a single note up or down by a given number of semitones
// and returns the resulting note string.
//This is the core algorithm powering the transpositon feature.
// Example: transpose('C4', 2) returns 'D4'
const transposeNote = (noteString = '', semitoneShift = 0) => {
  const noteName = noteString.slice(0, -1);
  //Parse the note name and octave from the input string
  const octave = parseInt(noteString.slice(-1));
  //Look up the notes's pitch class index in the chromatic scale (0-11)
  const noteIndex = CHROMATIC.indexOf(noteName);
  //Compute the absolute semitone value
  //add the shift to get the new absolute semitone value
  const totalSemitones = octave * 12 + noteIndex + semitoneShift;
  //Divide by 12 using math.Floor to get the new octave
  const newOctave = Math.floor(totalSemitones / 12);
  //Use modulo 12 to get the new pitch class index (0-11)
  //Modulo pattern ((x % 12) + 12) % 12
  //In JavaScript, the % operator can return a negative result for negative inputs
  //(e.g., -1 % 12 returns -1, not 11). Adding 12 before taking the mudulo again
  //guarantees the result is always between 0 -11.
  const newNoteIndex = ((totalSemitones % 12) + 12) % 12;
  //Template literals `${value}` is javascript's string interpolation suntax.
  //Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
  return `${CHROMATIC[newNoteIndex]}${newOctave}`;
};

// Screen Components
//
// 1.SplashScreen
// Shows the app logo and branding version for 2.5 seconds
// then automatically redirects to HomeScreen for a polished launch fieel.
function SplashScreen() {
  const navigation = useNavigation();

  // useEffect with an empty array runs after the first render.
  useEffect(() => {
    //setTimeout will navigate to the next screen after 2.5 second delay.
    const timer = setTimeout(() => {
      //Replace is used  so the splashscreen is remoaved and the user can not go back to it.
      navigation.replace('Home');
    }, 2500);
    //The return value is a cleanup function that cancels the timer
    //If the timer component unmounts before the completes.
    //This prevents memory leaks.
    //Ref: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
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

// 2. HomeScreen
// App landing page that describes what melodyShift does and provides
// The single entry point is a Start Melody button that navigates to setup screen.
function HomeScreen() {
  const navigation = useNavigation();
  const { isPro } = useSubscription();

  // MelodyCount holds the number of saved melodies read from Asyncstorage.
  // displayed as a live count below the discription.
  // Initialized to null so we can show a loading state before the first read.
  const [melodyCount, setMelodyCount] = useState(null);

  // UseFocus effect runs loadCount every time the Home Screen //
  //comes into focus
  //This keeps the count accurate after the user saves, deletes,
  //or edits on another screen and
  //navigates back here.
  //useCallback wraps loadCount so its reference stays stable between renders satisfying
  // useFocusEffect's dependency requirements.
  useFocusEffect(
    useCallback(() => {
      // Read the library and updates the melody count on the home screen.
      // we call it directly without using async await.
      const loadCount = async () => {
        const library = await loadLibrary();
        setMelodyCount(library.length);
      };
      loadCount();
    }, [])
  );

  //Free limit for when the user hits or exceeds the 5 melody cap
  const atFreeLimit =
    !isPro && melodyCount !== null && melodyCount >= FREE_MELODY_LIMIT;

  return (
    // Main screen container
    <SafeAreaView style={styles.container}>
      {/* Header Section*/}
      <View style={styles.homeHeader}>
        <Text style={styles.appTitle}>MELODY SHIFTER</Text>
        <Text style={styles.appTagline}>Analyze. Transpose. Compare.</Text>
      </View>

      {/** Scrollable feature content for small screens*/}
      <View style={styles.homeContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          // Hides the scrollbar for a cleaner look
          showsVerticalScrollIndicator={false}>
          {/* Short app description */}
          <Text style={styles.paragraph}>
            Enter a melody, save it with a name, transpose it in any key, and
            build your library of musical ideas.
          </Text>

          {/** Live melody count loaded from AsyncStorage on every screen focus.
          The ternary renders a loading placeholder until count is ready*/}
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
                ? `${melodyCount} ${
                    melodyCount === 1 ? 'melody' : 'melodies'
                  } saved`
                : `${melodyCount} / ${FREE_MELODY_LIMIT} free meloodies saved`}
            </Text>
          </View>
          {/** Upgrade shows when the free user is at their limit*/}
          {atFreeLimit && (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => navigation.navigate('Pro')}
              activeOpacity={0.85}>
              <MaterialCommunityIcons name="crown" size={16} color={colors.accent} />
              <Text style={styles.upgradeBannerText}>
                Upgrade to Pro for unlimited melodies
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                colors={colors.accent}
              />
            </TouchableOpacity>
          )}

          {/* line to separate sections */}
          <View style={styles.homeDivider} />

          {/* Feature summary Body */}
          {[
            {
              icon: `pencil-outline`,
              label: 'Enter notes using the chromatic keyboard',
            },
            { icon: `swap-horizontal`, label: `Transpose into any 24 keys` },
            {
              icon: `content-save-outline`,
              label: `Save and revist your melody library.`,
            },
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

      {/** 1st Footer action to start a new melody through setup flow */}
      <View style={styles.homeFooter}>
        <Pressable
          // Pressed is a boolean from React Native with a merging style applied while
          // the button is held down
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
          onPress={() => navigation.navigate('Setup')}>
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={colors.buttonText}
          />
          <Text style={styles.primaryBtnText}>Start Melody</Text>
        </Pressable>

        {/** 2nd Footer action to open the saved melody library */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Library')}
          activeOpacity={0.8}>
          <MaterialCommunityIcons
            name="bookshelf"
            size={20}
            color={colors.accent}
          />
          <Text style={styles.secondaryBtnText}>My Melodies</Text>
        </TouchableOpacity>

        {/** Pro Upgrade entry point always visible on the footer */}
        {isPro && (
          <TouchableOpacity
            style={styles.proFooterBtn}
            onPress={() => navigation.navigate('Pro')}
            activeOpacity={0.85}>
            <MaterialCommunityIcons
              name="crown"
              size={15}
              color={colors.accent}
            />
          </TouchableOpacity>
        )}

        {/* Footer: Mission statement at the bottom of the screen */}
        <Text style={styles.homeFooterText}>
          Built for melody exploration, music learning, and creative workflow.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// 3. SetupScreen
// The user slects a starting key, clef type, and default octave.
// All three value choices are passed to MelodyScreen as route params.
function SetupScreen() {
  const navigation = useNavigation();

  // Intialize the slectedKey tot he firdt item in Keys array (C Major).
  //React renders the component whenever selectedKey is called with a new value.
  const [selectedKey, setSelectedKey] = useState(KEYS[0]);

  // Holds the selected clef id for trable or bass.
  const [selectedClef, setSelectedClef] = useState('treble');

  // Stores the currently select octave as an integer.
  const [selectedOctave, setSelectedOctave] = useState(4);

  // available Octaves is a derived value, not stored in state
  //because it can be computed directly from slectedClef, Avoiding redundant state is
  //React best practice. If a value can be derived, then derive it.
  //The ternary operator condition ? valueIfTrue : valueIfFalse.
  //Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
  const availableOctaves =
    selectedClef === 'treble' ? TREBLE_OCTAVES : BASS_OCTAVES;

  // isSharp returns true if the key value contains a # symbol
  // String.include checks whether a substring exists within a string.
  const isSharp = (keyValue) => keyValue.includes('#');

  // Update the clef and reset the octave to a default.
  // When the user switches between treble and bass. This prevents a treble
  //octave form carrying over when bass is selected, wich would
  //be outside the bass range and confusing for the user.
  const handleClefChange = (clefId) => {
    setSelectedClef(clefId);
    setSelectedOctave(clefId === 'treble' ? 4 : 3);
  };

  // Package the three setup choices and navigate to MelodyScreen.
  //The navigation with screen name and params passes the data tp the next screen.
  //On the recieving end, route.param will contain the setup choices.
  //Ref:  https://reactnavigation.org/docs/params
  const handleContinue = () => {
    navigation.navigate('EnterMelody', {
      startKey: selectedKey,
      clef: selectedClef,
      octave: selectedOctave,
    });
  };

  // UI for the Setup screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Setup</Text>
          <Text style={styles.subtitle}>
            {'\n'}Configure your melody before you begin
          </Text>
        </View>

        {/* Section 1 Starting Key */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>{'\n'}STARTING KEY</Text>
          <Text style={styles.setupHint}>
            Select the key your melody is written in
          </Text>
          {/** Horizontal scrollview lets the user swipe through all 24 keys. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.keyRow}>
            {/*Array map transforms the KEYS array into an array of JSX button eleents.
            //The key prop is rewuired by React to identify each list item, helping
            //React update the UI efficiently. */}
            {KEYS.map((key, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.keyBtn,
                  selectedKey.label === key.label && styles.keyBtnActive,
                  isSharp(key.value) && styles.keyBtnSharp,
                  selectedKey.label === key.label &&
                    isSharp(key.value) &&
                    styles.keyBtnSharpActive,
                ]}
                onPress={() => setSelectedKey(key)}>
                <Text
                  style={[
                    styles.keyBtnNote,
                    selectedKey.label === key.label && styles.keyBtnNoteActive,
                  ]}>
                  {key.value}
                </Text>
                <Text
                  style={[
                    styles.keyBtnType,
                    selectedKey.label === key.label && styles.keyBtnTypeActive,
                  ]}>
                  {key.type === 'major' ? 'Maj' : 'Min'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Disply shows which key is currently selected */}
          <View style={styles.selectedDisplay}>
            <Text style={styles.selectedDisplayText}>
              Selected:{' '}
              <Text style={styles.selectedDisplayValue}>
                {selectedKey.label}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 2 Clef Type */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>STAFF TYPE</Text>
          <Text style={styles.setupHint}>
            Treble clef for higher voices, bass clef for lower
          </Text>

          {/**Two clef buttons renderd by mapping the CLEFS array. The clef change is 
          called on press to upddate both clef and octave state. */}
          <View style={styles.clefRow}>
            {CLEFS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.clefBtn,
                  selectedClef === c.id && styles.clefBtnActive,
                ]}
                onPress={() => handleClefChange(c.id)}>
                {/* Render the icon using MAterial Community Icon */}
                <MaterialCommunityIcons
                  name={c.iconName}
                  size={36}
                  color={selectedClef === c.id ? colors.accent : colors.muted}
                />
                <Text
                  style={[
                    styles.clefLabel,
                    selectedClef === c.id && styles.clefLabelActive,
                  ]}>
                  {c.label}
                </Text>
                <Text style={styles.clefRange}>{c.range} </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 3  Octave
        One button per available octave, derived fron the selected clef.
        Ref: https://react.dev/learn/conditional-rendering#logical-and-operator */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>OCTAVE RANGE</Text>
          <Text style={styles.setupHint}>
            Octave 4 is middle C range, a good starting point
          </Text>

          <View style={styles.octaveRow}>
            {availableOctaves.map((oct) => (
              <TouchableOpacity
                key={oct}
                style={[
                  styles.octaveBtn,
                  selectedOctave === oct && styles.octaveBtnActive,
                ]}
                onPress={() => setSelectedOctave(oct)}>
                <Text
                  style={[
                    styles.octaveBtnText,
                    selectedOctave === oct && styles.octaveBtnTextActive,
                  ]}>
                  {oct}
                </Text>
                {oct === 4 && <Text style={styles.octaveHint}>Middle C</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={handleContinue}
          activeOpacity={0.85}>
          <Text style={styles.analyzeBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// 4. Melody Screen
// The main input screen. The user taps a note to build a melody sequence.
// Notes appear in a FlatList as they are added.
//When satisfied, the user taps analyze and Transpose to move to results screen.
//
//Route is a prop automaticlly injected by the navigator.
//Those route params contain tht startkey, clef, and octave pass from the setup screen.
function MelodyScreen({ route }) {
  const navigation = useNavigation();
  const { isPro } = useSubscription();

  // Receive setup choices passed from SetupScreen
  const { startKey, clef, octave, savedMelody } = route.params;

  // Stores the currently selected octave
  //This can be changed during melody entry so the user can build
  //phrases that span across octave boundaries.
  const [selectedOctave, setSelectedOctave] = useState(octave);
  // Stores the array of note objects the user has added
  // Each note loooks like {id: '123' , note: 'C4'}
  //ach note object has a unique id for targeted detection and a note string for dislay.
  const [notes, setNotes] = useState([]);
  // Show correct octaves based on the clef passed from the Setup
  const availableOctaves = clef === 'treble' ? TREBLE_OCTAVES : BASS_OCTAVES;

  //When the melodyscreen first mounts, check if there is a draft saved from a previous
  //session.
  //If one exists, restore it so the user can pick up right where left off.
  //The empty dependency array means this only runs once the screen loads.
  useEffect(() => {
    const initNotes = async () => {
      if (savedMelody && savedMelody.notes && savedMelody.notes.length > 0) {
        // Convert the stored plain note strings back into note objects with unique ids.
        const restoredNotes = savedMelody.notes.map((noteString, i) => ({
          id: `restored-${i}-${Date.now()}`,
          note: noteString,
        }));
        setNotes(restoredNotes);
        // Also restore the octave from saved melody.
        if (savedMelody.octave) {
          setSelectedOctave(savedMelody.octave);
        }
      } else {
        // no saved melody, try to restore an autosaved draft
        const draft = await loadNotesDraft();
        if (draft.length > 0) {
          setNotes(draft);
        }
      }
    };
    initNotes();
  }, [savedMelody]);

  // This is CRUD Create, Read, Update, delete. The four standard data operations.
  //Notes are stored in React state for live UI update and AsyncStorage for persostence. //
  //Every write operation updates both in sync.

  // Addnote adds(appends) a new note object to thenelody array.
  const addNote = (noteName) => {
    if (notes.length >= MAX_NOTES) {
      // Alert.alert args are (Title, Message, Buttons Array)
      Alert.alert(
        'Melody Full',
        'Max 16 notes. Remove a note to continue'
      );
      return;
    }

    //The spread operator (...notes) creates a shallow copy of the existing array
    //with the new item appended. we never mutate the start array directly.
    //React requires a new array reference to detect the change and trigger a re-render.
    const updateNotes = [
      ...notes,
      //Date.now returns the currrent Unix timestamo in milliseconds,
      //used as an  unique id.
      //Ref: https://www.geeksforgeeks.org/javascript/javascript-spread-operator/
      { id: Date.now().toString(), note: `${noteName}${selectedOctave}` },
    ];
    setNotes(updateNotes);
    saveNotesDraft(updateNotes);
  };

  // Remove the the most recently added note.
  const removeLastNote = () => {
    // The array slice returns elements except the last.
    //This is the 'Undo' action, behaving like a stack pop.
    const updatedNotes = notes.slice(0, -1);
    setNotes(updatedNotes);
    saveNotesDraft(updatedNotes);
  };

  // Delete a single note by its id and save
  const deleteNote = (id) => {
    // The array filter returns a new array keeping only items where the predicate
    //returns true. We keep every note whose id does not match the target,
    //removing the one that does.
    const updatedNotes = notes.filter((item) => item.id !== id);
    setNotes(updatedNotes);
    saveNotesDraft(updatedNotes);
  };

  // Clear all shows a confirmation dialog before wiping out the melody
  const clearAll = () => {
    //An alert with title, message,and buttons array.
    Alert.alert('Clear Melody', 'Remove all notes?', [
      //Array of button configurations onjetcs. The destructive style renders the button
      //in red.
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          //Only if the user confirms do we reset notes to an empty array.
          setNotes([]);
          saveNotesDraft([]);
        },
      },
    ]);
  };

  // Validate the melody before navigating to results screen.
  // Two validation gates.
  // 1. Minimum length of at least 2 notes are needed for any meanigful analysis.
  // 2. Clef range. Notes outside the typical staff range trigger a warning.
  //    The user can override and continue, but is informe first.
  const handleAnalyze = async () => {
    if (notes.length < 2) {
      Alert.alert('Too short', 'Enter at least two notes to analyze.');
      return;
    }

    /* Revenue Cat gate
    * We check here if the user is already on the free plan and if they have
    *reached the FEE MELODY LIMIT (5 melodies).
    * We bypass this check if savedMelody exists because users editing an existing melody 
    * and not creating a new one.
    */
    if (!isPro && !savedMelody) {
      const library = await loadLibrary();
      if (library.length >= FREE_MELODY_LIMIT) {
        Alert.alert(
          'Free Limit Reached',
          `You have reached the limit of ${FREE_MELODY_LIMIT} saved melodies on the free plan. Upgrade to Pro   
          for unlimited storage and advanced analysis.`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            {
              text: 'View Pro Plans',
              onPress: () => navigation.navigate('Pro'), // Directs the user to the Paywall screen
            },
          ]
        );
        return; // Stop the user from proceeding to the results/save screen
      }
    }

    // Extracts the note strings from each object.
    // The results screen only needs note strings, not the full object id.
    const noteStrings = notes.map((item) => item.note);

    // Check if any notes fall outside the typical range for the selected clef
    const outOfRange = validateClefRange(noteStrings, clef);
    if (outOfRange.length > 0) {
      Alert.alert(
        'Range Warning',
        `These notes may sit outside the typical ${clef} clef range: 
        ${outOfRange.join(', ')}. Continue anyway?`,
        [
          { text: 'Edit Notes', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => navigateToResults(noteStrings),
          },
        ]
      );
      return;
    }

    // If everything passes, procedd to results
    navigateToResults(noteStrings);
  };

  // Helper for clean code
   const  navigateToResults = (noteStrings) => {
    navigation.navigate('Results', {
      notes: noteStrings,
      startKey: startKey,
      clef: clef,
      octave: selectedOctave,
      savedMelodyId: savedMelody ? savedMelody.id : null,
    });
  };

  //Helper function
  //
  // isSharp returns true if the note contains a # symbol
  //Used to apply alternate styles to sharp notes in the list and button grid.
  const isSharp = (note) => note.includes('#');

  // Returns the enharmonic flat name for a sharp note
  //Ebharmonic equivalents are notes that sound identical but are named differently.
  // Example: C# returns Db , which are the same pitch. Displaying both names adds
  // educational value.
  const getEnharmonic = (noteWithOctave) => {
    const enharmonics = {
      // A plain object is used as a lookup table, accesssing a key is 0(1).
      'C#': 'D♭',
      'D#': 'E♭',
      'F#': 'G♭',
      'G#': 'A♭',
      'A#': 'B♭',
    };
    // Replace calls use regular expressions to isolate the note name and octave.
    // Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
    // [0/9]g matches any digit, the g flag means replae ALL occurrences (global)
    // Ref: https://www.geeksforgeeks.org/javascript/javascript-strip-all-non-numeric-characters-from-string/
    const noteName = noteWithOctave.replace(/[0-9]/g, ''); // remove digits 'C#'
    // [^0-9]g matches any NON-digit character
    const octave = noteWithOctave.replace(/[^0-9]/g, ''); //'keep only digits '4'
    return enharmonics[noteName] ? `${enharmonics[noteName]}${octave}` : null;
  };

 // Melody Screen UI Render
  //
  // Architecture: a single FlatList owns the entire screen scroll.
  // Everything above the notes list lives in ListHeaderComponent.
  // Everything below the notes list lives in ListFooterComponent.
  // This eliminates the FlatList-inside-ScrollView nesting that triggers
  // the VirtualizedLists warning and breaks windowing on Android.
  //
  // When notes is empty the FlatList renders no items, so the header's
  // empty state view is shown instead. The footer is always rendered.
 
  // ListHeaderComponent — header, context bar, melody box top, empty state or nothing.
  // When notes exist this renders only the box header; the list items follow.
  // When notes is empty this renders the box header + empty state placeholder.
  const renderHeader = () => (
    <View style={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Enter Melody</Text>
        <Text style={styles.subtitle}>Tap notes to build your phrase.</Text>
      </View>
 
      {/* Context bar */}
      <View style={styles.contextBar}>
        <View style={styles.contextBarRow}>
          <MaterialCommunityIcons
            name={clef === 'treble' ? 'music-clef-treble' : 'music-clef-bass'}
            size={16}
            color={colors.muted}
          />
          <Text style={styles.contextBarText}>
            {startKey?.label ?? 'No key selected'} Octave {selectedOctave}
          </Text>
        </View>
      </View>
 
      {/* Melody box — top portion with count header */}
      <View style={styles.melodyBoxTop}>
        <View style={styles.melodyListHeader}>
          <Text style={styles.sectionLabel}>YOUR MELODY</Text>
          <Text style={styles.noteCount}>{notes.length} / {MAX_NOTES} </Text>
        </View>
 
        {/* Empty state — only shown when there are no notes */}
        {notes.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="music-note" size={36} color={colors.accent} />
            <Text style={styles.emptyText}>Tap a note below to begin</Text>
          </View>
        )}
      </View>
    </View>
  );

  // ListFooterComponent — octave selector, chromatic buttons, edit controls, analyze.
  // Wrapped in the same horizontal padding as the header.
  const renderFooter = () => (
    <View style={[styles.scroll, styles.footerTop]}>
      {/* Bottom border of the melody box — closes the visual box after the list items */}
      {notes.length > 0 && <View style={styles.melodyBoxBottom} />}
 
      {/* Octave selector */}
      <View style={styles.noteSection}>
        <Text style={styles.sectionLabel}>OCTAVE</Text>
        <View style={styles.octaveRow}>
          {availableOctaves.map((oct) => (
            <TouchableOpacity
              key={oct}
              style={[styles.octaveBtn, selectedOctave === oct && styles.octaveBtnActive]}
              onPress={() => setSelectedOctave(oct)}>
              <Text style={[
                styles.octaveBtnText,
                selectedOctave === oct && styles.octaveBtnTextActive,
              ]}>
                {oct}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
 
      {/* Chromatic note buttons */}
      <View style={styles.noteSection}>
        <Text style={styles.sectionLabel}>NOTE</Text>
        <View style={styles.noteButtons}>
          {CHROMATIC.map((note) => (
            <TouchableOpacity
              key={note}
              style={[styles.noteBtn, isSharp(note) && styles.noteBtnSharp]}
              onPress={() => addNote(note)}
              activeOpacity={0.7}>
              <Text style={[styles.noteBtnText, isSharp(note) && styles.noteBtnTextSharp]}>
                {note}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
 
      {/* Edit controls — Undo and Clear */}
      <View style={styles.editRow}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={removeLastNote}
          disabled={notes.length === 0}>
          <Text style={[styles.editBtnText, notes.length === 0 && styles.disabledText]}>
            Undo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={clearAll}
          disabled={notes.length === 0}>
          <Text style={[styles.editBtnText, notes.length === 0 && styles.disabledText]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>
 
      {/* Analyze & Transpose button */}
      <TouchableOpacity
        style={[styles.analyzeBtn, notes.length < 2 && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        activeOpacity={0.85}>
        <Text style={styles.analyzeBtnText}>Analyze & Transpose</Text>
      </TouchableOpacity>
    </View>
  );
 
  // Note row renderer — identical markup to before, now rendered as a list item.
  // The melodyBox surface color and border are applied per-row via noteListRow style.
  const renderNoteItem = ({ item, index }) => (
    <View style={[
      styles.noteListRow,
      isSharp(item.note) && styles.noteListRowSharp,
    ]}>
      <View style={[styles.noteAccentBar, isSharp(item.note) && styles.noteAccentBarSharp]} />
      <Text style={styles.notePosition}>{index + 1}</Text>
      <Text style={[styles.noteListName, isSharp(item.note) && styles.noteListNameSharp]}>
        {item.note}
      </Text>
      {isSharp(item.note) && (
        <Text style={styles.noteEnharmonic}>{getEnharmonic(item.note)}</Text>
      )}
      <Text style={styles.noteTypeLabel}>
        {isSharp(item.note) ? 'Sharp / Flat' : 'Natural'}
      </Text>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteNote(item.id)}
        activeOpacity={0.7}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
 
  return (
    <SafeAreaView style={styles.container}>
      {/*
        Single FlatList owns the entire screen scroll.
        - ListHeaderComponent renders the screen top: header, context bar, melody box cap.
        - data={notes} renders the note rows directly in the list.
        - ListFooterComponent renders the controls below: octave, notes, edit, analyze.
        - keyboardShouldPersistTaps="handled" prevents the keyboard dismissing on button tap.
        - No ScrollView wrapper needed — the FlatList IS the scroll container.
      */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// 5. Result Screen
// Receives notes, startKey, clef , and octave from MelodyScreen.
// This screen now handles three responsibilities:
//   1. Melody naming  TextInput for title at the top
//   2. Mood tagging preset buttons with optional custom TextInput
//   3. Transposition  key picker dropdown and  side-by-side comparison table
//   4. Save to library

//Navigation is destructured from props alongside route because
//this screen needs route for incoming data and navigation for go back.
function ResultsScreen({ route, navigation }) {
  // Get the notes, starting key, and clef from MelodyScreen
  const { notes, startKey, clef, octave, savedMelodyId } = route.params;
 
  // isPro is needed here to enforce the free-tier save limit at the moment of save.
  // This is the second gate — it catches the delete-and-resave bypass that the
  // MelodyScreen gate alone cannot stop, because once the user is on this screen
  // the first gate has already been passed.
  const { isPro } = useSubscription();

  // Target key defaults to the starting key so the comparison table starts unchanged.
  const [targetKey, setTargetKey] = useState(startKey);
  // Picker toggle controls whether the key picker dropdown is visible
  const [pickerOpen, setPickerOpen] = useState(false);
  // titleError, error message when title is empty on submit
  const [titleError, setTitleError] = useState(false);
  // selectedMood holds the chosen preset. null means nothing selected yet.
  const [selectedMood, setSelectedMood] = useState(null);
  // customMood holds the user-typed mood, only used when selectedMood === 'Custom'
  const [customMood, setCustomMood] = useState('');
  // savedId tracks whether this melody already exists in the library.
  // null = brand new melody. A string value = loaded from library.
  const [isSaved, setIsSaved] = useState(false);

  // resolvedMood is the final mood value written to storage.
  // If Custom was picked, use the typed text. Otherwise use the preset.
  const [melodyTitle, setMelodyTitle] = useState('');
  const resolvedMood =
    selectedMood === 'Custom' ? customMood.trim() || null : selectedMood;

  //Transposition
  //
  // Calculate how many semitones to shift between keys
  //Chromatic index of returns the pitch class index (0-11) for each key's root note.
  const startKeyIndex = CHROMATIC.indexOf(startKey.value);
  const targetKeyIndex = CHROMATIC.indexOf(targetKey.value);
  // subtracting start from target gives the interval in semitones.
  //Example: C Major -> B Major: indexof('C') = 0, indexof('B') = 11 -> shift = +11
  //This value is passed to transpose note fro every note in the melody
  const semitoneShift = targetKeyIndex - startKeyIndex;

  // Build the transposed array by applying transpose note to every original note,
  // .map produces a new array of the same length. The original never mutates.
  // Transpose note[i] always corresponds to notes[i], enabling side by side display/
  const transposedNotes = notes.map((note) =>
    transposeNote(note, semitoneShift)
  );
  // isSharp helper to style sharp notes in the comparison table
  const isSharp = (note) => note.includes('#');

  // save title handler
  //
  // The free-tier limit is checked  in addition to the melody screen
  // This is the secon gate. It catches the delete and  resave bypass.
  // a free user who deletes a melody, goes back through analyze, and reaches this screen
  //will hit the gate again at the moment of save with a fresh live count from storage.
  //Editing an exosting melody always bypass the gate since it is a replace and not a new 
   //entry.
  // handleSave validates the title, builds the melody object,
  // and saves it to the library.
  // Called when the user taps the Save to Library button.
  const handleSave = async () => {
    // Title validation: trim() removes whitespace before checking empty string.
    // If empty, show inline error and stop — do not save.
    // Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim
    if (melodyTitle.trim() === '') {
      setTitleError(true);
      return;
    }
    setTitleError(false);

    try {
      /**
       * Final Verification
       * Before writing to a permanet storage. We perform on last check.
       * If the user is on the free tier, we verify they havent exceed the Free Melody Limit.
       * We exclude the saveMelodyID because updating an existing entry does not increse the library count.
       */
      if (!isPro && !savedMelodyId) {
        const currentLibrary = await loadLibrary();
        if (currentLibrary.length >= FREE_MELODY_LIMIT) {
          Alert.alert(
            'Subscription Required', `You've reached the ${FREE_MELODY_LIMIT}-melody limit on  
            the free plan. Upgrade to Pro to save more.`,
            [
              { text: 'Cancel', style: 'cancel'},
              {
                text: 'View Pro Plans',
                onPress: () => navigation.navigate('Pro'),
              },
            ]
          );
          return; // Block the save operation
        }
      }
    const now = Date.now();

    // Build the complete melody object using the agreed data model.
    // Every field is populated from the current screen state.
    // The spread operator is not needed here — this is a fresh object creation.
    const newMelody = {
      id: now.toString(), // Unique id from Unix timestamp in milliseconds
      title: melodyTitle.trim(), // User-entered title from TextInput
      notes: notes, // Original note strings array from MelodyScreen
      clef: clef, // 'treble' or 'bass' from route params
      startKey: startKey, // Full key object { label, value, type }
      octave: octave, // Starting octave integer from route params
      mood: resolvedMood, // Preset string, custom string, or null
      isFavorite: false, // Default false — toggled from LibraryScreen
      createdAt: savedMelodyId ? undefined : now, // preserved on edit
      updatedAt: now, // Same as createdAt on first save
    };

    // Load the current library, append the new melody, and save back.
    // The spread operator [...library, newMelody] creates a new array
    // instead of modifying the original.
    const library = await loadLibrary();

    let updatedLibrary;
    if (savedMelodyId) {
      //Edit, replace the matching entry and preserve original createdAT
      updatedLibrary = library.map((item) =>
        item.id === savedMelodyId
          ? { ...item, ...newMelody, createdAt: item.createdAt }
          : item
      );
    } else {
      //New melody appended
      updatedLibrary = [...library, { ...newMelody, createdAt: now }];
    }
    await saveLibrary(updatedLibrary);
    await clearNotesDraft();

    setIsSaved(true);

    // Confirm to the user that the melody was saved successfully.
    Alert.alert(
      'Saved',
      `"${newMelody.title}" has been saved to your melody library.`,
      [{ text: 'OK', onPress: () => navigation.navigate("Library") }
    ]);
  } catch (error) {
    console.error("Save failed:", error);
    Alert.alert("Error", "Could not save melody. Please try again.");
    }
  };

  //  Results Screen UI render
  return (
    <SafeAreaView style={styles.container}>
      {/* keyboardShouldPersistTaps='handled' ensures tapping buttons while
          the keyboard is open does not accidentally dismiss it. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transpose</Text>
          <Text style={styles.subtitle}>Name, tag, and save your melody.</Text>
        </View>

        {/** Context Bar*/}
        <View style={styles.contextBar}>
          <View style={styles.contextBarRow}>
            <MaterialCommunityIcons
              name={clef === 'treble' ? 'music-clef-treble' : 'music-clef-bass'}
              size={16}
              color={colors.muted}
            />
            <Text style={styles.contextBarText}>
              {/** The ternary selcts the correct icon name based on the clef param */}
              {/** with optional chaining ?, and nullish coalescing ?? guard startkey*/}
              {/**label */}
              {startKey?.label ?? 'No key selected'} Octave {octave}
            </Text>
          </View>
        </View>

        {/* Melody title textinput
            TextInput is a controlled component — value is bound to melodyTitle state.
            onChangeText updates state on every keystroke and clears the error
            immediately as the user starts typing, giving positive feedback. */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>MELODY TITLE</Text>
          <TextInput
            style={[styles.titleInput, titleError && styles.titleInputError]}
            placeholder="e.g. Morning Theme, Bridge Idea..."
            placeholderTextColor={colors.muted}
            value={melodyTitle}
            onChangeText={(text) => {
              setMelodyTitle(text);
              // Clear error as soon as the user starts typing.
              if (titleError) setTitleError(false);
            }}
            maxLength={40}
            returnKeyType="done"
          />
          {/* Inline error message — only visible when titleError is true.
              Placed directly below the input so the user sees it without
              an Alert interrupting the flow.*/}
          {titleError && (
            <Text style={styles.titleErrorText}>
              A title is required to save your melody.
            </Text>
          )}
        </View>

        {/* Mood Picker
            Mood preset buttons rendered by mapping MOOD_PRESETS array.
            Tapping a preset sets selectedMood. Tapping the active preset
            again deselects it back to null toggle behavior.
            The 'Custom' option reveals a second TextInput below.*/}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>
            MOOD <Text style={styles.modalOptional}>optional</Text>
          </Text>
          <View style={styles.moodRow}>
            {MOOD_PRESETS.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodBtn,
                  selectedMood === mood && styles.moodBtnActive,
                ]}
                onPress={() =>
                  setSelectedMood(selectedMood === mood ? null : mood)
                }
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.moodBtnText,
                    selectedMood === mood && styles.moodBtnTextActive,
                  ]}>
                  {mood}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom mood TextInput only rendered when Custom is selected.
              {condition && <Component />} renders
              nothing when condition is false. */}
          {selectedMood === 'Custom' && (
            <TextInput
              style={styles.titleInput}
              placeholder="Describe the mood..."
              placeholderTextColor={colors.muted}
              value={customMood}
              onChangeText={setCustomMood}
              maxLength={30}
              returnKeyType="done"
            />
          )}
        </View>

        {/* Key Picker Dropdown
            Tapping the trigger toggles pickerOpen with the ! (NOT) operator.
            Selecting a key sets targetKey and closes the dropdown.
            Chevron icon flips between up and down based on pickerOpen state. */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>TRANSPOSE TO</Text>
          {/* Dropdown trigger. Tapping opens and closes the dropdown */}
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setPickerOpen(!pickerOpen)}
            activeOpacity={0.8}>
            <Text style={styles.pickerBtnText}>{targetKey.label}</Text>
            <MaterialCommunityIcons
              name={pickerOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>

          {/* Dropdown list only visible when pickerOpen is true */}
          {pickerOpen && (
            <View style={styles.pickerDropdown}>
              {KEYS.map((key, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerOption,
                    targetKey.label === key.label && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setTargetKey(key);
                    setPickerOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      targetKey.label === key.label &&
                        styles.pickerOptionTextActive,
                      key.type === 'minor' && styles.pickerOptionMinor,
                    ]}>
                    {key.label}
                  </Text>
                  {/* Checkmark next to currently selected key */}
                  {targetKey.label === key.label && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Original vs Transposed comparison table */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>ORIGINAL vs TRANSPOSED</Text>

          <View style={styles.comparisonBox}>
            {/* Column headers. Displays the original note on the left and its 
            transpoded equivalent on the right. */}
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>
                Original ({startKey.value})
              </Text>
              <Text style={styles.comparisonHeaderText}>
                Transposed ({targetKey.value})
              </Text>
            </View>

            {/* Notes and transposed notes are parallel arrays of equal length, so we 
            map over notes using the index to access the corresponding transposed   
            value.*/}
            {notes.map((note, index) => (
              <View
                key={index}
                style={[
                  styles.comparisonRow,
                  // Applies an alternating row background for improved readability.
                  // Zebra stripping, a common data table UX pattern.
                  index % 2 === 0 && styles.comparisonRowAlt,
                ]}>
                <Text
                  style={[
                    styles.comparisonNote,
                    isSharp(note) && styles.comparisonNoteSharp,
                  ]}>
                  {note}
                </Text>
                <Text style={styles.comparisonArrow}>→</Text>
                <Text
                  style={[
                    styles.comparisonNote,
                    isSharp(transposedNotes[index]) &&
                      styles.comparisonNoteSharp,
                  ]}>
                  {transposedNotes[index]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Save to Library validates title and saves the full melody object.
            giving clear confirmation without requiring another Alert.
            isSaved prevents duplicate saves if the user taps again.

            Edit Melody navigates back to MelodyScreen with all previously 
            entered notes intact. 
            
            Hide the save button and replace with an action bar*/}
        {!isSaved ? (
          <TouchableOpacity
            style={styles.analyzeBtn}
            onPress={handleSave}
            activeOpacity={0.85}>
            <MaterialCommunityIcons
              name={'content-save-outline'}
              size={18}
              color={colors.buttonText}
            />
            <Text style={styles.analyzeBtnText}>{'Save to Library'}</Text>
          </TouchableOpacity>
        ) : (
          // Post give the user next steps without
          //requiring them to look for a back button
          <View style={styles.postSaveBar}>
            <Text style={styles.postSaveLabel}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={14}
                color={colors.accent}
              />
              {''}Saved successfully
            </Text>
            <View style={styles.postSaveActions}>
              <TouchableOpacity
                style={styles.postSaveBtn}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name="home-outline"
                  size={16}
                  color={ colors.muted}
                />
                <Text style={styles.postSaveBtnText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postSaveBtn}
                onPress={() => navigation.navigate('Library')}
                activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name="bookshelf"
                  size={16}
                  color={colors.muted}
                />
                <Text style={styles.postSaveBtnText}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postSaveBtn}
                onPress={() => {
                  // Start a new melody. Clear the stack above home
                  navigation.navigate('Setup');
                }}
                activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name="plus"
                  size={16}
                  color={colors.muted}
                />
                <Text
                  style={styles.postSaveBtnText}>
                  New Melody
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/** Edit melody is available to go back and adjust notes */}
        {!isSaved && (
          <TouchableOpacity
            style={styles.resultEditBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.editBtnText}>Edit Melody</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 6. Library Screen
//  Displays all saved melodies as a scrollable FlatList
// The library reloads on every screen focus so it stays accurate
// after saves, edits, and deletes on other screens.
function LibraryScreen() {
  const navigation = useNavigation();

  // library holds the full sorted array of saved melody objects.
  // Loaded from AsyncStorage on every screen focus via useFocusEffect.
  // Initialized as an empty array  populated after the first load.
  const [library, setLibrary] = useState([]);

  // showFavoritesOnly is a boolean toggle.
  // When true, only melodies with isFavorite === true are shown in the list.
  // When false, all saved melodies are shown.
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // useFocusEffect runs its callback every time this screen comes into focus.
  // This is different from useEffect([]) which only runs once on mount.
  // The library can change on MelodyScreen and we need the list to reflect those changes when
  // the user navigates back.
  useFocusEffect(
    useCallback(() => {
      const loadLibraryData = async () => {
        const data = await loadLibrary();
        // Sort the library by updatedAt in descending order so the most
        // recently edited melody always appears at the top of the list.
        // The spread operator [...data] creates a copy before sorting
        // so the original array from loadLibrary is not mutated.
        // Array.sort comparator: returning b - a sorts highest value first.
        //Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        const sorted = [...data].sort((a, b) => b.updatedAt - a.updatedAt);
        setLibrary(sorted);
      };
      loadLibraryData();
    }, [])
  );

  // filteredLibrary is computed from library state on every render.
  // It is not stored in state because it can always be derived from
  // library and showFavoritesOnly. Storing it separately would create
  // redundant state that could get out of sync.
  // Array.filter returns a new array keeping only items where the
  // predicate returns true.
  //Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
  const filteredLibrary = showFavoritesOnly
    ? library.filter((item) => item.isFavorite)
    : library;

  // toggleFavorite flips the isFavorite field on a single melody entry.
  // Array.map returns a new array — we never mutate the existing library array
  // because React needs a new reference to detect the state change.
  // The spread operator {...item} copies all existing fields and the
  // new isFavorite value overrides only that one field.
  //Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
  const toggleFavorite = (id) => {
    const updatedLibrary = library.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    setLibrary(updatedLibrary);
    saveLibrary(updatedLibrary);
  };

  // handleDelete presents a confirmation Alert before removing a melody.
  // The destructive button style renders red on iOS.
  // On confirm, Array.filter removes the matching entry and the updated
  // Ref: https://reactnative.dev/docs/alert
  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Melody',
      `Delete "${title}"? This will permamently delete melody.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedLibrary = library.filter((item) => item.id !== id);
            setLibrary(updatedLibrary);
            saveLibrary(updatedLibrary);
          },
        },
      ]
    );
  };

  // handleLoad navigates to MelodyScreen passing the full saved melody object.
  // MelodyScreen receives it via route.params.savedMelody and uses it to
  // pre-populate all state  notes, title, key, clef, octave, and mood.
  // This is what closes the save view edit loop.
  // Ref: // Ref: https://reactnavigation.org/docs/params
  const handleLoad = (melody) => {
    navigation.navigate('MelodyDetail', {
      melody: melody,
      libraryCount: library.length
    });
  };

  // Helpers
  // formatDate converts a Unix timestamp (milliseconds) to a short readable string.
  // new Date(timestamp) creates a JS Date object from the number.
  // toLocaleDateString formats it for the en-US locale:  example "Mar 13, 2026"
  // Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // renderMelodyEntry renders one melody entry in the FlatList.
  // hitSlop expands the touch target area beyond the visible icon size,
  // improving usability on small screens.
  const renderMelodyEntry = ({ item }) => (
    <TouchableOpacity
      style={styles.melodyEntry}
      onPress={() => handleLoad(item)}
      activeOpacity={0.85}>
      {/* Top Row*/}
      <View style={styles.entryTopRow}>
        {/* Title numberOfLines={1} truncates with ellipsis if too long */}
        <Text style={styles.entryTitle} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.entryActions}>
          {/* Favorite star filled when isFavorite is true, outline when false.*/}
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons
              name={item.isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={item.isFavorite ? colors.accent : colors.muted}
            />
          </TouchableOpacity>

          {/* Delete button opens the confirmation Alert */}
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.title)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.entry_DeleteBtn}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* All metadata is shown inline.
          The mood tag only renders if a mood was saved 
          {condition && <Component />} renders nothing when
          condition is falsy (null, undefined, empty string). */}
      <View style={styles.entryMetaRow}>
        <MaterialCommunityIcons
          name={
            item.clef === 'treble' ? 'music-clef-treble' : 'music-clef-bass'
          }
          size={14}
          color={colors.muted}
        />
        <Text style={styles.entryMetaText}>{item.startKey.label}</Text>
        <Text style={styles.entryMetaDot}>·</Text>
        <Text style={styles.entryMetaText}>
          {item.notes.length} {item.notes.length === 1 ? 'note' : 'notes'}
        </Text>
        {item.mood && (
          <>
            <Text style={styles.entryMetaDot}>·</Text>
            <Text style={styles.entryMoodTag}>{item.mood}</Text>
          </>
        )}
      </View>

      {/* Bottom Row: date, hint */}
      <View style={styles.entryBottomRow}>
        <Text style={styles.entryDate}>
          Edited {formatDate(item.updatedAt)}
        </Text>
        <View style={styles.entryHint}>
          <Text style={styles.entryHintText}>Tap to edit</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={colors.muted}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Library Screen UI
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Melodies</Text>
        <Text style={styles.subtitle}>Your saved melody library.</Text>
      </View>

      {/* Favorites filter */}
      {/* Only shown when at least one melody exists.
          Tapping the filter button flips showFavoritesOnly.
          The ! (NOT) operator inverts the boolean on each press.
          Style and label update reactively based on the boolean value. */}
      {library.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              showFavoritesOnly && styles.filterBtnActive,
            ]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            activeOpacity={0.8}>
            <MaterialCommunityIcons
              name={showFavoritesOnly ? 'star' : 'star-outline'}
              size={15}
              color={showFavoritesOnly ? colors.buttonText : colors.muted}
            />
            <Text
              style={[
                styles.filterBtnText,
                showFavoritesOnly && styles.filterBtnTextActive,
              ]}>
              {showFavoritesOnly ? 'Showing favorites' : 'Favorites Only '}
            </Text>
          </TouchableOpacity>
          <Text style={styles.libraryCount}>
            {filteredLibrary.length}{' '}
            {filteredLibrary.length === 1 ? 'melody' : 'melodies'}
          </Text>
        </View>
      )}

      {/* Content  empty or melody list */}
      {library.length === 0 ? (
        // No melodies saved yet
        <View style={styles.libraryEmptyState}>
          <MaterialCommunityIcons
            name="music-note-plus"
            size={52}
            color={colors.accent}
          />
          <Text style={styles.libraryEmptyTitle}>No melodies saved yet</Text>
          <Text style={styles.libraryEmptyText}>
            Tap New Melody on the home screen to create your first melody.
          </Text>
        </View>
      ) : filteredLibrary.length === 0 ? (
        // Favorites filter is active but no melodies are starred
        <View style={styles.libraryEmptyState}>
          <MaterialCommunityIcons
            name="star-outline"
            size={52}
            color={colors.muted}
          />
          <Text style={styles.libraryEmptyTitle}>No favorites yet</Text>
          <Text style={styles.libraryEmptyText}>
            Tap the star on any melody to mark it as a favorite.
          </Text>
        </View>
      ) : (
        // FlatList renders only items visible on screen — efficient for long lists.
        // keyExtractor uses each melody's unique id string as the React list key.
        // renderItem calls renderMelodyEntry for each item in filteredLibrary.
        <FlatList
          data={filteredLibrary}
          keyExtractor={(item) => item.id}
          renderItem={renderMelodyEntry}
          contentContainerStyle={styles.libraryList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// createNativeStackNavigator returns a stack object with two components;
// stackNavigator, which is the container that merges the screen stack and its state
//stack,Screen registers a single screen with a name and component reference
// Intial router name sets which screen appears first on launch.
// scrren options hides the default navigateion header globally.
//Individual screens can override this with theit own opitons prop.
const Stack = createNativeStackNavigator();

// Here is our stack router for navugating multiple screens
function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}>
      {/** splash auto-navigates to Home after 2.5 seconds */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{ headerShown: true, title: 'My Melodies' }}
      />
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{ headerShown: true, title: 'Setup' }}
      />
      <Stack.Screen
        name="EnterMelody"
        component={MelodyScreen}
        options={{ headerShown: true, title: 'Melody' }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ headerShown: true, title: 'Results' }}
      />
      <Stack.Screen
        name="Pro"
        component={ProScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MelodyDetail" 
        component={MelodyDetailScreen} 
        options={{ title: 'Melody Details' }} 
      />
    </Stack.Navigator>
  );
}

// export default marks this as the root export.
//The function Expo calls to start the app.
// Safe Are provider must wrap the entire app so safe Area View on each screen
//can read the device's inset values.
//NavigationContainer must also wrap the entire app to hold the navigation state tree.
// RootStack lives inside both, giving every screen access to safe area and navigation.
export default function App() {
  //https://app.revenuecat.com/projects/b7899cce/get-started/install-sdk
  useEffect(() => {
    // Enable verbose logging to help debug during development
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
        <RootStack />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

// The styling css for the app using our 'colors' constant for easy maintenance
// All styles use colors from theme/colors.js
const styles = StyleSheet.create({
  // Shared between screens
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 1, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Splash Screen
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
  //Logo image inside the logoCircle
  logoImage:{
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

  // Home Screen
  homeHeader: { paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
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
  homeContent: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
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
  homeFooterText: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  // Upgrade banner on Home Screen
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
  countBoxTextWarn: { color: colors.error },

  // Pro upgrade footer Home Screen
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
  proFooterBtnText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  scrollContent: { paddingTop: 12, paddingBottom: 24 },

  // Setup Screen
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4 },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  setupSection: { marginBottom: 24 },
  setupHint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 14,
    lineHeight: 18,
  },
  keyRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  keyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 52,
  },
  keyBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  keyBtnSharp: { borderColor: colors.accentSharp },
  keyBtnSharpActive: {
    backgroundColor: colors.accentSharp,
    borderColor: colors.accentSharp,
  },
  keyBtnNote: { fontSize: 15, fontWeight: '800', color: colors.text },
  keyBtnNoteActive: { color: colors.buttonText },
  keyBtnType: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  keyBtnTypeActive: { color: colors.buttonText },
  selectedDisplay: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedDisplayText: { fontSize: 13, color: colors.muted },
  selectedDisplayValue: { color: colors.accent, fontWeight: '700' },
  clefRow: { flexDirection: 'row', gap: 12 },
  clefBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  clefBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
  },
  //clefSymbol: { fontSize: 36, color: colors.muted, marginBottom: 8, },
  clefLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  clefLabelActive: { color: colors.text },
  clefRange: { fontSize: 10, color: colors.muted, letterSpacing: 0.5 },
  octaveHint: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 3,
    letterSpacing: 0.5,
  },

  // Melody Screen
  contextBar: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  contextBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextBarText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  melodyBoxTop: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 0,
    overflow: 'hidden',
  },
  melodyBoxBottom: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    height: 8,
    marginBottom: 12,
  },
  footerTop: {
    paddingTop: 0,
  },
  melodyListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  noteCount: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  noteListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  noteListRowSharp: { backgroundColor: '#0F2035' },
  noteAccentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    marginRight: 14,
    borderRadius: 2,
  },
  noteAccentBarSharp: { backgroundColor: colors.accentSharp },
  notePosition: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    width: 22,
    letterSpacing: 0.5,
  },
  noteListName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginRight: 6,
  },
  noteListNameSharp: { color: colors.accentSharp },
  noteEnharmonic: {
    fontSize: 13,
    color: colors.accentSharp,
    fontWeight: '500',
    marginRight: 8,
  },
  noteTypeLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.5,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.errorSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 11, color: colors.error, fontWeight: '700' },
  noteSection: { marginBottom: 12 },
  octaveRow: { flexDirection: 'row', gap: 10 },
  octaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  octaveBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  octaveBtnText: { color: colors.muted, fontWeight: '600', fontSize: 16 },
  octaveBtnTextActive: { color: colors.buttonText },
  noteButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteBtn: {
    width: '23%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  noteBtnSharp: {
    backgroundColor: colors.accentSharp,
    borderColor: colors.accentSharp,
  },
  noteBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  noteBtnTextSharp: {
    color: colors.textSecondary,
  },
  editRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  editBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  disabledText: { opacity: 0.3 },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  analyzeBtnDisabled: { backgroundColor: colors.surface, shadowOpacity: 0 },
  analyzeBtnText: {
    color: colors.buttonText,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  savedBtn: {
    backgroundColor: colors.accentDark,
    shadowOpacity: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  //Results Screen
  analysisSection: {
    marginBottom: 16,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pickerBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  pickerDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerOptionActive: { backgroundColor: colors.accentSubtle },
  pickerOptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pickerOptionTextActive: { color: colors.accent, fontWeight: '700' },
  pickerOptionMinor: { fontStyle: 'italic' },
  comparisonBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  comparisonHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  comparisonRowAlt: { backgroundColor: colors.rowAlt },
  comparisonNote: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    width: 60,
    textAlign: 'center',
  },
  comparisonNoteSharp: { color: colors.accentSharp },
  comparisonArrow: { fontSize: 14, color: colors.muted },
  modalOptional: {
    color: colors.muted,
    fontWeight: '400',
    letterSpacing: 0,
    fontSize: 11,
  },
  titleInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  titleInputError: {
    borderColor: colors.error,
  },
  titleErrorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 16,
    marginTop: 2,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  moodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  moodBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  moodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  moodBtnTextActive: {
    color: colors.buttonText,
  },
  resultEditBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  // Post-save action bar — replaces the Save button after a successful save
  postSaveBar: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: 12,
  },
  postSaveLabel: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  postSaveActions: {
    flexDirection: 'row',
    gap: 10,
  },
  postSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  postSaveBtnPrimary: {
    backgroundColor: colors.background, 
    borderColor: colors.accent,
  },
  postSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  postSaveBtnPrimaryText: colors.text,

  // Library Screen
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  // filterBtn is the favorites toggle
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  filterBtnTextActive: {
    color: colors.buttonText,
  },
  libraryCount: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },

  // libraryList is passed to FlatList's contentContainerStyle.
  libraryList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  melodyEntry: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },

  // entryTopRow holds the title, star, and delete button on one line.
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginRight: 12,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entry_DeleteBtn: {
    padding: 2,
  },

  // entryMetaRow displays key metadata inline with dot separators.
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  entryMetaText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  entryMetaDot: {
    fontSize: 12,
    color: colors.line,
  },
  entryMoodTag: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  entryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  entryDate: {
    fontSize: 11,
    color: colors.muted,
  },
  entryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  entryHintText: {
    fontSize: 11,
    color: colors.muted,
  },

  // Library Empty States
  libraryEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  libraryEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  libraryEmptyText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
});
