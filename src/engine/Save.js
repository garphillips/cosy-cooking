// localStorage persistence with versioning. Two keys: the game save and device settings,
// so "reset save" keeps volume / accessibility preferences.
const SAVE_KEY = 'cosy-cooking.save.v1';
const SETTINGS_KEY = 'cosy-cooking.settings.v1';

function read(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

export const Save = {
  hasSave() { return !!read(SAVE_KEY); },
  loadGame() { return read(SAVE_KEY); },
  saveGame(state) { return write(SAVE_KEY, { ...state, savedAt: Date.now() }); },
  resetGame() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ } },
  loadSettings() { return read(SETTINGS_KEY); },
  saveSettings(s) { return write(SETTINGS_KEY, s); },
};
