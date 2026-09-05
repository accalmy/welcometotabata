/**
 * Nature ambiences bundled with the app.
 *
 * Source: "Nature Sounds (Birds, Rain, Water)" on the Internet Archive,
 * released under CC0 1.0 Universal (public domain).
 * https://archive.org/details/naturesounds-soundtheraphy
 *
 * Each track was cut to a 4-minute excerpt, loudness-normalised to -20 LUFS and
 * re-encoded to 80 kbps MP3, then looped seamlessly by the audio engine.
 */

export const AMBIENCES = [
  { id: 'none', name: 'Silence', hint: 'Aucun fond sonore', url: null, emoji: '·' },
  { id: 'forest', name: 'Forêt', hint: 'Chants d’oiseaux', url: '/ambience/forest.mp3', emoji: '🌲' },
  { id: 'ocean', name: 'Mer', hint: 'Vagues & mouettes', url: '/ambience/ocean.mp3', emoji: '🌊' },
  { id: 'rain', name: 'Pluie', hint: 'Pluie fine', url: '/ambience/rain.mp3', emoji: '🌧️' },
  { id: 'stream', name: 'Ruisseau', hint: 'Eau vive & oiseaux', url: '/ambience/stream.mp3', emoji: '💧' },
  { id: 'storm', name: 'Tempête', hint: 'Mer agitée', url: '/ambience/storm.mp3', emoji: '⛈️' },
];

export function findAmbience(id) {
  return AMBIENCES.find((a) => a.id === id) || AMBIENCES[0];
}
