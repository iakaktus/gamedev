window.addEventListener('DOMContentLoaded', () => {

  // =============================
  // Telegram WebApp инициализация
  // =============================
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.BackButton.isVisible = false;
  }

  // =============================
  // Показываем имя пользователя
  // =============================
  const userNameElement = document.getElementById('user-name');
  if (tg && tg.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    const name = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    userNameElement.textContent = name || 'Player';
  } else {
    userNameElement.textContent = 'Player';
  }

  // =============================
  // Загрузка сохраненных данных
  // =============================
  function loadGameStats() {
    try {
      const snakeData = JSON.parse(localStorage.getItem('snake_game_data') || '{}');
      const game2048Data = JSON.parse(localStorage.getItem('2048_game_data') || '{}');
      
      document.getElementById('snake-level').textContent = snakeData.level || '1';
      document.getElementById('snake-best').textContent = snakeData.bestScore || '0';
      
      document.getElementById('2048-best').textContent = game2048Data.bestScore || '0';
      document.getElementById('2048-score').textContent = game2048Data.lastScore || '0';
    } catch (e) {
      console.error('Error loading game stats:', e);
    }
  }

  // =============================
  // Сохранение данных игр
  // =============================
  function saveGameData(gameName, data) {
    try {
      const existingData = JSON.parse(localStorage.getItem(`${gameName}_game_data`) || '{}');
      const newData = { ...existingData, ...data };
      localStorage.setItem(`${gameName}_game_data`, JSON.stringify(newData));
      loadGameStats(); // Обновляем отображение
    } catch (e) {
      console.error('Error saving game ', e);
    }
  }

  // =============================
  // Обработка выбора игры
  // =============================
  document.querySelectorAll('.game-card[data-game]').forEach(card => {
    card.addEventListener('click', () => {
      const gameName = card.dataset.game;
      
      // Добавляем эффект загрузки
      card.classList.add('loading');
      
      // Загружаем игру
      setTimeout(() => {
        loadGame(gameName);
      }, 300);
    });
  });

  // =============================
  // Загрузка игры
  // =============================
  function loadGame(gameName) {
    if (tg) {
      // В Telegram используем встроенную навигацию
      window.location.href = `games/${gameName}/index.html`;
    } else {
      // Для локальной разработки
      window.location.href = `games/${gameName}/index.html`;
    }
  }

  // =============================
  // Обработка данных из игр (при возврате)
  // =============================
  function handleGameData() {
    // Проверяем, есть ли данные от игр
    if (window.location.hash) {
      try {
        const hashData = window.location.hash.substring(1);
        const data = JSON.parse(decodeURIComponent(hashData));
        
        if (data.game) {
          saveGameData(data.game, {
            bestScore: Math.max(
              data.score || 0, 
              JSON.parse(localStorage.getItem(`${data.game}_game_data`) || '{}').bestScore || 0
            ),
            lastScore: data.score || 0,
            level: data.level || 1,
            lastPlayed: Date.now()
          });
        }
        
        // Очищаем hash
        window.location.hash = '';
      } catch (e) {
        console.error('Error parsing game data:', e);
      }
    }
  }

  // =============================
  // Обработка кнопки "Назад" в Telegram
  // =============================
  if (tg) {
    tg.onEvent('backButtonClicked', () => {
      // Возвращаемся в меню
      window.location.href = '../index.html';
    });
  }

  // =============================
  // Инициализация
  // =============================
  loadGameStats();
  handleGameData();

  // =============================
  // Анимация при загрузке
  // =============================
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  
  setTimeout(() => {
    document.body.style.opacity = '1';
  }, 100);

});
