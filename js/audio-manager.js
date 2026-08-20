/* ============================================================
   Happy Birthday My Love 💙 - Audio Manager
   ------------------------------------------------------------
   File:    js/audio-manager.js
   Purpose: Control the background music element. Audio never
            autoplays - it starts only after a user interaction.
            Missing files and browser autoplay blocks are
            handled gracefully, never crashing the page.
   ============================================================ */


/* Storage keys for remembering the user's audio preferences */
const STORAGE_VOLUME = 'hbm.audioVolume';
const STORAGE_MUTED = 'hbm.audioMuted';

/** Default volume between 0 and 1 */
const DEFAULT_VOLUME = 0.7;

/**
 * Safe localStorage access - some privacy modes throw.
 *
 * @returns {Storage|null} localStorage, or null when unavailable
 */
function getStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}


/* ============================================================
   Class: AudioManager
   ------------------------------------------------------------
   Wraps the <audio> element from index.html (#bg-music).
   Usage (main.js controls when this runs):
     const audio = new AudioManager('#bg-music');
     audio.init();
     await audio.play();        // after a user gesture
     audio.toggle();            // play / pause
     audio.setVolume(0.5);
     audio.mute(); audio.unmute();
     audio.getState();
     audio.destroy();
   ============================================================ */
export class AudioManager {
    /**
     * @param {string|HTMLAudioElement} target - CSS selector or
     *   the audio element itself, e.g. '#bg-music'
     */
    constructor(target) {
        this.audio = typeof target === 'string' ? document.querySelector(target) : target;

        this.volume = DEFAULT_VOLUME;   // current volume 0..1
        this.muted = false;             // mute flag (separate from volume)
        this.sourceBroken = false;      // true when the audio file failed to load
        this.handlers = [];             // listeners to remove on destroy

        this.storage = getStorage();
    }

    /* ---- Lifecycle ---- */

    /**
     * Prepare the audio element: restore saved preferences,
     * wire error handling and ensure no autoplay happens.
     */
    init() {
        if (!this.audio) return;

        // Never autoplay - stay silent until a user interaction
        this.audio.pause();
        this.audio.currentTime = 0;

        // Restore the user's previous preferences where available
        this.restorePreferences();

        // If the file is missing, mark the manager and stay calm
        this.handlers.push(this.onError = () => {
            this.sourceBroken = true;
        });
        this.audio.addEventListener('error', this.onError);

        // Fallback check for already-failed sources (cached pages)
        if (this.audio.error || (this.audio.readyState === 0 && this.audio.networkState === 3)) {
            this.sourceBroken = true;
        }
    }

    /* ---- Playback control ---- */

    /**
     * Start the music. Returns false instead of throwing when
     * playback is blocked (autoplay rules) or the file is missing.
     *
     * @returns {Promise<boolean>} True when playback started
     */
    async play() {
        if (!this.audio || this.sourceBroken) return false;

        try {
            await this.audio.play();
            return true;
        } catch {
            // Browser blocked us (no user gesture yet) or another issue.
            // Swallow it - the user can tap again.
            return false;
        }
    }

    /** Pause the music */
    pause() {
        if (this.audio) this.audio.pause();
    }

    /**
     * Toggle between playing and paused.
     *
     * @returns {Promise<boolean>} Result of play() when starting
     */
    async toggle() {
        if (!this.audio) return false;

        if (this.audio.paused) {
            return this.play();
        }
        this.pause();
        return true;
    }

    /* ---- Volume & mute ---- */

    /**
     * Set the volume level.
     *
     * @param {number} value - Volume between 0 and 1
     */
    setVolume(value) {
        this.volume = Math.min(1, Math.max(0, value));
        if (this.audio) this.audio.volume = this.volume;

        // Saving it lets the user keep their preference next visit
        if (this.storage) {
            try { this.storage.setItem(STORAGE_VOLUME, String(this.volume)); } catch { /* ignore */ }
        }
    }

    /** Mute the music (volume value is preserved) */
    mute() {
        this.muted = true;
        if (this.audio) this.audio.muted = true;

        if (this.storage) {
            try { this.storage.setItem(STORAGE_MUTED, '1'); } catch { /* ignore */ }
        }
    }

    /** Unmute the music (previous volume returns) */
    unmute() {
        this.muted = false;
        if (this.audio) this.audio.muted = false;

        if (this.storage) {
            try { this.storage.setItem(STORAGE_MUTED, '0'); } catch { /* ignore */ }
        }
    }

    /** Toggle between muted and unmuted */
    toggleMute() {
        if (this.muted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    /* ---- State ---- */

    /**
     * Is music currently playing?
     *
     * @returns {boolean} True when playing
     */
    isPlaying() {
        return !!(this.audio && !this.audio.paused && !this.audio.ended);
    }

    /**
     * Full current state snapshot.
     *
     * @returns {Object} { playing, muted, volume, sourceBroken }
     */
    getState() {
        return {
            playing: this.isPlaying(),
            muted: this.muted,
            volume: this.volume,
            sourceBroken: this.sourceBroken,
        };
    }

    /* ---- Preferences ---- */

    /** Load saved volume/mute values, applying them to the element */
    restorePreferences() {
        if (!this.storage) return;

        try {
            const savedVolume = parseFloat(this.storage.getItem(STORAGE_VOLUME));
            if (!Number.isNaN(savedVolume)) {
                this.setVolume(savedVolume);
            } else {
                this.setVolume(DEFAULT_VOLUME);
            }

            const savedMuted = this.storage.getItem(STORAGE_MUTED);
            if (savedMuted === '1') {
                this.mute();
            } else {
                this.unmute();
            }
        } catch {
            // Corrupt storage - fall back to defaults
            this.setVolume(DEFAULT_VOLUME);
            this.unmute();
        }
    }

    /* ---- Cleanup ---- */

    /** Stop playback and remove every listener */
    destroy() {
        this.pause();

        for (const handler of this.handlers) {
            this.audio?.removeEventListener('error', handler);
        }
        this.handlers = [];

        this.audio = null;
    }
}