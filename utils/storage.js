// utils/storage.js
// MelodyShifter — AsyncStorage helpers and pure transposition functions.
//
// All screens import from here so there is one source of truth for
// storage keys, draft helpers, library helpers, and pitch math.
//
//AsyncStorage is a key storage value store for persisting data on the device between
//app launches. It is asynchronous meaning it doeas not block the UI while reading and //
//writing. We use async-await syntax to handle its non blocking operations.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHROMATIC } from '../constants/musicConstants';

// Storage Keys
//
// Saves the current working melody notes to device storage while the user
// is still building it on the MelodyScreen. This is separate from saveLibrary,
// which saves a completed, named melody to the permanent library.
// This acts as a draft if the app is closed mid-entry, the notes
// are not lost. Uses the same stringify pattern as saveLibrary.
export const DRAFT_KEY = 'melody_draft';
// Library Key stores the full array of saved, named , and named melodies.
export const LIBRARY_KEY = 'melodyshift_library';

// Draft helpers async- Asyncstorage
//
//save notes draft wwrites the users currrent notes,
//Called on every add, remove, and clear so the draft is always current
export const saveNotesDraft = async (notes = []) => {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
};
//
// Load notes draft reads the draft from storage and returns its array
// Returns an empty array if nothing has been saved yet.
export const loadNotesDraft = async () => {
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
export const clearNotesDraft = async () => {
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
export const loadLibrary = async () => {
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
export const saveLibrary = async (updatedLibrary) => {
  try {
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error('Error saving melody library', error);
  }
};

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
export const getSemitones = (noteString = '') => {
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
export const validateClefRange = (notes = [], clef = '') => {
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
export const transposeNote = (noteString = '', semitoneShift = 0) => {
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