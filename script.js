// ===== Hantavirus - Pantalla 1 =====

const priscilo    = document.getElementById('priscilo');
const background  = document.getElementById('background');
const startScreen = document.getElementById('start-screen');
const playButton  = document.getElementById('play-button');
const hud         = document.getElementById('hud');
const rat         = document.getElementById('rat');

// =============================
//  CONSTANTES AJUSTABLES
// =============================
const FLOOR_Y_RATIO = 0.78;

const PLAYER_WIDTH_VW  = 10;
const PLAYER_MIN_WIDTH = 160;
const PLAYER_MAX_WIDTH = 160;

const SPEED = 4;
const WORLD_SCROLL_SPEED = 4;
const FRAME_INTERVAL = 120;

const DEAD_ZONE_LEFT_RATIO  = 0.42;
const DEAD_ZONE_RIGHT_RATIO = 0.58;

// Rata
const RAT_WIDTH_VW       = 4;
const RAT_MIN_WIDTH      = 100;
const RAT_MAX_WIDTH      = 100;
const RAT_FLOOR_Y_RATIO  = 0.78;
const RAT_SPEED          = 3;
const RAT_FRAME_INTERVAL = 150;
const RAT_RESPAWN_MIN    = 200;   // offset mínimo a la derecha de la pantalla
const RAT_RESPAWN_RANGE  = 400;   // rango aleatorio extra

// Audio
const MUSIC_SRC        = 'elements/sounds/hantasound.mp3';
const MUSIC_VOLUME     = 0.4;
const CLICK_SOUND_SRC  = 'elements/sounds/playsound.mp3';
const CLICK_VOLUME     = 0.6;
const STEPS_SRC        = 'elements/sounds/steps.mp3';
const STEPS_VOLUME     = 0.5;

const MUSIC_START_DELAY = 1000;
const MUSIC_LOOP_END    = 28.0;
const MUSIC_LOOP_START  = 0.0;
// =============================

// --- Sprites ---
const SPRITE_IDLE   = 'elements/img/priscilom1.png';
const SPRITE_CROUCH = 'elements/img/priscilocrouch.png';
const SPRITE_WALK = [
  'elements/img/priscilom1.png',
  'elements/img/priscilom2.png',
  'elements/img/priscilom3.png',
  'elements/img/priscilom4.png'
];

const RAT_SPRITES = [
  'elements/img/rata1.png',
  'elements/img/rata2.png'
];

// Precarga
[...SPRITE_WALK, SPRITE_CROUCH, ...RAT_SPRITES].forEach(src => {
  const img = new Image();
  img.src = src;
});

// --- Estado del jugador ---
const state = {
  x: 0,
  y: 0,
  width: PLAYER_MIN_WIDTH,
  height: PLAYER_MIN_WIDTH,
  frame: 0,
  frameTimer: 0,
  currentSrc: SPRITE_IDLE,
  facing: 1
};

// --- Estado de la rata ---
const ratState = {
  x: 0,
  y: 0,
  width: RAT_MIN_WIDTH,
  height: RAT_MIN_WIDTH,
  frame: 0,
  frameTimer: 0,
  currentSrc: RAT_SPRITES[0]
};

let backgroundOffsetX = 0;
let gameStarted = false;

// --- Audio ---
const bgMusic = new Audio(MUSIC_SRC);
bgMusic.loop    = false;
bgMusic.volume  = MUSIC_VOLUME;
bgMusic.preload = 'auto';

bgMusic.addEventListener('timeupdate', () => {
  if (bgMusic.currentTime >= MUSIC_LOOP_END) {
    bgMusic.currentTime = MUSIC_LOOP_START;
  }
});
bgMusic.addEventListener('ended', () => {
  bgMusic.currentTime = MUSIC_LOOP_START;
  bgMusic.play().catch(() => {});
});

const clickSound = new Audio(CLICK_SOUND_SRC);
clickSound.volume  = CLICK_VOLUME;
clickSound.preload = 'auto';

const stepsAudio = new Audio(STEPS_SRC);
stepsAudio.loop    = true;
stepsAudio.volume  = STEPS_VOLUME;
stepsAudio.preload = 'auto';

function startSteps() {
  if (stepsAudio.paused) {
    stepsAudio.play().catch(err => {
      console.warn('No se pudo reproducir el sonido de pasos:', err);
    });
  }
}

function stopSteps() {
  if (!stepsAudio.paused) {
    stepsAudio.pause();
    stepsAudio.currentTime = 0;
  }
}

// --- Helpers Priscilo ---
function computePlayerWidth() {
  const raw = window.innerWidth * (PLAYER_WIDTH_VW / 100);
  return Math.max(PLAYER_MIN_WIDTH, Math.min(PLAYER_MAX_WIDTH, raw));
}

function getFloorY() {
  return window.innerHeight * FLOOR_Y_RATIO - state.height;
}

function measureSpriteHeight() {
  const h = priscilo.offsetHeight;
  if (h > 0) state.height = h;
}

function getDeadZoneLeft() {
  return window.innerWidth * DEAD_ZONE_LEFT_RATIO;
}
function getDeadZoneRight() {
  return window.innerWidth * DEAD_ZONE_RIGHT_RATIO - state.width;
}

function centerPriscilo() {
  state.x = (window.innerWidth - state.width) / 2;
}

function applyPlayerSize() {
  state.width = computePlayerWidth();
  priscilo.style.width = state.width + 'px';

  requestAnimationFrame(() => {
    measureSpriteHeight();
    state.y = getFloorY();
    const left  = getDeadZoneLeft();
    const right = getDeadZoneRight();
    if (state.x < left)  state.x = left;
    if (state.x > right) state.x = right;
  });
}

