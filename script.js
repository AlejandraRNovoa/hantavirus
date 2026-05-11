// ===== Hantavirus - Pantalla 1 =====

const priscilo    = document.getElementById('priscilo');
const background  = document.getElementById('background');
const startScreen = document.getElementById('start-screen');
const playButton  = document.getElementById('play-button');
const hud         = document.getElementById('hud');

// =============================
//  CONSTANTES AJUSTABLES
// =============================
const FLOOR_Y_RATIO = 0.78;

const PLAYER_WIDTH_VW  = 10;
const PLAYER_MIN_WIDTH = 160;
const PLAYER_MAX_WIDTH = 290;

const SPEED = 4;              // velocidad de Priscilo dentro de la dead zone
const WORLD_SCROLL_SPEED = 4; // velocidad de scroll del fondo cuando Priscilo
                              // empuja contra el borde de la dead zone

const FRAME_INTERVAL = 120;

// Dead zone: franja central donde Priscilo se mueve antes de que el mundo
// empiece a desplazarse. Valores como proporción del ancho del viewport.
const DEAD_ZONE_LEFT_RATIO  = 0.42;
const DEAD_ZONE_RIGHT_RATIO = 0.58;

// Audio
const MUSIC_SRC        = 'elements/sounds/hantasound.mp3';
const MUSIC_VOLUME     = 0.4;
const CLICK_SOUND_SRC  = 'elements/sounds/playsound.mp3';
const CLICK_VOLUME     = 0.6;

const MUSIC_START_DELAY = 1000;
const MUSIC_LOOP_END    = 28.0;
const MUSIC_LOOP_START  = 0.0;
// =============================

// --- Sprites ---
const SPRITE_IDLE = 'elements/img/priscilom1.png';
const SPRITE_WALK = [
  'elements/img/priscilom1.png',
  'elements/img/priscilom2.png',
  'elements/img/priscilom3.png',
  'elements/img/priscilom4.png'
];

SPRITE_WALK.forEach(src => {
  const img = new Image();
  img.src = src;
});

// --- Estado ---
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

// Offset acumulado del fondo. Negativo = el mundo se desplaza a la izquierda
// (Priscilo avanza hacia la derecha del pasillo).
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

// --- Helpers ---
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

// --- Teclas ---
const keys = {
  ArrowLeft: false,
  ArrowRight: false
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

// --- Cambio de sprite ---
function setSprite(src) {
  if (state.currentSrc !== src) {
    priscilo.src = src;
    state.currentSrc = src;
    requestAnimationFrame(measureSpriteHeight);
  }
}

// --- Bucle principal ---
let lastTime = performance.now();

function loop(now) {
  const delta = now - lastTime;
  lastTime = now;

  // Input
  let dx = 0;
  if (gameStarted) {
    if (keys.ArrowLeft)  dx -= SPEED;
    if (keys.ArrowRight) dx += SPEED;
  }

  const moving = dx !== 0;

  // Flip
  if (dx < 0) state.facing = -1;
  else if (dx > 0) state.facing = 1;

  // Movimiento con dead zone
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

  // Aplicar
  priscilo.style.left = state.x + 'px';
  priscilo.style.top  = state.y + 'px';
  priscilo.style.transform = `scaleX(${state.facing})`;
  background.style.backgroundPositionX = backgroundOffsetX + 'px';

  // Animación
  if (moving) {
    state.frameTimer += delta;
    if (state.frameTimer >= FRAME_INTERVAL) {
      state.frameTimer = 0;
      state.frame = (state.frame + 1) % SPRITE_WALK.length;
      setSprite(SPRITE_WALK[state.frame]);
    }
  } else {
    state.frameTimer = 0;
    state.frame = 0;
    setSprite(SPRITE_IDLE);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);