// =============================
// Инициализация Telegram WebApp
// =============================
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// =============================
// Matter.js Setup
// =============================
const { Engine, Render, World, Bodies, Body, Composite, Events, Constraint } = Matter;

const width = window.innerWidth;
const height = window.innerHeight;

// Создаем движок и рендер
const engine = Engine.create({
  gravity: { x: 0, y: 0.5 } // гравитация вниз, как в пинболе
});

const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: width,
    height: height,
    wireframes: false,
    background: '#111',
    pixelRatio: window.devicePixelRatio || 1
  }
});

Render.run(render);
Engine.run(engine);

// =============================
// Игровые переменные
// =============================
let score = 0;
let lives = 3;
let isGameOver = false;
let ball = null;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// =============================
// Создание игрового мира
// =============================

function createWorld() {
  // Стены
  const wallOptions = { isStatic: true, restitution: 0.9, render: { fillStyle: '#333' } };
  const walls = [
    Bodies.rectangle(width / 2, 0, width, 50, wallOptions), // верх
    Bodies.rectangle(0, height / 2, 50, height, wallOptions), // лево
    Bodies.rectangle(width, height / 2, 50, height, wallOptions), // право
  ];

  // Пол — с "дырой" посередине, куда может упасть шарик
  const floorLeft = Bodies.rectangle(width * 0.25, height - 25, width * 0.45, 50, wallOptions);
  const floorRight = Bodies.rectangle(width * 0.75, height - 25, width * 0.45, 50, wallOptions);

  // Флипперы (левый и правый)
  const pivotY = height - 150;

  const leftFlipper = Bodies.rectangle(width * 0.3, pivotY, 120, 20, {
    isStatic: true,
    chamfer: { radius: 10 },
    render: { fillStyle: '#ff5722' }
  });

  const rightFlipper = Bodies.rectangle(width * 0.7, pivotY, 120, 20, {
    isStatic: true,
    chamfer: { radius: 10 },
    render: { fillStyle: '#ff5722' }
  });

  // Создаем шарик
  ball = Bodies.circle(width / 2, 100, 15, {
    restitution: 0.8,
    frictionAir: 0.005,
    density: 0.001,
    render: { fillStyle: '#f00' }
  });

  // Буферы (bumper'ы) — дают очки
  const bumpers = [
    Bodies.circle(width * 0.3, height * 0.3, 25, { isStatic: true, restitution: 1.2, render: { fillStyle: '#0ff' } }),
    Bodies.circle(width * 0.7, height * 0.3, 25, { isStatic: true, restitution: 1.2, render: { fillStyle: '#0ff' } }),
    Bodies.circle(width * 0.5, height * 0.5, 30, { isStatic: true, restitution: 1.3, render: { fillStyle: '#ff0' } }),
  ];

  // Рампы и препятствия
  const ramps = [
    Bodies.rectangle(width * 0.4, height * 0.7, 100, 20, { isStatic: true, angle: -0.3, render: { fillStyle: '#444' } }),
    Bodies.rectangle(width * 0.6, height * 0.7, 100, 20, { isStatic: true, angle: 0.3, render: { fillStyle: '#444' } }),
  ];

  // Добавляем всё в мир
  World.add(engine.world, [
    ...walls, floorLeft, floorRight,
    leftFlipper, rightFlipper,
    ball,
    ...bumpers,
    ...ramps
  ]);

  // Ограничения для флипперов (рычаги)
  const leftPivot = Constraint.create({
    pointA: { x: width * 0.3 - 50, y: pivotY },
    bodyB: leftFlipper,
    pointB: { x: -55, y: 0 },
    stiffness: 1,
    length: 0
  });

  const rightPivot = Constraint.create({
    pointA: { x: width * 0.7 + 50, y: pivotY },
    bodyB: rightFlipper,
    pointB: { x: 55, y: 0 },
    stiffness: 1,
    length: 0
  });

  World.add(engine.world, [leftPivot, rightPivot]);

  // Управление флипперами
  document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (e.key === 'a' || e.key === 'ArrowLeft') {
      Body.setAngle(leftFlipper, -0.5);
      setTimeout(() => Body.setAngle(leftFlipper, 0), 200);
    }
    if (e.key === 'd' || e.key === 'ArrowRight') {
      Body.setAngle(rightFlipper, 0.5);
      setTimeout(() => Body.setAngle(rightFlipper, 0), 200);
    }
  });

  // Для мобильных — касания по левой/правой половине экрана
  document.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    const touchX = e.touches[0].clientX;
    if (touchX < width / 2) {
      Body.setAngle(leftFlipper, -0.5);
      setTimeout(() => Body.setAngle(leftFlipper, 0), 200);
    } else {
      Body.setAngle(rightFlipper, 0.5);
      setTimeout(() => Body.setAngle(rightFlipper, 0), 200);
    }
  });

  // Счёт при столкновении с буферами
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
      if (pair.bodyA === ball || pair.bodyB === ball) {
        const other = pair.bodyA === ball ? pair.bodyB : pair.bodyA;
        if (bumpers.includes(other)) {
          score += 50;
          scoreEl.innerText = `Score: ${score}`;
        }
      }
    });
  });

  // Проверка, если шарик упал вниз (между полами)
  Events.on(engine, 'afterUpdate', () => {
    if (ball.position.y > height + 50) {
      loseLife();
    }
  });
}

// =============================
// Жизни и Game Over
// =============================

function loseLife() {
  lives--;
  livesEl.innerText = `Lives: ${lives}`;
  if (lives <= 0) {
    gameOver();
  } else {
    resetBall();
  }
}

function resetBall() {
  Body.setPosition(ball, { x: width / 2, y: 100 });
  Body.setVelocity(ball, { x: 0, y: 0 });
}

function gameOver() {
  isGameOver = true;
  finalScoreEl.innerText = score;
  gameOverEl.classList.remove('hidden');

  // Отправляем результат в Telegram
  tg.MainButton
    .setParams({ text: `🎯 Your Score: ${score}`, color: '#ff5722' })
    .show()
    .onClick(() => {
      tg.sendData(JSON.stringify({ score: score, userId: tg.initDataUnsafe?.user?.id }));
      tg.close();
    });
}

restartBtn.addEventListener('click', () => {
  location.reload(); // Перезагрузка для простоты
});

// =============================
// Запуск игры
// =============================
createWorld();
scoreEl.innerText = `Score: ${score}`;
livesEl.innerText = `Lives: ${lives}`;

// Адаптация под размер экрана
window.addEventListener('resize', () => {
  render.options.width = window.innerWidth;
  render.options.height = window.innerHeight;
  render.canvas.width = window.innerWidth;
  render.canvas.height = window.innerHeight;
});

// =============================
// Опционально: звуки (если добавишь аудиофайлы)
// =============================
/*
const flipSound = new Audio('assets/flip.mp3');
const bumpSound = new Audio('assets/bump.mp3');
flipSound.volume = 0.3;
bumpSound.volume = 0.2;

// В обработчиках:
flipSound.cloneNode().play(); // чтобы звуки не перебивали друг друга
*/