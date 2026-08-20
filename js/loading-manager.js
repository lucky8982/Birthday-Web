/* ============================================================
   Happy Birthday My Love 💙 - Loading Manager
   ------------------------------------------------------------
   File:    js/loading-manager.js
   Purpose: Controls the loading screen, its progress indicator
            and the "Tap to Begin" interaction that hands over
            to the hero scene.
   Note:    Uses ONLY the real elements from index.html.
            Background effects and audio are NOT created here -
            main.js wires those up after 'birthday:begin'.
   ============================================================ */

import { $, clamp, prefersReducedMotion, sleep } from './utils.js';


/** Custom event name fired when the user begins the experience */
export const BEGIN_EVENT = 'birthday:begin';

/** How long the loading screen exit animation runs (see animation.css) */
export const EXIT_DURATION = 1000;

/** Speed of the simulated progress while waiting for main.js */
const PROGRESS_STEP = 1.4;      // percent per tick
const PROGRESS_INTERVAL = 60;   // ms per tick


/* ============================================================
   Class: LoadingManager
   ------------------------------------------------------------
   Usage (from main.js):
     const loading = new LoadingManager();
     loading.init();
     loading.start();
     ...when ready...
     loading.complete();
     // user taps the button -> beginExperience() runs
   ============================================================ */
export class LoadingManager {
    constructor() {
        // Every element is cached at init time (may be null)
        this.screen = null;        // #loading-screen
        this.progressFill = null;  // #progress-fill
        this.progressText = null;  // #progress-text
        this.tapButton = null;     // #tap-to-begin
        this.app = null;           // #app

        this.started = false;      // progress simulation running
        this.finished = false;     // loading complete, button visible
        this.began = false;        // user already tapped
        this.exited = false;       // screen already handed over to the app
        this.progressTimer = null; // interval id for simulation
        this.reducedMotion = prefersReducedMotion();

        // Bound handlers so they can be removed in destroy()
        this._onTap = () => this.beginExperience();
    }

    /* ---- Lifecycle ---- */

    /** Find and cache every loading-related element from the page */
    init() {
        this.screen = $('#loading-screen');
        this.progressFill = $('#progress-fill');
        this.progressText = $('#progress-text');
        this.tapButton = $('#tap-to-begin');
        this.app = $('#app');

        // Attach the tap interaction to the button (missing = safe)
        this.tapButton?.addEventListener('click', this._onTap);
    }

    /**
     * Begin the loading experience: make sure the screen is
     * visible and run a gentle simulated progress until
     * complete() is called by main.js.
     */
    start() {
        if (this.started || !this.screen) return;
        this.started = true;

        // The screen is visible by default - just reset its state
        this.screen.hidden = false;
        this.screen.classList.remove('is-leaving');

        // Reset progress to zero
        this.setProgress(0);

        // Simulated loading so the intro feels alive while assets settle
        this.progressTimer = setInterval(() => {
            // Climb slowly toward 92%, never finishing on its own
            this.setProgress(this.getProgress() + PROGRESS_STEP);
            if (this.getProgress() >= 92) {
                this.setProgress(88);
            }
        }, PROGRESS_INTERVAL);
    }

    /**
     * Mark loading as complete: stop the simulation, reach 100%
     * and reveal the "Tap to Begin" button.
     */
    complete() {
        if (this.finished) return;
        this.finished = true;

        // Stop the simulated progress
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }

        this.setProgress(100);

        // Reveal the button with its rise-in animation (animation.css)
        if (this.tapButton) {
            this.tapButton.hidden = false;
            this.tapButton.classList.add('is-visible');
        }
    }

    /* ---- Progress control ---- */

    /**
     * Update the progress bar and its percentage label.
     * Values are clamped to 0-100; missing elements are ignored.
     *
     * @param {number} value - Progress percentage (0-100)
     */
    setProgress(value) {
        const percent = clamp(Math.round(value), 0, 100);

        if (this.progressFill) {
            this.progressFill.style.width = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `${percent}%`;
        }
    }

    /** @returns {number} Current progress percentage */
    getProgress() {
        if (!this.progressFill) return 0;
        return parseFloat(this.progressFill.style.width) || 0;
    }

    /* ---- The big handover ---- */

    /**
     * Called when the user taps "Tap to Begin":
     *  1. Animates the loading screen away (is-leaving)
     *  2. Reveals the app (the opening layer drives the intro)
     *  3. Fires the 'birthday:begin' custom event for main.js
     */
    beginExperience() {
        if (this.began) return;
        this.began = true;

        // Stop progress updates for good
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }

        // Fire the event FIRST so main.js can start effects & music
        window.dispatchEvent(new CustomEvent(BEGIN_EVENT, {
            detail: { from: 'loading-manager' },
        }));

        this.exitToApp();
    }

    /**
     * Exit the loading screen and reveal the app WITHOUT firing
     * BEGIN_EVENT again. Used by the opening layer, which already
     * dispatched BEGIN_EVENT when its "Open it ❤️" button was
     * tapped (so music + effects start inside that user gesture).
     *
     * `instant` is used at the letter -> reveal handover: the slow
     * fade would replay the loading screen's own "Happy Birthday /
     * My Love" title on top of the Birthday Reveal (the screen sits
     * above it at z-index 1000). Hide the screen and show the app
     * immediately so the reveal is the only scene on screen.
     */
    exitToApp(instant = false) {
        if (this.exited) return;
        this.exited = true;

        // Stop progress updates for good
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }

        if (instant || !this.screen) {
            // Instant path: the screen is obsolete - it must not
            // linger (not even for its own exit animation).
            if (this.screen) {
                this.screen.hidden = true;
                this.screen.classList.remove('is-leaving', 'is-lettering');
            }
            this.revealHero();
            return;
        }

        // Play the cinematic exit (animation.css: screen-exit)
        this.screen.classList.add('is-leaving');

        // Reduced motion users skip the long fade
        const wait = this.reducedMotion ? 50 : EXIT_DURATION;
        sleep(wait).then(() => {
            if (!this.screen) return;
            // Screen is gone for good
            this.screen.hidden = true;
            this.screen.classList.remove('is-leaving');
            this.revealHero();
        });
    }

    /** Show the app (the opening layer and scenes take it from here) */
    revealHero() {
        if (this.app) this.app.hidden = false;
    }

    /* ---- Cleanup ---- */

    /** Remove listeners, stop timers and release references */
    destroy() {
        this.tapButton?.removeEventListener('click', this._onTap);

        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }

        this.screen = null;
        this.progressFill = null;
        this.progressText = null;
        this.tapButton = null;
        this.app = null;
    }
}