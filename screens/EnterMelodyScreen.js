// screens/EnterMelodyScreen.js
// MelodyShifter — Enter Melody Screen
//
// The main note-input screen. The user taps chromatic note buttons to build
// a melody sequence up to MAX_NOTES long.
//
// Architecture: a single FlatList owns the entire screen scroll.
// ListHeaderComponent renders the header, context bar, and melody box top.
// The FlatList data renders the note rows directly.
// ListFooterComponent renders the octave selector, note grid, and controls.
// This avoids the VirtualizedLists-inside-ScrollView warning on Android.
//
// Receives startKey, clef, octave, and optional savedMelody from route.params.
// savedMelody is present when the user taps "Edit" from MelodyDetailScreen.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import colors from '../constants/colors';
import {
  BASS_OCTAVES,
  CHROMATIC,
  MAX_NOTES,
  TREBLE_OCTAVES,
} from '../constants/musicConstants';
import {
  loadLibrary,
  loadNotesDraft,
  saveNotesDraft,
  validateClefRange,
} from '../utils/storage';
import { FREE_MELODY_LIMIT, useSubscription } from '../hooks/useSubscription';

export default function EnterMelodyScreen({ route }) {
  const navigation = useNavigation();
  const { isPro } = useSubscription();
  const { startKey, clef, octave, savedMelody } = route.params;

  const [selectedOctave, setSelectedOctave] = useState(octave);
  // notes is an array of objects: [{ id: '123', note: 'C4' }, ...]
  const [notes, setNotes] = useState([]);

  const availableOctaves = clef === 'treble' ? TREBLE_OCTAVES : BASS_OCTAVES;

  // On mount: restore saved melody notes for editing, or load the autosaved draft.
  useEffect(() => {
    const initNotes = async () => {
      if (savedMelody && savedMelody.notes && savedMelody.notes.length > 0) {
        // Convert stored plain strings back into note objects with unique ids.
        const restoredNotes = savedMelody.notes.map((noteString, i) => ({
          id: `restored-${i}-${Date.now()}`,
          note: noteString,
        }));
        setNotes(restoredNotes);
        if (savedMelody.octave) {
          setSelectedOctave(savedMelody.octave);
        }
      } else {
        // No saved melody — try to restore an autosaved draft.
        const draft = await loadNotesDraft();
        if (draft.length > 0) {
          setNotes(draft);
        }
      }
    };
    initNotes();
  }, [savedMelody]);

  // Note CRUD 

  const addNote = (noteName) => {
    if (notes.length >= MAX_NOTES) {
      Alert.alert('Melody Full', 'Max 16 notes. Remove a note to continue.');
      return;
    }
    const updatedNotes = [
      ...notes,
      { id: Date.now().toString(), note: `${noteName}${selectedOctave}` },
    ];
    setNotes(updatedNotes);
    saveNotesDraft(updatedNotes);
  };

  const removeLastNote = () => {
    const updatedNotes = notes.slice(0, -1);
    setNotes(updatedNotes);
    saveNotesDraft(updatedNotes);
  };

  const deleteNote = (id) => {
    const updatedNotes = notes.filter((item) => item.id !== id);
    setNotes(updatedNotes);
    saveNotesDraft(updatedNotes);
  };

  const clearAll = () => {
    Alert.alert('Clear Melody', 'Remove all notes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setNotes([]);
          saveNotesDraft([]);
        },
      },
    ]);
  };

  // Validation & Navigation 

  const handleAnalyze = async () => {
    if (notes.length < 2) {
      Alert.alert('Too short', 'Enter at least two notes to analyze.');
      return;
    }

    // Free-tier gate — only checked for new melodies, not edits.
    if (!isPro && !savedMelody) {
      const library = await loadLibrary();
      if (library.length >= FREE_MELODY_LIMIT) {
        Alert.alert(
          'Free Limit Reached',
          `You have reached the limit of ${FREE_MELODY_LIMIT} saved melodies on the free plan. Upgrade to Pro for unlimited storage and advanced analysis.`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            {
              text: 'View Pro Plans',
              onPress: () => navigation.navigate('Pro'),
            },          
          ]
        );
        return;
      }
    }

    const noteStrings = notes.map((item) => item.note);
    const outOfRange  = validateClefRange(noteStrings, clef);

    if (outOfRange.length > 0) {
      Alert.alert(
        'Range Warning',
        `These notes may sit outside the typical ${clef} clef range: ${outOfRange.join(', ')}. Continue anyway?`,
        [
          { text: 'Edit Notes', style: 'cancel' },
          { text: 'Continue', onPress: () => navigateToResults(noteStrings) },
        ]
      );
      return;
    }

    navigateToResults(noteStrings);
  };

  const navigateToResults = (noteStrings) => {
    navigation.navigate('Results', {
      notes: noteStrings,
      startKey,
      clef,
      octave: selectedOctave,
      savedMelodyId: savedMelody ? savedMelody.id : null,
    });
  };

  // Helpers 

  const isSharp = (note) => note.includes('#');

  const getEnharmonic = (noteWithOctave) => {
    const enharmonics = {
      'C#': 'D♭',
      'D#': 'E♭',
      'F#': 'G♭',
      'G#': 'A♭',
      'A#': 'B♭',
    };
    const noteName = noteWithOctave.replace(/[0-9]/g, '');
    const oct      = noteWithOctave.replace(/[^0-9]/g, '');
    return enharmonics[noteName] ? `${enharmonics[noteName]}${oct}` : null;
  };

  // Sub-renderers 

  const renderHeader = () => (
    <View style={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.title}>Enter Melody</Text>
        <Text style={styles.subtitle}>Tap notes to build your phrase.</Text>
      </View>

      <View style={styles.contextBar}>
        <View style={styles.contextBarRow}>
          <MaterialCommunityIcons
            name={clef === 'treble' ? 'music-clef-treble' : 'music-clef-bass'}
            size={16}
            color={colors.muted}
          />
          <Text style={styles.contextBarText}>
            {startKey?.label ?? 'No key selected'} · Octave {selectedOctave}
          </Text>
        </View>
      </View>

      <View style={styles.melodyBoxTop}>
        <View style={styles.melodyListHeader}>
          <Text style={styles.sectionLabel}>YOUR MELODY</Text>
          <Text style={styles.noteCount}>{notes.length} / {MAX_NOTES}</Text>
        </View>
        {notes.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="music-note" size={36} color={colors.accent} />
            <Text style={styles.emptyText}>Tap a note below to begin</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={[styles.scroll, styles.footerTop]}>
      {notes.length > 0 && <View style={styles.melodyBoxBottom} />}

      {/* Octave selector */}
      <View style={styles.noteSection}>
        <Text style={styles.sectionLabel}>OCTAVE</Text>
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

      {/* Edit controls */}
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

      {/* Analyze & Transpose */}
      <TouchableOpacity
        style={[styles.analyzeBtn, notes.length < 2 && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        activeOpacity={0.85}>
        <Text style={styles.analyzeBtnText}>Analyze & Transpose</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoteItem = ({ item, index }) => (
    <View style={[
      styles.noteListRow,
      isSharp(item.note) && styles.noteListRowSharp,
    ]}>
      <View style={[
        styles.noteAccentBar,
        isSharp(item.note) && styles.noteAccentBarSharp,
      ]} />
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

  // Render 

  return (
    <SafeAreaView style={styles.container}>
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

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  scroll:      { paddingHorizontal: 20, paddingBottom: 40 },
  footerTop:   { paddingTop: 0 },
  header:      { paddingTop: 16, paddingBottom: 1, alignItems: 'center' },
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
  noteCount:  { fontSize: 12, color: colors.muted, fontWeight: '600', letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  emptyText:  { fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  noteListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  noteListRowSharp:     { backgroundColor: '#0F2035' },
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
  deleteBtnText:  { fontSize: 11, color: colors.error, fontWeight: '700' },
  noteSection:    { marginBottom: 12 },
  octaveRow:      { flexDirection: 'row', gap: 10 },
  octaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  octaveBtnActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  octaveBtnText:       { color: colors.muted, fontWeight: '600', fontSize: 16 },
  octaveBtnTextActive: { color: colors.buttonText },
  noteButtons:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  noteBtnSharp:      { backgroundColor: colors.accentSharp, borderColor: colors.accentSharp },
  noteBtnText:       { color: colors.text, fontWeight: '600', fontSize: 15 },
  noteBtnTextSharp:  { color: colors.textSecondary },
  editRow:        { flexDirection: 'row', gap: 12, marginBottom: 24 },
  editBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText:   { color: colors.muted, fontWeight: '600', fontSize: 14 },
  disabledText:  { opacity: 0.3 },
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
});