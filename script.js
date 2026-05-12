// ===== Hantavirus - Pantalla 1 =====

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

// Salto
const JUMP_FORCE = -20;
const GRAVITY    = 0.60;
const JUMP_SPRITE_THRESHOLD = -3;

// Rata
const RAT_WIDTH_VW       = 4;
const RAT_MIN_WIDTH      = 100;
const RAT_MAX_WIDTH      = 100;
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
const DOOR_APPEAR_TIME = 15000;
const DOOR_WORLD_X     = 4200;
const DOOR_Y_RATIO     = 0.18;
const DOOR_ZONE_WIDTH  = 160;

const DOOR_ARROW_OFFSET_X_VH = 0.30;   // proporción del alto del viewport
const DOOR_ARROW_OFFSET_Y_VH = -0.04;  // proporción del alto del viewport

// Posición de entrada en el baño
const BATHROOM_START_X_RATIO = 0.25;

// Gel hidroalcohólico (en el baño)
const SANITIZER_X_RATIO = 0.46;
const SANITIZER_Y_RATIO = 0.43;
const SANITIZER_ZONE    = 120;

// Transición fade entre escenas (ms). Debe coincidir con la transición CSS.
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

// --- Estado del jugador ---
const state = {
  x: 0,
  y: 0,
  groundY: 0,
  width: PLAYER_MIN_WIDTH,
  height: PLAYER_MIN_WIDTH,
  frame: 0,
  frameTimer: 0,
  currentSrc: SPRITE_IDLE,
  facing: 1,
  isJumping: false,
  velocityY: 0
};

