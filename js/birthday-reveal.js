/* ============================================================
   Happy Birthday My Love 💙 - Birthday Reveal
   ------------------------------------------------------------
   File:    js/birthday-reveal.js
   Purpose: Plays the birthday moment right after the love letter
            opens, as its own full-screen cinematic scene before
            the Memory Lane handoff:
            Birthday Love Letter (read by her; the countdown waits
            for her "Aage Badho ❤️" press) -> 5 -> 4 -> 3 -> 2 -> 1
            -> candles ignite -> balloons float + burst ->
            "Happy Birthday, My Love ❤️" -> live age display.
            The title and the live age STAY on screen indefinitely.
            There is no automatic exit and no auto handoff - the
            only way forward is the "Aage Badho ❤️" button, and
            play() resolves only when that button is pressed.
            The age is always computed from the browser's real
            current time (Date.now(), refreshed every second) so
            it stays exact no matter when the site is opened.
Note:    Pure additive overlay - if #birthday-reveal is
            missing, play() resolves immediately and the
            original flow continues unchanged. Reduced-motion
            users get the same sequence with calmer timing and
            no stars / heartbeat waves (animations themselves
            are disabled in CSS).
            The sequence is modular: a future love-message
            stage can be awaited via loveMessageStage after the
            continue button, before the Memory Lane handoff,
            without touching the rest of the flow.
   ============================================================ */

import { sleep, prefersReducedMotion } from './utils.js';

/* ------------------------------------------------------------
   Birth moment: 21 Sep 2007, 01:30:00 IST (Asia/Kolkata).
   IST is UTC+5:30 with no DST, so the instant is fixed forever:
   UTC 2007-09-20T20:00:00Z. Interpreting the wall-clock in a
   fixed offset keeps the result identical on every device,
   regardless of the user's locale/timezone.
   ------------------------------------------------------------ */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function birthTimestampIST() {
    return Date.UTC(2003, 8, 21, 1, 30, 0) - IST_OFFSET_MS;
}

/* Wall-clock components of t expressed in IST calendar terms.
   Shifting by +5:30h and reading UTC getters yields the IST
   wall clock - exact and locale-independent. */
function istParts(t) {
    const d = new Date(t + IST_OFFSET_MS);
    return {
        y: d.getUTCFullYear(),
        m: d.getUTCMonth(),
        d: d.getUTCDate(),
        h: d.getUTCHours(),
        min: d.getUTCMinutes(),
        s: d.getUTCSeconds(),
    };
}

/* True when calendar instant a is strictly before b */
function isBefore(a, b) {
    return (a.y < b.y) ||
        (a.y === b.y && a.m < b.m) ||
        (a.y === b.y && a.m === b.m && a.d < b.d) ||
        (a.y === b.y && a.m === b.m && a.d === b.d && a.h < b.h) ||
        (a.y === b.y && a.m === b.m && a.d === b.d && a.h === b.h && a.min < b.min) ||
        (a.y === b.y && a.m === b.m && a.d === b.d && a.h === b.h && a.min === b.min && a.s < b.s);
}

/* ------------------------------------------------------------
   Calendar-aware age: completed years first, then completed
   calendar months after the year anchor, then the remaining
   weeks / days / hours / minutes / seconds after the month
   anchor. No fixed-duration month/day assumptions.
   ------------------------------------------------------------ */
export function ageParts(now = Date.now()) {
    const cur = istParts(now);
    const birth = istParts(birthTimestampIST());

    /* Completed calendar years */
    let years = cur.y - birth.y;
    if (isBefore(cur, { ...birth, y: birth.y + years })) years--;

    /* Completed calendar months after the year anchor */
    const yearAnchor = { ...birth, y: birth.y + years };
    let months = (cur.y - yearAnchor.y) * 12 + (cur.m - yearAnchor.m);
    let m = yearAnchor.m + months;
    let monthAnchor = {
        y: yearAnchor.y + Math.floor(m / 12),
        m: ((m % 12) + 12) % 12,
        d: yearAnchor.d,
        h: yearAnchor.h,
        min: yearAnchor.min,
        s: yearAnchor.s,
    };
    if (isBefore(cur, monthAnchor)) {
        months--;
        m = yearAnchor.m + months;
        monthAnchor = {
            y: yearAnchor.y + Math.floor(m / 12),
            m: ((m % 12) + 12) % 12,
            d: yearAnchor.d,
            h: yearAnchor.h,
            min: yearAnchor.min,
            s: yearAnchor.s,
        };
    }

    /* Remaining time since the month anchor */
    const anchorTs = Date.UTC(
        monthAnchor.y, monthAnchor.m, monthAnchor.d,
        monthAnchor.h, monthAnchor.min, monthAnchor.s
    ) - IST_OFFSET_MS;
    const rest = Math.max(0, now - anchorTs);

    const daysTotal = Math.floor(rest / 86400000);
    return {
        years,
        months,
        weeks: Math.floor(daysTotal / 7),
        days: daysTotal % 7,
        hours: Math.floor(rest / 3600000) % 24,
        minutes: Math.floor(rest / 60000) % 60,
        seconds: Math.floor(rest / 1000) % 60,
    };
}

