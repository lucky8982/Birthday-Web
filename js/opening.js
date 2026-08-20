/* ============================================================
   Happy Birthday My Love 💙 - Cinematic Opening
   ------------------------------------------------------------
   File:    js/opening.js
   Purpose: A premium cinematic opening that plays once the
            loading screen reaches 100%, before the birthday
            reveal:
              blank midnight sky (twinkling stars, softly
              falling coral + jasmine petals, breathing
              light) -> the first tap starts the existing
              music + effects (BEGIN_EVENT) -> each tap
              reveals the next line of the story -> the
              final emotional passage reveals itself word
              by word -> the sealed love letter scene
              appears with a romantic question: the four
              answers and the "Kholo ❤️" CTA arrive, the
              CTA stays locked (it playfully dodges taps)
              until the right answer is picked, then it
              unlocks and opens the existing letter ->
the next tap hands over to the full-screen
               Birthday Reveal (5 -> 4 -> 3 -> 2 -> 1 ->
               "Happy Birthday, My Love ❤️" -> live age ->
               Memory Lane).
   Note:    Purely additive. If anything is missing the layer
            simply stays hidden and the normal flow continues
            ("Tap to Begin" fallback).
            The story is INTERACTION-DRIVEN: nothing advances
            by itself. The first screen is blank until the
            user taps; each message stays readable until the
            user taps again; only then does it exit, and only
            after the exit completes does the next message
            enter. Exactly ONE message is active at any time.
            Timers are used ONLY for animation durations
            (entrance/exit settle) - never to advance the
            story without user interaction.
            Reduced motion: same interaction sequence, no
            stars/petals, instant transitions.
   ============================================================ */

import { $, prefersReducedMotion } from './utils.js';
import { BEGIN_EVENT } from './loading-manager.js';


/* Animation durations (ms) - mirror the CSS transition/animation
   durations so the controller can wait for them. Reduced motion
   runs at 0 (CSS transitions/animations are disabled). */
const DURATIONS = {
    messageIn: 1100,    // .opening-message-text transition
    messageOut: 900,    // .opening-message-text.is-out transition
    letterSceneIn: 800, // .letter-scene transition
    letterOpen: 1500,   // flap + paper-rise settle
    letterMessageIn: 1200, // .letter-message transition
    fadeOut: 900,       // opening-out animation
};

const STARS = 70;      // twinkling starfield (subtle)
const PETALS = 10;     // coral + jasmine petals drifting down

const WORD_STEP = 95;  // ms between words in the emotional passage
const WORD_ANIM = 700; // ms each word takes to settle in


/* ============================================================
   Class: OpeningCinematic
   ------------------------------------------------------------
   Usage (from main.js):
     const opening = new OpeningCinematic();
     opening.init();                  // after the loading screen exists
     opening.onHandover = callback;   // called when the intro ends
     opening.start();                 // after loading.complete()
   ============================================================ */
