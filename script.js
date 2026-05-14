// ===== Hantavirus - Pantalla 1 =====

const game        = document.getElementById('game');
const priscilo    = document.getElementById('priscilo');
const background  = document.getElementById('background');
const startScreen = document.getElementById('start-screen');
const playButton  = document.getElementById('play-button');
const hud         = document.getElementById('hud');
const rat         = document.getElementById('rat');
const gameOverEl  = document.getElementById('game-over');
const pauseEl     = document.getElementById('pause-screen');
const doorArrow   = document.getElementById('door-arrow');
const sanitizerEl = document.getElementById('sanitizer-item');
const fadeEl      = document.getElementById('fade-screen');
const lifeIcons   = document.querySelectorAll('#hud .life');
const mobileCtrls = document.getElementById('mobile-controls');
const pauseButton = document.getElementById('pause-button');
const orientationWarning = document.getElementById('orientation-warning');

// =============================
//  CONSTANTES AJUSTABLES
// =============================
const FLOOR_Y_RATIO = 0.78;

const PLAYER_WIDTH_RATIO = 0.10;
const PLAYER_MIN_WIDTH   = 110;
const PLAYER_MAX_WIDTH   = 220;
const PLAYER_MOBILE_SCALE = 0.88;   // Reducción ~12% sólo en móvil/touch

const SPEED = 4;
const WORLD_SCROLL_SPEED = 4;
const FRAME_INTERVAL = 120;

const DEAD_ZONE_LEFT_RATIO  = 0.42;
const DEAD_ZONE_RIGHT_RATIO = 0.58;

// Salto
const JUMP_FORCE = -20;
const GRAVITY    = 0.60;
const JUMP_SPRITE_THRESHOLD = -3;

// Rata
const RAT_WIDTH_RATIO    = 0.06;
const RAT_MIN_WIDTH      = 70;
const RAT_MAX_WIDTH      = 130;
const RAT_FLOOR_Y_RATIO  = 0.78;
const RAT_FRAME_INTERVAL = 150;
const RAT_RESPAWN_MIN    = 200;
const RAT_RESPAWN_RANGE  = 400;

const RAT_MIN_SPEED = 2.5;
const RAT_MAX_SPEED = 5;

const RAT_MIN_SCALE = 0.9;
const RAT_MAX_SCALE = 1.2;

// Vidas / daño
const START_LIVES        = 3;
const MAX_LIVES          = 3;
const INVULN_DURATION_MS = 1000;

// Puerta (hallway → bathroom)
// AJUSTABLES: estos dos son los que tocar si la flecha no apunta a la puerta correcta.
const DOOR_APPEAR_TIME = 3000;        // DEBUG: baja para probar rápido
const DOOR_WORLD_X     = 3000;
const DOOR_Y_RATIO     = 0.18;
const DOOR_ZONE_WIDTH_RATIO = 0.10;

const DOOR_ARROW_OFFSET_X_VH = 0.88;
const DOOR_ARROW_OFFSET_Y_VH = -0.04;

// Debug
const DEBUG_DOOR        = true;
const DEBUG_INTERVAL_MS = 500;

// Posición de entrada en el baño
const BATHROOM_START_X_RATIO = 0.25;

// Gel hidroalcohólico (en el baño)
const SANITIZER_X_RATIO = 0.46;
const SANITIZER_Y_RATIO = 0.49;
const SANITIZER_ZONE_RATIO = 0.08;

// Transición fade entre escenas (ms)
const FADE_DURATION_MS = 400;

// Audio
const MUSIC_SRC        = 'elements/sounds/hantasound.mp3';
const MUSIC_VOLUME     = 0.4;
const MUSIC_PAUSE_VOL  = 0.15;
const CLICK_SOUND_SRC  = 'elements/sounds/playsound.mp3';
const CLICK_VOLUME     = 0.6;
const STEPS_SRC        = 'elements/sounds/steps.mp3';
const STEPS_VOLUME     = 0.5;
const OUCH_SRC         = 'elements/sounds/ouch.mp3';
const OUCH_VOLUME      = 0.7;
const SANITIZER_SRC    = 'elements/sounds/sanitizer.mp3';
const SANITIZER_VOLUME = 0.7;

const MUSIC_START_DELAY = 1000;
const MUSIC_LOOP_END    = 28.0;
const MUSIC_LOOP_START  = 0.0;
// =============================

// --- Helpers de tamaño del área de juego ---
function getGameWidth()  { return game.clientWidth; }
function getGameHeight() { return game.clientHeight; }

