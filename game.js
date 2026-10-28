const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

const GEM_EMOJI = '💎';
const PLAYER_FONT = '40px serif';
const GEM_FONT = '20px serif';

const characters = {
  balanced: {
    id: 'balanced',
    name: '균형형',
    emoji: '💂',
    maxHp: 100,
    speed: 300,
    defaultWeapon: 'gun',
    desc: 'HP: 100 | 속도: 보통\n기본 무기: 기본 총'
  },
  tank: {
    id: 'tank',
    name: '체력형',
    emoji: '🪖',
    maxHp: 160,
    speed: 240,
    defaultWeapon: 'shotgun',
    desc: 'HP: 160 | 속도: 느림\n기본 무기: 샷건'
  },
  speed: {
    id: 'speed',
    name: '속도형',
    emoji: '🥷',
    maxHp: 70,
    speed: 380,
    defaultWeapon: 'blade',
    desc: 'HP: 70 | 속도: 빠름\n기본 무기: 회전 칼날'
  }
};

const weapons = {
  gun: {
    id: 'gun',
    name: '기본 총',
    type: 'projectile',
    baseCooldown: 0.5,
    baseDamage: 18,
    desc: '단일 대상에게 빠른 투사체 발사'
  },
  shotgun: {
    id: 'shotgun',
    name: '샷건',
    type: 'spread',
    baseCooldown: 1.1,
    baseDamage: 14,
    desc: '전방에 넓은 부채꼴 탄환 발사'
  },
  blade: {
    id: 'blade',
    name: '회전 칼날',
    type: 'orbit',
    emoji: '🔪',
    damage: 22,
    desc: '주변을 공전하며 적을 타격'
  },
  lightning: {
    id: 'lightning',
    name: '⚡ 번개',
    type: 'instant',
    baseCooldown: 2.0,
    baseDamage: 32,
    desc: '화면 안의 랜덤한 적에게 벼락을 내리꽂아 즉시 피해'
  },
  laser: {
    id: 'laser',
    name: '🔦 레이저',
    type: 'beam',
    baseCooldown: 3.0,
    baseDamage: 40,
    desc: '가장 가까운 적 방향으로 모든 적을 관통하는 레이저 발사'
  },
  flamethrower: {
    id: 'flamethrower',
    name: '🔥 화염방사기',
    type: 'cone',
    baseCooldown: 2.0,
    baseDuration: 1.5,
    baseRange: 140,
    baseDamage: 12,
    desc: '가장 가까운 적 방향으로 화염을 방사하여 지속 피해'
  }
};

const DIFFICULTY = {
  baseSpawnInterval: 0.75,
  minSpawnInterval: 0.12,
  spawnDecay: 0.002,     // exp(-0.002 * t)
  hpScale: 0.0035,       // exp(0.0035 * t): 시간에 따라 체력 지수 증가
  speedScale: 0.0012,    // exp(0.0012 * t): 완만한 속도 지수 증가
  damageScale: 0.0025,   // exp(0.0025 * t): 완만한 데미지 지수 증가
  getSpawnInterval(t) {
    return Math.max(this.minSpawnInterval, this.baseSpawnInterval * Math.exp(-this.spawnDecay * t));
  },
  getHpMultiplier(t) {
    return Math.exp(this.hpScale * t);
  },
  getSpeedMultiplier(t) {
    return Math.min(1.8, Math.exp(this.speedScale * t));
  },
  getDamageMultiplier(t) {
    return Math.exp(this.damageScale * t);
  }
};

const enemyTypes = {
  zombie: {
    emoji: '🧟',
    radius: 16,
    hp: 30,
    speed: 120,
    damage: 20,
    fontGroup: 'medium',
    behavior: 'chase',
    minTime: 0
  },
  wolf: {
    emoji: '🐺',
    radius: 14,
    hp: 45,
    speed: 175,
    damage: 18,
    fontGroup: 'small',
    behavior: 'chase',
    minTime: 60 // 1분 이후 등장
  },
  troll: {
    emoji: '🧌',
    radius: 22,
    hp: 125,
    speed: 85,
    damage: 35,
    fontGroup: 'large',
    behavior: 'chase',
    minTime: 120 // 2분 이후 등장
  },
  mage: {
    emoji: '🧙',
    radius: 18,
    hp: 85,
    speed: 135,
    damage: 28,
    fontGroup: 'medium',
    behavior: 'chase',
    minTime: 180 // 3분 이후 등장
  }
};

const MAX_ENEMIES = 100;
const SPAWN_COUNT = 1;

function getAvailableEnemyTypes(time) {
  const available = [];
  for (const [key, t] of Object.entries(enemyTypes)) {
    if (time >= t.minTime) {
      available.push(key);
    }
  }
  return available;
}

const BOSS_SCALE = 2;

const FONT_GROUPS = {
  small: '28px serif',
  medium: '32px serif',
  large: '48px serif',
  boss: `${56 * BOSS_SCALE}px serif`
};

const bossEmojis = ['👹', '💀', '🐉'];
const BOSS_TIMES = [60, 180, 300, 420, 600];
let nextBossIndex = 0;
let bossCount = 0;

function getNextBossTime(index) {
  if (index < BOSS_TIMES.length) {
    return BOSS_TIMES[index];
  }
  return 600 + (index - 4) * 180;
}

function spawnBoss() {
  const activeBossCount = enemies.filter(e => e.isBoss).length;
  if (activeBossCount >= 2) return false;

  const currentLevel = bossCount + 1;
  const emoji = bossEmojis[bossCount % bossEmojis.length];
  const baseHp = 450;
  const hp = Math.round(baseHp * Math.pow(1.5, bossCount));

  const angle = Math.random() * Math.PI * 2;
  const spawnDist = Math.hypot(canvas.width, canvas.height) / 2 + 80;

  enemies.push({
    type: 'boss',
    emoji: emoji,
    radius: 36 * BOSS_SCALE,
    speed: 95,
    damage: 35,
    fontGroup: 'boss',
    behavior: 'chase',
    attackTimer: 0,
    hp: hp,
    maxHp: hp,
    hitFlashTimer: 0,
    x: player.x + Math.cos(angle) * spawnDist,
    y: player.y + Math.sin(angle) * spawnDist,
    isBoss: true,
    bossLevel: currentLevel
  });

  shake = 18;
  bossCount++;
  return true;
}

