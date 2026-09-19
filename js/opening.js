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
              appears with a playful three-question MAIN/TUM
              lock. The existing "Kholo ❤️" CTA appears only
              after all three right answers, then it opens the
              existing letter ->
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
const AUTO_ADVANCE_MS = 10000;

const LETTER_QUESTIONS = [
    {
        lead: 'Baby, sach sach batana… 😌❤️',
        text: 'Main tumhe zyada tang or nakhre karta hu 😏\nYa tum zyada nakhre or tang karti ho mujhe 👀',
        correct: 'main',
    },
    {
        text: 'Bina wajah zyada attitude kaun dikhata hai? 😌👀',
        correct: 'tum',
    },
    {
        text: 'Fight ke time baat nahi karungi/karunga bolkar kon bich se hi chala jaata he',
        correct: 'main',
    },
];


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
        this.questionText = null;
        this.questionTitle = null;
        this.answerAck = null;
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
        this.letterUnlocked = false; // the final right answer unlocked the CTA
        this.letterReady = false;   // question controls finished entering
        this.selectedAnswer = null; // the picked answer (correct one wins)
        this.questionIndex = 0;
        this.questionTransitioning = false;
        this.runawayOffsets = new Map();
        this.runawayTarget = -1;
        this.runawayHistory = [];
        this.runawayMotion = 0;
        this.suppressAnswerClick = null;
        this.suppressAnswerUntil = 0;
        this.letterOpeningEvent = null; // the CTA event that opened the letter
        this.timers = [];
        this.autoAdvanceTimer = null;
        this._letterRun = 0;

        // Wired by main.js: called when the intro is complete so
        // the loading screen can hand over to the hero scene.
        this.onHandover = null;
        this.onDateGateComplete = null;
        this.hasCompletedDateGate = null;
        this.onMessageChange = null;

        // Stage hook for main.js (global Back button state machine):
        // called with 'love-letter' (the letter-gate is on screen)
        // and 'none' (the layer is finishing its exit).
        this.onStage = null;

        // Bound handlers
        this._onTap = (event) => this.advance(event);
        this._onKey = (e) => this.onKey(e);
        this._onAnswer = (e) => this.onAnswer(e);
        this._onAnswerPointerDown = (e) => this.onAnswerPointerDown(e);
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
        this.letterPaper = $('.letter-paper');
        this.letterInvite = $('#letter-invite');
        this.letterMessage = $('#letter-message');
        this.questionEl = $('#letter-question');
        this.questionText = this.questionEl?.querySelector('.letter-question-text');
        this.questionTitle = this.questionEl?.querySelector('.letter-question-title');
        this.answerAck = $('#letter-answer-ack');
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
        this.answersEl?.addEventListener('pointerdown', this._onAnswerPointerDown, { passive: false });

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

        // The intro owns the shared loading host now.
        $('#loading-screen')?.classList.add('is-lettering');

        this.spawnStars();
        this.spawnPetals();

        // Keyboard users can advance with Enter/Space
        this.overlay.focus({ preventScroll: true });

        // ISSUE FIX: the first page must never be a blank waiting
        // state. Begin the existing music + effects right away
        // (still inside the unlock gesture's activation chain,
        // dispatched exactly once) and reveal the first story line
        // - "Hello meri cute wife" - immediately with its existing
        // entrance animation. It then stays readable until the
        // user taps, exactly as before.
        if (!this.beginFired) {
            this.beginFired = true;
            window.dispatchEvent(new CustomEvent(BEGIN_EVENT, {
                detail: { from: 'opening' },
            }));
        }
        this.showMessage(0);
    }

    /* ---- Story progression (user-controlled) ---- */

    /**
     * One interaction step, driven by the user's tap (or Enter/Space).
     * The blank sky waits forever; the first tap begins the music
     * and reveals the first line; every following tap swaps the
     * current message for the next one. Taps during a transition
     * are ignored.
     */
    advance(event) {
        if (event?.target?.closest?.('#letter-cta, .letter-answer')) return;
        if (this.busy || this.finished || !this.started) return;

        this.clearAutoAdvance();

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
        } else if (this.state === 'letter' && this.letterOpened && event !== this.letterOpeningEvent) {
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
        this.onMessageChange?.(index);

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
            this.scheduleAutoAdvance();
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
        this.onMessageChange?.(index);

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
            this.scheduleAutoAdvance();
        });
    }

    /** Exit the current message, then present the next state */
    exitMessage() {
        const line = this.messageEl?.querySelector('.opening-message-text');
        if (!line) return;

        this.busy = true;
        this.onMessageChange?.(-1);
        this.clearAutoAdvance();
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
     * invitation below it. A playful MAIN/TUM lock enters with the
     * scene; Kholo appears after all three right answers and opens
     * the existing letter exactly as before.
     */
    showLetter() {
        const scene = this.letterScene;
        if (!scene) {
            // Additive safety: no letter markup, go to the reveal.
            this.finish();
            return;
        }

        this.state = 'letter';
        this.clearAutoAdvance();
        this.letterOpened = false;
        this.letterOpeningEvent = null;
        this.letterUnlocked = false;
        this.letterReady = false;
        this.selectedAnswer = null;
        this.questionIndex = 0;
        this.questionTransitioning = false;
        this.busy = true;

        // The letter-gate is on screen: the Back button stays hidden
        // here, but the scene is persisted for refresh restoration.
        this._fireStage('love-letter');

        // Every visit starts the small lock from its first question.
        this.resetLetterUi();
        this.renderQuestion();

        scene.setAttribute('aria-hidden', 'false');
        scene.classList.add('is-visible');
        this.letterInvite?.classList.add('is-in');
        this.questionEl?.classList.add('is-in');
        this.questionEl?.setAttribute('aria-hidden', 'false');
        this.answersEl?.focus({ preventScroll: true });

        this.settle(scene, this.reduced ? 0 : DURATIONS.letterSceneIn, () => {
            this.busy = false;
            // The two answers have settled and can now be picked.
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
    openLetter(event) {
        // ONLY the unlocked CTA reaches this point - the letter
        // stays closed otherwise.
        if (this.state !== 'letter' || this.letterOpened || this.busy || !this.letterUnlocked) return;
        this.letterOpened = true;
        this.letterOpeningEvent = event;
        this.busy = true;
        const run = this._letterRun;

        this.letterCard?.classList.add('is-opening');
        this.letterScene?.classList.add('is-open');
        // The destination is now mounted and visible. Persist its settled
        // equivalent immediately so a refresh during the opening animation
        // cannot fall back to the already-completed question gate.
        this._fireStage('opening-letter-message');

        // Wait for the actual paper animation before entering the
        // message stage. The markup uses .letter-paper, so this must
        // never be allowed to fall through as a missing transition.
        this.settle(this.letterPaper || this.letterCard, this.reduced ? 0 : DURATIONS.letterOpen, () => {
            if (run !== this._letterRun || !this.letterOpened || this.state !== 'letter') return;
            // The closed gate no longer participates in the message
            // composition, so the letter starts its opening centered.
            this.letterScene?.classList.add('is-message');
            this.letterMessage?.classList.add('is-in');
            this.settle(this.letterMessage, this.reduced ? 0 : DURATIONS.letterMessageIn, () => {
                if (run !== this._letterRun || !this.letterOpened || this.state !== 'letter') return;
                this.busy = false;
                this.overlay?.focus({ preventScroll: true });
                this.onDateGateComplete?.();
                this._fireStage('opening-letter-message');
            });
        });
    }

    /* ---- The romantic question gate (inside the letter scene) ---- */

    /** The one delegated answer path for click and keyboard input. */
    onAnswer(e) {
        const opt = e.target.closest('.letter-answer');
        if (!opt || !this.answersEl) return;
        e.stopPropagation();
        if (!this.canAnswer()) return;

        const question = this.currentQuestion();
        const choice = opt.dataset.choice;
        if (!question || !choice) return;

        // A compatibility click can arrive after pointerdown has moved this
        // button. It is still an explicitly wrong answer and must stop here.
        if (choice !== question.correct) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (this.isSuppressedWrongClick(opt)) {
                this.suppressAnswerClick = null;
                return;
            }
            this.suppressWrongClick(opt);
            this.runawayAnswer(opt);
            return;
        }

        e.preventDefault();
        this.acceptCorrectAnswer(opt);
    }

    /** Catch an incorrect touch before it can become a click. */
    onAnswerPointerDown(e) {
        const opt = e.target.closest('.letter-answer');
        if (!opt) return;
        e.stopPropagation();
        if (!this.canAnswer()) return;

        const question = this.currentQuestion();
        const choice = opt.dataset.choice;
        if (!question || !choice || choice === question.correct) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        this.suppressWrongClick(opt);
        this.runawayAnswer(opt, e.clientX, e.clientY);
    }

    suppressWrongClick(opt) {
        this.suppressAnswerClick = opt;
        this.suppressAnswerUntil = performance.now() + 800;
    }

    isSuppressedWrongClick(opt) {
        return this.suppressAnswerClick === opt && performance.now() < this.suppressAnswerUntil;
    }

    currentQuestion() {
        return LETTER_QUESTIONS[this.questionIndex] || null;
    }

    canAnswer() {
        return this.state === 'letter'
            && this.letterReady
            && !this.letterUnlocked
            && !this.busy
            && !this.questionTransitioning
            && Boolean(this.currentQuestion());
    }

    /** Populate the persistent two-button shell from the current quest. */
    renderQuestion() {
        const question = this.currentQuestion();
        if (!question) return;

        this.resetRunawayPositions();
        this.questionText.textContent = question.lead || '';
        this.questionText.hidden = !question.lead;
        this.questionTitle.textContent = question.text;
        this.hideAnswerAck(true);
        this.questionEl?.classList.remove('is-transitioning', 'is-entering', 'is-settled');
        this.answersEl?.classList.remove('is-exiting');
        this.answersEl?.removeAttribute('aria-busy');
        this.answersEl?.querySelectorAll('.letter-answer').forEach((btn) => {
            btn.classList.remove('is-selected', 'is-correct');
            btn.setAttribute('aria-pressed', 'false');
            btn.disabled = false;
        });
    }

    /** Accept a correct answer once, then let the next quest take its place. */
    acceptCorrectAnswer(opt) {
        if (!this.canAnswer()) return;

        this.questionTransitioning = true;
        this.letterReady = false;
        this.selectedAnswer = opt;
        opt.classList.add('is-selected', 'is-correct');
        opt.setAttribute('aria-pressed', 'true');
        this.answersEl?.setAttribute('aria-busy', 'true');
        this.answersEl?.querySelectorAll('.letter-answer').forEach((btn) => {
            btn.disabled = true;
        });

        const run = this._letterRun;
        this.later(this.reduced ? 0 : 200, () => {
            if (run !== this._letterRun || !this.questionTransitioning) return;
            this.resetRunawayPositions();
            this.questionEl?.classList.add('is-transitioning');
            this.later(this.reduced ? 0 : 280, () => {
                if (run !== this._letterRun || !this.questionTransitioning) return;

                this.showAnswerAck();
                this.later(this.reduced ? 0 : 500, () => {
                    if (run !== this._letterRun || !this.questionTransitioning) return;
                    this.hideAnswerAck();
                    this.later(this.reduced ? 0 : 160, () => {
                        if (run !== this._letterRun || !this.questionTransitioning) return;

                        // A completed visitor still answers Question 1, with
                        // its existing acknowledgement animation, but then
                        // re-enters the authoritative letter-opening method.
                        if (this.questionIndex === 0 && this.isDateGateReplay()) {
                            this.letterUnlocked = true;
                            this.questionEl?.classList.add('is-settled');
                            this.answersEl?.classList.add('is-exiting');
                            this.questionTransitioning = false;
                            this.letterReady = true;
                            this.openLetter();
                            return;
                        }

                        if (this.questionIndex === LETTER_QUESTIONS.length - 1) {
                            this.letterUnlocked = true;
                            this.questionEl?.classList.add('is-settled');
                            this.answersEl?.classList.add('is-exiting');
                            this.unlockCta();
                            this.questionTransitioning = false;
                            this.letterReady = true;
                            return;
                        }

                        this.questionIndex += 1;
                        this.renderQuestion();
                        if (this.reduced) {
                            this.questionTransitioning = false;
                            this.letterReady = true;
                            return;
                        }

                        this.questionEl?.classList.add('is-entering');
                        void this.questionEl?.offsetWidth;
                        requestAnimationFrame(() => {
                            if (run === this._letterRun) this.questionEl?.classList.remove('is-entering');
                        });
                        this.later(460, () => {
                            if (run !== this._letterRun || !this.questionTransitioning) return;
                            this.questionTransitioning = false;
                            this.letterReady = true;
                        });
                    });
                });
            });
        });
    }

    isDateGateReplay() {
        if (typeof this.hasCompletedDateGate !== 'function') return false;
        try {
            return this.hasCompletedDateGate() === true;
        } catch {
            return false;
        }
    }

    showAnswerAck() {
        if (!this.answerAck) return;
        this.answerAck.textContent = 'Sahi jawab ❤️';
        void this.answerAck.offsetWidth;
        this.answerAck.classList.add('is-visible');
    }

    hideAnswerAck(immediate = false) {
        if (!this.answerAck) return;
        this.answerAck.classList.remove('is-visible');
        if (immediate) this.answerAck.textContent = '';
    }

    /** Send an incorrect answer to a distant but controlled safe zone. */
    runawayAnswer(opt, pointerX, pointerY) {
        if (!opt || !this.canAnswer() || !this.letterScene || opt.dataset.choice === this.currentQuestion()?.correct) return;

        const current = this.runawayOffsets.get(opt) || { x: 0, y: 0 };
        const rect = opt.getBoundingClientRect();
        const homeLeft = rect.left - current.x;
        const homeTop = rect.top - current.y;
        const currentLeft = rect.left;
        const currentTop = rect.top;
        const viewport = window.visualViewport;
        const viewLeft = viewport?.offsetLeft ?? 0;
        const viewTop = viewport?.offsetTop ?? 0;
        const viewRight = viewLeft + (viewport?.width ?? window.innerWidth);
        const viewBottom = viewTop + (viewport?.height ?? window.innerHeight);
        const gateRect = this.questionEl?.getBoundingClientRect() || this.letterScene.getBoundingClientRect();
        const cardRect = this.letterCard?.getBoundingClientRect();
        const horizontalMargin = 18;
        const verticalMargin = 22;
        const left = Math.max(viewLeft + horizontalMargin, gateRect.left - 18);
        const top = Math.max(viewTop + verticalMargin, (cardRect?.bottom ?? gateRect.top) + 12);
        const right = Math.min(viewRight - horizontalMargin - rect.width, gateRect.right + 18 - rect.width);
        const bottom = Math.min(viewBottom - verticalMargin - rect.height,
            gateRect.bottom + Math.min(150, Math.max(72, (viewBottom - viewTop) * 0.18)) - rect.height);
        const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
        const sourceX = Number.isFinite(pointerX) ? pointerX : rect.left + rect.width / 2;
        const sourceY = Number.isFinite(pointerY) ? pointerY : rect.top + rect.height / 2;
        const obstacles = [
            this.questionText,
            this.questionTitle,
            this.letterCard,
            this.answersEl?.querySelector(`[data-choice="${this.currentQuestion()?.correct}"]`),
        ].filter(Boolean).map((el) => el.getBoundingClientRect());
        const overlapsObstacle = (x, y) => obstacles.some((obstacle) => {
            const gap = 12;
            return x < obstacle.right + gap
                && x + rect.width > obstacle.left - gap
                && y < obstacle.bottom + gap
                && y + rect.height > obstacle.top - gap;
        });
        const safeWidth = Math.max(0, right - left);
        const safeHeight = Math.max(0, bottom - top);
        const preferredTravel = Math.min(130, Math.max(80, (viewRight - viewLeft) * 0.25));
        const minimumTravel = Math.min(preferredTravel, Math.hypot(safeWidth, safeHeight) * 0.58);
        const zones = [
            { x: 0.08, y: 0.08, row: 0, col: 0 }, // upper left
            { x: 0.50, y: 0.03, row: 0, col: 1 }, // upper center
            { x: 0.92, y: 0.08, row: 0, col: 2 }, // upper right
            { x: 0.05, y: 0.48, row: 1, col: 0 }, // mid left
            { x: 0.95, y: 0.48, row: 1, col: 2 }, // mid right
            { x: 0.12, y: 0.90, row: 2, col: 0 }, // lower left
            { x: 0.50, y: 0.97, row: 2, col: 1 }, // lower center
            { x: 0.88, y: 0.90, row: 2, col: 2 }, // lower right
        ];
        const zoneRoutes = [
            [0, 7, 3, 2, 5, 4, 6, 1], // Q1: upper side first
            [4, 5, 2, 3, 7, 0, 6, 1], // Q2: right side first
            [5, 2, 6, 4, 0, 7, 3, 1], // Q3: lower-left first
        ];
        const zoneRoute = zoneRoutes[this.questionIndex] || zoneRoutes[0];
        const preferredZone = zoneRoute[Math.min(this.runawayHistory.length, zoneRoute.length - 1)];
        const zoneCandidates = zones.map((zone, index) => ({
            ...zone,
            index,
            x: clamp(left + safeWidth * zone.x, left, right),
            y: clamp(top + safeHeight * zone.y, top, bottom),
        }));
        const isSafe = (candidate, requiredTravel) => !overlapsObstacle(candidate.x, candidate.y)
            && Math.hypot(candidate.x - currentLeft, candidate.y - currentTop) >= requiredTravel;
        const candidates = zoneCandidates.filter((candidate) => isSafe(candidate, minimumTravel)
            && !this.runawayHistory.includes(candidate.index));
        const safeFallbacks = zoneCandidates.filter((candidate) => isSafe(candidate, minimumTravel * 0.7));
        const relaxedFallbacks = zoneCandidates.filter((candidate) => isSafe(candidate, minimumTravel * 0.35));
        const visibleFallbacks = zoneCandidates.filter((candidate) => !overlapsObstacle(candidate.x, candidate.y));
        const lastZone = zones[this.runawayTarget];
        const targetPool = candidates.length ? candidates : (safeFallbacks.length ? safeFallbacks
            : (relaxedFallbacks.length ? relaxedFallbacks : (visibleFallbacks.length ? visibleFallbacks : zoneCandidates)));
        const target = targetPool
            .map((candidate) => ({
                ...candidate,
                score: Math.hypot(candidate.x + rect.width / 2 - sourceX, candidate.y + rect.height / 2 - sourceY)
                    + Math.hypot(candidate.x - currentLeft, candidate.y - currentTop) * 1.25
                    + (candidate.index === preferredZone ? 700 : 0)
                    + Math.max(0, 7 - zoneRoute.indexOf(candidate.index)) * 22
                    - (this.runawayHistory.includes(candidate.index) ? 1000 : 0)
                    - (lastZone && Math.abs(candidate.row - lastZone.row) + Math.abs(candidate.col - lastZone.col) < 2 ? 160 : 0),
            }))
            .sort((a, b) => b.score - a.score)[0];
        if (!target) return;

        this.runawayTarget = target.index;
        this.runawayHistory = [...this.runawayHistory, target.index].slice(-3);
        const offset = { x: target.x - homeLeft, y: target.y - homeTop };
        this.runawayOffsets.set(opt, offset);
        const motion = ++this.runawayMotion;
        const run = this._letterRun;
        const commitTarget = () => {
            if (run !== this._letterRun || motion !== this.runawayMotion || !opt.classList.contains('is-runaway')) return;
            opt.style.setProperty('--run-x', `${offset.x}px`);
            opt.style.setProperty('--run-y', `${offset.y}px`);
            opt.style.setProperty('--run-rotate', `${target.index % 2 ? -1.5 : 1.5}deg`);
            requestAnimationFrame(() => {
                if (run === this._letterRun && motion === this.runawayMotion) {
                    opt.style.setProperty('--run-scale', '1');
                }
            });
            this.later(this.reduced ? 0 : 400, () => {
                if (run === this._letterRun && motion === this.runawayMotion) {
                    opt.classList.remove('is-escaping');
                }
            });
        };

        if (opt.classList.contains('is-runaway')) {
            opt.classList.add('is-escaping');
            opt.style.setProperty('--run-scale', '0.98');
            commitTarget();
            return;
        }

        // Commit the home pose before the destination variables change so the
        // first escape always interpolates instead of jumping to its endpoint.
        opt.style.setProperty('--run-x', '0px');
        opt.style.setProperty('--run-y', '0px');
        opt.style.setProperty('--run-rotate', '0deg');
        opt.style.setProperty('--run-scale', '0.98');
        opt.classList.add('is-runaway', 'is-escaping');
        void opt.offsetWidth;
        requestAnimationFrame(() => {
            requestAnimationFrame(commitTarget);
        });
    }

    resetRunawayPositions() {
        this.runawayOffsets.clear();
        this.runawayTarget = -1;
        this.runawayHistory = [];
        this.runawayMotion += 1;
        this.suppressAnswerClick = null;
        this.suppressAnswerUntil = 0;
        this.answersEl?.querySelectorAll('.letter-answer').forEach((btn) => {
            btn.classList.remove('is-runaway', 'is-escaping');
            btn.style.removeProperty('--run-x');
            btn.style.removeProperty('--run-y');
            btn.style.removeProperty('--run-rotate');
            btn.style.removeProperty('--run-scale');
        });
    }

    unlockCta() {
        if (!this.cta) return;

        this.cta.hidden = false;
        this.cta.setAttribute('aria-disabled', 'false');
        this.cta.tabIndex = 0;
        void this.cta.offsetWidth;
        this.cta.classList.add('is-unlocked');
        this.cta.focus({ preventScroll: true });
    }

    /**
     * The unlocked CTA opens the existing letter. The click never
     * bubbles, so the scene's own tap listener cannot fire a second time.
     */
    onCta(e) {
        e?.stopPropagation?.();

        if (this.state !== 'letter' || this.letterOpened || !this.letterUnlocked || !this.letterReady) return;

        e?.preventDefault?.();
        e?.stopImmediatePropagation?.();
        this.openLetter(e);
    }

    /** Every letter-scene visit starts with a clean slate */
    resetLetterUi() {
        this._letterRun += 1;
        this.letterOpeningEvent = null;
        this.letterScene?.classList.remove('is-message');
        this.hideAnswerAck(true);
        if (this.answersEl) {
            this.answersEl.querySelectorAll('.letter-answer').forEach((btn) => {
                btn.classList.remove('is-selected', 'is-correct');
                btn.setAttribute('aria-pressed', 'false');
                btn.disabled = false;
            });
        }
        this.resetRunawayPositions();
        if (this.cta) {
            this.cta.hidden = true;
            this.cta.classList.remove('is-unlocked');
            this.cta.style.transform = '';
            this.cta.setAttribute('aria-disabled', 'true');
            this.cta.tabIndex = -1;
        }
        this.answersEl?.classList.remove('is-exiting');
        this.questionIndex = 0;
        this.questionTransitioning = false;
    }

    scheduleAutoAdvance() {
        this.clearAutoAdvance();
        if (this.state !== 'message' || this.busy || this.finished || !this.started) return;
        this.autoAdvanceTimer = setTimeout(() => {
            this.autoAdvanceTimer = null;
            if (this.state === 'message' && !this.busy && !this.finished && this.started) {
                this.advance();
            }
        }, AUTO_ADVANCE_MS);
    }

    clearAutoAdvance() {
        if (this.autoAdvanceTimer !== null) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }
    }

    /** Fast-forward only the early messages to the existing letter gate. */
    resumeAtDateGate() {
        if (!this.overlay || !this.letterScene) return;

        this.clearTimers();
        this.busy = false;
        this.messageIndex = -1;
        this.messageEl?.replaceChildren();
        this.messageEl?.setAttribute('aria-hidden', 'true');
        this.showLetter();
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
        this.renderQuestion();

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

    /** Restore the fully opened short-letter page without replaying the gate. */
    restoreOpenedLetter() {
        if (!this.overlay || !this.letterScene) return false;

        const host = this.overlay.closest('#loading-screen');
        if (host) {
            host.hidden = false;
            host.classList.remove('is-leaving');
            host.classList.add('is-lettering');
        }

        this.clearTimers();
        this.resetLetterUi();

        this.finished = false;
        this.started = true;
        this.state = 'letter';
        this.busy = false;
        this.letterOpened = true;
        this.letterUnlocked = true;
        this.letterReady = true;
        this.selectedAnswer = null;

        this.messageEl?.replaceChildren();
        this.messageEl?.setAttribute('aria-hidden', 'true');
        this.overlay.hidden = false;
        this.overlay.classList.remove('is-leaving');
        this.overlay.classList.add('is-visible');

        this.letterScene.setAttribute('aria-hidden', 'false');
        this.letterScene.classList.add('is-visible', 'is-open', 'is-message');
        this.letterCard?.classList.add('is-opening');
        this.letterInvite?.classList.add('is-in');
        this.letterMessage?.classList.add('is-in');
        this.questionEl?.classList.remove('is-in', 'is-transitioning', 'is-entering', 'is-settled');
        this.questionEl?.setAttribute('aria-hidden', 'true');
        this.overlay.focus({ preventScroll: true });

        // A restored opening route has now reached the same valid settled
        // state as the original animation completion.
        this.onDateGateComplete?.();
        this._fireStage('opening-letter-message');
        return true;
    }

    /* ---- Handover ---- */

    /** Fade the layer away and hand the screen back to the app */
    finish() {
        if (this.finished || !this.overlay) return;
        this.finished = true;
        this.state = 'exiting';
        this.clearAutoAdvance();

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

    clearTimers() {
        this.clearAutoAdvance();
        for (const id of this.timers) {
            clearTimeout(id);
        }
        this.timers = [];
    }

    cleanup() {
        this.clearTimers();

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
        this.answersEl?.removeEventListener('pointerdown', this._onAnswerPointerDown);
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
        this.letterInvite = null;
        this.letterMessage = null;
        this.questionEl = null;
        this.questionText = null;
        this.questionTitle = null;
        this.answerAck = null;
        this.answersEl = null;
        this.cta = null;
    }

    /**
     * Reset the opening cinematic to its initial state so it can be
     * started again from the beginning. Used when the user chooses
     * "Return to Beginning" from a later stage.
     */
    reset() {
        this.started = false;
        this.finished = false;
        this.busy = false;
        this.state = 'idle';
        this.messageIndex = -1;
        this.letterOpened = false;
        this.letterUnlocked = false;
        this.letterReady = false;
        this.selectedAnswer = null;
        this.beginFired = false;

        this.clearTimers();

        // Reset DOM state
        if (this.overlay) {
            this.overlay.hidden = true;
            this.overlay.classList.remove('is-visible', 'is-leaving');
        }
        if (this.messageEl) {
            this.messageEl.innerHTML = '';
        }
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

        // Reset state flags
        this.started = false;
        this.finished = false;
        this.busy = false;
        this.state = 'idle';
        this.messageIndex = -1;
        this.letterOpened = false;
        this.letterUnlocked = false;
        this.letterReady = false;
        this.selectedAnswer = null;
        this.beginFired = false;
        this.revealStage = 'none';
    }
}
