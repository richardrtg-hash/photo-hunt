// Shared game data + Thanksgiving Week (typed from "7 Day Photo Scavenger Hunt.pdf").
// Regular missions are worth 10 points, bonus missions 20 points (400 per day).

const THANKSGIVING_DAYS = [
  {
    title: 'The Great House Explorer',
    tagline: 'Discover, organize, explore!',
    palette: 'lime',
    morning: [
      'Photograph the sunrise', 'Your perfectly made bed', 'Find something yellow', 'Photograph your breakfast',
      'Toothbrush next to a clean sink', 'Organize five pairs of shoes', 'Find something triangular',
      'Your favorite stuffed animal', 'Something older than you', 'Ten toys after putting them away',
    ],
    afternoon: [
      'A cloud shaped like something recognizable', 'Photograph a flower', 'An insect (do not touch)',
      'Something that makes noise', 'Three objects of the same color', 'Five pieces of neatly folded laundry',
      'Something starting with S', 'Your shadow outside', 'Dining table you helped wipe clean',
      'Something that looks like a face',
    ],
    evening: [
      'Photograph the sunset', 'Your dinner', 'Something glowing', 'Something that smells good',
      'Funny selfie with your sibling', 'Your favorite book', 'Your clean bedroom floor',
      'Something reflecting light', 'Neatly folded pajamas', 'Moon or night sky',
    ],
    bonus: [
      'Bird in flight', 'Rainbow made of household objects', 'Clean and organize a drawer',
      'Create an optical illusion photo', 'Something nobody else noticed',
    ],
  },
  {
    title: 'The Outdoor Adventurer',
    tagline: 'Nature, discovery, and helping hands!',
    palette: 'sky',
    morning: [
      'Sunrise from a different spot than Day 1', 'Morning dew on grass or leaves', 'Breakfast photographed from above',
      'Make your bed', 'Something green outside', 'Three different leaves', 'Something wet', 'An interesting texture',
      'Something smaller than a penny', 'Bathroom counter you helped organize',
    ],
    afternoon: [
      'Butterfly, bee, or another insect', 'Something heart-shaped', 'Your longest shadow', 'Something moving',
      'An interestingly shaped rock', 'A tree photographed from underneath', 'Reflection in water',
      'Toy outdoors in a creative spot', 'Organized bookshelf', 'Something starting with T',
    ],
    evening: [
      'Photograph the sunset', 'Sky changing colors', 'Something orange', 'Your dinner plate', 'Family member cooking',
      'Something that makes you laugh', 'Shoes neatly put away', 'Kitchen surface you helped wipe',
      'Interesting shadow made by a light', 'Something peaceful before bedtime',
    ],
    bonus: [
      'Three different types of birds', 'Perfectly symmetrical photo', 'Help take out trash; photo of empty bin',
      'Miniature scene made with toys', 'Five different natural textures',
    ],
  },
  {
    title: 'Thanksgiving Prep Challenge',
    tagline: 'Get the house ready for family and friends!',
    palette: 'gold',
    morning: [
      'Photograph the sunrise', 'Make your bed perfectly', 'Something you are thankful for', 'Something orange',
      'Your breakfast', 'Ten pieces of folded laundry', 'Organized closet floor', 'Something shaped like a pumpkin',
      'Thanksgiving decoration', 'Your clean bathroom sink',
    ],
    afternoon: [
      'Thanksgiving dinner ingredients', 'Something in the pantry', 'Five clean plates you helped put away',
      'Something smelling like Thanksgiving', 'Family member preparing food', 'Your Thanksgiving drawing',
      'Table you helped prepare', 'Something brown', 'Something representing family', 'Toys you organized',
    ],
    evening: [
      'Photograph the sunset', 'Most colorful part of the sky', 'Something delicious being prepared',
      'Someone smiling', 'Three things you are thankful for', 'Your dinner', 'Living room you helped tidy',
      'Something golden', 'Something reminding you of fall', 'Bedroom ready for tomorrow',
    ],
    bonus: [
      'Help prepare a Thanksgiving dish', 'Make a handmade Thanksgiving decoration', 'Organize the family shoe area',
      'Write and photograph three thank-you notes', 'Creative family portrait',
    ],
  },
  {
    title: 'The Ultimate Thanksgiving Hunt',
    tagline: 'Food, family, friends, laughter, and gratitude!',
    palette: 'pumpkin',
    morning: [
      'Thanksgiving sunrise', 'Thanksgiving breakfast', 'Something orange', 'Make your bed',
      'Something you are thankful for', 'Something shaped like a turkey', 'Thanksgiving ingredients',
      'Someone preparing food', 'Thanksgiving decoration', 'Selfie showing Thanksgiving outfit',
    ],
    afternoon: [
      'Thanksgiving dinner table', 'Turkey or main dish', 'Three different side dishes', 'Someone laughing',
      'Selfie with a family member', 'Someone wearing something festive', 'Photo with a friend',
      'Most colorful food on the table', 'A hug (with permission)', 'Something you helped set up',
    ],
    evening: [
      'Thanksgiving sunset', 'Your Thanksgiving dinner plate', 'Favorite dessert', 'Three generations, if present',
      'Funniest face someone makes', 'Group photo with friends and family', 'Someone enjoying dessert',
      'Something representing friendship', 'Something you helped clean after dinner', 'Final Thanksgiving family selfie',
    ],
    bonus: [
      'Five people making the same silly face', 'Three candid laughter moments', 'Help clean up after dinner',
      'Creative photo of the feast', 'Photos with five friends or relatives',
    ],
  },
  {
    title: 'The Grand Finale',
    tagline: 'Creativity, responsibility, and adventure!',
    palette: 'berry',
    morning: [
      'Photograph the sunrise', 'Make your bed', 'Your breakfast', 'Something purple', 'Ten neatly organized toys',
      'Something shaped like a star', 'Your clean bedroom', 'Ten pieces of folded laundry',
      'Something that makes you smile', 'Something with numbers',
    ],
    afternoon: [
      'Something flying', 'Something starting with F', 'Your reflection', 'Something with wheels',
      'Five differently colored objects', 'Something you built yourself', 'An interesting shadow',
      'Your favorite outdoor spot', 'Something beautiful in nature', 'Something you helped clean',
    ],
    evening: [
      'Photograph the sunset', 'Evening sky', 'Favorite Thanksgiving leftover', 'Funny moment with your sibling',
      'Favorite family activity', 'Creative photo using only one color', 'Something that makes you proud',
      'Your clean room one last time', 'Favorite photo of the week on a screen', 'Victory selfie',
    ],
    bonus: [
      'Recreate favorite photo from Day 1', 'Surprise chore from Mom or Dad', 'Funniest photo of the week',
      'Collage of five favorite photos', 'Photo telling a story without words',
    ],
  },
  {
    title: 'The Creative Photo Master',
    tagline: 'Imagination, photography, and responsibility!',
    palette: 'grape',
    morning: [
      'Day 6 sunrise', 'Creative picture of breakfast', 'Make your bed perfectly', 'Something diamond-shaped',
      'Something blue outside', 'Five toys ordered smallest to largest', 'Favorite shoes neatly put away',
      'Something starting with M', 'Reflection in a mirror or window', 'Organized nightstand',
    ],
    afternoon: [
      'Something huge-looking from a low angle', 'Something shaped like a letter', 'Bird on a tree or fence',
      'Funny scene with three toys', 'Something jumping', 'An unusual pattern', 'Object with five different colors',
      'A bug’s-eye-view photo', 'Kitchen cabinet or drawer you organized', 'Something resembling hidden treasure',
    ],
    evening: [
      'Day 6 sunset', 'Most beautiful evening sky colors', 'Dinner from an interesting angle',
      'Someone laughing naturally', 'Something casting a cool shadow', 'Something glowing in the dark',
      'Favorite relaxing spot at home', 'Organized school supplies', 'Creative silhouette with a light',
      'Silly sibling selfie before bedtime',
    ],
    bonus: [
      'Miniature movie scene with toys', 'Five objects starting with same letter', 'Clean a shared family space',
      'Make an ordinary object look gigantic', 'Creative photo telling a funny story',
    ],
  },
  {
    title: 'The Ultimate Family Adventure',
    tagline: 'Family fun, kindness, nature, and finishing strong!',
    palette: 'caramel',
    morning: [
      'Final sunrise of the seven-day challenge', 'Day 7 breakfast', 'Make your bed perfectly',
      'Something heart-shaped', 'Something making you happy', 'Organized shoes', 'Something striped',
      'Favorite family memory displayed at home', 'Clean bathroom counter', 'Something outside your window',
    ],
    afternoon: [
      'Something beautiful in nature', 'Something circular outdoors', 'Animal or insect',
      'Something moving with the wind', 'Funny photo with a family member', 'Something starting with P',
      'Longtime family keepsake', 'Something you built or created', 'Organized toys', 'Something representing kindness',
    ],
    evening: [
      'Final sunset of the challenge', 'Day 7 dinner', 'Something reminding you of Thanksgiving',
      'Special family moment', 'Favorite thing about your home', 'Bedroom clean for the new week',
      'School backpack packed and ready', 'Something you are thankful for', 'Favorite challenge photo on a screen',
      'Official seven-day victory selfie',
    ],
    bonus: [
      'Help with a chore without being asked', 'Collage of seven favorite photos',
      'Five things you are grateful for in one photo', 'Creative family portrait',
      'One photo representing the whole adventure',
    ],
  },
];