export class OpeningCinematic {
    constructor() {
        // Cached elements (found at init time, may be null)
        this.overlay = null;
        this.starsEl = null;
        this.petalsEl = null;
        this.messageEl = null;
        this.letterScene = null;
        this.letterCard = null;
        this.letterPaper = null;
        this.letterInvite = null;
        this.letterMessage = null;
        this.questionEl = null;
        this.answersEl = null;
        this.cta = null;

        // The story, one line at a time. The date is the visual
        // focus of the sequence (its own big style), the night
        // time sits under it as a quiet subtitle. The final entry
        // is ONE emotional passage revealed word by word.
        this.messages = [
            { text: 'Hello meri cute wife🥰❤️...🦎🦎', cls: 'opening-line' },
            { text: 'Kaisi ho tum?', cls: 'opening-line' },
            { text: 'Mujhe pata hai tum bahut pyari ho❤️ 🦎🦎', cls: 'opening-line' },
            { text: 'Vese Tumhe yaad hai baby...', cls: 'opening-line' },
            { text: '01 • 12 • 2023', cls: 'opening-title' },
            { text: 'Novratri ke 7 ve yani (Saptami) ke Din', cls: 'opening-sub' },
            { passage: true },
        ];

        // ONE emotional passage (never split into tiny messages).
        // Each line keeps its own break; the words reveal
        // themselves one by one (see showPassage).
        this.passageLines = [
            'Raat 8:20 min par maine tumhe mazak mazak mein kuch likhne ko diya tha...',
            'Us din tumne ye socha tha,',
            'ki hamari kahani yahan tak pahuchegi.',
            'Mujhe pata hai,',
            'tumne bilkul nahi socha hoga...',
            'Mene bhi nahi socha tha,',
            'Lekin dekho,',
            'Aaj hum yahan hain ek sath.',
            'Vese us mazak se yaha tk ka safar kafi romanchk raha he baby,',
            'Kitni musibate aai, Kitni muskile aai lehin ,',
            'Tumhe pata he sub se baadi baat kya he,',
            'Hamne ek dusre ka sath kabhi nahi choda,',
            'Aur dekho aaj hum ek dusre ke sath he or ek dusre se itna pyaar karte hain. ❤️',
        ];

        this.reduced = prefersReducedMotion();
        this.started = false;
        this.finished = false;
        this.beginFired = false; // BEGIN_EVENT already dispatched (once)
        this.busy = false;       // an entrance/exit transition is in progress
        this.state = 'idle';     // 'idle' | 'message' | 'letter' | 'exiting'
        this.messageIndex = -1;  // current story message index
        this.letterOpened = false; // the sealed letter was opened
        this.letterUnlocked = false; // the right answer unlocked the CTA
        this.letterReady = false;   // question/answers/CTA finished entering
        this.selectedAnswer = null; // the picked answer (correct one wins)
        this.dodge = 0;             // CTA dodge direction counter
        this.timers = [];

        // Wired by main.js: called when the intro is complete so
        // the loading screen can hand over to the hero scene.
        this.onHandover = null;

        // Stage hook for main.js (global Back button state machine):
        // called with 'love-letter' (the letter-gate is on screen)
        // and 'none' (the layer is finishing its exit).
        this.onStage = null;

        // Bound handlers
        this._onTap = () => this.advance();
        this._onKey = (e) => this.onKey(e);
        this._onAnswer = (e) => this.onAnswer(e);
        this._onCta = (e) => this.onCta(e);
    }

    /* ---- Lifecycle ---- */

    /** Find and cache the opening elements from the page */
    init() {
        this.overlay = $('#opening-cinematic');
        if (!this.overlay) return;

        this.starsEl = $('#opening-stars');
        this.petalsEl = $('#opening-petals');
        this.messageEl = $('#opening-message');
        this.letterScene = $('#letter-scene');
        this.letterCard = $('#letter-card');
        this.letterPaper = $('#letter-paper');
        this.letterInvite = $('#letter-invite');
        this.letterMessage = $('#letter-message');
        this.questionEl = $('#letter-question');
        this.answersEl = $('#letter-answers');
        this.cta = $('#letter-cta');

        // One tap listener for the whole scene: the blank sky and
        // every message advance through the story. In the letter
        // scene the letter opens ONLY through the unlocked CTA.
        this.overlay.addEventListener('click', this._onTap);
        this.overlay.addEventListener('keydown', this._onKey);

        // The answers are one delegation point (no per-option
        // listeners, so they can never double up).
        this.answersEl?.addEventListener('click', this._onAnswer);

        // The continue CTA below the answers: its click never
        // bubbles to the scene, so it cannot double-navigate.
        this.cta?.addEventListener('click', this._onCta);

        // The letter itself is purely visual now - opening it is
        // exclusively the unlocked CTA's job.
        this.letterCard?.removeAttribute('role');
        this.letterCard?.removeAttribute('tabindex');
        this.letterCard?.removeAttribute('aria-label');
    }

