// Evergreen weeks: once the hand-written holiday weeks run out, the app builds a fresh
// week every Monday from these mission pools. A week is generated from its start date
// (always the same result) and frozen in saved data the first time it's opened.

const THEMES = [
  { name: 'Winter Explorer Week', emoji: '🧭', blurb: 'Brand-new missions every day — explore inside and out!', golden: ['⭐', 'Secret Golden Star', 'star'] },
  { name: 'Color Quest Week', emoji: '🌈', blurb: 'Hunt every color of the rainbow this week.', golden: ['🌈', 'Hidden Rainbow Gem', 'rainbow gem'] },
  { name: 'Helper Heroes Week', emoji: '🦸', blurb: 'Chores, kindness and super-helper powers!', golden: ['🦸', 'Lost Hero Cape', 'hero cape'] },
  { name: 'Nature Detectives Week', emoji: '🔎', blurb: 'Clues, tracks and treasures hiding in plain sight.', golden: ['🔎', 'Golden Magnifying Glass', 'magnifying glass'] },
  { name: 'Creative Camera Week', emoji: '🎨', blurb: 'Angles, shadows, reflections — get artsy!', golden: ['🎨', 'Hidden Paintbrush', 'paintbrush'] },
  { name: 'Family Fun Week', emoji: '🎲', blurb: 'Games, laughs and making memories together.', golden: ['🎲', 'Golden Dice', 'golden die'] },
  { name: 'Shape Safari Week', emoji: '🔺', blurb: 'Circles, triangles and stars are everywhere!', golden: ['🔷', 'Hidden Diamond', 'diamond'] },
  { name: 'Tiny World Week', emoji: '🐞', blurb: 'Zoom in on the small stuff.', golden: ['🐞', 'Lucky Ladybug', 'ladybug'] },
];

const DAY_TITLES = [
  ['Color Detective', 'Spot every color you can find!'], ['Shape Safari', 'Circles, squares, triangles… go!'],
  ['Helper Hero', 'Use your super-helper powers today.'], ['Nature Explorer', 'Look closely at the world outside.'],
  ['Creative Lens', 'Try new angles and tricks.'], ['Family Fun Day', 'Laugh, play and snap together.'],
  ['Letter Hunt', 'Find things from A to Z.'], ['Texture Treasure', 'Bumpy, smooth, fuzzy, rough!'],
  ['Shadow & Light', 'Play with light and dark.'], ['Tiny Things', 'Zoom in on the little stuff.'],
  ['Big & Bold', 'Find the biggest things around.'], ['Tidy Titans', 'Make every room sparkle.'],
  ['Story Snapper', 'Every photo tells a story.'], ['Kindness Day', 'Make someone smile today.'],
];

const PALETTE_CYCLE = ['lime', 'sky', 'star', 'pumpkin', 'berry', 'grape', 'mint', 'rose', 'frost', 'caramel', 'pine', 'night'];

const SUNRISE = ['Photograph the sunrise', 'Sunrise from a new spot', 'Morning sky colors', 'Sunrise through a window'];
const BED = ['Make your bed', 'Your perfectly made bed', 'Bed made with your stuffed animals lined up'];
const BREAKFAST = ['Your breakfast', 'Breakfast photographed from above', 'A creative picture of breakfast', 'Breakfast with something fruity'];
const SUNSET = ['Photograph the sunset', 'Sunset colors', 'Sky changing colors at sunset', 'Sunset from a new spot'];
const DINNER = ['Your dinner', 'Your dinner plate', 'Dinner from an interesting angle', 'Family member cooking dinner'];

const MORNING = [
  'Toothbrush next to a clean sink', 'Something yellow', 'Something red', 'Something blue', 'Something green', 'Something purple',
  'Something orange', 'Something shaped like a circle', 'Something shaped like a triangle', 'Something shaped like a star',
  'Something shaped like a heart', 'Five pairs of shoes organized', 'Ten toys put away', 'Your favorite stuffed animal',
  'Something older than you', 'Something with numbers', 'Something striped', 'Something with polka dots',
  'Something that makes you smile', 'Your clean bedroom', 'Five pieces of folded laundry', 'Your organized nightstand',
  'Something outside your window', 'A clean bathroom counter', 'Something soft', 'Something shiny', 'Something tiny',
  'Something taller than you', 'Your favorite cup or mug', 'Something with letters on it', 'Something with wheels',
  'A reflection in a mirror or window', 'Your morning hair (silly!)', 'Something that ticks or tells time',
  'Your backpack packed and ready', 'Three things of the same color', 'Something that starts with your initial',
  'Something cold', 'Something warm', 'A pattern on fabric',
];

