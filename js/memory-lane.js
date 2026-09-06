/* ============================================================
   Happy Birthday My Love 💙 - Memory Lane (Scene 2)
   ------------------------------------------------------------
   File:    js/memory-lane.js
   Purpose: An interactive romantic memory book. Every memory
            opens like a cinematic chapter:

              TITLE  appears with its own unique animation
                -> title glides to its final position
              PHOTO  reveals itself with its own unique animation
                -> photo settles into the composition
              LOVE MESSAGE appears with its own unique animation

            Everything STAYS VISIBLE. Nothing auto-advances.
            The user decides when to open the next chapter.

   HOW TO ADD YOUR REAL PHOTOS & WORDS:
     Only edit the `PHOTO_MEMORIES` array below - the
     architecture never needs touching. Each entry uses:
       title            the romantic chapter title
       image            photo path  assets/images/memories/...
       message          the love message
       animation fields are already assigned.

   HOW TO ADD LETTER CHAPTERS:
     Add a `type: "letter"` entry to `LETTER_MEMORIES` and a
     photo position (1-based) to `LETTER_AFTER_PHOTO`. Letters
     are woven between the photos automatically at build time.
   ============================================================ */

import { $, prefersReducedMotion } from './utils.js';


/* ------------------------------------------------------------
   PHOTO MEMORIES - edit titles, images and messages freely.
   Keep the structure. Animation fields are pre-assigned.
   ------------------------------------------------------------ */
const PHOTO_MEMORIES = [
    {
        id: 1,
        title: 'A Quiet Beginning',
        image: 'assets/images/memories/dummy-photo-01.jpg',
        message: 'Some stories begin loudly. Ours started softly - a look, a word, a feeling I could not yet name - and I knew I would never be the same.',
        titleAnimation: 'title-memory-01',
        photoAnimation: 'photo-memory-01',
        messageAnimation: 'message-memory-01',
        composition: 'compose-a',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 900, settleMs: 620, photoMs: 1200, messageMs: 950,
    },
    {
        id: 2,
        title: 'The First Hello',
        image: 'assets/images/memories/dummy-photo-02.jpg',
        message: 'One ordinary word, spoken without thinking, quietly rearranged my entire world around the sound of it.',
        titleAnimation: 'title-memory-02',
        photoAnimation: 'photo-memory-02',
        messageAnimation: 'message-memory-02',
        composition: 'compose-b',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1000, settleMs: 580, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 3,
        title: 'Two Hearts, One Beat',
        image: 'assets/images/memories/dummy-photo-03.JPG',
        message: 'From the very first moment, something in me recognized you - like a song I had always known, finally being played.',
        titleAnimation: 'title-memory-03',
        photoAnimation: 'photo-memory-03',
        messageAnimation: 'message-memory-03',
        composition: 'compose-c',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 950, settleMs: 640, photoMs: 1250, messageMs: 1050,
    },
    {
        id: 4,
        title: 'Golden Evenings',
        image: 'assets/images/memories/dummy-photo-04.JPG',
        message: 'I began collecting your smiles the way others keep treasures, saving each one for the days that need the light.',
        titleAnimation: 'title-memory-04',
        photoAnimation: 'photo-memory-04',
        messageAnimation: 'message-memory-04',
        composition: 'compose-d',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1150, settleMs: 560, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 5,
        title: 'Sweet Laughter',
        image: 'assets/images/memories/dummy-photo-05.JPG',
        message: 'Your laugh is the only music I never tire of - it finds me in my most ordinary hours and turns them golden.',
        titleAnimation: 'title-memory-05',
        photoAnimation: 'photo-memory-05',
        messageAnimation: 'message-memory-05',
        composition: 'compose-e',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 1000, settleMs: 600, photoMs: 1200, messageMs: 900,
    },
    {
        id: 6,
        title: 'Gentle Hands',
        image: 'assets/images/memories/dummy-photo-06.JPG',
        message: 'Your hands have a way of making the heaviest days feel lighter, as if calm itself has chosen to live in your touch.',
        titleAnimation: 'title-memory-06',
        photoAnimation: 'photo-memory-06',
        messageAnimation: 'message-memory-06',
        composition: 'compose-f',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 900, settleMs: 650, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 7,
        title: 'Long Conversations',
        image: 'assets/images/memories/dummy-photo-07.JPG',
        message: 'We talked until the night surrendered and morning arrived - and still, we were not finished speaking.',
        titleAnimation: 'title-memory-07',
        photoAnimation: 'photo-memory-07',
        messageAnimation: 'message-memory-07',
        composition: 'compose-g',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1050, settleMs: 600, photoMs: 1250, messageMs: 950,
    },
    {
        id: 8,
        title: 'The Brightest Light',
        image: 'assets/images/memories/dummy-photo-08.JPG',
        message: 'You never tried to light up my life. You simply did - quietly, the way the sun never tries to wake the day.',
        titleAnimation: 'title-memory-08',
        photoAnimation: 'photo-memory-08',
        messageAnimation: 'message-memory-08',
        composition: 'compose-h',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 950, settleMs: 620, photoMs: 1350, messageMs: 1000,
    },
    {
        id: 9,
        title: 'Night Conversations',
        image: 'assets/images/memories/dummy-photo-09.JPG',
        message: 'In the dark, our words grew braver - and I fell deeper in love with the person you become when only I am listening.',
        titleAnimation: 'title-memory-09',
        photoAnimation: 'photo-memory-09',
        messageAnimation: 'message-memory-09',
        composition: 'compose-a',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1000, settleMs: 580, photoMs: 1200, messageMs: 900,
    },
    {
        id: 10,
        title: 'Our Melody',
        image: 'assets/images/memories/dummy-photo-10.JPG',
        message: 'Every song carries a trace of us now. I cannot hear a melody without hearing you in it.',
        titleAnimation: 'title-memory-10',
        photoAnimation: 'photo-memory-10',
        messageAnimation: 'message-memory-10',
        composition: 'compose-c',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1050, settleMs: 620, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 11,
        title: 'Little Wonders',
        image: 'assets/images/memories/dummy-photo-11.JPG',
        message: 'I keep the small things close - the way you pause when you are thinking, the way your name sounds in my voice.',
        titleAnimation: 'title-memory-11',
        photoAnimation: 'photo-memory-11',
        messageAnimation: 'message-memory-11',
        composition: 'compose-b',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1100, settleMs: 600, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 12,
        title: 'Where the Heart Is',
        image: 'assets/images/memories/dummy-photo-12.JPG',
        message: 'I used to think home was a place with walls. Now I know it is the quiet certainty of waking beside you.',
        titleAnimation: 'title-memory-12',
        photoAnimation: 'photo-memory-12',
        messageAnimation: 'message-memory-12',
        composition: 'compose-d',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1200, settleMs: 580, photoMs: 1250, messageMs: 950,
    },
    {
        id: 13,
        title: 'Dreams We Share',
        image: 'assets/images/memories/dummy-photo-13.jpg',
        message: 'We speak of tomorrows as if they are already ours - and beside you, they somehow feel possible.',
        titleAnimation: 'title-memory-13',
        photoAnimation: 'photo-memory-13',
        messageAnimation: 'message-memory-13',
        composition: 'compose-e',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 950, settleMs: 640, photoMs: 1350, messageMs: 1050,
    },
    {
        id: 14,
        title: 'Peaceful Moments',
        image: 'assets/images/memories/dummy-photo-14.jpg',
        message: 'Our silences are never empty. They are filled with everything words are too small to carry.',
        titleAnimation: 'title-memory-14',
        photoAnimation: 'photo-memory-14',
        messageAnimation: 'message-memory-14',
        composition: 'compose-f',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1000, settleMs: 600, photoMs: 1200, messageMs: 900,
    },
    {
        id: 15,
        title: 'Growing Side by Side',
        image: 'assets/images/memories/dummy-photo-15.jpg',
        message: 'Every day beside you, I become a softer, braver version of myself - shaped by your patience and your light.',
        titleAnimation: 'title-memory-15',
        photoAnimation: 'photo-memory-15',
        messageAnimation: 'message-memory-15',
        composition: 'compose-g',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1050, settleMs: 620, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 16,
        title: 'Our Secret Dances',
        image: 'assets/images/memories/dummy-photo-16.jpg',
        message: 'We have danced where no one else will ever see - in quiet rooms and quiet hours, in the safe country of being us.',
        titleAnimation: 'title-memory-16',
        photoAnimation: 'photo-memory-16',
        messageAnimation: 'message-memory-16',
        composition: 'compose-h',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1000, settleMs: 580, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 17,
        title: 'Under the Same Sky',
        image: 'assets/images/memories/dummy-photo-17.jpg',
        message: 'When the world keeps us apart, we still stand under the same sky - and I speak to it softly, hoping it carries my voice to you.',
        titleAnimation: 'title-memory-17',
        photoAnimation: 'photo-memory-17',
        messageAnimation: 'message-memory-17',
        composition: 'compose-a',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1100, settleMs: 640, photoMs: 1250, messageMs: 950,
    },
    {
        id: 18,
        title: 'A Promise Kept',
        image: 'assets/images/memories/dummy-photo-18.jpg',
        message: 'I promised myself I would love you well. Every day with you is my quiet way of keeping that promise.',
        titleAnimation: 'title-memory-18',
        photoAnimation: 'photo-memory-18',
        messageAnimation: 'message-memory-18',
        composition: 'compose-b',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 950, settleMs: 600, photoMs: 1350, messageMs: 1000,
    },
    {
        id: 19,
        title: 'You and Me',
        image: 'assets/images/memories/dummy-photo-19.jpg',
        message: 'Against every doubt and every distance - through all of it - it has always been, and will always be, you and me.',
        titleAnimation: 'title-memory-19',
        photoAnimation: 'photo-memory-19',
        messageAnimation: 'message-memory-19',
        composition: 'compose-c',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 1000, settleMs: 620, photoMs: 1200, messageMs: 900,
    },
    {
        id: 20,
        title: 'Forever Begins Now',
        image: 'assets/images/memories/dummy-photo-20.jpg',
        message: 'I used to think forever was a long time. Now I know it is simply every single moment I choose you.',
        titleAnimation: 'title-memory-20',
        photoAnimation: 'photo-memory-20',
        messageAnimation: 'message-memory-20',
        composition: 'compose-e',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1050, settleMs: 600, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 21,
        title: 'The Little Map',
        image: 'assets/images/memories/dummy-photo-21.jpg',
        message: 'Every road I ever walked was quietly leading to you. I would walk them all again, gladly, for the same arrival.',
        titleAnimation: 'title-memory-21',
        photoAnimation: 'photo-memory-21',
        messageAnimation: 'message-memory-21',
        composition: 'compose-d',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 950, settleMs: 640, photoMs: 1250, messageMs: 950,
    },
    {
        id: 22,
        title: 'Mornings Like These',
        image: 'assets/images/memories/dummy-photo-22.jpg',
        message: 'Waking beside you is the most ordinary miracle I know - and I never once grow tired of it.',
        titleAnimation: 'title-memory-22',
        photoAnimation: 'photo-memory-22',
        messageAnimation: 'message-memory-22',
        composition: 'compose-f',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1100, settleMs: 600, photoMs: 1350, messageMs: 1050,
    },
    {
        id: 23,
        title: 'Coffee & Conversations',
        image: 'assets/images/memories/dummy-photo-23.jpg',
        message: 'We have solved nothing and everything over cups that grew cold - and I would trade every answer for those hours.',
        titleAnimation: 'title-memory-23',
        photoAnimation: 'photo-memory-23',
        messageAnimation: 'message-memory-23',
        composition: 'compose-g',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1000, settleMs: 580, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 24,
        title: 'The Longest Walk',
        image: 'assets/images/memories/dummy-photo-24.jpg',
        message: 'We always took the long way, and I loved you for it. There is nowhere I would rather arrive than anywhere with you.',
        titleAnimation: 'title-memory-24',
        photoAnimation: 'photo-memory-24',
        messageAnimation: 'message-memory-24',
        composition: 'compose-h',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1150, settleMs: 620, photoMs: 1200, messageMs: 950,
    },
    {
        id: 25,
        title: 'Moments of Quiet',
        image: 'assets/images/memories/dummy-photo-25.jpg',
        message: 'Thank you for the quiet - for knowing me without my needing to explain. Being understood by you is my greatest comfort.',
        titleAnimation: 'title-memory-25',
        photoAnimation: 'photo-memory-25',
        messageAnimation: 'message-memory-25',
        composition: 'compose-a',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 1350, settleMs: 600, photoMs: 1250, messageMs: 1000,
    },
    {
        id: 26,
        title: 'City Lights',
        image: 'assets/images/memories/dummy-photo-26.jpg',
        message: 'When I picture our future, I do not see a place. I see a string of moments, every one of them with you beside me.',
        titleAnimation: 'title-memory-26',
        photoAnimation: 'photo-memory-26',
        messageAnimation: 'message-memory-26',
        composition: 'compose-c',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1050, settleMs: 640, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 27,
        title: 'Weathering Storms',
        image: 'assets/images/memories/dummy-photo-27.jpg',
        message: 'I no longer fear the storms. I have watched us weather them together - and each one only makes us stronger.',
        titleAnimation: 'title-memory-27',
        photoAnimation: 'photo-memory-27',
        messageAnimation: 'message-memory-27',
        composition: 'compose-b',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1250, settleMs: 580, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 28,
        title: 'The Journey Ahead',
        image: 'assets/images/memories/dummy-photo-28.jpg',
        message: 'I cannot see every bend of the road before us, but I know exactly who I want walking it with me. Always you.',
        titleAnimation: 'title-memory-28',
        photoAnimation: 'photo-memory-28',
        messageAnimation: 'message-memory-28',
        composition: 'compose-e',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1100, settleMs: 620, photoMs: 1250, messageMs: 950,
    },
    {
        id: 29,
        title: 'Always by Your Side',
        image: 'assets/images/memories/dummy-photo-29.jpg',
        message: 'Wherever life leads us, I will be there - steady, certain, and endlessly grateful to call you mine.',
        titleAnimation: 'title-memory-29',
        photoAnimation: 'photo-memory-29',
        messageAnimation: 'message-memory-29',
        composition: 'compose-d',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1000, settleMs: 600, photoMs: 1350, messageMs: 1100,
    },
    {
        id: 30,
        title: 'Our Forever',
        image: 'assets/images/memories/dummy-photo-30.jpg',
        message: 'This is not the last page of our story - it is the first of everything we have yet to become. Every memory carried me to you, and every moment ahead belongs to you. Happy birthday, my love.',
        titleAnimation: 'title-memory-30',
        photoAnimation: 'photo-memory-30',
        messageAnimation: 'message-memory-30',
        composition: 'compose-h',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1400, settleMs: 660, photoMs: 1500, messageMs: 1300,
    },
];