    /**
     * Reveal the cinematic layer over the finished loading screen.
     * The first screen is completely blank - only the ambient sky
     * (stars + petals + breathing light) is visible until the
     * user touches.
     */
    start() {
        if (this.started || !this.overlay) return;
        this.started = true;

        this.overlay.hidden = false;
        void this.overlay.offsetWidth;
        this.overlay.classList.add('is-visible');

        // The intro owns the screen now - hide the fallback button
        const tap = $('#tap-to-begin');
        if (tap) tap.hidden = true;

        // The old loading content (title, progress, logo) must not
        // show through behind the sky - it carries the same
        // "Happy Birthday My Love" title as the reveal, so it would
        // duplicate the message on screen.
        $('#loading-screen')?.classList.add('is-lettering');

        this.spawnStars();
        this.spawnPetals();

        // Keyboard users can advance with Enter/Space
        this.overlay.focus({ preventScroll: true });

        // STATE 0: a blank, quiet sky waits for the first tap.
    }

    /* ---- Story progression (user-controlled) ---- */

    /**
     * One interaction step, driven by the user's tap (or Enter/Space).
     * The blank sky waits forever; the first tap begins the music
     * and reveals the first line; every following tap swaps the
     * current message for the next one. Taps during a transition
     * are ignored.
     */
    advance() {
        if (this.busy || this.finished || !this.started) return;

        if (this.state === 'idle') {
            // First touch: begin the existing music + background
            // effects inside this user gesture, exactly once.
            if (!this.beginFired) {
                this.beginFired = true;
                window.dispatchEvent(new CustomEvent(BEGIN_EVENT, {
                    detail: { from: 'opening' },
                }));
            }
            this.showMessage(0);
        } else if (this.state === 'message') {
            this.exitMessage();
        } else if (this.state === 'letter' && this.letterOpened) {
            // The letter has been read: hand over to the birthday reveal.
            this.finish();
        }
        // 'letter' before the letter is opened: taps never advance
        // here - the question gate owns this stage, and only the
        // unlocked CTA (or the final tap after it opened) moves on.
    }

    /* ---- Story messages ---- */

    /** Present message `index`; only that one is ever on screen */
    showMessage(index) {
        const el = this.messageEl;
        if (!el) return;

        const msg = this.messages[index];
        if (msg.passage) {
            this.showPassage(index);
            return;
        }

        this.messageIndex = index;
        this.state = 'message';
        this.busy = true;

        const line = document.createElement('p');
        line.className = 'opening-message-text ' + msg.cls;
        line.textContent = msg.text;
        // Only the message is cleared - nothing else lives inside
        // #opening-message.
        el.querySelectorAll('.opening-message-text').forEach((n) => n.remove());
        el.appendChild(line);
        el.setAttribute('aria-hidden', 'false');

        // The line enters in its final typography (fade + blur +
        // scale settle) and stays readable until the next tap.
        void line.offsetWidth;
        line.classList.add('is-in');

        // Keyboard users advance with Enter/Space again
        this.overlay.focus({ preventScroll: true });

        this.settle(line, this.reduced ? 0 : DURATIONS.messageIn, () => {
            this.busy = false;
        });
    }

    /**
     * The final emotional passage: ONE message whose words reveal
     * themselves one after another (staggered fade/blur/scale).
     * The user simply watches - taps are ignored while the words
     * are still arriving. Once the last word has settled, the
     * passage stays fully visible and waits for the next tap.
     */
    showPassage(index) {
        const el = this.messageEl;
        if (!el) return;

        this.messageIndex = index;
        this.state = 'message';
        this.busy = true;

        const line = document.createElement('p');
        line.className = 'opening-message-text opening-passage';
        line.style.setProperty('--word-step', (this.reduced ? 0 : WORD_STEP) + 'ms');

        let wordCount = 0;
        let lastWord = null;
        this.passageLines.forEach((text, li) => {
            if (li > 0) line.appendChild(document.createElement('br'));
            text.split(' ').forEach((token) => {
                const word = document.createElement('span');
                word.className = 'opening-passage-word';
                word.style.setProperty('--i', wordCount);
                word.textContent = token;
                line.appendChild(word);
                line.appendChild(document.createTextNode(' '));
                lastWord = word;
                wordCount += 1;
            });
        });

        // Only the message is cleared - nothing else lives inside
        // #opening-message.
        el.querySelectorAll('.opening-message-text').forEach((n) => n.remove());
        el.appendChild(line);
        el.setAttribute('aria-hidden', 'false');
        void line.offsetWidth;
        line.classList.add('is-in');

        this.overlay.focus({ preventScroll: true });

        // Busy until the very last word has finished entering, so
        // taps during the reveal are ignored (the passage plays
        // itself). Reduced motion: everything appears instantly.
        this.settle(lastWord, this.reduced ? 0 : wordCount * WORD_STEP + WORD_ANIM, () => {
            this.busy = false;
        });
    }