/* Countdown steps: the number plus one micro line per step.
   The sequence is explicit and fixed: 5 -> 4 -> 3 -> 2 -> 1,
   in exactly this order, never starting elsewhere. */
const COUNT_STEPS = [
    { n: 5, text: 'Bas kuch hi pal...' },
    { n: 4, text: 'Char kadam aur...' },
    { n: 3, text: 'Ek pal aur...' },
    { n: 2, text: 'Bas thoda sa...' },
    { n: 1, text: 'Ab sirf tum...' },
];

/* Countdown pacing - one full cycle per number (≈2.0s):
     count-emerge (CSS)  + READ hold  + count-dissolve (CSS)
     0.55s               + 1.05s      + 0.45s               ≈ 2.05s
   The next number never starts before the previous one has
   finished its dissolve phase. Reduced motion keeps a calm
   readable hold (CSS animations are off, so no in/out wait). */
const STEP_READ = 1050; // number stays readable after entering
const STEP_OUT = 450;   // dissolve duration (matches count-dissolve)

export class BirthdayReveal {
    constructor() {
        this.layer = document.querySelector('#birthday-reveal');
        this.count = this.layer?.querySelector('.birthday-reveal-count');
        this.micro = this.layer?.querySelector('.birthday-reveal-micro');
        this.final = this.layer?.querySelector('.birthday-reveal-final');
        this.age = this.layer?.querySelector('.birthday-reveal-age');
        this.sky = this.layer?.querySelector('.birthday-reveal-sky');
        this.wave = this.layer?.querySelector('.birthday-reveal-wave');
        this.continueBtn = this.layer?.querySelector('.birthday-reveal-continue');
        this.letterStage = this.layer?.querySelector('#birthday-reveal-letter');
        this.letterBtn = this.letterStage?.querySelector('#birthday-reveal-letter-btn');
        this.letterBody = this.letterStage?.querySelector('.birthday-reveal-letter-body');
        this.candlesEl = this.layer?.querySelector('#birthday-reveal-candles');
        this.balloonsEl = this.layer?.querySelector('#birthday-reveal-balloons');
        this.reduced = prefersReducedMotion();
        this.playing = false;
        this.ageTimer = null;
        this._resolveContinue = null;
        this._resolveLetter = null;
        this._canceled = false; // set by destroy(): stop any running sequence
        this._onContinue = () => this._continue();
        this._onLetterContinue = () => this._letterContinue();
        // Toggles .is-at-end on the letter stage when the message is
        // scrolled to its end (removes the bottom fade cue). Passive,
        // single listener, attached once - never per play().
        this._onLetterScroll = () => {
            const body = this.letterBody;
            if (!body) return;
            const remaining = body.scrollHeight - body.scrollTop - body.clientHeight;
            this.letterStage?.classList.toggle('is-at-end', remaining < 24);
        };
        this.letterBody?.addEventListener('scroll', this._onLetterScroll, { passive: true });

        // Future love-message insertion point: set this to an async
        // stage (e.g. () => showMessageScene()) and it is awaited
        // after the continue button, before the Memory Lane handoff.
        // Null means skipped - nothing is shown, the flow is unchanged.
        this.loveMessageStage = null;

        // Stage hook for main.js (global Back button): called with
        // 'letter' (letter on screen), 'countdown' (numbers showing)
        // and 'final' (title + age + continue on screen).
        this.onStage = null;
    }

    init() {
        // The sequence is fully driven by play() - nothing to wire.
    }

