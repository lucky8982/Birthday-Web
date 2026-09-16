import { sleep, prefersReducedMotion } from './utils.js';
import { BirthdayHeart } from './birthday-heart.js';
import { BirthdayRain } from './birthday-rain.js';
import { TITLE_MOTION, TITLE_SEGMENT_MOTION } from './birthday-celebration-motion.js';

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
        this.heroBalloon = this.layer?.querySelector('#birthday-reveal-hero-balloon');
        this.heroVideo = this.layer?.querySelector('#birthday-reference-hero');
        this.heroFallback = this.layer?.querySelector('#birthday-reference-hero-fallback');
        this.bowLauncher = this.layer?.querySelector('#birthday-reveal-bow-launcher');
        this.bowArrow = this.bowLauncher?.querySelector('.birthday-bow-nocked-arrow');
        this.bowNock = this.bowLauncher?.querySelector('.birthday-bow-nock-spark');
        this.burstMessage = this.layer?.querySelector('.birthday-reveal-burst-message');
        this.heartEl = this.layer?.querySelector('.birthday-reveal-heart');
        this.age = this.layer?.querySelector('.birthday-reveal-age');
        this.wishArea = this.layer?.querySelector('.birthday-reveal-wish-area');
        this.continueBtn = this.layer?.querySelector('.birthday-reveal-continue');
        this.heartAdvanceBtn = this.layer?.querySelector('.birthday-reveal-heart-advance');
        this.letterStage = this.layer?.querySelector('#birthday-reveal-letter');
        this.letterBtn = this.letterStage?.querySelector('#birthday-reveal-letter-btn');
        this.letterBody = this.letterStage?.querySelector('.birthday-reveal-letter-body');
        this.reduced = prefersReducedMotion();
        this.playing = false;
        this.ageTimer = null;
        this._resolveContinue = null;
        this.wishBtn = this.layer?.querySelector('.birthday-reveal-wish');
        this._wishMade = false;
        this._wishTimer = null;
        this.balloonTimer = null;
        this.balloonReplacementTimers = new Set();
        this.effectTimers = new Set();
        this.effectsEl = null;
        this.heroRunId = 0;
        this.currentHeroRunId = 0;
        this.titleAssemblyRunId = null;
        this.heroGeometry = null;
        this.balloonCycle = 0;
        this.balloonSlots = [
            { side: 'left', top: 10, depth: 'back' }, { side: 'right', top: 10, depth: 'back' },
            { side: 'left', top: 30, depth: 'middle' }, { side: 'right', top: 30, depth: 'middle' },
            { side: 'left', top: 61, depth: 'front' }, { side: 'right', top: 61, depth: 'front' },
            { side: 'left', top: 80, depth: 'back' }, { side: 'right', top: 80, depth: 'back' },
        ];
        this._resolveWishGate = null;
        this._onWish = () => this._makeWish(this._run);
        this._resolveHeartAdvance = null;
        this._onHeartAdvance = () => this._advanceHeart(this._run);
        this._resolveHero = null;
        this.shotInProgress = false;
        this.impactTriggered = false;
        this.heroBurstComplete = false;
        this.cinematicResourcesReady = false;
        this.pendingHeroShot = false;
        this.launcherReady = false;
        this.flightArrow = null;
        this.flightLayer = null;
        this.flightAnimation = null;
        this._impactPromise = null;
        this._heroFallbackTimer = null;
        this._v7Preload = null;
        this._onIntroPointerDown = (event) => this._handleIntroPointerDown(event);
        this._onIntroLayout = () => this._cacheHeroGeometry();
        this.heroTimers = new Set();
        this._resolveLetter = null;
        this._letterReadStorageKey = 'hbm.birthdayLetterRead';
        this._letterReadInMemory = false;
        this._canceled = false; // set by destroy(): stop any running sequence
        this._run = 0; // monotonic run token; invalidated by cancel()/destroy()
        this._onContinue = () => this._continue();
        this._onLetterContinue = () => this._letterContinue();
        // Toggles .is-at-end on the letter stage when the message is
        // scrolled to its end (removes the bottom fade cue). The first
        // completed read also unlocks the CTA. Passive, single listener,
        // attached once - never per play().
        this._onLetterScroll = () => {
            const body = this.letterBody;
            if (!body) return;
            const remaining = body.scrollHeight - body.scrollTop - body.clientHeight;
            const atEnd = remaining <= 24;
            this.letterStage?.classList.toggle('is-at-end', atEnd);
            if (atEnd && this.letterStage?.classList.contains('is-read-locked')) {
                this._unlockLetter({ persist: true });
            }
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
        // Optional async handoff owned by main.js. It is called only after
        // the single-use Continue click and before this layer is exited.
        this.onForward = null;
        this.heart = new BirthdayHeart(this.heartEl, { reduced: this.reduced }).init();
        this.rain = new BirthdayRain(this.layer, { reduced: this.reduced });
        this.burst = null; // The reference-derived alpha plate owns hero playback.
    }

    init() {}

    _wait(ms) { return sleep(ms); }
    _stopEffects() {
        this.rain?.stop();
        this.burst?.stopRun();
        this._resetReferenceHero();
        clearTimeout(this._wishTimer);
        this._wishTimer = null;
        this._stopBalloons();
        this._clearEffects();
        for (const timer of this.heroTimers) clearTimeout(timer);
        this.heroTimers.clear();
        this._resolveHero?.();
        this._resolveHero = null;
        this._detachIntroShot();
        this.flightAnimation?.cancel();
        this.flightAnimation = null;
        this.flightArrow?.remove();
        this.flightArrow = null;
        this.flightLayer?.replaceChildren();
        this._impactPromise = null;
        this._hide(this.heroBalloon);
        this._hide(this.bowLauncher);
        this._hide(this.burstMessage);
        this.heroBalloon?.classList.remove('is-settled', 'is-pressed', 'is-impact', 'is-bursting');
        this.bowLauncher?.classList.remove('is-ready', 'is-releasing', 'is-arrow-fired', 'is-fading');
        this.shotInProgress = false;
        this.impactTriggered = false;
        this.heroBurstComplete = false;
        this.heroGeometry = null;
        this.wishBtn?.removeEventListener('click', this._onWish);
        this.heartAdvanceBtn?.removeEventListener('click', this._onHeartAdvance);
        this._hide(this.wishBtn);
        this._hide(this.heartAdvanceBtn);
        this._hide(this.heartEl);
        if (this.wishArea) this.wishArea.hidden = true;
        this.heart.stop();
        this.wishBtn?.removeAttribute('aria-disabled');
        if (this.heartAdvanceBtn) {
            this.heartAdvanceBtn.disabled = false;
            this.heartAdvanceBtn.removeAttribute('aria-disabled');
        }
        this._resolveWishGate?.();
        this._resolveWishGate = null;
        this._resolveHeartAdvance?.();
        this._resolveHeartAdvance = null;
        this._wishMade = false;
        this.layer?.classList.remove('is-wishing', 'is-wish-complete');
        this.layer?.classList.add('is-effects-stopped');
        this.layer?.querySelectorAll('.birthday-reveal-remnants, .birthday-reveal-constellation, .birthday-reveal-spark').forEach(el => el.remove());
    }

    _spawnWishSky() {
        if (!this.layer || !this.final) return;
        const constellation = document.createElement('div');
        constellation.className = 'birthday-reveal-constellation';
        constellation.setAttribute('aria-hidden', 'true');
        const points = [[110,42],[86,24],[58,22],[35,43],[40,70],[69,96],[111,125],[150,98],[179,70],[184,43],[160,23],[135,25]];
        constellation.innerHTML = `<svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid meet"><path pathLength="1" d="M${points.map(p => p.join(',')).join(' L')} Z"/>${points.map(([x,y],i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.7 : 1.2}" style="--i:${i}"/>`).join('')}</svg>`;
        this.final.before(constellation);
        if (this.reduced) return;
        const remnants = document.createElement('div');
        remnants.className = 'birthday-reveal-remnants';
        remnants.setAttribute('aria-hidden', 'true');
        remnants.innerHTML = Array.from({length: 6}, (_, i) => `<i style="--i:${i};--dx:${(i - 2.5) * 12}px;left:${40 + i * 4}%;top:${18 + i % 3 * 3}%"></i>`).join('');
        this.layer.append(remnants);
    }

    _waitForWishOpportunity() {
        if (!this.wishBtn) return Promise.resolve();
        return new Promise(resolve => {
            this._resolveWishGate = resolve;
            this._show(this.wishBtn);
            this.wishBtn.removeAttribute('aria-disabled');
            this.wishBtn.addEventListener('click', this._onWish);
        });
    }

    _makeWish(run) {
        if (this._wishMade || this._canceled || !this.playing || this.wishBtn?.hidden) return;
        this._wishMade = true;
        this.wishBtn?.setAttribute('aria-disabled', 'true');
        this.wishBtn?.removeEventListener('click', this._onWish);
        this.layer?.classList.add('is-wishing');
        if (!this.reduced) {
            this.candlesEl?.querySelectorAll('.birthday-reveal-candle').forEach(candle => {
                const spark = document.createElement('span');
                spark.className = 'birthday-reveal-spark';
                candle.append(spark);
            });
        }
        this._wishTimer = setTimeout(() => {
            this._wishTimer = null;
            if (this._canceled || run !== this._run) return;
            this.layer?.classList.add('is-wish-complete');
            this._wishTimer = setTimeout(() => {
                this._wishTimer = null;
                const resolve = this._resolveWishGate;
                this._resolveWishGate = null;
                resolve?.();
            }, 500);
        }, this.reduced ? 150 : 600);
    }

    async _startCelebration(run, stage = 'heart-intro', { restored = false, immediate = false } = {}) {
        this._stopEffects();
        this.layer?.classList.remove('is-effects-stopped');
        for (const el of [this.final, this.age, this.continueBtn, this.heartAdvanceBtn]) this._hide(el);
        this.layer?.classList.add('is-celebrating');
        this.rain?.start();
        this._spawnStars();
        if (['heart', 'age', 'age-ready'].includes(stage)) this._spawnBalloons();
        else this.balloonsEl?.replaceChildren();
        // The birthday Canvas field persists through the entire celebration.
        if (['heart', 'age', 'age-ready'].includes(stage)) this._spawnWishSky();
        await sleep(this.reduced || immediate ? 0 : 820);
        if (this._canceled || run !== this._run) return;
        if (['hero-burst', 'greeting', 'title-assembly'].includes(stage)) {
            await this._restoreTransientCelebration(run, stage);
            return;
        }
        await (stage === 'age' || stage === 'age-ready' ? this._showAgeStage(run, { completed: stage === 'age-ready', immediate }) : this._showHeartStage(run, { restored }));
    }

    async _restoreTransientCelebration(run, stage) {
        // A millisecond-perfect resume is brittle across suspension. Restart
        // the saved transient checkpoint from its own deterministic opening.
        const heroRun = this._beginHeroRun();
        this._show(this.heroBalloon);
        await this._wait(this.reduced ? 0 : 120);
        if (this._canceled || run !== this._run) return;
        this._cacheHeroGeometry();
        await this._burstHero(run, stage, heroRun);
        if (this._canceled || run !== this._run) return;
        await this._presentHeart(run, { titleVisible: true });
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
    async _showHeartStage(run, { restored = false } = {}) {
        if (restored) {
            await this._presentHeart(run, { restored: true });
        } else {
            const heroRun = await this._showHeroOpening(run);
            if (this._canceled || run !== this._run) return;
            await this._waitForArrow(run, heroRun);
            if (this._canceled || run !== this._run) return;
            await this._launchArrow(run, heroRun);
            if (this._canceled || run !== this._run) return;
            await this._presentHeart(run, { titleVisible: true });
        }
        if (this._canceled || run !== this._run) return;
        await this._waitForHeartAdvance();
        if (this._canceled || run !== this._run) return;
        await this._transitionHeartToAge(run);
    }

    async _showHeroOpening(run) {
        const heroRun = this._beginHeroRun();
        const v7Ready = this._preloadV7Hero();
        this.layer?.setAttribute('data-birthday-stage', 'heart-intro');
        this._fireStage('heart-intro');
        this._hide(this.final);
        this._hide(this.burstMessage);
        this.final?.classList.remove('is-title-revealed', 'is-title-settled', 'is-born-from-burst', 'is-assembling');
        this._hide(this.heartEl);
        this.heart.hideCenter();
        this._show(this.heroBalloon);
        await this._wait(this.reduced ? 0 : 980);
        if (this._canceled || run !== this._run) return;
        this.heroBalloon?.classList.add('is-settled');
        this._show(this.bowLauncher);
        this.bowLauncher?.classList.add('is-ready');
        this._attachIntroShot();
        await this._wait(this.reduced ? 0 : 720);
        if (this._canceled || run !== this._run) return;
        try { await document.fonts?.ready; } catch {}
        await v7Ready;
        if (this._canceled || run !== this._run) return;
        this._cacheHeroGeometry();
        this.cinematicResourcesReady = true;
        this.launcherReady = true;
        return heroRun;
    }

    _waitForArrow(run, heroRun) {
        return new Promise((resolve) => {
            this._resolveHero = () => {
                if (this._isHeroRun(run, heroRun)) resolve();
            };
            this._attachIntroShot();
            if (this.launcherReady && this.pendingHeroShot) requestAnimationFrame(() => this._commitHeroShot());
        });
    }

    _attachIntroShot() {
        this.layer?.addEventListener('pointerdown', this._onIntroPointerDown);
        window.addEventListener('resize', this._onIntroLayout, { passive: true });
    }

    _detachIntroShot() {
        this.launcherReady = false;
        this.layer?.removeEventListener('pointerdown', this._onIntroPointerDown);
        window.removeEventListener('resize', this._onIntroLayout);
    }

    _isExcludedShotTarget(target) {
        return target instanceof Element && Boolean(target.closest(
            '#experience-back-btn, .experience-back-btn, #music-toggle, .music-toggle, button, a, input, select, textarea, [role="button"], [data-birthday-shot-exempt]'
        ));
    }

    _handleIntroPointerDown(event) {
        if (this._isExcludedShotTarget(event.target)) return;
        if (this._canceled || !this.playing || this.layer?.dataset.birthdayStage !== 'heart-intro') return;
        if (!this.cinematicResourcesReady) { this.pendingHeroShot = true; return; }
        this._commitHeroShot();
    }

    _commitHeroShot() {
        if (!this.launcherReady || this.shotInProgress || this.impactTriggered || this.heroBurstComplete || !this._resolveHero) return;
        this.pendingHeroShot = false;
        this.shotInProgress = true;
        this._detachIntroShot();
        const resolve = this._resolveHero;
        this._resolveHero = null;
        resolve();
    }

    _beginHeroRun() {
        this.currentHeroRunId = ++this.heroRunId;
        this.burst?.stopRun();
        this._resetReferenceHero();
        this.shotInProgress = false;
        this.impactTriggered = false;
        this.heroBurstComplete = false;
        this.cinematicResourcesReady = false;
        this.pendingHeroShot = false;
        this._impactPromise = null;
        this.titleAssemblyRunId = null;
        this.flightAnimation?.cancel();
        this.flightAnimation = null;
        return this.currentHeroRunId;
    }

    _preloadV7Hero() {
        const video = this.heroVideo;
        if (!video) return Promise.resolve(Boolean(this.heroFallback?.complete));
        if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve(true);
        if (this._v7Preload) return this._v7Preload;
        this._v7Preload = new Promise(resolve => {
            let settled = false;
            const finish = ready => {
                if (settled) return;
                settled = true;
                video.removeEventListener('canplay', onReady);
                video.removeEventListener('error', onError);
                resolve(ready);
            };
            const onReady = () => finish(true);
            const onError = () => finish(Boolean(this.heroFallback?.complete));
            video.addEventListener('canplay', onReady, { once: true });
            video.addEventListener('error', onError, { once: true });
            video.preload = 'auto';
            video.load();
        });
        return this._v7Preload;
    }

    _isHeroRun(run, heroRun) {
        return !this._canceled && run === this._run && heroRun === this.currentHeroRunId;
    }

    _cacheHeroGeometry() {
        if (!this.layer || !this.heroBalloon || this.heroBalloon.hidden) return;
        const layerBox = this.layer.getBoundingClientRect();
        const heroBox = this.heroBalloon.getBoundingClientRect();
        const stage = this.layer.querySelector('.birthday-reveal-stage');
        const stageBox = stage?.getBoundingClientRect() || layerBox;
        const geometry = {
            width: layerBox.width, height: layerBox.height,
            originX: heroBox.left + heroBox.width / 2 - layerBox.left,
            originY: heroBox.top + heroBox.height / 2 - layerBox.top,
            stageOriginX: heroBox.left + heroBox.width / 2 - stageBox.left,
            stageOriginY: heroBox.top + heroBox.height / 2 - stageBox.top,
            mobile: window.matchMedia?.('(max-width: 540px)').matches,
        };
        if (this.bowNock && this.bowLauncher && !this.bowLauncher.hidden) {
            const arrowBox = this.bowNock.getBoundingClientRect();
            geometry.arrowX = arrowBox.left + arrowBox.width / 2 - layerBox.left;
            geometry.arrowY = arrowBox.top + arrowBox.height / 2 - layerBox.top;
            geometry.flightX = geometry.originX - geometry.arrowX;
            geometry.flightY = geometry.originY - geometry.arrowY;
            geometry.flightAngle = Math.atan2(geometry.flightY, geometry.flightX) * 180 / Math.PI;
        }
        if (this.final) {
            const wasHidden = this.final.hidden;
            this.final.hidden = false;
            this.final.classList.add('is-title-measuring');
            const titleBox = this.final.getBoundingClientRect();
            this.final.classList.remove('is-title-measuring');
            this.final.hidden = wasHidden;
            geometry.titleX = titleBox.left + titleBox.width / 2 - stageBox.left;
            geometry.titleY = titleBox.top + titleBox.height / 2 - stageBox.top;
        }
        this.heroGeometry = geometry;
        if (Number.isFinite(geometry.flightAngle)) this.bowLauncher?.style.setProperty('--bow-angle', `${geometry.flightAngle}deg`);
        this._setBurstOrigin(this.burstMessage);
        this._setBurstOrigin(this.final);
        this._prepareFlightArrow();
    }

    _ensureFlightLayer() {
        if (!this.layer) return null;
        if (!this.flightLayer?.isConnected) {
            this.flightLayer = this.layer.querySelector('.birthday-arrow-flight-layer');
            if (!this.flightLayer) {
                this.flightLayer = document.createElement('div');
                this.flightLayer.className = 'birthday-arrow-flight-layer';
                this.flightLayer.setAttribute('aria-hidden', 'true');
                this.layer.append(this.flightLayer);
            }
        }
        return this.flightLayer;
    }

    _createFlightArrow() {
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrow.setAttribute('class', 'birthday-flight-arrow');
        arrow.setAttribute('viewBox', '0 0 120 36');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.innerHTML = '<path class="birthday-arrow-shaft" d="M15 18h76"/><path class="birthday-arrow-tip" d="m84 8 22 10-22 10"/><path class="birthday-arrow-feather" d="m29 18-14-11m14 11L15 29"/><path class="birthday-flight-trail" d="M1 18h28"/>';
        return arrow;
    }

    _prepareFlightArrow() {
        const flightLayer = this._ensureFlightLayer();
        if (!flightLayer || this.flightArrow?.isConnected) return this.flightArrow;
        this.flightArrow = this._createFlightArrow();
        this.flightArrow.hidden = true;
        flightLayer.append(this.flightArrow);
        return this.flightArrow;
    }

    async _launchArrow(run, heroRun) {
        if (!this.bowLauncher || !this.shotInProgress || !this._isHeroRun(run, heroRun)) return;
        this.bowLauncher.classList.add('is-releasing', 'is-arrow-fired');
        const released = await this._waitForAnimation(this.bowLauncher, 'birthday-bow-release', run, heroRun, 360);
        if (!released || !this._isHeroRun(run, heroRun)) return;
        this._cacheHeroGeometry();
        const geometry = this.heroGeometry;
        const flight = this.flightArrow;
        if (!geometry || !flight) return this._triggerHeroImpact(run, heroRun);
        flight.style.left = `${geometry.arrowX}px`;
        flight.style.top = `${geometry.arrowY}px`;
        flight.hidden = false;
        const flightComplete = await this._runArrowFlight(flight, geometry, run, heroRun);
        if (!flightComplete) return;
        return this._triggerHeroImpact(run, heroRun);
    }

    async _runArrowFlight(flight, geometry, run, heroRun) {
        if (this.reduced) return this._isHeroRun(run, heroRun);
        const duration = geometry.mobile ? 1280 : 1080;
        const distance = Math.hypot(geometry.flightX, geometry.flightY);
        const arc = Math.min(34, Math.max(14, distance * .08));
        const points = [
            [0, 0],
            [geometry.flightX * .35, geometry.flightY * .35 - arc],
            [geometry.flightX * .73, geometry.flightY * .73 - arc * .48],
            [geometry.flightX, geometry.flightY],
        ];
        const angleFor = (from, to) => Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
        const angles = [
            angleFor(points[0], points[1]),
            angleFor(points[0], points[1]),
            angleFor(points[1], points[2]),
            angleFor(points[2], points[3]),
        ];
        const transform = ([x, y], angle) => `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${angle}deg)`;
        flight.style.willChange = 'transform, opacity';
        const animation = flight.animate([
            { offset: 0, opacity: .98, transform: transform(points[0], angles[0]) },
            { offset: .34, opacity: 1, transform: transform(points[1], angles[1]) },
            { offset: .72, opacity: 1, transform: transform(points[2], angles[2]) },
            { offset: 1, opacity: 1, transform: transform(points[3], angles[3]) },
        ], { duration, easing: 'cubic-bezier(.18,.76,.2,1)', fill: 'both' });
        this.flightAnimation = animation;
        try {
            await animation.finished;
            return this.flightAnimation === animation && this._isHeroRun(run, heroRun);
        } catch {
            return false;
        } finally {
            if (this.flightAnimation === animation) this.flightAnimation = null;
            flight.style.willChange = '';
        }
    }

    _triggerHeroImpact(run, heroRun) {
        if (this.impactTriggered) return this._impactPromise;
        if (!this._isHeroRun(run, heroRun)) return Promise.resolve();
        this.impactTriggered = true;
        this._impactPromise = (async () => {
            this.flightArrow?.remove();
            this.flightArrow = null;
            this.bowLauncher?.classList.add('is-fading');
            this.heroBalloon?.classList.remove('is-settled');
            this.heroBalloon?.classList.add('is-impact');
            await this._burstHero(run, 'hero-burst', heroRun);
        })();
        return this._impactPromise;
    }

    _ensureEffectsLayer() {
        if (!this.layer) return null;
        if (!this.effectsEl?.isConnected) {
            this.effectsEl = this.layer.querySelector('.birthday-balloon-effects');
            if (!this.effectsEl) {
                this.effectsEl = document.createElement('div');
                this.effectsEl.className = 'birthday-balloon-effects';
                this.effectsEl.setAttribute('aria-hidden', 'true');
                this.layer.append(this.effectsEl);
            }
        }
        return this.effectsEl;
    }

    _clearEffects() {
        for (const timer of this.effectTimers) clearTimeout(timer);
        this.effectTimers.clear();
        this.effectsEl?.replaceChildren();
    }

    _spawnCelebrationWash(layer) {
        // Intentionally retained as a harmless compatibility hook. The old
        // wash made a bright backing panel behind the temporary greeting.
        void layer;
    }

    _spawnEffectPieces(origin, types, { hero = false } = {}) {
        const layer = this._ensureEffectsLayer();
        if (!layer || !origin || this.reduced) return;
        const layerBox = this.layer.getBoundingClientRect();
        const originBox = origin.getBoundingClientRect();
        const left = originBox.left - layerBox.left + originBox.width / 2;
        const top = originBox.top - layerBox.top + originBox.height / 2;
        const total = types.length;
        types.forEach((type, index) => {
            const piece = document.createElement('i');
            const long = hero ? index >= total - 12 : index >= total - 3;
            const depth = hero ? ['is-rear', 'is-main', 'is-front'][index % 3] : '';
            piece.className = `birthday-balloon-effect ${hero ? 'is-hero' : 'is-side'} ${depth} is-${type}${long ? ' is-long' : ''}`;
            const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
            const distance = hero ? (long ? 270 + (index % 5) * 56 : 120 + (index % 8) * 20) : (long ? 132 + (index % 3) * 44 : 54 + (index % 5) * 18);
            const downward = long && (index % 2 === 0 || !hero);
            const effectX = Math.cos(angle) * distance;
            const roomBelow = Math.max(120, layerBox.height - top - 18);
            const effectY = downward ? Math.min(roomBelow, Math.abs(Math.sin(angle) * distance) + (hero ? 150 : 88)) : Math.sin(angle) * distance;
            piece.style.left = `${left}px`;
            piece.style.top = `${top}px`;
            piece.style.setProperty('--effect-x', `${effectX}px`);
            piece.style.setProperty('--effect-y', `${effectY}px`);
            piece.style.setProperty('--effect-rotate', `${index * 29}deg`);
            piece.style.setProperty('--effect-delay', `${(index % 4) * 24}ms`);
            layer.append(piece);
        });
        const timer = setTimeout(() => {
            this.effectTimers.delete(timer);
            layer.querySelectorAll(hero ? '.birthday-balloon-effect.is-hero' : '.birthday-balloon-effect.is-side').forEach(piece => piece.remove());
        }, hero ? 3100 : 1800);
        this.effectTimers.add(timer);
    }

    _spawnGreetingAccents() {
        const layer = this._ensureEffectsLayer();
        const message = this.burstMessage;
        if (!layer || !message || this.reduced) return;
        const layerBox = this.layer.getBoundingClientRect();
        const box = message.getBoundingClientRect();
        const centreX = box.left - layerBox.left + box.width / 2;
        const centreY = box.top - layerBox.top + box.height / 2;
        for (let index = 0; index < 14; index += 1) {
            const angle = -Math.PI * .92 + index / 13 * Math.PI * 1.84;
            const accent = document.createElement('i');
            accent.className = 'birthday-greeting-accent';
            accent.style.left = `${centreX}px`;
            accent.style.top = `${centreY}px`;
            accent.style.setProperty('--accent-x', `${Math.cos(angle) * (box.width * .48 + 16)}px`);
            accent.style.setProperty('--accent-y', `${Math.sin(angle) * (box.height * .68 + 18)}px`);
            accent.style.setProperty('--accent-delay', `${index * 22}ms`);
            layer.append(accent);
        }
        const timer = setTimeout(() => {
            this.effectTimers.delete(timer);
            layer.querySelectorAll('.birthday-greeting-accent').forEach(accent => accent.remove());
        }, 1850);
        this.effectTimers.add(timer);
    }

    _setBurstOrigin(el) {
        const geometry = this.heroGeometry;
        if (!el || !geometry) return;
        el.style.setProperty('--burst-origin-x', `${geometry.stageOriginX}px`);
        el.style.setProperty('--burst-origin-y', `${geometry.stageOriginY}px`);
        if (el === this.final) {
            el.style.setProperty('--title-target-x', `${geometry.titleX}px`);
            el.style.setProperty('--title-target-y', `${geometry.titleY}px`);
            el.style.setProperty('--title-travel-x', `${geometry.stageOriginX - geometry.titleX}px`);
            el.style.setProperty('--title-travel-y', `${geometry.stageOriginY - geometry.titleY}px`);
        }
    }

    _waitForAnimation(element, animationName, run, heroRun, fallbackMs) {
        if (this.reduced || !element) return Promise.resolve(true);
        return new Promise(resolve => {
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                element.removeEventListener('animationend', onEnd);
                clearTimeout(timer);
                this.heroTimers.delete(timer);
                resolve(result);
            };
            const onEnd = event => {
                if (event.target === element && event.animationName === animationName) finish(this._isHeroRun(run, heroRun));
            };
            const timer = setTimeout(() => finish(this._isHeroRun(run, heroRun)), fallbackMs);
            this.heroTimers.add(timer);
            element.addEventListener('animationend', onEnd, { once: false });
        });
    }

    _resetReferenceHero() {
        clearTimeout(this._heroFallbackTimer);
        this._heroFallbackTimer = null;
        this.heroVideo?.pause();
        try { if (this.heroVideo) this.heroVideo.currentTime = 0; } catch {}
        if (this.heroVideo) this.heroVideo.hidden = true;
        if (this.heroFallback) this.heroFallback.hidden = true;
        this.layer?.classList.remove('is-reference-hero-playing');
    }

    async _playReferenceHero(run, heroRun) {
        const video = this.heroVideo;
        if (!video) return false;
        this._resetReferenceHero();
        video.hidden = false;
        this.layer?.classList.add('is-reference-hero-playing');
        return new Promise(resolve => {
            let settled = false;
            const finish = result => {
                if (settled) return;
                settled = true;
                video.removeEventListener('ended', onEnded);
                video.removeEventListener('error', onError);
                resolve(result && this._isHeroRun(run, heroRun));
            };
            const onEnded = () => finish(true);
            const onError = () => {
                video.hidden = true;
                // Animated WebP is the exact V7 alpha fallback. Normal V7
                // handoff is always the video's actual ended event.
                if (!this.heroFallback?.complete) return finish(false);
                this.heroFallback.hidden = false;
                this._heroFallbackTimer = setTimeout(() => finish(true), this.reduced ? 0 : 7709);
            };
            video.addEventListener('ended', onEnded, { once: true });
            video.addEventListener('error', onError, { once: true });
            video.play().catch(() => finish(false));
        });
    }

    async _burstHero(run, resumeStage = 'hero-burst', heroRun = this.currentHeroRunId) {
        if (this.heroBurstComplete || !this._isHeroRun(run, heroRun)) return;
        this.heroBurstComplete = true;
        this._fireStage('hero-burst');
        this.rain?.transitionIntensity(.09, this.reduced ? 0 : 140);
        await this._wait(this.reduced ? 0 : 110);
        if (!this._isHeroRun(run, heroRun)) return;
        this._hide(this.heroBalloon);
        const heroFinished = await this._playReferenceHero(run, heroRun);
        this.rain?.transitionIntensity(1, this.reduced ? 0 : 420);
        this._resetReferenceHero();
        if (!heroFinished || !this._isHeroRun(run, heroRun)) {
            if (this._isHeroRun(run, heroRun)) {
                this._show(this.final);
                this.final?.classList.add('is-title-settled');
            }
            return;
        }
        if (!this._isHeroRun(run, heroRun)) return;
        if (this.titleAssemblyRunId === heroRun) return;
        this.titleAssemblyRunId = heroRun;
        this.layer?.setAttribute('data-birthday-stage', 'heart');
        this._fireStage('title-assembly');
        this.final?.classList.remove('is-title-revealed', 'is-title-settled');
        this.final?.classList.add('is-born-from-burst', 'is-assembling');
        this.final?.style.setProperty('--title-mid-x', `${TITLE_MOTION.midX}px`);
        this.final?.style.setProperty('--title-mid-y', `${TITLE_MOTION.midY}px`);
        this.final?.style.setProperty('--title-duration', `${TITLE_MOTION.duration}ms`);
        this.final?.querySelectorAll('[data-title-character]').forEach((segment, index) => {
            const motion = TITLE_SEGMENT_MOTION[index];
            if (!motion) return;
            segment.style.setProperty('--char-x', `${motion.x * (this.heroGeometry?.width || innerWidth)}px`);
            segment.style.setProperty('--char-y', `${motion.y * (this.heroGeometry?.height || innerHeight)}px`);
            segment.style.setProperty('--char-rotate', `${motion.rotate}deg`);
            segment.style.setProperty('--char-delay', `${motion.order * 54}ms`);
        });
        this._show(this.final);
        const characters = [...(this.final?.querySelectorAll('[data-title-character]') || [])];
        const lastCharacter = characters.reduce((latest, character, index) => TITLE_SEGMENT_MOTION[index]?.order > (TITLE_SEGMENT_MOTION[characters.indexOf(latest)]?.order ?? -1) ? character : latest, characters[0]);
        const titleComplete = await this._waitForAnimation(lastCharacter, 'birthday-title-character-arrive', run, heroRun, TITLE_MOTION.duration + 240);
        if (!titleComplete || !this._isHeroRun(run, heroRun)) return;
        this.final?.classList.remove('is-born-from-burst', 'is-assembling');
        this.final?.classList.add('is-title-settled');
    }

    async _presentHeart(run, { titleVisible = false, restored = false } = {}) {
        this.layer?.setAttribute('data-birthday-stage', 'heart');
        this.final?.classList.remove('is-born-from-burst', 'is-assembling');
        if (restored) this.final?.classList.add('is-title-settled');
        if (restored) this._fireStage('heart');
        if (!titleVisible) {
            this._show(this.final);
            this.final?.classList.add('is-title-settled');
            await this._wait(this.reduced ? 0 : restored ? 180 : 1100);
        }
        if (this._canceled || run !== this._run) return;
        this.heart.hideCenter();
        this._show(this.heartEl);
        await this.heart.start();
        if (this._canceled || run !== this._run) return;
        if (this.wishArea) this.wishArea.hidden = true;
        if (this.candlesEl) this.candlesEl.innerHTML = '';
        this._hide(this.wishBtn);
        this._hide(this.continueBtn);
        this.heartAdvanceBtn?.removeAttribute('aria-disabled');
        if (this.heartAdvanceBtn) this.heartAdvanceBtn.disabled = false;
        await this._wait(this.reduced ? 0 : restored ? 100 : 1280);
        if (this._canceled || run !== this._run) return;
        this.heart.revealCenter({ immediate: restored || this.reduced });
        await this._wait(this.reduced ? 0 : restored ? 100 : 2200);
        if (this._canceled || run !== this._run) return;
        this.heart.resolveCenter();
        this._show(this.heartAdvanceBtn);
        this.heartAdvanceBtn?.focus({ preventScroll: true });
        if (!restored) {
            this.layer?.setAttribute('data-birthday-stage', 'heart');
            this._spawnBalloons();
            this._fireStage('heart');
        }
    }

    async _transitionHeartToAge(run) {
        this.heartAdvanceBtn?.setAttribute('aria-disabled', 'true');
        await this.heart.exit();
        if (this._canceled || run !== this._run) return;
        this._hide(this.heartEl);
        this._hide(this.wishBtn);
        this._hide(this.heartAdvanceBtn);
        if (this.wishArea) this.wishArea.hidden = true;
        if (this.candlesEl) this.candlesEl.innerHTML = '';
        this.layer?.classList.remove('is-wishing', 'is-wish-complete');
        this.final?.classList.remove('is-born-from-burst');
        this.burstMessage?.classList.remove('is-born-from-burst');
        await this._showAgeStage(run, { titleVisible: true });
    }

    async _showAgeStage(run, { titleVisible = false, completed = false, immediate = false } = {}) {
        const stage = completed || this._wishMade ? 'age-ready' : 'age';
        this.layer?.setAttribute('data-birthday-stage', stage);
        this._fireStage(stage);

        const settleTitle = immediate ? 0 : (this.reduced ? 120 : 1100);
        const settleAge = immediate ? 0 : (this.reduced ? 120 : 900);

        // 1. "Happy Birthday, My Love ❤️" - the emotional centerpiece.
        if (!titleVisible) {
            this._show(this.final);
            this.final?.classList.add('is-title-settled');
            await this._wait(settleTitle);
            if (this._canceled || run !== this._run) return;
        }

        // 2. Live age - recomputed from Date.now() every second.
        this._hide(this.heartEl);
        if (this.wishArea) this.wishArea.hidden = false;
        this.heart.stop();
        if (this.ageTimer) clearInterval(this.ageTimer);
        this.ageTimer = null;
        this._show(this.age);
        this._updateAge();
        this.ageTimer = setInterval(() => this._updateAge(), 1000);
        await this._wait(settleAge);
        if (this._canceled || run !== this._run) return;
        this._spawnCandles();
        if (stage === 'age-ready') this.layer?.classList.add('is-wishing', 'is-wish-complete');

        // Let the fully unfolded age breathe before the invitation.
        await this._wait(immediate ? 0 : (this.reduced ? 120 : 1100));
        if (this._canceled || run !== this._run) return;

        // 3. The ONLY way forward: the user presses "Aage Badho ❤️".
        //    The fallback exposes this control; only its click proceeds.
        if (stage === 'age-ready') {
            this._wishMade = true;
            this._hide(this.wishBtn);
        } else {
            await this._waitForWishOpportunity();
            if (this._canceled || run !== this._run) return;
            this.layer?.setAttribute('data-birthday-stage', 'age-ready');
            this._fireStage('age-ready');
            await this._wait(this.reduced ? 120 : 500);
            if (this._canceled || run !== this._run) return;
        }
        let loveMessageShown = false;
        while (!this._canceled && run === this._run) {
            this._show(this.continueBtn);
            if (this.continueBtn) this.continueBtn.focus({ preventScroll: true });
            await this._waitForContinue();
            if (this._canceled || run !== this._run) return;

            // Future love-message insertion point: a message scene (or
            // several) can be awaited here without rewriting the
            // sequence. Skipped until a stage is configured.
            if (!loveMessageShown && typeof this.loveMessageStage === 'function') {
                await this.loveMessageStage();
                loveMessageShown = true;
            }
            if (this._canceled || run !== this._run) return;

            let handoffSucceeded = true;
            if (typeof this.onForward === 'function') {
                try {
                    handoffSucceeded = await this.onForward();
                } catch (error) {
                    console.error('[BIRTHDAY] Memory handoff failed', error);
                    handoffSucceeded = false;
                }
            }
            if (this._canceled || run !== this._run) return;
            if (handoffSucceeded !== false) {
                // Exit only after Memory Lane has accepted the handoff.
                await this._exit(run);
                return;
            }
            // Failed preparation leaves this settled Live Age stage intact
            // and re-arms the one-shot Continue listener for a later retry.
        }
    }

    /* Interrupt the running sequence (used by the global Back button
       to return to the Love Letter, or the reveal final). Resolves
       the pending letter/continue waits so play() finishes its
       teardown cleanly, then hides the scene. Safe to call at any
       point of the sequence. */
    async cancel() {
        this._run += 1; // invalidate any in-flight play()/showFinal() chain
        this._canceled = true;
        this._letterContinue({ force: true });
        this._advanceHeart(this._run);
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
    async showStage(stage = 'age', { immediate = false } = {}) {
        if (!this.layer || this.playing) return;
        const restoredStage = stage === 'heart-ready' ? 'age-ready' : ['heart-intro', 'hero-burst', 'greeting', 'title-assembly', 'heart', 'age', 'age-ready'].includes(stage) ? stage : 'age-ready';
        const run = (this._run += 1);
        this.playing = true;
        this._canceled = false;

        this.layer.hidden = false;
        this.layer.removeAttribute('aria-hidden');
        this.layer.classList.add('is-visible');
        await this._startCelebration(run, restoredStage, { restored: restoredStage === 'heart', immediate });
    }

    async showFinal() {
        // A Back restore must return directly to the stable Live Age scene,
        // without replaying the preceding Birthday cinematic entrances.
        return this.showStage('age-ready', { immediate: true });
    }

    async restoreHeart() {
        if (!this.layer || !this.playing) return;
        const run = ++this._run;
        this._canceled = false;
        clearTimeout(this._wishTimer);
        this._wishTimer = null;
        this.wishBtn?.removeEventListener('click', this._onWish);
        this._resolveWishGate?.();
        this._resolveWishGate = null;
        if (this.ageTimer) clearInterval(this.ageTimer);
        this.ageTimer = null;
        this._hide(this.age);
        this._hide(this.wishBtn);
        this._hide(this.continueBtn);
        if (this.wishArea) this.wishArea.hidden = true;
        if (this.candlesEl) this.candlesEl.innerHTML = '';
        this.layer?.classList.remove('is-wishing', 'is-wish-complete');
        await this._presentHeart(run, { restored: true });
        if (this._canceled || run !== this._run) return;
        this._waitForHeartAdvance().then(async () => {
            if (this._canceled || run !== this._run) return;
            await this._transitionHeartToAge(run);
        });
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
        this._resetLetterGate();
        const letterAlreadyRead = this._hasReadLetter();
        if (!letterAlreadyRead) this._lockLetter();
        this.letterStage.hidden = false;
        this.letterStage.removeAttribute('aria-hidden');
        this.letterStage.classList.add('is-in');
        this._onLetterScroll(); // initial bottom-fade state
        if (letterAlreadyRead) this.letterBtn?.focus({ preventScroll: true });
    }

    _hasReadLetter() {
        if (this._letterReadInMemory) return true;
        try {
            const isRead = window.localStorage?.getItem(this._letterReadStorageKey) === '1';
            if (isRead) this._letterReadInMemory = true;
            return isRead;
        } catch {
            // Private/restricted storage should not prevent the reveal. The
            // in-memory flag still preserves this browser run after unlock.
            return false;
        }
    }

    _lockLetter() {
        this.letterStage?.classList.add('is-read-locked');
        if (!this.letterBtn) return;
        if (document.activeElement === this.letterBtn) this.letterBtn.blur();
        this.letterBtn.disabled = true;
        this.letterBtn.setAttribute('tabindex', '-1');
    }

    _unlockLetter({ persist = false } = {}) {
        if (!this.letterStage?.classList.contains('is-read-locked')) return;
        this.letterStage.classList.remove('is-read-locked');
        this.letterStage.classList.add('is-read-unlocked');
        if (this.letterBtn) {
            this.letterBtn.disabled = false;
            this.letterBtn.removeAttribute('tabindex');
        }
        if (!persist || this._letterReadInMemory) return;
        this._letterReadInMemory = true;
        try {
            window.localStorage?.setItem(this._letterReadStorageKey, '1');
        } catch {
            // Keep the in-memory completion state when storage is blocked.
        }
    }

    _resetLetterGate() {
        this.letterStage?.classList.remove('is-at-end', 'is-read-locked', 'is-read-unlocked');
        if (!this.letterBtn) return;
        if (document.activeElement === this.letterBtn) this.letterBtn.blur();
        this.letterBtn.disabled = false;
        this.letterBtn.removeAttribute('tabindex');
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

    _letterContinue({ force = false } = {}) {
        if (!force && this.letterStage?.classList.contains('is-read-locked')) return;
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
        this._resetLetterGate();
    }

    _spawnStars() {
        if (this.reduced || !this.sky) return;
        this.sky.innerHTML = Array.from({ length: innerWidth < 640 ? 26 : 46 }, (_, i) => {
            const left = (i * 37.7) % 100, top = (i * 61.3) % 100;
            return `<span class="birthday-reveal-star" style="left:${left}%;top:${top}%;width:${i % 9 === 0 ? 2.2 : 1 + i % 2 * .4}px;height:${i % 9 === 0 ? 2.2 : 1 + i % 2 * .4}px;--o:${i % 9 === 0 ? .65 : i % 3 === 0 ? .35 : .16};--dur:${5 + i % 5}s;--delay:-${i % 4}s"></span>`;
        }).join('');
    }

    _spawnCandles() {
        if (!this.candlesEl) return;
        const total = innerWidth < 640 ? 4 : 6;
        this.candlesEl.innerHTML = Array.from({ length: total }, (_, i) => {
            const left = 8 + i * (84 / (total - 1));
            return `<span class="birthday-reveal-candle is-in" style="--i:${i};left:${left}%;--h:${44 + i % 3 * 8}px;--tilt:${i % 2 ? 2 : -2}deg"><span class="birthday-reveal-candle-flame"></span><span class="birthday-reveal-candle-wick"></span><span class="birthday-reveal-candle-body"></span></span>`;
        }).join('');
    }

    _spawnBalloons() {
        if (!this.balloonsEl) return;
        this._stopBalloons();
        this.balloonsEl.innerHTML = '';
        this.balloonCycle = 0;
        const total = innerHeight < 640 ? 6 : 8;
        for (let index = 0; index < total; index += 1) this.balloonsEl.append(this._createBalloon(index));
        if (!this.reduced) this.balloonTimer = setInterval(() => this._cycleBalloon(), 1500);
    }

    _createBalloon(slot) {
        const colors = [['#7c455e','#f1b1c4'], ['#174d70','#a5f4ff'], ['#8d6b43','#fff0ca'], ['#70516e','#d9b3db']];
        const serial = this.balloonCycle++;
        const zone = this.balloonSlots[slot % this.balloonSlots.length];
        const color = colors[slot % colors.length];
        const depth = zone.depth;
        const sizes = {
            back: 'clamp(60px, 16vw, 70px)',
            middle: 'clamp(78px, 21vw, 92px)',
            front: 'clamp(95px, 27vw, 115px)',
        };
        const balloon = document.createElement('span');
        const variant = ['rose', 'diamond', 'pearl', 'mauve'][slot % 4];
        balloon.className = `birthday-reveal-balloon is-heart-balloon variant-${variant} depth-${depth} ${this.reduced ? 'is-floating is-static' : 'is-in'}`;
        balloon.dataset.balloon = String(serial);
        balloon.dataset.slot = String(slot);
        balloon.style.setProperty(zone.side, 'clamp(-38px, -7vw, -18px)');
        balloon.style.setProperty('top', `${zone.top}%`);
        balloon.style.setProperty('--i', slot);
        balloon.style.setProperty('--size', sizes[depth]);
        balloon.style.setProperty('--c1', color[0]);
        balloon.style.setProperty('--c2', color[1]);
        balloon.style.setProperty('--dur', `${10 + serial % 3 * 2}s`);
        const uid = `birthday-side-heart-${serial}`;
        balloon.innerHTML = `<svg class="birthday-side-heart-svg" viewBox="0 0 120 116" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}-fill" x1=".18" y1=".06" x2=".85" y2=".94"><stop stop-color="var(--c2)"/><stop offset=".42" stop-color="var(--c1)"/><stop offset="1" stop-color="#070d24"/></linearGradient><radialGradient id="${uid}-shine" cx="28%" cy="19%" r="58%"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".42" stop-color="#fff" stop-opacity=".17"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><path class="birthday-side-heart-body" d="M60 103C48 90 13 67 13 36 13 18 25 8 40 8c10 0 17 5 20 13 3-8 10-13 20-13 15 0 27 10 27 28 0 31-35 54-47 67Z" fill="url(#${uid}-fill)"/><path class="birthday-side-heart-rim" d="M60 103C48 90 13 67 13 36 13 18 25 8 40 8c10 0 17 5 20 13 3-8 10-13 20-13 15 0 27 10 27 28 0 31-35 54-47 67Z"/><path d="M60 103C48 90 13 67 13 36 13 18 25 8 40 8c10 0 17 5 20 13 3-8 10-13 20-13 15 0 27 10 27 28 0 31-35 54-47 67Z" fill="url(#${uid}-shine)"/><path class="birthday-side-heart-knot" d="m54 102 6 9 6-9"/></svg><span class="birthday-reveal-balloon-string"></span>`;
        balloon.addEventListener('animationend', (event) => {
            if (event.target === balloon && event.animationName === 'balloon-rise') balloon.classList.replace('is-in', 'is-floating');
        });
        return balloon;
    }

    _cycleBalloon() {
        if (!this.balloonsEl || this.reduced || !this.playing) return;
        const eligible = [...this.balloonsEl.querySelectorAll('.birthday-reveal-balloon.is-floating')];
        if (!eligible.length) return;
        const balloon = eligible[this.balloonCycle % eligible.length];
        balloon.classList.replace('is-floating', 'is-popping');
        const effectFamilies = [
            ['heart', 'heart', 'heart', 'heart', 'spark', 'spark', 'heart', 'spark', 'heart', 'streak', 'pearl', 'ribbon'],
            ['star', 'star', 'star', 'star', 'star', 'pearl', 'pearl', 'star', 'pearl', 'heart', 'streak', 'ribbon'],
            ['ribbon', 'ribbon', 'ribbon', 'spark', 'spark', 'spark', 'ribbon', 'spark', 'ribbon', 'heart', 'pearl', 'streak'],
            ['pearl', 'pearl', 'pearl', 'pearl', 'streak', 'streak', 'pearl', 'streak', 'heart', 'spark', 'ribbon', 'heart'],
        ];
        const family = effectFamilies[this.balloonCycle % effectFamilies.length];
        const pieces = family.slice(0, 8 + (this.balloonCycle % 5));
        this._spawnEffectPieces(balloon, pieces);
        const timer = setTimeout(() => {
            this.balloonReplacementTimers.delete(timer);
            if (!this.balloonsEl || !balloon.isConnected) return;
            balloon.replaceWith(this._createBalloon(Number(balloon.dataset.slot)));
        }, 430);
        this.balloonReplacementTimers.add(timer);
    }

    _stopBalloons() {
        clearInterval(this.balloonTimer);
        this.balloonTimer = null;
        for (const timer of this.balloonReplacementTimers) clearTimeout(timer);
        this.balloonReplacementTimers.clear();
    }

    /* Clean teardown when the sequence is canceled mid-flight. */
    async _cancelSequence() {
        this._stopEffects();
        // Resolve any pending letter wait so a re-entry (Back button
        // -> play() again) never hangs on a stale click promise.
        this._letterContinue({ force: true });

        this._hide(this.final);
        this._hide(this.age);
        this._hide(this.continueBtn);
        if (this.letterStage) {
            this.letterStage.classList.remove('is-in', 'is-leaving');
            this.letterStage.setAttribute('aria-hidden', 'true');
            this.letterStage.hidden = true;
        }
        this._resetLetterGate();
        if (this.sky) this.sky.innerHTML = '';
        if (this.candlesEl) this.candlesEl.innerHTML = '';
        if (this.balloonsEl) this.balloonsEl.innerHTML = '';
        if (this.layer) {
            this.layer.classList.remove('is-visible', 'is-leaving', 'is-celebrating');
            this.layer.removeAttribute('data-birthday-stage');
            this.layer.setAttribute('aria-hidden', 'true');
            this.layer.hidden = true;
        }
        this.playing = false;
    }

    _waitForHeartAdvance() {
        return new Promise((resolve) => {
            if (!this.heartAdvanceBtn) {
                resolve();
                return;
            }
            this._resolveHeartAdvance = resolve;
            this.heartAdvanceBtn.addEventListener('click', this._onHeartAdvance);
        });
    }

    _advanceHeart(run) {
        if (this._canceled || run !== this._run) return;
        const resolve = this._resolveHeartAdvance;
        if (!resolve) return;
        this._resolveHeartAdvance = null;
        this.heartAdvanceBtn?.removeEventListener('click', this._onHeartAdvance);
        if (this.heartAdvanceBtn) this.heartAdvanceBtn.disabled = true;
        resolve();
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
            this.layer.removeAttribute('data-birthday-stage');
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
        this._letterContinue({ force: true });
        this._continue();
        if (this.ageTimer) clearInterval(this.ageTimer);
        this.ageTimer = null;
        this.heart.destroy();
        this.rain.destroy();
        this._resetLetterGate();
        this.letterBody?.removeEventListener('scroll', this._onLetterScroll);
    }
}