function killEnemy(enemy, index) {
  playKillSound();
  spawnDeathParticles(enemy.x, enemy.y, enemy.isBoss ? '#f39c12' : '#ff4d4d');
  if (enemy.isBoss) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 55;
      gems.push({
        x: enemy.x + Math.cos(angle) * dist,
        y: enemy.y + Math.sin(angle) * dist,
        value: 2
      });
    }
  } else {
    gems.push({ x: enemy.x, y: enemy.y, value: 1 });
  }
  enemies.splice(index, 1);
  killCount++;
}

const player = {
  characterId: 'balanced',
  emoji: '💂',
  x: 0,
  y: 0,
  radius: 20,
  speed: 300,
  maxHp: 100,
  hp: 100,
  facing: 1,
  level: 1,
  exp: 0,
  nextExp: 5,
  pickupRadius: 120,
  damageMultiplier: 1,
  attackSpeedMultiplier: 1,
  extraProjectiles: 0,
  weapons: { gun: 1 }
};

const keys = {};
const enemies = [];
const bullets = [];
const gems = [];
const particles = [];
const damageNumbers = [];
const lightningEffects = [];
const laserEffects = [];

let hitVignetteTimer = 0;
let playerAnimTimer = 0;
let playerWalkFrame = 0;
let zombieAnimTimer = 0;
let zombieWalkFrame = 0;
let elapsedTime = 0;
let bestRecord = 0;
try {
  const stored = localStorage.getItem('bestTime');
  if (stored) bestRecord = parseFloat(stored) || 0;
} catch (e) {}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateBestRecord() {
  if (elapsedTime > bestRecord) {
    bestRecord = elapsedTime;
    try {
      localStorage.setItem('bestTime', bestRecord.toString());
    } catch (e) {}
  }
}

let soundEnabled = true;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freqStart, freqEnd, duration, type = 'sine', gainVal = 0.1) {
  if (!soundEnabled || isPaused) return;
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), now + duration);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {}
}

function playShootSound() {
  playTone(500, 160, 0.08, 'square', 0.04);
}

function playKillSound() {
  playTone(180, 50, 0.12, 'triangle', 0.12);
}

function playHitSound() {
  playTone(130, 40, 0.14, 'sawtooth', 0.14);
}

function playLevelUpSound() {
  if (!soundEnabled) return;
  try {
    initAudio();
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, freq * 1.05, 0.14, 'triangle', 0.08), idx * 60);
    });
  } catch (e) {}
}

function spawnDeathParticles(x, y, color = '#ff4d4d') {
  const count = 6 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    if (particles.length >= 120) particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 110;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2.5 + Math.random() * 2,
      color,
      life: 0.35 + Math.random() * 0.15,
      maxLife: 0.35 + Math.random() * 0.15
    });
  }
}

function spawnDamageNumber(x, y, damage) {
  if (damageNumbers.length >= 60) damageNumbers.shift();
  damageNumbers.push({
    x: x + (Math.random() * 16 - 8),
    y: y - 10,
    text: Math.round(damage),
    vy: -45,
    life: 0.5,
    maxLife: 0.5
  });
}

function createLightningBolt(startX, startY, endX, endY) {
  const points = [{ x: startX, y: startY }];
  const steps = 7;
  const dx = (endX - startX) / steps;
  const dy = (endY - startY) / steps;
  for (let i = 1; i < steps; i++) {
    const rx = (Math.random() - 0.5) * 36;
    points.push({
      x: startX + dx * i + rx,
      y: startY + dy * i
    });
  }
  points.push({ x: endX, y: endY });
  return points;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.hypot(px - projX, py - projY);
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const flameParticles = [];
let flameState = { active: false, timer: 0, tickTimer: 0, angle: 0 };

let weaponTimers = { gun: 0, shotgun: 0, lightning: 0, laser: 0 };
let bladeAngle = 0;


let spawnTimer = 0;
let killCount = 0;
let isSelectingCharacter = true;
let isGameOver = false;
let isLevelUp = false;
let isPaused = false;
let upgradeChoices = [];
let shake = 0;


function selectCharacter(charId) {
  const c = characters[charId] || characters.balanced;
  player.characterId = c.id;
  player.emoji = c.emoji;
  player.maxHp = c.maxHp;
  player.hp = c.maxHp;
  player.speed = c.speed;
  player.weapons = { [c.defaultWeapon]: 1 };
  weaponTimers = { gun: 0, shotgun: 0, lightning: 0, laser: 0 };
  flameState = { active: false, timer: 0, tickTimer: 0, angle: 0 };
  bladeAngle = 0;
  isSelectingCharacter = false;
}

function getNearestEnemy() {
  let nearest = null;
  let minDist = Infinity;
  for (const enemy of enemies) {
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (d < minDist) {
      minDist = d;
      nearest = enemy;
    }
  }
  return nearest;
}

function triggerLevelUp() {
  isLevelUp = true;
  playLevelUpSound();

  if (!player.passives) player.passives = {};

  const basePassives = [
    { id: 'dmg', title: '공격력 +20%', desc: '모든 무기 데미지가 20% 증가합니다.', apply: () => { player.damageMultiplier += 0.2; } },
    { id: 'aspd', title: '공격속도 +15%', desc: '무기 공격 주기가 15% 빨라집니다.', apply: () => { player.attackSpeedMultiplier += 0.15; } },
    { id: 'spd', title: '이동속도 +10%', desc: '이동 속도가 10% 증가합니다.', apply: () => { player.speed *= 1.1; } },
    { id: 'hp', title: '최대 HP +20', desc: '최대 체력이 증가하고 즉시 회복됩니다.', apply: () => { player.maxHp += 20; player.hp += 20; } },
    { id: 'proj', title: '투사체 +1', desc: '기본 총과 샷건의 투사체가 1발 추가됩니다.', apply: () => { player.extraProjectiles += 1; } },
    { id: 'range', title: '경험치 획득 범위 +30%', desc: '보석 자석 흡수 범위가 증가합니다.', apply: () => { player.pickupRadius *= 1.3; } }
  ];

  const otherCards = [];
  for (const p of basePassives) {
    const curLevel = player.passives[p.id] || 0;
    if (curLevel < 5) {
      otherCards.push({
        id: `p_${p.id}`,
        title: p.title,
        desc: p.desc,
        apply: () => {
          player.passives[p.id] = (player.passives[p.id] || 0) + 1;
          p.apply();
        }
      });
    }
  }

  const currentWeaponKeys = Object.keys(player.weapons);
  const canAcquireNew = currentWeaponKeys.length < 4;
  const upgradeCards = [];

  for (const [wId, w] of Object.entries(weapons)) {
    const curLevel = player.weapons[wId] || 0;
    if (curLevel > 0 && curLevel < 5) {
      upgradeCards.push({
        id: `w_up_${wId}`,
        title: `${w.name} Lv.${curLevel + 1}`,
        desc: `${w.name}의 성능과 데미지가 강화됩니다.`,
        apply: () => { player.weapons[wId] += 1; }
      });
    } else if (curLevel === 0 && canAcquireNew) {
      otherCards.push({
        id: `w_new_${wId}`,
        title: `신규 무기: ${w.name}`,
        desc: w.desc,
        apply: () => { player.weapons[wId] = 1; }
      });
    }
  }

  const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());
  shuffle(upgradeCards);
  shuffle(otherCards);

  upgradeChoices = [];

  // 1. 이미 보유한 무기/스킬의 강화 카드가 1개 이상 있으면 최소 1장 확정 포함
  if (upgradeCards.length > 0) {
    upgradeChoices.push(upgradeCards.pop());
  }

  // 2. 남은 풀에서 3장이 채워질 때까지 무작위 선택
  const remainingPool = shuffle([...upgradeCards, ...otherCards]);
  while (upgradeChoices.length < 3 && remainingPool.length > 0) {
    upgradeChoices.push(remainingPool.pop());
  }
}