    /** Exit the current message, then present the next state */
    exitMessage() {
        const line = this.messageEl?.querySelector('.opening-message-text');
        if (!line) return;

        this.busy = true;
        line.classList.remove('is-in');
        line.classList.add('is-out');
        this.messageEl?.setAttribute('aria-hidden', 'true');

        this.settle(line, this.reduced ? 0 : DURATIONS.messageOut, () => {
            this.busy = false;
            if (this.messageIndex < this.messages.length - 1) {
                // STATE N+1: the next line enters only after the
                // previous one has completely left.
                this.showMessage(this.messageIndex + 1);
            } else {
                // The final line has been read: the sealed love
                // letter takes the stage next.
                this.showLetter();
            }
        });
    }

    /* ---- The sealed love letter (after the story) ---- */

    /**
     * Reveal the letter scene: the story is fully gone, the sky
     * stays alive, and a closed, sealed letter floats with a short
     * invitation below it. A romantic question + four answers and
     * the locked "Kholo ❤️" CTA enter together - the letter only
     * opens once the correct answer is picked and the CTA pressed.
     */
    showLetter() {
        const scene = this.letterScene;
        if (!scene) {
            // Additive safety: no letter markup, go to the reveal.
            this.finish();
            return;
        }

        this.state = 'letter';
        this.letterOpened = false;
        this.letterUnlocked = false;
        this.letterReady = false;
        this.selectedAnswer = null;
        this.busy = true;

        // The letter-gate is on screen: the Back button stays hidden
        // here, but the scene is persisted for refresh restoration.
        this._fireStage('love-letter');

        // Every visit starts clean: no picked answer, locked CTA.
        this.resetLetterUi();

        scene.setAttribute('aria-hidden', 'false');
        scene.classList.add('is-visible');
        this.letterInvite?.classList.add('is-in');
        this.questionEl?.classList.add('is-in');
        this.questionEl?.setAttribute('aria-hidden', 'false');
        this.answersEl?.focus({ preventScroll: true });

        this.settle(scene, this.reduced ? 0 : DURATIONS.letterSceneIn, () => {
            this.busy = false;
            // The question, the answers and the locked CTA all have
            // their own staggered entrance - only then may answers
            // be picked and the CTA dodge.
            this.later(this.reduced ? 0 : 750, () => {
                this.letterReady = true;
            });
        });
    }

    /**
     * Open the letter: the flap lifts, the seal fades, the paper
     * rises with a warm light spread, and the short message enters
     * with a soft paragraph reveal. It stays open and readable -
     * only the user's next tap moves on to the birthday reveal.
     */
    openLetter() {
        // ONLY the unlocked CTA reaches this point - the letter
        // stays closed otherwise.
        if (this.state !== 'letter' || this.letterOpened || this.busy || !this.letterUnlocked) return;
        this.letterOpened = true;
        this.busy = true;

        this.letterCard?.classList.add('is-opening');
        this.letterScene?.classList.add('is-open');

        this.settle(this.letterPaper, this.reduced ? 0 : DURATIONS.letterOpen, () => {
            this.letterMessage?.classList.add('is-in');
            this.settle(this.letterMessage, this.reduced ? 0 : DURATIONS.letterMessageIn, () => {
                this.busy = false;
                this.overlay?.focus({ preventScroll: true });
            });
        });
    }

