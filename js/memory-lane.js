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
        title: 'Meri Shararti Baby',
        image: 'assets/images/memories/dummy-photo-01.jpg',
        message: 'Happy Birthday, Baby. Maine tumhe bachpan se to nahi dekha, lekin abhi jis tarah se me tumhe jaanta hu, us hisaab se to tum bahut shararti rahi hogi.',
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
        title: 'Meri Pyari Chipkali',
        image: 'assets/images/memories/dummy-photo-02.jpg',
        message: 'Tumhari vo sharartein, tumhara chanchalpan, vo aaj bhi tumhare andar he jo maine bachpan me to nahi dekha, lekin aaj zaroor dekh raha hu.',
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
        title: 'Meri Pyari Baby',
        image: 'assets/images/memories/dummy-photo-03.JPG',
        message: 'Tum bahut pyari ho baby. Tum jab se meri life me aai ho, ek alag hi duniya basa li he maine tumhare sath aur me puri zindagi tumhare sath jeena chahta hu.',
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
        title: 'Pehli Mulakat',
        image: 'assets/images/memories/dummy-photo-04.JPG',
        message: 'Biwi, tumhe yaad he hamari pehli mulakat, jab hum raste me jaa rahe the aur maine tumse kaha tha hum vaha par photo khinchenge, lekin tumne mana kr diya tha. Lekin humne vaha par kitni saari photos khinchi thi.',
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
        title: 'Teesri Mulakat',
        image: 'assets/images/memories/dummy-photo-05.JPG',
        message: 'Baby, tumhe pata he iss din me tumse itna dar raha tha. Lekin mann mein main bas yahi soch raha tha ki kaash ye din, ye pal yahi ruk jaaye, kabhi khatam hi naa ho.',
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
        title: 'Paanchvi Mulakat',
        image: 'assets/images/memories/dummy-photo-06.JPG',
        message: 'Ye mulakat to tumhe yaad hi hogi, baby. Iss mulakat ne humare rishte ko ek nayi pahchan di thi, jisse hamara rishta aur gehra ho gaya tha.',
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
        title: 'Saatvi Mulakat',
        image: 'assets/images/memories/dummy-photo-07.jpg',
        message: 'Iss mulakat ne to hamari puri life ko hi change kar diya, hamare ek dusre ke liye pyar aur vishwas ko hi jaga diya aur tumhe meri biwi bana diya.',
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
        title: 'Tumhare Ye Pyare Reactions',
        image: 'assets/images/memories/dummy-photo-08.JPG',
        message: 'Baby, tum jo itne pyare pyare face banati ho naa, kitni pyari lagti ho yaar. Bahut pyari lagti ho mere samne. Jab tum aise reactions deti ho, to me to sab bhul jaata hu, mera gussa sab kuch.',
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
        title: 'Meri Shirt Wali Yaad',
        image: 'assets/images/memories/dummy-photo-09.JPG',
        message: 'Us din tumne jab meri shirt pahni thi naa, vo shirt me jab bhi pehenta hu, mujhe uss din ki yaad aati he. Tum kitni pyari lag rahi thi, baby.',
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
        title: 'Garba Queen',
        image: 'assets/images/memories/dummy-photo-10.JPG',
        message: 'Baby, me bahut regret karta hu ki hum itne paas ho kr bhi maine kabhi tumhe iss look me nahi dekh paaya, tumhari 7th se 10th tk ki setaniya.',
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
        title: 'Tumhara Naya Look',
        image: 'assets/images/memories/dummy-photo-11.JPG',
        message: 'Iss dress me bhi tum kya lagti ho, baby. Tumhara ek naya look bahar aata he iss dress me. Vese to tum har dress me hi perfect lagti ho, lekin iss dress me to tumhara pura face hi change ho jaata he.',
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
        title: 'Chhoti Magar Mazedaar',
        image: 'assets/images/memories/dummy-photo-12.jpg',
        message: 'Ye mulakat to bahut hi pyari thi, baby. Bhale hi chhoti si thi, lekin hamne jo memories create ki thi, vo to hum kabhi nahi bhulenge, hamari masti.',
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
        title: 'Big Boss Cafe',
        image: 'assets/images/memories/dummy-photo-13.JPG',
        message: 'Iss mulakat ke liye hum kya kya soch kr gaye the, lekin kya nikla, ye mulakat bhi badi hi mazedar thi. Short cabin me alag hi experience tha.',
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
        title: 'Palak Paneer',
        image: 'assets/images/memories/dummy-photo-14.jpg',
        message: 'Ye mulakat to tumhe yaad hi hogi. Pure 8 mahine baad hum mile the. Usme bhi tum mere liye jo palak paneer lai thi, uski to baat hi alag thi baby.',
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
        title: 'Hamari Masti',
        image: 'assets/images/memories/dummy-photo-15.jpg',
        message: 'Iss mulakat me humne jo bachpana dikhaya tha, kitna maza aaya tha baby. Humari ladai, hamari masti ek alag hi yaadein ban gai he.',
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
        title: 'Meri Khadoos Biwi',
        image: 'assets/images/memories/dummy-photo-16.jpg',
        message: 'Ye photo mere liye bahut important he. Iss dress me photo paane ke liye maine bahut intezar kiya he, aur tum bhi kya khoob ho, tumne cameraman ko hi bula liya aur fir photo bheji.',
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
        title: 'Hamari Pehli Kiss',
        image: 'assets/images/memories/dummy-photo-17.jpg',
        message: 'Vese baby, mujhe aaj tk samjh nahi aaya, tum iss mulakat me itna kya soch rahi thi? Kya tum ghar se hi kiss lene ka plan bana kr aai thi aur mauke ke liye itna soch rahi thi?',
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
        title: 'Tumhari Smile',
        image: 'assets/images/memories/dummy-photo-18.jpg',
        message: 'Baby, jab tum zor zor se hasti ho na, to bahut pyari lagti ho. Pyari to tab bhi lagti ho, jab dheere se hasti ho, lekin zor se hasti ho to zyada pyari lagti ho.',
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
        title: 'Tumhari Natural Beauty',
        image: 'assets/images/memories/dummy-photo-19.jpg',
        message: 'Dekho baby, isiliye bolta hu ki Makeup mt kiya karo. Iss photo me kitni pyari lag rahi ho, yahi to he tumhari natural beauty. Lekin tumhe to putti ka sahara lena he.',
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
        title: 'Tumhare Poses',
        image: 'assets/images/memories/dummy-photo-20.jpg',
        message: 'Baby yaar, tumne mujhse kitna kuch chupaya. Tum bolti thi ki mujhe kuch bhi nahi aata he, na pose dena, na face expressions dena, aur abhi dekho, tum to master ho in sab me.',
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
        title: 'Woh Khaas Dress',
        image: 'assets/images/memories/dummy-photo-21.jpg',
        message: 'Baby, tumhe nahi lagta ki tum iss dress me kuch zyada hi pyari lagti ho? Iss dress ke tum sare photos dekh lo, tum sab me alag hi bawal macha rahi ho.',
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
        title: 'Snapchat Queen',
        image: 'assets/images/memories/dummy-photo-22.jpg',
        message: 'Rakhi ke din bhi tumne alag hi khushi di he mujhe. Iss din iss dress me tumhari snap kya hi thi, tum bahut pyari lag rahi thi.',
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
        title: 'Saree Mein Meri Baby',
        image: 'assets/images/memories/dummy-photo-23.jpg',
        message: 'Saree me to tumhari beauty ka koi jawab hi nahi he, baby. Bhale hi thodi patli lagti ho, lekin bahut pyari lagti ho, ek dum bemisaal.',
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
        title: 'Meri Shirt Mein Tum',
        image: 'assets/images/memories/dummy-photo-24.jpg',
        message: 'Baby, tumhe us din kaisa laga tha, jis din tumne meri shirt pahni thi? Kuch special feel hua tha ya meri shirt se gandi smell aa rahi thi? Mujhe batana haa.',
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
        title: 'Aankhon Ka Jaadu',
        image: 'assets/images/memories/dummy-photo-25.jpg',
        message: 'Baby tumhari aankhon me pata nahi kya jaadu he, jitni baar dekhta hu utni baar bas dekhta hi reh jaata hu. Tum kuch bolo ya naa bolo, tumhari aankhein hi bahut kuch keh deti hain. Sach me baby, tumhari aankhein bahut pyari hain.',
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
        title: 'Khoobsurat Kaun?',
        image: 'assets/images/memories/dummy-photo-26.jpg',
        message: 'Kuch bhi kaho, Baby, hum sath me khubsurat to lagte he yaar. Bhale hi me thoda zyada handsome hu, lekin tum bhi kuch kam nahi ho. Mujhe thodi bahut takkar to de hi deti ho.',
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
        title: 'Meri Malkin',
        image: 'assets/images/memories/dummy-photo-27.JPG',
        message: 'Baby, agar tum meri malkin naa hoti, to fir me tumhe batata ki me kitna sigma boy hu. Abhi to me sab sah leta hu.',
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
        title: 'Wish Puri Karogi?',
        image: 'assets/images/memories/dummy-photo-28.jpg',
        message: 'Baby, mujhe na iss dress me tumhare sath time spend karna he. Mujhe na tum iss dress me bahut pyari lagti ho, kuch kya bahut zyada hi pyari. To batao, milogi naa?',
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
        title: 'Woh Purani Insta Photo',
        image: 'assets/images/memories/dummy-photo-29.jpg',
        message: 'Tumhe pata he baby, ye photo maine tumhare insta par dekha tha. Tab mujhe pata chala tha ki tum saree me itni zyada pyari lagti ho. Kuch bhi bolo, saree tumhare upar suit to karti he.',
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
        title: 'Meri Favourite Photo',
        image: 'assets/images/memories/dummy-photo-30.jpg',
        message: 'Baby, tum kitne bhi photos khincha lo, kitne bhi acche khincha lo, lekin iss photo ki baat hi kuch aur he. Isme tum itni pyari lagti ho naa, sach me baby, tum bahut pyari ho. I Love you Soo Much.',
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