function gainExp(amount) {
  player.exp += amount;
  if (player.exp >= player.nextExp) {
    player.exp -= player.nextExp;
    player.level += 1;
    player.nextExp = Math.floor(player.nextExp * 1.5);
    triggerLevelUp();
  }
}

function spawnEnemy(typeKey) {
  const t = enemyTypes[typeKey];
  if (!t) return;
  if (enemies.length >= MAX_ENEMIES) return;

  const hpMult = DIFFICULTY.getHpMultiplier(elapsedTime);
  const spdMult = DIFFICULTY.getSpeedMultiplier(elapsedTime);
  const dmgMult = DIFFICULTY.getDamageMultiplier(elapsedTime);

  const angle = Math.random() * Math.PI * 2;
  const spawnDist = Math.hypot(canvas.width, canvas.height) / 2 + 60;
  const scaledHp = Math.round(t.hp * hpMult);

  enemies.push({
    type: typeKey,
    emoji: t.emoji,
    radius: t.radius,
    speed: t.speed * spdMult,
    damage: t.damage * dmgMult,
    fontGroup: t.fontGroup,
    behavior: t.behavior,
    attackTimer: Math.random() * 1.5,
    hp: scaledHp,
    maxHp: scaledHp,
    hitFlashTimer: 0,
    x: player.x + Math.cos(angle) * spawnDist,
    y: player.y + Math.sin(angle) * spawnDist
  });
}

function resetGame() {
  player.x = 0;
  player.y = 0;
  player.facing = 1;
  player.level = 1;
  player.exp = 0;
  player.nextExp = 5;
  player.pickupRadius = 120;
  player.damageMultiplier = 1;
  player.attackSpeedMultiplier = 1;
  player.extraProjectiles = 0;
  player.passives = {};

  enemies.length = 0;
  bullets.length = 0;
  gems.length = 0;
  particles.length = 0;
  damageNumbers.length = 0;
  lightningEffects.length = 0;
  laserEffects.length = 0;
  flameParticles.length = 0;
  hitVignetteTimer = 0;

  weaponTimers = { gun: 0, shotgun: 0, lightning: 0, laser: 0 };
  flameState = { active: false, timer: 0, tickTimer: 0, angle: 0 };

  spawnTimer = 0;
  killCount = 0;
  elapsedTime = 0;
  nextBossIndex = 0;
  bossCount = 0;
  shake = 0;
  isSelectingCharacter = true;
  isGameOver = false;
  isLevelUp = false;
  isPaused = false;
  upgradeChoices = [];
}

window.addEventListener('click', (e) => {
  initAudio();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Sound Toggle Button Click (Top-Right)
  const soundBtnW = 96;
  const soundBtnH = 26;
  const soundBtnX = canvas.width - 120;
  const soundBtnY = 16;
  if (mx >= soundBtnX && mx <= soundBtnX + soundBtnW && my >= soundBtnY && my <= soundBtnY + soundBtnH) {
    soundEnabled = !soundEnabled;
    if (soundEnabled) initAudio();
    return;
  }

  // Character selection click
  if (isSelectingCharacter) {
    const charList = Object.values(characters);
    const cardW = 210;
    const cardH = 260;
    const gap = 24;
    const totalW = cardW * charList.length + gap * (charList.length - 1);
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - cardH) / 2;

    for (let i = 0; i < charList.length; i++) {
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
        selectCharacter(charList[i].id);
        break;
      }
    }
    return;
  }

  // Level Up card click
  if (isLevelUp) {
    const cardW = 200;
    const cardH = 220;
    const gap = 20;
    const totalW = cardW * upgradeChoices.length + gap * (upgradeChoices.length - 1);
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - cardH) / 2;

    for (let i = 0; i < upgradeChoices.length; i++) {
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
        upgradeChoices[i].apply();
        isLevelUp = false;
        if (player.exp >= player.nextExp) {
          gainExp(0);
        }
        break;
      }
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (e.repeat) return;
    if (!isGameOver && !isLevelUp && !isSelectingCharacter) {
      isPaused = !isPaused;
      if (!isPaused) {
        lastTime = performance.now();
      }
    }
    return;
  }
  keys[e.key.toLowerCase()] = true;
  if (isGameOver && e.key.toLowerCase() === 'r') resetGame();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

