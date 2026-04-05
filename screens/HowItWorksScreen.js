// screens/HowItWorksScreen.js
// MelodyShifter — How It Works Screen
//
// Instructional video screen using expo-video.
// Accessible from the Home screen and from Settings - Help Section.
// Teaches the core app flow: Setup , Enter Melody,  Analyze & Transpose, Save.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';

// This local video file is the instructional walkthrough shown on the screen.
// Storing the path in a constant makes it easier to replace the file later.
const videoSource = require('../assets/videos/Aria_Welcome_Video.mp4');

// This array defines the five main actions a user takes in the app.
// Each object contains the content needed to render one instructional step card.
// Using an array makes the UI easier to maintain and scale.
const STEPS = [
  {
    icon: 'tune',
    step: '01',
    label: 'Choose your key and clef',
    detail: 'Pick a starting key and clef to set the range for your melody.',
  },
  {
    icon: 'music-note-plus',
    step: '02',
    label: 'Enter your melody',
    detail: 'Tap notes to build a melody up to 16 notes long.',
  },
  {
    icon: 'chart-bell-curve',
    step: '03',
    label: 'Analyze it',
    detail: 'See the direction, intervals, and pitch range of your melody.',
  },
  {
    icon: 'swap-horizontal',
    step: '04',
    label: 'Transpose it',
    detail: 'Shift your melody into any of the 24 major and minor keys.',
  },
  {
    icon: 'content-save-outline',
    step: '05',
    label: 'Save to your library',
    detail: 'Name it, tag a mood, and save it for later.',
  },
];

export default function Instructions({ navigation }) {
  // This hook creates the video player instance for the walkthrough video.
  // The callback runs when the player is ready.
  // loop = false means the video plays once instead of repeating endlessly.
  // player.play() starts playback automatically when the screen opens.
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();
  });

  // This hook listens for playback state changes.
  // It helps the screen know whether the video is currently playing or paused,
  // which is needed to update the Play / Pause button label and icon.
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={colors.muted}
          />
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>How MelodyShifter Works</Text>
        <Text style={styles.subtitle}>
          Watch the walkthrough, then follow the steps below to create your
          first melody.
        </Text>

        {/* Video container holds the embedded tutorial video */}
        <View style={styles.videoWrap}>
          <VideoView
            style={styles.video}
            player={player}
            allowsPictureInPicture
            fullScreenOptions={{ allowFullscreen: true }}
          />
        </View>

        {/* This button gives the user direct control over playback.
            It improves usability by allowing the walkthrough to be paused
            and replayed as needed. */}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
          activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={isPlaying ? 'pause-circle-outline' : 'play-circle-outline'}
            size={22}
            color={colors.accent}
          />
          <Text style={styles.playBtnText}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>
        
        {/* Small caption gives context about the video length */}
        <Text style={styles.videoCaption}>
          MelodyShifter walkthrough · approx. 45 seconds
        </Text>

        {/* This section visually teaches the app flow in short steps.
            It supports users who prefer reading instead of watching video. */}
        <Text style={styles.stepsTitle}>THE CORE FLOW</Text>
        
        {/* map() is used to render each step card from the STEPS array.
            This keeps the code more organized and avoids repeating layout code. */}
        {STEPS.map((s) => (
          <View key={s.step} style={styles.stepCard}>
            <View style={styles.stepIconWrap}>
              <MaterialCommunityIcons
                name={s.icon}
                size={20}
                color={colors.accent}
              />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepLabel}>{s.label}</Text>
              <Text style={styles.stepDetail}>{s.detail}</Text>
            </View>
            <Text style={styles.stepNum}>{s.step}</Text>
          </View>
        ))}

        {/* This call-to-action button moves the user from learning into action.
            It sends the user directly to the Setup screen to begin a new melody. */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('MelodyTab', { screen: 'Setup' })}
          activeOpacity={0.85}>
          <MaterialCommunityIcons
            name="music-note-plus"
            size={18}
            color={colors.buttonText}
          />
          <Text style={styles.ctaBtnText}>Start a New Melody</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: 20, paddingBottom: 48 },

  backBtn: { paddingVertical: 12, alignSelf: 'flex-start' },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },

  // Video player
  videoWrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    // 16:9 aspect ratio matches most screen recordings
    aspectRatio: 9/ 16,
  },
  video: {
    flex: 100,
  },

  // Play / Pause button
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  playBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },

  videoCaption: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 28,
  },

  // Step cards
  stepsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 14,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText:   { flex: 1 },
  stepLabel:  { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  stepDetail: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  stepNum:    { fontSize: 20, fontWeight: '900', color: colors.line },

  // CTA button
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 15,
  },
});