    /* ---- The romantic question gate (inside the letter scene) ---- */

    /**
     * One tap on any answer: highlight it. The right answer
     * ("01 December 2023") settles the question and unlocks the
     * CTA; a wrong answer shakes softly and is free to retry.
     */
    onAnswer(e) {
        const opt = e.target.closest('.letter-answer');
        if (!opt || !this.answersEl) return;

        // Never bubble to the scene: the letter cannot open from
        // tapping an option, and the overlay cannot double-advance.
        e.stopPropagation();

        if (this.state !== 'letter' || !this.letterReady || this.letterUnlocked || this.busy) return;

        const correct = opt.getAttribute('data-correct') === 'true';
        opt.classList.add('is-selected');
        opt.setAttribute('aria-pressed', 'true');

        if (correct) {
            this.letterUnlocked = true;
            this.selectedAnswer = opt;
            opt.classList.add('is-correct');
            this.questionEl?.classList.add('is-settled');
            this.unlockCta();
        } else {
            opt.classList.add('is-wrong');
            // Nothing is locked: the wrong pick can be tried again.
            this.later(this.reduced ? 0 : 650, () => {
                opt.classList.remove('is-selected', 'is-wrong');
                opt.setAttribute('aria-pressed', 'false');
            });
        }
    }

    /** The right answer was picked: unlock the "Kholo ❤️" CTA */
    unlockCta() {
        if (!this.cta) return;

        // Dodge stops immediately; the button becomes stable.
        this.cta.classList.remove('is-dodging');
        this.cta.style.transform = '';
        this.cta.setAttribute('aria-disabled', 'false');
        this.cta.tabIndex = 0;
        void this.cta.offsetWidth;
        this.cta.classList.add('is-unlocked');
        this.cta.focus({ preventScroll: true });
    }

    /**
     * The CTA click: while locked it playfully dodges away (the
     * press is not accepted); once unlocked it opens the existing
     * letter. The click never bubbles, so the scene's own tap
     * listener cannot fire a second time.
     */
    onCta(e) {
        e?.stopPropagation?.();

        if (this.state !== 'letter' || this.letterOpened) return;

        if (!this.letterUnlocked || !this.letterReady) {
            e?.preventDefault?.();
            this.dodgeCta();
            return;
        }

        this.openLetter();
    }

    /**
     * A short, smooth dodge - a different direction each attempt,
     * always clamped inside the scene so it never leaves the
     * viewport. Never random-chaotic, never fast.
     */
    dodgeCta() {
        if (this.reduced || !this.cta || !this.overlay) return;

        const r = this.cta.getBoundingClientRect();
        const maxX = Math.max(0, this.overlay.clientWidth - r.width);
        const maxY = Math.max(0, this.overlay.clientHeight - r.height);

        const dir = this.dodge % 4;
        this.dodge += 1;
        const dirX = [1, -1, 1, -1];
        const dirY = [-1, -1, 1, 1];
        const mag = Math.min(72, Math.max(26, Math.min(maxX, maxY) * 0.14));

        const dx = Math.min(maxX, Math.max(-maxX, dirX[dir] * mag * (0.85 + Math.random() * 0.3)));
        const dy = Math.min(maxY, Math.max(-maxY, dirY[dir] * mag * (0.5 + Math.random() * 0.3)));

        this.cta.classList.add('is-dodging');
        this.cta.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + (dir % 2 === 0 ? 2 : -2) + 'deg)';

        // Return gently after the dodge - unless the CTA was
        // unlocked in the meantime (then it stays stable).
        this.later(440, () => {
            if (!this.letterUnlocked && this.cta) {
                this.cta.classList.remove('is-dodging');
                this.cta.style.transform = '';
            }
        });
    }

    /** Every letter-scene visit starts with a clean slate */
    resetLetterUi() {
        if (this.answersEl) {
            this.answersEl.querySelectorAll('.letter-answer').forEach((btn) => {
                btn.classList.remove('is-selected', 'is-correct', 'is-wrong');
                btn.setAttribute('aria-pressed', 'false');
            });
        }
        if (this.cta) {
            this.cta.classList.remove('is-unlocked', 'is-dodging');
            this.cta.style.transform = '';
            this.cta.setAttribute('aria-disabled', 'true');
            this.cta.tabIndex = -1;
        }
        this.dodge = 0;
    }

