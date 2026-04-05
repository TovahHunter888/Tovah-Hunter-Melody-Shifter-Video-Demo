// constants/musicConstants.js
// MelodyShift — Shared music theory constants and app-wide config values.
//
// All screens import from here instead of re-declaring locally.
// Changing a value here updates every screen that uses it automatically.
//
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
export const CHROMATIC = [
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
export const TREBLE_OCTAVES = [4, 5, 6];
// Octave options shown when bass clef is selected
// Bass clef spans E2 through E5, covering lower-range instruments and voices.
export const BASS_OCTAVES = [2, 3, 4];
// Melody length limit. Keeping the list short makes analysis
// readable on a mobile phone.
export const MAX_NOTES = 16;

// An array of 24 key objects. All 12 chromatic roots in major and minor.
// Each object carries three related values. A display label, the root note value,
// and the scale type. Using objects instead of plain strings keeps related
// data grouped together cleanly.
export const KEYS = [
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
export const CLEFS = [
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
export const MOOD_PRESETS = ['Calm', 'Energetic', 'Uplifting', 'Dramatic', 'Custom'];