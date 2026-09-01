/* ============================================================
   Happy Birthday My Love 💙 - Question Lock Screen
   ------------------------------------------------------------
   File:    js/question-lock.js
   Purpose: A cinematic question lock screen that plays after
            the Entry Lock Intro (Phase 1). A premium question
            screen with text input validation and cinematic unlock.
   ============================================================ */

import { $, prefersReducedMotion } from './utils.js';

/* Animation durations (ms) - mirror CSS transition/animation
   durations. Reduced motion runs at 0 (CSS transitions/animations
   are disabled via media query). */
const DURATIONS = {
    lockIn: 1000,       // Lock icon entrance
    headingIn: 800,     // Heading entrance
    questionIn: 800,    // Question text entrance
    inputIn: 800,       // Input field entrance
    buttonIn: 800,      // Button entrance
    shake: 500,         // Wrong answer shake
    unlockAnim: 800,    // Unlock animation
    // ISSUE FIX: was 800 - a full extra second of empty screen
    // after the question scene had already disappeared (the scene
    // itself has no fade-out transition). A short tick keeps the
    // teardown order intact while removing the blank-screen gap
    // before the "Hello Meri Cute Wife" experience appears.
    finalFade: 80,      // Short teardown tick before handover
    gateOpen: 1200,     // Gate opening
};

const STARS = 50;       // subtle starfield
const PARTICLES = 6;    // subtle floating particles

const CORRECT_ANSWER = '07 april 2025';
const REQUIRED_LENGTH = 6;

function isCorrectAnswer(value) {
    const norm = value.trim().toLowerCase();
    if (norm === CORRECT_ANSWER) return true;
    const normNoSpace = norm.replace(/\s+/g, '');
    const correctNoSpace = CORRECT_ANSWER.replace(/\s+/g, '');
    if (normNoSpace === correctNoSpace) return true;
    // Accept 6-char digit variants for spec compliance (07-04-25 etc.)
    const digits = norm.replace(/\D/g, '');
    const correctDigits = CORRECT_ANSWER.replace(/\D/g, '');
    if (digits.length === 6 && correctDigits.includes(digits)) return true;
    if (digits === '070425' || digits === '072025' || digits === '07042025') return true;
    return false;
}

/* ============================================================
   Class: QuestionLockScreen
   ------------------------------------------------------------
   Usage (from entry-lock.js or main.js):
     const questionLock = new QuestionLockScreen();
     questionLock.init();       // after the DOM exists
     questionLock.onHandover = callback; // called when unlock succeeds
     questionLock.start();      // called after Phase 1 finishes
   ============================================================ */
export class QuestionLockScreen {
    constructor() {
        // Cached elements (found at init time)
        this.overlay = null;
        this.stage = null;
        this.lockIcon = null;
        this.heading = null;
        this.questionText = null;
        this.inputWrapper = null;
        this.input = null;
        this.underline = null;
        this.feedback = null;
        this.unlockBtn = null;
        this.unlockBtnText = null;
        this.unlockBtnIcon = null;
        this.starsEl = null;
        this.particlesEl = null;
        this.gateEl = null;

        this.reduced = prefersReducedMotion();
        this.started = false;
        this.finished = false;
        this.busy = false;
        this.answerValid = false;
        this.timers = [];
        this._boundOnInput = this._onInput.bind(this);
        this._boundOnUnlockClick = this._onUnlockClick.bind(this);
        this._boundOnKey = this._onKey.bind(this);
        this._boundOnTap = this._onTap.bind(this);
        // Mobile keyboard tracking (visual viewport) - keeps the
        // input + unlock button usable while the keyboard is open.
        this._boundOnViewportChange = () => this._syncKeyboardInset();
        this._handedOver = false;
        this._focusFrame = null;
        this._focusToken = 0;

        // Wired by entry-lock.js or main.js: called when unlock succeeds
        this.onHandover = null;
    }

    /* ---- Lifecycle ---- */

