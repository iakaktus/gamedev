window.addEventListener('DOMContentLoaded', () => {

  if (typeof Matter === 'undefined') {
    document.getElementById('loading').innerText = '❌ Matter.js не загружен!';
    return;
  }

  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.MainButton.setParams({ color: '#ff5722', text_color: '#ffffff' });
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  const { Engine, Render, Runner, World, Bodies, Body, Events, Constraint } = Matter;

  const engine = Engine.create({
    gravity: { x: 0, y: 0.6 } // чуть меньше гравитации
  });

  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'canvas-container';
  canvasContainer.style.position = 'absolute';
  canvasContainer.style.top = '0';
  canvasContainer.style.left = '0';
  canvasContainer.style.width = '100%';
  canvasContainer.style.height = '100%';
  canvasContainer.style.zIndex = '1';
  document.getElementById('game-container').appendChild(canvasContainer);

  const render = Render.create({
    element: canvasContainer,
    engine: engine,
    options: {
      width: width,
      height: height,
      wireframes: false,
      background: '#0a0a2a',
      pixelRatio: window.devicePixelRatio || 1,
      antialias: true
    }
  });

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

  function createWorld() {

    // ТОЛЬКО НИЖНИЕ СТЕНЫ С ДЫРОЙ ПОСЕРЕДИНЕ
    const wallThickness = 50;
    
    // Левая нижняя стена
    const floorLeft = Bodies.rectangle(
      width * 0.25, 
      height - wallThickness/2, 
      width * 0.45, 
      wallThickness, 
      { isStatic: true, render: { fillStyle: '#444' } }
    );

    // Правая нижняя стена
    const floorRight = Bodies.rectangle(
      width * 0.75, 
      height - wallThickness/2, 
      width * 0.45, 
      wallThickness, 
      { isStatic: true, render: { fillStyle: '#444' } }
    );

    // Верхние стены (рамка)
    const topWall = Bodies.rectangle(width / 2, wallThickness/2, width, wallThickness, {
      isStatic: true,
      render: { fillStyle: '#444' }
    });

    const leftWall = Bodies.rectangle(wallThickness/2, height/2, wallThickness, height, {
      isStatic: true,
      render: { fillStyle: '#444' }
    });

    const rightWall = Bodies.rectangle(width - wallThickness/2, height/2, wallThickness, height, {
      isStatic: true,
      render: { fillStyle: '#444' }
    });

    // Флипперы — БОЛЬШЕ И БЛИЖЕ К ЦЕНТРУ
    const flipperY = height - 120; // выше от нижней границы
    const flipperLength = 140; // длиннее
    const flipperWidth = 25;

    const leftFlipper = Bodies.rectangle(
      width * 0.4, 
      flipperY, 
      flipperLength, 
      flipperWidth, 
      {
        isStatic: true,
        chamfer: { radius: 10 },
        render: { fillStyle: '#ff5722' }
      }
    );

    const rightFlipper = Bodies.rectangle(
      width * 0.6, 
      flipperY, 
      flipperLength, 
      flipperWidth, 
      {
        isStatic: true,
        chamfer: { radius: 10 },
        render: { fillStyle: '#ff5722' }
      }
    );

    // Шарик
    ball = Bodies.circle(width / 2, 200, 18, {
      restitution: 0.8,
      frictionAir: 0.004,
      density: 0.001,
      render: { fillStyle: '#ff3366' }
    });

    // Буферы (bumper'ы)
    const bumpers = [
      Bodies.circle(width * 0.3, height * 0.25, 30, { isStatic: true, restitution: 1.3, render: { fillStyle: '#00ffff' } }),
      Bodies.circle(width * 0.7, height * 0.25, 30, { isStatic: true, restitution: 1.3, render: { fillStyle: '#00ffff' } }),
      Bodies.circle(width * 0.5, height * 0.4, 35, { isStatic: true, restitution: 1.4, render: { fillStyle: '#ffff00' } }),
      Bodies.circle(width * 0.2, height * 0.6, 25, { isStatic: true, restitution: 1.2, render: { fillStyle: '#00ff00' } }),
      Bodies.circle(width * 0.8, height * 0.6, 25, { isStatic: true, restitution: 1.2, render: { fillStyle: '#00ff00' } }),
    ];

    // Рампы и препятствия
    const ramps = [
      Bodies.rectangle(width * 0.3, height * 0.7, 120, 20, { isStatic: true, angle: -0.4, render: { fillStyle: '#666' } }),
      Bodies.rectangle(width * 0.7, height * 0.7, 120, 20, { isStatic: true, angle: 0.4, render: { fillStyle: '#666' } }),
      Bodies.rectangle(width * 0.5, height * 0.85, 200, 20, { isStatic: true, angle: 0, render: { fillStyle: '#888' } }),
    ];

    World.add(engine.world, [
      topWall, leftWall, rightWall,
      floorLeft, floorRight,
      leftFlipper, rightFlipper,
      ball,
      ...bumpers,
      ...ramps
    ]);

    // Ограничения флипперов
    const leftPivot = Constraint.create({
      pointA: { x: width * 0.4 - flipperLength/2 + 20, y: flipperY },
      bodyB: leftFlipper,
      pointB: { x: -flipperLength/2 + 20, y: 0 },
      stiffness: 1,
      length: 0
    });

    const rightPivot = Constraint.create({
      pointA: { x: width * 0.6 + flipperLength/2 - 20, y: flipperY },
      bodyB: rightFlipper,
      pointB: { x: flipperLength/2 - 20, y: 0 },
      stiffness: 1,
      length: 0
    });

    World.add(engine.world, [leftPivot, rightPivot]);

    // Управление
    const flipLeft = () => {
      if (isGameOver) return;
      Body.setAngle(leftFlipper, -0.7);
      setTimeout(() => Body.setAngle(leftFlipper, 0), 180);
    };

    const flipRight = () => {
      if (isGameOver) return;
      Body.setAngle(rightFlipper, 0.7);
      setTimeout(() => Body.setAngle(rightFlipper, 0), 180);
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
      Body.setPosition(ball, { x: width / 2, y: 200 });
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

  setTimeout(() => {
    try {
      createWorld();
      Render.run(render);
      Runner.run(Runner.create(), engine);
      loadingEl.style.display = 'none';
      scoreEl.innerText = `Score: ${score}`;
      livesEl.innerText = `Lives: ${lives}`;

      window.addEventListener('resize', () => {
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
      });

      document.body.addEventListener('touchmove', (e) => {
        if (!isGameOver) e.preventDefault();
      }, { passive: false });

    } catch (err) {
      loadingEl.innerText = '❌ Ошибка: ' + err.message;
      console.error(err);
    }
  }, 300);

});