    /**
     * Play the full reveal. Resolves ONLY when the user presses
     * "Aage Badho ❤️" (or the layer is missing). Never throws:
     * a missing layer simply skips the sequence.
     */
    async play() {
        if (!this.layer || this.playing) return;
        this.playing = true;
        this._canceled = false;

        const pauseMs = this.reduced ? 300 : 500;   // pause after "1"
        const celebrationMs = this.reduced ? 0 : 1500; // candles + balloons
        const burstMs = this.reduced ? 0 : 850;     // balloon pop moment

        // The reveal is its own full-screen cinematic scene: fade in over
        // the fading letter overlay; everything behind is fully covered.
        this.layer.hidden = false;
        this.layer.removeAttribute('aria-hidden');
        this.layer.classList.add('is-visible');
        this._spawnStars();

        // 1. BIRTHDAY LOVE LETTER - she reads the message first. The
        //    countdown NEVER starts while the message is visible: it
        //    waits for her "Aage Badho ❤️" press, and only then does
        //    the letter completely leave the visual stack.
        this._showLetter();
        this._fireStage('letter');
        await this._waitForLetter();
        if (this._canceled) {
            await this._cancelSequence();
            return;
        }
        await this._hideLetter();
        this._fireStage('countdown');

        // 2. Countdown 5 -> 4 -> 3 -> 2 -> 1. One explicit cycle per
        //    number: enters (blur -> focus -> heartbeat), stays readable,
        //    dissolves, and only then does the next number begin.
        //    Title, age, candles and balloons stay hidden throughout.
        for (const step of COUNT_STEPS) {
            if (this._canceled) break;
            await this._playCountStep(step);
        }
        if (this._canceled) {
            await this._cancelSequence();
            return;
        }

        // 3. The celebration: a short pause, then warm birthday light,
        //    candles ignite and balloons rise into the scene. A small
        //    burst pops a couple of balloons as the title reveals.
        await sleep(pauseMs);
        if (this._canceled) {
            await this._cancelSequence();
            return;
        }
        this.layer.classList.add('is-celebrating');
        this._spawnCandles();
        this._spawnBalloons();
        await sleep(celebrationMs);
        if (this._canceled) {
            await this._cancelSequence();
            return;
        }
        this._popBalloons();
        await sleep(burstMs);
        if (this._canceled) {
            await this._cancelSequence();
            return;
        }

        // 4. The final stage ("Happy Birthday, My Love ❤️" + live age
        //    + "Aage Badho ❤️"). From here on the scene stays on
        //    screen indefinitely - the only way forward is the
        //    continue button, which resolves this stage.
        await this._showFinalStage();
    }

    /* The final stage: the title, the live age and the continue
       button. Used by play() and re-shown by showFinal() when the
       visitor returns from Memory Lane. Resolves only when the
       continue button is pressed (or the sequence is canceled). */
    async _showFinalStage() {
        this._fireStage('final');

        const settleTitle = this.reduced ? 120 : 900;
        const settleAge = this.reduced ? 80 : 650;

        // 1. "Happy Birthday, My Love ❤️" - the emotional centerpiece.
        this._show(this.final);
        await sleep(settleTitle);
        if (this._canceled) return;

        // 2. Live age - recomputed from Date.now() every second.
        this._show(this.age);
        this._updateAge();
        this.ageTimer = setInterval(() => this._updateAge(), 1000);
        await sleep(settleAge);
        if (this._canceled) return;

        // 3. The ONLY way forward: the user presses "Aage Badho ❤️".
        //    No timeouts, no auto handoff - the scene waits forever.
        this._show(this.continueBtn);
        if (this.continueBtn) this.continueBtn.focus({ preventScroll: true });
        await this._waitForContinue();
        if (this._canceled) return;

        // Future love-message insertion point: a message scene (or
        // several) can be awaited here without rewriting the
        // sequence. Skipped until a stage is configured.
        if (typeof this.loveMessageStage === 'function') {
            await this.loveMessageStage();
        }
        if (this._canceled) return;

        // Exit: stop the clock, fade the scene out and resolve.
        await this._exit();
    }

    /* Interrupt the running sequence (used by the global Back button
       to return to the Love Letter, or the reveal final). Resolves
       the pending letter/continue waits so play() finishes its
       teardown cleanly, then hides the scene. Safe to call at any
       point of the sequence. */
    async cancel() {
        this._canceled = true;
        this._letterContinue();
        this._continue();
        if (this.ageTimer) {
            clearInterval(this.ageTimer);
            this.ageTimer = null;
        }
        await this._cancelSequence();
    }

