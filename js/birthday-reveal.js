import { sleep, prefersReducedMotion } from './utils.js';

/* ------------------------------------------------------------
   Birth moment: 21 Sep 2007, 01:30:00 IST (Asia/Kolkata).
   IST is UTC+5:30 with no DST, so the instant is fixed forever:
   UTC 2007-09-20T20:00:00.000Z. Interpreting the wall-clock in a
   fixed offset keeps the result identical on every device,
   regardless of the user's locale/timezone.
   ------------------------------------------------------------ */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function birthTimestampIST() {
    return Date.UTC(2007, 8, 21, 1, 30, 0) - IST_OFFSET_MS;
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

export class BirthdayReveal {
    constructor() {
        this.layer = document.querySelector('#birthday-reveal');
        this.sky = this.layer?.querySelector('.birthday-reveal-sky');
        this.candlesEl = this.layer?.querySelector('#birthday-reveal-candles');
        this.balloonsEl = this.layer?.querySelector('#birthday-reveal-balloons');
        this.final = this.layer?.querySelector('.birthday-reveal-final');
        this.age = this.layer?.querySelector('.birthday-reveal-age');
        this.continueBtn = this.layer?.querySelector('.birthday-reveal-continue');
        this.letterStage = this.layer?.querySelector('#birthday-reveal-letter');
        this.letterBtn = this.letterStage?.querySelector('#birthday-reveal-letter-btn');
        this.letterBody = this.letterStage?.querySelector('.birthday-reveal-letter-body');
        this.reduced = prefersReducedMotion();
        this.playing = false;
        this.ageTimer = null;
        this._resolveContinue = null;
        this._resolveLetter = null;
        this._canceled = false; // set by destroy(): stop any running sequence
        this._run = 0; // monotonic run token; invalidated by cancel()/destroy()
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

    _wait(ms) { return sleep(ms); }
    _stopEffects() {}

    async _startCelebration(run) {
        this.layer?.classList.add('is-celebrating');
        this._spawnStars();
        this._spawnCandles();
        this._spawnBalloons();
        await sleep(this.reduced ? 0 : 1150);
        if (this._canceled || run !== this._run) return;
        this._popBalloons();
        await this._showFinalStage(run);
    }

    /**
     * Play the full reveal. Resolves ONLY when the user presses
     * "Aage Badho ❤️" (or the layer is missing). Never throws:
     * a missing layer simply skips the sequence.
     */
    async play({ showLetter = false, letterOnly = false } = {}) {
        if (!this.layer || this.playing) return;
        const run = (this._run += 1);
        this.playing = true;
        this._canceled = false;

        this.layer.hidden = false;
        this.layer.removeAttribute('aria-hidden');
        this.layer.classList.add('is-visible');
        for (const el of [this.final, this.age, this.continueBtn]) this._hide(el);
        // The long letter remains part of the original celebration page.
        if (showLetter) {
            this._showLetter();
            this._fireStage('letter');
            await this._waitForLetter();
            if (run !== this._run) return;
            await this._hideLetter(run);
            if (run !== this._run) return;
            if (letterOnly) {
                this.layer.classList.add('is-leaving');
                await this._wait(this.reduced ? 0 : 350);
                if (run !== this._run) return;
                this.layer.classList.remove('is-visible', 'is-leaving', 'is-celebrating');
                this.layer.setAttribute('aria-hidden', 'true');
                this.layer.hidden = true;
                this.playing = false;
                return;
            }
        }
        if (this._canceled || run !== this._run) return;
        await this._startCelebration(run);

        // 4. The final stage ("Happy Birthday, My Love ❤️" + live age
        //    + "Aage Badho ❤️"). From here on the scene stays on
        //    screen indefinitely - the only way forward is the
        //    continue button, which resolves this stage.
    }

    /* The final stage: the title, the live age and the continue
       button. Used by play() and re-shown by showFinal() when the
       visitor returns from Memory Lane. Resolves only when the
       continue button is pressed (or the sequence is canceled). */
    async _showFinalStage(run) {
        this._fireStage('final');

        const settleTitle = this.reduced ? 120 : 900;
        const settleAge = this.reduced ? 80 : 650;

        // 1. "Happy Birthday, My Love ❤️" - the emotional centerpiece.
        this._show(this.final);
        await this._wait(settleTitle);
        if (this._canceled || run !== this._run) return;

        // 2. Live age - recomputed from Date.now() every second.
        this._show(this.age);
        this._updateAge();
        this.ageTimer = setInterval(() => this._updateAge(), 1000);
        await this._wait(settleAge);
        if (this._canceled || run !== this._run) return;

        // 3. The ONLY way forward: the user presses "Aage Badho ❤️".
        //    No timeouts, no auto handoff - the scene waits forever.
        this._show(this.continueBtn);
        if (this.continueBtn) this.continueBtn.focus({ preventScroll: true });
        await this._waitForContinue();
        if (this._canceled || run !== this._run) return;

        // Future love-message insertion point: a message scene (or
        // several) can be awaited here without rewriting the
        // sequence. Skipped until a stage is configured.
        if (typeof this.loveMessageStage === 'function') {
            await this.loveMessageStage();
        }
        if (this._canceled || run !== this._run) return;

        // Exit: stop the clock, fade the scene out and resolve.
        await this._exit(run);
    }

    /* Interrupt the running sequence (used by the global Back button
       to return to the Love Letter, or the reveal final). Resolves
       the pending letter/continue waits so play() finishes its
       teardown cleanly, then hides the scene. Safe to call at any
       point of the sequence. */
    async cancel() {
        this._run += 1; // invalidate any in-flight play()/showFinal() chain
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
        const run = (this._run += 1);
        this.playing = true;
        this._canceled = false;

        this.layer.hidden = false;
        this.layer.removeAttribute('aria-hidden');
        this.layer.classList.add('is-visible');
        await this._startCelebration(run);
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
    async _hideLetter(run) {
        if (!this.letterStage) return;
        this.letterStage.classList.add('is-leaving');
        await this._wait(this.reduced ? 0 : 550);
        if (run !== this._run) return;
        this.letterStage.classList.remove('is-in', 'is-leaving');
        this.letterStage.setAttribute('aria-hidden', 'true');
        this.letterStage.hidden = true;
    }

    _spawnStars() {
        if (this.reduced || !this.sky) return;
        this.sky.innerHTML = Array.from({ length: innerWidth < 640 ? 26 : 46 }, (_, i) => {
            const left = (i * 37.7) % 100, top = (i * 61.3) % 100;
            return `<span class="birthday-reveal-star" style="left:${left}%;top:${top}%;width:${1 + i % 3}px;height:${1 + i % 3}px;--o:.35;--dur:${3 + i % 4}s;--delay:-${i % 4}s"></span>`;
        }).join('');
    }

    _spawnCandles() {
        if (this.reduced || !this.candlesEl) return;
        const total = innerWidth < 640 ? 4 : 6;
        this.candlesEl.innerHTML = Array.from({ length: total }, (_, i) => {
            const left = 8 + i * (84 / (total - 1));
            return `<span class="birthday-reveal-candle is-in" style="--i:${i};left:${left}%;--h:${44 + i % 3 * 8}px;--tilt:${i % 2 ? 2 : -2}deg"><span class="birthday-reveal-candle-flame"></span><span class="birthday-reveal-candle-wick"></span><span class="birthday-reveal-candle-body"></span></span>`;
        }).join('');
    }

    _spawnBalloons() {
        if (this.reduced || !this.balloonsEl) return;
        const colors = [['#b76e79','#e8b4bc'], ['#6e8fb7','#b7cce8'], ['#8d7bb8','#cdc0e8'], ['#c9a25f','#eed9ae'], ['#7ba38a','#c2ddc9']];
        const total = innerWidth < 640 ? 5 : 7;
        this.balloonsEl.innerHTML = Array.from({ length: total }, (_, i) => {
            const c = colors[i % colors.length], left = i % 2 ? 78 + i % 3 * 5 : 3 + i % 3 * 4;
            const fragments = Array.from({ length: 6 }, (_, n) => `<span class="birthday-reveal-fragment" style="--dx:${Math.cos(n * 1.05) * 34}px;--dy:${Math.sin(n * 1.05) * 34}px"></span>`).join('');
            return `<span class="birthday-reveal-balloon is-in is-floating" style="--i:${i};left:${left}%;top:${7 + i % 3 * 8}%;--size:${44 + i % 3 * 12}px;--c1:${c[0]};--c2:${c[1]};--dur:${6 + i % 3}s"><span class="birthday-reveal-balloon-fill"></span><span class="birthday-reveal-balloon-string"></span>${fragments}</span>`;
        }).join('');
    }

    _popBalloons() {
        if (this.reduced || !this.balloonsEl) return;
        [...this.balloonsEl.querySelectorAll('.birthday-reveal-balloon')].slice(0, 2).forEach(balloon => {
            balloon.classList.remove('is-floating'); balloon.classList.add('is-popping');
        });
    }

    /* Clean teardown when the sequence is canceled mid-flight. */
    async _cancelSequence() {
        this._stopEffects();
        // Resolve any pending letter wait so a re-entry (Back button
        // -> play() again) never hangs on a stale click promise.
        this._letterContinue();

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
    async _exit(run) {
        this._stopEffects();
        if (this.ageTimer) {
            clearInterval(this.ageTimer);
            this.ageTimer = null;
        }

        this.layer?.classList.add('is-leaving');
        await this._wait(this.reduced ? 0 : 450);
        if (run !== undefined && run !== this._run) return;

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
            const run = this._run;
            this._wait(300).then(() => { if (run === this._run) secRow.classList.remove('is-ticking'); });
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

    _hide(el) {
        if (!el) return;
        el.classList.remove('is-in', 'is-out');
        el.hidden = true;
    }

    destroy() {
        this._stopEffects();
        // Stop any running sequence (countdown/age timer) so nothing
        // keeps ticking after the reveal is gone.
        this._canceled = true;
        this._run += 1; // invalidate any in-flight play()/showFinal() chain
        // Resolve any pending waits (letter button / continue button)
        // so a re-entry never hangs on a stale click promise.
        this._letterContinue();
        this._continue();
        if (this.ageTimer) clearInterval(this.ageTimer);
        this.ageTimer = null;
        this.letterBody?.removeEventListener('scroll', this._onLetterScroll);
    }
}
