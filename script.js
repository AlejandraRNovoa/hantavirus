// ===== Hantavirus - Pantalla 1 =====

const priscilo    = document.getElementById('priscilo');
const startScreen = document.getElementById('start-screen');
const playButton  = document.getElementById('play-button');
const hud         = document.getElementById('hud');

// =============================
//  CONSTANTES AJUSTABLES
// =============================
const FLOOR_Y_RATIO = 0.68;

const PLAYER_WIDTH_VW  = 8;
const PLAYER_MIN_WIDTH = 72;
const PLAYER_MAX_WIDTH = 150;

const SPEED = 4;
const FRAME_INTERVAL = 120;

// Audio
const MUSIC_SRC        = 'elements/sounds/hantasound.mp3';
const MUSIC_VOLUME     = 0.4;
const CLICK_SOUND_SRC  = 'elements/sounds/playsound.mp3';
const CLICK_VOLUME     = 0.6;

// Retardo entre el click de Play y el inicio de la música (ms).
const MUSIC_START_DELAY = 1000;

// Loop manual: reiniciar la música al llegar a este segundo,
// y volver a este otro segundo, para evitar la cola silenciosa del MP3.
const MUSIC_LOOP_END   = 28.0;   // segundos
const MUSIC_LOOP_START = 0.0;    // segundos
// =============================

// --- Sprites ---
const SPRITE_IDLE = 'elements/img/priscilom1.png';
const SPRITE_WALK = [
  'elements/img/priscilom1.png',
  'elements/img/priscilom2.png',
  'elements/img/priscilom3.png',
  'elements/img/priscilom4.png'
];

// Precarga
SPRITE_WALK.forEach(src => {
  const img = new Image();
  img.src = src;
});

// --- Estado ---
const state = {
  x: 100,
  y: 0,
  width: PLAYER_MIN_WIDTH,
  height: PLAYER_MIN_WIDTH,
  frame: 0,
  frameTimer: 0,
  currentSrc: SPRITE_IDLE,
  facing: 1
};

let gameStarted = false;

// --- Audio (no se reproduce hasta pulsar Play) ---
const bgMusic = new Audio(MUSIC_SRC);
bgMusic.loop    = false;          // loop manual, no nativo
bgMusic.volume  = MUSIC_VOLUME;
bgMusic.preload = 'auto';

// Loop manual: al llegar a MUSIC_LOOP_END, saltar a MUSIC_LOOP_START
bgMusic.addEventListener('timeupdate', () => {
  if (bgMusic.currentTime >= MUSIC_LOOP_END) {
    bgMusic.currentTime = MUSIC_LOOP_START;
  }
});

// Plan B: si el archivo es más corto de MUSIC_LOOP_END y termina antes,
// rearrancamos manualmente desde el inicio.
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

function clampX() {
  const maxX = window.innerWidth - state.width;
  if (state.x < 0) state.x = 0;
  if (state.x > maxX) state.x = maxX;
}

function applyPlayerSize() {
  state.width = computePlayerWidth();
  priscilo.style.width = state.width + 'px';

  requestAnimationFrame(() => {
    measureSpriteHeight();
    state.y = getFloorY();
    clampX();
  });
}

// --- Inicialización del tamaño al cargar ---
function initSize() {
  applyPlayerSize();
  if (!priscilo.complete || priscilo.naturalHeight === 0) {
    priscilo.addEventListener('load', () => {
      measureSpriteHeight();
      state.y = getFloorY();
    }, { once: true });
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

// --- Botón Play: arranca juego, sonido de click y música (con retardo) ---
playButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameStarted = true;

  // Sonido de click inmediato
  clickSound.currentTime = 0;
  clickSound.play().catch(err => {
    console.warn('No se pudo reproducir el sonido de click:', err);
  });

  // Música de fondo con retardo de ~1s
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

  let dx = 0;
  if (gameStarted) {
    if (keys.ArrowLeft)  dx -= SPEED;
    if (keys.ArrowRight) dx += SPEED;
  }

  const moving = dx !== 0;

  if (dx < 0) state.facing = -1;
  else if (dx > 0) state.facing = 1;

  state.x += dx;
  clampX();

  priscilo.style.left = state.x + 'px';
  priscilo.style.top  = state.y + 'px';
  priscilo.style.transform = `scaleX(${state.facing})`;

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