// --- Sprites ---
const SPRITE_IDLE      = 'elements/img/priscilom1.png';
const SPRITE_CROUCH    = 'elements/img/priscilocrouch.png';
const SPRITE_JUMP_UP   = 'elements/img/priscilojump1.png';
const SPRITE_JUMP_DOWN = 'elements/img/priscilojump2.png';
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

[...SPRITE_WALK, SPRITE_CROUCH, SPRITE_JUMP_UP, SPRITE_JUMP_DOWN, ...RAT_SPRITES,
 'elements/img/flechadown.png', 'elements/img/bathroom1.png',
 'elements/img/sanitizer.png'].forEach(src => {
  const img = new Image();
  img.src = src;
});

// --- Estado ---
const state = {
  x: 0, y: 0, groundY: 0,
  width: PLAYER_MIN_WIDTH, height: PLAYER_MIN_WIDTH,
  frame: 0, frameTimer: 0,
  currentSrc: SPRITE_IDLE,
  facing: 1,
  isJumping: false, velocityY: 0
};

const ratState = {
  x: 0, y: 0,
  width: RAT_MIN_WIDTH, height: RAT_MIN_WIDTH,
  frame: 0, frameTimer: 0,
  currentSrc: RAT_SPRITES[0],
  speed: RAT_MIN_SPEED, scale: 1
};

let backgroundOffsetX = 0;
let gameStarted  = false;
let gameOver     = false;
let isPaused     = false;
let isTransitioning = false;

let currentScene = 'hallway';

let lives = START_LIVES;
let invulnerableUntil = 0;

let jumpKeyReleased = true;

let gameTime    = 0;
let doorUnlocked = false;

let sanitizerUsed = false;

let debugAccum = 0;

// Tiempo del último frame del bucle principal.
// Se declara aquí (antes de que applyOrientationState lo use al cargar).
let lastTime = performance.now();

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
  if (gameOver) return;
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

const ouchAudio = new Audio(OUCH_SRC);
ouchAudio.volume  = OUCH_VOLUME;
ouchAudio.preload = 'auto';

const sanitizerAudio = new Audio(SANITIZER_SRC);
sanitizerAudio.volume  = SANITIZER_VOLUME;
sanitizerAudio.preload = 'auto';

// --- Helpers Priscilo ---
// Detección de móvil/touch coherente con el CSS (#mobile-controls usa la misma media query).
const isMobileQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
function isMobileDevice() { return isMobileQuery.matches; }

function computePlayerWidth() {
  const raw = getGameWidth() * PLAYER_WIDTH_RATIO;
  const clamped = Math.max(PLAYER_MIN_WIDTH, Math.min(PLAYER_MAX_WIDTH, raw));
  // En móvil reducimos ligeramente el sprite para que el escenario respire.
  // state.height se mide del DOM tras aplicar el width, así que se ajusta solo.
  return isMobileDevice() ? clamped * PLAYER_MOBILE_SCALE : clamped;
}

function getFloorY() {
  return getGameHeight() * FLOOR_Y_RATIO - state.height;
}

function measureSpriteHeight() {
  const h = priscilo.offsetHeight;
  if (h > 0) state.height = h;
}

function getDeadZoneLeft()  { return getGameWidth() * DEAD_ZONE_LEFT_RATIO; }
function getDeadZoneRight() { return getGameWidth() * DEAD_ZONE_RIGHT_RATIO - state.width; }

function centerPriscilo() { state.x = (getGameWidth() - state.width) / 2; }

function applyPlayerSize() {
  state.width = computePlayerWidth();
  priscilo.style.width = state.width + 'px';

  requestAnimationFrame(() => {
    measureSpriteHeight();
    state.groundY = getFloorY();
    if (!state.isJumping) state.y = state.groundY;
    if (currentScene === 'hallway') {
      const left  = getDeadZoneLeft();
      const right = getDeadZoneRight();
      if (state.x < left)  state.x = left;
      if (state.x > right) state.x = right;
    } else if (currentScene === 'bathroom') {
      const maxX = getGameWidth() - state.width;
      if (state.x < 0)    state.x = 0;
      if (state.x > maxX) state.x = maxX;
    }
  });
}

function initSize() {
  applyPlayerSize();
  if (!priscilo.complete || priscilo.naturalHeight === 0) {
    priscilo.addEventListener('load', () => {
      measureSpriteHeight();
      state.groundY = getFloorY();
      state.y = state.groundY;
      centerPriscilo();
    }, { once: true });
  } else {
    requestAnimationFrame(centerPriscilo);
  }
}

