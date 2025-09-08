window.addEventListener('DOMContentLoaded', () => {

  // =============================
  // Telegram WebApp инициализация
  // =============================
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.BackButton.show();
    
    // Обработка кнопки "Назад"
    tg.BackButton.onClick(() => {
      window.location.href = '../../index.html';
    });
  }

  // =============================
  // Игровые константы
  // =============================
  const GRID_SIZE = 20;
  const TILE_COUNT = 20;
  const GAME_WIDTH = GRID_SIZE * TILE_COUNT;
  const GAME_HEIGHT = GRID_SIZE * TILE_COUNT;
  const TARGET_FPS = 60;
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
  let particles = [];
  let direction = 'right';
  let nextDirection = 'right';
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameSpeed = 12;
  let gameRunning = false;
  let lastTime = 0;
  let accumulator = 0;
  let stepAccumulator = 0;
  let mobSpawnTimer = 0;
  let powerUpSpawnTimer = 0;
  let invincible = false;
  let invincibleTimer = 0;
  let scoreMultiplier = 1;
  let scoreMultiplierTimer = 0;

  const scoreEl = document.getElementById('score');
  const finalScoreEl = document.getElementById('final-score');
  const gameOverEl = document.getElementById('game-over');
  const restartBtn = document.getElementById('restart-btn');

  // =============================
  // Инициализация игры
  // =============================
  function initGame() {
    snake = [
      {x: 10, y: 10},
      {x: 9, y: 10},
      {x: 8, y: 10}
    ];
    
    mobs = [];
    powerUps = [];
    particles = [];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    lives = 3;
    level = 1;
    gameSpeed = 12;
    gameRunning = true;
    lastTime = 0;
    accumulator = 0;
    stepAccumulator = 0;
    mobSpawnTimer = 0;
    powerUpSpawnTimer = 0;
    invincible = false;
    invincibleTimer = 0;
    scoreMultiplier = 1;
    scoreMultiplierTimer = 0;
    
    generateFood();
    updateScore();
    requestAnimationFrame(gameLoop);
  }

  // =============================
  // Основной игровой цикл
  // =============================
  function gameLoop(currentTime) {
    if (!lastTime) lastTime = currentTime;
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    accumulator += deltaTime;
    
    while (accumulator >= FRAME_TIME) {
      if (gameRunning) {
        updateGame(FRAME_TIME);
      }
      accumulator -= FRAME_TIME;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
  }

  // =============================
  // Обновление игровой логики
  // =============================
  function updateGame(deltaTime) {
    mobSpawnTimer += deltaTime;
    powerUpSpawnTimer += deltaTime;
    
    if (invincible) {
      invincibleTimer -= deltaTime;
      if (invincibleTimer <= 0) {
        invincible = false;
      }
    }
    
    if (scoreMultiplier > 1) {
      scoreMultiplierTimer -= deltaTime;
      if (scoreMultiplierTimer <= 0) {
        scoreMultiplier = 1;
      }
    }
    
    particles = particles.filter(particle => {
      particle.life -= deltaTime;
      particle.x += particle.vx * (deltaTime / 16);
      particle.y += particle.vy * (deltaTime / 16);
      particle.alpha = particle.life / particle.maxLife;
      return particle.life > 0;
    });
    
    if (mobSpawnTimer >= Math.max(1000, 3000 - (level * 200))) {
      spawnMob();
      mobSpawnTimer = 0;
    }
    
    if (powerUpSpawnTimer >= 5000) {
      spawnPowerUp();
      powerUpSpawnTimer = 0;
    }
    
    powerUps = powerUps.filter(powerUp => {
      powerUp.timer = (powerUp.timer || 300) - 1;
      return powerUp.timer > 0;
    });
    
    stepAccumulator += deltaTime;
    if (stepAccumulator >= gameSpeed * FRAME_TIME) {
      stepAccumulator = 0;
      
      direction = nextDirection;
      
      const head = {...snake[0]};
      
      switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
      }
      
      if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        loseLife();
        return;
      }
      
      for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
          loseLife();
          return;
        }
      }
      
      let collidedWithMob = false;
      let mobToKill = -1;
      
      for (let i = 0; i < mobs.length; i++) {
        const mob = mobs[i];
        const mobHead = mob.body[0];
        
        if (head.x === mobHead.x && head.y === mobHead.y && !invincible) {
          mobToKill = i;
          const points = Math.floor(20 * level * scoreMultiplier);
          score += points;
          updateScore();
          createParticles(mobHead.x * GRID_SIZE + GRID_SIZE/2, mobHead.y * GRID_SIZE + GRID_SIZE/2, 10, '#ff5252');
          continue;
        }
        
        for (let segment of mob.body) {
          if (segment.x === head.x && segment.y === head.y && !invincible) {
            collidedWithMob = true;
            break;
          }
        }
        
        if (collidedWithMob) break;
      }
      
      if (mobToKill !== -1) {
        mobs.splice(mobToKill, 1);
      }
      
      if (collidedWithMob) {
        loseLife();
        return;
      }
      
      snake.unshift(head);
      
      if (head.x === food.x && head.y === food.y) {
        const points = Math.floor(10 * level * scoreMultiplier);
        score += points;
        updateScore();
        
        createParticles(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, 8, '#ff5252');
        
        if (score >= level * 50) {
          level++;
          if (gameSpeed > 3) {
            gameSpeed -= 0.4;
          }
          updateScore();
        }
        
        generateFood();
      } else {
        snake.pop();
      }
      
      powerUps = powerUps.filter(powerUp => {
        if (head.x === powerUp.x && head.y === powerUp.y) {
          switch (powerUp.type) {
            case 'life':
              lives = Math.min(lives + 1, 5);
              createParticles(powerUp.x * GRID_SIZE + GRID_SIZE/2, powerUp.y * GRID_SIZE + GRID_SIZE/2, 12, '#ff4081');
              break;
              
            case 'speed':
              const originalSpeed = gameSpeed;
              gameSpeed = Math.max(2, gameSpeed - 1.5);
              setTimeout(() => {
                gameSpeed = originalSpeed;
              }, 3000);
              createParticles(powerUp.x * GRID_SIZE + GRID_SIZE/2, powerUp.y * GRID_SIZE + GRID_SIZE/2, 12, '#448aff');
              break;
              
            case 'invincible':
              invincible = true;
              invincibleTimer = 5000;
              createParticles(powerUp.x * GRID_SIZE + GRID_SIZE/2, powerUp.y * GRID_SIZE + GRID_SIZE/2, 15, '#ffeb3b');
              break;
              
            case 'multiplier':
              scoreMultiplier = 2;
              scoreMultiplierTimer = 10000;
              createParticles(powerUp.x * GRID_SIZE + GRID_SIZE/2, powerUp.y * GRID_SIZE + GRID_SIZE/2, 12, '#9c27b0');
              break;
              
            case 'freeze':
              mobs.forEach(mob => {
                mob.frozen = true;
                mob.frozenTimer = 3000;
              });
              createParticles(powerUp.x * GRID_SIZE + GRID_SIZE/2, powerUp.y * GRID_SIZE + GRID_SIZE/2, 12, '#00bcd4');
              setTimeout(() => {
                mobs.forEach(mob => mob.frozen = false);
              }, 3000);
              break;
          }
          updateScore();
          return false;
        }
        return true;
      });
      
      updateMobs();
    }
  }

  // =============================
  // Создание частиц
  // =============================
  function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1000,
        maxLife: 1000,
        alpha: 1,
        color: color,
        size: Math.random() * 3 + 1
      });
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
      
      for (let segment of snake) {
        if (segment.x === newFood.x && segment.y === newFood.y) {
          onSnake = true;
          break;
        }
      }
      
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === newFood.x && segment.y === newFood.y) {
            onMobs = true;
            break;
          }
        }
        if (onMobs) break;
      }
      
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
    if (mobs.length >= Math.min(level + 2, 10)) return;
    
    let newMob;
    let onSnake, onMobs, onFood;
    let attempts = 0;
    
    do {
      onSnake = false;
      onMobs = false;
      onFood = false;
      attempts++;
      
      if (attempts > 50) return;
      
      const startPos = {
        x: Math.floor(Math.random() * (TILE_COUNT - 4)) + 2,
        y: Math.floor(Math.random() * (TILE_COUNT - 4)) + 2
      };
      
      const distanceToPlayer = Math.abs(startPos.x - snake[0].x) + Math.abs(startPos.y - snake[0].y);
      if (distanceToPlayer < 3) {
        onSnake = true;
        continue;
      }
      
      for (let segment of snake) {
        if (segment.x === startPos.x && segment.y === startPos.y) {
          onSnake = true;
          break;
        }
      }
      
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === startPos.x && segment.y === startPos.y) {
            onMobs = true;
            break;
          }
        }
        if (onMobs) break;
      }
      
      if (food.x === startPos.x && food.y === startPos.y) {
        onFood = true;
      }
      
      if (!onSnake && !onMobs && !onFood) {
        const length = Math.floor(Math.random() * 3) + 3;
        const body = [];
        for (let i = 0; i < length; i++) {
          body.push({x: startPos.x - i, y: startPos.y});
        }
        
        newMob = {
          body: body,
          direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
          color: `hsl(${Math.random() * 360}, 80%, 60%)`,
          speed: Math.random() * 0.5 + 0.3,
          moveAccumulator: 0,
          frozen: false,
          frozenTimer: 0,
          intelligence: Math.random() * 0.6 + 0.4,
          targetPlayerTimer: 0
        };
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
    if (powerUps.length >= 3) return;
    
    let newPowerUp;
    let onSnake, onMobs, onFood;
    let attempts = 0;
    
    do {
      onSnake = false;
      onMobs = false;
      onFood = false;
      attempts++;
      
      if (attempts > 30) return;
      
      const types = ['life', 'speed', 'invincible', 'multiplier', 'freeze'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      newPowerUp = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT),
        type: type,
        timer: 300
      };
      
      for (let segment of snake) {
        if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
          onSnake = true;
          break;
        }
      }
      
      for (let mob of mobs) {
        for (let segment of mob.body) {
          if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
            onMobs = true;
            break;
          }
        }
        if (onMobs) break;
      }
      
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
    mobs.forEach(mob => {
      if (mob.frozen) {
        mob.frozenTimer -= 16;
        if (mob.frozenTimer <= 0) {
          mob.frozen = false;
        }
        return;
      }
      
      mob.moveAccumulator += 1;
      
      if (mob.moveAccumulator >= (1 / mob.speed) * 20) {
        mob.moveAccumulator = 0;
        
        mob.targetPlayerTimer += 1;
        
        if (Math.random() < mob.intelligence || mob.targetPlayerTimer > 10) {
          const head = mob.body[0];
          const playerHead = snake[0];
          
          const dx = playerHead.x - head.x;
          const dy = playerHead.y - head.y;
          
          const possibleDirections = [];
          
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) possibleDirections.push('right');
            else possibleDirections.push('left');
            if (Math.random() < 0.3) {
              if (dy > 0) possibleDirections.push('down');
              else possibleDirections.push('up');
            }
          } else {
            if (dy > 0) possibleDirections.push('down');
            else possibleDirections.push('up');
            if (Math.random() < 0.3) {
              if (dx > 0) possibleDirections.push('right');
              else possibleDirections.push('left');
            }
          }
          
          if (possibleDirections.length > 0) {
            mob.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
          }
          
          mob.targetPlayerTimer = 0;
        } else if (Math.random() < 0.2) {
          const directions = ['up', 'down', 'left', 'right'];
          mob.direction = directions[Math.floor(Math.random() * directions.length)];
        }
        
        const head = {...mob.body[0]};
        
        switch (mob.direction) {
          case 'up': head.y--; break;
          case 'down': head.y++; break;
          case 'left': head.x--; break;
          case 'right': head.x++; break;
        }
        
        if (head.x >= 0 && head.x < TILE_COUNT && head.y >= 0 && head.y < TILE_COUNT) {
          let collisionWithSelf = false;
          for (let segment of mob.body) {
            if (segment.x === head.x && segment.y === head.y) {
              collisionWithSelf = true;
              break;
            }
          }
          
          let collisionWithPlayer = false;
          for (let segment of snake) {
            if (segment.x === head.x && segment.y === head.y) {
              collisionWithPlayer = true;
              break;
            }
          }
          
          if (!collisionWithSelf && !collisionWithPlayer) {
            mob.body.unshift(head);
            mob.body.pop();
          }
        }
      }
    });
  }

  // =============================
  // Отрисовка игры
  // =============================
  function draw() {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#1b263b');
    gradient.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.strokeStyle = '#415a77';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([2, 3]);
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
    ctx.setLineDash([]);
    
    // Рисуем игрока
    snake.forEach((segment, index) => {
      let x = segment.x * GRID_SIZE;
      let y = segment.y * GRID_SIZE;
      
      if (index === 0) {
        ctx.fillStyle = invincible ? '#ffeb3b' : '#4caf50';
        ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        
        // Глаза на голове
        ctx.fillStyle = '#000';
        const eyeSize = GRID_SIZE / 6;
        if (direction === 'right') {
          ctx.fillRect(x + GRID_SIZE - eyeSize - 2, y + 5, eyeSize, eyeSize);
          ctx.fillRect(x + GRID_SIZE - eyeSize - 2, y + GRID_SIZE - 5 - eyeSize, eyeSize, eyeSize);
        } else if (direction === 'left') {
          ctx.fillRect(x + 2, y + 5, eyeSize, eyeSize);
          ctx.fillRect(x + 2, y + GRID_SIZE - 5 - eyeSize, eyeSize, eyeSize);
        } else if (direction === 'up') {
          ctx.fillRect(x + 5, y + 2, eyeSize, eyeSize);
          ctx.fillRect(x + GRID_SIZE - 5 - eyeSize, y + 2, eyeSize, eyeSize);
        } else if (direction === 'down') {
          ctx.fillRect(x + 5, y + GRID_SIZE - eyeSize - 2, eyeSize, eyeSize);
          ctx.fillRect(x + GRID_SIZE - 5 - eyeSize, y + GRID_SIZE - eyeSize - 2, eyeSize, eyeSize);
        }
      } else {
        const intensity = Math.max(80, 200 - index * 2);
        ctx.fillStyle = `rgb(50, ${intensity}, 80)`;
        ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
      }
      
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    
    // Рисуем мобов
    mobs.forEach(mob => {
      mob.body.forEach((segment, segIndex) => {
        const x = segment.x * GRID_SIZE;
        const y = segment.y * GRID_SIZE;
        
        if (segIndex === 0) {
          ctx.fillStyle = mob.frozen ? '#00bcd4' : mob.color;
          ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
          
          // Глаза на голове моба
          ctx.fillStyle = '#000';
          const eyeSize = GRID_SIZE / 6;
          const mobDirection = mob.direction;
          
          if (mobDirection === 'right') {
            ctx.fillRect(x + GRID_SIZE - eyeSize - 2, y + 5, eyeSize, eyeSize);
            ctx.fillRect(x + GRID_SIZE - eyeSize - 2, y + GRID_SIZE - 5 - eyeSize, eyeSize, eyeSize);
          } else if (mobDirection === 'left') {
            ctx.fillRect(x + 2, y + 5, eyeSize, eyeSize);
            ctx.fillRect(x + 2, y + GRID_SIZE - 5 - eyeSize, eyeSize, eyeSize);
          } else if (mobDirection === 'up') {
            ctx.fillRect(x + 5, y + 2, eyeSize, eyeSize);
            ctx.fillRect(x + GRID_SIZE - 5 - eyeSize, y + 2, eyeSize, eyeSize);
          } else if (mobDirection === 'down') {
            ctx.fillRect(x + 5, y + GRID_SIZE - eyeSize - 2, eyeSize, eyeSize);
            ctx.fillRect(x + GRID_SIZE - 5 - eyeSize, y + GRID_SIZE - eyeSize - 2, eyeSize, eyeSize);
          }
        } else {
          const rgb = hexToRgb(mob.color);
          if (rgb) {
            const modifier = mob.frozen ? 100 : 40;
            ctx.fillStyle = `rgb(${Math.max(0, rgb.r - modifier)}, ${Math.max(0, rgb.g - modifier)}, ${Math.max(0, rgb.b - modifier)})`;
          } else {
            ctx.fillStyle = mob.color;
          }
          ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        }
        
        ctx.strokeStyle = mob.frozen ? '#008ba3' : '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
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
      let color, shape;
      switch (powerUp.type) {
        case 'life':
          color = '#ff4081';
          shape = 'heart';
          break;
        case 'speed':
          color = '#448aff';
          shape = 'star';
          break;
        case 'invincible':
          color = '#ffeb3b';
          shape = 'shield';
          break;
        case 'multiplier':
          color = '#9c27b0';
          shape = 'diamond';
          break;
        case 'freeze':
          color = '#00bcd4';
          shape = 'snowflake';
          break;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      
      const x = powerUp.x * GRID_SIZE + GRID_SIZE/2;
      const y = powerUp.y * GRID_SIZE + GRID_SIZE/2;
      const size = GRID_SIZE/3;
      
      switch (shape) {
        case 'heart':
          drawHeart(x, y, size);
          break;
        case 'star':
          drawStar(x, y, size);
          break;
        case 'shield':
          drawShield(x, y, size);
          break;
        case 'diamond':
          drawDiamond(x, y, size);
          break;
        case 'snowflake':
          drawSnowflake(x, y, size);
          break;
      }
      
      ctx.fill();
    });
    
    // Рисуем частицы
    particles.forEach(particle => {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    
    // Рисуем UI
    drawUI();
  }

  // =============================
  // Отрисовка UI
  // =============================
  function drawUI() {
    // Фон UI вне игрового поля
    ctx.fillStyle = 'rgba(13, 27, 42, 0.95)';
    ctx.fillRect(0, -40, GAME_WIDTH, 40); // Верхняя панель
    ctx.fillRect(0, GAME_HEIGHT, GAME_WIDTH, 40); // Нижняя панель
    
    // Верхний UI
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 15, -15);
    
    if (scoreMultiplier > 1) {
      ctx.fillStyle = '#9c27b0';
      ctx.fillText(`x${scoreMultiplier}`, 120, -15);
    }
    
    ctx.fillStyle = '#ff5252';
    ctx.textAlign = 'center';
    ctx.fillText(`❤️ ${lives}`, GAME_WIDTH/2, -15);
    
    ctx.fillStyle = '#2196f3';
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${level}`, GAME_WIDTH - 15, -15);
    
    // Нижний UI
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Speed: ${(13 - gameSpeed).toFixed(1)}`, 15, GAME_HEIGHT + 25);
    
    // Индикаторы
    if (invincible && invincibleTimer > 0) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
      ctx.fillRect(0, GAME_HEIGHT + 5, GAME_WIDTH, 4);
      ctx.fillStyle = '#ffeb3b';
      const width = (invincibleTimer / 5000) * GAME_WIDTH;
      ctx.fillRect(0, GAME_HEIGHT + 5, width, 4);
    }
    
    if (scoreMultiplier > 1 && scoreMultiplierTimer > 0) {
      ctx.fillStyle = 'rgba(156, 39, 176, 0.4)';
      ctx.fillRect(0, GAME_HEIGHT + 12, GAME_WIDTH, 4);
      ctx.fillStyle = '#9c27b0';
      const width = (scoreMultiplierTimer / 10000) * GAME_WIDTH;
      ctx.fillRect(0, GAME_HEIGHT + 12, width, 4);
    }
  }

  // =============================
  // Вспомогательные функции
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

  function drawShield(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.moveTo(x - size, y);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.closePath();
  }

  function drawDiamond(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
  }

  function drawSnowflake(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.moveTo(x + Math.cos(angle) * size/2, y + Math.sin(angle) * size/2);
      ctx.lineTo(x - Math.cos(angle) * size/2, y - Math.sin(angle) * size/2);
    }
    ctx.stroke();
  }

  // =============================
  // Управление
  // =============================
  function changeDirection(newDirection) {
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

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); changeDirection('up'); break;
      case 'ArrowDown': e.preventDefault(); changeDirection('down'); break;
      case 'ArrowLeft': e.preventDefault(); changeDirection('left'); break;
      case 'ArrowRight': e.preventDefault(); changeDirection('right'); break;
      case ' ': e.preventDefault(); if (!gameRunning) initGame(); break;
    }
  });

  document.getElementById('up-btn').addEventListener('click', () => changeDirection('up'));
  document.getElementById('down-btn').addEventListener('click', () => changeDirection('down'));
  document.getElementById('left-btn').addEventListener('click', () => changeDirection('left'));
  document.getElementById('right-btn').addEventListener('click', () => changeDirection('right'));

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
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) changeDirection('right');
      else changeDirection('left');
    } else {
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
    if (invincible) return;
    
    lives--;
    updateScore();
    
    if (lives <= 0) {
      gameOver();
    } else {
      invincible = true;
      invincibleTimer = 2000;
      
      gameRunning = false;
      setTimeout(() => {
        if (lives > 0) {
          gameRunning = true;
        }
      }, 500);
    }
  }

  // =============================
  // Game Over (АДАПТИРОВАНО ДЛЯ МЕНЮ)
  // =============================
  function gameOver() {
    gameRunning = false;
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.MainButton
        .setParams({ 
          text: `🏠 Back to Menu | Score: ${score}`, 
          color: '#4caf50' 
        })
        .show()
        .onClick(() => {
          // Сохраняем данные игры
          const gameData = {
            game: 'snake',
            score: score,
            level: level,
            timestamp: Date.now()
          };
          
          try {
            // Сохраняем в localStorage
            const existingData = JSON.parse(localStorage.getItem('snake_game_data') || '{}');
            const newData = {
              ...existingData,
              bestScore: Math.max(score, existingData.bestScore || 0),
              level: level,
              lastPlayed: Date.now()
            };
            localStorage.setItem('snake_game_data', JSON.stringify(newData));
          } catch (e) {
            console.error('Error saving game data:', e);
          }
          
          // Возвращаемся в меню
          window.location.href = '../../index.html#' + encodeURIComponent(JSON.stringify(gameData));
        });
    }
  }

  // =============================
  // Обновление счета
  // =============================
  function updateScore() {
    if (scoreEl) {
      scoreEl.textContent = `Score: ${score} | Lives: ${lives} | Level: ${level} | Speed: ${(13 - gameSpeed).toFixed(1)}`;
    }
    drawUI();
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
