/* ============================================================
   Happy Birthday My Love 💙 - Audio Manager
   ------------------------------------------------------------
   File:    js/audio-manager.js
   Purpose: Control the background music element. It preserves the
            user's enabled/disabled preference independently from a
            browser's temporary autoplay restriction.
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
        this.playbackPending = false;   // enabled, but a user gesture is required
        this.playAttempt = null;        // prevents concurrent play() requests
        this.playRequestId = 0;         // ignores stale results from an earlier attempt
        this.pauseVersion = 0;          // invalidates playback after a lifecycle pause
        this.handlers = [];             // listeners to remove on destroy

        this.storage = getStorage();
    }

    /* ---- Lifecycle ---- */

    /**
     * Prepare the audio element and restore saved preferences. The caller
     * may then make one normal playback attempt when music is enabled.
     */
    init() {
        if (!this.audio) return;

        // A reload creates a fresh media element, so reset only this new
        // element before preferences are restored.
        this.audio.pause();
        this.audio.currentTime = 0;

        // Restore the user's previous preferences where available
        this.restorePreferences();

        // If the file is missing, mark the manager and stay calm
        this.handlers.push(this.onError = () => {
            this.sourceBroken = true;
            this.playbackPending = false;
            this.playRequestId += 1;
        });
        this.audio.addEventListener('error', this.onError);

        // Fallback check for already-failed sources (cached pages)
        if (this.audio.error || (this.audio.readyState === 0 && this.audio.networkState === 3)) {
            this.sourceBroken = true;
        }
    }

    /* ---- Playback control ---- */

    /**
     * Start the music. A NotAllowedError is recorded as a pending playback
     * request without changing the user's enabled preference. Other failures
     * remain non-fatal and do not schedule automatic retries.
     *
     * @param {{ fromGesture?: boolean }} options
     * @returns {Promise<boolean>} True when playback started
     */
    play({ fromGesture = false } = {}) {
        if (!this.audio || this.sourceBroken || this.muted) return false;
        if (this.isPlaying()) {
            this.playbackPending = false;
            return true;
        }
        // A normal load attempt can still be pending when the first tap
        // arrives. Do not reuse it: Safari/mobile Chrome require a fresh,
        // native play() call directly in that trusted event's call stack.
        if (this.playAttempt && !fromGesture) return this.playAttempt;

        const requestId = ++this.playRequestId;
        const pauseVersion = this.pauseVersion;
        let nativePlay;
        try {
            nativePlay = this.audio.play();
        } catch (error) {
            if (requestId === this.playRequestId) {
                this.playbackPending = !this.muted && this.isAutoplayBlocked(error);
            }
            return Promise.resolve(false);
        }

        const attempt = Promise.resolve(nativePlay)
            .then(() => {
                // A user can turn music OFF while a prior play() promise is
                // settling. Do not let that stale request revive playback.
                if (this.muted || this.sourceBroken || !this.audio || pauseVersion !== this.pauseVersion) {
                    this.audio?.pause();
                    return false;
                }
                if (requestId === this.playRequestId) this.playbackPending = false;
                return true;
            })
            .catch((error) => {
                // Autoplay policy is temporary. Keep preference ON and let
                // main.js retry from the first real user interaction.
                if (requestId === this.playRequestId) {
                    this.playbackPending = !this.muted && this.isAutoplayBlocked(error);
                }
                return false;
            })
            .finally(() => {
                if (this.playAttempt === attempt) this.playAttempt = null;
            });

        this.playAttempt = attempt;
        return attempt;
    }

    /** Whether the latest rejected play() needs a user gesture to retry. */
    isPlaybackPending() {
        return this.playbackPending;
    }

    /** Whether a native play() promise is still settling. */
    isPlaybackAttempting() {
        return !!this.playAttempt;
    }

    /** Autoplay denials have a stable name across current target browsers. */
    isAutoplayBlocked(error) {
        if (error?.name === 'NotAllowedError') return true;
        return /autoplay|user\s*(activation|gesture|interact)|not\s*(allowed|permitted)|requires?.*interaction/i.test(error?.message || '');
    }

    /** Pause without changing preference or playback position. */
    pause({ cancelPending = false } = {}) {
        if (cancelPending) {
            this.pauseVersion += 1;
            this.playbackPending = false;
        }
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
        this.playbackPending = false;
        this.playRequestId += 1;
        this.pauseVersion += 1;
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
            preferenceEnabled: !this.muted,
            playbackPending: this.playbackPending,
            volume: this.volume,
            sourceBroken: this.sourceBroken,
        };
    }

    /* ---- Preferences ---- */

    /** Load saved volume/mute values, applying them to the element */
    restorePreferences() {
        try {
            const savedVolume = parseFloat(this.storage?.getItem(STORAGE_VOLUME));
            if (!Number.isNaN(savedVolume)) {
                this.setVolume(savedVolume);
            } else {
                this.setVolume(DEFAULT_VOLUME);
            }

            const savedMuted = this.storage?.getItem(STORAGE_MUTED);
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
        this.pause({ cancelPending: true });

        for (const handler of this.handlers) {
            this.audio?.removeEventListener('error', handler);
        }
        this.handlers = [];

        this.playAttempt = null;
        this.playbackPending = false;
        this.playRequestId += 1;
        this.audio = null;
    }
}