initSize();

// --- Helpers Rata ---
function computeRatWidth() {
  const raw = getGameWidth() * RAT_WIDTH_RATIO;
  return Math.max(RAT_MIN_WIDTH, Math.min(RAT_MAX_WIDTH, raw));
}

function getRatFloorY() {
  return getGameHeight() * RAT_FLOOR_Y_RATIO - ratState.height;
}

function measureRatHeight() {
  const h = rat.offsetHeight;
  if (h > 0) ratState.height = h;
}

function applyRatSize() {
  const baseWidth = computeRatWidth();
  ratState.width  = baseWidth * ratState.scale;
  rat.style.width = ratState.width + 'px';

  requestAnimationFrame(() => {
    measureRatHeight();
    ratState.y = getRatFloorY();
  });
}

function spawnRatRight() {
  ratState.x = getGameWidth() + RAT_RESPAWN_MIN + Math.random() * RAT_RESPAWN_RANGE;
  ratState.speed = RAT_MIN_SPEED + Math.random() * (RAT_MAX_SPEED - RAT_MIN_SPEED);
  ratState.scale = RAT_MIN_SCALE + Math.random() * (RAT_MAX_SCALE - RAT_MIN_SCALE);
  applyRatSize();
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

// --- Puerta ---
function getDoorScreenX() { return DOOR_WORLD_X + backgroundOffsetX; }

function getDoorVisualX() {
  return getDoorScreenX() + getGameHeight() * DOOR_ARROW_OFFSET_X_VH;
}

function isDoorOnScreen() {
  const arrowW = doorArrow ? (doorArrow.offsetWidth || 64) : 64;
  const x = getDoorVisualX();
  return (x + arrowW / 2) >= 0 && (x - arrowW / 2) <= getGameWidth();
}

function updateDoorArrow() {
  if (!doorArrow) return;

  if (currentScene !== 'hallway' || !doorUnlocked || !isDoorOnScreen()) {
    doorArrow.classList.add('hidden');
    return;
  }

  doorArrow.classList.remove('hidden');

  const x = getDoorVisualX();
  const arrowW = doorArrow.offsetWidth || 64;
  const baseY  = getGameHeight() * DOOR_Y_RATIO;
  doorArrow.style.left = (x - arrowW / 2) + 'px';
  doorArrow.style.top  = (baseY + getGameHeight() * DOOR_ARROW_OFFSET_Y_VH) + 'px';
}

function isPriscilonNearDoor() {
  if (currentScene !== 'hallway' || !doorUnlocked) return false;
  const priscilonCenter = state.x + state.width / 2;
  const doorX = getDoorVisualX();
  const zone  = getGameWidth() * DOOR_ZONE_WIDTH_RATIO;
  return Math.abs(priscilonCenter - doorX) <= zone / 2;
}

// --- Gel ---
function getSanitizerX() { return getGameWidth() * SANITIZER_X_RATIO; }
function getSanitizerY() { return getGameHeight() * SANITIZER_Y_RATIO; }

function updateSanitizer() {
  if (!sanitizerEl) return;
  if (currentScene !== 'bathroom' || sanitizerUsed) {
    sanitizerEl.classList.add('hidden');
    return;
  }
  sanitizerEl.classList.remove('hidden');
  const w = sanitizerEl.offsetWidth || 60;
  const h = sanitizerEl.offsetHeight || 60;
  sanitizerEl.style.left = (getSanitizerX() - w / 2) + 'px';
  sanitizerEl.style.top  = (getSanitizerY() - h / 2) + 'px';
}

function isPriscilonNearSanitizer() {
  if (currentScene !== 'bathroom' || sanitizerUsed) return false;
  const priscilonCenter = state.x + state.width / 2;
  const dx = priscilonCenter - getSanitizerX();
  const zone = getGameWidth() * SANITIZER_ZONE_RATIO;
  return Math.abs(dx) <= zone / 2;
}

function useSanitizer() {
  if (sanitizerUsed) return;
  if (currentScene !== 'bathroom') return;
  if (lives >= MAX_LIVES) return;
  if (!isPriscilonNearSanitizer()) return;

  // Disparar el sonido ANTES de tocar el DOM para que se sienta instantáneo
  // y sincronizado con el contacto visual. updateHud() y classList.add() son
  // baratos pero pueden costar varios ms en móvil; al adelantar play() se
  // elimina el desfase percibido sin añadir ningún delay artificial.
  sanitizerAudio.currentTime = 0;
  sanitizerAudio.play().catch(err => {
    console.warn('No se pudo reproducir el sonido del gel:', err);
  });

  sanitizerUsed = true;
  lives += 1;
  updateHud();
  sanitizerEl.classList.add('hidden');
}

// --- Transición entre escenas ---
function transitionToScene(sceneName) {
  if (isTransitioning) return;
  if (sceneName !== 'hallway' && sceneName !== 'bathroom') return;
  if (sceneName === currentScene) return;

  isTransitioning = true;

  for (const k in keys) keys[k] = false;
  stopSteps();

  if (fadeEl) fadeEl.classList.add('fade-active');

  setTimeout(() => {
    applySceneChange(sceneName);
    if (fadeEl) fadeEl.classList.remove('fade-active');
    setTimeout(() => {
      isTransitioning = false;
      lastTime = performance.now();
    }, FADE_DURATION_MS);
  }, FADE_DURATION_MS);
}

function applySceneChange(sceneName) {
  if (sceneName === 'bathroom') {
    currentScene = 'bathroom';
    background.classList.remove('scene-hallway');
    background.classList.add('scene-bathroom');
    rat.classList.add('hidden');
    doorArrow.classList.add('hidden');
    state.x = getGameWidth() * BATHROOM_START_X_RATIO;
    state.isJumping = false;
    state.velocityY = 0;
    state.y = state.groundY;
    updateSanitizer();
  } else if (sceneName === 'hallway') {
    currentScene = 'hallway';
    background.classList.remove('scene-bathroom');
    background.classList.add('scene-hallway');
    rat.classList.remove('hidden');
    sanitizerEl.classList.add('hidden');
    state.x = (getGameWidth() - state.width) / 2;
    state.isJumping = false;
    state.velocityY = 0;
    state.y = state.groundY;
    updateDoorArrow();
  }
}

// --- HUD ---
function updateHud() {
  lifeIcons.forEach((icon, idx) => {
    icon.style.display = (idx < lives) ? '' : 'none';
  });
}

// --- Colisión AABB ---
function checkCollision() {
  const a = priscilo.getBoundingClientRect();
  const b = rat.getBoundingClientRect();
  return !(a.right  < b.left  ||
           a.left   > b.right ||
           a.bottom < b.top   ||
           a.top    > b.bottom);
}

// --- Daño / Game Over ---
function takeDamage(now) {
  lives -= 1;
  updateHud();
  invulnerableUntil = now + INVULN_DURATION_MS;
  priscilo.classList.add('invulnerable');

  ouchAudio.currentTime = 0;
  ouchAudio.play().catch(err => {
    console.warn('No se pudo reproducir el sonido de daño:', err);
  });

  spawnRatRight();

  if (lives <= 0) triggerGameOver();
}

function triggerGameOver() {
  gameOver = true;
  stopSteps();
  bgMusic.pause();
  priscilo.classList.remove('invulnerable');
  if (gameOverEl) gameOverEl.classList.remove('hidden');
}

// --- Pausa ---
function togglePause() {
  if (!gameStarted || gameOver || isTransitioning) return;
  isPaused = !isPaused;
  if (isPaused) {
    stopSteps();
    bgMusic.volume = MUSIC_PAUSE_VOL;
    if (pauseEl) pauseEl.classList.remove('hidden');
  } else {
    bgMusic.volume = MUSIC_VOLUME;
    if (pauseEl) pauseEl.classList.add('hidden');
    lastTime = performance.now();
  }
}

// --- Teclas ---
// Teclas registradas.
//  - a/A          : saltar (sustituye al espacio como salto principal)
//  - s/S          : recoger / interactuar (alias de e/E)
//  - c/C, ' '     : disparar (input preparado, sin lógica todavía)
//  - ArrowLeft/Right/Up/Down: movimiento, interacción contextual con puerta y agacharse
//  - e/E          : recoger (legacy, se mantiene)
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowDown: false,
  ArrowUp: false,
  ' ': false,
  a: false, A: false,
  s: false, S: false,
  c: false, C: false,
  e: false, E: false
};

