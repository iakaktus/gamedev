class Game2048 {
  constructor() {
    this.grid = [];
    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.keepPlaying = false;
    this.size = 4;
    this.tiles = [];
    
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
          console.error('Error saving 2048 data:', e);
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
  
  move(direction) {
    if (this.gameOver) return false;
    
    const oldGrid = JSON.parse(JSON.stringify(this.grid));
    let moved = false;
    
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
  
  moveLeft() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      const line = this.grid[row].filter(val => val !== 0);
      
      // Объединяем
      for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === line[i + 1]) {
          line[i] *= 2;
          line[i + 1] = 0;
          this.score += line[i];
          if (line[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredLine = line.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (filteredLine.length < this.size) {
        filteredLine.push(0);
      }
      
      // Проверяем изменения
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== filteredLine[col]) {
          moved = true;
        }
        this.grid[row][col] = filteredLine[col];
      }
    }
    
    return moved;
  }
  
  moveRight() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      const line = this.grid[row].filter(val => val !== 0);
      
      // Объединяем справа налево
      for (let i = line.length - 1; i > 0; i--) {
        if (line[i] === line[i - 1]) {
          line[i] *= 2;
          line[i - 1] = 0;
          this.score += line[i];
          if (line[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredLine = line.filter(val => val !== 0);
      
      // Добавляем нули в начало
      const newLine = Array(this.size).fill(0);
      for (let i = 0; i < filteredLine.length; i++) {
        newLine[this.size - filteredLine.length + i] = filteredLine[i];
      }
      
      // Проверяем изменения
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== newLine[col]) {
          moved = true;
        }
        this.grid[row][col] = newLine[col];
      }
    }
    
    return moved;
  }
  
  moveUp() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      const column = [];
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== 0) {
          column.push(this.grid[row][col]);
        }
      }
      
      // Объединяем
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          column[i] *= 2;
          column[i + 1] = 0;
          this.score += column[i];
          if (column[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredColumn = column.filter(val => val !== 0);
      
      // Добавляем нули в конец
      while (filteredColumn.length < this.size) {
        filteredColumn.push(0);
      }
      
      // Проверяем изменения
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== filteredColumn[row]) {
          moved = true;
        }
        this.grid[row][col] = filteredColumn[row];
      }
    }
    
    return moved;
  }
  
  moveDown() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      const column = [];
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== 0) {
          column.push(this.grid[row][col]);
        }
      }
      
      // Объединяем снизу вверх
      for (let i = column.length - 1; i > 0; i--) {
        if (column[i] === column[i - 1]) {
          column[i] *= 2;
          column[i - 1] = 0;
          this.score += column[i];
          if (column[i] === 2048 && !this.gameWon) {
            this.gameWon = true;
          }
        }
      }
      
      // Убираем нули
      const filteredColumn = column.filter(val => val !== 0);
      
      // Добавляем нули в начало
      const newColumn = Array(this.size).fill(0);
      for (let i = 0; i < filteredColumn.length; i++) {
        newColumn[this.size - filteredColumn.length + i] = filteredColumn[i];
      }
      
      // Проверяем изменения
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col] !== newColumn[row]) {
          moved = true;
        }
        this.grid[row][col] = newColumn[row];
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
      document.querySelector('.keep-playing').style.display = 'block';
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
