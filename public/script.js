// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Обработчик смены темы
function setupThemeToggle() {
    const themeBtn = document.getElementById('toggle-theme');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', async () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Применяем тему
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Сохраняем на сервере
        try {
            await fetch('/theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: newTheme }),
                credentials: 'include'
            });
        } catch (err) {
            console.error('Ошибка сохранения темы:', err);
        }
    });
}

// Обновление данных
async function updateData() {
    try {
        const response = await fetch('/data', { credentials: 'include' });
        const data = await response.json();
        
        const container = document.getElementById('data-container');
        if (container) {
            container.innerHTML = `
                <p><strong>Источник:</strong> ${data.source === 'cache' ? 'Кэш' : 'БД'}</p>
                <p><strong>Время:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                <pre>${JSON.stringify(data.items, null, 2)}</pre>
            `;
        }
    } catch (err) {
        console.error('Ошибка загрузки данных:', err);
    }
}

// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('/profile', { credentials: 'include' });
        if (!response.ok) {
            window.location.href = '/index.html';
        } else {
            const data = await response.json();
            const usernameEl = document.getElementById('username-display');
            if (usernameEl) {
                usernameEl.textContent = data.user.username;
            }
        }
    } catch (err) {
        window.location.href = '/index.html';
    }
}

// Выход из системы
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/index.html';
        } catch (err) {
            console.error('Ошибка выхода:', err);
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();
    setupLogout();
    
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateData);
    }

    if (window.location.pathname.endsWith('profile.html')) {
        checkAuth().then(updateData);
    }
});