    /* Re-show the final stage (title + live age + continue) when the
       visitor returns from Memory Lane. Replays the celebration
       scenery and the stage entrances, then waits for the continue
       button again - the same way the first visit did. */
    async showFinal() {
        if (!this.layer || this.playing) return;
        this.playing = true;
        this._canceled = false;

        this.layer.hidden = false;
        this.layer.removeAttribute('aria-hidden');
        this.layer.classList.add('is-visible', 'is-celebrating');
        this._spawnStars();
        this._spawnCandles();
        this._spawnBalloons();

        await this._showFinalStage();
    }

    /* ---- Birthday Love Letter stage ---- */

    /* Notify main.js (global Back button) which stage is on screen:
       'letter' | 'countdown' | 'final'. Never throws - a broken hook
       must not take the reveal down. */
    _fireStage(stage) {
        if (typeof this.onStage !== 'function') return;
        try {
            this.onStage(stage);
        } catch (error) {
            console.warn('Birthday reveal stage hook failed.', error);
        }
    }

    /* Present the letter; its card, heading, message and button each
       have their own staggered entrance (see animation.css). */
    _showLetter() {
        if (!this.letterStage) return;
        this.letterStage.hidden = false;
        this.letterStage.removeAttribute('aria-hidden');
        this.letterStage.classList.add('is-in');
        this.letterStage.classList.remove('is-at-end');
        if (this.letterBtn) this.letterBtn.disabled = false;
        this._onLetterScroll(); // initial bottom-fade state
        this.letterBtn?.focus({ preventScroll: true });
    }

    /* Resolves when the letter button is pressed. Single-use listener,
       removed on the first click - the countdown can only start once. */
    _waitForLetter() {
        return new Promise((resolve) => {
            if (!this.letterBtn) {
                // No button markup - resolve so the flow still works
                // (defensive; the markup always ships the button).
                resolve();
                return;
            }
            this._resolveLetter = resolve;
            this.letterBtn.addEventListener('click', this._onLetterContinue);
        });
    }

    _letterContinue() {
        const resolve = this._resolveLetter;
        if (!resolve) return;
        this._resolveLetter = null;
        // Suppress repeated presses (double taps, held keys) both via
        // the removed listener and the native disabled state.
        this.letterBtn?.removeEventListener('click', this._onLetterContinue);
        if (this.letterBtn) this.letterBtn.disabled = true;
        resolve();
    }

    /* The letter leaves the visual stack completely (fade + gentle
       zoom) before the countdown begins. */
    async _hideLetter() {
        if (!this.letterStage) return;
        this.letterStage.classList.add('is-leaving');
        await sleep(this.reduced ? 0 : 550);
        this.letterStage.classList.remove('is-in', 'is-leaving');
        this.letterStage.setAttribute('aria-hidden', 'true');
        this.letterStage.hidden = true;
    }

    /* ---- Celebration decorations (after the countdown) ---- */

    /* Elegant CSS candles along the bottom edge; flames ignite one by
       one with a subtle stagger and keep flickering gently. */
    _spawnCandles() {
        if (this.reduced || !this.candlesEl) return;
        const total = window.matchMedia('(max-width: 640px)').matches ? 4 : 6;
        let html = '';
        for (let i = 0; i < total; i++) {
            const left = 8 + i * (84 / (total - 1));
            const h = 42 + Math.random() * 18;
            const tilt = (Math.random() * 2 - 1) * 3;
            html += '<span class="birthday-reveal-candle" style="--i:' + i +
                ';left:' + left.toFixed(1) + '%;--h:' + h.toFixed(1) +
                'px;--tilt:' + tilt.toFixed(1) + 'deg">' +
                '<span class="birthday-reveal-candle-flame"></span>' +
                '<span class="birthday-reveal-candle-wick"></span>' +
                '<span class="birthday-reveal-candle-body"></span>' +
                '</span>';
        }
        this.candlesEl.innerHTML = html;
        this.candlesEl.querySelectorAll('.birthday-reveal-candle')
            .forEach((c) => c.classList.add('is-in'));
    }

