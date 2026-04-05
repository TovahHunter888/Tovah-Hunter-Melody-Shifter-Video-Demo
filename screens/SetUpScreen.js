// screens/SetupScreen.js
// MelodyShifter — Setup Screen
//
// The user selects a starting key, clef type, and default octave before
// entering their melody. All three values are passed to EnterMelodyScreen
// as route params.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import {
  BASS_OCTAVES,
  CLEFS,
  KEYS,
  TREBLE_OCTAVES,
} from '../constants/musicConstants';

export default function SetupScreen() {
  const navigation = useNavigation();

  // Initialize selectedKey to the first item in the KEYS array (C Major).
  const [selectedKey,   setSelectedKey]   = useState(KEYS[0]);
  const [selectedClef,  setSelectedClef]  = useState('treble');
  const [selectedOctave, setSelectedOctave] = useState(4);

  // availableOctaves is derived from selectedClef, not stored in separate state.
  // Deriving it avoids redundant state that could get out of sync.
  const availableOctaves =
    selectedClef === 'treble' ? TREBLE_OCTAVES : BASS_OCTAVES;

  // isSharp returns true if the key value contains a # symbol.
  const isSharp = (keyValue) => keyValue.includes('#');

  // handleClefChange updates the clef and resets the octave to a safe default.
  // This prevents a treble octave from carrying over into the bass range.
  const handleClefChange = (clefId) => {
    setSelectedClef(clefId);
    setSelectedOctave(clefId === 'treble' ? 4 : 3);
  };

  // handleContinue packages the three setup choices and navigates to
  // EnterMelody, passing them as route params.
  const handleContinue = () => {
    navigation.navigate('EnterMelody', {
      startKey: selectedKey,
      clef: selectedClef,
      octave: selectedOctave,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Melody</Text>
          <Text style={styles.subtitle}>
            {'\n'}Configure your melody before you begin
          </Text>
        </View>

        {/* Section 1 — Starting Key */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>{'\n'}STARTING KEY</Text>
          <Text style={styles.setupHint}>
            Select the key your melody is written in
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.keyRow}>
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

          {/* Currently selected key display */}
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

        {/* Section 2 — Clef Type */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>STAFF TYPE</Text>
          <Text style={styles.setupHint}>
            Treble clef for higher voices, bass clef for lower
          </Text>
          <View style={styles.clefRow}>
            {CLEFS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.clefBtn,
                  selectedClef === c.id && styles.clefBtnActive,
                ]}
                onPress={() => handleClefChange(c.id)}>
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
                <Text style={styles.clefRange}>{c.range}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 3 — Octave Range */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 1, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
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
  keyBtnActive:      { backgroundColor: colors.accent, borderColor: colors.accent },
  keyBtnSharp:       { borderColor: colors.accentSharp },
  keyBtnSharpActive: { backgroundColor: colors.accentSharp, borderColor: colors.accentSharp },
  keyBtnNote:        { fontSize: 15, fontWeight: '800', color: colors.text },
  keyBtnNoteActive:  { color: colors.buttonText },
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
  selectedDisplayText:  { fontSize: 13, color: colors.muted },
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
  clefLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  clefLabelActive: { color: colors.text },
  clefRange:       { fontSize: 10, color: colors.muted, letterSpacing: 0.5 },
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
  octaveBtnActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  octaveBtnText:       { color: colors.muted, fontWeight: '600', fontSize: 16 },
  octaveBtnTextActive: { color: colors.buttonText },
  octaveHint: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 3,
    letterSpacing: 0.5,
  },
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
  analyzeBtnText: {
    color: colors.buttonText,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});