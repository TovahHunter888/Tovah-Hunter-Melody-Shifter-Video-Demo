// screens/ResultsScreen.js
// MelodyShifter — Results Screen
//
/* Receives notes, startKey, clef , and octave from MelodyScreen.
*  This screen now handles three responsibilities:
*  1. Melody naming  TextInput for title at the top
*  2. Mood tagging preset buttons with optional custom TextInput
* 3. Transposition  key picker dropdown and  side-by-side comparison table
*  4. Save to library
*
* Two free-tier gates are enforced:
* Gate 1: EnterMelodyScreen blocks navigation here at the limit.
* Gate 2: handleSave re-checks at the moment of save to catch any bypass.
*/
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import colors from '../constants/colors';
import { CHROMATIC, KEYS, MOOD_PRESETS } from '../constants/musicConstants';
import { clearNotesDraft, loadLibrary, saveLibrary, transposeNote } from '../utils/storage';
import { FREE_MELODY_LIMIT, useSubscription } from '../hooks/useSubscription';

//Navigation is destructured from props alongside route because
//this screen needs route for incoming data and navigation for go back.
export default function ResultsScreen({ route, navigation }) {
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
  // If Custom was picked, use the typed text. Otherwise use the preset.
  const [melodyTitle, setMelodyTitle] = useState('');
  // titleError, error message when title is empty on submit
  const [titleError, setTitleError] = useState(false);
  // selectedMood holds the chosen preset. null means nothing selected yet.
  const [selectedMood, setSelectedMood] = useState(null);
  // customMood holds the user-typed mood, only used when selectedMood === 'Custom'
  const [customMood, setCustomMood] = useState('');
  // savedId tracks whether this melody already exists in the library.
  // null = brand new melody. A string value = loaded from library.
  const [isSaved, setIsSaved] = useState(false);
  
  

  //Transposition math
  //
  // Calculate how many semitones to shift between keys
  //Chromatic index of returns the pitch class index (0-11) for each key's root note.
  const startKeyIndex = CHROMATIC.indexOf(startKey.value);
  const targetKeyIndex = CHROMATIC.indexOf(targetKey.value);
  // subtracting start from target gives the interval in semitones.
  //Example: C Major -> B Major: indexof('C') = 0, indexof('B') = 11 -> shift = +11
  //This value is passed to transpose note fro every note in the melody
  const semitoneShift = targetKeyIndex - startKeyIndex;
  //
  // Build the transposed array by applying transpose note to every original note,
  // .map produces a new array of the same length. The original never mutates.
  // Transpose note[i] always corresponds to notes[i], enabling side by side display/
  const transposedNotes = notes.map((note) =>
    transposeNote(note, semitoneShift)
  );

  // resolvedMood is the final mood value written to storage.
  const resolvedMood =
    selectedMood === 'Custom' ? customMood.trim() || null : selectedMood;

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
       * Gate 2. Recheck free-tier limit at save time. Only for new melodies.
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: 20, paddingBottom: 40 },
  header:    { paddingTop: 16, paddingBottom: 1, alignItems: 'center' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4 },
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
  contextBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextBarText: { fontSize: 12, color: colors.muted, fontWeight: '600', letterSpacing: 1 },
  noteSection:    { marginBottom: 12 },
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
  titleInputError: { borderColor: colors.error },
  titleErrorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 16,
    marginTop: 2,
  },
  modalOptional: { color: colors.muted, fontWeight: '400', letterSpacing: 0, fontSize: 11 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  moodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  moodBtnActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  moodBtnText:       { fontSize: 13, fontWeight: '600', color: colors.muted },
  moodBtnTextActive: { color: colors.buttonText },
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
  pickerOptionActive:     { backgroundColor: colors.accentSubtle },
  pickerOptionText:       { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  pickerOptionTextActive: { color: colors.accent, fontWeight: '700' },
  pickerOptionMinor:      { fontStyle: 'italic' },
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
  comparisonRowAlt:    { backgroundColor: colors.rowAlt },
  comparisonNote:      { fontSize: 18, fontWeight: '800', color: colors.text, width: 60, textAlign: 'center' },
  comparisonNoteSharp: { color: colors.accentSharp },
  comparisonArrow:     { fontSize: 14, color: colors.muted },
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
  analyzeBtnText: { color: colors.buttonText, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
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
  postSaveActions: { flexDirection: 'row', gap: 10 },
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
  postSaveBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  resultEditBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  editBtnText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
});
