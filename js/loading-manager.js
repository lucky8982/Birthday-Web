/* ============================================================
   Loading host / handoff controller
   ------------------------------------------------------------
   The loading screen remains the shared backdrop used by the entry,
   question-lock, and opening layers. It intentionally has no fake
   progress or start CTA: those layers own the real user gestures.
   ============================================================ */

import { $, prefersReducedMotion, sleep } from './utils.js';

/** Custom event name fired from a genuine journey-start gesture. */
export const BEGIN_EVENT = 'birthday:begin';

/** Duration of the optional host exit animation. */
export const EXIT_DURATION = 1000;

export class LoadingManager {
    constructor() {
        this.screen = null;
        this.app = null;
        this.started = false;
        this.finished = false;
        this.began = false;
        this.exited = false;
        this.reducedMotion = prefersReducedMotion();
    }

    init() {
        this.screen = $('#loading-screen');
        this.app = $('#app');
    }

    /** Keep the shared host available while entry/authentication layers load. */
    start() {
        if (this.started || !this.screen) return;
        this.started = true;
        this.screen.hidden = false;
        this.screen.classList.remove('is-leaving');
    }

    /** Main has finished its synchronous setup; no visual progress is implied. */
    complete() {
        this.finished = true;
    }

    /**
     * Preserve the established gesture handoff for audio/effects. This method
     * is called by the opening/reveal flow, never by a synthetic loader CTA.
     */
    beginExperience() {
        if (!this.began) {
            this.began = true;
            window.dispatchEvent(new CustomEvent(BEGIN_EVENT, {
                detail: { from: 'journey-handoff' },
            }));
        }
        this.exitToApp();
    }

    /** Hide the host and reveal #app without dispatching BEGIN_EVENT again. */
    exitToApp(instant = false) {
        // Back/restore flows can deliberately re-open the shared loading host
        // after its first exit. Re-applying the settled state here prevents a
        // later handoff from leaving both the host and #app hidden.
        if (this.exited) {
            if (this.screen) {
                this.screen.hidden = true;
                this.screen.classList.remove('is-leaving', 'is-lettering');
            }
            this.revealHero();
            return;
        }
        this.exited = true;

        if (instant || !this.screen) {
            if (this.screen) {
                this.screen.hidden = true;
                this.screen.classList.remove('is-leaving', 'is-lettering');
            }
            this.revealHero();
            return;
        }

        this.screen.classList.add('is-leaving');
        const wait = this.reducedMotion ? 50 : EXIT_DURATION;
        sleep(wait).then(() => {
            if (!this.screen) return;
            this.screen.hidden = true;
            this.screen.classList.remove('is-leaving');
            this.revealHero();
        });
    }

    revealHero() {
        if (this.app) this.app.hidden = false;
    }

    destroy() {
        this.screen = null;
        this.app = null;
    }
}