const AFTERNOON = [
  'A cloud shaped like something', 'An interesting shadow', 'Your shadow outside', 'A tree photographed from underneath',
  'An interesting rock', 'Three different leaves', 'A bird', 'Something moving', 'Something flying', 'Something jumping',
  'Something that makes noise', 'Something with five different colors', 'An unusual pattern', 'A bug\'s-eye-view photo',
  'Something huge-looking from a low angle', 'Something shaped like a letter', 'Funny scene with three toys',
  'A toy outdoors in a creative spot', 'An organized bookshelf', 'A kitchen drawer you organized', 'A table you wiped clean',
  'Something resembling hidden treasure', 'Reflection in water', 'Something wet', 'Something rough', 'Something smooth',
  'Something bumpy', 'Something fuzzy', 'Something see-through', 'Something smaller than a coin', 'Five objects smallest to largest',
  'Something that looks like a face', 'Something symmetrical', 'Something with stripes outdoors', 'A sign with a word you can read',
  'Your favorite outdoor spot', 'Something beautiful in nature', 'Something you built yourself', 'Something you helped clean',
  'Something that floats', 'Something that rolls', 'Something with a hole in it', 'Two things that go together',
  'Something that smells nice', 'A plant or flower', 'An animal (pet, bird or bug)', 'Something old and something new',
  'A puzzle you finished', 'A drawing you made today', 'Something made of wood', 'Something made of metal',
  'Something made of paper', 'A snack you helped make', 'Something that is your favorite color', 'Something round outdoors',
];

const EVENING = [
  'Something glowing', 'Something that smells good', 'Funny selfie with your sibling', 'Your favorite book',
  'Your clean bedroom floor', 'Something reflecting light', 'Neatly folded pajamas', 'Moon or night sky',
  'Something that makes you laugh', 'Shoes neatly put away', 'A kitchen surface you helped wipe',
  'Interesting shadow made by a lamp', 'Something peaceful before bedtime', 'Someone laughing',
  'Something you are thankful for', 'A family game', 'Your favorite relaxing spot', 'Organized school supplies',
  'A creative silhouette with a light', 'Something glowing in the dark', 'A family member reading', 'Your favorite blanket',
  'Something you are proud of today', 'Your favorite photo of the day on a screen', 'A tidy living room',
  'Your toothbrush ready for bed', 'Your stuffed animals tucked in', 'A goodnight hug (with permission)',
  'Clothes laid out for tomorrow', 'Your favorite song playing', 'Dessert or a sweet treat', 'A cozy drink',
  'Something that makes noise at night', 'Bath time bubbles', 'Your bedroom ready for tomorrow', 'Family movie time',
  'A board game in progress', 'A lamp glowing', 'Someone you love', 'Your sleepy face',
];

const BONUS = [
  'Bird in flight', 'Rainbow made of household objects', 'Clean and organize a drawer', 'Create an optical illusion photo',
  'Something nobody else noticed', 'Perfectly symmetrical photo', 'Miniature scene made with toys', 'Five different textures',
  'Photo telling a story without words', 'Make an ordinary object look gigantic', 'Five objects starting with the same letter',
  'Clean a shared family space', 'Creative family portrait', 'Help with a chore without being asked', 'Collage of five favorite photos',
  'A toy movie scene', 'Forced-perspective photo (tiny person, giant hand)', 'Alphabet photo: spell your name with objects',
  'A rainbow of food', 'Light-trail photo with a flashlight', 'Before-and-after cleaning photo', 'An action photo frozen mid-jump',
  'A photo using only one color', 'Recreate a famous painting with family', 'A secret kindness for someone',
  'A blanket fort', 'A homemade bird feeder', 'Three photos of the same thing from different angles',
  'A sculpture made from recycling', 'A portrait of a pet or stuffed animal with props',
];

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Deals items from a shuffled deck; reshuffles when the deck runs out, never repeating within one hand.
function dealer(pool, rnd) {
  let deck = shuffled(pool, rnd);
  return (n) => {
    const hand = [];
    while (hand.length < n) {
      if (!deck.length) deck = shuffled(pool, rnd).filter((x) => !hand.includes(x));
      hand.push(deck.shift());
    }
    return hand;
  };
}
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

export function generateWeekDef(weekId, weekIndex) {
  const rnd = mulberry32(hashString(weekId));
  const theme = THEMES[weekIndex % THEMES.length];
  const morning = dealer(MORNING, rnd);
  const afternoon = dealer(AFTERNOON, rnd);
  const evening = dealer(EVENING, rnd);
  const bonus = dealer(BONUS, rnd);
  const titles = shuffled(DAY_TITLES, rnd);
  const palettes = shuffled(PALETTE_CYCLE, rnd);
  const [gEmoji, gLabel, gThing] = theme.golden;
  return {
    id: weekId,
    name: theme.name,
    emoji: theme.emoji,
    blurb: theme.blurb,
    generated: true,
    golden: { emoji: gEmoji, label: gLabel, desc: `Found the hidden ${gThing} and photographed it` },
    holidays: [],
    days: Array.from({ length: 7 }, (_, i) => ({
      title: titles[i][0],
      tagline: titles[i][1],
      palette: palettes[i],
      morning: [pick(SUNRISE, rnd), pick(BED, rnd), pick(BREAKFAST, rnd), ...morning(7)],
      afternoon: afternoon(10),
      evening: [pick(SUNSET, rnd), pick(DINNER, rnd), ...evening(8)],
      bonus: bonus(5),
    })),
  };
}
