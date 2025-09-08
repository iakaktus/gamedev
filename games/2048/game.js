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
      const gameData = {
        game: '2048',
        score: score,
        bestScore: bestScore
      };
      
      // Сохраняем данные
      try {
        const existingData = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
        const newData = {
          ...existingData,
          bestScore: Math.max(score, existingData.bestScore || 0),
          lastScore: score,
          lastPlayed: Date.now()
        };
        localStorage.setItem('2048_game_data', JSON.stringify(newData));
      } catch (e) {
        console.error('Error saving 2048 data:', e);
      }
      
      window.location.href = '../../index.html#' + encodeURIComponent(JSON.stringify(gameData));
    });
  }

  // =============================
  // Игровые переменные
  // =============================
  let grid = [];
  let score = 0;
  let bestScore = 0;
  let gameOver = false;
  let gameWon = false;
  let keepPlaying = false;

  const gridSize = 4;
  const scoreElement = document.getElementById('score');
  const bestScoreElement = document.getElementById('best-score');
  const gameMessage = document.getElementById('game-message');
  const tileContainer = document.querySelector('.tile-container');
  const restartButton = document.getElementById('restart-btn');
  const retryButton = document.getElementById('retry-button');
  const keepPlayingButton = document.getElementById('keep-playing-button');

  // =============================
  // Инициализация игры
  // =============================
  function initGame() {
    // Загружаем лучший счет
    loadBestScore();
    
    // Создаем пустую сетку
    createGrid();
    
    // Добавляем начальные плитки
    addRandomTile();
    addRandomTile();
    
    // Обновляем отображение
    updateGame();
    
    // Скрываем сообщения
    gameMessage.classList.remove('game-won', 'game-over');
  }

  // =============================
  // Создание сетки
  // =============================
  function createGrid() {
    grid = [];
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = 0;
      }
    }
  }

  // =============================
  // Добавление случайной плитки
  // =============================
  function addRandomTile() {
    const emptyCells = [];
    
    // Находим все пустые ячейки
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] === 0) {
          emptyCells.push({ x: i, y: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      // Выбираем случайную пустую ячейку
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      
      // 90% шанс на 2, 10% шанс на 4
      const value = Math.random() < 0.9 ? 2 : 4;
      
      grid[randomCell.x][randomCell.y] = value;
    }
  }

  // =============================
  // Обновление отображения игры
  // =============================
  function updateGame() {
    // Очищаем контейнер плиток
    tileContainer.innerHTML = '';
    
    // Создаем плитки для каждой ячейки
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const value = grid[i][j];
        if (value !== 0) {
          const tile = document.createElement('div');
          tile.className = `tile tile-${value}`;
          if (value > 2048) {
            tile.classList.add('tile-super');
          }
          tile.textContent = value;
          tile.style.left = `${j * 25}%`;
          tile.style.top = `${i * 25}%`;
          tileContainer.appendChild(tile);
        }
      }
    }
    
    // Обновляем счет
    scoreElement.textContent = score;
    bestScoreElement.textContent = bestScore;
  }

  // =============================
  // Перемещение влево
  // =============================
  function moveLeft() {
    let moved = false;
    
    for (let i = 0; i < gridSize; i++) {
      // Удаляем нули и сжимаем
      const row = grid[i].filter(val => val !== 0);
      
      // Объединяем соседние одинаковые значения
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          row[j + 1] = 0;
          score += row[j];
          if (row[j] === 2048 && !keepPlaying) {
            gameWon = true;
          }
        }
      }
      
      // Удаляем нули после объединения
      const newRow = row.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (newRow.length < gridSize) {
        newRow.push(0);
      }
      
      // Проверяем, изменилась ли строка
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] !== newRow[j]) {
          moved = true;
        }
        grid[i][j] = newRow[j];
      }
    }
    
    return moved;
  }

  // =============================
  // Перемещение вправо
  // =============================
  function moveRight() {
    let moved = false;
    
    for (let i = 0; i < gridSize; i++) {
      // Удаляем нули и сжимаем
      const row = grid[i].filter(val => val !== 0);
      
      // Объединяем соседние одинаковые значения (справа налево)
      for (let j = row.length - 1; j > 0; j--) {
        if (row[j] === row[j - 1]) {
          row[j] *= 2;
          row[j - 1] = 0;
          score += row[j];
          if (row[j] === 2048 && !keepPlaying) {
            gameWon = true;
          }
        }
      }
      
      // Удаляем нули после объединения
      const newRow = row.filter(val => val !== 0);
      
      // Добавляем нули в начало
      while (newRow.length < gridSize) {
        newRow.unshift(0);
      }
      
      // Проверяем, изменилась ли строка
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] !== newRow[j]) {
          moved = true;
        }
        grid[i][j] = newRow[j];
      }
    }
    
    return moved;
  }

  // =============================
  // Перемещение вверх
  // =============================
  function moveUp() {
    let moved = false;
    
    for (let j = 0; j < gridSize; j++) {
      // Создаем столбец
      const column = [];
      for (let i = 0; i < gridSize; i++) {
        column.push(grid[i][j]);
      }
      
      // Удаляем нули и сжимаем
      const filteredColumn = column.filter(val => val !== 0);
      
      // Объединяем соседние одинаковые значения
      for (let i = 0; i < filteredColumn.length - 1; i++) {
        if (filteredColumn[i] === filteredColumn[i + 1]) {
          filteredColumn[i] *= 2;
          filteredColumn[i + 1] = 0;
          score += filteredColumn[i];
          if (filteredColumn[i] === 2048 && !keepPlaying) {
            gameWon = true;
          }
        }
      }
      
      // Удаляем нули после объединения
      const newColumn = filteredColumn.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (newColumn.length < gridSize) {
        newColumn.push(0);
      }
      
      // Проверяем, изменился ли столбец
      for (let i = 0; i < gridSize; i++) {
        if (grid[i][j] !== newColumn[i]) {
          moved = true;
        }
        grid[i][j] = newColumn[i];
      }
    }
    
    return moved;
  }

  // =============================
  // Перемещение вниз
  // =============================
  function moveDown() {
    let moved = false;
    
    for (let j = 0; j < gridSize; j++) {
      // Создаем столбец
      const column = [];
      for (let i = 0; i < gridSize; i++) {
        column.push(grid[i][j]);
      }
      
      // Удаляем нули и сжимаем
      const filteredColumn = column.filter(val => val !== 0);
      
      // Объединяем соседние одинаковые значения (снизу вверх)
      for (let i = filteredColumn.length - 1; i > 0; i--) {
        if (filteredColumn[i] === filteredColumn[i - 1]) {
          filteredColumn[i] *= 2;
          filteredColumn[i - 1] = 0;
          score += filteredColumn[i];
          if (filteredColumn[i] === 2048 && !keepPlaying) {
            gameWon = true;
          }
        }
      }
      
      // Удаляем нули после объединения
      const newColumn = filteredColumn.filter(val => val !== 0);
      
      // Добавляем нули в начало
      while (newColumn.length < gridSize) {
        newColumn.unshift(0);
      }
      
      // Проверяем, изменился ли столбец
      for (let i = 0; i < gridSize; i++) {
        if (grid[i][j] !== newColumn[i]) {
          moved = true;
        }
        grid[i][j] = newColumn[i];
      }
    }
    
    return moved;
  }

  // =============================
  // Проверка, есть ли пустые ячейки
  // =============================
  function hasEmptyCells() {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] === 0) {
          return true;
        }
      }
    }
    return false;
  }

  // =============================
  // Проверка, можно ли сделать ход
  // =============================
  function canMove() {
    // Проверяем пустые ячейки
    if (hasEmptyCells()) {
      return true;
    }
    
    // Проверяем соседние ячейки
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const current = grid[i][j];
        
        // Проверяем справа
        if (j < gridSize - 1 && grid[i][j + 1] === current) {
          return true;
        }
        
        // Проверяем снизу
        if (i < gridSize - 1 && grid[i + 1][j] === current) {
          return true;
        }
      }
    }
    
    return false;
  }

  // =============================
  // Обработка хода
  // =============================
  function makeMove(direction) {
    if (gameOver) return;
    
    let moved = false;
    
    switch (direction) {
      case 'left':
        moved = moveLeft();
        break;
      case 'right':
        moved = moveRight();
        break;
      case 'up':
        moved = moveUp();
        break;
      case 'down':
        moved = moveDown();
        break;
    }
    
    if (moved) {
      addRandomTile();
      updateGame();
      
      // Обновляем лучший счет
      if (score > bestScore) {
        bestScore = score;
        saveBestScore();
      }
      
      // Проверяем конец игры
      if (!canMove()) {
        gameOver = true;
        showGameOver();
      } else if (gameWon) {
        showGameWon();
      }
    }
  }

  // =============================
  // Показать победу
  // =============================
  function showGameWon() {
    gameMessage.classList.add('game-won');
    gameMessage.querySelector('p').textContent = 'You Win!';
  }

  // =============================
  // Показать проигрыш
  // =============================
  function showGameOver() {
    gameMessage.classList.add('game-over');
    gameMessage.querySelector('p').textContent = 'Game Over!';
  }

  // =============================
  // Загрузка лучшего счета
  // =============================
  function loadBestScore() {
    try {
      const data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
      bestScore = data.bestScore || 0;
      bestScoreElement.textContent = bestScore;
    } catch (e) {
      bestScore = 0;
    }
  }

  // =============================
  // Сохранение лучшего счета
  // =============================
  function saveBestScore() {
    try {
      const data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
      const newData = {
        ...data,
        bestScore: Math.max(bestScore, data.bestScore || 0)
      };
      localStorage.setItem('2048_game_data', JSON.stringify(newData));
    } catch (e) {
      console.error('Error saving best score:', e);
    }
  }

  // =============================
  // Обработка клавиатуры
  // =============================
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        makeMove('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        makeMove('right');
        break;
      case 'ArrowUp':
        e.preventDefault();
        makeMove('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        makeMove('down');
        break;
    }
  });

  // =============================
  // Свайпы для мобильных (ИСПРАВЛЕНО)
  // =============================
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    // Предотвращаем свайп вниз для закрытия приложения
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    // Предотвращаем свайп вниз для закрытия приложения
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    const minSwipeDistance = 30; // Минимальная дистанция свайпа
    
    // Определяем направление свайпа
    if (Math.abs(dx) > Math.abs(dy)) {
      // Горизонтальный свайп
      if (Math.abs(dx) > minSwipeDistance) {
        if (dx > 0) {
          makeMove('right');
        } else {
          makeMove('left');
        }
      }
    } else {
      // Вертикальный свайп
      if (Math.abs(dy) > minSwipeDistance) {
        if (dy > 0) {
          makeMove('down');
        } else {
          makeMove('up');
        }
      }
    }
    
    touchStartX = 0;
    touchStartY = 0;
    
    // Предотвращаем свайп вниз для закрытия приложения
    e.preventDefault();
  }, { passive: false });

  // =============================
  // Обработка кнопок
  // =============================
  restartButton.addEventListener('click', () => {
    score = 0;
    gameOver = false;
    gameWon = false;
    keepPlaying = false;
    initGame();
  });

  retryButton.addEventListener('click', () => {
    score = 0;
    gameOver = false;
    gameWon = false;
    keepPlaying = false;
    initGame();
  });

  keepPlayingButton.addEventListener('click', () => {
    keepPlaying = true;
    gameMessage.classList.remove('game-won');
  });

  // =============================
  // Запуск игры
  // =============================
  initGame();

});
