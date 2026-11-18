'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  theme: 'graphite',
  accent: null,            // null = theme default, or a hex like "#ff6b6b"
  lite: false,             // disable animations/blur/shadows
  compact: false,          // denser chat list, no outer spacing
  hideBackground: true,    // remove the doodle wallpaper in chats
  hardwareAcceleration: true,
  closeToTray: true,
  startHidden: false,
  zoom: 1,
  bounds: { width: 1200, height: 800 },
};

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.data = { ...DEFAULTS };
    try {
      Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, 'utf8')));
    } catch { /* first run or corrupt file: use defaults */ }
    this._timer = null;
  }

  get(key) { return this.data[key]; }

  set(key, value) {
    this.data[key] = value;
    // Debounce writes (window resize fires a lot).
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), 400);
  }

  flush() {
    clearTimeout(this._timer);
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('Could not save settings:', err);
    }
  }
}

module.exports = { Settings, DEFAULTS };
