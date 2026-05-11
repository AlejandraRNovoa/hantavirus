// ===== Hantavirus - Pantalla 1 =====

const priscilo = document.getElementById('priscilo');

// --- Sprites ---
const SPRITE_IDLE = 'elements/img/priscilo.png';
const SPRITE_WALK = [
  'elements/img/priscilom1.png',
  'elements/img/priscilom2.png',
  'elements/img/priscilom3.png',
  'elements/img/priscilom4.png',
  'elements/img/priscilom5.png'
];

// Precarga para evitar parpadeo en el primer ciclo de caminata
[SPRITE_IDLE, ...SPRITE_WALK].forEach(src => {
  const img = new Image();
  img.src = src;
});

// --- Estado ---
const state = {
  x: 100,
  y: 100,
  speed: 4,           // píxeles por frame
  width: 96,          // debe coincidir con el CSS de #priscilo
  height: 96,
  frame: 0,           // índice del sprite de caminata actual
  frameTimer: 0,      // ms desde el último cambio de frame
  frameInterval: 120, // cada cuántos ms cambia el sprite
  currentSrc: SPRITE_IDLE,
  facing: 1           // 1 = derecha, -1 = izquierda
};

// --- Teclas ---
const keys = {
  ArrowUp: false,
  ArrowDown: false,
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

// --- Helper para cambiar sprite solo cuando hace falta ---
function setSprite(src) {
  if (state.currentSrc !== src) {
    priscilo.src = src;
    state.currentSrc = src;
  }
}

// --- Bucle principal ---
let lastTime = performance.now();

function loop(now) {
  const delta = now - lastTime;
  lastTime = now;

  // 1. Movimiento
  let dx = 0;
  let dy = 0;
  if (keys.ArrowLeft)  dx -= state.speed;
  if (keys.ArrowRight) dx += state.speed;
  if (keys.ArrowUp)    dy -= state.speed;
  if (keys.ArrowDown)  dy += state.speed;

  const moving = dx !== 0 || dy !== 0;

  // 2. Actualizar dirección horizontal solo si hay movimiento lateral
  if (dx < 0) state.facing = -1;
  else if (dx > 0) state.facing = 1;
  // si dx === 0 (subiendo, bajando o quieto): se mantiene la última dirección

  state.x += dx;
  state.y += dy;

  // 3. Limitar dentro de la pantalla
  const maxX = window.innerWidth  - state.width;
  const maxY = window.innerHeight - state.height;
  if (state.x < 0) state.x = 0;
  if (state.y < 0) state.y = 0;
  if (state.x > maxX) state.x = maxX;
  if (state.y > maxY) state.y = maxY;

  // 4. Aplicar posición y flip
  priscilo.style.left = state.x + 'px';
  priscilo.style.top  = state.y + 'px';
  priscilo.style.transform = `scaleX(${state.facing})`;

  // 5. Animación
  if (moving) {
    state.frameTimer += delta;
    if (state.frameTimer >= state.frameInterval) {
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