    /* ---- Restore (global Back button) ---- */

    /* Notify main.js (global Back button state machine) which stage
       is on screen. Never throws - a broken hook must not take the
       opening down. */
    _fireStage(stage) {
        if (typeof this.onStage !== 'function') return;
        try {
            this.onStage(stage);
        } catch (error) {
            console.warn('Opening stage hook failed.', error);
        }
    }

    /**
     * Bring the letter-gate back on screen (used by the global Back
     * button from the Birthday Reveal). The story stays
     * finished; only the question scene is re-shown, fully reset
     * and ready to answer again. The next "Kholo ❤️" press opens
     * the letter, and the final tap hands over to the reveal as
     * before.
     */
    restoreLetterGate() {
        if (!this.overlay) return;

        // The letter-gate lives inside the loading screen; once the
        // reveal has run that screen is hidden, so bring it back as
        // the gate's backdrop and dim its content so nothing of the
        // loading screen leaks through the gate.
        const host = this.overlay.closest('#loading-screen');
        if (host) {
            host.hidden = false;
            host.classList.add('is-lettering');
        }

        // Back to the letter stage with a clean slate; the reveal
        // was fully canceled by main.js before this is called.
        this.finished = false;
        this.state = 'letter';
        this.busy = false;
        this.started = true;
        this.letterOpened = false;
        this.letterUnlocked = false;
        this.letterReady = false;
        this.selectedAnswer = null;

        this.resetLetterUi();

        // The layer re-enters over the app (the reveal is already
        // hidden by the time Back is pressed).
        this.overlay.hidden = false;
        this.overlay.classList.remove('is-leaving');
        void this.overlay.offsetWidth;
        this.overlay.classList.add('is-visible');

        const scene = this.letterScene;
        if (scene) {
            scene.setAttribute('aria-hidden', 'false');
            scene.classList.remove('is-open');
            scene.classList.add('is-visible');
            this.letterInvite?.classList.add('is-in');
            this.questionEl?.classList.add('is-in');
            this.questionEl?.setAttribute('aria-hidden', 'false');
        }

        // The question gate becomes interactive almost immediately
        // (a short settle, faster than the first visit's stagger).
        this.later(this.reduced ? 0 : 400, () => {
            this.letterReady = true;
        });

        this.answersEl?.focus({ preventScroll: true });

        // Re-persist the Love Letter state (Back pressed -> gate).
        this._fireStage('love-letter');
    }

    /* ---- Handover ---- */

    /** Fade the layer away and hand the screen back to the app */
    finish() {
        if (this.finished || !this.overlay) return;
        this.finished = true;
        this.state = 'exiting';

        // The gate is leaving: the reveal takes over next and reports
        // its own stages from here on.
        this._fireStage('none');

        this.overlay.classList.remove('is-visible');
        this.overlay.classList.add('is-leaving');

        this.later(this.reduced ? 60 : DURATIONS.fadeOut, () => {
            this.overlay.hidden = true;
            this.overlay.classList.remove('is-leaving');
            this.cleanup();
            this.onHandover?.();
        });
    }

    /* ---- Interaction helpers ---- */

