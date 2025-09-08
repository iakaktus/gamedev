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
  } else {
    console.warn('Запущено вне Telegram — некоторые функции могут не работать.');
  }

  // =============================
  // Константы
  // =============================
  const width = window.innerWidth;
  const height = window.innerHeight;

  // =============================
  // Matter.js Setup
  // =============================
  const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Body = Matter.Body,
        Events = Matter.Events,
        Constraint = Matter.Constraint;

  // Создаём движок
  const engine = Engine.create({
    gravity: { x: 0, y: 0.8 }
  });

  // Создаём рендерер
  const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: width,
      height: height,
      wireframes: false,
      background: '#0a0a1a',
      pixelRatio: window.devicePixelRatio || 1
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
      Bodies.rectangle(width / 2, 0, width, 50, wallOptions), // верх
      Bodies.rectangle(0, height / 2, 50, height, wallOptions), // лево
      Bodies.rectangle(width, height / 2, 50, height, wallOptions), // право
    ];

    // Пол с "ямы" по центру
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

    // Буферы (очки)
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

    // Управление (клавиатура)
    document.addEventListener('keydown', (e) => {
      if (isGameOver) return;
      if (e.key === 'a' || e.key === 'ArrowLeft') {
        Body.setAngle(leftFlipper, -0.6);
        setTimeout(() => Body.setAngle(leftFlipper, 0), 150);
      }
      if (e.key === 'd' || e.key === 'ArrowRight') {
        Body.setAngle(rightFlipper, 0.6);
        setTimeout(() => Body.setAngle(rightFlipper, 0), 150);
      }
    });

    // Управление (касания)
    document.addEventListener('touchstart', (e) => {
      if (isGameOver) return;
      const touchX = e.touches[0].clientX;
      if (touchX < width / 2) {
        Body.setAngle(leftFlipper, -0.6);
        setTimeout(() => Body.setAngle(leftFlipper, 0), 150);
      } else {
        Body.setAngle(rightFlipper, 0.6);
        setTimeout(() => Body.setAngle(rightFlipper, 0), 150);
      }
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

    // Проверка падения шарика
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
  // Запуск игры
  // =============================
  createWorld();

  // Запуск Matter.js Runner (актуальный способ)
  const runner = Runner.create();
  Runner.run(runner, engine);
  Render.run(render);

  // Скрываем лоадер
  loadingEl.style.display = 'none';

  // Обновляем UI
  scoreEl.innerText = `Score: ${score}`;
  livesEl.innerText = `Lives: ${lives}`;

  // Адаптация под размер экрана
  window.addEventListener('resize', () => {
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
  });

  // Защита от случайного скролла
  document.body.addEventListener('touchmove', (e) => {
    if (!isGameOver) e.preventDefault();
  }, { passive: false });

});
