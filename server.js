const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const publicDir = path.join(__dirname, 'public');
const cacheDir = path.join(__dirname, 'cache');
const usersFile = path.join(__dirname, 'users.json');

// Инициализация файлов
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');

// Middleware для статических файлов с явным указанием MIME-типов
app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

// Явные обработчики для критически важных файлов
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(publicDir, 'script.js'), {
        headers: {
            'Content-Type': 'application/javascript'
        }
    });
});

app.get('/auth.js', (req, res) => {
    res.sendFile(path.join(publicDir, 'auth.js'), {
        headers: {
            'Content-Type': 'application/javascript'
        }
    });
});

// Остальные middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Конфигурация сессии (остаётся без изменений)
app.use(session({
    secret: 'super_secret_key_12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Маршруты API
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Логин и пароль обязательны' });
        }

        const users = JSON.parse(fs.readFileSync(usersFile));
        if (users.some(u => u.username === username)) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ username, password: hashedPassword });
        fs.writeFileSync(usersFile, JSON.stringify(users));

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = JSON.parse(fs.readFileSync(usersFile));
        const user = users.find(u => u.username === username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        req.session.user = { username };
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка выхода' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    res.json({ user: req.session.user });
});

app.get('/data', (req, res) => {
    const cacheFile = path.join(cacheDir, 'data.json');
    const cacheTTL = 60;
    
    try {
        if (fs.existsSync(cacheFile)) {
            const stats = fs.statSync(cacheFile);
            const now = new Date().getTime();
            const fileAge = (now - stats.mtimeMs) / 1000;
            
            if (fileAge < cacheTTL) {
                const data = JSON.parse(fs.readFileSync(cacheFile));
                return res.json({ ...data, source: 'cache' });
            }
        }
        
        const newData = {
            items: Array.from({ length: 5 }, () => Math.floor(Math.random() * 100)),
            timestamp: Date.now(),
            source: 'database'
        };
        
        fs.writeFileSync(cacheFile, JSON.stringify(newData));
        
        setTimeout(() => {
            if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
        }, cacheTTL * 1000);
        
        res.json(newData);
    } catch (err) {
        console.error('Ошибка кэша:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/theme', (req, res) => {
    const { theme } = req.body;
    res.cookie('theme', theme, {
        maxAge: 86400000,
        httpOnly: true,
        sameSite: 'lax'
    });
    res.sendStatus(200);
});

// Явные обработчики для статических файлов (на случай проблем)
app.get(['/script.js', '/auth.js'], (req, res) => {
    const filePath = path.join(publicDir, req.path);
    res.sendFile(filePath, {
        headers: {
            'Content-Type': 'application/javascript'
        }
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Проверьте доступность файлов:`);
    console.log(`- http://localhost:${PORT}/script.js`);
    console.log(`- http://localhost:${PORT}/auth.js`);
    console.log(`- http://localhost:${PORT}/styles.css`);
});