    /** Find and cache the question lock elements from the page */
    init() {
        this.overlay = $('#question-lock');
        if (!this.overlay) return;

        this.stage = $('#question-stage');
        this.lockIcon = $('.question-lock-icon');
        this.heading = $('#question-heading');
        this.questionText = $('#question-text');
        this.inputWrapper = $('.question-input-wrapper');
        this.input = $('#question-input');
        this.underline = $('.input-underline');
        this.feedback = $('#question-feedback');
        this.unlockBtn = $('#question-unlock-btn');
        this.unlockBtnText = $('.unlock-btn-text');
        this.unlockBtnIcon = $('.unlock-btn-icon');
        this.starsEl = $('#question-stars');
        this.particlesEl = $('#question-particles');
        this.gateEl = $('#question-gate');

        // Ensure initial state: no feedback, button disabled
        this._clearFeedback();
        this._setButtonEnabled(false);

        // Input validation on input event
        this.input?.addEventListener('input', this._boundOnInput);

        // Button click handler
        this.unlockBtn?.addEventListener('click', this._boundOnUnlockClick);

        // Keyboard support for Enter key in input - submit only if enough chars
        this.input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const len = this.input.value.trim().length;
                if (len >= REQUIRED_LENGTH) {
                    e.preventDefault();
                    this._onUnlockClick(e);
                } else {
                    e.preventDefault();
                    this._shakeInput();
                }
            }
        });

        // Keyboard users can advance with Enter/Space on the overlay
        this.overlay.addEventListener('keydown', this._boundOnKey);

        // The whole scene is a tap target (for accessibility) - no auto advance
        this.overlay.addEventListener('click', this._boundOnTap);

        // Track the mobile keyboard (visual viewport) so the answer
        // input + unlock button stay visible while typing. Single
        // listener pair, removed in destroy().
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this._boundOnViewportChange);
            window.visualViewport.addEventListener('scroll', this._boundOnViewportChange);
        }
    }

    /**
     * Measure how much of the layout viewport the on-screen keyboard
     * covers and expose it as `--kb-inset` on the scene. While the
     * keyboard is open the scene gets the `is-keyboard` class, which
     * pins the input + button directly above the keyboard (CSS,
     * mobile only). Desktop is never affected.
     */
    _syncKeyboardInset() {
        if (!this.overlay) return;
        const vv = window.visualViewport;
        if (!vv) return;

        const kbInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

        if (kbInset > 130) {
            this.overlay.classList.add('is-keyboard');
            this.overlay.style.setProperty('--kb-inset', Math.round(kbInset) + 'px');
        } else {
            this.overlay.classList.remove('is-keyboard');
            this.overlay.style.removeProperty('--kb-inset');
        }
    }

    /**
     * Reveal the question lock scene.
     * Called after Phase 1 (EntryLockIntro) finishes.
     */
    start() {
        if (this.started || !this.overlay) return;
        this.started = true;
        this.finished = false;
        this.busy = false;
        this.answerValid = false;
        this._handedOver = false;

        // Explicitly hide Entry Lock (keep Loading screen visible as backdrop)
        const entryLock = document.getElementById('entry-lock');
        if (entryLock) {
            entryLock.classList.remove('is-visible', 'is-leaving');
            entryLock.hidden = true;
        }
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.hidden = false;
            loading.classList.add('is-lettering');
        }

        this.overlay.removeAttribute('hidden');
        void this.overlay.offsetWidth;
        this.overlay.classList.add('is-visible');
        this.overlay.classList.remove('is-leaving', 'is-gate-opening', 'is-gate-open');
        // Ensure stage is visible (it starts hidden via CSS)
        this.stage?.classList.add('is-visible');
        this.stage?.classList.remove('is-hidden');
        if (this.gateEl) {
            this.gateEl.hidden = true;
            this.gateEl.classList.remove('is-opening', 'is-open');
            this.gateEl.setAttribute('aria-hidden', 'true');
        }

        // Reset input and button state on every start (no premature error)
        if (this.input) {
            this.input.value = '';
            this.input.removeAttribute('maxlength');
            this.input.setAttribute('autocomplete', 'off');
        }
        this._clearFeedback();
        this._setButtonEnabled(false);
        // Ensure fields are correctly positioned and visible
        this.heading?.classList.remove('is-hidden');
        this.questionText?.classList.remove('is-hidden');
        this.inputWrapper?.classList.remove('shake');
        this.inputWrapper?.classList.remove('is-hidden');
        this.unlockBtn?.classList.remove('unlocked');
        this.lockIcon?.classList.remove('unlocking');

        this.spawnStars();
        this.spawnParticles();

        // Keyboard users can advance with Enter/Space
        if (typeof this.overlay.focus === 'function') {
            this.overlay.focus({ preventScroll: true });
        }

        // Start entrance animations
        this.playEntrance();
    }

    /* ---- Entrance Animation ---- */

    playEntrance() {
        if (this.finished) return;

        this.busy = true;

        this.overlay.hidden = false;
        void this.overlay.offsetWidth;
        this.overlay.classList.add('is-visible');
        this.stage?.classList.add('is-visible');

        // The lock icon appears first
        this.lockIcon?.classList.add('is-visible');

        // Then heading, question, input, button with staggered delays
        const delays = {
            heading: 200,
            questionText: 300,
            inputWrapper: 400,
            button: 500,
        };

        // Heading
        setTimeout(() => {
            this.heading?.classList.add('is-visible');
            this.heading?.classList.remove('is-hidden');
        }, this.reduced ? 0 : delays.heading);

        // Question text
        setTimeout(() => {
            this.questionText?.classList.add('is-visible');
            this.questionText?.classList.remove('is-hidden');
        }, this.reduced ? 0 : delays.questionText);

        // Input wrapper - stays visible after entrance
        setTimeout(() => {
            this.inputWrapper?.classList.add('is-visible');
            this.inputWrapper?.classList.remove('is-hidden');
        }, this.reduced ? 0 : delays.inputWrapper);

        // Button - stays visible after entrance (disabled until 6 chars)
        setTimeout(() => {
            this.unlockBtn?.classList.add('is-visible');
        }, this.reduced ? 0 : delays.button);

        // After the visible entrance has settled, focus the actual answer
        // field. The animation-frame delay avoids opening a mobile keyboard
        // while the field is still hidden or moving into place.
        const totalDelay = this.reduced ? 0 : (Math.max(...Object.values(delays)) + 300);
        setTimeout(() => {
            this.busy = false;
            this._focusInputWhenReady();
        }, this.reduced ? 0 : totalDelay);
    }

    _focusInputWhenReady() {
        const token = ++this._focusToken;
        if (this._focusFrame != null) cancelAnimationFrame(this._focusFrame);
        this._focusFrame = requestAnimationFrame(() => {
            this._focusFrame = null;
            if (token !== this._focusToken) return;
            this._focusInput();
        });
    }

    _focusInput() {
        const input = this.input;
        if (!input || input.disabled || !input.isConnected || this.overlay?.hidden || !this.overlay?.classList.contains('is-visible')) return;
        try {
            input.focus({ preventScroll: true });
        } catch {
            input.focus();
        }
        if (document.activeElement === input) {
            const end = input.value.length;
            try { input.setSelectionRange(end, end); } catch {}
        }
    }

    /* ---- Input Validation ---- */

    _onInput() {
        if (this.finished || this.busy) return;
        const rawValue = this.input.value;
        const trimmed = rawValue.trim();
        const len = trimmed.length;

        // Question must NEVER hide - keep heading/question continuously visible
        this.heading?.classList.add('is-visible');
        this.heading?.classList.remove('is-hidden');
        this.questionText?.classList.add('is-visible');
        this.questionText?.classList.remove('is-hidden');

        // Ensure remaining fields stay properly visible and positioned (and never disappear)
        this.inputWrapper?.classList.add('is-visible');
        this.inputWrapper?.classList.remove('is-hidden');
        this.unlockBtn?.classList.add('is-visible');
        this.lockIcon?.classList.add('is-visible');

        if (len === 0) {
            this._clearFeedback();
            this._setButtonEnabled(false);
            return;
        }

        // Do NOT show error while incomplete - only manage button enabled state
        // Button becomes touchable/clickable as soon as 6+ characters entered
        if (len >= REQUIRED_LENGTH) {
            this._setButtonEnabled(true);
            if (this.feedback?.classList.contains('feedback-error')) {
                this._clearFeedback();
            }
        } else {
            this._setButtonEnabled(false);
            this._clearFeedback();
        }
    }

    _normalizeAnswer(value) {
        return value.trim().toLowerCase();
    }

    _setButtonEnabled(enabled) {
        this.answerValid = enabled;
        if (!this.unlockBtn) return;
        if (enabled) {
            this.unlockBtn.disabled = false;
            this.unlockBtn.removeAttribute('aria-disabled');
            this.unlockBtn.classList.add('is-enabled');
            this.unlockBtn.style.pointerEvents = '';
            this.unlockBtn.setAttribute('tabindex', '0');
        } else {
            this.unlockBtn.disabled = true;
            this.unlockBtn.setAttribute('aria-disabled', 'true');
            this.unlockBtn.classList.remove('is-enabled');
            // Keep button visible but non-interactive
            this.unlockBtn.setAttribute('tabindex', '-1');
        }
    }

    _showFeedback(message, type) {
        if (!this.feedback) return;
        this.feedback.innerHTML = message;
        this.feedback.className = 'question-feedback';
        this.feedback.setAttribute('aria-hidden', 'false');
        this.feedback.classList.add(`feedback-${type}`);

        // Force reflow for animation
        void this.feedback.offsetWidth;
        this.feedback.classList.add('is-visible');
    }

    _clearFeedback() {
        if (!this.feedback) return;
        this.feedback.classList.remove('is-visible', 'feedback-success', 'feedback-error');
        this.feedback.setAttribute('aria-hidden', 'true');
        this.feedback.innerHTML = '';
    }

    _shakeInput() {
        if (this.reduced || !this.inputWrapper) return;
        
        this.inputWrapper.classList.add('shake');
        setTimeout(() => {
            this.inputWrapper.classList.remove('shake');
        }, DURATIONS.shake);
    }

    /* ---- Unlock Button Click ---- */

    _onUnlockClick(e) {
        if (this.finished || this.busy) {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            return;
        }
        const raw = this.input ? this.input.value.trim() : '';
        // Prevent submission before 6 characters
        if (raw.length < REQUIRED_LENGTH) {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            this._shakeInput();
            return;
        }

        e?.preventDefault?.();
        e?.stopPropagation?.();

        // Validate only on unlock attempt
        const correct = isCorrectAnswer(raw);
        if (correct) {
            this._performUnlockSuccess();
        } else {
            this._handleWrongPassword();
        }
    }

    _handleWrongPassword() {
        if (this.finished || this.busy) return;
        // Keep button enabled so user can retry immediately (or keep enabled for correction)
        this._setButtonEnabled(true);
        this._showFeedback('Hmm... 😄<br>Ek baar fir soch kar dekho. 💙', 'error');
        this._shakeInput();
        this._focusInput();
        // Do not trigger gate, stay on lock screen
    }

    _performUnlockSuccess() {
        if (this.finished || this.busy) return;
        this.busy = true;
        this.finished = true;
        this._handedOver = false;

        // Prevent multiple submissions
        this._setButtonEnabled(false);
        if (this.unlockBtn) {
            this.unlockBtn.disabled = true;
            this.unlockBtn.classList.add('unlocked');
        }

        // Dismiss mobile keyboard before the cinematic handover so the
        // success feedback is measured against the full visual viewport
        // and is not clipped at the top after the inset changes.
        try { this.input?.blur(); } catch {}
        // Ensure keyboard inset is cleared immediately for correct centering
        this.overlay?.classList.remove('is-keyboard');
        this.overlay?.style.removeProperty('--kb-inset');

        // Visual feedback for correct unlock
        this._showFeedback('Bilkul sahi... 💙', 'success');

        // Lock icon unlock animation
        this.lockIcon?.classList.add('unlocking');

        // Make sure the success feedback scrolls into view on small viewports
        // so it is not partially cut by the top of the viewport.
        try {
            if (window.innerWidth <= 767 && this.feedback) {
                this.feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        } catch {}

        // Cinematic gate opening as main transition
        this._openGate();
    }

    _openGate() {
        // Gate is the main cinematic action - not just a fade
        if (this.gateEl) {
            this.gateEl.hidden = false;
            this.gateEl.setAttribute('aria-hidden', 'false');
            void this.gateEl.offsetWidth;
            this.gateEl.classList.add('is-opening');
            this.overlay.classList.add('is-gate-opening');
        } else {
            // Fallback if gate element missing - use stage transform as gate
            this.stage?.classList.add('is-gate-opening');
        }

        const gateDuration = this.reduced ? 0 : DURATIONS.gateOpen;
        const unlockDuration = this.reduced ? 0 : DURATIONS.unlockAnim;

        // Wait for unlock anim + gate open, then fade and handover
        // Use tracked timers so cleanup cannot leave a stale handover behind
        const total = Math.max(gateDuration, unlockDuration) + 200;
        this.later(total, () => {
            if (this._handedOver) return;
            if (this.gateEl) {
                this.gateEl.classList.remove('is-opening');
                this.gateEl.classList.add('is-open');
            }
            this._fadeOutAndHandover();
        });
    }

    _fadeOutAndHandover() {
        if (this._handedOver) return;
        // Gate already opening - now fade stage with cinematic blur/scale
        if (this.stage) {
            this.stage.style.transition = 'opacity 0.8s var(--ease-soft), transform 0.8s var(--ease-soft), filter 0.8s var(--ease-soft)';
            this.stage.style.opacity = '0';
            this.stage.style.transform = 'translateY(-30px) scale(0.95)';
            this.stage.style.filter = 'blur(10px)';
        }

        this.later(this.reduced ? 0 : 800, () => {
            if (this._handedOver) return;
            this.overlay.classList.remove('is-visible');
            this.overlay.classList.add('is-leaving');

            this.later(this.reduced ? 0 : DURATIONS.finalFade, () => {
                if (this._handedOver) return;
                this._handedOver = true;
                // Deterministic handover: remove question overlay from layout,
                // ensure no invisible layer can intercept taps on the next scene,
                // and do not disturb the next scene's DOM.
                this.overlay.hidden = true;
                this.overlay.classList.remove('is-leaving', 'is-gate-opening', 'is-gate-open');
                this.overlay.style.pointerEvents = '';
                if (this.gateEl) {
                    this.gateEl.hidden = true;
                    this.gateEl.classList.remove('is-opening', 'is-open');
                    this.gateEl.setAttribute('aria-hidden', 'true');
                }
                // Clear timers without destroying the next scene; preserve
                // handover callback by calling it after cleanup's timer purge.
                const cb = this.onHandover;
                // Remove keyboard state before next scene measures viewport
                this.overlay?.classList.remove('is-keyboard');
                this.overlay?.style.removeProperty('--kb-inset');
                // Use a clean timer purge that does not clear the current id
                // after we have captured the callback - we have already set
                // _handedOver, so no stale timer can re-enter.
                for (const id of this.timers) {
                    // The current timer's id is the last one; keep it until after callback
                    // but we have no way to know - simply clear all except we have guarded via _handedOver
                    clearTimeout(id);
                }
                this.timers = [];
                // Lightweight cleanup of question stage visuals without full cleanup()
                // that could inadvertently hide the next scene. Do minimal reset.
                if (this.stage) {
                    this.stage.style.opacity = '';
                    this.stage.style.transform = '';
                    this.stage.style.filter = '';
                    this.stage.style.transition = '';
                    this.stage.classList.remove('is-visible', 'is-gate-opening');
                }
                // Clear decorative layers so they do not linger as hidden DOM weight
                if (this.starsEl) this.starsEl.innerHTML = '';
                if (this.particlesEl) this.particlesEl.innerHTML = '';
                if (this.input) this.input.value = '';
                this._setButtonEnabled(false);
                if (this.unlockBtn) {
                    this.unlockBtn.disabled = true;
                    this.unlockBtn.classList.remove('is-enabled');
                }
                this._clearFeedback();
                this.answerValid = false;
                this.busy = false;
                // Ensure the next scene (opening) can become interactive immediately
                // Force next tick so browser has applied hidden state before handover
                requestAnimationFrame(() => {
                    try { cb?.(); } catch (e) { console.warn('Question handover failed', e); }
                });
            });
        });
    }

    /* ---- Interaction ---- */

    _onTap(e) {
        // No auto-advance - only input and button handle interaction
        // Prevent tap on overlay from triggering unlock when busy
        if (this.busy) return;
        // If tap is on input or button, let it through
        if (e && e.target && (e.target.closest('.question-input') || e.target.closest('.question-unlock-btn'))) return;
    }

    _onKey(e) {
        if (e.target !== this.overlay && e.target !== this.input) return;
        if (e.key === 'Enter' || e.key === ' ') {
            // Only handle Enter on input when enough chars
            if (e.target === this.input) {
                const len = this.input.value.trim().length;
                if (len >= REQUIRED_LENGTH) {
                    e.preventDefault();
                    this._onUnlockClick(e);
                } else {
                    e.preventDefault();
                    this._shakeInput();
                }
                return;
            }
            if (e.target === this.overlay) {
                e.preventDefault();
            }
        }
    }

    /* ---- Decoration ---- */

    spawnStars() {
        if (!this.starsEl || this.reduced) return;

        for (let i = 0; i < STARS; i++) {
            const s = document.createElement('span');
            s.className = 'question-star';

            const size = 1 + Math.random() * 2;
            s.style.width = size + 'px';
            s.style.height = size + 'px';
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.setProperty('--dur', (2.5 + Math.random() * 3.5) + 's');
            s.style.setProperty('--delay', (-Math.random() * 4) + 's');
            s.style.setProperty('--o', (0.1 + Math.random() * 0.25).toFixed(2));

            this.starsEl.appendChild(s);
        }
    }

    spawnParticles() {
        if (!this.particlesEl || this.reduced) return;

        for (let i = 0; i < PARTICLES; i++) {
            const p = document.createElement('span');
            p.className = 'question-particle';

            const w = 6 + Math.random() * 8;
            p.style.width = w + 'px';
            p.style.height = (w * (1.3 + Math.random() * 0.3)) + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.setProperty('--dur', (8 + Math.random() * 6) + 's');
            p.style.setProperty('--delay', (-Math.random() * 10) + 's');
            p.style.setProperty('--sway', (Math.random() * 80 - 40) + 'px');
            p.style.setProperty('--rot', (60 + Math.random() * 180) + 'deg');
            p.style.setProperty('--o', (0.3 + Math.random() * 0.3).toFixed(2));

            this.particlesEl.appendChild(p);
        }
    }

    /* ---- Helpers / cleanup ---- */

    later(ms, fn) {
        const id = setTimeout(fn, ms);
        this.timers.push(id);
        return id;
    }

    cleanup() {
        this._focusToken += 1;
        if (this._focusFrame != null) {
            cancelAnimationFrame(this._focusFrame);
            this._focusFrame = null;
        }
        for (const id of this.timers) {
            clearTimeout(id);
        }
        this.timers = [];
        this._handedOver = false;

        if (this.starsEl) this.starsEl.innerHTML = '';
        if (this.particlesEl) this.particlesEl.innerHTML = '';
        
        // Reset input state
        if (this.input) {
            this.input.value = '';
        }
        this.answerValid = false;
        this.busy = false;
        this._setButtonEnabled(false);
        this._clearFeedback();

        // Reset stage and gate
        if (this.stage) {
            this.stage.classList.remove('is-visible', 'is-hidden', 'is-gate-opening');
            this.stage.style.opacity = '';
            this.stage.style.transform = '';
            this.stage.style.filter = '';
            this.stage.style.transition = '';
        }
        if (this.gateEl) {
            this.gateEl.hidden = true;
            this.gateEl.classList.remove('is-opening', 'is-open');
            this.gateEl.setAttribute('aria-hidden', 'true');
        }
        this.overlay?.classList.remove('is-gate-opening', 'is-gate-open');
        this.overlay?.classList.remove('is-keyboard');
        this.overlay?.style.removeProperty('--kb-inset');

        // Reset scenes - ensure remaining fields stay correctly positioned
        const elements = [
            this.lockIcon, this.heading, this.questionText,
            this.inputWrapper, this.unlockBtn, this.feedback
        ];
        
        elements.forEach(el => {
            if (el) {
                el.classList.remove('is-visible', 'is-hidden', 'is-enabled', 'unlocking', 'unlocked', 'shake');
                el.classList.remove('feedback-success', 'feedback-error', 'is-visible');
                el.style.opacity = '';
                el.style.transform = '';
                el.style.filter = '';
                el.style.transition = '';
            }
        });

        if (this.feedback) {
            this.feedback.innerHTML = '';
            this.feedback.setAttribute('aria-hidden', 'true');
        }
        // Ensure heading/question reset to visible base for next start
        this.heading?.classList.remove('is-hidden');
        this.questionText?.classList.remove('is-hidden');
    }

    destroy() {
        this.cleanup();
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this._boundOnViewportChange);
            window.visualViewport.removeEventListener('scroll', this._boundOnViewportChange);
        }
        this.input?.removeEventListener('input', this._boundOnInput);
        this.unlockBtn?.removeEventListener('click', this._boundOnUnlockClick);
        this.overlay?.removeEventListener('keydown', this._boundOnKey);
        this.overlay?.removeEventListener('click', this._boundOnTap);
        this.overlay = null;
        this.stage = null;
        this.lockIcon = null;
        this.heading = null;
        this.questionText = null;
        this.inputWrapper = null;
        this.input = null;
        this.underline = null;
        this.feedback = null;
        this.unlockBtn = null;
        this.unlockBtnText = null;
        this.unlockBtnIcon = null;
        this.starsEl = null;
        this.particlesEl = null;
        this.gateEl = null;
    }
}