function initSize() {
  applyPlayerSize();
  if (!priscilo.complete || priscilo.naturalHeight === 0) {
    priscilo.addEventListener('load', () => {
      measureSpriteHeight();
      state.y = getFloorY();
      centerPriscilo();
    }, { once: true });
  } else {
    requestAnimationFrame(centerPriscilo);
  }
}

initSize();

// --- Helpers Rata ---
function computeRatWidth() {
  const raw = window.innerWidth * (RAT_WIDTH_VW / 100);
  return Math.max(RAT_MIN_WIDTH, Math.min(RAT_MAX_WIDTH, raw));
}

function getRatFloorY() {
  return window.innerHeight * RAT_FLOOR_Y_RATIO - ratState.height;
}

function measureRatHeight() {
  const h = rat.offsetHeight;
  if (h > 0) ratState.height = h;
}

function spawnRatRight() {
  ratState.x = window.innerWidth + RAT_RESPAWN_MIN + Math.random() * RAT_RESPAWN_RANGE;
}

function applyRatSize() {
  ratState.width = computeRatWidth();
  rat.style.width = ratState.width + 'px';

  requestAnimationFrame(() => {
    measureRatHeight();
    ratState.y = getRatFloorY();
  });
}

function initRat() {
  applyRatSize();
  spawnRatRight();
  if (!rat.complete || rat.naturalHeight === 0) {
    rat.addEventListener('load', () => {
      measureRatHeight();
      ratState.y = getRatFloorY();
    }, { once: true });
  }
}

initRat();

// --- Teclas ---
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowDown: false
};

window.addEventListener('keydown', (e) => {
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  applyPlayerSize();
  applyRatSize();
});

// --- Botón Play ---
playButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameStarted = true;

  clickSound.currentTime = 0;
  clickSound.play().catch(err => {
    console.warn('No se pudo reproducir el sonido de click:', err);
  });

  setTimeout(() => {
    bgMusic.currentTime = MUSIC_LOOP_START;
    bgMusic.play().catch(err => {
      console.warn('No se pudo iniciar la música:', err);
    });
  }, MUSIC_START_DELAY);
});

// --- Cambio de sprite Priscilo ---
function setSprite(src) {
  if (state.currentSrc !== src) {
    priscilo.src = src;
    state.currentSrc = src;
    requestAnimationFrame(() => {
      measureSpriteHeight();
      state.y = getFloorY();
    });
  }
}

// --- Cambio de sprite Rata ---
function setRatSprite(src) {
  if (ratState.currentSrc !== src) {
    rat.src = src;
    ratState.currentSrc = src;
    requestAnimationFrame(() => {
      measureRatHeight();
      ratState.y = getRatFloorY();
    });
  }
}

// --- Bucle principal ---
let lastTime = performance.now();

function loop(now) {
  const delta = now - lastTime;
  lastTime = now;

  // ===== JUGADOR =====
  const crouching = gameStarted && keys.ArrowDown;

  let dx = 0;
  if (gameStarted && !crouching) {
    if (keys.ArrowLeft)  dx -= SPEED;
    if (keys.ArrowRight) dx += SPEED;
  }

  const moving = dx !== 0;

  if (dx < 0) state.facing = -1;
  else if (dx > 0) state.facing = 1;

  const deadLeft  = getDeadZoneLeft();
  const deadRight = getDeadZoneRight();

  let nextX = state.x + dx;
  let scroll = 0;

  if (nextX < deadLeft) {
    scroll = nextX - deadLeft;
    nextX = deadLeft;
  } else if (nextX > deadRight) {
    scroll = nextX - deadRight;
    nextX = deadRight;
  }

  state.x = nextX;

  if (scroll !== 0 && SPEED !== 0) {
    backgroundOffsetX -= scroll * (WORLD_SCROLL_SPEED / SPEED);
  }

  priscilo.style.left = state.x + 'px';
  priscilo.style.top  = state.y + 'px';
  priscilo.style.transform = `scaleX(${state.facing})`;
  background.style.backgroundPositionX = backgroundOffsetX + 'px';

  // Sprite + sonido de pasos
  if (crouching) {
    state.frameTimer = 0;
    state.frame = 0;
    setSprite(SPRITE_CROUCH);
    stopSteps();
  } else if (moving) {
    state.frameTimer += delta;
    if (state.frameTimer >= FRAME_INTERVAL) {
      state.frameTimer = 0;
      state.frame = (state.frame + 1) % SPRITE_WALK.length;
      setSprite(SPRITE_WALK[state.frame]);
    }
    startSteps();
  } else {
    state.frameTimer = 0;
    state.frame = 0;
    setSprite(SPRITE_IDLE);
    stopSteps();
  }

  // ===== RATA =====
  if (gameStarted) {
    ratState.x -= RAT_SPEED;

    // Si ha salido por la izquierda, vuelve a aparecer por la derecha
    if (ratState.x < -ratState.width) {
      spawnRatRight();
    }

    // Animación de la rata
    ratState.frameTimer += delta;
    if (ratState.frameTimer >= RAT_FRAME_INTERVAL) {
      ratState.frameTimer = 0;
      ratState.frame = (ratState.frame + 1) % RAT_SPRITES.length;
      setRatSprite(RAT_SPRITES[ratState.frame]);
    }
  }

  rat.style.left = ratState.x + 'px';
  rat.style.top  = ratState.y + 'px';

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);