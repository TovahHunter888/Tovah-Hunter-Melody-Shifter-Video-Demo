// screens/LibraryScreen.js
// MelodyShifter — Library Screen
//
// Displays all saved melodies as a scrollable FlatList.
// Reloads on every screen focus so the list stays accurate after saves,
// edits, and deletes on other screens.
// Supports favorites-only filtering and individual delete with confirmation.
//
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
//useCallback memorizes the load count function so useFocusEffect does not create a new
//function reference on every render, which would cause an infinite re-run loop.
// Ref: https://react.dev/reference/react/useCallback
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
// React Native provides platform specific UI primitives tha map to native views.
// Importing the basic visual components for the UI
// FlatList for rendering the melody list
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import { loadLibrary, saveLibrary } from '../utils/storage';

// Helpers
// formatDate converts a Unix timestamp (milliseconds) to a short readable string.
// new Date(timestamp) creates a JS Date object from the number.
// toLocaleDateString formats it for the en-US locale:  example "Mar 13, 2026"
// Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
const formatDate = (timestamp) => 
  new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

// 6. Library Screen
//  Displays all saved melodies as a scrollable FlatList
// The library reloads on every screen focus so it stays accurate
// after saves, edits, and deletes on other screens.
export default function LibraryScreen() {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 16, paddingBottom: 1, alignItems: 'center' },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 8,
  },
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
  filterBtnActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  filterBtnText:       { fontSize: 12, fontWeight: '600', color: colors.muted },
  filterBtnTextActive: { color: colors.buttonText },
  libraryCount:        { fontSize: 12, color: colors.muted, fontWeight: '500' },
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
  entryActions:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entry_DeleteBtn: { padding: 2 },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  entryMetaText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
  entryMetaDot:  { fontSize: 12, color: colors.line },
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
  entryDate:     { fontSize: 11, color: colors.muted },
  entryHint:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  entryHintText: { fontSize: 11, color: colors.muted },
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