const GRID_SIZE = 50;
let lastTime = performance.now();

function gameLoop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  // 이동 입력 및 대각선 속도 보정
  if (!isGameOver && !isLevelUp && !isSelectingCharacter && !isPaused) {
    elapsedTime += dt;

    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.hypot(dx, dy);
      dx *= invLen;
      dy *= invLen;
    }

    if (dx < 0) player.facing = -1;
    else if (dx > 0) player.facing = 1;

    // Sprite Animation Timers (0.2s walk cycle)
    if (dx !== 0 || dy !== 0) {
      playerAnimTimer += dt;
      if (playerAnimTimer >= 0.2) {
        playerAnimTimer -= 0.2;
        playerWalkFrame = (playerWalkFrame + 1) % 2;
      }
    } else {
      playerAnimTimer = 0;
      playerWalkFrame = 0;
    }

    zombieAnimTimer += dt;
    if (zombieAnimTimer >= 0.2) {
      zombieAnimTimer -= 0.2;
      zombieWalkFrame = (zombieWalkFrame + 1) % 2;
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    // Spawn enemies with dynamic difficulty & enemy types
    spawnTimer += dt;
    const currentInterval = DIFFICULTY.getSpawnInterval(elapsedTime);
    if (spawnTimer >= currentInterval) {
      spawnTimer = 0;
      const available = getAvailableEnemyTypes(elapsedTime);
      if (available.length > 0) {
        for (let i = 0; i < SPAWN_COUNT; i++) {
          const randomType = available[Math.floor(Math.random() * available.length)];
          spawnEnemy(randomType);
        }
      }
    }

    // Boss Spawn Check (1, 3, 5, 7, 10분, 이후 3분 간격, 최대 2마리)
    if (elapsedTime >= getNextBossTime(nextBossIndex)) {
      if (spawnBoss()) {
        nextBossIndex++;
      }
    }

    // Weapon 1: Basic Gun (Single / Spread with extraProjectiles)
    if (player.weapons.gun) {
      weaponTimers.gun += dt;
      const cooldown = (weapons.gun.baseCooldown - (player.weapons.gun - 1) * 0.05) / player.attackSpeedMultiplier;
      if (weaponTimers.gun >= Math.max(0.15, cooldown)) {
        weaponTimers.gun = 0;
        const nearest = getNearestEnemy();
        if (nearest) {
          playShootSound();
          const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
          const count = 1 + player.extraProjectiles;
          const spread = 0.12;
          const startAngle = baseAngle - ((count - 1) * spread) / 2;
          const bSpeed = 650;
          const dmg = (weapons.gun.baseDamage + (player.weapons.gun - 1) * 6) * player.damageMultiplier;

          for (let i = 0; i < count; i++) {
            const angle = startAngle + i * spread;
            bullets.push({
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * bSpeed,
              vy: Math.sin(angle) * bSpeed,
              speed: bSpeed,
              radius: 4,
              damage: dmg,
              distTraveled: 0,
              maxDist: 600
            });
          }
        }
      }
    }

    // Weapon 2: Shotgun (Spread blast)
    if (player.weapons.shotgun) {
      weaponTimers.shotgun += dt;
      const cooldown = (weapons.shotgun.baseCooldown - (player.weapons.shotgun - 1) * 0.1) / player.attackSpeedMultiplier;
      if (weaponTimers.shotgun >= Math.max(0.4, cooldown)) {
        weaponTimers.shotgun = 0;
        const nearest = getNearestEnemy();
        if (nearest) {
          playShootSound();
          const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
          const count = 3 + (player.weapons.shotgun - 1) + player.extraProjectiles;
          const spread = 0.15;
          const startAngle = baseAngle - ((count - 1) * spread) / 2;
          const bSpeed = 550;
          const dmg = (weapons.shotgun.baseDamage + (player.weapons.shotgun - 1) * 4) * player.damageMultiplier;

          for (let i = 0; i < count; i++) {
            const angle = startAngle + i * spread;
            bullets.push({
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * bSpeed,
              vy: Math.sin(angle) * bSpeed,
              speed: bSpeed,
              radius: 4,
              damage: dmg,
              distTraveled: 0,
              maxDist: 480
            });
          }
        }
      }
    }

    // Weapon 3: Orbiting Blade
    if (player.weapons.blade) {
      bladeAngle += dt * (3.5 + player.weapons.blade * 0.4);
      const bladeCount = 1 + Math.floor((player.weapons.blade - 1) / 2);
      const bladeRadius = 65;
      const bladeDmg = (weapons.blade.damage + (player.weapons.blade - 1) * 8) * player.damageMultiplier;

      for (let bi = 0; bi < bladeCount; bi++) {
        const a = bladeAngle + (bi * (Math.PI * 2 / bladeCount));
        const bx = player.x + Math.cos(a) * bladeRadius;
        const by = player.y + Math.sin(a) * bladeRadius;

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const enemy = enemies[ei];
          if (Math.hypot(bx - enemy.x, by - enemy.y) < enemy.radius + 15) {
            if (time - (enemy.lastBladeHit || 0) > 280) {
              enemy.lastBladeHit = time;
              enemy.hp -= bladeDmg;
              enemy.hitFlashTimer = 0.1;
              spawnDamageNumber(enemy.x, enemy.y, bladeDmg);
              if (enemy.hp <= 0) {
                killEnemy(enemy, ei);
              }
            }
          }
        }
      }
    }

    // Weapon 4: Lightning (⚡ 번개)
    if (player.weapons.lightning) {
      weaponTimers.lightning += dt;
      const lvl = player.weapons.lightning;
      const cooldown = (weapons.lightning.baseCooldown * Math.pow(0.9, lvl - 1)) / player.attackSpeedMultiplier;
      if (weaponTimers.lightning >= cooldown) {
        weaponTimers.lightning = 0;

        const onScreenEnemies = [];
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          const sx = e.x - player.x + canvas.width / 2;
          const sy = e.y - player.y + canvas.height / 2;
          if (sx >= -20 && sx <= canvas.width + 20 && sy >= -20 && sy <= canvas.height + 20) {
            onScreenEnemies.push(e);
          }
        }

        if (onScreenEnemies.length > 0) {
          const targetCount = Math.min(lvl, onScreenEnemies.length);
          const shuffled = onScreenEnemies.sort(() => 0.5 - Math.random());
          const targets = shuffled.slice(0, targetCount);
          const dmg = (weapons.lightning.baseDamage * (1 + (lvl - 1) * 0.2)) * player.damageMultiplier;

          shake = Math.max(shake, 2);
          playTone(650, 140, 0.12, 'sawtooth', 0.08);

          for (const target of targets) {
            const startX = target.x + (Math.random() * 40 - 20);
            const startY = target.y - (canvas.height / 2 + 80);
            lightningEffects.push({
              points: createLightningBolt(startX, startY, target.x, target.y),
              life: 0.15,
              maxLife: 0.15
            });

            target.hp -= dmg;
            target.hitFlashTimer = 0.1;
            spawnDamageNumber(target.x, target.y, dmg);
            spawnDeathParticles(target.x, target.y, '#f1c40f');

            if (target.hp <= 0) {
              const ei = enemies.indexOf(target);
              if (ei !== -1) {
                killEnemy(target, ei);
              }
            }
          }
        }
      }
    }

    // Weapon 5: Laser (🔦 레이저)
    if (player.weapons.laser) {
      weaponTimers.laser += dt;
      const lvl = player.weapons.laser;
      const cooldown = weapons.laser.baseCooldown / player.attackSpeedMultiplier;
      if (weaponTimers.laser >= cooldown) {
        weaponTimers.laser = 0;
        const nearest = getNearestEnemy();
        if (nearest) {
          const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
          const beamCount = lvl >= 5 ? 2 : 1;
          const beamThickness = 10 + (lvl - 1) * 2;
          const dmg = (weapons.laser.baseDamage * (1 + (lvl - 1) * 0.25)) * player.damageMultiplier;
          const beamLength = Math.hypot(canvas.width, canvas.height) + 200;

          playTone(400, 800, 0.15, 'sine', 0.1);
          shake = Math.max(shake, 1.5);

          for (let bi = 0; bi < beamCount; bi++) {
            const angle = baseAngle + bi * Math.PI;
            const x1 = player.x;
            const y1 = player.y;
            const x2 = player.x + Math.cos(angle) * beamLength;
            const y2 = player.y + Math.sin(angle) * beamLength;

            laserEffects.push({
              x1, y1, x2, y2,
              thickness: beamThickness,
              life: 0.2,
              maxLife: 0.2
            });

            for (let ei = enemies.length - 1; ei >= 0; ei--) {
              const enemy = enemies[ei];
              const dist = distToSegment(enemy.x, enemy.y, x1, y1, x2, y2);
              if (dist <= enemy.radius + beamThickness / 2) {
                enemy.hp -= dmg;
                enemy.hitFlashTimer = 0.1;
                spawnDamageNumber(enemy.x, enemy.y, dmg);
                spawnDeathParticles(enemy.x, enemy.y, '#00d2d3');
                if (enemy.hp <= 0) {
                  killEnemy(enemy, ei);
                }
              }
            }
          }
        }
      }
    }

    // Weapon 6: Flamethrower (🔥 화염방사기)
    if (player.weapons.flamethrower) {
      const lvl = player.weapons.flamethrower;
      const duration = weapons.flamethrower.baseDuration + (lvl - 1) * 0.2;
      const restTime = weapons.flamethrower.baseCooldown / player.attackSpeedMultiplier;
      const range = weapons.flamethrower.baseRange * (1 + (lvl - 1) * 0.1);
      const dmg = (weapons.flamethrower.baseDamage * (1 + (lvl - 1) * 0.2)) * player.damageMultiplier;
      const halfAngle = 30 * (Math.PI / 180);

      flameState.timer += dt;

      if (flameState.active) {
        const nearest = getNearestEnemy();
        if (nearest) {
          flameState.angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        } else {
          flameState.angle = player.facing === 1 ? 0 : Math.PI;
        }

        flameState.tickTimer += dt;
        if (flameState.tickTimer >= 0.2) {
          flameState.tickTimer -= 0.2;

          for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const enemy = enemies[ei];
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist <= range + enemy.radius) {
              const enemyAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
              const angleDiff = Math.abs(normalizeAngle(enemyAngle - flameState.angle));
              if (angleDiff <= halfAngle) {
                enemy.hp -= dmg;
                enemy.hitFlashTimer = 0.1;
                spawnDamageNumber(enemy.x, enemy.y, dmg);
                if (enemy.hp <= 0) {
                  killEnemy(enemy, ei);
                }
              }
            }
          }
        }

        if (flameParticles.length < 90) {
          const spawnCount = 2 + Math.floor(Math.random() * 2);
          for (let pi = 0; pi < spawnCount; pi++) {
            const spreadAngle = flameState.angle + (Math.random() - 0.5) * (halfAngle * 1.6);
            const speed = (range / 0.45) * (0.65 + Math.random() * 0.45);
            const colors = ['#ff4757', '#ff6348', '#ffa502', '#ff7f50', '#eccc68'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const life = 0.3 + Math.random() * 0.15;
            flameParticles.push({
              x: player.x + Math.cos(spreadAngle) * 15,
              y: player.y + Math.sin(spreadAngle) * 15,
              vx: Math.cos(spreadAngle) * speed,
              vy: Math.sin(spreadAngle) * speed,
              radius: 3 + Math.random() * 3.5,
              color: color,
              life: life,
              maxLife: life
            });
          }
        }

        if (flameState.timer >= duration) {
          flameState.active = false;
          flameState.timer = 0;
        }
      } else {
        if (flameState.timer >= restTime) {
          flameState.active = true;
          flameState.timer = 0;
          flameState.tickTimer = 0.2;
          playTone(220, 90, 0.2, 'sawtooth', 0.05);
        }
      }
    }

    // Update bullets
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.distTraveled += b.speed * dt;

      const bsx = b.x - player.x + canvas.width / 2;
      const bsy = b.y - player.y + canvas.height / 2;
      const outOfScreen = bsx < 0 || bsx > canvas.width || bsy < 0 || bsy > canvas.height;

      if (b.distTraveled >= b.maxDist || outOfScreen) {
        bullets.splice(bi, 1);
        continue;
      }

      let hit = false;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < b.radius + enemy.radius) {
          hit = true;
          enemy.hp -= b.damage;
          enemy.hitFlashTimer = 0.1;
          spawnDamageNumber(enemy.x, enemy.y, b.damage);
          if (enemy.hp <= 0) {
            killEnemy(enemy, ei);
            break;
          }
          break;
        }
      }
      if (hit) {
        bullets.splice(bi, 1);
      }
    }

    // Update gems (Magnet pull)
    for (let gi = gems.length - 1; gi >= 0; gi--) {
      const g = gems[gi];
      const gdx = player.x - g.x;
      const gdy = player.y - g.y;
      const dist = Math.hypot(gdx, gdy);

      if (dist < player.pickupRadius && dist > 0) {
        const pullSpeed = 450;
        g.x += (gdx / dist) * pullSpeed * dt;
        g.y += (gdy / dist) * pullSpeed * dt;
      }

      if (dist < player.radius + 12) {
        gainExp(g.value);
        gems.splice(gi, 1);
      }
    }

    // Update enemies (Chase behavior)
    for (const enemy of enemies) {
      if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;
      const edx = player.x - enemy.x;
      const edy = player.y - enemy.y;
      const dist = Math.hypot(edx, edy);

      if (dist > 0) {
        enemy.x += (edx / dist) * enemy.speed * dt;
        enemy.y += (edy / dist) * enemy.speed * dt;
      }

      if (dist < player.radius + enemy.radius) {
        player.hp = Math.max(0, player.hp - enemy.damage * dt);
        shake = Math.min(10, Math.max(shake, 6));
        hitVignetteTimer = 0.25;
        playHitSound();
        if (player.hp <= 0) {
          isGameOver = true;
          updateBestRecord();
        }
      }
    }

    // Update enemy bullets (제거됨 — ranged 적 없음)

    // Push enemies apart
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i], b = enemies[j];
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const dist = Math.hypot(ex, ey);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = (ex / dist) * overlap;
          const ny = (ey / dist) * overlap;
          a.x -= nx; a.y -= ny;
          b.x += nx; b.y += ny;
        }
      }
    }

    // Update particles
    for (let pi = particles.length - 1; pi >= 0; pi--) {
      const p = particles[pi];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(pi, 1);
    }

    // Update flame particles
    for (let fpi = flameParticles.length - 1; fpi >= 0; fpi--) {
      const fp = flameParticles[fpi];
      fp.x += fp.vx * dt;
      fp.y += fp.vy * dt;
      fp.life -= dt;
      if (fp.life <= 0) flameParticles.splice(fpi, 1);
    }

    // Update damage numbers
    for (let di = damageNumbers.length - 1; di >= 0; di--) {
      const d = damageNumbers[di];
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) damageNumbers.splice(di, 1);
    }

    // Update lightning effects
    for (let li = lightningEffects.length - 1; li >= 0; li--) {
      const le = lightningEffects[li];
      le.life -= dt;
      if (le.life <= 0) lightningEffects.splice(li, 1);
    }

    // Update laser effects
    for (let li = laserEffects.length - 1; li >= 0; li--) {
      const le = laserEffects[li];
      le.life -= dt;
      if (le.life <= 0) laserEffects.splice(li, 1);
    }
  }

  if (hitVignetteTimer > 0 && !isPaused) {
    hitVignetteTimer -= dt;
  }

  // Shake 감쇠 (일시정지 중 멈춤)
  if (!isLevelUp && !isSelectingCharacter && !isPaused) {
    shake *= 0.9;
    if (shake < 0.5) shake = 0;
  }

  // 렌더링
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  ctx.save();
  if (shake > 0) {
    const rx = (Math.random() * 2 - 1) * shake;
    const ry = (Math.random() * 2 - 1) * shake;
    ctx.translate(rx, ry);
  }

  // 무한 격자 배경 그리기
  const offsetX = -(player.x % GRID_SIZE);
  const offsetY = -(player.y % GRID_SIZE);

  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offsetX; x < canvas.width; x += GRID_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = offsetY; y < canvas.height; y += GRID_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();

  // Enemies (Rendered by font groups to minimize ctx.font changes)
  const buckets = { small: [], medium: [], large: [], boss: [] };
  for (const enemy of enemies) {
    buckets[enemy.fontGroup]?.push(enemy);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [group, groupEnemies] of Object.entries(buckets)) {
    if (groupEnemies.length === 0) continue;
    ctx.font = FONT_GROUPS[group];
    for (const enemy of groupEnemies) {
      const sx = enemy.x - player.x + canvas.width / 2;
      const sy = enemy.y - player.y + canvas.height / 2;
      // 화면 밖 적은 그리지 않기 (컬링)
      if (sx < -60 || sx > canvas.width + 60 || sy < -60 || sy > canvas.height + 60) continue;
      ctx.save();
      ctx.translate(sx, sy);
      if (player.x < enemy.x) ctx.scale(-1, 1);
      if (enemy.type === 'zombie' && typeof SPRITE_CACHE !== 'undefined' && SPRITE_CACHE.zombie) {
        const zCanvas = enemy.hitFlashTimer > 0
          ? SPRITE_CACHE.zombie.white[zombieWalkFrame]
          : SPRITE_CACHE.zombie.normal[zombieWalkFrame];
        ctx.drawImage(zCanvas, -32, -32, 64, 64);
      } else {
        if (enemy.hitFlashTimer > 0) ctx.filter = 'brightness(5)';
        ctx.fillText(enemy.emoji, 0, 0);
      }
      ctx.restore();

      // Boss Overhead HP Bar & Level
      if (enemy.isBoss) {
        const bBarW = Math.round(enemy.radius * 2.2);
        const bBarH = 8;
        const bBarX = sx - bBarW / 2;
        const bBarY = sy - enemy.radius - (enemy.radius * 0.35 + 8);

        ctx.fillStyle = '#ff4757';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`BOSS Lv.${enemy.bossLevel}`, sx, bBarY - 6);

        ctx.fillStyle = '#222222';
        ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(bBarX, bBarY, Math.max(0, enemy.hp / enemy.maxHp) * bBarW, bBarH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);
      }
    }
  }


  // Bullets (Yellow small circles)
  ctx.fillStyle = '#ffeb3b';
  for (const b of bullets) {
    const sx = b.x - player.x + canvas.width / 2;
    const sy = b.y - player.y + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(sx, sy, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gems (8x8 Pixel Art Gem at 3x scale)
  const gemCanvas = typeof SPRITE_CACHE !== 'undefined' ? SPRITE_CACHE.gem?.normal : null;
  if (gemCanvas) {
    for (const g of gems) {
      const sx = g.x - player.x + canvas.width / 2;
      const sy = g.y - player.y + canvas.height / 2;
      ctx.drawImage(gemCanvas, sx - 12, sy - 12, 24, 24);
    }
  } else {
    ctx.font = GEM_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of gems) {
      const sx = g.x - player.x + canvas.width / 2;
      const sy = g.y - player.y + canvas.height / 2;
      ctx.fillText(GEM_EMOJI, sx, sy);
    }
  }

  // Orbiting Blades
  if (player.weapons.blade) {
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bladeCount = 1 + Math.floor((player.weapons.blade - 1) / 2);
    const bladeRadius = 65;
    for (let bi = 0; bi < bladeCount; bi++) {
      const a = bladeAngle + (bi * (Math.PI * 2 / bladeCount));
      const sx = Math.cos(a) * bladeRadius + canvas.width / 2;
      const sy = Math.sin(a) * bladeRadius + canvas.height / 2;
      ctx.fillText('🔪', sx, sy);
    }
  }

  // Player (16x16 Pixel Art Sprite at 4x scale)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (player.facing === -1) ctx.scale(-1, 1);
  const playerCanvas = typeof SPRITE_CACHE !== 'undefined' && SPRITE_CACHE.player
    ? SPRITE_CACHE.player.normal[playerWalkFrame]
    : null;
  if (playerCanvas) {
    ctx.drawImage(playerCanvas, -32, -32, 64, 64);
  } else {
    ctx.font = PLAYER_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.emoji, 0, 0);
  }
  ctx.restore();

  // Death Particles
  for (const p of particles) {
    const sx = p.x - player.x + canvas.width / 2;
    const sy = p.y - player.y + canvas.height / 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Flame Particles (Orange/Red circles)
  for (const fp of flameParticles) {
    const sx = fp.x - player.x + canvas.width / 2;
    const sy = fp.y - player.y + canvas.height / 2;
    const alpha = Math.max(0, fp.life / fp.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fp.color;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1, fp.radius * (0.6 + 0.6 * (1 - alpha))), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating Damage Numbers
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const d of damageNumbers) {
    const sx = d.x - player.x + canvas.width / 2;
    const sy = d.y - player.y + canvas.height / 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, d.life / d.maxLife);
    ctx.fillStyle = '#fffa65';
    ctx.fillText(d.text, sx, sy);
    ctx.restore();
  }

  // Lightning Effects (Yellow Zig-Zag lines)
  for (const le of lightningEffects) {
    if (le.points.length < 2) continue;
    const alpha = Math.max(0, le.life / le.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    // 외곽 노란색 빛
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = le.points[0];
    ctx.moveTo(p0.x - player.x + canvas.width / 2, p0.y - player.y + canvas.height / 2);
    for (let i = 1; i < le.points.length; i++) {
      const pt = le.points[i];
      ctx.lineTo(pt.x - player.x + canvas.width / 2, pt.y - player.y + canvas.height / 2);
    }
    ctx.stroke();

    // 중심 흰색 광선
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p0.x - player.x + canvas.width / 2, p0.y - player.y + canvas.height / 2);
    for (let i = 1; i < le.points.length; i++) {
      const pt = le.points[i];
      ctx.lineTo(pt.x - player.x + canvas.width / 2, pt.y - player.y + canvas.height / 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Laser Effects (Cyan Double-layer Glow Beam, no shadowBlur)
  for (const le of laserEffects) {
    const alpha = Math.max(0, le.life / le.maxLife);
    const sx1 = le.x1 - player.x + canvas.width / 2;
    const sy1 = le.y1 - player.y + canvas.height / 2;
    const sx2 = le.x2 - player.x + canvas.width / 2;
    const sy2 = le.y2 - player.y + canvas.height / 2;

    ctx.save();
    ctx.lineCap = 'round';

    // 1층: 외곽 하늘색 넓은 글로우
    ctx.strokeStyle = `rgba(72, 219, 251, ${alpha * 0.45})`;
    ctx.lineWidth = le.thickness * 2.2;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // 2층: 선명한 하늘색 메인 빔
    ctx.strokeStyle = `rgba(10, 189, 227, ${alpha * 0.85})`;
    ctx.lineWidth = le.thickness;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // 코어: 중심 백색 코어
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = Math.max(2, le.thickness * 0.35);
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();

  // Hit Red Vignette Edge
  if (hitVignetteTimer > 0) {
    const vAlpha = Math.min(0.45, (hitVignetteTimer / 0.25) * 0.45);
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.35,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.72
    );
    grad.addColorStop(0, 'rgba(231, 76, 60, 0)');
    grad.addColorStop(1, `rgba(231, 76, 60, ${vAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Sound Toggle Button (Top-Right)
  const soundBtnW = 96;
  const soundBtnH = 26;
  const soundBtnX = canvas.width - 120;
  const soundBtnY = 16;
  ctx.fillStyle = soundEnabled ? '#27ae60' : '#7f8c8d';
  ctx.fillRect(soundBtnX, soundBtnY, soundBtnW, soundBtnH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(soundBtnX, soundBtnY, soundBtnW, soundBtnH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(soundEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF', soundBtnX + soundBtnW / 2, soundBtnY + soundBtnH / 2);

  // EXP Bar & Level (Bottom)
  const expH = 14;
  const expY = canvas.height - 24;
  const expW = canvas.width - 48;
  const expX = 24;
  ctx.fillStyle = '#222222';
  ctx.fillRect(expX, expY, expW, expH);
  ctx.fillStyle = '#9b59b6';
  const expRatio = Math.min(1, player.exp / player.nextExp);
  ctx.fillRect(expX, expY, expRatio * expW, expH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(expX, expY, expW, expH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Lv. ${player.level} (${player.exp} / ${player.nextExp})`, canvas.width / 2, expY - 4);

  // Kill Count (Top-Right)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Kills: ${killCount}`, canvas.width - 24, 62);

  // Elapsed Time (Top-Center)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(formatTime(elapsedTime), canvas.width / 2, 12);

  // Player HP Bar
  const barW = 200;
  const barH = 14;
  const barX = (canvas.width - barW) / 2;
  const barY = 40;
  ctx.fillStyle = '#333333';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(barX, barY, (player.hp / player.maxHp) * barW, barH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, barY, barW, barH);

  // Boss HP Bar (Top HUD)
  const activeBosses = enemies.filter(e => e.isBoss);
  if (activeBosses.length > 0) {
    const bossW = 260;
    const bossH = 12;
    const bossStartX = (canvas.width - bossW) / 2;
    activeBosses.forEach((b, idx) => {
      const bossY = 62 + idx * 28;
      ctx.fillStyle = '#222222';
      ctx.fillRect(bossStartX, bossY, bossW, bossH);
      ctx.fillStyle = '#ff4757';
      const bHpRatio = Math.max(0, b.hp / b.maxHp);
      ctx.fillRect(bossStartX, bossY, bHpRatio * bossW, bossH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(bossStartX, bossY, bossW, bossH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${b.emoji} BOSS Lv.${b.bossLevel} (${Math.ceil(b.hp)} / ${b.maxHp})`, canvas.width / 2, bossY - 2);
    });
  }

  // Character Selection Screen
  if (isSelectingCharacter) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('캐릭터 선택', canvas.width / 2, canvas.height / 2 - 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('생존을 시작할 영웅을 선택하세요', canvas.width / 2, canvas.height / 2 - 140);

    const charList = Object.values(characters);
    const cardW = 210;
    const cardH = 260;
    const gap = 24;
    const totalW = cardW * charList.length + gap * (charList.length - 1);
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - cardH) / 2;

    for (let i = 0; i < charList.length; i++) {
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      const c = charList[i];

      // Card BG
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Emoji
      ctx.font = '54px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(c.emoji, cx + cardW / 2, cy + 24);

      // Name
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(c.name, cx + cardW / 2, cy + 90);

      // Desc
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '13px sans-serif';
      const lines = c.desc.split('\n');
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], cx + cardW / 2, cy + 130 + li * 22);
      }

      // Button
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(cx + 20, cy + cardH - 52, cardW - 40, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('선택', cx + cardW / 2, cy + cardH - 35);
    }
  }

  // Level Up Modal Overlay
  if (isLevelUp) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL UP!', canvas.width / 2, canvas.height / 2 - 170);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('업그레이드를 선택하세요', canvas.width / 2, canvas.height / 2 - 130);

    const cardW = 200;
    const cardH = 220;
    const gap = 20;
    const totalW = cardW * upgradeChoices.length + gap * (upgradeChoices.length - 1);
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - cardH) / 2;

    for (let i = 0; i < upgradeChoices.length; i++) {
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      const item = upgradeChoices[i];

      // Card background
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Title
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(item.title, cx + cardW / 2, cy + 24);

      // Desc
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '13px sans-serif';
      ctx.fillText(item.desc, cx + cardW / 2, cy + 70);

      // Select button
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(cx + 20, cy + cardH - 46, cardW - 40, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('선택', cx + cardW / 2, cy + cardH - 31);
    }
  }

  // GAME OVER Overlay
  if (isGameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.84)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`생존 시간: ${formatTime(elapsedTime)}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`처치 수: ${killCount}`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillText(`도달 레벨: Lv. ${player.level}`, canvas.width / 2, canvas.height / 2 + 50);

    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`최고 기록: ${formatTime(bestRecord)}`, canvas.width / 2, canvas.height / 2 + 85);

    ctx.fillStyle = '#bdc3c7';
    ctx.font = '16px sans-serif';
    ctx.fillText("Press 'R' to Restart", canvas.width / 2, canvas.height / 2 + 130);
  }

  // PAUSED Overlay
  if (isPaused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#bdc3c7';
    ctx.font = '18px sans-serif';
    ctx.fillText('ESC를 눌러 계속', canvas.width / 2, canvas.height / 2 + 30);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

