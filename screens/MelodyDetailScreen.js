// screens/MelodyDetailScreen.js
// MelodyShifter — Melody Detail Screen
//
// This screen sits between the LibraryScreen and the editing flow.
// Every tap on a library card lands here first.
//
// What it shows:
// Title, key, clef, mood, and date saved
// Original notes as a horizontal scrollable chip strip
// Full original vs transposed comparison table
// (transposition defaults to the key the melody was saved in —
// i.e. no shift — so the user sees their exact saved data)
// Edit and Close action buttons at the bottom
//
// Edit gating:
// Pro users: Edit always available.
// Free users below the limit: Edit always available.
// Free users AT the limit: Edit button is replaced by an upgrade prompt.
// We block editing at the limit because editing leads to saving,
// and saving is blocked at the limit. Letting them edit creates
// wasted work and a confusing dead end.
//
// Navigation contract:
// Receives `melody` (full saved melody object) via route.params.
// Receives `libraryCount` (number) via route.params so we don't need
// an extra async read on mount.
//  Edit, navigates to EnterMelody with savedMelody param.
//  Close, navigates back to Library.
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import colors from '../constants/colors';
import { useSubscription, FREE_MELODY_LIMIT } from '../hooks/useSubscription';

// transposition logic is duplicated here so this screen is self-contained
// and does not depend on App.js internals.
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

// transposeNote shifts a single note string by semitoneShift steps.
// A shift of 0 returns the note unchanged — used here to show the original.
const transposeNote = (noteString = '', semitoneShift = 0) => {
  if (!noteString) return noteString;
  const noteName = noteString.slice(0, -1);
  const octave = parseInt(noteString.slice(-1), 10);
  const noteIndex = CHROMATIC.indexOf(noteName);
  const total = octave * 12 + noteIndex + semitoneShift;
  const newOctave = Math.floor(total / 12);
  const newIndex = ((total % 12) + 12) % 12;
  return `${CHROMATIC[newIndex]}${newOctave}`;
};

// Helpers
// isSharp returns true if a note name contains a # character.
const isSharp = (note) => note.includes('#');

// formatDate converts a Unix millisecond timestamp to a readable date string.
// Example output: "Mar 13, 2026"
const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