// Helpers semánticos: cualquier variante de una "acción" cuenta.
function isJumpPressed()        { return keys.a || keys.A; }
function isInteractPressed()    { return keys.s || keys.S || keys.e || keys.E; }
// function isFirePressed()      { return keys.c || keys.C || keys[' ']; } // TODO: usar cuando exista disparo

// Acción contextual: prioriza interactuar con puerta/gel; si no, no hace nada.
function doContextAction() {
  if (gameOver || isPaused || isTransitioning || !gameStarted) return;
  if (currentScene === 'hallway' && isPriscilonNearDoor()) {
    transitionToScene('bathroom');
    return;
  }
  if (currentScene === 'bathroom' && isPriscilonNearSanitizer()) {
    useSanitizer();
    return;
  }
}

window.addEventListener('keydown', (e) => {
  // Enter: start en pantalla inicial, pausa si ya empezó.
  if (e.key === 'Enter') {
    if (!gameStarted) {
      startGame();
    } else {
      togglePause();
    }
    e.preventDefault();
    return;
  }

  // Escape: pausa/continuar (no arranca el juego para no chocar con "salir" del navegador).
  if (e.key === 'Escape') {
    if (gameStarted) togglePause();
    e.preventDefault();
    return;
  }

  if (isTransitioning) {
    if (e.key in keys) e.preventDefault();
    return;
  }

  if (e.key in keys) {
    // Flecha arriba: interacción con la puerta en hallway.
    if (e.key === 'ArrowUp' && !keys.ArrowUp) {
      if (gameStarted && !gameOver && !isPaused && currentScene === 'hallway') {
        if (isPriscilonNearDoor()) {
          transitionToScene('bathroom');
        }
      }
    }
    // S / E: interacción contextual (recoger sanitizer, o puerta si aplica).
    // Comparación en lowercase: S y E son alias reales y simétricos, independientes de Caps/Shift.
    {
      const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      if ((k === 's' || k === 'e') && !isInteractPressed()) {
        if (gameStarted && !gameOver && !isPaused) {
          doContextAction();
        }
      }
    }
    keys[e.key] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    // Cuando se suelta cualquier tecla de salto, rearmar el flag.
    if (e.key === 'a' || e.key === 'A') jumpKeyReleased = true;
    e.preventDefault();
  }
});