// --- Estado de la rata ---
const ratState = {
  x: 0,
  y: 0,
  width: RAT_MIN_WIDTH,
  height: RAT_MIN_WIDTH,
  frame: 0,
  frameTimer: 0,
  currentSrc: RAT_SPRITES[0],
  speed: RAT_MIN_SPEED,
  scale: 1
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
    state.groundY = getFloorY();
    if (!state.isJumping) {
      state.y = state.groundY;
    }
    if (currentScene === 'hallway') {
      const left  = getDeadZoneLeft();
      const right = getDeadZoneRight();
      if (state.x < left)  state.x = left;
      if (state.x > right) state.x = right;
    } else if (currentScene === 'bathroom') {
      const maxX = window.innerWidth - state.width;
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
  ratState.x = window.innerWidth + RAT_RESPAWN_MIN + Math.random() * RAT_RESPAWN_RANGE;
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

// --- Puerta (solo hallway) ---
function getDoorScreenX() {
  return DOOR_WORLD_X + backgroundOffsetX;
}

function getDoorVisualX() {
  return getDoorScreenX() + window.innerHeight * DOOR_ARROW_OFFSET_X_VH;
}

function isDoorOnScreen() {
  const arrowW = doorArrow ? (doorArrow.offsetWidth || 64) : 64;
  const x = getDoorVisualX();
  return (x + arrowW / 2) >= 0 && (x - arrowW / 2) <= window.innerWidth;
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
  const baseY  = window.innerHeight * DOOR_Y_RATIO;
  doorArrow.style.left = (x - arrowW / 2) + 'px';
  doorArrow.style.top  = (baseY + window.innerHeight * DOOR_ARROW_OFFSET_Y_VH) + 'px';
}

function isPriscilonNearDoor() {
  if (currentScene !== 'hallway' || !doorUnlocked) return false;
  const priscilonCenter = state.x + state.width / 2;
  const doorX = getDoorVisualX();
  return Math.abs(priscilonCenter - doorX) <= DOOR_ZONE_WIDTH / 2;
}

// --- Gel ---
function getSanitizerX() {
  return window.innerWidth * SANITIZER_X_RATIO;
}
function getSanitizerY() {
  return window.innerHeight * SANITIZER_Y_RATIO;
}

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
  return Math.abs(dx) <= SANITIZER_ZONE / 2;
}

function useSanitizer() {
  if (sanitizerUsed) return;
  if (currentScene !== 'bathroom') return;
  if (lives >= MAX_LIVES) return;
  if (!isPriscilonNearSanitizer()) return;

  sanitizerUsed = true;
  lives += 1;
  updateHud();
  sanitizerEl.classList.add('hidden');

  sanitizerAudio.currentTime = 0;
  sanitizerAudio.play().catch(err => {
    console.warn('No se pudo reproducir el sonido del gel:', err);
  });
}

// --- Transición entre escenas (fade to black) ---
function transitionToScene(sceneName) {
  if (isTransitioning) return;
  if (sceneName !== 'hallway' && sceneName !== 'bathroom') return;
  if (sceneName === currentScene) return;

  isTransitioning = true;

  // Soltar las teclas direccionales/acciones para que al despertar no
  // se quede caminando solo por una pulsación previa.
  for (const k in keys) keys[k] = false;
  stopSteps();

  // Paso 1: fundido a negro
  if (fadeEl) fadeEl.classList.add('fade-active');

  // Paso 2 (en el punto negro): cambiar escena de verdad
  setTimeout(() => {
    applySceneChange(sceneName);

    // Paso 3: fundido de vuelta
    if (fadeEl) fadeEl.classList.remove('fade-active');

    // Paso 4: liberar input cuando se termine el fundido in
    setTimeout(() => {
      isTransitioning = false;
      // Reseteo del reloj del loop para evitar delta gigante
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

    state.x = window.innerWidth * BATHROOM_START_X_RATIO;
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

    // Recolocar Priscilo en la dead zone del hallway
    state.x = (window.innerWidth - state.width) / 2;
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

  if (lives <= 0) {
    triggerGameOver();
  }
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
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowDown: false,
  ArrowUp: false,
  ' ': false,
  e: false,
  E: false
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    togglePause();
    e.preventDefault();
    return;
  }

  // Bloquear input durante transición
  if (isTransitioning) {
    if (e.key in keys) e.preventDefault();
    return;
  }

  if (e.key in keys) {
    if (e.key === 'ArrowUp' && !keys.ArrowUp) {
      if (gameStarted && !gameOver && !isPaused && currentScene === 'hallway') {
        // Si está cerca de la puerta, transición al baño
        if (isPriscilonNearDoor()) {
          transitionToScene('bathroom');
        }
      }
    }
    if ((e.key === 'e' || e.key === 'E') && !(keys.e || keys.E)) {
      if (gameStarted && !gameOver && !isPaused && currentScene === 'bathroom') {
        useSanitizer();
      }
    }
    keys[e.key] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    if (e.key === ' ') {
      jumpKeyReleased = true;
    }
    e.preventDefault();
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  applyPlayerSize();
  applyRatSize();
  updateDoorArrow();
  updateSanitizer();
});

// --- Botón Play ---
playButton.addEventListener('click', () => {
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
});

// --- Cambio de sprite ---
function setSprite(src) {
  if (state.currentSrc !== src) {
    priscilo.src = src;
    state.currentSrc = src;
    requestAnimationFrame(() => {
      measureSpriteHeight();
      if (!state.isJumping) {
        state.groundY = getFloorY();
        state.y = state.groundY;
      } else {
        state.groundY = getFloorY();
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
let lastTime = performance.now();

function loop(now) {
  // Si pausa o transición, salta toda la lógica pero mantén el rAF.
  // En transición tampoco actualizamos lastTime: lo resetea
  // transitionToScene al terminar.
  if (isPaused || isTransitioning) {
    requestAnimationFrame(loop);
    return;
  }

  const delta = now - lastTime;
  lastTime = now;

  if (gameStarted && !gameOver && currentScene === 'hallway') {
    gameTime += delta;
    if (!doorUnlocked && gameTime >= DOOR_APPEAR_TIME) {
      doorUnlocked = true;
    }
  }

  if (priscilo.classList.contains('invulnerable') && now >= invulnerableUntil && !gameOver) {
    priscilo.classList.remove('invulnerable');
  }

  // ===== JUGADOR =====
  const crouching = gameStarted && !gameOver && !state.isJumping && keys.ArrowDown;

  if (gameStarted && !gameOver && keys[' '] && jumpKeyReleased &&
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
    const maxX = window.innerWidth - state.width;
    if (state.x < 0)    state.x = 0;
    if (state.x > maxX) state.x = maxX;

    background.style.backgroundPositionX = '';
  }

  if (state.isJumping) {
    state.velocityY += GRAVITY;
    state.y += state.velocityY;

    if (state.y >= state.groundY) {
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

    if (ratState.x < -ratState.width) {
      spawnRatRight();
    }

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
    if (checkCollision()) {
      takeDamage(now);
    }
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);