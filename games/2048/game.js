class Game2048 {
  constructor() {
    this.grid = [];
    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.keepPlaying = false;
    this.size = 4;
    
    this.initializeElements();
    this.initializeGame();
    this.setupEventListeners();
    this.setupTelegram();
  }
  
  initializeElements() {
    this.scoreElement = document.getElementById('score');
    this.bestScoreElement = document.getElementById('best-score');
    this.tilesContainer = document.getElementById('tiles-container');
    this.gameMessage = document.getElementById('game-message');
    this.newGameBtn = document.getElementById('new-game');
    this.retryBtn = document.getElementById('retry-btn');
    this.keepPlayingBtn = document.getElementById('keep-playing');
    this.gridContainer = document.querySelector('.grid-container');
    
    // Создаем сетку
    this.createGrid();
  }
  
  createGrid() {
    this.gridContainer.innerHTML = '';
    for (let i = 0; i < this.size * this.size; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      this.gridContainer.appendChild(cell);
    }
  }
  
  setupTelegram() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.BackButton.show();
      
      tg.BackButton.onClick(() => {
        const gameData = {
          game: '2048',
          score: this.score,
          bestScore: this.bestScore
        };
        
        try {
          const existingData = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
          const newData = {
            ...existingData,
            bestScore: Math.max(this.score, existingData.bestScore || 0),
            lastScore: this.score,
            lastPlayed: Date.now()
          };
          localStorage.setItem('2048_game_data', JSON.stringify(newData));
        } catch (e) {
          console.error('Error saving 2048 ', e);
        }
        
        window.location.href = '../../index.html#' + encodeURIComponent(JSON.stringify(gameData));
      });
    }
  }
  
  initializeGame() {
    this.loadBestScore();
    this.createEmptyGrid();
    this.addRandomTile();
    this.addRandomTile();
    this.updateScore();
    this.hideMessage();
  }
  
  createEmptyGrid() {
    this.grid = [];
    for (let i = 0; i < this.size; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.size; j++) {
        this.grid[i][j] = 0;
      }
    }
  }
  
  addRandomTile() {
    const emptyCells = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.grid[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;
      
      this.grid[randomCell.row][randomCell.col] = value;
      this.createTileElement(randomCell.row, randomCell.col, value, true);
    }
  }
  
  createTileElement(row, col, value, isNew = false) {
    const tile = document.createElement('div');
    tile.className = `tile tile-${value}`;
    if (isNew) {
      tile.classList.add('tile-new');
    }
    tile.textContent = value;
    tile.dataset.row = row;
    tile.dataset.col = col;
    tile.dataset.value = value;
    
    // Позиционирование
    tile.style.left = `${col * 25}%`;
    tile.style.top = `${row * 25}%`;
    
    this.tilesContainer.appendChild(tile);
    
    if (isNew) {
      setTimeout(() => {
        tile.classList.remove('tile-new');
      }, 100);
    }
    
    return tile;
  }
  
  updateScore() {
    this.scoreElement.textContent = this.score;
    this.bestScoreElement.textContent = this.bestScore;
  }
  
  loadBestScore() {
    try {
      const data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
      this.bestScore = data.bestScore || 0;
    } catch (e) {
      this.bestScore = 0;
    }
  }
  
  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        const data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
        const newData = {
          ...data,
          bestScore: this.bestScore
        };
        localStorage.setItem('2048_game_data', JSON.stringify(newData));
      } catch (e) {
        console.error('Error saving best score:', e);
      }
    }
    this.updateScore();
  }
  
  // Функция для анимации движения плитки
  animateTileMove(tile, fromRow, fromCol, toRow, toCol) {
    const dx = (toCol - fromCol) * 25;
    const dy = (toRow - fromRow) * 25;
    
    tile.style.transition = 'none';
    tile.style.transform = `translate(${dx}%, ${dy}%)`;
    
    // Принудительная перерисовка
    tile.offsetHeight;
    
    // Анимируем перемещение
    tile.style.transition = 'transform 0.15s ease';
    tile.style.transform = 'translate(0, 0)';
    
    // Обновляем позиции в data-атрибутах
    tile.dataset.row = toRow;
    tile.dataset.col = toCol;
  }
  
  // Функция для анимации объединения плиток
  animateTileMerge(tile, newValue) {
    tile.classList.add('tile-merged');
    tile.textContent = newValue;
    tile.dataset.value = newValue;
    
    // Обновляем класс
    tile.className = `tile tile-${newValue} tile-merged`;
    
    // Убираем класс анимации через немного времени
    setTimeout(() => {
      tile.classList.remove('tile-merged');
    }, 150);
  }
  
  move(direction) {
    if (this.gameOver) return false;
    
    let moved = false;
    
    // Создаем копию текущего состояния для анимаций
    const oldGrid = JSON.parse(JSON.stringify(this.grid));
    
    switch (direction) {
      case 'left':
        moved = this.moveLeft();
        break;
      case 'right':
        moved = this.moveRight();
        break;
      case 'up':
        moved = this.moveUp();
        break;
      case 'down':
        moved = this.moveDown();
        break;
    }
    
    if (moved) {
      // Анимируем изменения
      this.animateMoves(oldGrid);
      
      setTimeout(() => {
        this.addRandomTile();
        this.updateScore();
        this.saveBestScore();
        
        if (!this.canMove()) {
          this.gameOver = true;
          setTimeout(() => this.showMessage('Game Over!', false), 300);
        } else if (this.gameWon && !this.keepPlaying) {
          setTimeout(() => this.showMessage('You Win!', true), 300);
        }
      }, 150);
    }
    
    return moved;
  }
  
  // Анимируем все перемещения
  animateMoves(oldGrid) {
    // Удаляем все существующие плитки
    this.tilesContainer.innerHTML = '';
    
    // Создаем новые плитки на основе текущего состояния
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== 0) {
          this.createTileElement(row, col, this.grid[row][col]);
        }
      }
    }
  }
  
  moveLeft() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Получаем непустые значения в строке
      const values = [];
      const positions = [];
      
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== 0) {
          values.push(this.grid[row][col]);
          positions.push(col);
        }
      }
      
      // Объединяем соседние одинаковые значения
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] === values[i + 1]) {
          values[i] *= 2;
          values[i + 1] = 0;
          this.score += values[i];
          if (values[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredValues = values.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (filteredValues.length < this.size) {
        filteredValues.push(0);
      }
      
      // Проверяем изменения и обновляем сетку
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== filteredValues[col]) {
          moved = true;
        }
        this.grid[row][col] = filteredValues[col];
      }
    }
    
    return moved;
  }
  
  moveRight() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Получаем непустые значения в строке
      const values = [];
      const positions = [];
      
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== 0) {
          values.push(this.grid[row][col]);
          positions.push(col);
        }
      }
      
      // Объединяем соседние одинаковые значения справа налево
      for (let i = values.length - 1; i > 0; i--) {
        if (values[i] === values[i - 1]) {
          values[i] *= 2;
          values[i - 1] = 0;
          this.score += values[i];
          if (values[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredValues = values.filter(val => val !== 0);
      
      // Добавляем нули в начало
      const newValues = Array(this.size).fill(0);
      for (let i = 0; i < filteredValues.length; i++) {
        newValues[this.size - filteredValues.length + i] = filteredValues[i];
      }
      
      // Проверяем изменения и обновляем сетку
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== newValues[col]) {
          moved = true;
        }
        this.grid[row][col] = newValues[col];
      }
    }
    
    return moved;
  }
  
  moveUp() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Получаем непустые значения в столбце
      const values = [];
      
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== 0) {
          values.push(this.grid[row][col]);
        }
      }
      
      // Объединяем соседние одинаковые значения
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] === values[i + 1]) {
          values[i] *= 2;
          values[i + 1] = 0;
          this.score += values[i];
          if (values[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredValues = values.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (filteredValues.length < this.size) {
        filteredValues.push(0);
      }
      
      // Проверяем изменения и обновляем сетку
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== filteredValues[row]) {
          moved = true;
        }
        this.grid[row][col] = filteredValues[row];
      }
    }
    
    return moved;
  }
  
  moveDown() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Получаем непустые значения в столбце
      const values = [];
      
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== 0) {
          values.push(this.grid[row][col]);
        }
      }
      
      // Объединяем соседние одинаковые значения снизу вверх
      for (let i = values.length - 1; i > 0; i--) {
        if (values[i] === values[i - 1]) {
          values[i] *= 2;
          values[i - 1] = 0;
          this.score += values[i];
          if (values[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredValues = values.filter(val => val !== 0);
      
      // Добавляем нули в начало
      const newValues = Array(this.size).fill(0);
      for (let i = 0; i < filteredValues.length; i++) {
        newValues[this.size - filteredValues.length + i] = filteredValues[i];
      }
      
      // Проверяем изменения и обновляем сетку
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== newValues[row]) {
          moved = true;
        }
        this.grid[row][col] = newValues[row];
      }
    }
    
    return moved;
  }
  
  canMove() {
    // Проверяем пустые клетки
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] === 0) {
          return true;
        }
      }
    }
    
    // Проверяем соседние клетки
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const current = this.grid[row][col];
        
        // Проверяем справа
        if (col < this.size - 1 && this.grid[row][col + 1] === current) {
          return true;
        }
        
        // Проверяем снизу
        if (row < this.size - 1 && this.grid[row + 1][col] === current) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  showMessage(text, showKeepPlaying) {
    this.gameMessage.querySelector('p').textContent = text;
    this.gameMessage.classList.add('show');
    
    if (showKeepPlaying) {
      document.querySelector('.keep-playing').style.display = 'inline-block';
    } else {
      document.querySelector('.keep-playing').style.display = 'none';
    }
  }
  
  hideMessage() {
    this.gameMessage.classList.remove('show');
  }
  
  resetGame() {
    this.score = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.keepPlaying = false;
    this.tilesContainer.innerHTML = '';
    this.initializeGame();
  }
  
  setupEventListeners() {
    // Кнопки
    this.newGameBtn.addEventListener('click', () => this.resetGame());
    this.retryBtn.addEventListener('click', () => this.resetGame());
    this.keepPlayingBtn.addEventListener('click', () => {
      this.keepPlaying = true;
      this.hideMessage();
    });
    
    // Клавиатура
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.move('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.move('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.move('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.move('down');
          break;
      }
    });
    
    // Свайпы
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
      if (!touchStartX || !touchStartY) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      
      const minSwipeDistance = 30;
      
      if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
        touchStartX = 0;
        touchStartY = 0;
        return;
      }
      
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          this.move('right');
        } else {
          this.move('left');
        }
      } else {
        if (dy > 0) {
          this.move('down');
        } else {
          this.move('up');
        }
      }
      
      touchStartX = 0;
      touchStartY = 0;
      e.preventDefault();
    }, { passive: false });
  }
}

// Запуск игры
window.addEventListener('DOMContentLoaded', () => {
  new Game2048();
});