    /* Balloons in muted romantic colors, different sizes and depths,
       rising into the scene along the edges (never over the center). */
    _spawnBalloons() {
        if (this.reduced || !this.balloonsEl) return;
        const PALETTE = [
            ['#b76e79', '#e8b4bc'],   // dusty rose
            ['#6e8fb7', '#b7cce8'],   // soft dusk blue
            ['#8d7bb8', '#cdc0e8'],   // lavender
            ['#c9a25f', '#eed9ae'],   // champagne
            ['#7ba38a', '#c2ddc9'],   // sage
            ['#b5838d', '#e2c2c9'],   // rosewood
        ];
        const count = window.matchMedia('(max-width: 640px)').matches ? 5 : 7;
        let html = '';
        for (let i = 0; i < count; i++) {
            const c = PALETTE[i % PALETTE.length];
            const size = 42 + Math.random() * 34;
            const left = i % 2 === 0 ? 2 + Math.random() * 10 : 88 - Math.random() * 10;
            const top = 6 + Math.random() * 22;
            const dur = (6 + Math.random() * 3).toFixed(2);
            let frags = '';
            for (let f = 0; f < 6; f++) {
                const ang = (f / 6) * Math.PI * 2 + Math.random() * 0.6;
                const dist = 22 + Math.random() * 22;
                frags += '<span class="birthday-reveal-fragment" style="--dx:' +
                    (Math.cos(ang) * dist).toFixed(1) + 'px;--dy:' +
                    (Math.sin(ang) * dist - 14).toFixed(1) + 'px"></span>';
            }
            html += '<span class="birthday-reveal-balloon" style="--i:' + i +
                ';left:' + left.toFixed(1) + '%;top:' + top.toFixed(1) +
                '%;--size:' + size.toFixed(1) + 'px;--c1:' + c[0] +
                ';--c2:' + c[1] + ';--dur:' + dur + 's">' +
                '<span class="birthday-reveal-balloon-fill"></span>' +
                '<span class="birthday-reveal-balloon-string"></span>' +
                frags +
                '</span>';
        }
        this.balloonsEl.innerHTML = html;
        this.balloonsEl.querySelectorAll('.birthday-reveal-balloon')
            .forEach((b) => b.classList.add('is-in'));
    }

    /* A small restrained celebration burst: a couple of balloons pop
       with tiny fragments; everything else keeps floating calmly. */
    _popBalloons() {
        if (this.reduced || !this.balloonsEl) return;
        const balloons = this.balloonsEl.querySelectorAll('.birthday-reveal-balloon');
        if (!balloons.length) return;
        const picks = [...balloons].sort(() => Math.random() - 0.5).slice(0, 2);
        picks.forEach((b) => {
            b.classList.remove('is-floating');
            void b.offsetWidth;
            b.classList.add('is-popping');
        });
    }

    /* One full countdown step: show -> hold -> dissolve -> hide.
       Resolves only after this number has completely left the
       screen, so steps can never overlap or race. */
    async _playCountStep(step) {
        if (this.count) this.count.textContent = String(step.n);
        if (this.micro) this.micro.textContent = step.text;
        this._show(this.count);
        this._show(this.micro);
        this._beat();
        await sleep(this.reduced ? 750 : STEP_READ);
        if (this._canceled) return;
        this._out(this.count);
        this._out(this.micro);
        this._hide(this.wave);
        await sleep(this.reduced ? 0 : STEP_OUT);
        if (this._canceled) return;
        this._hide(this.count);
        this._hide(this.micro);
    }

    /* Clean teardown when the sequence is canceled mid-flight. */
    async _cancelSequence() {
        // Resolve any pending letter wait so a re-entry (Back button
        // -> play() again) never hangs on a stale click promise.
        this._letterContinue();

        this._hide(this.count);
        this._hide(this.micro);
        this._hide(this.final);
        this._hide(this.age);
        this._hide(this.continueBtn);
        if (this.letterStage) {
            this.letterStage.classList.remove('is-in', 'is-leaving', 'is-at-end');
            this.letterStage.setAttribute('aria-hidden', 'true');
            this.letterStage.hidden = true;
        }
        if (this.sky) this.sky.innerHTML = '';
        if (this.candlesEl) this.candlesEl.innerHTML = '';
        if (this.balloonsEl) this.balloonsEl.innerHTML = '';
        if (this.layer) {
            this.layer.classList.remove('is-visible', 'is-leaving', 'is-celebrating');
            this.layer.setAttribute('aria-hidden', 'true');
            this.layer.hidden = true;
        }
        this.playing = false;
    }

    /* A heartbeat radial wave expanding from the center of the sky. */
    _beat() {
        if (this.reduced) return;
        this._show(this.wave);
    }

