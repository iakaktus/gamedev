window.addEventListener('DOMContentLoaded', () => {

  // =============================
  // Игровые константы
  // =============================
  const GRID_SIZE = 20;
  const TILE_COUNT = 20;
  const GAME_WIDTH = GRID_SIZE * TILE_COUNT;
  const GAME_HEIGHT = GRID_SIZE * TILE_COUNT;

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
  let food = {};
  let direction = 'right';
  let nextDirection = 'right';
  let score = 0;
  let gameSpeed = 150;
  let gameRunning = false;
  let gameLoop;

  const scoreEl = document.getElementById('score');
  const finalScoreEl = document.getElementById('final-score');
  const gameOverEl = document.getElementById('game-over');
  const restartBtn = document.getElementById('restart-btn');

  // =============================
  // Инициализация игры
  // =============================
  function initGame() {
    // Начальная позиция змейки
    snake = [
      {x: 10, y: 10},
      {x: 9, y: 10},
      {x: 8, y: 10}
    ];
    
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    gameSpeed = 150;
    gameRunning = true;
    
    generateFood();
    updateScore();
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, gameSpeed);
  }

  // =============================
  // Генерация еды
  // =============================
  function generateFood() {
    let newFood;
    let onSnake;
    
    do {
      onSnake = false;
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
    } while (onSnake);
    
    food = newFood;
  }

  // =============================
  // Один шаг игры
  // =============================
  function gameStep() {
    if (!gameRunning) return;
    
    // Обновляем направление
    direction = nextDirection;
    
    // Создаем новую голову
    const head = {...snake[0]};
    
    switch (direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }
    
    // Проверка столкновения со стенами
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
      gameOver();
      return;
    }
    
    // Проверка столкновения с собой
    for (let segment of snake) {
      if (segment.x === head.x && segment.y === head.y) {
        gameOver();
        return;
      }
    }
    
    // Добавляем голову
    snake.unshift(head);
    
    // Проверка съедания еды
    if (head.x === food.x && head.y === food.y) {
      // Увеличиваем счет
      score += 10;
      updateScore();
      
      // Увеличиваем скорость
      if (gameSpeed > 80) {
        gameSpeed -= 2;
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, gameSpeed);
      }
      
      generateFood();
    } else {
      // Удаляем хвост если не съели еду
      snake.pop();
    }
    
    // Рисуем всё
    draw();
  }

  // =============================
  // Отрисовка игры
  // =============================
  function draw() {
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
    
    // Рисуем змейку
    snake.forEach((segment, index) => {
      if (index === 0) {
        // Голова
        ctx.fillStyle = '#4caf50';
      } else {
        // Тело (градиент от темного к светлому)
        const colorValue = Math.max(100, 255 - index * 5);
        ctx.fillStyle = `rgb(50, ${colorValue}, 80)`;
      }
      
      ctx.fillRect(
        segment.x * GRID_SIZE, 
        segment.y * GRID_SIZE, 
        GRID_SIZE - 1, 
        GRID_SIZE - 1
      );
      
      // Граница сегмента
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        segment.x * GRID_SIZE, 
        segment.y * GRID_SIZE, 
        GRID_SIZE - 1, 
        GRID_SIZE - 1
      );
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
  // Game Over
  // =============================
  function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.MainButton
        .setParams({ text: `🐍 Score: ${score}`, color: '#4caf50' })
        .show()
        .onClick(() => {
          tg.sendData(JSON.stringify({ score: score, game: 'snake' }));
          tg.close();
        });
    }
  }

  // =============================
  // Обновление счета
  // =============================
  function updateScore() {
    scoreEl.textContent = `Score: ${score}`;
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
