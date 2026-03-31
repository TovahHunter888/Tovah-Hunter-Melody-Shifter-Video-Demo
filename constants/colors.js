// constants/colors.js
// Color palette for MelodyShift.
// Import this file into any screen instead of hardcoding colors directly.
// All values are solid hex colors for consistency and readability.

const colors = {

  // Backgrounds 
  // Deep navy blue - main screen background
  background: '#0B1F33',
  // Dark steel blue - input areas, and list containers
  surface: '#112840',
  // Darker navy - background for sharp note rows in the melody list
  surfaceSharp: '#0F2035',
  // Muted blue grey - divider lines and borders
  line: '#2D4359',
  // Faint navy - alternating row tint for the comparison table (zebra striping)
  rowAlt: '#162C44',

  // Brand Colors 
  // Teal green - buttons, active states, and highlights
  accent: '#2EC4B6',
  // Dark teal - button pressed state
  accentDark: '#1FA89C',
  // Deep teal navy - glow ring border on the splash screen logo
  // Derived from blending teal accent over the background color
  accentGlow: '#12404D',
  // Muted teal - active option highlight in the key picker dropdown
  accentSubtle: '#14384C',
  // Very faint teal wash - active clef button background
  accentWash: '#133449',
  // Soft purple - sharp notes and sharp key buttons
  accentSharp: '#7B5EA7',

  // Text 
  // Bright white - titles and strong readable text
  text: '#F8FAFC',
  // Light blue white - paragraphs and supporting text
  textSecondary: '#D8E6F2',
  // Steel grey - captions, labels, and placeholders
  muted: '#8FA8BC',
  // Deep navy - text rendered on top of teal buttons
  buttonText: '#0B1F33',

  // Feedback 
  // Soft red - validation errors and delete indicators
  error: '#FF6B6B',
  // Muted navy red - delete button background tint
  errorSubtle: '#2E2040',

};

export default colors;