    /** Keyboard support: Enter/Space advance the story */
    onKey(e) {
        // Only the scene itself (not bubbled events from children)
        if (e.target !== this.overlay) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.advance();
        }
    }

    /**
     * Wait for one entrance/exit transition to finish before the
     * story can continue. `duration` is 0 under reduced motion,
     * where CSS transitions/animations are disabled - in that
     * case the settle happens immediately (the state sequence is
     * unchanged, only the motion is removed).
     */
    settle(el, duration, fn) {
        if (!el || !duration) {
            fn();
            return;
        }

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            el.removeEventListener('transitionend', onEnd);
            el.removeEventListener('animationend', onEnd);
            clearTimeout(fallback);
            fn();
        };
        const onEnd = (e) => {
            if (e.target === el) finish();
        };

        el.addEventListener('transitionend', onEnd);
        el.addEventListener('animationend', onEnd);
        const fallback = setTimeout(finish, duration + 250);
        this.timers.push(fallback);
    }

    /* ---- Decoration ---- */

    /** Very subtle glowing stars that twinkle continuously */
    spawnStars() {
        if (!this.starsEl || this.reduced) return;

        for (let i = 0; i < STARS; i++) {
            const s = document.createElement('span');
            s.className = 'opening-star';

            const size = 1 + Math.random() * 2.2;
            s.style.width = size + 'px';
            s.style.height = size + 'px';
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.setProperty('--dur', (2.4 + Math.random() * 4) + 's');
            s.style.setProperty('--delay', (-Math.random() * 6) + 's');
            s.style.setProperty('--o', (0.12 + Math.random() * 0.3).toFixed(2));

            this.starsEl.appendChild(s);
        }
    }

    /** Coral and white jasmine petals drifting gently down */
    spawnPetals() {
        if (!this.petalsEl || this.reduced) return;

        for (let i = 0; i < PETALS; i++) {
            const p = document.createElement('span');
            p.className = 'opening-petal ' +
                (i % 2 === 0 ? 'opening-petal-coral' : 'opening-petal-jasmine');

            const w = 9 + Math.random() * 9;
            p.style.width = w + 'px';
            p.style.height = (w * (1.25 + Math.random() * 0.4)) + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.setProperty('--dur', (9 + Math.random() * 8) + 's');
            p.style.setProperty('--delay', (-Math.random() * 14) + 's');
            p.style.setProperty('--sway', (Math.random() * 120 - 60) + 'px');
            p.style.setProperty('--rot', (80 + Math.random() * 200) + 'deg');
            p.style.setProperty('--o', (0.5 + Math.random() * 0.35).toFixed(2));

            this.petalsEl.appendChild(p);
        }
    }

    /* ---- Helpers / cleanup ---- */

    later(ms, fn) {
        const id = setTimeout(fn, ms);
        this.timers.push(id);
        return id;
    }

    cleanup() {
        for (const id of this.timers) {
            clearTimeout(id);
        }
        this.timers = [];

        // The intro is done - the loading screen may return to its
        // normal state (it is hidden by the loading manager anyway).
        $('#loading-screen')?.classList.remove('is-lettering');

        if (this.starsEl) this.starsEl.innerHTML = '';
        if (this.petalsEl) this.petalsEl.innerHTML = '';
        if (this.messageEl) this.messageEl.innerHTML = '';

        // The letter scene resets to its closed, hidden state so
        // nothing of it can leak into the birthday reveal.
        if (this.letterScene) {
            this.letterScene.classList.remove('is-visible', 'is-open');
            this.letterScene.setAttribute('aria-hidden', 'true');
        }
        this.letterCard?.classList.remove('is-opening');
        this.letterInvite?.classList.remove('is-in');
        this.letterMessage?.classList.remove('is-in');
        this.questionEl?.classList.remove('is-in', 'is-settled');
        this.questionEl?.setAttribute('aria-hidden', 'true');
        this.resetLetterUi();

        this.letterUnlocked = false;
        this.letterReady = false;
        this.selectedAnswer = null;
    }

    destroy() {
        this.cleanup();
        this.overlay?.removeEventListener('click', this._onTap);
        this.overlay?.removeEventListener('keydown', this._onKey);
        this.answersEl?.removeEventListener('click', this._onAnswer);
        this.cta?.removeEventListener('click', this._onCta);
        this.overlay = null;
        this.starsEl = null;
        this.petalsEl = null;
        this.messageEl = null;
        this.letterScene = null;
        this.letterCard = null;
        this.letterPaper = null;
        this.letterInvite = null;
        this.letterMessage = null;
        this.questionEl = null;
        this.answersEl = null;
        this.cta = null;
    }
}