// --- Controles móviles ---
// Enchufa los botones al MISMO objeto `keys`. No duplica lógica de juego.
if (mobileCtrls) {
  const buttons = mobileCtrls.querySelectorAll('.mc-btn');

  buttons.forEach(btn => {
    const keyName = btn.getAttribute('data-key');     // 'ArrowLeft', 'a', 's', 'c', ...
    const action  = btn.getAttribute('data-action');  // 'action' (legacy)

    const press = (ev) => {
      ev.preventDefault();
      btn.classList.add('pressed');
      if (isTransitioning) return;

      // Legacy: botón "action" contextual + agacharse mientras se mantiene.
      if (action === 'action') {
        doContextAction();
        if (gameStarted && !gameOver && !isPaused) {
          keys.ArrowDown = true;
        }
        return;
      }

      if (!keyName) return;

      // Disparos one-shot al pulsar (replican lo que hace keydown).
      if (keyName === 'ArrowUp' && !keys.ArrowUp) {
        if (gameStarted && !gameOver && !isPaused && currentScene === 'hallway') {
          if (isPriscilonNearDoor()) {
            transitionToScene('bathroom');
          }
        }
      }
      // S / E: misma lógica que en desktop, comparación en lowercase para ser simétrica.
      {
        const k = typeof keyName === 'string' ? keyName.toLowerCase() : '';
        if ((k === 's' || k === 'e') && !isInteractPressed()) {
          if (gameStarted && !gameOver && !isPaused) {
            doContextAction();
          }
        }
      }

      keys[keyName] = true;
    };

    const release = (ev) => {
      ev.preventDefault();
      btn.classList.remove('pressed');

      if (action === 'action') {
        keys.ArrowDown = false;
        return;
      }

      if (!keyName) return;
      keys[keyName] = false;
      // Rearmar el flag de salto al soltar A.
      if (keyName === 'a' || keyName === 'A') jumpKeyReleased = true;
    };

    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('click', (e) => e.preventDefault());
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

// --- Botón de pausa flotante ---
if (pauseButton) {
  const onPauseClick = (ev) => {
    ev.preventDefault();
    if (!gameStarted) {
      startGame();
    } else {
      togglePause();
    }
  };
  pauseButton.addEventListener('click', onPauseClick);
  pauseButton.addEventListener('contextmenu', (e) => e.preventDefault());
}

// --- Bloqueo por orientación (sólo móvil portrait) ---
let orientationBlocked = false;
const orientationQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

function applyOrientationState() {
  const portrait = orientationQuery.matches;
  orientationBlocked = portrait;
  if (orientationWarning) {
    orientationWarning.classList.toggle('hidden', !portrait);
  }
  if (portrait) {
    // Al entrar en portrait: limpiar inputs y parar pasos para que nada quede "atascado".
    for (const k in keys) keys[k] = false;
    jumpKeyReleased = true;
    stopSteps();
  } else {
    // Al volver a landscape evitamos un delta gigante en el loop.
    lastTime = performance.now();
  }
}

// Listener compatible: addEventListener moderno + fallback legacy.
if (orientationQuery.addEventListener) {
  orientationQuery.addEventListener('change', applyOrientationState);
} else if (orientationQuery.addListener) {
  orientationQuery.addListener(applyOrientationState);
}
applyOrientationState();

// --- Resize ---
window.addEventListener('resize', () => {
  applyPlayerSize();
  applyRatSize();
  updateDoorArrow();
  updateSanitizer();
});

// --- Botón Play ---
function startGame() {
  if (gameStarted) return;
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameStarted = true;
  updateHud();

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
}

playButton.addEventListener('click', startGame);

// --- Cambio de sprite ---
function setSprite(src) {
  if (state.currentSrc !== src) {
    priscilo.src = src;
    state.currentSrc = src;
    requestAnimationFrame(() => {
      measureSpriteHeight();
      // Si NO está saltando: recalcular suelo y reapoyar.
      // Si SÍ está saltando: NO tocar groundY; cambiar groundY a mitad de salto
      // con la altura del sprite nuevo invalida la coordenada Y en curso y puede
      // cancelar el salto inmediatamente (bug observado tras cambios responsive).
      // groundY se recalculará al aterrizar y en cada resize/applyPlayerSize.
      if (!state.isJumping) {
        state.groundY = getFloorY();
        state.y = state.groundY;
      }
    });
  }
}

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
// Gate de 60 FPS: en móviles a 90/120 Hz, rAF dispara más rápido que en desktop a 60 Hz.
// Como el movimiento es per-frame (no escalado por delta), eso aceleraría el juego.
// Usamos un umbral por debajo del frame de 60 Hz (16.67 ms) con margen suficiente
// para absorber el jitter natural del rAF en desktop. Si el delta es claramente menor
// (móviles a 120 Hz dan ~8 ms; a 90 Hz, ~11 ms), saltamos el frame.
// No se modifica ninguna constante de velocidad.
const FRAME_GATE_MIN_MS = 14;

function loop(now) {
  if (isPaused || isTransitioning || orientationBlocked) {
    requestAnimationFrame(loop);
    return;
  }

  // Gate de 60 FPS: si no ha pasado suficiente tiempo desde el último frame procesado,
  // saltar este frame sin actualizar lastTime ni mover nada.
  // Umbral 14 ms: pasa siempre en 60 Hz (delta ~16-17 ms), bloquea en 90/120 Hz.
  if ((now - lastTime) < FRAME_GATE_MIN_MS) {
    requestAnimationFrame(loop);
    return;
  }

  const delta = now - lastTime;
  lastTime = now;

  if (gameStarted && !gameOver && currentScene === 'hallway') {
    gameTime += delta;
    if (!doorUnlocked && gameTime >= DOOR_APPEAR_TIME) {
      doorUnlocked = true;
      if (DEBUG_DOOR) console.log('[DOOR] desbloqueada a los', gameTime.toFixed(0), 'ms');
    }
  }

  if (DEBUG_DOOR && gameStarted) {
    debugAccum += delta;
    if (debugAccum >= DEBUG_INTERVAL_MS) {
      debugAccum = 0;
      console.log('[DOOR DEBUG]',
        'scene=', currentScene,
        'unlocked=', doorUnlocked,
        'bgOffset=', backgroundOffsetX.toFixed(1),
        'doorScreenX=', getDoorScreenX().toFixed(1),
        'doorVisualX=', getDoorVisualX().toFixed(1),
        'gameWidth=', getGameWidth(),
        'onScreen=', isDoorOnScreen(),
        'arrowClass=', doorArrow ? doorArrow.className : 'NULL',
        'arrowSrc=', doorArrow ? doorArrow.getAttribute('src') : 'NULL'
      );
    }
  }

  if (priscilo.classList.contains('invulnerable') && now >= invulnerableUntil && !gameOver) {
    priscilo.classList.remove('invulnerable');
  }

  const crouching = gameStarted && !gameOver && !state.isJumping && keys.ArrowDown;

  if (gameStarted && !gameOver && isJumpPressed() && jumpKeyReleased &&
      !state.isJumping && !crouching) {
    state.isJumping = true;
    state.velocityY = JUMP_FORCE;
    jumpKeyReleased = false;
  }

  let dx = 0;
  if (gameStarted && !gameOver && !crouching) {
    if (keys.ArrowLeft)  dx -= SPEED;
    if (keys.ArrowRight) dx += SPEED;
  }

  const moving = dx !== 0;

  if (dx < 0) state.facing = -1;
  else if (dx > 0) state.facing = 1;

  let worldShift = 0;

  if (currentScene === 'hallway') {
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
      worldShift = -scroll * (WORLD_SCROLL_SPEED / SPEED);
      backgroundOffsetX += worldShift;
    }

    background.style.backgroundPositionX = backgroundOffsetX + 'px';

  } else if (currentScene === 'bathroom') {
    state.x += dx;
    const maxX = getGameWidth() - state.width;
    if (state.x < 0)    state.x = 0;
    if (state.x > maxX) state.x = maxX;
    background.style.backgroundPositionX = '';
  }

  if (state.isJumping) {
    state.velocityY += GRAVITY;
    state.y += state.velocityY;
    if (state.y >= state.groundY) {
      // Aterrizaje: recalcular groundY con el sprite actual y reapoyar.
      // (Durante el salto no se recalcula para evitar cancelar el impulso.)
      state.groundY = getFloorY();
      state.y = state.groundY;
      state.isJumping = false;
      state.velocityY = 0;
    }
  } else {
    state.y = state.groundY;
  }

  priscilo.style.left = state.x + 'px';
  priscilo.style.top  = state.y + 'px';
  priscilo.style.transform = `scaleX(${state.facing})`;

  updateDoorArrow();
  updateSanitizer();

  if (gameOver) {
    setSprite(SPRITE_IDLE);
    stopSteps();
  } else if (state.isJumping) {
    if (state.velocityY < JUMP_SPRITE_THRESHOLD) {
      setSprite(SPRITE_JUMP_UP);
    } else {
      setSprite(SPRITE_JUMP_DOWN);
    }
    state.frameTimer = 0;
    state.frame = 0;
    stopSteps();
  } else if (crouching) {
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

  if (currentScene === 'hallway' && gameStarted && !gameOver) {
    ratState.x -= ratState.speed;
    ratState.x += worldShift;

    if (ratState.x < -ratState.width) spawnRatRight();

    ratState.frameTimer += delta;
    if (ratState.frameTimer >= RAT_FRAME_INTERVAL) {
      ratState.frameTimer = 0;
      ratState.frame = (ratState.frame + 1) % RAT_SPRITES.length;
      setRatSprite(RAT_SPRITES[ratState.frame]);
    }

    rat.style.left = ratState.x + 'px';
    rat.style.top  = ratState.y + 'px';
  }

  if (currentScene === 'hallway' && gameStarted && !gameOver && now >= invulnerableUntil) {
    if (checkCollision()) takeDamage(now);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// ==========================================================================
// DIAGNÓSTICO DE LAYOUT MÓVIL — TEMPORAL
// --------------------------------------------------------------------------
// Mide cada 300ms valores que pueden estar provocando el temblor lateral
// en Safari móvil. NO modifica nada, solo lee. Loguea SOLO los valores
// que han cambiado respecto a la medición anterior. Si nada cambia,
// loguea "layout estable".
//
// Activación: automática en móvil/touch, O manual añadiendo ?diag=1 a la URL
// para forzarlo en cualquier navegador (útil para probar en desktop también).
//
// Para desactivar: cambiar DIAGNOSTIC_ENABLED a false o eliminar este bloque.
// ==========================================================================

// Log incondicional para verificar que el script llegó al final sin romperse.
// Si NO ves esto en la consola, el problema es de carga (404 en script.js,
// error de sintaxis arriba, o caché agresivo de Safari).
console.log('[DIAG BOOT] script cargado');

(function () {
  const DIAGNOSTIC_ENABLED = true;
  const DIAGNOSTIC_INTERVAL_MS = 300;

  // Detectar activadores
  const mqMatches = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const urlHasDiag = (() => {
    try {
      return new URLSearchParams(window.location.search).get('diag') === '1';
    } catch (e) {
      return false;
    }
  })();

  // Log incondicional del estado del media query y del entorno.
  // Esto ayuda a entender por qué (o por qué no) se activa el diagnóstico.
  console.log('[DIAG MQ]', {
    hoverNonePointerCoarse: mqMatches,
    urlHasDiag: urlHasDiag,
    userAgent: navigator.userAgent,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight
  });

  if (!DIAGNOSTIC_ENABLED) {
    console.log('[DIAG] DIAGNOSTIC_ENABLED = false, no se inicia.');
    return;
  }

  if (!mqMatches && !urlHasDiag) {
    console.log('[DIAG] No se activa: no es touch y no hay ?diag=1 en la URL.');
    return;
  }

  const wrapperEl = document.getElementById('game-wrapper');
  const gameEl    = document.getElementById('game');
  const bgEl      = document.getElementById('background');

  if (!wrapperEl || !gameEl || !bgEl) {
    console.warn('[DIAG] No se encontró alguno de los elementos clave:',
      { wrapper: !!wrapperEl, game: !!gameEl, bg: !!bgEl });
    return;
  }

  // Decimales redondeados a 2 para que cambios subpixel reales sean visibles
  // pero el ruido absoluto de getBoundingClientRect no llene la consola.
  function r2(n) { return Math.round(n * 100) / 100; }

  function snapshotRect(el) {
    const r = el.getBoundingClientRect();
    return {
      x: r2(r.x),
      y: r2(r.y),
      w: r2(r.width),
      h: r2(r.height),
      top: r2(r.top),
      left: r2(r.left)
    };
  }

  function snapshot() {
    const cs_game    = getComputedStyle(gameEl);
    const cs_wrapper = getComputedStyle(wrapperEl);
    const cs_bg      = getComputedStyle(bgEl);

    return {
      // 1-4: viewport del navegador
      innerW:        window.innerWidth,
      innerH:        window.innerHeight,
      docClientW:    document.documentElement.clientWidth,
      docClientH:    document.documentElement.clientHeight,
      // 5-7: bounding rects
      wrapperRect:   snapshotRect(wrapperEl),
      gameRect:      snapshotRect(gameEl),
      bgRect:        snapshotRect(bgEl),
      // 8: background-position-x inline (lo escribe el JS en cada frame)
      bgPosX_inline: bgEl.style.backgroundPositionX || '(unset)',
      // 9: background-size computado
      bgSize:        cs_bg.backgroundSize,
      // 9b: background-position computado (lo que realmente aplica el browser)
      bgPos:         cs_bg.backgroundPosition,
      // 10: estilo computado de #game
      gameCS_w:      cs_game.width,
      gameCS_h:      cs_game.height,
      // 11: estilo computado de #game-wrapper
      wrapperCS_w:   cs_wrapper.width,
      wrapperCS_h:   cs_wrapper.height,
      // Extras de interés: transform y scroll del root
      docScrollX:    window.scrollX,
      docScrollY:    window.scrollY,
      gameTransform: cs_game.transform,
      bgTransform:   cs_bg.transform
    };
  }

  // Comparar dos snapshots y devolver objeto con SOLO las claves que cambian.
  // Para campos que son objetos (rects), compara sub-claves.
  function diff(prev, curr) {
    const out = {};
    for (const key of Object.keys(curr)) {
      const a = prev[key];
      const b = curr[key];
      if (a && typeof a === 'object' && b && typeof b === 'object') {
        const subOut = {};
        let changed = false;
        for (const k of Object.keys(b)) {
          if (a[k] !== b[k]) {
            subOut[k] = { from: a[k], to: b[k] };
            changed = true;
          }
        }
        if (changed) out[key] = subOut;
      } else if (a !== b) {
        out[key] = { from: a, to: b };
      }
    }
    return out;
  }

  let prev = null;
  let tickCount = 0;

  function tick() {
    tickCount++;
    const curr = snapshot();

    if (prev === null) {
      console.log('[DIAG #' + tickCount + '] snapshot inicial:', curr);
      prev = curr;
      return;
    }

    const d = diff(prev, curr);
    const keys = Object.keys(d);

    if (keys.length === 0) {
      console.log('[DIAG #' + tickCount + '] layout estable');
    } else {
      const summary = keys.join(', ');
      console.log('[DIAG #' + tickCount + '] CAMBIA → ' + summary, d);
    }

    prev = curr;
  }

  console.log('[DIAG START] mobileeeee layout diagnostic activo. Intervalo: ' +
              DIAGNOSTIC_INTERVAL_MS + 'ms. Activado por: ' +
              (mqMatches ? 'media query touch' : '') +
              (mqMatches && urlHasDiag ? ' + ' : '') +
              (urlHasDiag ? '?diag=1' : ''));

  // Esperar 1 frame antes de la primera medición para que el layout
  // inicial esté asentado.
  requestAnimationFrame(() => {
    tick(); // baseline
    setInterval(tick, DIAGNOSTIC_INTERVAL_MS);
  });
})();