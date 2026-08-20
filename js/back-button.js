/* ============================================================
   Happy Birthday My Love 💙 - Global Back Button
   ------------------------------------------------------------
   File:    js/back-button.js
   Purpose: A small premium glass "Back" control fixed to the
            top-left corner, mounted OUTSIDE #app so no scene can
            clip or cover it. UI-only by design: it never decides
            what "back" means - main.js owns the state machine
            and wires the onBack callback for the current scene.
   ============================================================ */

export class BackButton {
    constructor(selector = '#experience-back-btn') {
        this.btn = document.querySelector(selector);
        this.visible = false;

        // Wired by main.js: called once per press, then main.js
        // decides how to restore the previous scene.
        this.onBack = null;

        this._onClick = () => this.onBack?.();
    }

    init() {
        if (!this.btn) return this;
        this.btn.addEventListener('click', this._onClick);
        return this;
    }

    /**
     * Show or hide the button. Showing re-triggers the entrance
     * animation every time (class removal + reflow + re-add), so
     * returning scenes always get a fresh, soft slide-in.
     */
    setVisible(visible) {
        if (!this.btn) return;

        this.visible = !!visible;

        if (this.visible) {
            this.btn.hidden = false;
            this.btn.classList.remove('is-visible');
            void this.btn.offsetWidth;
            this.btn.classList.add('is-visible');
            this.btn.setAttribute('aria-hidden', 'false');
        } else {
            // Instant hide: the next scene must never inherit a
            // lingering control, so no exit animation is played.
            this.btn.classList.remove('is-visible');
            this.btn.setAttribute('aria-hidden', 'true');
            this.btn.hidden = true;
        }
    }

    destroy() {
        this.btn?.removeEventListener('click', this._onClick);
        this.onBack = null;
        this.btn = null;
    }
}