    /* Tiny stars dotted across the midnight sky (like the opening). */
    _spawnStars() {
        if (this.reduced || !this.sky) return;
        const total = window.matchMedia('(max-width: 640px)').matches ? 26 : 46;
        let html = '';
        for (let i = 0; i < total; i++) {
            const left = Math.round(Math.random() * 100);
            const top = Math.round(Math.random() * 100);
            const size = (Math.random() * 1.8 + 1).toFixed(2);
            const o = (Math.random() * 0.35 + 0.15).toFixed(2);
            const dur = (Math.random() * 3.5 + 2.5).toFixed(2);
            const delay = (Math.random() * 4).toFixed(2);
            html += '<span class="birthday-reveal-star" style="left:' + left +
                '%;top:' + top + '%;width:' + size + 'px;height:' + size +
                'px;--o:' + o + ';--dur:' + dur + 's;--delay:-' + delay + 's"></span>';
        }
        this.sky.innerHTML = html;
    }

    /* Resolves when the continue button is pressed. The listener is
       single-use and removed on the first click, so the handoff can
       never run twice. */
    _waitForContinue() {
        return new Promise((resolve) => {
            if (!this.continueBtn) {
                // No button in the markup - resolve so the handoff still
                // happens (defensive; the markup always ships the button).
                resolve();
                return;
            }
            this._resolveContinue = resolve;
            this.continueBtn.addEventListener('click', this._onContinue);
        });
    }

    _continue() {
        const resolve = this._resolveContinue;
        if (!resolve) return;
        this._resolveContinue = null;
        this.continueBtn?.removeEventListener('click', this._onContinue);
        resolve();
    }

    /* Stop the clock and fade the whole scene out. */
    async _exit() {
        if (this.ageTimer) {
            clearInterval(this.ageTimer);
            this.ageTimer = null;
        }

        this.layer?.classList.add('is-leaving');
        await sleep(this.reduced ? 0 : 450);

        this._hide(this.count);
        this._hide(this.micro);
        this._hide(this.final);
        this._hide(this.age);
        this._hide(this.continueBtn);
        if (this.sky) this.sky.innerHTML = '';
        if (this.candlesEl) this.candlesEl.innerHTML = '';
        if (this.balloonsEl) this.balloonsEl.innerHTML = '';
        if (this.layer) {
            this.layer.classList.remove('is-visible', 'is-leaving', 'is-celebrating');
            this.layer.setAttribute('aria-hidden', 'true');
            this.layer.hidden = true;
        }
        this.playing = false;
    }

    /* Recompute the age from the real clock and refresh the values.
       The seconds row gets a subtle one-beat dim when it changes. */
    _updateAge() {
        if (!this.age) return;
        const parts = ageParts(Date.now());

        const secRow = this.age.querySelector('.birthday-reveal-age-row-seconds');
        const secValue = this.age.querySelector('[data-age="seconds"]');
        const previous = secValue ? secValue.textContent : null;

        for (const key of ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']) {
            const el = this.age.querySelector('[data-age="' + key + '"]');
            if (el) el.textContent = String(parts[key]);
        }

        if (!this.reduced && secRow && previous !== null && String(parts.seconds) !== previous) {
            secRow.classList.remove('is-ticking');
            void secRow.offsetWidth;
            secRow.classList.add('is-ticking');
            setTimeout(() => secRow.classList.remove('is-ticking'), 300);
        }
    }

    /* Restart the entrance animation (reflow forces a fresh run).
       The element is truly hidden when not playing, so it never
       occupies the stage with invisible content. */
    _show(el) {
        if (!el) return;
        el.hidden = false;
        el.classList.remove('is-in');
        void el.offsetWidth;
        el.classList.add('is-in');
    }

    /* Begin the exit animation (used between countdown steps). */
    _out(el) {
        if (!el || this.reduced) return;
        el.classList.remove('is-in');
        void el.offsetWidth;
        el.classList.add('is-out');
    }

    _hide(el) {
        if (!el) return;
        el.classList.remove('is-in', 'is-out');
        el.hidden = true;
    }

    destroy() {
        // Stop any running sequence (countdown/age timer) so nothing
        // keeps ticking after the reveal is gone.
        this._canceled = true;
        // Resolve any pending waits (letter button / continue button)
        // so a re-entry never hangs on a stale click promise.
        this._letterContinue();
        this._continue();
        if (this.ageTimer) clearInterval(this.ageTimer);
        this.ageTimer = null;
        this.letterBody?.removeEventListener('scroll', this._onLetterScroll);
    }
}