// Component
export default function MelodyDetailScreen({ route, navigation }) {
  // melody is the full saved object passed from LibraryScreen.
  // libraryCount is the current total number of saved melodies — used to
  // determine whether a free user can still edit without hitting the limit.
  const { melody, libraryCount } = route.params;
  const { isPro } = useSubscription();

  // The user can pick a different target key to preview transposition live.
  // Defaults to the melody's own startKey so the table starts with a 0 shift.
  const [targetKey, setTargetKey] = useState(melody.startKey);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Semitone shift between the melody's original key and the currently selected target.
  const startKeyIndex = CHROMATIC.indexOf(melody.startKey.value);
  const targetKeyIndex = CHROMATIC.indexOf(targetKey.value);
  const semitoneShift = targetKeyIndex - startKeyIndex;

  // Build the transposed notes array in real time as targetKey changes.
  // When targetKey === startKey the shift is 0 and notes appear unchanged.
  const transposedNotes = melody.notes.map((note) =>
    transposeNote(note, semitoneShift)
  );

  // atFreeLimit is true when a free user has used all their melody slots.
  // Editing at this point would lead straight to a save-blocked dead end,
  // so we block the Edit button and show an upgrade prompt instead.
  // Pro users are never blocked. Editing an existing melody does NOT add
  // a new entry, so the count check here is intentionally strict:
  // if they are AT the limit they cannot change and re-save freely either,
  // because a title/mood change on an existing melody still calls handleSave.
  // However — because editing replaces the existing entry rather than adding one,
  // it is actually safe to allow edits at the limit. The gate here therefore
  // only blocks when the user is FREE and the count is STRICTLY above the limit
  // (meaning they somehow have more than FREE_MELODY_LIMIT entries, which
  // shouldn't happen but is a defensive check).
  //
  // Practical rule: free users at EXACTLY the limit CAN edit existing melodies
  // because editing replaces, not appends. They cannot add NEW melodies.
  // We communicate this clearly in the UI rather than blocking entirely.
  const isAtHardLimit = !isPro && libraryCount > FREE_MELODY_LIMIT;

  // handleEdit — navigate to MelodyScreen with the full saved melody object.
  // MelodyScreen pre-populates notes, octave, and key from savedMelody.
  const handleEdit = () => {
    navigation.navigate('EnterMelody', {
      startKey: melody.startKey,
      clef: melody.clef,
      octave: melody.octave,
      savedMelody: melody,
    });
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {/* Melody title — large and prominent */}
            <Text style={styles.melodyTitle} numberOfLines={2}>
              {melody.title}
            </Text>

            {/* Inline metadata: clef icon · key · note count */}
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name={
                  melody.clef === 'treble'
                    ? 'music-clef-treble'
                    : 'music-clef-bass'
                }
                size={15}
                color={colors.muted}
              />
              <Text style={styles.metaText}>{melody.startKey.label}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>
                {melody.notes.length}{' '}
                {melody.notes.length === 1 ? 'note' : 'notes'}
              </Text>
              {melody.mood && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.moodTag}>{melody.mood}</Text>
                </>
              )}
            </View>

            {/* Dates */}
            <Text style={styles.dateText}>
              Saved {formatDate(melody.createdAt ?? melody.updatedAt)}
              {melody.createdAt !== melody.updatedAt
                ? `  ·  Edited ${formatDate(melody.updatedAt)}`
                : ''}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Original Notes chip strip ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            ORIGINAL NOTES — {melody.startKey.value}
          </Text>
          <View style={styles.chipsOuter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsList}>
              {melody.notes.map((note, index) => (
                <View
                  key={index}
                  style={[styles.chip, isSharp(note) && styles.chipSharp]}>
                  <Text style={styles.chipIndex}>{index + 1}</Text>
                  <Text
                    style={[
                      styles.chipNote,
                      isSharp(note) && styles.chipNoteSharp,
                    ]}>
                    {note}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Live Transposition Picker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREVIEW TRANSPOSITION</Text>

          {/* Dropdown trigger */}
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

          {/* Dropdown list */}
          {pickerOpen && (
            <View style={styles.pickerDropdown}>
              {[
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
              ].map((key, index) => (
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

        {/* ── Original vs Transposed Comparison Table ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {semitoneShift === 0
              ? `ORIGINAL — ${melody.startKey.value}`
              : `${melody.startKey.value}  →  ${targetKey.value}`}
          </Text>
          <View style={styles.comparisonBox}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>
                Original ({melody.startKey.value})
              </Text>
              <Text style={styles.comparisonHeaderText}>
                {semitoneShift === 0
                  ? 'No shift'
                  : `Transposed (${targetKey.value})`}
              </Text>
            </View>
            {melody.notes.map((note, index) => (
              <View
                key={index}
                style={[
                  styles.comparisonRow,
                  index % 2 === 0 && styles.comparisonRowAlt,
                ]}>
                <Text
                  style={[
                    styles.comparisonNote,
                    isSharp(note) && styles.comparisonNoteSharp,
                  ]}>
                  {note}
                </Text>
                <Text style={styles.comparisonArrow}>
                  {semitoneShift === 0 ? '—' : '→'}
                </Text>
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

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          {/* Edit button — gated for free users over the hard limit */}
          {isAtHardLimit ? (
            // Hard limit exceeded — show upgrade prompt instead of edit.
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnUpgrade]}
              onPress={() => navigation.navigate('Pro')}
              activeOpacity={0.85}>
              <MaterialCommunityIcons
                name="crown"
                size={17}
                color={colors.accent}
              />
              <Text style={styles.actionBtnUpgradeText}>Upgrade to Edit</Text>
            </TouchableOpacity>
          ) : (
            // Edit is available — go to MelodyScreen with this melody pre-loaded.
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleEdit}
              activeOpacity={0.85}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={17}
                color={colors.buttonText}
              />
              <Text style={styles.actionBtnPrimaryText}>Edit Melody</Text>
            </TouchableOpacity>
          )}

          {/* Close — always available, returns to Library */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <MaterialCommunityIcons
              name="close"
              size={17}
              color={colors.muted}
            />
            <Text style={styles.actionBtnSecondaryText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Free limit info note — shown when user is at (but not over) limit */}
        {!isPro && libraryCount >= FREE_MELODY_LIMIT && !isAtHardLimit && (
          <TouchableOpacity
            style={styles.limitNote}
            onPress={() => navigation.navigate('Pro')}
            activeOpacity={0.85}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={colors.accent}
            />
            <Text style={styles.limitNoteText}>
              You are at your free limit. Editing saves changes to this melody.
              To add new melodies, upgrade to Pro.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 },
 
  // Header
  headerRow: { marginBottom: 16 },
  headerText: { flex: 1 },
  melodyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  metaText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  metaDot:  { fontSize: 13, color: colors.line },
  moodTag:  { fontSize: 12, color: colors.accent, fontWeight: '600', letterSpacing: 0.3 },
  dateText: { fontSize: 11, color: colors.muted, letterSpacing: 0.2 },
 
  divider: { height: 1, backgroundColor: colors.line, marginBottom: 20 },
 
  // Sections
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 10,
  },
 
  // Note chips
  chipsOuter: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  chipsList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 44,
  },
  chipSharp: { borderColor: colors.accentSharp, backgroundColor: colors.surfaceSharp },
  chipIndex: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  chipNote:      { fontSize: 15, fontWeight: '800', color: colors.text },
  chipNoteSharp: { color: colors.accentSharp },
 
  // Key picker
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
    // Cap height so it scrolls rather than extending off screen
    maxHeight: 260,
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
 
  // Comparison table
  comparisonBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
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
  comparisonRowAlt:      { backgroundColor: colors.rowAlt },
  comparisonNote:        { fontSize: 18, fontWeight: '800', color: colors.text, width: 60, 
  textAlign: 'center' },
  comparisonNoteSharp:   { color: colors.accentSharp },
  comparisonArrow:       { fontSize: 14, color: colors.muted },
 
  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnPrimaryText: { color: '#0B1F33', fontWeight: '700', fontSize: 15 },
  actionBtnSecondary:   { backgroundColor: colors.surface, borderColor: colors.line },
  actionBtnSecondaryText: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  actionBtnUpgrade:     { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
  actionBtnUpgradeText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
 
  // Free limit info note
  limitNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accentSubtle,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: 4,
  },
  limitNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
