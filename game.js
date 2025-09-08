window.addEventListener('DOMContentLoaded', () => {

  // =============================
  // Константы игры
  // =============================
  const GAME_WIDTH = 400;
  const GAME_HEIGHT = 700;
  const BALL_RADIUS = 10;
  
  // =============================
  // Matter.js инициализация
  // =============================
  const { Engine, Render, Runner, World, Bodies, Body, Events, Constraint } = Matter;

  const engine = Engine.create({
    gravity: { x: 0, y: 0.7 }
  });

  const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      wireframes: false,
      background: '#0a0a2a',
      pixelRatio: window.devicePixelRatio || 1
    }
  });

  // =============================
  // Игровые переменные
  // =============================
  let score = 0;
  let lives = 3;
  let ball = null;
  let isGameOver = false;
  let plungerPower = 0;
  let plungerCharging = false;
  let leftFlipper = null;
  let rightFlipper = null;
  
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const finalScoreEl = document.getElementById('final-score');
  const gameOverEl = document.getElementById('game-over');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const plungerBtn = document.getElementById('plunger-btn');
  const restartBtn = document.getElementById('restart-btn');

  // =============================
  // Создание игрового мира (ИСПРАВЛЕНО)
  // =============================
  function createWorld() {
    // Очищаем предыдущий мир
    World.clear(engine.world);
    Engine.clear(engine);
    
    // Стены
    const walls = [
      Bodies.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 20, { isStatic: true, render: { fillStyle: '#444' } }), // верх
      Bodies.rectangle(0, GAME_HEIGHT / 2, 20, GAME_HEIGHT, { isStatic: true, render: { fillStyle: '#444' } }), // лево
      Bodies.rectangle(GAME_WIDTH, GAME_HEIGHT / 2, 20, GAME_HEIGHT, { isStatic: true, render: { fillStyle: '#444' } }), // право
    ];

    // Нижние стены с дырой (ПОД флипперами)
    const floorLeft = Bodies.rectangle(100, GAME_HEIGHT - 10, 180, 20, { isStatic: true, render: { fillStyle: '#444' } });
    const floorRight = Bodies.rectangle(300, GAME_HEIGHT - 10, 180, 20, { isStatic: true, render: { fillStyle: '#444' } });

    // Флипперы (внизу)
    const flipperY = GAME_HEIGHT - 80;
    leftFlipper = Bodies.rectangle(120, flipperY, 90, 12, {
      isStatic: true,
      chamfer: { radius: 6 },
      render: { fillStyle: '#ff5722' }
    });

    rightFlipper = Bodies.rectangle(280, flipperY, 90, 12, {
      isStatic: true,
      chamfer: { radius: 6 },
      render: { fillStyle: '#ff5722' }
    });

    // Плунжер (слева внизу)
    const plunger = Bodies.rectangle(50, GAME_HEIGHT - 150, 15, 100, {
      isStatic: true,
      render: { fillStyle: '#666' }
    });

    // Буферы (в верхней части поля)
    const bumpers = [
      Bodies.circle(100, 150, 25, { isStatic: true, restitution: 1.4, render: { fillStyle: '#00ffff' } }),
      Bodies.circle(300, 150, 25, { isStatic: true, restitution: 1.4, render: { fillStyle: '#00ffff' } }),
      Bodies.circle(200, 250, 30, { isStatic: true, restitution: 1.5, render: { fillStyle: '#ffff00' } }),
      Bodies.circle(80, 350, 20, { isStatic: true, restitution: 1.3, render: { fillStyle: '#ff00ff' } }),
      Bodies.circle(320, 350, 20, { isStatic: true, restitution: 1.3, render: { fillStyle: '#ff00ff' } }),
    ];

    // Рампы (в средней части)
    const ramps = [
      Bodies.rectangle(150, 450, 100, 15, { isStatic: true, angle: -0.3, render: { fillStyle: '#666' } }),
      Bodies.rectangle(250, 450, 100, 15, { isStatic: true, angle: 0.3, render: { fillStyle: '#666' } }),
    ];

    // Специальные зоны (в верхней части)
    const specialZones = [
      Bodies.rectangle(50, 80, 60, 20, { isStatic: true, render: { fillStyle: '#ff9800' } }),
      Bodies.rectangle(350, 80, 60, 20, { isStatic: true, render: { fillStyle: '#ff9800' } }),
    ];

    World.add(engine.world, [
      ...walls, floorLeft, floorRight,
      leftFlipper, rightFlipper,
      plunger,
      ...bumpers,
      ...ramps,
      ...specialZones
    ]);

    // Ограничения флипперов
    const leftPivot = Constraint.create({
      pointA: { x: 80, y: flipperY },
      bodyB: leftFlipper,
      pointB: { x: -35, y: 0 },
      stiffness: 1,
      length: 0
    });

    const rightPivot = Constraint.create({
      pointA: { x: 320, y: flipperY },
      bodyB: rightFlipper,
      pointB: { x: 35, y: 0 },
      stiffness: 1,
      length: 0
    });

    World.add(engine.world, [leftPivot, rightPivot]);

    // Создаем шарик (ПОД плунжером)
    launchBall();

    // Обработка столкновений
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        // Проверяем, есть ли шарик в столкновении
        if (bodyA === ball || bodyB === ball) {
          const other = bodyA === ball ? bodyB : bodyA;
          
          // Буферы
          if (other.render.fillStyle === '#00ffff' || other.render.fillStyle === '#ffff00') {
            score += 50;
            updateScore();
          } else if (other.render.fillStyle === '#ff00ff') {
            score += 100;
            updateScore();
          } else if (other.render.fillStyle === '#ff9800') {
            score += 100;
            updateScore();
          }
        }
      });
    });

    // Проверка падения шарика
    Events.on(engine, 'afterUpdate', () => {
      if (ball && ball.position.y > GAME_HEIGHT + 50) {
        loseLife();
      }
      
      // Зарядка плунжера
      if (plungerCharging) {
        plungerPower = Math.min(plungerPower + 2, 100);
        plungerBtn.textContent = `CHARGE: ${plungerPower}%`;
      }
    });
  }

  // =============================
  // Управление флипперами
  // =============================
  function flipLeft() {
    if (isGameOver || !leftFlipper) return;
    Body.setAngle(leftFlipper, -0.7);
    setTimeout(() => Body.setAngle(leftFlipper, 0), 150);
  }

  function flipRight() {
    if (isGameOver || !rightFlipper) return;
    Body.setAngle(rightFlipper, 0.7);
    setTimeout(() => Body.setAngle(rightFlipper, 0), 150);
  }

  // =============================
  // Плунжер (стартер шарика) - ИСПРАВЛЕНО
  // =============================
  function startPlunger() {
    if (isGameOver) return;
    plungerCharging = true;
    plungerPower = 0;
    plungerBtn.style.background = 'linear-gradient(to bottom, #ff9800, #f57c00)';
  }

  function releasePlunger() {
    if (!plungerCharging || isGameOver) return;
    plungerCharging = false;
    
    if (ball) {
      // Правильная сила запуска (вверх, а не в сторону)
      const force = Math.min(plungerPower * 0.015, 0.4);
      Body.applyForce(ball, ball.position, { x: 0, y: -force });
    }
    
    plungerBtn.style.background = 'linear-gradient(to bottom, #4caf50, #388e3c)';
    plungerBtn.textContent = 'LAUNCH';
    plungerPower = 0;
  }

  plungerBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startPlunger(); });
  plungerBtn.addEventListener('mousedown', startPlunger);
  plungerBtn.addEventListener('touchend', releasePlunger);
  plungerBtn.addEventListener('mouseup', releasePlunger);
  plungerBtn.addEventListener('mouseleave', releasePlunger);

  // =============================
  // Запуск шарика (ИСПРАВЛЕНО ПОЗИЦИЮ)
  // =============================
  function launchBall() {
    if (ball) {
      World.remove(engine.world, ball);
    }
    
    // Шарик стартует ПОД плунжером, а не над препятствиями
    ball = Bodies.circle(50, GAME_HEIGHT - 100, BALL_RADIUS, {
      restitution: 0.8,
      frictionAir: 0.003,
      render: { fillStyle: '#ff3366' }
    });
    
    World.add(engine.world, ball);
  }

  // =============================
  // Жизни и Game Over
  // =============================
  function loseLife() {
    lives--;
    updateLives();
    
    if (lives <= 0) {
      gameOver();
    } else {
      setTimeout(() => {
        launchBall();
      }, 1000);
    }
  }

  function gameOver() {
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.MainButton
        .setParams({ text: `🎯 Score: ${score}`, color: '#ff5722' })
        .show()
        .onClick(() => {
          tg.sendData(JSON.stringify({ score: score }));
          tg.close();
        });
    }
  }

  // =============================
  // Обновление UI
  // =============================
  function updateScore() {
    scoreEl.textContent = score;
  }

  function updateLives() {
    livesEl.textContent = lives;
  }

  // =============================
  // Кнопки управления
  // =============================
  leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); flipLeft(); });
  rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); flipRight(); });
  leftBtn.addEventListener('mousedown', flipLeft);
  rightBtn.addEventListener('mousedown', flipRight);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') flipLeft();
    if (e.key === 'd' || e.key === 'ArrowRight') flipRight();
    if (e.key === ' ') {
      e.preventDefault();
      if (plungerCharging) releasePlunger();
      else startPlunger();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      releasePlunger();
    }
  });

  // =============================
  // Перезапуск игры
  // =============================
  restartBtn.addEventListener('click', () => {
    location.reload();
  });

  // =============================
  // Запуск игры
  // =============================
  createWorld();
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  updateScore();
  updateLives();

  // =============================
  // Адаптация под экран
  // =============================
  function adjustGameSize() {
    const container = document.getElementById('game-container');
    
    const scaleX = window.innerWidth / GAME_WIDTH;
    const scaleY = (window.innerHeight - 200) / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1);
    
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'center top';
  }

  adjustGameSize();
  window.addEventListener('resize', adjustGameSize);

});