/* ------------------------------------------------------------
   LETTER CHAPTERS - cinematic letters woven between the photos.
   Each letter uses the shared `compose-letter` composition and
   the shared title-letter / photo-letter / message-letter
   entrance animations. `type: "letter"` marks it for the
   renderer; photos default to `type: "photo"` at build time.
   ------------------------------------------------------------ */
const LETTER_AFTER_PHOTO = [3, 7, 11, 15, 19, 23, 27];

const LETTER_MEMORIES = [
    {
        id: 31,
        type: 'letter',
        marker: 'A Little Letter',
        title: 'Before I Ever Said It',
        paragraphs: [
            'Ek baat bolu',
            'My Dear wife🦎🦎 yeh rokna tokna mujhay bhi pasand nahi hai par kya karun baby..',
            'Aapka pati hu na, duniya ki gandi najron se bachana chahta hu kyonki is jamaney ko mai acchi tarah janta hu',
            'Me aapko countrol nahi bas safe and secure rakhna chahta hu kyonki aap meri sabsey kimati daulat ho,',
            'Mera sabsey anmol tohfa ho aur meri izzat ho aap mujhey galat mat samjhna Happy Birthday Meri gussel Wife...!!',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1200, settleMs: 700, photoMs: 900, messageMs: 1400,
    },
    {
        id: 32,
        type: 'letter',
        marker: 'A Letter for You',
        title: 'What Your Laughter Does',
        paragraphs: [
            'Baby tum meri ek baat maanogi',
            'Baby tum na apna dhyan rakha karo na mujhe na bahut dar lagta he',
            'Jab tumhari tabiyat kharab hoti he naa tab, Baby tum naa bilkul bhi apna dhyan nahi rakhti ho..',
            'Time se khana to khati hi nahi ho', 
            'Tum apne iss birthday Pr meri ek baat maan lo na baby tum khud se ek promiss karo mujhse mt karo promiss',
            'Promiss karo ki tum apna dhyan rakhogi time se khana khaogi or postic khana khaogi',
            'Esa vesa junck food nahi khaogi or Sub se important jyda phone nahi chalaogi', 
            'Mujhe pata he abhi jab se tumhara phone aaya he tum bahut jyda hi phone chalane algi ho',
            'Haa to baby sub se pahle to tum ye phone chalana band karo Mtlb chalao pr limit me..',
            'Tumhe pata he mera na sarir kaanpne lagta he jab me suntan hu ki tumhari tabiyat kharab he ya tumhe kuch ho gaya he',
            'Me tumhare samne jatata nahi hu or naa hi baar baar bolta hu me bolunga to tumhe or tenison hogi',
            'Isiliye me hamesha jab tumhe problem hoti he to hasane ke liye ulti sidhi harkate karta hu taki tum us dard ko bhul jaao or',
            'Tumhara sara dhyan masti pr aa jaaye or tum mujhe cillao daato', 
            'Mujhe na bahut accha lagta he jab tum bolti ho na chup ho jaao',
            'Nahi to itna maarungi ye kr dungi vo kr dungi esa bolti ho to bahut accha lagta he', 
            'Tum hamesha khush raho baby',
            'Happy Birthday Khud ka dhyan na rakhne wali meri Pyari Bivi.',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1100, settleMs: 700, photoMs: 950, messageMs: 1500,
    },
    {
        id: 33,
        type: 'letter',
        marker: 'A Letter From the Heart',
        title: 'The Quiet Things I Notice',
        paragraphs: [
            'You think I don\'t notice, but I notice everything. The way your fingers find mine when you are tired. The way you talk to yourself when you think no one is listening.',
            'I notice how you give without ever counting the cost, how you make room for everyone except yourself - so I always make sure there is room for you.',
            'I will never stop noticing you. I hope you never stop letting me.',
            'I notice the way you say my name when you are happy, how it lands a little differently on those days - softer and brighter at the same time.',
            'I notice the small rituals you keep: the cup that must be exactly where you left it, the playlist you return to when the world gets loud.',
            'I notice the days you carry the world quietly - the ones where you smile for everyone else and save the tired part of you for me to hold.',
            'I notice how your face softens when you sleep, how the worry lines disappear and you finally look like the girl I met - the one I am still in love with.',
            'I notice the way you forgive people who never even asked to be forgiven, and the way you are hardest on yourself for the smallest things.',
            'And I notice myself changing - becoming gentler, more patient, more alive - because loving you has quietly taught me how.',
            'Somewhere between all these small noticings, I fell in love with the whole of you: the loud mornings and the quiet nights, the plans and the worries, the you the world sees and the you that only I get to know.',
            'So keep being exactly who you are. I am watching. I am keeping every single piece of it safe.',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1300, settleMs: 700, photoMs: 900, messageMs: 1450,
    },
    {
        id: 34,
        type: 'letter',
        marker: 'A Little Letter',
        title: 'For the Harder Days',
        paragraphs: [
            'Some days are heavy, and I want you to know I have felt their weight beside you. I have held your hand through them and I would do it a thousand times again.',
            'You have carried more than anyone should ever have to, and you have done it with a gentleness I still cannot find the words for.',
            'Whatever comes next, you will never carry it alone. I am here - not for the easy hours, but for all of them.',
            'When the morning already feels heavy, I want you to remember one thing: you do not have to be brave today. You only have to be here.',
            'You are allowed to rest. You are allowed to put the weight down. Resting is not giving up - it is how you gather yourself for the road again.',
            'I have seen you be brave in ways that had no audience, no applause, no one to notice except me - and I noticed, and I will never forget it.',
            'Some nights you will not have the words, and that is okay. You do not have to perform your strength for me. Silence is safe with me.',
            'We will take the hard days one hour at a time, and I will hold your hand through every single hour, even the ones we cannot explain.',
            'And on the days you forget how loved you are, I will remember for both of us, out loud, as many times as it takes.',
            'This is my promise: not that the road will be easy, but that you will never walk it alone.',
            'You are not a burden on your hardest days. You are the person I chose, and I choose you again every time the world feels like too much.',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1150, settleMs: 700, photoMs: 900, messageMs: 1400,
    },
    {
        id: 35,
        type: 'letter',
        marker: 'A Letter Across Time',
        title: 'Us, in Every Version',
        paragraphs: [
            'I have imagined us in a hundred futures - older, softer, slower - and in every single one, you are beside me, and I am still happy.',
            'It was never a place I loved. It was never the rooms or the road. It is the shape your hand makes when it finds mine.',
            'Wherever the years take us, I will keep choosing you. I will keep finding you. That is my favorite promise to keep.',
            'I have thought about what we will be in ten years - slower mornings, deeper silences, laughter that needs no reason - and every version of that life has your face in it.',
            'We will have laughed in rooms we have not entered yet, in cities we have not seen, on days that do not exist anywhere except in what we are building together.',
            'There will be fights about small things - the music, the dishes, whose turn it is - and I look forward to every single one of them, because arguing with you is still just being near you.',
            'Because a life with you, even in its ordinary minutes - the kettle, the news, the shared blanket - is the life I would choose again and again.',
            'I used to fear the future, all its unknown shapes and moving doors. Now I only fear the versions of it that do not have you in them.',
            'So let the years come. Let them change our faces and slow our steps. Let them grey our hair and soften our voices.',
            'In every version of us, I am still yours, and I am still happy. That is the only future I need.',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1250, settleMs: 700, photoMs: 950, messageMs: 1500,
    },
    {
        id: 36,
        type: 'letter',
        marker: 'A Letter for You',
        title: 'The Way Home',
        paragraphs: [
            'I used to believe home was a building, a street, a familiar bed. You taught me that home is a person.',
            'Every time I come back to you, something in me exhales. The city can keep its lights and the world can keep its noise - I only need the quiet that lives where you are.',
            'You are my home now. I hope you know it. I hope you always feel it.',
            'Home is the sound of your voice calling my name from the next room. Home is the half of the blanket you always leave for me.',
            'I have walked into places that should have felt like home and felt nothing at all - beautiful rooms, warm lights, and not a single heartbeat in them.',
            'And I have walked into rooms where you stood, plain and ordinary and simply being you, and felt the entire world settle into place.',
            'No matter how far the day takes me, there is a part of me that is already turning toward you before the door has even closed behind me.',
            'You are not a place I visit. You are the place I live - the address of every good thing in my life.',
            'When the world gets loud and the walls feel thin, I do not look for another city. I look for your hand.',
            'Wherever we are, wherever we go, whatever the address on the door says - if you are there, I am home.',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1200, settleMs: 700, photoMs: 900, messageMs: 1400,
    },
    {
        id: 37,
        type: 'letter',
        marker: 'A Little Letter',
        title: 'Before the Next Chapter',
        paragraphs: [
            'We have walked so far together that I sometimes forget how we began. But I remember how I feel now - certain, grateful, and braver than I have ever been.',
            'There are more memories to make, more songs, more quiet mornings, more of everything - and I want all of it with you.',
            'Thank you for being my person. This is only the middle of our story, and I cannot wait for everything that is still to come.',
            'We have shared meals that became stories, and silences that became understanding, and ordinary evenings that I have already filed away as the best days of my life.',
            'I have watched you love the people around you without keeping score, and I have watched that same love turn toward me and rearrange everything I thought I knew about being loved.',
            'Somewhere along the way, you became the easiest and the most important yes of my life - the one I would answer the same way every single time.',
            'The next chapter does not frighten me, because I have seen how we write our story - with patience, with laughter, and with grace when we stumble.',
            'There will be pages we cannot plan, days that do not go the way we hoped. And still, I want to write them all beside you, line by line, hand in hand.',
            'So here is my hand. Here is my heart. Here is everything I am, and everything I am still becoming - all of it, yours.',
            'Let us begin what comes next - slowly, together, the way we do everything.',
        ],
        signFrom: 'With all my love,',
        signName: 'Yours \u2665',
        titleAnimation: 'title-letter',
        photoAnimation: 'photo-letter',
        messageAnimation: 'message-letter',
        composition: 'compose-letter',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1300, settleMs: 700, photoMs: 950, messageMs: 1550,
    },
];


/* ------------------------------------------------------------
   BUILD THE FINAL READING ORDER
   ------------------------------------------------------------
   Photos and letters are merged into one `memories` sequence.
   Every item carries a `type` ("photo" or "letter") so the
   renderer can branch on it. Adding more photos later only
   means editing PHOTO_MEMORIES - the total is never shown.
   ------------------------------------------------------------ */
export const memories = (() => {
    const combined = [];
    let letterIndex = 0;

    PHOTO_MEMORIES.forEach((photo, index) => {
        combined.push({ type: 'photo', ...photo });

        if (
            letterIndex < LETTER_AFTER_PHOTO.length &&
            index + 1 === LETTER_AFTER_PHOTO[letterIndex]
        ) {
            combined.push(LETTER_MEMORIES[letterIndex]);
            letterIndex += 1;
        }
    });

    return combined;
})();


/* ------------------------------------------------------------
   ACT METADATA
   ------------------------------------------------------------
   These ranges only wrap the existing reading order. They are not
   entries, do not participate in progress, and never replace the
   exact-memory index used for restoration.
   ------------------------------------------------------------ */
export const MEMORY_ACTS = Object.freeze([
    Object.freeze({
        start: 0,
        end: 3,
        title: 'Where It Began',
        line: 'Some stories begin quietly, then become everything.',
    }),
    Object.freeze({
        start: 4,
        end: 13,
        title: 'The Little Things',
        line: 'Love found its shape in the moments no one else could see.',
        light: true,
    }),
    Object.freeze({
        start: 14,
        end: 18,
        title: 'What We Became',
        line: 'Somewhere along the way, comfort became home.',
        light: true,
    }),
    Object.freeze({
        start: 19,
        end: 30,
        title: 'The Life We Share',
        line: 'The life we choose is made of ordinary moments, held with care.',
        light: true,
    }),
    Object.freeze({
        start: 31,
        end: 36,
        title: 'What Comes Next',
        line: 'And still, the most beautiful part of us is ahead.',
    }),
]);


/* Timings - must match animation.css */
const EXIT_MS = 520;
const INTRO_EXIT_MS = 380;
const FINAL_DELAY_MS = 700;
const NEXT_IN_MS = 450;
const ACT_TRANSITION_MS = 900;
const ACT_TRANSITION_LIGHT_MS = 680;
const ACT_TRANSITION_EXIT_MS = 170;

/*
 * Letter reveal timings. The stagger is derived per letter:
 * roughly 9s total for the whole message (clamped 620-1050ms per
 * paragraph), so short letters feel unhurried and very long ones
 * never drag on.
 */
const PARA_STAGGER_TOTAL_MS = 9000;
const PARA_STAGGER_MIN_MS = 620;
const PARA_STAGGER_MAX_MS = 1050;
const PARA_ANIM_MS = 1000;
const PARA_FINAL_HOLD_MS = 1800;
const SCROLL_BACK_MS = 900;


/*
 * Progress persistence (per-device).
 *
 * The user's progress is remembered inside the browser's
 * localStorage only. No server, no cookies, no URL - just a
 * small JSON payload keyed per device/browser profile.
 */
const PROGRESS_KEY = 'hbm.memoryProgress';
const CONTINUE_THRESHOLD = 8;

/*
 * Read-state persistence (Issue: navigation buttons may only appear
 * once the visitor has actually reached the END of a long message).
 * Uses the exact same localStorage mechanism as the progress key
 * above - no new storage architecture. A memory whose message was
 * once scrolled to its end never gates the buttons again.
 */
const READ_KEY = 'hbm.memoryReadState';
const SCROLL_END_TOLERANCE_PX = 32;
const READ_SCROLL_KEYS = new Set([
    'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '
]);

/**
 * Safe localStorage access - some privacy modes throw.
 *
 * @returns {Storage|null} localStorage, or null when unavailable
 */
function getProgressStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}


/* Tiny graceful fallback if a photo file is missing */
const FALLBACK_IMAGE =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">' +
        '<rect width="800" height="1000" fill="#0d1830"/>' +
        '<circle cx="400" cy="400" r="180" fill="rgba(126,200,227,0.25)"/>' +
        '<text x="400" y="430" font-size="90" fill="#a8d0e6" text-anchor="middle">&#128153;</text>' +
        '<text x="400" y="640" font-size="34" fill="#8fddb1" text-anchor="middle" letter-spacing="6">MEMORY</text>' +
        '</svg>'
    );


/* ============================================================
   Class: MemoryLane
   ============================================================ */
export class MemoryLane {
    constructor() {
        // Cached elements
        this.section = null;
        this.intro = null;
        this.chapter = null;
        this.titleBlock = null;
        this.titleText = null;
        this.photoBlock = null;
        this.frame = null;
        this.photo = null;
        this.messageBlock = null;
        this.message = null;
        this.nextBtn = null;
        this.prevBtn = null;
        this.revealBtn = null;
        this.continueBtn = null;
        this.continueLabel = null;
        this.backIntroBtn = null;
        this.final = null;
        this.finalBtn = null;
        this.actTransition = null;
        this.actTransitionTitle = null;
        this.actTransitionCopy = null;
        this._actTransitionTarget = null;
        this._actTransitionPrevious = null;

        this.initialized = false;
        this.state = 'intro';
        this.stage = 'title';
        this.current = 0;
        this.queued = 0;
        this.reduced = prefersReducedMotion();
        this.timers = [];
        this.lifecycleToken = 0;

        // Optional stage hook - lets main.js follow the lane's
        // internal stage ('intro' | 'exiting' | 'playing' |
        // 'settled' | 'final') for the global Back button.
        this.onState = null;

        // Optional final-CTA hook - when set, main.js can intercept
        // the "A New Beginning" tap to hand over to the Timeline /
        // Secret Game instead of resetting the lane. Return true to
        // indicate the tap was handled.
        this.onFinal = null;

        // Animation classes
        this._titleAnim = '';
        this._photoAnim = '';
        this._messageAnim = '';

        /*
         * IMPORTANT:
         * Every time a new photo starts loading, this number increases.
         * If an older image finishes loading later, its onload handler
         * will be ignored.
         *
         * This prevents:
         * Memory 1 -> Memory 2
         * old Memory 1 image appearing after Memory 2 has started.
         */
        this._photoLoadToken = 0;

        /*
         * Read-gate state (Issue 7): while true, Preview/Next stay
         * hidden until the message is scrolled to its very end.
         * One bound scroll handler only - armed/disarmed per chapter.
         */
        this._awaitingRead = false;
        this._readTargetId = null;
        this._readUserInteracted = false;
        this._readMemories = null; // lazy-loaded Set of read memory ids
        this._onMessageScroll = () => this._handleMessageScroll();
        this._onReadIntent = (event) => {
            if (!this._awaitingRead) return;
            if (event.type === 'keydown' && !READ_SCROLL_KEYS.has(event.key)) return;
            this._readUserInteracted = true;
        };

        // Bound handlers
        this._onReveal = () => this.beginReveal();
        this._onNext = () => this.next();
        this._onPrev = () => this.prev();
        this._onContinue = () => this.continueFromSavedProgress();
        this._onBackIntro = () => this.returnToIntro();
        this._onFinal = () => {
            if (typeof this.onFinal === 'function') {
                try {
                    const handled = this.onFinal();
                    if (handled === true) return;
                } catch (e) { console.warn('MemoryLane onFinal hook failed', e); }
            }
            this.reset();
        };
        this._onKey = (event) => this.handleKey(event);
    }

    /** @returns {number} Total number of memories */
    get total() {
        return memories.length;
    }

    /** Scale a memory duration for reduced motion */
    scale(ms) {
        return this.reduced ? Math.max(40, Math.round(ms * 0.14)) : ms;
    }

    /* Notify main.js which stage is on screen. Never throws - a
       broken hook must not take the lane down. */
    _fireState(stage) {
        if (typeof this.onState !== 'function') return;
        try {
            this.onState(stage);
        } catch (error) {
            console.warn('Memory Lane stage hook failed.', error);
        }
    }


    /* ============================================================
       Lifecycle
       ============================================================ */

    enter({ restore = false } = {}) {
        if (!this.initialized) {
            this.initialized = true;

            this.section = $('#scene-2');
            this.intro = $('#memory-intro');
            this.chapter = $('#memory-chapter');
            this.titleBlock = $('#memory-title');
            this.titleText = $('#memory-title-text');
            this.photoBlock = $('#memory-photo-block');
            this.frame = $('#memory-frame');
            this.photo = $('#memory-photo');
            this.messageBlock = $('#memory-message-block');
            this.message = $('#memory-message');
            this.nextBtn = $('#memory-next');
            this.prevBtn = $('#memory-prev');
            this.revealBtn = $('#memory-reveal');
            this.continueBtn = $('#memory-continue');
            this.continueLabel = $('#memory-continue-label');
            this.backIntroBtn = $('#memory-back-intro');
            this.final = $('#memory-final');
            this.finalBtn = $('#memory-final-cta');
            this.restartIntroBtn = $('#memory-restart-intro');
            this.actTransition = $('#memory-act-transition');
            this.actTransitionTitle = $('#memory-act-transition-title');
            this.actTransitionCopy = $('#memory-act-transition-copy');

            this.revealBtn?.addEventListener('click', this._onReveal);
            this.nextBtn?.addEventListener('click', this._onNext);
            this.prevBtn?.addEventListener('click', this._onPrev);
            this.continueBtn?.addEventListener('click', this._onContinue);
            this.backIntroBtn?.addEventListener('click', this._onBackIntro);
            this.finalBtn?.addEventListener('click', this._onFinal);
            window.addEventListener('keydown', this._onKey);
        }

        this.reset({ persist: !restore });
    }


    /* ============================================================
       Reset
       ============================================================ */

    reset({ persist = true } = {}) {
        console.log('[MemoryLane] reset() called, current state:', this.state);
        this.clearTimers();

        // Remove any pending read-gate scroll listener.
        this.disarmReadWatch();

        /*
         * Invalidate any old image load operation.
         * If an old image finishes loading after reset(),
         * it will no longer be allowed to show itself.
         */
        this._photoLoadToken++;

        this.state = 'intro';
        this.stage = 'title';
        this.current = 0;
        this.queued = 0;
        this.hideActTransition();

        if (this.titleBlock) {
            this.titleBlock.classList.remove('is-in', 'is-settled');

            if (this._titleAnim) {
                this.titleBlock.classList.remove(this._titleAnim);
            }
        }

        this._titleAnim = '';

        if (this.photoBlock) {
            this.photoBlock.classList.remove('is-in');

            if (this._photoAnim) {
                this.photoBlock.classList.remove(
                    this._photoAnim
                );
            }
        }

        if (this.frame) {
            this.frame.classList.remove(
                'is-in',
                'photo-settle-glow',
                'photo-settle-tilt',
                'photo-settle-float',
                'photo-settle-shine',
                'photo-settle-breathe',
                'photo-settle-lift',
                'photo-settle-vignette',
                'photo-settle-rest'
            );

            if (this._photoAnim) {
                this.frame.classList.remove(this._photoAnim);
            }
        }

        this._photoAnim = '';

        if (this.messageBlock) {
            this.messageBlock.classList.remove('is-in');

            if (this._messageAnim) {
                this.messageBlock.classList.remove(this._messageAnim);
            }
        }

        this._messageAnim = '';

        if (this.chapter) {
            this.chapter.classList.remove('is-active');

            this.chapter.classList.remove(
                'chapter-exit-fade',
                'chapter-exit-left',
                'chapter-exit-zoom',
                'chapter-exit-up',
                'chapter-exit-blur'
            );

            this.chapter.hidden = true;
        }

        if (this.photo) {
            /*
             * Hide the image immediately.
             * This prevents the previous memory photo from
             * remaining visible while the new photo loads.
             */
            this.photo.style.opacity = '0';

            this.photo.removeAttribute('src');
            this.photo.removeAttribute('alt');
        }

        if (this.titleText) {
            this.titleText.textContent = '';
            this.titleText.removeAttribute('data-title');
        }

        if (this.titleBlock) {
            this.titleBlock.querySelector(
                '.memory-letter-marker'
            )?.remove();
        }

        if (this.message) {
            this.message.textContent = '';
            this.message.removeAttribute('data-message');
        }

        if (this.nextBtn) {
            this.nextBtn.hidden = true;
        }

        if (this.prevBtn) {
            this.prevBtn.hidden = true;
        }

        if (this.backIntroBtn) {
            this.backIntroBtn.hidden = true;
            this.backIntroBtn.classList.remove('is-visible');
        }

        if (this.restartIntroBtn) {
            this.restartIntroBtn.hidden = false;
            void this.restartIntroBtn.offsetWidth;
            this.restartIntroBtn.classList.add('is-visible');
        }

        if (this.intro) {
            this.intro.classList.remove('is-leaving');
            this.intro.hidden = false;
        }

        if (this.final) {
            this.final.hidden = true;
            this.final.classList.remove('memory-final-in');
            this._restoreFinalButton();
        }

        if (this.section) {
            this.section.scrollTop = 0;
        }

        /*
         * Visual reset only - the saved progress in localStorage
         * is left untouched on purpose.
         */
        this.refreshContinueButton();

        if (persist) this.saveCurrentPosition(null, 'intro');
        this._fireState('intro');
        console.log('[MemoryLane] reset() complete, new state:', this.state);
    }


    /* ============================================================
       Opening the memory book
       ============================================================ */

    beginReveal(targetIndex = 0) {
        if (this.state !== 'intro' || !this.intro) return;

        this.state = 'exiting';
        this._fireState('exiting');
        this.intro.classList.add('is-leaving');

        // Hide the restart intro button when intro leaves
        if (this.restartIntroBtn) {
            this.restartIntroBtn.classList.remove('is-visible');
        }

        this.later(INTRO_EXIT_MS, () => {
            if (this.intro) {
                this.intro.hidden = true;
            }

            if (this.restartIntroBtn) {
                this.restartIntroBtn.hidden = true;
            }

            if (this.chapter) {
                this.chapter.hidden = false;
            }

            this.startSequence(targetIndex);
        });
    }


    /* ============================================================
       Navigation
       ============================================================ */

    next() {
        // The message has not been read to its end yet - navigation
        // stays hidden/unavailable (first visit to this memory only).
        if (this._awaitingRead) return;

        if (this.state === 'intro') {
            /*
             * Enter the last completed memory when there is
             * saved progress, otherwise start from memory 1.
             */
            this.continueFromSavedProgress();
            return;
        }

        if (this.state === 'act-transition') {
            return;
        }

        if (this.state === 'final') {
            return;
        }

        if (this.state === 'settled') {
            this.advance(1);
            return;
        }

        this.queued += 1;
    }


    prev() {
        // Read-gate: same rule as Next while the message is unread.
        if (this._awaitingRead) return;

        if (this.state === 'act-transition') {
            this.cancelActTransition();
            return;
        }

        if (this.state === 'final') {
            if (this.final) {
                this.final.hidden = true;
                this.final.classList.remove('memory-final-in');
            }
            this._restoreFinalButton();
            // Clear final-specific state so :has selector no longer matches
            // and navigation returns to normal Preview/Next layout in one click
            this.state = 'settled';
            this._fireState('settled');
            this.advance(-1);
            return;
        }

        if (this.state !== 'settled') {
            return;
        }

        this.advance(-1);
    }


    advance(dir) {
        if (!this.chapter) return;

        const m = memories[this.current];
        const previousIndex = this.current;

        this.state = 'exiting';

        if (this.nextBtn) {
            this.nextBtn.hidden = true;
        }

        if (this.prevBtn) {
            this.prevBtn.hidden = true;
        }

        if (this.final) {
            this.final.hidden = true;
            this.final.classList.remove('memory-final-in');
            this._restoreFinalButton();
        }

        this.chapter.classList.add(m.exitAnimation);

        this.later(this.scale(EXIT_MS) + 40, () => {
            this.chapter.classList.remove(m.exitAnimation);

            const target =
                ((this.current + dir) % this.total + this.total) %
                this.total;

            if (dir > 0 && this.isActBoundary(target)) {
                this.showActTransition(target, previousIndex);
                return;
            }

            this.startSequence(target);
        });
    }


    /* ============================================================
       Act transitions
       ============================================================ */

    getActForIndex(index) {
        return MEMORY_ACTS.find(
            (act) => index >= act.start && index <= act.end
        ) || null;
    }

    isActBoundary(index) {
        const act = this.getActForIndex(index);
        return Boolean(act && act.start === index && index !== 0);
    }

    hideActTransition() {
        if (this.actTransition) {
            this.actTransition.hidden = true;
            this.actTransition.classList.remove('is-visible', 'is-leaving');
        }

        if (this.actTransitionTitle) {
            this.actTransitionTitle.textContent = '';
        }

        if (this.actTransitionCopy) {
            this.actTransitionCopy.textContent = '';
            this.actTransitionCopy.hidden = true;
        }

        this._actTransitionTarget = null;
        this._actTransitionPrevious = null;
    }

    showActTransition(target, previousIndex) {
        const act = this.getActForIndex(target);

        if (!act || !this.actTransition || !this.actTransitionTitle) {
            this.startSequence(target);
            return;
        }

        /* The current card is transient, but its incoming memory is
           persisted through the existing exact-memory record. A refresh
           therefore restores that memory directly instead of replaying a
           card or inventing a 38th entry. */
        this.clearTimers();
        this.disarmReadWatch();
        this.current = target;
        this.state = 'act-transition';
        this.stage = 'act-transition';
        this.queued = 0;
        this._actTransitionTarget = target;
        this._actTransitionPrevious = previousIndex;
        this.saveCurrentPosition(target, 'active');
        this._fireState('playing');

        if (this.chapter) {
            this.chapter.hidden = true;
        }

        this.actTransitionTitle.textContent = act.title;

        /* Boundaries after longer letters intentionally use title-only
           punctuation so the transition provides breath without adding
           another paragraph to read. */
        if (this.actTransitionCopy) {
            this.actTransitionCopy.hidden = Boolean(act.light);
            this.actTransitionCopy.textContent = act.light ? '' : act.line;
        }

        this.actTransition.hidden = false;
        this.actTransition.classList.remove('is-visible', 'is-leaving');
        void this.actTransition.offsetWidth;
        this.actTransition.classList.add('is-visible');

        const duration = this.scale(
            act.light ? ACT_TRANSITION_LIGHT_MS : ACT_TRANSITION_MS
        );

        this.later(duration, () => {
            if (
                this.state !== 'act-transition' ||
                this._actTransitionTarget !== target
            ) {
                return;
            }

            this.actTransition?.classList.add('is-leaving');

            this.later(this.scale(ACT_TRANSITION_EXIT_MS), () => {
                if (
                    this.state !== 'act-transition' ||
                    this._actTransitionTarget !== target
                ) {
                    return;
                }

                this.hideActTransition();

                /* The Act card temporarily hides the existing chapter
                   container. Restore that real container before handing
                   back to the unchanged memory renderer. */
                if (this.chapter) {
                    this.chapter.hidden = false;
                }

                this.startSequence(target);
            });
        });
    }

    /* Safe for any owner that must leave the lane while an Act card is
       visible. Timers are invalidated before the preceding real memory is
       restored, so a delayed card callback cannot reopen the lane. */
    cancelActTransition({ restorePrevious = true } = {}) {
        if (this.state !== 'act-transition') return false;

        const previousIndex = this._actTransitionPrevious;
        this.clearTimers();
        this.hideActTransition();

        if (restorePrevious && Number.isInteger(previousIndex)) {
            this.saveCurrentPosition(previousIndex, 'settled');
            this._restoreSettledMemory(previousIndex);
        }

        return true;
    }


    /* ============================================================
       Chapter sequence
       title -> photo -> message
       ============================================================ */

    startSequence(index) {
        const m = memories[index];

        if (!m || !this.chapter) return;

        this.clearTimers();
        this.hideActTransition();

        // A new chapter begins: any pending read-gate from the
        // previous message is removed together with its listener.
        this.disarmReadWatch();

        this.current = index;
        this.state = 'playing';
        this.stage = 'title';
        this.saveCurrentPosition(index, 'active');
        this._fireState('playing');

        if (this.nextBtn) {
            this.nextBtn.hidden = true;
        }

        if (this.prevBtn) {
            this.prevBtn.hidden = true;
        }

        /*
         * The top-right Back button belongs to the first memory
         * chapter only - every other chapter gets the on-screen
         * prev/next arrows instead.
         */
        this.refreshIntroBackButton();

        if (this.final) {
            this.final.hidden = true;
            this.final.classList.remove('memory-final-in');
            this._restoreFinalButton();
        }

        /*
         * IMPORTANT:
         *
         * Before starting a new memory, hide the old photo
         * immediately.
         *
         * This is an extra safety layer in addition to renderPhoto().
         */
        if (this.photo) {
            this.photo.style.opacity = '0';
        }

        this.chapter.classList.remove(
            'compose-a',
            'compose-b',
            'compose-c',
            'compose-d',
            'compose-e',
            'compose-f',
            'compose-g',
            'compose-h',
            'compose-letter'
        );

        this.chapter.classList.add(
            m.composition,
            'is-active'
        );

        if (this.photoBlock) {
            this.photoBlock.classList.remove('is-in');
        }

        if (this.messageBlock) {
            this.messageBlock.classList.remove('is-in');
        }


        /* --------------------------------------------------------
           1. Title content + entrance
           -------------------------------------------------------- */

        if (m.type === 'letter') {
            this.renderLetterTitle(m);
        } else {
            this.renderTitle(m);
        }

        if (this.titleBlock) {
            this.titleBlock.classList.remove(
                'is-in',
                'is-settled'
            );

            if (this._titleAnim) {
                this.titleBlock.classList.remove(this._titleAnim);
            }

            this._titleAnim = m.titleAnimation;

            void this.titleBlock.offsetWidth;

            this.titleBlock.classList.add(
                m.titleAnimation,
                'is-in'
            );
        }


        /* --------------------------------------------------------
           2. Title settles
           -------------------------------------------------------- */

        this.later(this.scale(m.titleMs), () => {
            if (this.titleBlock) {
                this.titleBlock.classList.remove('is-in');

                if (this._titleAnim) {
                    this.titleBlock.classList.remove(
                        this._titleAnim
                    );
                }

                this.titleBlock.classList.add('is-settled');
            }

            this.stage = 'photo';


            /* ----------------------------------------------------
               3. Photo content + entrance
               ---------------------------------------------------- */

            if (m.type === 'letter') {
                /*
                 * Letters have no photo - the heart divider
                 * fades in where the frame would sit.
                 */
                this.renderLetterHeart(m);

                if (this.photoBlock) {
                    this.photoBlock.classList.remove(
                        'is-in'
                    );

                    if (this._photoAnim) {
                        this.photoBlock.classList.remove(
                            this._photoAnim
                        );
                    }

                    this._photoAnim = m.photoAnimation;

                    void this.photoBlock.offsetWidth;

                    this.photoBlock.classList.add(
                        m.photoAnimation,
                        'is-in'
                    );
                }
            } else {
                this.renderPhoto(m);

                if (this.frame) {
                    this.frame.classList.remove(
                        'photo-settle-glow',
                        'photo-settle-tilt',
                        'photo-settle-float',
                        'photo-settle-shine',
                        'photo-settle-breathe',
                        'photo-settle-lift',
                        'photo-settle-vignette',
                        'photo-settle-rest'
                    );

                    if (this._photoAnim) {
                        this.frame.classList.remove(
                            this._photoAnim
                        );
                    }

                    this._photoAnim = m.photoAnimation;

                    void this.frame.offsetWidth;

                    this.frame.classList.add(
                        m.photoAnimation,
                        'is-in'
                    );
                }

                if (this.photoBlock) {
                    void this.photoBlock.offsetWidth;

                    this.photoBlock.classList.add('is-in');
                }
            }


            /* ----------------------------------------------------
               4. Photo settles
               ---------------------------------------------------- */

            this.later(this.scale(m.photoMs), () => {
                if (m.type === 'letter') {
                    /*
                     * The heart keeps its settled pose - only
                     * the entrance animation is released.
                     */
                    if (this.photoBlock && this._photoAnim) {
                        this.photoBlock.classList.remove(
                            this._photoAnim
                        );
                    }
                } else if (this.frame) {
                    this.frame.classList.remove('is-in');

                    if (this._photoAnim) {
                        this.frame.classList.remove(
                            this._photoAnim
                        );
                    }

                    this.frame.classList.add(
                        m.photoSettle
                    );
                }

                this.stage = 'message';


                /* ------------------------------------------------
                   5. Love message entrance
                   ------------------------------------------------ */

                if (m.type === 'letter') {
                    this.renderLetterMessage(m);
                } else {
                    this.renderMessage(m);
                }

                if (this.messageBlock) {
                    if (this._messageAnim) {
                        this.messageBlock.classList.remove(
                            this._messageAnim
                        );
                    }

                    this._messageAnim =
                        m.messageAnimation;

                    void this.messageBlock.offsetWidth;

                    this.messageBlock.classList.add(
                        m.messageAnimation,
                        'is-in'
                    );
                }

                /*
                 * Letters unfold paragraph by paragraph instead of
                 * appearing all at once: the reveal sequence scrolls
                 * the message container to follow each new paragraph,
                 * then glides back to the first line and settles.
                 */
                if (m.type === 'letter') {
                    this.revealLetterMessage(m);
                } else {
                    this.later(this.scale(m.messageMs), () => {
                        this.settleChapter();
                    });
                }
            });
        });

        this.preloadNeighbors();
    }


    /* ============================================================
       Chapter settled
       ============================================================ */

    /*
     * A chapter only counts as completed once its whole sequence
     * has settled. The last item in the collection still settles
     * here before entering its final state.
     *
     * ISSUE FIX: on a first-time visit to a message that actually
     * overflows, Preview/Next stay hidden until the user has really
     * scrolled to the end of the message. Already-read memories and
     * messages that fit the viewport show the controls immediately,
     * exactly as before (desktop unchanged).
     */
    settleChapter() {
        this.stage = 'settled';
        this.state = 'settled';
        this.saveCurrentPosition(this.current, 'settled');

        this.saveProgress(this.current + 1);

        const m = memories[this.current];

        if (this._armUnreadReadGate(m)) return;

        this._revealSettledControls();
    }

    /*
     * Show the settled-chapter controls. This is the exact control
     * flow settleChapter() always had - extracted so both the
     * immediate path and the read-gate path share it.
     */
    _revealSettledControls() {
        this.refreshPrevButton();

        if (this.current === this.total - 1) {
            this.later(this.scale(FINAL_DELAY_MS), () => {
                if (this.state !== 'settled') {
                    return;
                }

                this.state = 'final';
                this.saveCurrentPosition(this.current, 'final');
                this._fireState('final');

                if (this.final) {
                    this.final.hidden = false;

                    this.final.classList.remove(
                        'memory-final-in'
                    );

                    void this.final.offsetWidth;

                    this.final.classList.add(
                        'memory-final-in'
                    );
                    // Move A New Beginning into normal nav bar as right item
                    this._placeFinalButtonInNav();
                }
            });
        } else {
            this.showNextButton();
        }
    }


    /* ============================================================
       Read-gate: buttons appear only at the END of the message
       ============================================================ */

    /** True when reading the current message requires scrolling */
    messageOverflows() {
        const block = this.messageBlock;
        const chapter = this.chapter;

        // Letter chapters scroll inside their own message area.
        if (block && block.scrollHeight > block.clientHeight + SCROLL_END_TOLERANCE_PX) {
            return true;
        }

        // Photo chapters grow inside the scrolling chapter instead.
        return !!chapter && chapter.scrollHeight > chapter.clientHeight + SCROLL_END_TOLERANCE_PX;
    }

    /**
     * Arm the existing gate for an unread overflowing letter. Letter
     * entrance choreography scrolls the message programmatically, so its
     * settled reading position is reset before the user-only listener is
     * attached.
     */
    _armUnreadReadGate(m) {
        if (
            !m ||
            m.type !== 'letter' ||
            this.isMemoryRead(m.id) ||
            !this.messageOverflows()
        ) {
            return false;
        }

        if (m.type === 'letter' && this.messageBlock) {
            this.messageBlock.scrollTop = 0;
        }

        if (this.nextBtn) this.nextBtn.hidden = true;
        if (this.prevBtn) this.prevBtn.hidden = true;

        this.armReadWatch(m.id);
        return true;
    }

    /**
     * Watch the message until it has really been read to its END
     * (with a small tolerance for mobile rounding), then persist
     * "read" and reveal the navigation buttons. Never time-based -
     * only the actual scroll position counts.
     */
    armReadWatch(id) {
        this.disarmReadWatch();

        if (!this.messageBlock || !this.chapter) {
            // Missing containers - fall back to normal behavior.
            this._revealSettledControls();
            return;
        }

        this._awaitingRead = true;
        this._readTargetId = id;
        this._readUserInteracted = false;

        // One bound handler per scroll container (letters scroll the
        // message area, photos scroll the chapter) - never duplicated.
        this.messageBlock.addEventListener('scroll', this._onMessageScroll, { passive: true });
        this.chapter.addEventListener('scroll', this._onMessageScroll, { passive: true });
        this.messageBlock.addEventListener('wheel', this._onReadIntent, { passive: true });
        this.messageBlock.addEventListener('touchstart', this._onReadIntent, { passive: true });
        this.messageBlock.addEventListener('pointerdown', this._onReadIntent, { passive: true });
        this.chapter.addEventListener('wheel', this._onReadIntent, { passive: true });
        this.chapter.addEventListener('touchstart', this._onReadIntent, { passive: true });
        this.chapter.addEventListener('pointerdown', this._onReadIntent, { passive: true });
        window.addEventListener('keydown', this._onReadIntent, true);
    }

    disarmReadWatch() {
        this.messageBlock?.removeEventListener('scroll', this._onMessageScroll);
        this.chapter?.removeEventListener('scroll', this._onMessageScroll);
        this.messageBlock?.removeEventListener('wheel', this._onReadIntent);
        this.messageBlock?.removeEventListener('touchstart', this._onReadIntent);
        this.messageBlock?.removeEventListener('pointerdown', this._onReadIntent);
        this.chapter?.removeEventListener('wheel', this._onReadIntent);
        this.chapter?.removeEventListener('touchstart', this._onReadIntent);
        this.chapter?.removeEventListener('pointerdown', this._onReadIntent);
        window.removeEventListener('keydown', this._onReadIntent, true);
        this._awaitingRead = false;
        this._readTargetId = null;
        this._readUserInteracted = false;
    }

    /** Scroll listener: fires while the visitor reads the message */
    _handleMessageScroll() {
        if (!this._awaitingRead || this.state !== 'settled') return;
        if (!this._readUserInteracted) return;
        if (!this._isMessageAtEnd()) return;

        const id = this._readTargetId;
        this.disarmReadWatch();

        if (Number.isInteger(id)) {
            this.markMemoryRead(id);
        }

        this._revealSettledControls();
    }

    /**
     * True only when nothing unread remains below the visible area:
     * - letter chapters: the message area scrolled to its bottom;
     * - photo chapters: the end of the message scrolled into view;
     * - anything that fits entirely: readable without scrolling.
     */
    _isMessageAtEnd() {
        const block = this.messageBlock;
        const chapter = this.chapter;
        if (!block) return true;

        if (block.scrollHeight > block.clientHeight + SCROLL_END_TOLERANCE_PX) {
            const remaining =
                block.scrollHeight - block.scrollTop - block.clientHeight;
            return remaining <= SCROLL_END_TOLERANCE_PX;
        }

        if (chapter && chapter.scrollHeight > chapter.clientHeight + SCROLL_END_TOLERANCE_PX) {
            const gap =
                block.getBoundingClientRect().bottom -
                chapter.getBoundingClientRect().bottom;
            return gap <= SCROLL_END_TOLERANCE_PX;
        }

        return true;
    }

    /* ---- Read-state storage (same mechanism as progress) ---- */

    /**
     * Ids of memories whose message was fully read at least once.
     * Lazy-loaded once per page view, then cached in memory.
     *
     * @returns {Set<number>} read memory ids
     */
    loadReadMemories() {
        if (this._readMemories) return this._readMemories;

        const set = new Set();
        const storage = getProgressStorage();

        if (storage) {
            try {
                const data = JSON.parse(storage.getItem(READ_KEY));
                if (Array.isArray(data?.readMemoryIds)) {
                    for (const value of data.readMemoryIds) {
                        if (Number.isInteger(value)) set.add(value);
                    }
                }
            } catch {
                /* Corrupt payload -> treat as nothing read yet */
            }
        }

        this._readMemories = set;
        return set;
    }

    /** @returns {boolean} True when this memory was already read */
    isMemoryRead(id) {
        return this.loadReadMemories().has(id);
    }

    /** Persist a memory id as read (best-effort, add-only) */
    markMemoryRead(id) {
        const set = this.loadReadMemories();
        if (set.has(id)) return;

        set.add(id);

        const storage = getProgressStorage();
        if (!storage) return;

        try {
            storage.setItem(
                READ_KEY,
                JSON.stringify({ readMemoryIds: Array.from(set) })
            );
        } catch {
            /* Ignore - read state is best-effort */
        }
    }


    /* ============================================================
       Letter reveal - paragraph by paragraph
       ============================================================ */

    /*
     * The letter unfolds itself: every paragraph enters with the
     * same cinematic fade/rise/blur, the container scrolls down to
     * keep each new paragraph readable, and once the final
     * paragraph (and the signature) has had a moment on screen the
     * container glides back to the first line. The full message
     * stays in place afterwards - the user reads it normally.
     *
     * Every step is scheduled through later(), so reset()/
     * clearTimers() cancels any pending reveal the moment the
     * visitor leaves the chapter.
     */
    revealLetterMessage(m) {
        if (!this.messageBlock || !this.message) return;

        const paras = Array.from(
            this.message.querySelectorAll('.memory-letter-para')
        );

        const sign = this.message.querySelector(
            '.memory-letter-sign'
        );

        const steps = paras.concat(sign ? [sign] : []);

        if (steps.length === 0) {
            this.settleChapter();
            return;
        }

        const stagger = this.reduced
            ? 40
            : Math.min(
                  PARA_STAGGER_MAX_MS,
                  Math.max(
                      PARA_STAGGER_MIN_MS,
                      Math.round(
                          PARA_STAGGER_TOTAL_MS / steps.length
                      )
                  )
              );

        this.messageBlock.scrollTop = 0;

        steps.forEach((el, i) => {
            this.later(this.scale(stagger) * i, () => {
                if (this.state !== 'playing') return;

                el.classList.add('is-in');

                this.keepRevealedInView(el);
            });
        });

        const revealEnd =
            this.scale(stagger) * (steps.length - 1) +
            this.scale(PARA_FINAL_HOLD_MS);

        this.later(revealEnd, () => {
            if (this.state !== 'playing') return;

            this.scrollLetterBackToTop();
        });

        this.later(
            revealEnd + this.scale(SCROLL_BACK_MS),
            () => {
                if (this.state !== 'playing') return;

                this.settleChapter();
            }
        );
    }


    /*
     * Scroll the internal message container so the paragraph that
     * just entered stays comfortably readable - the title, photo
     * and header never move.
     */
    keepRevealedInView(el) {
        const block = this.messageBlock;

        if (!block) return;

        const blockRect = block.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const elTop =
            elRect.top - blockRect.top + block.scrollTop;

        const target = Math.max(
            0,
            elTop - (block.clientHeight - elRect.height) * 0.45
        );

        try {
            block.scrollTo({
                top: target,
                behavior: this.reduced ? 'auto' : 'smooth'
            });
        } catch {
            block.scrollTop = target;
        }
    }


    /*
     * Smoothly glide the message back to its first line once the
     * whole letter has been revealed.
     */
    scrollLetterBackToTop() {
        const block = this.messageBlock;

        if (!block) return;

        try {
            block.scrollTo({
                top: 0,
                behavior: this.reduced ? 'auto' : 'smooth'
            });
        } catch {
            block.scrollTop = 0;
        }
    }


    /* ============================================================
       Show Next button
       ============================================================ */

    showNextButton() {
        if (!this.nextBtn) return;

        this.nextBtn.hidden = false;

        this.nextBtn.classList.remove(
            'memory-next-in'
        );

        void this.nextBtn.offsetWidth;

        this.nextBtn.classList.add(
            'memory-next-in'
        );

        this.later(this.scale(NEXT_IN_MS), () => {
            if (
                this.queued > 0 &&
                this.state === 'settled'
            ) {
                this.queued -= 1;
                this.advance(1);
            }
        });
    }


    /* ============================================================
       Show Previous button
       ============================================================ */

    /**
     * The Back button appears once a chapter settles, so the
     * visitor can return to the previous memory. It stays hidden
     * on the first memory. Read-only for progress storage.
     */
    refreshPrevButton() {
        if (!this.prevBtn) return;

        this.prevBtn.hidden = this.current <= 0;

        this.prevBtn.classList.remove(
            'memory-prev-in'
        );

        if (this.current > 0) {
            void this.prevBtn.offsetWidth;

            this.prevBtn.classList.add(
                'memory-prev-in'
            );
        }
    }


    /* ============================================================
       Show Back-to-landing button (first memory only)
       ============================================================ */

    /**
     * The top-right Back button is a second way out of the first
     * memory chapter: it returns to the Our Memories landing.
     * Shown ONLY while the first memory is on screen; hidden for
     * every other memory (those use the on-screen arrows).
     */
    refreshIntroBackButton() {
        if (!this.backIntroBtn) return;

        this.backIntroBtn.hidden = this.current !== 0;

        this.backIntroBtn.classList.remove('is-visible');

        if (this.current === 0) {
            void this.backIntroBtn.offsetWidth;

            this.backIntroBtn.classList.add('is-visible');
        }
    }

    /**
     * Leave the first memory chapter and return to the landing
     * screen of the lane. Reuses reset() so the whole chapter is
     * torn down exactly like the final screen does.
     */
    returnToIntro() {
        if (this.state === 'intro') return;

        this.reset();
    }


    /* ============================================================
       Progress persistence (per-device)
       ============================================================ */

    /**
     * Read the last completed memory number.
     *
     * @returns {number} 0 when nothing is saved or data is invalid
     */
    loadProgress() {
        const storage = getProgressStorage();
        if (!storage) return 0;

        try {
            const raw = storage.getItem(PROGRESS_KEY);
            if (!raw) return 0;

            const data = JSON.parse(raw);
            const value = Number(data?.lastCompletedMemory);

            if (!Number.isInteger(value) || value < 1) {
                return 0;
            }

            return Math.min(value, this.total);
        } catch {
            return 0;
        }
    }

    _readProgressRecord() {
        const storage = getProgressStorage();
        if (!storage) return {};
        try {
            const data = JSON.parse(storage.getItem(PROGRESS_KEY));
            return data && typeof data === 'object' ? data : {};
        } catch {
            return {};
        }
    }

    loadCurrentPosition() {
        const data = this._readProgressRecord();
        const index = data.currentMemoryIndex;
        const state = data.currentMemoryState;
        if (!Number.isInteger(index) || index < 0 || index >= this.total) return null;
        if (state !== 'active' && state !== 'settled' && state !== 'final') return null;
        return { index, state };
    }

    saveCurrentPosition(index, state) {
        const storage = getProgressStorage();
        if (!storage) return;
        try {
            const data = this._readProgressRecord();
            data.currentMemoryIndex = Number.isInteger(index) ? index : null;
            data.currentMemoryState = state;
            storage.setItem(PROGRESS_KEY, JSON.stringify(data));
        } catch {
            /* Current position is best-effort and never blocks the lane. */
        }
    }

    /**
     * Store the last completed memory number.
     * Progress only moves forward - it is never lowered.
     *
     * @param {number} memoryNumber Memory number (1-based)
     */
    saveProgress(memoryNumber) {
        const storage = getProgressStorage();
        if (!storage) return;

        try {
            const lastCompletedMemory = Math.max(
                this.loadProgress(),
                memoryNumber
            );

            const data = this._readProgressRecord();
            data.lastCompletedMemory = lastCompletedMemory;
            storage.setItem(PROGRESS_KEY, JSON.stringify(data));
        } catch {
            /* Ignore - progress is best-effort */
        }
    }

    /** @returns {boolean} True when a Continue button should appear */
    hasContinueProgress() {
        return this.loadProgress() >= CONTINUE_THRESHOLD;
    }

    /**
     * @returns {number} Memory number to continue from,
     *                   0 when below the threshold
     */
    getContinueMemory() {
        const progress = this.loadProgress();
        return progress >= CONTINUE_THRESHOLD ? progress : 0;
    }

    /**
     * Show / hide the Continue button and update its label.
     * Read-only for storage - never writes progress.
     */
    refreshContinueButton() {
        if (!this.continueBtn) return;

        const memoryNumber = this.getContinueMemory();

        if (memoryNumber < CONTINUE_THRESHOLD) {
            this.continueBtn.hidden = true;
            return;
        }

        if (this.continueLabel) {
            this.continueLabel.textContent =
                'Continue from Memory ' + memoryNumber;
        }

        this.continueBtn.hidden = false;
    }

    /**
     * Open the last completed memory using the same
     * intro exit animation as the normal reveal.
     * Falls back to memory 1 without saved progress.
     */
    continueFromSavedProgress() {
        if (this.state !== 'intro') return;

        const memoryNumber = this.getContinueMemory();

        if (memoryNumber < CONTINUE_THRESHOLD) {
            this.beginReveal();
            return;
        }

        this.beginReveal(memoryNumber - 1);
    }

    /** Restore the exact saved lane entry without replaying its timed
        sequence or changing completion progress. */
    restoreCurrentPosition() {
        const position = this.loadCurrentPosition();
        if (!position) return false;
        this._restoreSettledMemory(position.index, position.state === 'final');
        return true;
    }

    _restoreSettledMemory(index, final = false) {
        const m = memories[index];
        if (!m || !this.chapter) return;

        this.clearTimers();
        this.disarmReadWatch();
        this.current = index;
        this.state = final ? 'final' : 'settled';
        this.stage = 'settled';
        this.queued = 0;

        if (this.intro) this.intro.hidden = true;
        this.chapter.hidden = false;
        this.chapter.classList.remove(
            'compose-a', 'compose-b', 'compose-c', 'compose-d',
            'compose-e', 'compose-f', 'compose-g', 'compose-h',
            'compose-letter'
        );
        this.chapter.classList.add(m.composition, 'is-active');

        if (m.type === 'letter') {
            this.renderLetterTitle(m);
            this.renderLetterHeart(m);
            this.renderLetterMessage(m);
            this.message?.querySelectorAll('.memory-letter-para, .memory-letter-sign')
                .forEach(el => el.classList.add('is-in'));
        } else {
            this.renderTitle(m);
            this.renderPhoto(m);
            this.renderMessage(m);
        }

        if (this.titleBlock) {
            this.titleBlock.classList.remove('is-in');
            if (this._titleAnim) this.titleBlock.classList.remove(this._titleAnim);
            this._titleAnim = m.titleAnimation;
            this.titleBlock.classList.add('is-settled');
        }
        if (this.photoBlock) this.photoBlock.classList.add('is-in');
        if (this.frame && m.type !== 'letter') {
            this.frame.classList.remove('is-in');
            if (this._photoAnim) this.frame.classList.remove(this._photoAnim);
            this._photoAnim = m.photoAnimation;
            this.frame.classList.add(m.photoSettle);
        }
        if (this.messageBlock) {
            if (this._messageAnim) this.messageBlock.classList.remove(this._messageAnim);
            this._messageAnim = m.messageAnimation;
            this.messageBlock.classList.add('is-in');
            this.messageBlock.scrollTop = 0;
        }

        this.refreshIntroBackButton();
        const awaitingRead = !final && this._armUnreadReadGate(m);

        if (awaitingRead) {
            // The existing entry remains exact; only its unread gate is
            // restored instead of exposing navigation on refresh.
        } else if (final) {
            this.refreshPrevButton();
            if (this.nextBtn) this.nextBtn.hidden = true;
            if (this.final) {
                this.final.hidden = false;
                this.final.classList.add('memory-final-in');
                this._placeFinalButtonInNav();
            }
        } else {
            this.refreshPrevButton();
            if (this.final) {
                this.final.hidden = true;
                this.final.classList.remove('memory-final-in');
                this._restoreFinalButton();
            }
            if (this.nextBtn) {
                this.nextBtn.hidden = false;
                this.nextBtn.classList.add('memory-next-in');
            }
        }

        this.preloadNeighbors();
        this._fireState(final ? 'final' : 'settled');
    }


    /* ============================================================
       Rendering
       ============================================================ */

    renderTitle(m) {
        if (!this.titleText) return;

        this.titleText.textContent = '';

        if (this.titleBlock) {
            this.titleBlock.querySelector(
                '.memory-letter-marker'
            )?.remove();
        }

        this.titleText.setAttribute(
            'data-title',
            m.title
        );

        this.buildWords(
            this.titleText,
            m.title,
            m.id
        );
    }


    /*
     * ===========================================================
     * FIXED PHOTO RENDERING
     * ===========================================================
     *
     * Old behaviour:
     *
     * Memory 1 image remains inside <img>
     *        ↓
     * Memory 2 changes src
     *        ↓
     * Browser starts loading Memory 2
     *        ↓
     * Memory 1 is still visible
     *        ↓
     * Memory 2 finishes loading
     *        ↓
     * Memory 2 appears
     *
     * New behaviour:
     *
     * Memory 1
     *        ↓
     * Hide image immediately
     *        ↓
     * Load Memory 2
     *        ↓
     * Memory 2 fully loaded
     *        ↓
     * Show Memory 2
     *
     * The load token also prevents an older image from
     * becoming visible after a newer memory has started.
     * ===========================================================
     */
    renderPhoto(m) {
        if (!this.photo) return;

        const photoElement = this.photo;
        const newSrc = m.image;

        /*
         * Create a unique token for this image request.
         */
        const loadToken = ++this._photoLoadToken;

        /*
         * Immediately hide whatever image is currently inside
         * the <img>.
         */
        photoElement.style.opacity = '0';

        /*
         * Update alt text immediately.
         */
        photoElement.alt = m.title;

        /*
         * Remove the old source before assigning the new one.
         *
         * This ensures the previous image cannot remain visible.
         */
        photoElement.removeAttribute('src');

        /*
         * New image successfully loaded.
         */
        photoElement.onload = () => {
            /*
             * If another memory started loading after this image,
             * ignore this old load event.
             */
            if (loadToken !== this._photoLoadToken) {
                return;
            }

            /*
             * Only show the image after the browser confirms
             * that the new image has loaded.
             */
            requestAnimationFrame(() => {
                if (loadToken !== this._photoLoadToken) {
                    return;
                }

                photoElement.style.opacity = '1';
            });
        };

        /*
         * New image failed to load.
         * Show the graceful fallback instead.
         */
        photoElement.onerror = () => {
            /*
             * Ignore an old image error.
             */
            if (loadToken !== this._photoLoadToken) {
                return;
            }

            /*
             * Prevent the fallback itself from triggering
             * the same error handler recursively.
             */
            photoElement.onload = null;
            photoElement.onerror = null;

            photoElement.src = FALLBACK_IMAGE;
            photoElement.style.opacity = '1';
        };

        /*
         * Start loading the new image.
         */
        photoElement.src = newSrc;
    }


    renderMessage(m) {
        if (!this.message) return;

        this.message.textContent = '';

        this.message.setAttribute(
            'data-message',
            m.message
        );

        this.buildWords(
            this.message,
            m.message,
            m.id + 100
        );
    }


    /* ============================================================
       Letter chapter rendering
       A letter chapter swaps the photo for a heart divider and
       renders marker + heading (title), paragraphs + signature
       (message) inside the same phase architecture.
       ============================================================ */

    renderLetterTitle(m) {
        if (!this.titleBlock || !this.titleText) return;

        this.titleText.textContent = '';

        this.titleBlock.querySelector(
            '.memory-letter-marker'
        )?.remove();

        const marker = document.createElement('span');
        marker.className = 'memory-letter-marker';
        marker.textContent = m.marker;

        this.titleBlock.appendChild(marker);

        this.titleText.setAttribute('data-title', m.title);

        this.buildWords(this.titleText, m.title, m.id + 300);
    }


    renderLetterHeart(m) {
        if (!this.photo) return;

        this.photo.style.opacity = '0';
        this.photo.removeAttribute('src');
        this.photo.removeAttribute('alt');
    }


    renderLetterMessage(m) {
        if (!this.message) return;

        this.message.textContent = '';

        this.message.setAttribute(
            'data-message',
            m.paragraphs.join(' ')
        );

        const frag = document.createDocumentFragment();

        for (const para of m.paragraphs) {
            const p = document.createElement('p');
            p.className = 'memory-letter-para';
            this.buildWords(p, para, m.id + 500);
            frag.appendChild(p);
        }

        const sign = document.createElement('div');
        sign.className = 'memory-letter-sign';

        const signFrom = document.createElement('p');
        signFrom.textContent = m.signFrom;

        const signName = document.createElement('p');
        signName.textContent = m.signName;

        sign.appendChild(signFrom);
        sign.appendChild(signName);
        frag.appendChild(sign);

        this.message.appendChild(frag);
    }


    /* ============================================================
       Build text animation spans
       ============================================================ */

    buildWords(container, text, salt) {
        const words = text.split(/\s+/);

        words.forEach((word, wi) => {
            if (wi > 0) {
                container.appendChild(
                    document.createTextNode(' ')
                );
            }

            const w = document.createElement('span');

            w.className = 'tw';

            w.style.setProperty(
                '--i',
                String(wi)
            );

            for (let li = 0; li < word.length; li++) {
                const l = document.createElement('span');

                l.className = 'tl';
                l.textContent = word[li];

                l.style.setProperty(
                    '--i',
                    String(wi * 3 + li)
                );

                l.style.setProperty(
                    '--dx',
                    String(
                        ((li * 37 + salt * 61) % 90) - 45
                    ) + 'px'
                );

                l.style.setProperty(
                    '--dy',
                    String(
                        ((li * 53 + salt * 29) % 70) - 35
                    ) + 'px'
                );

                l.style.setProperty(
                    '--rot',
                    String(
                        ((li * 13 + salt * 7) % 24) - 12
                    ) + 'deg'
                );

                w.appendChild(l);
            }

            container.appendChild(w);
        });
    }


    /* ============================================================
       Preload neighbouring photos
       ============================================================ */

    preloadNeighbors() {
        if (this.total === 0) return;

        const next =
            memories[
                (this.current + 1) % this.total
            ];

        const prev =
            memories[
                (this.current - 1 + this.total) % this.total
            ];

        for (const mem of [next, prev]) {
            if (mem.type === 'letter') continue;

            const probe = new Image();
            probe.src = mem.image;
        }
    }


    /* ============================================================
       Keyboard
       ============================================================ */

    handleKey(event) {
        if (
            this.section?.hidden ||
            !this.section.classList.contains('is-visible')
        ) {
            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.prev();
        }
    }


    /* ============================================================
       Final page button placement — reuse normal navigation
       ============================================================ */
    _placeFinalButtonInNav() {
        if (!this.finalBtn || !this.nextBtn || !this.prevBtn) return;
        const actions = document.querySelector('#memory-actions');
        const final = document.querySelector('#memory-final');
        if (!actions || !final) return;
        // Hide the normal Next button on final page
        this.nextBtn.hidden = true;
        // Move the final button into the normal nav bar as the right item (replacing Next)
        if (this.finalBtn.parentElement !== actions) {
            actions.appendChild(this.finalBtn);
            this.finalBtn.classList.add('memory-nav', 'memory-next', 'is-moved-final');
            this.finalBtn.style.marginLeft = 'auto';
            this.finalBtn.style.marginRight = '0';
        }
        // Ensure the final overlay does not affect layout (text already hidden via CSS)
        if (final) {
            final.hidden = false;
            final.style.display = 'block';
            final.style.visibility = 'hidden';
            final.style.pointerEvents = 'none';
            final.style.position = 'absolute';
            final.style.inset = '0';
            final.style.opacity = '0';
        }
        // Make the nav bar show Preview left, New Beginning right — same as normal [Preview][Next] opposite corners, same baseline
        actions.style.justifyContent = 'space-between';
        actions.style.gap = '1rem';
    }

    _restoreFinalButton() {
        if (!this.finalBtn) return;
        const final = document.querySelector('#memory-final');
        const actions = document.querySelector('#memory-actions');
        if (!final || !actions) return;
        // Move button back to its original container if it was moved
        if (this.finalBtn.parentElement === actions) {
            final.appendChild(this.finalBtn);
            this.finalBtn.classList.remove('is-moved-final');
            this.finalBtn.style.marginLeft = '';
            this.finalBtn.style.marginRight = '';
        }
        // Restore final overlay to normal hidden state
        if (final) {
            final.hidden = true;
            final.classList.remove('memory-final-in');
            final.style.display = '';
            final.style.visibility = '';
            final.style.pointerEvents = '';
            final.style.position = '';
            final.style.inset = '';
            final.style.opacity = '';
        }
    }

    /* ============================================================
       Timers / cleanup
       ============================================================ */

    later(ms, fn) {
        const lifecycle = this.lifecycleToken;
        let id = null;
        id = setTimeout(() => {
            this.timers = this.timers.filter((timerId) => timerId !== id);
            if (lifecycle !== this.lifecycleToken) return;
            fn();
        }, ms);

        this.timers.push(id);

        return id;
    }


    clearTimers() {
        this.lifecycleToken++;
        for (const id of this.timers) {
            clearTimeout(id);
        }

        this.timers = [];
    }


    destroy() {
        this.clearTimers();
        this.hideActTransition();

        /*
         * Remove any pending read-gate scroll listener.
         */
        this.disarmReadWatch();

        /*
         * Invalidate any pending image load.
         */
        this._photoLoadToken++;

        this.revealBtn?.removeEventListener(
            'click',
            this._onReveal
        );

        this.nextBtn?.removeEventListener(
            'click',
            this._onNext
        );

        this.prevBtn?.removeEventListener(
            'click',
            this._onPrev
        );

        this.continueBtn?.removeEventListener(
            'click',
            this._onContinue
        );

        this.backIntroBtn?.removeEventListener(
            'click',
            this._onBackIntro
        );

        this.finalBtn?.removeEventListener(
            'click',
            this._onFinal
        );

        window.removeEventListener(
            'keydown',
            this._onKey
        );
    }
}
