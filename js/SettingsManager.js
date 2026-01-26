// js/SettingsManager.js

export class SettingsManager {
    constructor() {
        this.defaultKeys = {
            INTERACT: 'e',
            INVENTORY: 'i',
            MENU: 'Escape',
            MOVE_UP: 'w',
            MOVE_LEFT: 'a',
            MOVE_DOWN: 's',
            MOVE_RIGHT: 'd'
        };

        // Load from LocalStorage or use defaults
        const stored = localStorage.getItem('wr2_settings');
        this.keys = stored ? JSON.parse(stored) : { ...this.defaultKeys };
    }

    getKey(action) {
        return this.keys[action];
    }

    getKeys() {
        return this.keys;
    }

    setKey(action, key) {
        this.keys[action] = key;
        this.save();
    }

    save() {
        localStorage.setItem('wr2_settings', JSON.stringify(this.keys));
    }

    resetDefaults() {
        this.keys = { ...this.defaultKeys };
        this.save();
    }
}

export const settingsManager = new SettingsManager();
