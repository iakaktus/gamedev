// Полностью переписанный game.js — без чёрного экрана
window.addEventListener('DOMContentLoaded', () => {

  // =============================
  // Проверка Matter.js
  // =============================
  if (typeof Matter === 'undefined') {
    document.getElementById('loading').innerText = '❌ Matter.js не загружен!';
    return;
  }

  // =============================
  // Telegram WebApp
  // =============================
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.MainButton.setParams({ color: '#ff5722', text_color: '#ffffff' });
  }

  // =============================
  // Константы
  // =============================
  const width = window.innerWidth;
  const height = window.innerHeight;

  // =============================
  // Matter.js Setup — БЕЗОПАСНЫЙ РЕНДЕР
  // =============================
  const { Engine, Render, Runner, World, Bodies, Body, Events, Constraint } = Matter;

  // Создаём движок
  const engine = Engine.create({
    gravity: { x: 0, y: 0.8 }
  });

  // Создаём КОНТЕЙНЕР для Canvas — не используем document.body!
  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'canvas-container';
  canvasContainer.style.position = 'absolute';
  canvasContainer.style.top = '0';
  canvasContainer.style.left = '0';
  canvasContainer.style.width = '100%';
  canvasContainer.style.height = '100%';
  canvasContainer.style.zIndex = '1';
  document.getElementById('game-container').appendChild(canvasContainer);

  // Создаём рендерер — привязываем к контейнеру
  const render = Render.create({
    element: canvasContainer, // 👈 ВАЖНО: не document.body!
    engine: engine,
    options: {
      width: width,
      height: height,
      wireframes: false,
      background: '#0a0a1a',
      pixelRatio: window.devicePixelRatio || 1,
      antialias: true
    }
  });

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
  const loadingEl = document.getElementById('loading');

  // =============================
  // Создание мира
  // =============================
  function createWorld() {

    // Стены
    const wallOptions = { isStatic: true, restitution: 0.9, render: { fillStyle: '#333' } };
    const walls = [
      Bodies.rectangle(width / 2, 0, width, 50, wallOptions),
      Bodies.rectangle(0, height / 2, 50, height, wallOptions),
      Bodies.rectangle(width, height / 2, 50, height, wallOptions),
    ];

    // Пол с ямой
    const floorLeft = Bodies.rectangle(width * 0.25, height - 25, width * 0.45, 50, wallOptions);
    const floorRight = Bodies.rectangle(width * 0.75, height - 25, width * 0.45, 50, wallOptions);

    // Флипперы
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

    // Шарик
    ball = Bodies.circle(width / 2, 100, 15, {
      restitution: 0.8,
      frictionAir: 0.005,
      density: 0.001,
      render: { fillStyle: '#ff3366' }
    });

    // Буферы
    const bumpers = [
      Bodies.circle(width * 0.3, height * 0.3, 25, { isStatic: true, restitution: 1.2, render: { fillStyle: '#00ffff' } }),
      Bodies.circle(width * 0.7, height * 0.3, 25, { isStatic: true, restitution: 1.2, render: { fillStyle: '#00ffff' } }),
      Bodies.circle(width * 0.5, height * 0.5, 30, { isStatic: true, restitution: 1.3, render: { fillStyle: '#ffff00' } }),
    ];

    // Рампы
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

    // Ограничения флипперов
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

    // Управление
    const flipLeft = () => {
      if (isGameOver) return;
      Body.setAngle(leftFlipper, -0.6);
      setTimeout(() => Body.setAngle(leftFlipper, 0), 150);
    };

    const flipRight = () => {
      if (isGameOver) return;
      Body.setAngle(rightFlipper, 0.6);
      setTimeout(() => Body.setAngle(rightFlipper, 0), 150);
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'a' || e.key === 'ArrowLeft') flipLeft();
      if (e.key === 'd' || e.key === 'ArrowRight') flipRight();
    });

    document.addEventListener('touchstart', (e) => {
      const touchX = e.touches[0].clientX;
      if (touchX < width / 2) flipLeft();
      else flipRight();
    });

    // Подсчёт очков
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        if ((pair.bodyA === ball || pair.bodyB === ball)) {
          const other = pair.bodyA === ball ? pair.bodyB : pair.bodyA;
          if (bumpers.includes(other)) {
            score += 50;
            scoreEl.innerText = `Score: ${score}`;
          }
        }
      });
    });

    // Проверка падения
    Events.on(engine, 'afterUpdate', () => {
      if (ball && ball.position.y > height + 100) {
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
    if (ball) {
      Body.setPosition(ball, { x: width / 2, y: 100 });
      Body.setVelocity(ball, { x: 0, y: 0 });
    }
  }

  function gameOver() {
    isGameOver = true;
    finalScoreEl.innerText = score;
    gameOverEl.classList.remove('hidden');

    if (tg) {
      tg.MainButton
        .setParams({ text: `🎯 Your Score: ${score}` })
        .show()
        .onClick(() => {
          tg.sendData(JSON.stringify({
            score: score,
            userId: tg.initDataUnsafe?.user?.id
          }));
          tg.close();
        });
    }
  }

  restartBtn.addEventListener('click', () => {
    location.reload();
  });

  // =============================
  // Запуск игры — С ЗАДЕРЖКОЙ и ПРОВЕРКОЙ
  // =============================
  setTimeout(() => {
    try {
      createWorld();

      // Запуск рендера и движка
      Render.run(render);
      Runner.run(Runner.create(), engine);

      // Скрываем лоадер
      loadingEl.style.display = 'none';

      // Обновляем UI
      scoreEl.innerText = `Score: ${score}`;
      livesEl.innerText = `Lives: ${lives}`;

      // Адаптация
      window.addEventListener('resize', () => {
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
      });

      // Защита от скролла
      document.body.addEventListener('touchmove', (e) => {
        if (!isGameOver) e.preventDefault();
      }, { passive: false });

    } catch (err) {
      loadingEl.innerText = '❌ Ошибка: ' + err.message;
      console.error(err);
    }
  }, 300); // Задержка для полной инициализации DOM и iframe

});
