// Pixel Art Sprites and Palette Configuration

const PALETTE = {
  // Player (Soldier)
  H: '#2e4c23', // Helmet dark green
  h: '#4c7a38', // Helmet highlight
  S: '#f6c59e', // Skin tone
  E: '#111111', // Eyes / dark outline
  U: '#556b2f', // Khaki uniform dark
  u: '#6b8e23', // Khaki uniform light
  G: '#333333', // Gun metal dark
  g: '#777777', // Gun highlight
  B: '#2f2115', // Boots brown

  // Zombie
  Z: '#4e8c56', // Zombie green skin
  z: '#2d5a34', // Zombie dark skin shadow
  R: '#635372', // Tattered clothes purple
  r: '#42374c', // Tattered clothes shadow
  D: '#a31b1b', // Red eyes / blood

  // Gem (8x8 Blue Gem)
  C: '#00d2d3', // Cyan
  c: '#54a0ff', // Light Blue
  L: '#ffffff', // Highlight
  b: '#0984e3'  // Dark Blue Outline
};

const SPRITES = {
  player: {
    walk: [
      [
        "      HHHH      ",
        "     HHHHHH     ",
        "     HHhhHH     ",
        "     SSSSSS     ",
        "     SEEESE     ",
        "     SSSSSS     ",
        "    UUUUUUUU    ",
        "   UUUUUUUUUU   ",
        "  UU UUUUUU UGG ",
        "  UU UUUUUU UGG ",
        "  SS UUUUUU SGGg",
        "     UUUUUU     ",
        "     BB  BB     ",
        "     BB  BB     ",
        "     BB  BB     ",
        "    BBB  BBB    "
      ],
      [
        "      HHHH      ",
        "     HHHHHH     ",
        "     HHhhHH     ",
        "     SSSSSS     ",
        "     SEEESE     ",
        "     SSSSSS     ",
        "    UUUUUUUU    ",
        "   UUUUUUUUUU   ",
        "  UU UUUUUU UGG ",
        "  UU UUUUUU UGG ",
        "  SS UUUUUU SGGg",
        "     UUUUUU     ",
        "    BB    BB    ",
        "    BB    BB    ",
        "   BBB     BB   ",
        "   BBB     BBB  "
      ]
    ]
  },
  zombie: {
    walk: [
      [
        "     zzZZzz     ",
        "    ZZZZZZZZ    ",
        "    ZZZZZZZZ    ",
        "    ZDEZZEDZ    ",
        "    ZZZZZZZZ    ",
        "    ZZZZZZZZ    ",
        "    RRRRRRRR    ",
        "   RRRRRRRRRR   ",
        "  ZZZZ RRRR ZZZZ",
        "  ZZZZ RRRR ZZZZ",
        "  ZZZZ RRRR     ",
        "    RR RRRR     ",
        "    rr   rr     ",
        "    rr   rr     ",
        "    zz   zz     ",
        "   zzz   zzz    "
      ],
      [
        "     zzZZzz     ",
        "    ZZZZZZZZ    ",
        "    ZZZZZZZZ    ",
        "    ZDEZZEDZ    ",
        "    ZZZZZZZZ    ",
        "    ZZZZZZZZ    ",
        "    RRRRRRRR    ",
        "   RRRRRRRRRR   ",
        "  ZZZZ RRRR ZZZZ",
        "  ZZZZ RRRR ZZZZ",
        "  ZZZZ RRRR     ",
        "    RR RRRR     ",
        "   rr     rr    ",
        "   rr     rr    ",
        "  zz       zz   ",
        " zzz       zzz  "
      ]
    ]
  },
  gem: [
    "  CCCC  ",
    " CCCCCL ",
    "CCCCCCCC",
    "CCCCCCCc",
    "CCCCCCCc",
    " CCCCCb ",
    "  CCCb  ",
    "   bb   "
  ]
};

function renderSpriteToCanvas(rows, palette, isWhiteMask = false) {
  const h = rows.length;
  const w = rows[0].length;
  const oc = document.createElement('canvas');
  oc.width = w;
  oc.height = h;
  const octx = oc.getContext('2d');
  octx.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const char = row[x];
      if (char !== ' ' && palette[char]) {
        octx.fillStyle = isWhiteMask ? '#ffffff' : palette[char];
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  return oc;
}

const SPRITE_CACHE = {
  player: { normal: [], white: [] },
  zombie: { normal: [], white: [] },
  gem: { normal: null, white: null }
};

function initSpriteCache() {
  SPRITE_CACHE.player.normal = SPRITES.player.walk.map(frame => renderSpriteToCanvas(frame, PALETTE, false));
  SPRITE_CACHE.player.white = SPRITES.player.walk.map(frame => renderSpriteToCanvas(frame, PALETTE, true));

  SPRITE_CACHE.zombie.normal = SPRITES.zombie.walk.map(frame => renderSpriteToCanvas(frame, PALETTE, false));
  SPRITE_CACHE.zombie.white = SPRITES.zombie.walk.map(frame => renderSpriteToCanvas(frame, PALETTE, true));

  SPRITE_CACHE.gem.normal = renderSpriteToCanvas(SPRITES.gem, PALETTE, false);
  SPRITE_CACHE.gem.white = renderSpriteToCanvas(SPRITES.gem, PALETTE, true);
}

initSpriteCache();