export const SECTIONS = [
  { key: 'morning', label: 'Morning Missions', emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon Missions', emoji: '☀️' },
  { key: 'evening', label: 'Evening Missions', emoji: '🌙' },
  { key: 'bonus', label: 'Bonus Missions', emoji: '⭐', note: '20 points each' },
];

export const DAY_MAX = 400;
export const WEEK_MAX = 2800;

// Day colors. Text on these is dark ink, so keep lightness at about 0.66 or more.
export const PALETTES = {
  lime: { color: 'oklch(0.76 0.19 140)', deep: 'oklch(0.44 0.13 145)', soft: 'oklch(0.95 0.06 140)' },
  sky: { color: 'oklch(0.74 0.14 235)', deep: 'oklch(0.45 0.12 245)', soft: 'oklch(0.95 0.04 235)' },
  gold: { color: 'oklch(0.84 0.16 88)', deep: 'oklch(0.5 0.11 75)', soft: 'oklch(0.96 0.06 90)' },
  pumpkin: { color: 'oklch(0.73 0.18 48)', deep: 'oklch(0.5 0.15 40)', soft: 'oklch(0.95 0.05 55)' },
  berry: { color: 'oklch(0.68 0.2 18)', deep: 'oklch(0.48 0.17 18)', soft: 'oklch(0.95 0.035 15)' },
  grape: { color: 'oklch(0.68 0.17 300)', deep: 'oklch(0.45 0.16 300)', soft: 'oklch(0.95 0.035 300)' },
  caramel: { color: 'oklch(0.72 0.12 62)', deep: 'oklch(0.45 0.08 55)', soft: 'oklch(0.95 0.035 65)' },
  pine: { color: 'oklch(0.7 0.14 155)', deep: 'oklch(0.4 0.09 160)', soft: 'oklch(0.95 0.04 155)' },
  candy: { color: 'oklch(0.69 0.2 25)', deep: 'oklch(0.48 0.18 25)', soft: 'oklch(0.95 0.035 20)' },
  frost: { color: 'oklch(0.82 0.09 220)', deep: 'oklch(0.45 0.1 235)', soft: 'oklch(0.96 0.025 220)' },
  night: { color: 'oklch(0.7 0.12 270)', deep: 'oklch(0.42 0.13 270)', soft: 'oklch(0.95 0.03 270)' },
  cocoa: { color: 'oklch(0.7 0.09 50)', deep: 'oklch(0.42 0.07 45)', soft: 'oklch(0.95 0.03 60)' },
  star: { color: 'oklch(0.86 0.15 92)', deep: 'oklch(0.5 0.11 80)', soft: 'oklch(0.96 0.05 92)' },
  mint: { color: 'oklch(0.85 0.11 170)', deep: 'oklch(0.45 0.09 175)', soft: 'oklch(0.96 0.035 170)' },
  rose: { color: 'oklch(0.78 0.12 355)', deep: 'oklch(0.5 0.15 355)', soft: 'oklch(0.96 0.03 355)' },
};

export const THANKSGIVING_WEEK = {
  id: '2026-11-23',
  name: 'Thanksgiving Week',
  emoji: '🦃',
  blurb: 'The original 7-day hunt: house explorers, outdoor adventures and a Thanksgiving feast.',
  golden: { emoji: '🦃', label: 'Secret Golden Turkey', desc: 'Found the hidden golden turkey and photographed it' },
  holidays: [{ date: '2026-11-26', emoji: '🦃', label: 'Thanksgiving' }],
  days: THANKSGIVING_DAYS,
};

// The golden-hunt special changes every week (turkey, star, elf…); these are the same every week.
export const BASE_SPECIALS = [
  { key: 'mystery', emoji: '⏱️', label: 'Mystery Photo', desc: 'Finished the surprise challenge within 15 minutes', points: 25 },
  { key: 'choice', emoji: '🎨', label: "Photographer's Choice", desc: 'Best creative photo of the day (up to 20)', points: 20, scale: true },
  { key: 'kindness', emoji: '💛', label: 'Kindness Challenge', desc: 'Helped someone without being asked and photographed it', points: 20 },
  { key: 'sunClub', emoji: '🌄', label: 'Sunrise & Sunset Club', desc: 'Sunrise (#01) and sunset (#21) on the same day — added automatically', points: 20, auto: true },
];
export const specialsFor = (week) => [
  { key: 'golden', emoji: week.golden.emoji, label: week.golden.label, desc: week.golden.desc, points: 30 },
  ...BASE_SPECIALS,
];

export const AWARDS = [
  { key: 'masterExplorer', emoji: '🧭', label: 'Master Photo Explorer' },
  { key: 'adventure', emoji: '🏕️', label: 'Adventure Photographer' },
  { key: 'bestHelper', emoji: '🧹', label: 'Best Helper' },
  { key: 'bestPhoto', emoji: '📸', label: 'Best Photo' },
];

export const RULES = [
  { emoji: '📷', text: 'Take a NEW photo for each mission on its assigned day. No old photos.' },
  { emoji: '🔟', text: 'Regular missions are worth 10 points each. Bonus missions are worth 20 points each.' },
  { emoji: '🧺', text: 'Finish chores BEFORE photographing them.' },
  { emoji: '🙋', text: 'Ask permission before photographing people.' },
  { emoji: '🧑‍🤝‍🧑', text: 'Adult supervision is required for outdoor missions.' },
  { emoji: '🌧️', text: 'Bad weather? Photograph the weather instead!' },
  { emoji: '📅', text: 'A new challenge week unlocks every Monday, and each day unlocks on its date.' },
  { emoji: '🏆', text: 'Each week crowns a champion, and your season points keep adding up!' },
];
