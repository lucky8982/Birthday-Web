/* Original deterministic romance-burst choreography. All tracks begin at
   the balloon centre, accelerate through one short impulse, then slow into
   outward drift before gravity takes over. */
export const CELEBRATION_TIMELINE = Object.freeze({
    impactFlash: 0, shellOpening: 150, wideExpansion: 360, spreadPeak: 1380,
    gravityDominant: 2320, greetingStarts: 1850, greetingResolved: 2720,
    greetingExit: 3920, greetingClear: 4480, productionTitleStart: 4620,
    productionTitleResolved: 6240,
});

/* mid -> slow outward apex -> gravity destination. Project-authored viewport
   fractions, rather than sampled reference positions. */
export const REFERENCE_BURST_TRACKS = Object.freeze([
    ['rose', -.10, -.15, -.42, -.34, -.48, .26, 3100, 0, 'rear'], ['jasmine', .12, -.17, .45, -.29, .52, .31, 3180, 28, 'rear'],
    ['chocolate', -.18, .02, -.54, -.04, -.59, .48, 3260, 54, 'main'], ['gift', .17, .04, .53, .03, .57, .52, 3340, 16, 'main'],
    ['horn', -.06, -.25, -.20, -.52, -.28, .02, 3020, 42, 'front'], ['lollipop', .08, -.23, .27, -.49, .34, .08, 3080, 70, 'front'],
    ['bow', -.22, .18, -.48, .34, -.42, .72, 3460, 24, 'main'], ['candy', .22, .17, .46, .36, .41, .75, 3500, 58, 'main'],
    ['heart', -.04, -.09, -.14, -.39, -.18, .39, 3240, 38, 'front'], ['heart', .05, -.08, .18, -.36, .24, .42, 3300, 64, 'front'],
    ['ribbon', -.27, -.02, -.64, -.13, -.70, .34, 3420, 46, 'front'], ['ribbon', .25, -.01, .63, -.12, .69, .36, 3450, 80, 'front'],
    ['pearl', -.12, .22, -.30, .48, -.25, .84, 3600, 92, 'rear'], ['pearl', .14, .21, .31, .50, .28, .86, 3640, 34, 'rear'],
    ['spark', -.31, .25, -.68, .55, -.75, .92, 3710, 82, 'front'], ['spark', .30, .25, .67, .57, .76, .93, 3740, 52, 'front'],
    ['flower', -.19, .32, -.38, .62, -.31, 1.02, 3820, 66, 'main'], ['flower', .20, .31, .39, .63, .33, 1.04, 3860, 18, 'main'],
    ['petal', -.34, .10, -.73, .22, -.81, .69, 3560, 100, 'rear'], ['petal', .35, .11, .74, .24, .82, .71, 3590, 36, 'rear'],
]);

const repeat = (values, length) => Array.from({ length }, (_, index) => values[index % values.length]);
const phases = length => Array.from({ length }, (_, index) => (index % 7) * 18);
const makeBurstInstances = (tier, tracks, types, sizes, phaseOffsets, longIndexes = []) => tracks.map((track, index) => Object.freeze({
    tier, track, type: types[index], size: sizes[index], phase: phaseOffsets[index],
    longFall: longIndexes.includes(index), persistent: false, safeLanding: null,
    offsetX: ((index % 5) - 2) * .014, offsetY: ((Math.floor(index / 5) % 3) - 1) * .012,
}));

/* 84 deliberately bounded birthday elements. The Canvas renderer draws these
   values as CSS-pixel boxes directly: medium pieces stay legible without
   becoming props, and small pieces never collapse into sub-14px dust. */
export const HERO_BURST_OBJECTS = Object.freeze([
    ...makeBurstInstances('medium', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17],
        ['rose-cluster', 'jasmine', 'chocolate', 'gift', 'party-horn', 'lollipop', 'bow', 'wrapped-candy', 'heart', 'heart', 'ribbon', 'ribbon', 'flower', 'flower'],
        [52, 50, 46, 40, 38, 42, 40, 38, 32, 32, 30, 30, 42, 42], phases(14), [6, 7, 12, 13]),
    ...makeBurstInstances('medium', Array.from({ length: 26 }, (_, index) => index % 20),
        repeat(['flower', 'jasmine', 'chocolate', 'gift', 'party-horn', 'wrapped-candy', 'lollipop', 'bow', 'heart', 'ribbon', 'pearl', 'petal', 'star', 'spark'], 26),
        repeat([30, 32, 34, 36, 38, 40, 42, 44, 46, 48], 26), phases(26), [17, 18, 19, 20, 21, 22, 23, 24, 25]),
    ...makeBurstInstances('small', Array.from({ length: 44 }, (_, index) => index % 20),
        repeat(['spark', 'star', 'pearl', 'petal', 'heart', 'ribbon', 'dust', 'streak'], 44),
        repeat([14, 16, 18, 20, 22, 24, 26], 44), phases(44), [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]),
]);

export const TITLE_MOTION = Object.freeze({ midX: 0, midY: -10, duration: 1660 });

/* 22 non-space glyphs; order is a fixed shuffle, never runtime random. */
export const TITLE_SEGMENT_MOTION = Object.freeze([
    [-.34, -.25, -16, 10], [.30, .22, 14, 3], [.12, -.34, -9, 17], [-.27, .30, 12, 1], [.38, -.08, 18, 14],
    [-.10, .38, -14, 6], [.34, -.27, 10, 20], [-.40, .04, -18, 8], [.05, -.39, 15, 0], [.28, .31, -10, 12],
    [-.31, -.18, 13, 5], [.41, .08, -15, 18], [-.17, .35, 8, 2], [.18, -.31, -12, 16], [-.37, -.08, 17, 7],
    [.09, .40, -9, 21], [.36, -.17, 11, 4], [-.23, .27, -16, 15], [.24, .29, 14, 9], [-.12, -.37, -11, 19],
    [.40, .02, 9, 11], [-.33, .16, -14, 13],
].map(([x, y, rotate, order]) => Object.freeze({ x, y, rotate, order })));
