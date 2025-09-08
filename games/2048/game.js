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
        console.error('Error saving 2048 ', e);
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
      
      // Создаем плитку
      const tile = document.createElement('div');
      tile.className = `tile tile-${value} tile-new`;
      tile.textContent = value;
      tile.style.left = `${randomCell.y * 25}%`;
      tile.style.top = `${randomCell.x * 25}%`;
      tile.dataset.x = randomCell.x;
      tile.dataset.y = randomCell.y;
      tile.dataset.value = value;
      
      tileContainer.appendChild(tile);
      
      // Убираем класс анимации через немного времени
      setTimeout(() => {
        tile.classList.remove('tile-new');
      }, 100);
    }
  }

  // =============================
  // Обновление отображения игры
  // =============================
  function updateGame() {
    // Обновляем счет
    scoreElement.textContent = score;
    bestScoreElement.textContent = bestScore;
  }

  // =============================
  // Анимация перемещения плитки
  // =============================
  function animateTileMove(tileElement, fromX, fromY, toX, toY) {
    tileElement.style.transition = 'none';
    tileElement.style.transform = `translate(${(toY - fromY) * 100}%, ${(toX - fromX) * 100}%)`;
    
    // Принудительная перерисовка
    tileElement.offsetHeight;
    
    // Анимируем перемещение
    tileElement.style.transition = 'transform 0.15s ease';
    tileElement.style.transform = 'translate(0, 0)';
  }

  // =============================
  // Анимация объединения плиток
  // =============================
  function animateTileMerge(tileElement, newValue) {
    tileElement.classList.add('tile-merged');
    tileElement.textContent = newValue;
    
    // Обновляем класс
    tileElement.className = `tile tile-${newValue} tile-merged`;
    
    // Убираем класс анимации через немного времени
    setTimeout(() => {
      tileElement.classList.remove('tile-merged');
    }, 150);
  }

  // =============================
  // Перемещение влево
  // =============================
  function moveLeft() {
    let moved = false;
    
    for (let i = 0; i < gridSize; i++) {
      // Удаляем нули и сжимаем
      const row = grid[i].filter(val => val !== 0);
      const positions = [];
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] !== 0) {
          positions.push(j);
        }
      }
      
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
      const filteredRow = row.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (filteredRow.length < gridSize) {
        filteredRow.push(0);
      }
      
      // Анимируем перемещение и объединение
      for (let j = 0; j < positions.length; j++) {
        const oldPos = positions[j];
        const newPos = j;
        if (oldPos !== newPos) {
          moved = true;
          // Находим плитку и анимируем её перемещение
          const tileElement = document.querySelector(`.tile[data-x="${i}"][data-y="${oldPos}"]`);
          if (tileElement) {
            animateTileMove(tileElement, i, oldPos, i, newPos);
            tileElement.dataset.y = newPos;
          }
        }
      }
      
      // Анимируем объединение
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1] && row[j] !== 0) {
          const tileElement = document.querySelector(`.tile[data-x="${i}"][data-y="${j}"]`);
          if (tileElement) {
            animateTileMerge(tileElement, row[j] * 2);
            tileElement.dataset.value = row[j] * 2;
          }
          
          // Удаляем вторую плитку
          const secondTile = document.querySelector(`.tile[data-x="${i}"][data-y="${j + 1}"]`);
          if (secondTile) {
            secondTile.remove();
          }
        }
      }
      
      // Обновляем сетку
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = filteredRow[j] || 0;
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
      const positions = [];
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] !== 0) {
          positions.push(j);
        }
      }
      
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
      const filteredRow = row.filter(val => val !== 0);
      
      // Добавляем нули в начало
      const newRow = [];
      while (newRow.length < gridSize - filteredRow.length) {
        newRow.push(0);
      }
      newRow.push(...filteredRow);
      
      // Анимируем перемещение
      for (let j = 0; j < positions.length; j++) {
        const oldPos = positions[j];
        const newPos = newRow.length - filteredRow.length + j;
        if (oldPos !== newPos) {
          moved = true;
          // Находим плитку и анимируем её перемещение
          const tileElement = document.querySelector(`.tile[data-x="${i}"][data-y="${oldPos}"]`);
          if (tileElement) {
            animateTileMove(tileElement, i, oldPos, i, newPos);
            tileElement.dataset.y = newPos;
          }
        }
      }
      
      // Анимируем объединение
      for (let j = row.length - 1; j > 0; j--) {
        if (row[j] === row[j - 1] && row[j] !== 0) {
          const tileElement = document.querySelector(`.tile[data-x="${i}"][data-y="${gridSize - row.length + j}"]`);
          if (tileElement) {
            animateTileMerge(tileElement, row[j] * 2);
            tileElement.dataset.value = row[j] * 2;
          }
          
          // Удаляем вторую плитку
          const secondTile = document.querySelector(`.tile[data-x="${i}"][data-y="${gridSize - row.length + j - 1}"]`);
          if (secondTile) {
            secondTile.remove();
          }
        }
      }
      
      // Обновляем сетку
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = newRow[j] || 0;
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
      const positions = [];
      for (let i = 0; i < gridSize; i++) {
        if (grid[i][j] !== 0) {
          column.push(grid[i][j]);
          positions.push(i);
        }
      }
      
      // Объединяем соседние одинаковые значения
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          column[i] *= 2;
          column[i + 1] = 0;
          score += column[i];
          if (column[i] === 2048 && !keepPlaying) {
            gameWon = true;
          }
        }
      }
      
      // Удаляем нули после объединения
      const filteredColumn = column.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (filteredColumn.length < gridSize) {
        filteredColumn.push(0);
      }
      
      // Анимируем перемещение
      for (let i = 0; i < positions.length; i++) {
        const oldPos = positions[i];
        const newPos = i;
        if (oldPos !== newPos) {
          moved = true;
          // Находим плитку и анимируем её перемещение
          const tileElement = document.querySelector(`.tile[data-x="${oldPos}"][data-y="${j}"]`);
          if (tileElement) {
            animateTileMove(tileElement, oldPos, j, newPos, j);
            tileElement.dataset.x = newPos;
          }
        }
      }
      
      // Анимируем объединение
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1] && column[i] !== 0) {
          const tileElement = document.querySelector(`.tile[data-x="${i}"][data-y="${j}"]`);
          if (tileElement) {
            animateTileMerge(tileElement, column[i] * 2);
            tileElement.dataset.value = column[i] * 2;
          }
          
          // Удаляем вторую плитку
          const secondTile = document.querySelector(`.tile[data-x="${i + 1}"][data-y="${j}"]`);
          if (secondTile) {
            secondTile.remove();
          }
        }
      }
      
      // Обновляем сетку
      for (let i = 0; i < gridSize; i++) {
        grid[i][j] = filteredColumn[i] || 0;
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
      const positions = [];
      for (let i = 0; i < gridSize; i++) {
        if (grid[i][j] !== 0) {
          column.push(grid[i][j]);
          positions.push(i);
        }
      }
      
      // Объединяем соседние одинаковые значения (снизу вверх)
      for (let i = column.length - 1; i > 0; i--) {
        if (column[i] === column[i - 1]) {
          column[i] *= 2;
          column[i - 1] = 0;
          score += column[i];
          if (column[i] === 2048 && !keepPlaying) {
            gameWon = true;
          }
        }
      }
      
      // Удаляем нули после объединения
      const filteredColumn = column.filter(val => val !== 0);
      
      // Добавляем нули в начало
      const newColumn = [];
      while (newColumn.length < gridSize - filteredColumn.length) {
        newColumn.push(0);
      }
      newColumn.push(...filteredColumn);
      
      // Анимируем перемещение
      for (let i = 0; i < positions.length; i++) {
        const oldPos = positions[i];
        const newPos = newColumn.length - filteredColumn.length + i;
        if (oldPos !== newPos) {
          moved = true;
          // Находим плитку и анимируем её перемещение
          const tileElement = document.querySelector(`.tile[data-x="${oldPos}"][data-y="${j}"]`);
          if (tileElement) {
            animateTileMove(tileElement, oldPos, j, newPos, j);
            tileElement.dataset.x = newPos;
          }
        }
      }
      
      // Анимируем объединение
      for (let i = column.length - 1; i > 0; i--) {
        if (column[i] === column[i - 1] && column[i] !== 0) {
          const tileElement = document.querySelector(`.tile[data-x="${gridSize - column.length + i}"][data-y="${j}"]`);
          if (tileElement) {
            animateTileMerge(tileElement, column[i] * 2);
            tileElement.dataset.value = column[i] * 2;
          }
          
          // Удаляем вторую плитку
          const secondTile = document.querySelector(`.tile[data-x="${gridSize - column.length + i - 1}"][data-y="${j}"]`);
          if (secondTile) {
            secondTile.remove();
          }
        }
      }
      
      // Обновляем сетку
      for (let i = 0; i < gridSize; i++) {
        grid[i][j] = newColumn[i] || 0;
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
      // Ждем окончания анимаций, затем добавляем новую плитку
      setTimeout(() => {
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
          setTimeout(() => {
            showGameOver();
          }, 300);
        } else if (gameWon) {
          setTimeout(() => {
            showGameWon();
          }, 300);
        }
      }, 150);
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
  // Свайпы для мобильных
  // =============================
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
