window.addEventListener('DOMContentLoaded', () => {
  // Telegram WebApp
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.BackButton.show();
    
    tg.BackButton.onClick(() => {
      const score = parseInt(document.querySelector('.score-value').textContent) || 0;
      const bestScore = parseInt(document.querySelector('.best-value').textContent) || 0;
      
      const gameData = {
        game: '2048',
        score: score,
        bestScore: bestScore
      };
      
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

  // Game logic
  const GRID_SIZE = 4;
  let grid = [];
  let score = 0;
  let bestScore = 0;
  let gameOver = false;
  let gameWon = false;
  let keepPlaying = false;

  // DOM elements
  const scoreContainer = document.querySelector('.score-container .score-value');
  const bestContainer = document.querySelector('.best-container .best-value');
  const gameMessage = document.querySelector('.game-message');
  const tileContainer = document.querySelector('.tile-container');
  const restartButton = document.querySelector('.restart-button');
  const retryButton = document.querySelector('.retry-button');
  const keepPlayingButton = document.querySelector('.keep-playing-button');

  // Initialize game
  function initGame() {
    loadBestScore();
    createGrid();
    addRandomTile();
    addRandomTile();
    updateScore();
    hideMessage();
  }

  // Create empty grid
  function createGrid() {
    grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      grid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        grid[i][j] = 0;
      }
    }
  }

  // Add random tile
  function addRandomTile() {
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;
      grid[randomCell.row][randomCell.col] = value;
      addTile(randomCell.row, randomCell.col, value);
    }
  }

  // Add tile to DOM
  function addTile(row, col, value) {
    const tile = document.createElement('div');
    tile.className = `tile tile-${value} tile-new`;
    tile.innerHTML = `<div class="tile-inner">${value}</div>`;
    tile.style.transform = `translate(${col * 25}%, ${row * 25}%)`;
    tile.dataset.row = row;
    tile.dataset.col = col;
    tileContainer.appendChild(tile);

    setTimeout(() => {
      tile.classList.remove('tile-new');
    }, 200);
  }

  // Update score display
  function updateScore() {
    scoreContainer.textContent = score;
    bestContainer.textContent = bestScore;
  }

  // Load best score from localStorage
  function loadBestScore() {
    try {
      const data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
      bestScore = data.bestScore || 0;
    } catch (e) {
      bestScore = 0;
    }
  }

  // Save best score to localStorage
  function saveBestScore() {
    if (score > bestScore) {
      bestScore = score;
      try {
        const data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
        const newData = {
          ...data,
          bestScore: bestScore
        };
        localStorage.setItem('2048_game_data', JSON.stringify(newData));
      } catch (e) {
        console.error('Error saving best score:', e);
      }
    }
    updateScore();
  }

  // Move left
  function moveLeft() {
    let moved = false;
    for (let row =0; row < GRID_SIZE; row++) {
      const rowValues = grid[row].filter(val => val !== 0);
      
      // Merge tiles
      for (let i = 0; i < rowValues.length - 1; i++) {
        if (rowValues[i] === rowValues[i + 1]) {
          rowValues[i] *= 2;
          rowValues[i + 1] = 0;
          score += rowValues[i];
          if (rowValues[i] === 2048 && !gameWon) {
            gameWon = true;
          }
        }
      }
      
      // Remove zeros
      const filteredRow = rowValues.filter(val => val !== 0);
      
      // Add zeros to end
      while (filteredRow.length < GRID_SIZE) {
        filteredRow.push(0);
      }
      
      // Check if row changed
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] !== filteredRow[col]) {
          moved = true;
        }
        grid[row][col] = filteredRow[col];
      }
    }
    return moved;
  }

  // Move right
  function moveRight() {
    let moved = false;
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowValues = grid[row].filter(val => val !== 0);
      
      // Merge tiles from right to left
      for (let i = rowValues.length - 1; i > 0; i--) {
        if (rowValues[i] === rowValues[i - 1]) {
          rowValues[i] *= 2;
          rowValues[i - 1] = 0;
          score += rowValues[i];
          if (rowValues[i] === 2048 && !gameWon) {
            gameWon = true;
          }
        }
      }
      
      // Remove zeros
      const filteredRow = rowValues.filter(val => val !== 0);
      
      // Add zeros to beginning
      const newRow = Array(GRID_SIZE).fill(0);
      for (let i = 0; i < filteredRow.length; i++) {
        newRow[GRID_SIZE - filteredRow.length + i] = filteredRow[i];
      }
      
      // Check if row changed
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] !== newRow[col]) {
          moved = true;
        }
        grid[row][col] = newRow[col];
      }
    }
    return moved;
  }

  // Move up
  function moveUp() {
    let moved = false;
    for (let col = 0; col < GRID_SIZE; col++) {
      const colValues = [];
      for (let row = 0; row < GRID_SIZE; row++) {
        if (grid[row][col] !== 0) {
          colValues.push(grid[row][col]);
        }
      }
      
      // Merge tiles
      for (let i = 0; i < colValues.length - 1; i++) {
        if (colValues[i] === colValues[i + 1]) {
          colValues[i] *= 2;
          colValues[i + 1] = 0;
          score += colValues[i];
          if (colValues[i] === 2048 && !gameWon) {
            gameWon = true;
          }
        }
      }
      
      // Remove zeros
      const filteredCol = colValues.filter(val => val !== 0);
      
      // Add zeros to end
      while (filteredCol.length < GRID_SIZE) {
        filteredCol.push(0);
      }
      
      // Check if column changed
      for (let row = 0; row < GRID_SIZE; row++) {
        if (grid[row][col] !== filteredCol[row]) {
          moved = true;
        }
        grid[row][col] = filteredCol[row];
      }
    }
    return moved;
  }

  // Move down
  function moveDown() {
    let moved = false;
    for (let col =0; col < GRID_SIZE; col++) {
      const colValues = [];
      for (let row = 0; row < GRID_SIZE; row++) {
        if (grid[row][col] !== 0) {
          colValues.push(grid[row][col]);
        }
      }
      
      // Merge tiles from bottom to top
      for (let i = colValues.length - 1; i > 0; i--) {
        if (colValues[i] === colValues[i - 1]) {
          colValues[i] *= 2;
          colValues[i - 1] = 0;
          score += colValues[i];
          if (colValues[i] === 2048 && !gameWon) {
            gameWon = true;
          }
        }
      }
      
      // Remove zeros
      const filteredCol = colValues.filter(val => val !== 0);
      
      // Add zeros to beginning
      const newCol = Array(GRID_SIZE).fill(0);
      for (let i = 0; i < filteredCol.length; i++) {
        newCol[GRID_SIZE - filteredCol.length + i] = filteredCol[i];
      }
      
      // Check if column changed
      for (let row = 0; row < GRID_SIZE; row++) {
        if (grid[row][col] !== newCol[row]) {
          moved = true;
        }
        grid[row][col] = newCol[row];
      }
    }
    return moved;
  }

  // Make move
  function makeMove(direction) {
    if (gameOver) return false;
    
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
      // Update tiles display
      tileContainer.innerHTML = '';
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (grid[row][col] !== 0) {
            addTile(row, col, grid[row][col]);
          }
        }
      }
      
      setTimeout(() => {
        addRandomTile();
        updateScore();
        saveBestScore();
        
        if (!canMove()) {
          gameOver = true;
          showMessage('Game Over!', false);
        } else if (gameWon && !keepPlaying) {
          showMessage('You Win!', true);
        }
      }, 150);
    }
    
    return moved;
  }

  // Check if can move
  function canMove() {
    // Check for empty cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === 0) {
          return true;
        }
      }
    }
    
    // Check adjacent cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const current = grid[row][col];
        
        // Check right
        if (col < GRID_SIZE - 1 && grid[row][col + 1] === current) {
          return true;
        }
        
        // Check down
        if (row < GRID_SIZE - 1 && grid[row + 1][col] === current) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Show message
  function showMessage(text, showKeepPlaying) {
    gameMessage.querySelector('p').textContent = text;
    gameMessage.classList.add(showKeepPlaying ? 'game-won' : 'game-over');
    
    if (showKeepPlaying) {
      keepPlayingButton.style.display = 'inline-block';
    } else {
      keepPlayingButton.style.display = 'none';
    }
  }

  // Hide message
  function hideMessage() {
    gameMessage.classList.remove('game-won', 'game-over');
  }

  // Reset game
  function resetGame() {
    score = 0;
    gameOver = false;
    gameWon = false;
    keepPlaying = false;
    tileContainer.innerHTML = '';
    initGame();
  }

  // Event listeners
  restartButton.addEventListener('click', resetGame);
  retryButton.addEventListener('click', resetGame);
  keepPlayingButton.addEventListener('click', () => {
    keepPlaying = true;
    hideMessage();
  });

  // Keyboard controls
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

  // Touch controls
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
        makeMove('right');
      } else {
        makeMove('left');
      }
    } else {
      if (dy > 0) {
        makeMove('down');
      } else {
        makeMove('up');
      }
    }
    
    touchStartX = 0;
    touchStartY = 0;
    e.preventDefault();
  }, { passive: false });

  // Initialize game
  initGame();
});
