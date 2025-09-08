window.addEventListener('DOMContentLoaded', () => {

  // =============================
  // Игровые константы
  // =============================
  const GRID_SIZE = 20;
  const TILE_COUNT = 20;
  const GAME_WIDTH = GRID_SIZE * TILE_COUNT;
  const GAME_HEIGHT = GRID_SIZE * TILE_COUNT;
  const TARGET_FPS = 90;
  const FRAME_TIME = 1000 / TARGET_FPS;

  // =============================
  // Canvas и контекст
  // =============================
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  // =============================
  // Игровые переменные
  // =============================
  let snake = [];
  let mobs = [];
  let food = {};
  let powerUps = [];
  let direction = 'right';
  let nextDirection = 'right';
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameSpeed = 8; // Шаги до движения (меньше = быстрее)
  let gameRunning = false;
  let lastTime = 0;
  let accumulator = 0;
  let stepAccumulator = 0;
  let mobSpawnTimer = 0;
  let powerUpSpawnTimer = 0;
  
  // Для плавности
  let snakeHeadOffset = { x: 0, y: 0 };
  let mobOffsets = [];

  const scoreEl = document.getElementById('score');
  const finalScoreEl = document.getElementById('final-score');
  const gameOverEl = document.getElementById('game-over');
  const restartBtn = document.getElementById('restart-btn');

  // =============================
  // Инициализация игры
  // =============================
  function initGame() {
    // Начальная позиция игрока
    snake = [
      {x: 10, y: 10},
      {x: 9, y: 10},
      {x: 8, y: 10}
    ];
    
    mobs = [];
    powerUps = [];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    lives = 3;
    level = 1;
    gameSpeed = 8;
    gameRunning = true;
    lastTime = 0;
    accumulator = 0;
    stepAccumulator = 0;
    mobSpawnTimer = 0;
    powerUpSpawnTimer = 0;
    snakeHeadOffset = { x: 0, y: 0 };
    mobOffsets = [];
    
    generateFood();
    updateScore();
    
    // Запуск game loop
    requestAnimationFrame(gameLoop);
  }

  // =============================
  // Основной игровой цикл (90 FPS)
  // =============================
  function gameLoop(currentTime) {
    if (!lastTime) lastTime = currentTime;
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    accumulator += deltaTime;
    
    // Фиксированный timestep для логики
    while (accumulator >= FRAME_TIME) {
      if (gameRunning) {
        updateGame(FRAME_TIME);
      }
      accumulator -= FRAME_TIME;
    }
    
    // Интерполяция для плавной отрисовки
    const alpha = accumulator / FRAME_TIME;
    draw(alpha);
    
    requestAnimationFrame(gameLoop);
  }

  // =============================
  // Обновление игровой логики
  // =============================
  function updateGame(deltaTime) {
    stepAccumulator += deltaTime;
    
    // Обновляем таймеры
    mobSpawnTimer += deltaTime;
    powerUpSpawnTimer += deltaTime;
    
    // Спавн мобов
    if (mobSpawnTimer >= 2000 - (level * 200)) { // Чем выше уровень, тем чаще спавн
      spawnMob();
      mobSpawnTimer = 0;
    }
    
    // Спавн бонусов
    if (powerUpSpawnTimer >= 3000) {
      spawnPowerUp();
      powerUpSpawnTimer = 0;
    }
    
    // Обновляем бонусы
    powerUps = powerUps.filter(powerUp => {
      powerUp.timer = (powerUp.timer || 300) - 1;
      return powerUp.timer > 0;
    });
    
    // Движение игры
    if (stepAccumulator >= gameSpeed * FRAME_TIME) {
      stepAccumulator = 0;
      
      // Обновляем направление игрока
      direction = nextDirection;
      
      // Создаем новую голову игрока
      const head = {...snake[0]};
      
      switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
      }
      
      // Проверка столкновения со стенами
      if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        loseLife();
        return;
      }
      
      // Проверка столкновения с собой
      for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
          loseLife();
          return;
        }
      }
      
      // Проверка столкновения с мобами
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === head.x && segment.y === head.y) {
            loseLife();
            return;
          }
        }
      }
      
      // Добавляем голову игроку
      snake.unshift(head);
      
      // Проверка съедания еды
      let ateFood = false;
      if (head.x === food.x && head.y === food.y) {
        ateFood = true;
        score += 10 * level;
        updateScore();
        
        // Увеличиваем уровень каждые 50 очков
        if (score >= level * 50) {
          level++;
          if (gameSpeed > 3) {
            gameSpeed -= 0.5;
          }
        }
        
        generateFood();
      } else {
        // Удаляем хвост если не съели еду
        snake.pop();
      }
      
      // Проверка съедания бонусов
      powerUps = powerUps.filter(powerUp => {
        if (head.x === powerUp.x && head.y === powerUp.y) {
          if (powerUp.type === 'life') {
            lives = Math.min(lives + 1, 5);
            updateScore();
          } else if (powerUp.type === 'speed') {
            // Временное увеличение скорости
            const originalSpeed = gameSpeed;
            gameSpeed = Math.max(1, gameSpeed - 2);
            
            // Возвращаем скорость через 3 секунды
            setTimeout(() => {
              gameSpeed = originalSpeed;
            }, 3000);
          }
          return false; // Удаляем бонус
        }
        return true; // Оставляем бонус
      });
      
      // Обновляем мобов
      updateMobs();
    }
  }

  // =============================
  // Генерация еды
  // =============================
  function generateFood() {
    let newFood;
    let onSnake, onMobs, onPowerUps;
    
    do {
      onSnake = false;
      onMobs = false;
      onPowerUps = false;
      
      newFood = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
      };
      
      // Проверяем, не на змейке ли еда
      for (let segment of snake) {
        if (segment.x === newFood.x && segment.y === newFood.y) {
          onSnake = true;
          break;
        }
      }
      
      // Проверяем, не на мобах ли еда
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === newFood.x && segment.y === newFood.y) {
            onMobs = true;
            break;
          }
        }
        if (onMobs) break;
      }
      
      // Проверяем, не на бонусах ли еда
      for (let powerUp of powerUps) {
        if (powerUp.x === newFood.x && powerUp.y === newFood.y) {
          onPowerUps = true;
          break;
        }
      }
      
    } while (onSnake || onMobs || onPowerUps);
    
    food = newFood;
  }

  // =============================
  // Создание моба
  // =============================
  function spawnMob() {
    if (mobs.length >= Math.min(level + 1, 8)) return; // Ограничиваем количество мобов
    
    let newMob;
    let onSnake, onMobs, onFood;
    let attempts = 0;
    
    do {
      onSnake = false;
      onMobs = false;
      onFood = false;
      attempts++;
      
      if (attempts > 50) return;
      
      // Случайная позиция (не рядом с игроком)
      const startPos = {
        x: Math.floor(Math.random() * (TILE_COUNT - 4)) + 2,
        y: Math.floor(Math.random() * (TILE_COUNT - 4)) + 2
      };
      
      // Проверяем расстояние до игрока
      const distanceToPlayer = Math.abs(startPos.x - snake[0].x) + Math.abs(startPos.y - snake[0].y);
      if (distanceToPlayer < 5) {
        onSnake = true;
        continue;
      }
      
      // Проверяем, не на игроке ли
      for (let segment of snake) {
        if (segment.x === startPos.x && segment.y === startPos.y) {
          onSnake = true;
          break;
        }
      }
      
      // Проверяем, не на других мобах ли
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === startPos.x && segment.y === startPos.y) {
            onMobs = true;
            break;
          }
        }
        if (onMobs) break;
      }
      
      // Проверяем, не на еде ли
      if (food.x === startPos.x && food.y === startPos.y) {
        onFood = true;
      }
      
      if (!onSnake && !onMobs && !onFood) {
        newMob = {
          body: [
            {...startPos},
            {x: startPos.x - 1, y: startPos.y},
            {x: startPos.x - 2, y: startPos.y}
          ],
          direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          speed: Math.random() * 0.3 + 0.2, // 0.2 - 0.5
          moveCounter: 0,
          moveAccumulator: 0
        };
        mobOffsets.push({ x: 0, y: 0 }); // Для плавности
      }
      
    } while ((onSnake || onMobs || onFood) && attempts < 50);
    
    if (newMob) {
      mobs.push(newMob);
    }
  }

  // =============================
  // Создание бонуса
  // =============================
  function spawnPowerUp() {
    if (powerUps.length >= 2) return;
    if (Math.random() > 0.3) return;
    
    let newPowerUp;
    let onSnake, onMobs, onFood;
    let attempts = 0;
    
    do {
      onSnake = false;
      onMobs = false;
      onFood = false;
      attempts++;
      
      if (attempts > 30) return;
      
      newPowerUp = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT),
        type: Math.random() > 0.5 ? 'life' : 'speed',
        timer: 300
      };
      
      // Проверяем, не на змейке ли
      for (let segment of snake) {
        if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
          onSnake = true;
          break;
        }
      }
      
      // Проверяем, не на мобах ли
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
            onMobs = true;
            break;
          }
        }
        if (onMobs) break;
      }
      
      // Проверяем, не на еде ли
      if (food.x === newPowerUp.x && food.y === newPowerUp.y) {
        onFood = true;
      }
      
    } while ((onSnake || onMobs || onFood) && attempts < 30);
    
    if (newPowerUp) {
      powerUps.push(newPowerUp);
    }
  }

  // =============================
  // ИИ для мобов
  // =============================
  function updateMobs() {
    mobs.forEach((mob, index) => {
      mob.moveAccumulator += FRAME_TIME;
      
      if (mob.moveAccumulator >= (1 / mob.speed) * FRAME_TIME * 10) {
        mob.moveAccumulator = 0;
        
        // Простой ИИ: случайное движение с шансом следовать за игроком
        if (Math.random() < 0.3) {
          // 30% шанс следовать за игроком
          const head = mob.body[0];
          const playerHead = snake[0];
          
          const dx = playerHead.x - head.x;
          const dy = playerHead.y - head.y;
          
          const possibleDirections = [];
          
          if (dx > 0) possibleDirections.push('right');
          if (dx < 0) possibleDirections.push('left');
          if (dy > 0) possibleDirections.push('down');
          if (dy < 0) possibleDirections.push('up');
          
          if (possibleDirections.length > 0) {
            mob.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
          }
        } else if (Math.random() < 0.1) {
          // 10% шанс случайного поворота
          const directions = ['up', 'down', 'left', 'right'];
          mob.direction = directions[Math.floor(Math.random() * directions.length)];
        }
        
        // Создаем новую голову
        const head = {...mob.body[0]};
        
        switch (mob.direction) {
          case 'up': head.y--; break;
          case 'down': head.y++; break;
          case 'left': head.x--; break;
          case 'right': head.x++; break;
        }
        
        // Проверка границ
        if (head.x >= 0 && head.x < TILE_COUNT && head.y >= 0 && head.y < TILE_COUNT) {
          // Проверка столкновения с собой
          let collisionWithSelf = false;
          for (let segment of mob.body) {
            if (segment.x === head.x && segment.y === head.y) {
              collisionWithSelf = true;
              break;
            }
          }
          
          if (!collisionWithSelf) {
            mob.body.unshift(head);
            mob.body.pop(); // Удаляем хвост
          }
        }
      }
    });
  }

  // =============================
  // Отрисовка игры (с интерполяцией)
  // =============================
  function draw(alpha) {
    // Очищаем canvas
    ctx.fillStyle = '#0a1929';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Рисуем сетку
    ctx.strokeStyle = '#1a3a5a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, GAME_HEIGHT);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(GAME_WIDTH, i * GRID_SIZE);
      ctx.stroke();
    }
    
    // Рисуем игрока с интерполяцией
    snake.forEach((segment, index) => {
      let x = segment.x * GRID_SIZE;
      let y = segment.y * GRID_SIZE;
      
      // Интерполяция для головы
      if (index === 0) {
        ctx.fillStyle = '#4caf50';
      } else {
        // Тело игрока
        const colorValue = Math.max(100, 255 - index * 5);
        ctx.fillStyle = `rgb(50, ${colorValue}, 80)`;
      }
      
      ctx.fillRect(x, y, GRID_SIZE - 1, GRID_SIZE - 1);
      
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, GRID_SIZE - 1, GRID_SIZE - 1);
    });
    
    // Рисуем мобов
    mobs.forEach((mob, index) => {
      mob.body.forEach((segment, segIndex) => {
        if (segIndex === 0) {
          // Голова моба
          ctx.fillStyle = mob.color;
        } else {
          // Тело моба (темнее)
          const rgb = hexToRgb(mob.color);
          if (rgb) {
            ctx.fillStyle = `rgb(${Math.max(0, rgb.r - 50)}, ${Math.max(0, rgb.g - 50)}, ${Math.max(0, rgb.b - 50)})`;
          } else {
            ctx.fillStyle = mob.color;
          }
        }
        
        const x = segment.x * GRID_SIZE;
        const y = segment.y * GRID_SIZE;
        
        ctx.fillRect(x, y, GRID_SIZE - 1, GRID_SIZE - 1);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, GRID_SIZE - 1, GRID_SIZE - 1);
      });
    });
    
    // Рисуем еду
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE/2,
      food.y * GRID_SIZE + GRID_SIZE/2,
      GRID_SIZE/2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Блеск на еде
    ctx.fillStyle = '#ff8a80';
    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE/3,
      food.y * GRID_SIZE + GRID_SIZE/3,
      GRID_SIZE/6,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Рисуем бонусы
    powerUps.forEach(powerUp => {
      ctx.fillStyle = powerUp.type === 'life' ? '#ff4081' : '#448aff';
      ctx.beginPath();
      if (powerUp.type === 'life') {
        // Сердце
        drawHeart(
          powerUp.x * GRID_SIZE + GRID_SIZE/2,
          powerUp.y * GRID_SIZE + GRID_SIZE/2,
          GRID_SIZE/3
        );
      } else {
        // Звезда
        drawStar(
          powerUp.x * GRID_SIZE + GRID_SIZE/2,
          powerUp.y * GRID_SIZE + GRID_SIZE/2,
          GRID_SIZE/3
        );
      }
      ctx.fill();
    });
    
    // Рисуем уровень
    ctx.fillStyle = '#ffeb3b';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${level}`, GAME_WIDTH - 10, 20);
    
    // Рисуем жизни
    ctx.textAlign = 'left';
    ctx.fillText(`Lives: ${lives}`, 10, 20);
  }

  // =============================
  // Вспомогательные функции для отрисовки
  // =============================
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function drawHeart(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x, y - size/2,
      x - size, y - size/2,
      x - size, y
    );
    ctx.bezierCurveTo(
      x - size, y + size/2,
      x, y + size,
      x, y + size
    );
    ctx.bezierCurveTo(
      x, y + size,
      x + size, y + size/2,
      x + size, y
    );
    ctx.bezierCurveTo(
      x + size, y - size/2,
      x, y - size/2,
      x, y
    );
    ctx.closePath();
  }

  function drawStar(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        x + size * Math.cos((i * 2 * Math.PI) / 5),
        y + size * Math.sin((i * 2 * Math.PI) / 5)
      );
      ctx.lineTo(
        x + (size/2) * Math.cos(((i * 2 + 1) * Math.PI) / 5),
        y + (size/2) * Math.sin(((i * 2 + 1) * Math.PI) / 5)
      );
    }
    ctx.closePath();
  }

  // =============================
  // Управление
  // =============================
  function changeDirection(newDirection) {
    // Запрещаем разворот на 180 градусов
    if (
      (direction === 'up' && newDirection === 'down') ||
      (direction === 'down' && newDirection === 'up') ||
      (direction === 'left' && newDirection === 'right') ||
      (direction === 'right' && newDirection === 'left')
    ) {
      return;
    }
    
    nextDirection = newDirection;
  }

  // =============================
  // Клавиатура
  // =============================
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); changeDirection('up'); break;
      case 'ArrowDown': e.preventDefault(); changeDirection('down'); break;
      case 'ArrowLeft': e.preventDefault(); changeDirection('left'); break;
      case 'ArrowRight': e.preventDefault(); changeDirection('right'); break;
      case ' ': e.preventDefault(); if (!gameRunning) initGame(); break;
    }
  });

  // =============================
  // Кнопки управления
  // =============================
  document.getElementById('up-btn').addEventListener('click', () => changeDirection('up'));
  document.getElementById('down-btn').addEventListener('click', () => changeDirection('down'));
  document.getElementById('left-btn').addEventListener('click', () => changeDirection('left'));
  document.getElementById('right-btn').addEventListener('click', () => changeDirection('right'));

  // =============================
  // Свайпы (для мобильных)
  // =============================
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // Определяем направление свайпа
    if (Math.abs(dx) > Math.abs(dy)) {
      // Горизонтальный свайп
      if (dx > 0) changeDirection('right');
      else changeDirection('left');
    } else {
      // Вертикальный свайп
      if (dy > 0) changeDirection('down');
      else changeDirection('up');
    }
    
    touchStartX = 0;
    touchStartY = 0;
  });

  // =============================
  // Потеря жизни
  // =============================
  function loseLife() {
    lives--;
    updateScore();
    
    if (lives <= 0) {
      gameOver();
    } else {
      // Кратковременная неуязвимость
      gameRunning = false;
      setTimeout(() => {
        if (lives > 0) {
          gameRunning = true;
        }
      }, 1000);
    }
  }

  // =============================
  // Game Over
  // =============================
  function gameOver() {
    gameRunning = false;
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.MainButton
        .setParams({ text: `🐍 Score: ${score}`, color: '#4caf50' })
        .show()
        .onClick(() => {
          tg.sendData(JSON.stringify({ score: score, game: 'snake_with_mobs', level: level }));
          tg.close();
        });
    }
  }

  // =============================
  // Обновление счета
  // =============================
  function updateScore() {
    scoreEl.innerHTML = `Score: ${score} | Lives: ${lives} | Level: ${level}`;
  }

  // =============================
  // Перезапуск игры
  // =============================
  restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
  });

  // =============================
  // Запуск игры
  // =============================
  initGame();

});