const GRAPHEME_SEGMENTER =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;

function splitGraphemes(text) {
    if (GRAPHEME_SEGMENTER) {
        return Array.from(
            GRAPHEME_SEGMENTER.segment(text),
            ({ segment }) => segment
        );
    }

    // Preserve code points and common emoji/combining sequences in browsers
    // without Intl.Segmenter, rather than splitting UTF-16 surrogate pairs.
    const graphemes = [];
    let joinNext = false;

    for (const char of Array.from(text)) {
        const joinsPrevious =
            joinNext ||
            char === '\u200D' ||
            /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE00-\uFE0F\u20E3\u{1F3FB}-\u{1F3FF}]/u.test(char);

        if (graphemes.length && joinsPrevious) {
            graphemes[graphemes.length - 1] += char;
        } else {
            graphemes.push(char);
        }

        joinNext = char === '\u200D';
    }

    return graphemes;
}

const LETTER_MEMORIES = [
    {
        id: 31,
        type: 'letter',
        marker: 'Tumhare Birthday Par',
        title: 'Happy Birthday, Khushbu',
        paragraphs: [
            'Pyari Biwi,',
            'Happy Birthday Baby. Tumhe pata he aaj ka din mere liye kitna special he? Kyunki aaj us insaan ka birthday he jiske baare me sochte hi mere chehre par smile aa jaati he. 🎂',
            'Tum meri zindagi ka wo hissa ho jise main words me poori tarah samjha bhi nahi sakta hu. Tumhari ek chhoti si baat mera din bana deti he, aur tumse ek baar milna bhi mujhe andar se bahut achha feel karata he. Shayad tumhe khud bhi nahi pata hoga ki tum meri zindagi me mere liye kitni important ho baby. ❤️',
            'Aaj tumhare birthday par main bas itna kehna chahta hu ki meri har wish me tum hoti ho. Main dil se chahta hu ki tumhari zindagi me kabhi kisi cheez ki kami naa ho. Tumhare saare sapne poore ho, tum jo bhi paana chahti ho wo tumhe mile aur tum hamesha khush raho baby. 💗',
            'Tumhare saath baat karna, tumhari care karna aur tumhe khush dekhna mujhe sach me bahut pasand he baby. Kabhi-kabhi lagta he ki tum meri aadat ban gayi ho. Din kitna bhi busy ho, ek baar tumhare baare me sochna to hota hi he baby.... 🫶',
            'Aaj ke din main Bhagwan se bas yahi chahta hu ki tumhari zindagi hamesha khushiyon se bhari rahe. Tumhare chehre ki smile kabhi kam naa ho aur tum jis cheez ko dil se chaho wo tumhe zaroor mile baby.. ✨',
            'Aur haan, thank you..... Meri zindagi me aane ke liye, meri baaton ko sunne ke liye aur bina kuch kahe bhi mujhe samajh lene ke liye. Tum sach me mere liye bahut special ho baby.. ❤️',
            'Happy Birthday meri duniya, meri jaan, mere dil ki khushi. Aaj ka din tumhare naam, aur meri har wish bhi tumhare naam. Khush raho, muskurati raho aur hamesha mere dil ke sabse kareeb raho. ✨',
        ],
        signFrom: 'Bahut Saare Pyaar Ke Saath,',
        signName: 'Tumhara Pati \u2665',
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
        marker: 'Meri Chhoti Si Request',
        title: 'Meri Ek Baat Maanogi?',
        paragraphs: ['Ek baat bolu?',
             'Meri pyari Biwi🦎🦎 yeh rokna tokna mujhay bhi pasand nahi hai par kya karun baby Aapka pati hu na, duniya ki gandi najron se bachana chahta hu kyonki is jamaney ko mai acchi tarah janta hu.. 💗',
            'Me aapko countrol me nahi bas safe and secure rakhna chahta hu kyonki aap meri sabsey kimati daulat ho, Mera sabsey anmol tohfa ho aur meri izzat ho aap mujhey galat mat samjhna Happy Birthday Meri gussel Biwi...!!',
            'Baby tum meri ek baat maanogi',
            'Baby tum na apna dhyan rakha karo na mujhe na bahut dar lagta he Jab tumhari tabiyat kharab hoti he naa tab, Baby tum naa bilkul bhi apna dhyan nahi rakhti ho. 🥺',
            'Time se khana to khati hi nahi ho', 
            'Tum apne iss birthday Pr meri ek baat maan lo na baby tum khud se ek promiss karo mujhse mt karo promiss, Promiss karo ki tum apna dhyan rakhogi waqt se khana khaogi or postic khana khaogi ❤️',
            'Esa vesa junck food nahi khaogi or Sub se zaruri jyda phone nahi chalaogi', 
            'Mujhe pata he abhi jab se tumhara phone aaya he tum bahut jyda hi phone chalane lagi ho Haa to baby sub se pahle to tum ye phone chalana band karo Mtlb chalao pr limit me..',
            'Tumhe pata he mera na sarir kaanpne lagta he jab me suntan hu ki tumhari tabiyat kharab he, Tumhe kahi dard ho raha he kamar dard, sar dard yaa tumhe kuch ho gaya he Me tumhare samne jatata nahi hu or naa hi baar baar bolta hu me bolunga to tumhe or tenison hogi 🥺',
            'Isiliye me hamesha jab tumhe problem hoti he to hasane ulti sidhi harkate karta hu taki tum us dard ko bhul jaao or Tumhara shaara dhyan masti pr aa jaaye or tum mujhe cillao daato',
            'Mujhe na bahut accha lagta he jab tum bolti ho na chup ho jaao Nahi to itna maarungi ye kr dungi vo kr dungi esa bolti ho to bahut accha lagta he',
            'Tum hamesha khush raho baby',
            'Happy Birthday Khud ka dhyan na rakhne wali meri Pyari Bivi. 🫶',
        ],

        signFrom: 'Tumhari Fikr Karne Wala,',
        signName: 'Tumhara Pati \u2665',
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
        marker: 'Dil Ki Ek Baat',
        title: 'Pyaar Aur Ladai Ki Application',
        paragraphs: ['To,',
            'My Malkin,',
            'Subject: Maaf kar dena mujhe,',
            'Dear Wife,',
            'Mujhe pata hai ki galti meri hi hoti hai. Main bohot zyada sochta hu, bohot zyada haq jatane wala aur hifazat karne wala ho jaata hu. Poora din sirf tumhare baare mein hi sochta rehta hu, aur shayad isi wajah se tumse zarurat se zyada umeedein laga baithta hu. Mujhe pata hai kabhi-kabhi meri ye aadatein tumhe bhi pareshan karti hongi. 🥺',
            'Jab tum online nahi aa paati ya hum baat nahi kar paate he, tab main bas tumhara intezar karta rehta hu. Tadapta hu, aise rota hu, aur rote-rote wahi galtiyaan kar deta hu jo tumne mujhe kitni baar mana ki hain. Baad mein sirf ek hi baat sochta hu ki maine phir sab kuch khud hi kharab kar diya. 🥺',
            'Sach kahu... main bhi khud se pareshan hu. Main bhi chahta hu ki main itna zyada na sochu aur tumhe sirf sukoon du. Bas meri har galti ke peeche sirf ek hi wajah hoti hai — main tumse bohot zyada pyaar karta hu. 💗',
            'Isliye agar kabhi mujhse galti ho jaaye, to bas mera haath mat chhodna. Main har din apne aap ko tumhare liye behtar banane ki koshish kar raha hu. 🤝',
            'Main tumhare liye baarish toh nahi rok sakta, lekin tumhare saath bheeg zaroor sakta huu. 🫂',
            'Agar tumhaari aankhon se neend rooth jaye, toh main tumhare saath poori raat jaag zaroor sakta huu..',
            'Agar kisi pareshani ka hal na mile, toh tumhare saath khamoshi se baith kar ro bhi sakta huu..',
            'Jab tumhare paas koi na ho, toh main bina kuch kahe tumhare har dard ko sun sakta huu.. 🫶',
            'Aur main tumse tab bhi mohabbat karta rahunga,',
            'Jab tum khud se tang aa jaogi...',
            'Me tumhara saath kabhi nahi chhodunga, hamesha tumhari parchai ban kr tumhare saath rahunga baby. ❤️',
            'Hamesha Tumhara',
        ],
        signFrom: 'Har Ladai Ke Baad Bhi,',
        signName: 'Tumhara Pati \u2665',
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
        marker: 'Mere Dil Se Tumhare Liye',
        title: 'Tum Meri Zindagi Ka Sabse Khoobsurat Hissa Ho',
        paragraphs: [ 'Dear Wife,',
            'Kabhi-kabhi main sochta hoon ki agar tum meri zindagi mein nahi aati, to shayad mujhe kabhi samajh hi nahi aata ki kisi ka hona itna sukoon bhi de sakta hai. Tum sirf meri mohabbat nahi ho, balki meri har muskurahat ki wajah ho. 💗',
            'Tumhare saath bitaya hua har pal mere liye khaas hai. Chahe hum ghanton baatein karein ya phir ek-doosre ke saath chup-chaap rahein, tumhari maujoodgi hi mere dil ko sukoon de deti hai. Tum mujhe bina kuch kahe samajh leti ho aur yakeen mano, ye ehsaas duniya ka sabse khoobsurat ehsaas hai. ❤️',
            'Jab bhi main thak jata hoon ya zindagi mushkil lagti hai, tumhara ek chhota sa paigam, tumhari awaaz ya tumhari ek pyari si baat meri saari himmat wapas le aati hai. Tum meri taaqat ho, mera sukoon ho aur meri har dua ka sabse pyara jawab ho. ✨',
            'Main chahta hoon ki hum hamesha isi tarah ek-doosre ka haath pakadkar har mushkil ka saamna karein aur har khushi ko saath mein jiyein. Waqt badal sakta hai, halaat badal sakte hain, duniya badal sakti hai, lekin tumhare liye mera pyaar, sammaan aur fikr kabhi nahi badlega. 🫂',
            'Main har din bhagwan ko shukriya bolta hoon ki unhone tumhe meri zindagi mein bheja. Tum meri aadat ho, meri dua ho, meri khushi ho aur meri zindagi ki sabse khoobsurat kahani ho. 😊',
            'Main vaada karta hoon ki chahe kuch bhi ho, main hamesha tumhara saath dene ki koshish karunga. Tumhari khushi mein khush rahunga, tumhare dukh mein tumhara sahara banunga aur jab bhi tumhe meri zarurat hogi, main tumhare paas rahunga. 🫶',
            'Mujhe nahi pata hamari kahani kitni lambi hogi, lekin main itna zaroor jaanta hoon ki jab tak meri saansein hain, mere dil mein tumhare liye wahi pyaar rahega. Tum mere liye sirf ek insaan nahi ho... tum woh ehsaas ho jise main apni poori zindagi apne paas rakhna chahta hoon.',        
            'Main tumse pyaar karta hu, Meri Jaan... Aaj bhi, Kal bhi aur har us din jab tak mera dil dhadakta rahega. ✨',
        ],
        signFrom: 'Har Din Tumse Pyaar Karne Wala,',
        signName: 'Tumhara Pati \u2665',
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
        marker: 'Hum Dono Ke Liye',
        title: 'Hamara Har Roop',
        paragraphs: ['Pyari Biwi,',
            'Mujhe jeena hai to tumhare saath jeena hai, mujhe hasna hai to tumhare saath hasna hai. Mujhe rona hai to tumhare kandhe par rona hai, mujhe chalna hai to tumhara haath pakad kar chalna hai. 🫂',
            'Mujhe har subah tumhari muskurahat dekhni hai, har raat tumhari awaaz sunni hai.',
            'Mujhe apni har khushi tumhare saath baantni hai aur har dard tumhare saath sehna hai. 💞',
            'Mujhe gussa bhi tum par hi karna hai, shikayat bhi tumse hi karni hai, aur har baar manaana bhi tumse hi hai. 🫶',
            'Mujhe apni har dua mein sirf tumhe maangna hai.',
            'Mujhe pyaar chahiye to sirf tumhara, waqt chahiye to sirf tumhara, saath chahiye to sirf tumhara.',
            'Aur agar zindagi mein kuch maangna ho, to bas tumhe hi maangna hai...',
            'Kyunki mere liye meri poori duniya',
            'sirf tum ho. ❤️',
            'Bas tum... aur tumhare siwa kuch bhi nahi.',
            'Tumhe mujhse jitna ladna he, lad lo, me tumhe mana lunga, tumhari maar kha lunga.',
            'Tumhari sari baate sun lunga, acchi buri sari baate sun lunga. Tumhe bhi suna dunga acchi buri sari baate.',
            'Hum ek dusre ke sath kuch bhi kare, hum sab sambhal lenge aur hum ek dusre se nahi ladenge to fir kisse ladenge? Humara pyar, humari ladai sab ek dusre ke liye hi he baby.',
            'Me tumse bohottt pyaar karta hu Khushbu...... . ❤️'
        ],
        signFrom: 'Har Roop Mein Tumhare Saath,',
        signName: 'Tumhara Pati \u2665',
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
        marker: 'Bas Tumhara Saath',
        title: 'Bas Tumhara Saath Chahiye',
        paragraphs: ['Dear Wife,',
            'Meri jaan, mujhe ab koi parwah nahi ki main tumhare layak hu ya nahi, bas main itna jaanta hu maine humesha tumhe khudse jyada pyaar kiya hai aur aage bhi hamesha tumse hi karta rahunga. Ye dil dhadkega to sirf meri Khushbu ke liye, nahi to kabhi nahi dhadkega. 💗',
            'Baby, tumhe lagta hoga ki main aapko chhod dunga, lekin tum galat ho baby. Main kasam se kehta hu, maine kabhi sapne mein bhi tumhe chhodne ke baare mein kabhi nahi socha. Tumhe hamesha maine khudse jyada pyaar kiya hai aur aage bhi karta rahunga. 🫂',
            'Mujhe ab koi parwah nahi ki main tumhare liye bilkul sahi hu ya nahi, lekin main hamesha koshish karunga ki me tumhare layak ban saku, tumhe samajh saku.... 🥺',
            'Baby, maine hamesha tumse dil se pyaar kiya hai. Mujhe aapse na koi mehange tohfe chahiye, na kuch aur. Bas mujhe hamesha aapka saath chahiye aur marte dam tak aapka saath chahiye. ♾️ Mujhe har janam mein tum hi chahiye ho, mere jeevansaathi ke roop me. Mujhe na to tumhare jaisi koi, na tumhari tarah, bas mujhe sirf tum hi chahiye ho.',
            'Baby, agar tumhe meri kisi bhi baat ka bura lage, tum kripya mujhe bol dena bina kisi sharam ke dar ke. Main fir kabhi vo baat nahi bolunga meri jaan.',
            'Mera baccha, kabhi mujhse alag mat hona aur naa hi mujhe khudse alag hone dena. Agar puri duniya wale bhi tumhe galat sabit karenge, toh main fir bhi tumhare sath tumhari taraf hamesha khada rahunga. Mujhe sirf tumhara saath chahiye zindagi bhar. Na mujhe kuch mehanga chahiye, na mujhe kuch surprise, bas mujhe zindagi bhar aapka saath chahiye. 🫶',
            'Mera baccha, me tumse bohottttt pyaar karta huuuuu. ❤️',
            'Mera tumhare bina kahin man hi nahi lagta hai.',
            'Me tumse pyaar karta hu, meri jaannn. ❤️',
        ],
        signFrom: 'Zindagi Bhar Tumhare Saath,',
        signName: 'Tumhara Pati \u2665',
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
        marker: 'Mere Sabse Pyare Gift Ke Liye',
        title: 'Tum Hi Mera Gift Ho',
        paragraphs: ['Pyari Biwi,',
            'Aaj ka din mere liye sirf tumhara janamdin nahi hai… yeh wahi din hai jis din tumne iss dharti par mere liye avatar liya tha. 🎂',
            'Bohot bohot shukriya meri jaan. Pata hai, meri zindagi ki sabse khoobsurat cheez tum ho. Main khud ko bahut khushkismat maanta hu ki tum meri jeevansaathi ho. 💗',
            'Baby, tumhare alawa mujhe aur koi jhel bhi nahi paayega. Ab tum ho jo mujhe aankh dikha kr hi dara deti ho, aur koi aisa kar paayega kya? Aur tum sach me bahut acchi biwi banogi. 😊',
            'Yaad rakhna baby, tum sirf meri ho aur kisi ki bhi nahi, yahan tak apne ghar walo ki bhi nahi, khud ki bhi nahi, sirf meri. Tumhare upar sirf mera haq he aur kisi ka bhi nahi, tumhara khud ka bhi nahi.',
            'Tum yaad rakhna baby, tum meri nahi hui to mujhe khud nahi pata me kya karunga, lekin jo bhi karunga vo hum sab ke liye bahut bura hi hoga. Isi liye apne ghar walo ko samjha dena ki shadi ke baad vo hamare beech me naa aaye aur shadi ke pahle bhi.',
            'Vese baby, tum kabhi gussa ho jaogi na, to me tumhe mana lunga, naraz ho jaogi to hasa dunga, lekin kabhi mujhse door mat jana. Tumhare bina meri zindagi, baby, me to soch bhi nahi sakta. 🫶',
            'Har din bas itna hi chahta hu ki tum hamesha mere saath raho. Main har haalat mein tumhara sahara banunga aur hamesha tumhari hifazat karunga.',
            'Vese dekha jaaye to aaj tumhara janamdin hai, lekin sach kahu to sabse khoobsurat tohfa mujhe mila hai tumhare roop me. 🎁',
            'Agar tum aaj ke din iss dharti par avatar naa leti, to aaj mera kya hota? Me kisi chapri ke sath ghum raha hota. 😄 Isliye aaj main sirf tumhe “Janamdin Mubarak” nahi kehna chahta, main tumhe shukriya kehna chahta hoon.',
            'Shukriya baby, jo tumne mere liye iss dharti par avatar liye, meri zindagi me meri jeevansaathi ban kr aai, meri biwi ban kar aai. Mujhe itna kuch sikhaya-bataya. "Bohot bohot shukriya biwi......" ❤️',
            'Me tumse bohot pyaar karta hu, Meri Chipkali.',
            'Janamdin Mubarak, Meri Jaan. ❤️',


        ],
        signFrom: 'Sirf Tumhare Liye,',
        signName: 'Tumhara Pati \u2665',
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
export const MEMORY_ACTS = Object.freeze([]);


/* Timings - must match animation.css */
const EXIT_MS = 520;
const INTRO_EXIT_MS = 380;
const FINAL_DELAY_MS = 700;
const ACT_TRANSITION_MS = 900;
const ACT_TRANSITION_LIGHT_MS = 680;
const ACT_TRANSITION_EXIT_MS = 170;

/*
 * Letter reveal timings. The stagger is derived per letter:
 * Paragraphs arrive quickly enough that a reader can start naturally.
 */
const PARA_STAGGER_TOTAL_MS = 2800;
const PARA_STAGGER_MIN_MS = 260;
const PARA_STAGGER_MAX_MS = 420;
const LETTER_AUTO_SCROLL_PX_PER_SECOND = 300;
const LETTER_AUTO_RETURN_MS = 560;


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
        this.reduced = prefersReducedMotion();
        this.timers = [];
        this.lifecycleToken = 0;
        this._readCheckFrame = null;
        this._letterScrollFrame = null;
        this._letterScrollRun = 0;
        this._letterScrollContainer = null;
        this._letterReadPhase = 'idle';
        this._manualReadStartTop = 0;
        this._manualReadMoved = false;

        // Keep only the current image and its two likely neighbours warm.
        // Entries hold decoded Image instances briefly, rather than creating
        // unbounded probes as the visitor advances through the lane.
        this._imageCache = new Map();

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
            if (!this._awaitingRead || this._letterReadPhase !== 'manual-read') return;
            if (event.type === 'keydown' && !READ_SCROLL_KEYS.has(event.key)) return;
            this._readUserInteracted = true;
        };
        this._onLetterAutoScrollIntent = (event) => {
            if (event.type === 'keydown' && !READ_SCROLL_KEYS.has(event.key)) return;
            this.cancelLetterAutoScroll({ enterManualRead: true });
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
            this.messageBlock.classList.remove('is-in', 'is-settled');

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
        }
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
        if (!this.chapter || this.state !== 'settled') return;

        this.cancelLetterAutoScroll();
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

        // Start decoding the incoming photo during the title entrance. The
        // later photo phase can then reveal a prepared image instead of
        // asking the decoder to begin at the visible transition boundary.
        if (m.type === 'photo') this.prepareImage(m.image);

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
            this.messageBlock.classList.remove('is-in', 'is-settled');
            this.messageBlock.scrollTop = 0;
        }

        // Photo chapters use the chapter itself as their readable
        // scroll container. Reset it before this entry starts so a
        // previous entry's reading position cannot leak forward.
        if (this.chapter) {
            this.chapter.scrollTop = 0;
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
                        this.completePhotoMessageEntrance();
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

    /** Return the actual readable scroll container for this entry. */
    getReadScrollContainer(m = memories[this.current]) {
        return m?.type === 'letter' ? this.messageBlock : this.chapter;
    }

    /** True when reading the current message requires scrolling */
    messageOverflows(m = memories[this.current]) {
        const container = this.getReadScrollContainer(m);
        return Boolean(
            container &&
            container.scrollHeight >
                container.clientHeight + SCROLL_END_TOLERANCE_PX
        );
    }

    /**
     * Arm the existing gate for any unread overflowing entry. Letter
     * entrance choreography scrolls programmatically, so the readable
     * container is reset before the user-only listener is attached.
     */
    _armUnreadReadGate(m) {
        if (!m || this.isMemoryRead(m.id)) {
            return false;
        }

        if (!this.messageOverflows(m)) {
            // A fully visible letter has already reached its real readable
            // bottom. Persist that individual letter immediately so a later
            // viewport change cannot incorrectly replay its first visit.
            if (m.type === 'letter') this.markMemoryRead(m.id);
            return false;
        }

        const container = this.getReadScrollContainer(m);
        if (container) {
            // Direct assignment also cancels any in-flight smooth opening
            // scroll before the read listener is attached. Consequently no
            // programmatic opening/measurement scroll can unlock the gate.
            container.scrollTop = 0;
        }

        if (this.nextBtn) this.nextBtn.hidden = true;
        if (this.prevBtn) this.prevBtn.hidden = true;

        this.armReadWatch(m.id);
        if (m.type === 'letter') this.startLetterAutoScroll(m);
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

        // One bound handler on the actual readable container - never
        // duplicated and never attached while the opening scroll runs.
        const container = this.getReadScrollContainer(memories[this.current]);
        this._enterManualReadPhase(container);
        container.addEventListener('scroll', this._onMessageScroll, { passive: true });
        container.addEventListener('wheel', this._onReadIntent, { passive: true });
        container.addEventListener('touchstart', this._onReadIntent, { passive: true });
        container.addEventListener('pointerdown', this._onReadIntent, { passive: true });
        window.addEventListener('keydown', this._onReadIntent, true);
    }

    disarmReadWatch() {
        this.cancelLetterAutoScroll();
        if (this._readCheckFrame !== null) {
            cancelAnimationFrame(this._readCheckFrame);
            this._readCheckFrame = null;
        }

        // Remove from both possible containers because the entry type may
        // have changed before teardown runs.
        for (const container of [this.messageBlock, this.chapter]) {
            container?.removeEventListener('scroll', this._onMessageScroll);
            container?.removeEventListener('wheel', this._onReadIntent);
            container?.removeEventListener('touchstart', this._onReadIntent);
            container?.removeEventListener('pointerdown', this._onReadIntent);
        }
        window.removeEventListener('keydown', this._onReadIntent, true);
        this._awaitingRead = false;
        this._readTargetId = null;
        this._readUserInteracted = false;
        this._letterReadPhase = 'idle';
        this._manualReadStartTop = 0;
        this._manualReadMoved = false;
    }

    /** Scroll listener: fires while the visitor reads the message */
    _handleMessageScroll() {
        if (!this._awaitingRead || this.state !== 'settled') return;
        if (this._letterReadPhase !== 'manual-read' || this._readCheckFrame !== null) return;

        const container = this.getReadScrollContainer(memories[this.current]);
        if (container && Math.abs(container.scrollTop - this._manualReadStartTop) > 1) {
            this._manualReadMoved = true;
        }
        if (!this._readUserInteracted || !this._manualReadMoved) return;

        // Scroll events may fire many times per frame. Measure the scroll
        // container at most once in the next paint, then detach completely
        // once the gate is satisfied.
        this._readCheckFrame = requestAnimationFrame(() => {
            this._readCheckFrame = null;
            if (!this._awaitingRead || this.state !== 'settled') return;
            if (this._letterReadPhase !== 'manual-read') return;
            if (!this._isMessageAtEnd()) return;

            this._completeReadGate();
        });
    }

    /** Complete one per-memory read gate exactly once. */
    _completeReadGate() {
        if (!this._awaitingRead || this.state !== 'settled') return false;

        const id = this._readTargetId;
        this.disarmReadWatch();

        if (Number.isInteger(id)) this.markMemoryRead(id);
        this._revealSettledControls();
        return true;
    }

    /**
     * First visit only: one cancellable RAF moves the real letter scroller to
     * its measured bottom. Any touch/wheel/scroll key cancels the movement;
     * the existing manual read gate then remains authoritative.
     */
    startLetterAutoScroll(m) {
        const container = this.getReadScrollContainer(m);
        if (!container || m?.type !== 'letter' || !this._awaitingRead) return;

        this.cancelLetterAutoScroll();
        const run = ++this._letterScrollRun;
        const index = this.current;
        const id = m.id;
        let lastTime = null;
        let confirmedBottom = null;
        this._letterReadPhase = 'demo-down';
        this._readUserInteracted = false;
        this._manualReadMoved = false;
        this._letterScrollContainer = container;
        this._addLetterAutoScrollIntent(container);

        const step = (time) => {
            if (
                run !== this._letterScrollRun ||
                this.state !== 'settled' ||
                this.current !== index ||
                this._readTargetId !== id ||
                container.isConnected === false
            ) {
                this.cancelLetterAutoScroll();
                return;
            }

            const bottom = Math.max(0, container.scrollHeight - container.clientHeight);
            const atBottom = container.scrollTop >= bottom - SCROLL_END_TOLERANCE_PX;
            if (atBottom) {
                container.scrollTop = bottom;
                if (confirmedBottom === bottom) {
                    this.startLetterAutoReturn(container, index);
                    return;
                }
                confirmedBottom = bottom;
            } else {
                confirmedBottom = null;
                if (lastTime !== null) {
                    const elapsed = Math.min(64, Math.max(0, time - lastTime));
                    container.scrollTop = Math.min(
                        bottom,
                        container.scrollTop + LETTER_AUTO_SCROLL_PX_PER_SECOND * elapsed / 1000
                    );
                }
            }

            lastTime = time;
            this._letterScrollFrame = requestAnimationFrame(step);
        };

        if (this.reduced) {
            container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
            this.startLetterAutoReturn(container, index);
            return;
        }

        this._letterScrollFrame = requestAnimationFrame(step);
    }

    /** Return a completed first-read letter to its top resting position. */
    startLetterAutoReturn(container, index) {
        this.cancelLetterAutoScroll();
        if (!container || container.isConnected === false) return;

        const startTop = container.scrollTop;
        if (startTop <= 0 || this.reduced) {
            container.scrollTop = 0;
            this._enterManualReadPhase(container);
            return;
        }

        const run = ++this._letterScrollRun;
        let startedAt = null;
        this._letterReadPhase = 'demo-up';
        this._letterScrollContainer = container;
        this._addLetterAutoScrollIntent(container);

        const step = (time) => {
            if (
                run !== this._letterScrollRun ||
                this.current !== index ||
                (this.state !== 'settled' && this.state !== 'final') ||
                container.isConnected === false
            ) {
                this.cancelLetterAutoScroll();
                return;
            }

            if (startedAt === null) startedAt = time;
            const progress = Math.min(1, (time - startedAt) / LETTER_AUTO_RETURN_MS);
            const eased = 1 - Math.pow(1 - progress, 3);
            container.scrollTop = startTop * (1 - eased);

            if (progress >= 1) {
                container.scrollTop = 0;
                this.cancelLetterAutoScroll();
                this._enterManualReadPhase(container);
                return;
            }
            this._letterScrollFrame = requestAnimationFrame(step);
        };

        this._letterScrollFrame = requestAnimationFrame(step);
    }

    _enterManualReadPhase(container) {
        this._letterReadPhase = 'manual-read';
        this._readUserInteracted = false;
        this._manualReadStartTop = container?.scrollTop || 0;
        this._manualReadMoved = false;
    }

    _addLetterAutoScrollIntent(container) {
        container.addEventListener('wheel', this._onLetterAutoScrollIntent, { passive: true });
        container.addEventListener('touchstart', this._onLetterAutoScrollIntent, { passive: true });
        container.addEventListener('pointerdown', this._onLetterAutoScrollIntent, { passive: true });
        window.addEventListener('keydown', this._onLetterAutoScrollIntent, true);
    }

    cancelLetterAutoScroll({ enterManualRead = false } = {}) {
        this._letterScrollRun += 1;
        if (this._letterScrollFrame !== null) {
            cancelAnimationFrame(this._letterScrollFrame);
            this._letterScrollFrame = null;
        }
        const container = this._letterScrollContainer;
        container?.removeEventListener('wheel', this._onLetterAutoScrollIntent);
        container?.removeEventListener('touchstart', this._onLetterAutoScrollIntent);
        container?.removeEventListener('pointerdown', this._onLetterAutoScrollIntent);
        window.removeEventListener('keydown', this._onLetterAutoScrollIntent, true);
        this._letterScrollContainer = null;
        if (enterManualRead && this._awaitingRead) {
            this._enterManualReadPhase(container);
        }
    }

    /**
     * True only when the current entry's actual readable scroll container
     * has reached its bottom, with a small mobile-safe pixel tolerance.
     */
    _isMessageAtEnd() {
        const container = this.getReadScrollContainer(
            memories[this.current]
        );
        if (!container) return true;

        return (
            container.scrollTop + container.clientHeight >=
            container.scrollHeight - SCROLL_END_TOLERANCE_PX
        );
    }

    /**
     * Photo-message animations are allowed to play, then their temporary
     * hidden/clip/mask states are replaced with the stable phase state.
     * This prevents a cancelled or interrupted entrance from leaving the
     * reused message node invisible on a later mobile chapter.
     */
    completePhotoMessageEntrance() {
        if (!this.messageBlock) return;

        this.messageBlock.classList.remove('is-in');
        if (this._messageAnim) {
            this.messageBlock.classList.remove(this._messageAnim);
        }
        this.messageBlock.classList.add('is-settled');
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
     * The letter unfolds paragraph by paragraph while preserving the
     * reader's own scroll position. Earlier versions measured each paragraph
     * and started a new smooth scroll; those queued animations fought touch
     * scrolling and made long letters appear to hang.
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
            });
        });

        // Once the final paragraph has been committed, settle immediately.
        // startLetterAutoScroll() performs the first measurement in its
        // requestAnimationFrame, after this readable layout has painted.
        const revealEnd = this.scale(stagger) * (steps.length - 1);

        this.later(revealEnd, () => {
            if (this.state === 'playing') this.settleChapter();
        });
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
            this.messageBlock.classList.remove('is-in', 'is-settled');
            if (this._messageAnim) this.messageBlock.classList.remove(this._messageAnim);
            this._messageAnim = m.messageAnimation;
            this.messageBlock.classList.add('is-settled');
            this.messageBlock.scrollTop = 0;
        }
        this.chapter.scrollTop = 0;

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
        const prepared = this.prepareImage(newSrc);
        const cachedProbe = this._imageCache.get(newSrc)?.image;

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

        if (cachedProbe?.naturalWidth) {
            this.applyPhotoDimensions(photoElement, cachedProbe);
        }

        /*
         * New image successfully loaded.
         */
        photoElement.onload = async () => {
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
            // Decoding is deliberately awaited off the interaction path. A
            // loaded-but-not-decoded source was the source of the apparent
            // freeze on first paint of a large photo.
            try {
                await photoElement.decode?.();
            } catch {
                // decode() may reject for an already-renderable image.
            }

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
        // A prepared neighbour exposes dimensions before the replacement is
        // painted, which keeps the frame geometry stable while its source is
        // swapped. Do not wait here: the chapter can continue immediately.
        prepared.then((probe) => {
            if (loadToken !== this._photoLoadToken || !probe) return;
            this.applyPhotoDimensions(photoElement, probe);
        });

        photoElement.src = newSrc;

        // Cached images can be complete before assigning onload in some
        // engines. Re-run the same handler in that case, guarded by token.
        if (photoElement.complete && photoElement.naturalWidth) {
            photoElement.onload?.();
        }
    }


    renderMessage(m) {
        if (!this.message) return;

        this.message.textContent = '';

        this.message.setAttribute(
            'data-message',
            m.message
        );

        this.buildWords(this.message, m.message, m.id + 100, {
            // Memory 21's established entrance is intentionally glyph-based;
            // every other short photo message only needs word-level nodes.
            graphemes: m.id === 21
        });
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
            // Letter paragraphs animate as one composited paragraph. Keeping
            // their text as text avoids hundreds of animated grapheme spans
            // without changing text, emoji, or reading order.
            p.textContent = para;
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

    buildWords(container, text, salt, { graphemes = true } = {}) {
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

            if (!graphemes) {
                w.textContent = word;
                container.appendChild(w);
                return;
            }

            const segmented = splitGraphemes(word);

            segmented.forEach((grapheme, li) => {
                const l = document.createElement('span');

                l.className = 'tl';
                l.textContent = grapheme;

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
            });

            container.appendChild(w);
        });
    }


    /* ============================================================
       Small, decode-aware photo preparation cache
       ============================================================ */

    prepareImage(src) {
        const existing = this._imageCache.get(src);
        if (existing) return existing.promise;

        const image = new Image();
        image.decoding = 'async';
        const entry = {
            image,
            promise: new Promise((resolve) => {
                image.onload = async () => {
                    try {
                        await image.decode?.();
                    } catch {
                        // A successful load is still usable when decode() is
                        // unsupported or reports an already-decoded image.
                    }
                    resolve(image);
                };
                image.onerror = () => resolve(null);
            })
        };

        this._imageCache.set(src, entry);
        image.src = src;
        return entry.promise;
    }

    applyPhotoDimensions(element, source) {
        if (!source?.naturalWidth || !source?.naturalHeight) return;
        element.width = source.naturalWidth;
        element.height = source.naturalHeight;
    }

    findPhotoNeighbor(direction) {
        for (let offset = 1; offset < this.total; offset += 1) {
            const index = (this.current + direction * offset + this.total) % this.total;
            const memory = memories[index];
            if (memory?.type === 'photo') return memory;
        }
        return null;
    }

    preloadNeighbors() {
        if (this.total === 0) return;

        const current = memories[this.current];
        const targets = [
            current?.type === 'photo' ? current : null,
            this.findPhotoNeighbor(1),
            this.findPhotoNeighbor(-1)
        ].filter(Boolean);

        const retained = new Set(targets.map((memory) => memory.image));
        for (const src of this._imageCache.keys()) {
            if (!retained.has(src)) this._imageCache.delete(src);
        }

        for (const memory of targets) {
            this.prepareImage(memory.image);
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
        this._imageCache.clear();

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
