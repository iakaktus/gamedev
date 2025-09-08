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
      
      // Добавляем ну
