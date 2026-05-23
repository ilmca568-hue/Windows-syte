// ================================================================
//  AdminOS Web 3.0 — main.js
// ================================================================
import './style.css';

const AdminOS = {
    zIndexCounter: 100,
    activeWindows: {},
    minimizedWindows: {},
    notesDB: {},
    fileSystem: {},
    notifHistory: [],
    currentDesktop: 0,
    totalDesktops: 3,
    desktopWindows: [{}, {}, {}],
    liveWallpaperActive: false,
    liveWallpaperAnim: null,

    settings: {
        username: 'Администратор',
        wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920',
        accentColor: '#0078d4',
        theme: 'dark',
        liveWallpaper: false,
        wallpapers: [
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1920',
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920',
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1920',
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1920',
            'https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?q=80&w=1920',
        ]
    },

    // ── INIT ──────────────────────────────────────────────────────
    init() {
        this.loadSettings();
        this.loadFileSystem();
        this.loadNotes();
        this.updateSystemClock();
        setInterval(() => this.updateSystemClock(), 1000);
        this.renderDesktopIcons();
        this.applyAccentColor(this.settings.accentColor);
        this.applyWallpaper(this.settings.wallpaper);
        this.applyTheme(this.settings.theme);
        this.initLockParticles();
        this.initBattery();
        this.initVolumeControl();
        this.initDesktopsIndicator();
        this.updateWidgets();
        setInterval(() => this.updateWidgets(), 60000);

        document.getElementById('desktop').addEventListener('click', () => {
            this.closeStartMenu();
            this.closeContextMenu();
            this.closeNotifCenter();
        });

        document.getElementById('desktop').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) this.closeContextMenu();
            if (!e.target.closest('.volume-tray')) {
                document.getElementById('volume-popup').classList.remove('open');
            }
        });

        document.addEventListener('keydown', (e) => {
            // Win+D — свернуть все
            if (e.key === 'd' && e.metaKey) { e.preventDefault(); this.minimizeAll(); }
        });

        document.getElementById('lock-screen').addEventListener('click', () => this.unlock());
        document.addEventListener('keydown', () => this.unlock());

        // Виджет-заметка сохранение
        const wn = document.getElementById('widget-note-area');
        if (wn) {
            wn.value = localStorage.getItem('widget_note') || '';
            wn.addEventListener('input', () => localStorage.setItem('widget_note', wn.value));
        }

        if (this.settings.liveWallpaper) this.startLiveWallpaper();
    },

    // ── LOCK SCREEN ───────────────────────────────────────────────
    unlock() {
        const ls = document.getElementById('lock-screen');
        if (ls.style.display === 'none') return;
        if (!ls.classList.contains('unlocking')) {
            ls.classList.add('unlocking');
            setTimeout(() => {
                ls.style.display = 'none';
                document.getElementById('app').style.display = 'block';
                this.showNotification('Добро пожаловать, ' + this.settings.username + '!', '👋');
            }, 600);
        }
    },

    lockScreen() {
        this.closeStartMenu();
        const ls = document.getElementById('lock-screen');
        ls.style.display = 'flex';
        ls.classList.remove('unlocking');
        document.getElementById('app').style.display = 'none';
        document.getElementById('lock-username').textContent = this.settings.username;
    },

    initLockParticles() {
        const canvas = document.getElementById('lock-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const particles = Array.from({length: 80}, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            o: Math.random() * 0.5 + 0.2
        }));
        const draw = () => {
            if (document.getElementById('lock-screen').style.display === 'none') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${p.o})`;
                ctx.fill();
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            requestAnimationFrame(draw);
        };
        draw();
    },

    // ── CLOCK & WIDGETS ───────────────────────────────────────────
    updateSystemClock() {
        const now = new Date();
        const t = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const d = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        const full = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
        const el = (id) => document.getElementById(id);
        if (el('clock')) el('clock').textContent = t;
        if (el('taskbar-date')) el('taskbar-date').textContent = d;
        if (el('lock-time')) el('lock-time').textContent = t;
        if (el('lock-date')) el('lock-date').textContent = full.charAt(0).toUpperCase() + full.slice(1);
        if (el('widget-time')) el('widget-time').textContent = t;
        if (el('widget-date-w')) el('widget-date-w').textContent = full.charAt(0).toUpperCase() + full.slice(1);
    },

    updateWidgets() {
        // Симуляция погоды (без реального API ключа)
        const temps = ['+18°C', '+22°C', '+15°C', '+25°C', '+10°C'];
        const cities = ['Москва', 'Локальная сеть'];
        const icons = ['☀️', '🌤️', '⛅', '🌧️', '❄️'];
        const i = Math.floor(Math.random() * temps.length);
        const wt = document.getElementById('widget-temp');
        const wc = document.getElementById('widget-city');
        const wi = document.querySelector('.widget-weather-icon');
        if (wt) wt.textContent = temps[i];
        if (wc) wc.textContent = cities[0];
        if (wi) wi.textContent = icons[i];
    },

    // ── BATTERY ───────────────────────────────────────────────────
    async initBattery() {
        if (!navigator.getBattery) return;
        try {
            const bat = await navigator.getBattery();
            const update = () => {
                const pct = Math.round(bat.level * 100);
                const icon = bat.charging ? '⚡' : pct > 60 ? '🔋' : pct > 20 ? '🪫' : '🔴';
                const el = document.getElementById('battery-icon');
                if (el) { el.textContent = icon; el.title = `Батарея: ${pct}%`; }
            };
            update();
            bat.addEventListener('levelchange', update);
            bat.addEventListener('chargingchange', update);
        } catch(e) {}
    },

    // ── VOLUME CONTROL ────────────────────────────────────────────
    initVolumeControl() {
        const icon = document.getElementById('vol-icon');
        const popup = document.getElementById('volume-popup');
        const slider = document.getElementById('master-vol');
        const label = document.getElementById('vol-label');
        if (!icon) return;
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.classList.toggle('open');
        });
        slider.addEventListener('input', () => {
            const v = slider.value;
            label.textContent = v + '%';
            icon.textContent = v > 60 ? '🔊' : v > 20 ? '🔉' : v > 0 ? '🔈' : '🔇';
            // Применяем громкость ко всем аудио
            document.querySelectorAll('audio').forEach(a => a.volume = v / 100);
        });
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────
    showNotification(text, icon = '🔔', duration = 3500) {
        const container = document.getElementById('notifications-container');
        const notif = document.createElement('div');
        notif.className = 'toast';
        notif.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${text}</span>`;
        container.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 400); }, duration);

        // Добавляем в историю
        this.notifHistory.unshift({ text, icon, time: new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) });
        if (this.notifHistory.length > 50) this.notifHistory.pop();
        this.updateNotifBell();
    },

    updateNotifBell() {
        const bell = document.getElementById('notif-bell');
        if (bell) bell.classList.add('has-notif');
    },

    toggleNotifCenter() {
        const nc = document.getElementById('notif-center');
        nc.classList.toggle('open');
        if (nc.classList.contains('open')) {
            document.getElementById('notif-bell').classList.remove('has-notif');
            this.renderNotifHistory();
        }
    },

    closeNotifCenter() {
        document.getElementById('notif-center').classList.remove('open');
    },

    renderNotifHistory() {
        const list = document.getElementById('notif-center-list');
        if (!list) return;
        if (!this.notifHistory.length) {
            list.innerHTML = '<div class="notif-empty">Уведомлений нет</div>';
            return;
        }
        list.innerHTML = this.notifHistory.map(n => `
            <div class="notif-item">
                <span class="notif-item-icon">${n.icon}</span>
                <div class="notif-item-body">
                    <div class="notif-item-text">${n.text}</div>
                    <div class="notif-item-time">${n.time}</div>
                </div>
            </div>
        `).join('');
    },

    clearNotifHistory() {
        this.notifHistory = [];
        this.renderNotifHistory();
    },

    // ── MULTIPLE DESKTOPS ─────────────────────────────────────────
    initDesktopsIndicator() {
        this.renderDesktopsIndicator();
    },

    renderDesktopsIndicator() {
        const el = document.getElementById('desktops-indicator');
        if (!el) return;
        el.innerHTML = Array.from({length: this.totalDesktops}, (_, i) => `
            <div class="desktop-dot ${i === this.currentDesktop ? 'active' : ''}" 
                onclick="AdminOS.switchDesktop(${i - AdminOS.currentDesktop})" title="Рабочий стол ${i+1}"></div>
        `).join('');
    },

    switchDesktop(dir) {
        const next = (this.currentDesktop + dir + this.totalDesktops) % this.totalDesktops;
        // Скрыть окна текущего
        Object.keys(this.activeWindows).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        this.desktopWindows[this.currentDesktop] = { ...this.activeWindows };
        this.currentDesktop = next;
        // Показать окна нового
        this.activeWindows = { ...this.desktopWindows[next] };
        Object.keys(this.activeWindows).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });
        this.refreshTaskbar();
        this.renderDesktopsIndicator();
        this.showNotification(`Рабочий стол ${next + 1}`, '🖥️', 1500);
    },

    minimizeAll() {
        Object.keys(this.activeWindows).forEach(id => this.minimizeWindow(id));
    },

    // ── START MENU ────────────────────────────────────────────────
    toggleStartMenu() {
        const menu = document.getElementById('start-menu');
        menu.classList.toggle('open');
        if (menu.classList.contains('open')) {
            document.getElementById('start-search').focus();
            document.getElementById('start-username').textContent = this.settings.username;
        }
    },

    closeStartMenu() { document.getElementById('start-menu').classList.remove('open'); },

    filterApps(q) {
        document.querySelectorAll('.start-app-item').forEach(item => {
            item.style.display = (item.dataset.name || '').includes(q.toLowerCase()) ? 'flex' : 'none';
        });
    },

    // ── CONTEXT MENU ──────────────────────────────────────────────
    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu');
        menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
        menu.style.top  = Math.min(y, window.innerHeight - 200) + 'px';
        menu.classList.add('open');
    },
    closeContextMenu() { document.getElementById('context-menu').classList.remove('open'); },

    // ── WALLPAPER & THEME ─────────────────────────────────────────
    applyWallpaper(url) {
        if (this.liveWallpaperActive) this.stopLiveWallpaper();
        document.body.style.backgroundImage = `url('${url}')`;
        this.settings.wallpaper = url;
        this.settings.liveWallpaper = false;
        this.saveSettings();
    },

    applyAccentColor(color) {
        document.documentElement.style.setProperty('--accent', color);
        this.settings.accentColor = color;
        this.saveSettings();
    },

    applyTheme(theme) {
        document.body.classList.toggle('theme-light', theme === 'light');
        this.settings.theme = theme;
        this.saveSettings();
    },

    // ── LIVE WALLPAPER ────────────────────────────────────────────
    startLiveWallpaper() {
        this.stopLiveWallpaper();
        let canvas = document.getElementById('live-wp-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'live-wp-canvas';
            canvas.style.cssText = 'position:fixed;inset:0;z-index:-1;width:100%;height:100%;';
            document.body.appendChild(canvas);
        }
        document.body.style.backgroundImage = 'none';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const pts = Array.from({length:120}, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: (Math.random()-.5)*.8,
            dy: (Math.random()-.5)*.8,
            r: Math.random()*2+1
        }));
        const accent = this.settings.accentColor;
        const animate = () => {
            ctx.fillStyle = 'rgba(5,5,15,0.15)';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            pts.forEach((p,i) => {
                p.x+=p.dx; p.y+=p.dy;
                if(p.x<0||p.x>canvas.width) p.dx*=-1;
                if(p.y<0||p.y>canvas.height) p.dy*=-1;
                ctx.beginPath();
                ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
                ctx.fillStyle=accent+'aa';
                ctx.fill();
                pts.slice(i+1).forEach(p2 => {
                    const dist=Math.hypot(p.x-p2.x,p.y-p2.y);
                    if(dist<120){
                        ctx.beginPath();
                        ctx.moveTo(p.x,p.y);
                        ctx.lineTo(p2.x,p2.y);
                        ctx.strokeStyle=accent+Math.round((1-dist/120)*80).toString(16).padStart(2,'0');
                        ctx.lineWidth=0.5;
                        ctx.stroke();
                    }
                });
            });
            this.liveWallpaperAnim = requestAnimationFrame(animate);
        };
        animate();
        this.liveWallpaperActive = true;
        this.settings.liveWallpaper = true;
        this.saveSettings();
    },

    stopLiveWallpaper() {
        if (this.liveWallpaperAnim) cancelAnimationFrame(this.liveWallpaperAnim);
        const c = document.getElementById('live-wp-canvas');
        if (c) c.remove();
        this.liveWallpaperActive = false;
    },

    // ── PERSIST ───────────────────────────────────────────────────
    saveSettings() { localStorage.setItem('adminos_settings', JSON.stringify(this.settings)); },
    loadSettings() {
        try { const s = localStorage.getItem('adminos_settings'); if(s) this.settings={...this.settings,...JSON.parse(s)}; } catch(e){}
    },
    saveFileSystem() { localStorage.setItem('adminos_fs', JSON.stringify(this.fileSystem)); },
    loadFileSystem() {
        try { const s=localStorage.getItem('adminos_fs'); if(s) this.fileSystem=JSON.parse(s); } catch(e){}
        if(!this.fileSystem['Документы']) this.fileSystem['Документы']={};
        if(!this.fileSystem['Изображения']) this.fileSystem['Изображения']={};
        if(!this.fileSystem['Загрузки']) this.fileSystem['Загрузки']={};
    },
    saveNotes() { localStorage.setItem('adminos_notes', JSON.stringify(this.notesDB)); },
    loadNotes() { try { const s=localStorage.getItem('adminos_notes'); if(s) this.notesDB=JSON.parse(s); } catch(e){} },

    // ── DESKTOP ICONS ─────────────────────────────────────────────
    renderDesktopIcons() {
        const apps = [
            {id:'browser',icon:'🌐',label:'Браузер'},
            {id:'notepad',icon:'📝',label:'Блокнот'},
            {id:'filemanager',icon:'🗂️',label:'Файлы'},
            {id:'calculator',icon:'🖩',label:'Калькулятор'},
            {id:'mediaplayer',icon:'🎵',label:'Музыка'},
            {id:'paint',icon:'🎨',label:'Paint'},
            {id:'terminal',icon:'💻',label:'Терминал'},
            {id:'todo',icon:'✅',label:'Задачи'},
            {id:'sysmonitor',icon:'📊',label:'Монитор'},
            {id:'imageviewer',icon:'🖼️',label:'Фото'},
            {id:'snake',icon:'🐍',label:'Змейка'},
            {id:'tetris',icon:'🧱',label:'Тетрис'},
            {id:'minesweeper',icon:'💣',label:'Сапёр'},
            {id:'pong',icon:'🏓',label:'Пинг-понг'},
            {id:'settings',icon:'⚙️',label:'Настройки'},
        ];
        document.getElementById('shortcuts-grid').innerHTML = apps.map(a=>`
            <div class="shortcut" ondblclick="AdminOS.createWindow('${a.id}')" title="${a.label}">
                <div class="icon">${a.icon}</div>
                <div class="label">${a.label}</div>
            </div>`).join('');
    },

    // ── WINDOW FACTORY ────────────────────────────────────────────
    createWindow(appType, extraData={}) {
        this.closeStartMenu();
        const singletons = ['browser','filemanager','calculator','sysmonitor','settings','todo','imageviewer','paint','terminal','snake','tetris','minesweeper','pong'];
        if (singletons.includes(appType)) {
            const ex = Object.keys(this.activeWindows).find(id=>this.activeWindows[id].type===appType);
            if (ex) {
                const el=document.getElementById(ex);
                if(el){el.style.zIndex=++this.zIndexCounter;el.classList.add('window-focus-flash');setTimeout(()=>el.classList.remove('window-focus-flash'),300);}
                return;
            }
        }

        const winId = 'win_'+Date.now();
        const cfgs = {
            browser:     {title:'Браузер',       icon:'🌐',w:900,h:560,resizable:true},
            notepad:     {title:'Блокнот',       icon:'📝',w:620,h:440,resizable:true},
            filemanager: {title:'Файлы',         icon:'🗂️',w:760,h:500,resizable:true},
            calculator:  {title:'Калькулятор',   icon:'🖩', w:320,h:510,resizable:false},
            mediaplayer: {title:'Медиаплеер',    icon:'🎵',w:480,h:370,resizable:false},
            paint:       {title:'Paint',         icon:'🎨',w:800,h:560,resizable:true},
            terminal:    {title:'Терминал',      icon:'💻',w:680,h:440,resizable:true},
            todo:        {title:'Задачи',        icon:'✅',w:400,h:520,resizable:true},
            sysmonitor:  {title:'Мониторинг',    icon:'📊',w:600,h:440,resizable:true},
            imageviewer: {title:'Просмотр фото', icon:'🖼️',w:700,h:520,resizable:true},
            snake:       {title:'Змейка',        icon:'🐍',w:420,h:500,resizable:false},
            tetris:      {title:'Тетрис',        icon:'🧱',w:380,h:560,resizable:false},
            minesweeper: {title:'Сапёр',         icon:'💣',w:400,h:460,resizable:false},
            pong:        {title:'Пинг-понг',     icon:'🏓',w:600,h:440,resizable:false},
            settings:    {title:'Настройки',     icon:'⚙️',w:700,h:540,resizable:true},
        };

        const cfg = cfgs[appType]; if(!cfg) return;
        const el = document.createElement('div');
        el.className='window'; el.id=winId;
        el.style.zIndex=++this.zIndexCounter;
        el.style.width=cfg.w+'px'; el.style.height=cfg.h+'px';

        const vw=window.innerWidth, vh=window.innerHeight-48;
        const off=Object.keys(this.activeWindows).length*24;
        el.style.left=Math.max(0,Math.min((vw-cfg.w)/2+off,vw-cfg.w))+'px';
        el.style.top =Math.max(0,Math.min((vh-cfg.h)/2+off,vh-cfg.h))+'px';

        el.innerHTML=`
            <div class="window-header" onmousedown="AdminOS.initDrag('${winId}',event)" ondblclick="AdminOS.toggleMaximize('${winId}')">
                <span class="win-title"><span class="win-icon">${cfg.icon}</span> ${cfg.title}</span>
                <div class="win-controls">
                    <button class="win-btn win-min" onclick="AdminOS.minimizeWindow('${winId}')" title="Свернуть">─</button>
                    <button class="win-btn win-max" onclick="AdminOS.toggleMaximize('${winId}')" title="Развернуть">⬜</button>
                    <button class="win-btn win-close" onclick="AdminOS.destroyWindow('${winId}')" title="Закрыть">✕</button>
                </div>
            </div>
            <div class="window-body" id="body-${winId}">${this.buildAppContent(appType, winId, extraData)}</div>
            ${cfg.resizable?`<div class="resize-handle" onmousedown="AdminOS.initResize('${winId}',event)"></div>`:''}
        `;

        document.getElementById('app').appendChild(el);
        el.addEventListener('mousedown', ()=> el.style.zIndex=++this.zIndexCounter);
        this.activeWindows[winId]={...cfg,type:appType};
        this.refreshTaskbar();

        // Пост-инит
        const pi = {
            calculator: ()=>this.initCalculator(winId),
            mediaplayer:()=>this.initMediaPlayer(winId),
            settings:   ()=>this.initSettings(winId),
            notepad:    ()=>this.initNotepad(winId),
            paint:      ()=>this.initPaint(winId),
            terminal:   ()=>this.initTerminal(winId),
            todo:       ()=>this.initTodo(winId),
            sysmonitor: ()=>this.initSysMonitor(winId),
            imageviewer:()=>this.initImageViewer(winId),
            snake:      ()=>this.initSnake(winId),
            tetris:     ()=>this.initTetris(winId),
            minesweeper:()=>this.initMinesweeper(winId),
            pong:       ()=>this.initPong(winId),
            filemanager:()=>setTimeout(()=>this.fmRender(winId,''),50),
            browser:    ()=>this.initBrowserApp(winId),
        };
        if(pi[appType]) pi[appType]();
    },

    // ── APP CONTENT BUILDERS ──────────────────────────────────────
    buildAppContent(appType, winId) {
        switch(appType) {
            case 'browser': return `
                <div class="browser-chrome">
                    <div class="browser-toolbar">
                        <button class="br-btn" onclick="AdminOS.browserNav('${winId}','back')">◀</button>
                        <button class="br-btn" onclick="AdminOS.browserNav('${winId}','forward')">▶</button>
                        <button class="br-btn" onclick="AdminOS.browserNav('${winId}','reload')">↻</button>
                        <input class="browser-url" id="url-${winId}" type="text" value="" placeholder="Введи URL или поисковый запрос...">
                        <button class="br-btn br-go" onclick="AdminOS.browserGo('${winId}')">→</button>
                    </div>
                    <div class="browser-home" id="brhome-${winId}">
                        <div class="brhome-logo">🌐 AdminBrowser</div>
                        <input class="brhome-search" id="brsearch-${winId}" placeholder="Поиск в интернете..." 
                            onkeydown="if(event.key==='Enter'){document.getElementById('url-${winId}').value=this.value;AdminOS.browserGo('${winId}')}">
                        <div class="brhome-links">
                            <div class="brhome-link" onclick="AdminOS.browserOpen('${winId}','https://html.duckduckgo.com/html')">🔍 DuckDuckGo</div>
                            <div class="brhome-link" onclick="AdminOS.browserOpen('${winId}','https://ru.wikipedia.org')">📖 Wikipedia</div>
                            <div class="brhome-link" onclick="AdminOS.browserOpen('${winId}','https://github.com')">💻 GitHub</div>
                            <div class="brhome-link" onclick="AdminOS.browserOpen('${winId}','https://docs.google.com')">📝 Google Docs</div>
                        </div>
                        <div class="brhome-note">⚠️ Большинство сайтов блокируют встроенный фрейм.<br>Для полноценного просмотра ссылки открываются в новой вкладке.</div>
                    </div>
                    <iframe id="frame-${winId}" class="browser-frame" style="display:none"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
                </div>`;

            case 'notepad': {
                const nid='note_'+winId;
                return `<div class="notepad-container">
                    <div class="notepad-toolbar">
                        <button class="np-btn" onclick="AdminOS.saveNote('${winId}')">💾 Сохранить</button>
                        <button class="np-btn" onclick="AdminOS.clearNote('${winId}')">🗑️ Очистить</button>
                        <button class="np-btn" onclick="AdminOS.exportNote('${winId}')">📤 Экспорт</button>
                        <span class="np-status" id="np-status-${winId}"></span>
                    </div>
                    <textarea class="notepad-textarea" id="np-${winId}" placeholder="Введи текст...">${this.notesDB[nid]||''}</textarea>
                </div>`;}

            case 'filemanager': return `
                <div class="fm-container">
                    <div class="fm-sidebar" id="fm-sidebar-${winId}"></div>
                    <div class="fm-main">
                        <div class="fm-toolbar">
                            <span class="fm-path" id="fm-path-${winId}">📁 Компьютер</span>
                            <button class="fm-btn" onclick="AdminOS.fmNewFolder('${winId}')">+ Папка</button>
                            <button class="fm-btn" onclick="AdminOS.fmNewFile('${winId}')">+ Файл</button>
                        </div>
                        <div class="fm-content" id="fm-content-${winId}"></div>
                    </div>
                </div>`;

            case 'calculator': return `
                <div class="calc-container" id="calc-${winId}">
                    <div class="calc-display">
                        <div class="calc-expr" id="calc-expr-${winId}"></div>
                        <div class="calc-result" id="calc-res-${winId}">0</div>
                    </div>
                    <div class="calc-buttons">
                        <button class="cb cb-fn" onclick="AdminOS.calcPress('${winId}','AC')">AC</button>
                        <button class="cb cb-fn" onclick="AdminOS.calcPress('${winId}','+/-')">±</button>
                        <button class="cb cb-fn" onclick="AdminOS.calcPress('${winId}','%')">%</button>
                        <button class="cb cb-op" onclick="AdminOS.calcPress('${winId}','/')">÷</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','7')">7</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','8')">8</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','9')">9</button>
                        <button class="cb cb-op" onclick="AdminOS.calcPress('${winId}','*')">×</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','4')">4</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','5')">5</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','6')">6</button>
                        <button class="cb cb-op" onclick="AdminOS.calcPress('${winId}','-')">−</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','1')">1</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','2')">2</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','3')">3</button>
                        <button class="cb cb-op" onclick="AdminOS.calcPress('${winId}','+')">+</button>
                        <button class="cb cb-zero" onclick="AdminOS.calcPress('${winId}','0')">0</button>
                        <button class="cb" onclick="AdminOS.calcPress('${winId}','.')">.</button>
                        <button class="cb cb-eq" onclick="AdminOS.calcPress('${winId}','=')">＝</button>
                    </div>
                </div>`;

            case 'mediaplayer': return `
                <div class="media-container" id="media-${winId}">
                    <div class="media-cover" id="media-cover-${winId}">🎵</div>
                    <div class="media-info">
                        <div class="media-title" id="media-title-${winId}">Нет трека</div>
                        <div class="media-artist" id="media-artist-${winId}">Загрузи файл ↓</div>
                    </div>
                    <div class="media-progress-wrap">
                        <span class="media-time" id="media-cur-${winId}">0:00</span>
                        <input type="range" class="media-progress" id="media-seek-${winId}" value="0" min="0" max="100" step="0.1">
                        <span class="media-time" id="media-dur-${winId}">0:00</span>
                    </div>
                    <div class="media-controls">
                        <button class="mc-btn" onclick="AdminOS.mediaPrev('${winId}')">⏮</button>
                        <button class="mc-btn mc-play" id="media-play-${winId}" onclick="AdminOS.mediaToggle('${winId}')">▶</button>
                        <button class="mc-btn" onclick="AdminOS.mediaNext('${winId}')">⏭</button>
                    </div>
                    <div class="media-volume">🔊 <input type="range" class="media-vol" id="media-vol-${winId}" value="80" min="0" max="100"></div>
                    <label class="media-upload-btn">📂 Открыть файлы<input type="file" accept="audio/*" multiple id="media-input-${winId}" style="display:none"></label>
                    <audio id="media-audio-${winId}"></audio>
                </div>`;

            case 'paint': return `
                <div class="paint-container">
                    <div class="paint-toolbar">
                        <div class="paint-tools">
                            <button class="pt-btn active" id="pt-brush-${winId}" onclick="AdminOS.paintTool('${winId}','brush')" title="Кисть">🖌️</button>
                            <button class="pt-btn" id="pt-eraser-${winId}" onclick="AdminOS.paintTool('${winId}','eraser')" title="Ластик">⬜</button>
                            <button class="pt-btn" id="pt-line-${winId}" onclick="AdminOS.paintTool('${winId}','line')" title="Линия">╱</button>
                            <button class="pt-btn" id="pt-rect-${winId}" onclick="AdminOS.paintTool('${winId}','rect')" title="Прямоугольник">▭</button>
                            <button class="pt-btn" id="pt-circle-${winId}" onclick="AdminOS.paintTool('${winId}','circle')" title="Круг">○</button>
                            <button class="pt-btn" id="pt-fill-${winId}" onclick="AdminOS.paintTool('${winId}','fill')" title="Заливка">🪣</button>
                        </div>
                        <div class="paint-colors" id="paint-colors-${winId}"></div>
                        <input type="color" id="paint-color-${winId}" value="#ffffff" style="width:32px;height:32px;border:none;cursor:pointer;border-radius:6px;">
                        <input type="range" id="paint-size-${winId}" min="1" max="50" value="5" style="width:80px;" title="Размер">
                        <button class="pt-btn" onclick="AdminOS.paintClear('${winId}')" title="Очистить">🗑️</button>
                        <button class="pt-btn" onclick="AdminOS.paintSave('${winId}')" title="Сохранить">💾</button>
                    </div>
                    <canvas id="paint-canvas-${winId}" class="paint-canvas"></canvas>
                </div>`;

            case 'terminal': return `
                <div class="terminal-container" id="term-${winId}">
                    <div class="term-output" id="term-out-${winId}"></div>
                    <div class="term-input-row">
                        <span class="term-prompt">admin@os:~$</span>
                        <input class="term-input" id="term-in-${winId}" type="text" autocomplete="off" spellcheck="false">
                    </div>
                </div>`;

            case 'todo': return `
                <div class="todo-container">
                    <div class="todo-header">
                        <input class="todo-input" id="todo-in-${winId}" placeholder="Новая задача..." 
                            onkeydown="if(event.key==='Enter')AdminOS.todoAdd('${winId}')">
                        <select class="todo-priority" id="todo-pri-${winId}">
                            <option value="normal">Обычная</option>
                            <option value="high">🔴 Высокая</option>
                            <option value="low">🟢 Низкая</option>
                        </select>
                        <button class="todo-add-btn" onclick="AdminOS.todoAdd('${winId}')">+</button>
                    </div>
                    <div class="todo-filters">
                        <button class="todo-filter active" onclick="AdminOS.todoFilter('${winId}','all',this)">Все</button>
                        <button class="todo-filter" onclick="AdminOS.todoFilter('${winId}','active',this)">Активные</button>
                        <button class="todo-filter" onclick="AdminOS.todoFilter('${winId}','done',this)">Готово</button>
                    </div>
                    <div class="todo-list" id="todo-list-${winId}"></div>
                    <div class="todo-footer" id="todo-footer-${winId}"></div>
                </div>`;

            case 'sysmonitor': return `
                <div class="sysmon-container">
                    <div class="sysmon-stats" id="sysmon-stats-${winId}"></div>
                    <div class="sysmon-charts">
                        <div class="sysmon-chart-wrap">
                            <div class="sysmon-chart-title">CPU (симуляция)</div>
                            <canvas id="cpu-chart-${winId}" height="100"></canvas>
                        </div>
                        <div class="sysmon-chart-wrap">
                            <div class="sysmon-chart-title">RAM (симуляция)</div>
                            <canvas id="ram-chart-${winId}" height="100"></canvas>
                        </div>
                    </div>
                    <div class="sysmon-procs" id="sysmon-procs-${winId}"></div>
                </div>`;

            case 'imageviewer': return `
                <div class="imgv-container">
                    <div class="imgv-toolbar">
                        <label class="imgv-upload">📂 Открыть<input type="file" accept="image/*" multiple id="imgv-input-${winId}" style="display:none"></label>
                        <button class="imgv-btn" onclick="AdminOS.imgvPrev('${winId}')">◀</button>
                        <span class="imgv-counter" id="imgv-counter-${winId}">0 / 0</span>
                        <button class="imgv-btn" onclick="AdminOS.imgvNext('${winId}')">▶</button>
                        <button class="imgv-btn" onclick="AdminOS.imgvZoom('${winId}',0.2)">🔍+</button>
                        <button class="imgv-btn" onclick="AdminOS.imgvZoom('${winId}',-0.2)">🔍−</button>
                        <button class="imgv-btn" onclick="AdminOS.imgvRotate('${winId}')">↻</button>
                        <button class="imgv-btn" onclick="AdminOS.imgvReset('${winId}')">↺ Сброс</button>
                    </div>
                    <div class="imgv-stage" id="imgv-stage-${winId}">
                        <div class="imgv-placeholder">🖼️<br>Открой изображения</div>
                    </div>
                </div>`;

            case 'snake': return `
                <div class="game-container">
                    <div class="game-header">
                        <span>🐍 Змейка</span>
                        <span class="game-score" id="snake-score-${winId}">Счёт: 0</span>
                        <button class="game-btn" id="snake-start-${winId}" onclick="AdminOS.snakeStart('${winId}')">Старт</button>
                    </div>
                    <canvas id="snake-canvas-${winId}" class="game-canvas" width="360" height="360"></canvas>
                    <div class="game-hint">Управление: WASD или стрелки</div>
                </div>`;

            case 'tetris': return `
                <div class="game-container tetris-layout">
                    <div class="tetris-main">
                        <div class="game-header">
                            <span>🧱 Тетрис</span>
                            <button class="game-btn" id="tetris-start-${winId}" onclick="AdminOS.tetrisStart('${winId}')">Старт</button>
                        </div>
                        <canvas id="tetris-canvas-${winId}" class="game-canvas" width="240" height="480"></canvas>
                    </div>
                    <div class="tetris-side">
                        <div class="tetris-info">
                            <div>Счёт</div><div class="game-score" id="tetris-score-${winId}">0</div>
                            <div>Уровень</div><div class="game-score" id="tetris-level-${winId}">1</div>
                            <div>Линии</div><div class="game-score" id="tetris-lines-${winId}">0</div>
                        </div>
                        <div>Следующий:</div>
                        <canvas id="tetris-next-${winId}" width="100" height="100"></canvas>
                        <div class="game-hint" style="margin-top:10px">←→ движение<br>↑ поворот<br>↓ ускорить</div>
                    </div>
                </div>`;

            case 'minesweeper': return `
                <div class="game-container">
                    <div class="game-header">
                        <span>💣 Сапёр</span>
                        <select id="ms-diff-${winId}" class="ms-select">
                            <option value="easy">Лёгкий 9×9</option>
                            <option value="medium" selected>Средний 16×16</option>
                        </select>
                        <span id="ms-mines-${winId}" class="game-score">💣 0</span>
                        <button class="game-btn" onclick="AdminOS.msStart('${winId}')">🔄 Новая</button>
                    </div>
                    <div id="ms-board-${winId}" class="ms-board"></div>
                    <div class="game-hint" id="ms-status-${winId}">ЛКМ — открыть, ПКМ — флаг</div>
                </div>`;

            case 'pong': return `
                <div class="game-container">
                    <div class="game-header">
                        <span>🏓 Пинг-понг</span>
                        <span class="game-score" id="pong-score-${winId}">0 : 0</span>
                        <button class="game-btn" id="pong-start-${winId}" onclick="AdminOS.pongStart('${winId}')">Старт</button>
                    </div>
                    <canvas id="pong-canvas-${winId}" class="game-canvas" width="560" height="360"></canvas>
                    <div class="game-hint">W/S — левый игрок | ↑/↓ — правый игрок</div>
                </div>`;

            case 'settings': return `
                <div class="settings-container">
                    <div class="settings-sidebar">
                        <div class="set-nav-item active" onclick="AdminOS.setTab(this,'personalization')">🖼️ Персонализация</div>
                        <div class="set-nav-item" onclick="AdminOS.setTab(this,'account')">👤 Аккаунт</div>
                        <div class="set-nav-item" onclick="AdminOS.setTab(this,'system')">💻 Система</div>
                    </div>
                    <div class="settings-content" id="settings-content-${winId}"></div>
                </div>`;

            default: return `<div style="padding:20px">Неизвестное приложение</div>`;
        }
    },

    // ── WINDOW MANAGEMENT ─────────────────────────────────────────
    destroyWindow(winId) {
        // Стоп игровых луп
        ['snakeLoop','tetrisLoop','sysmonLoop','pongLoop'].forEach(k => {
            if(this[k+'_'+winId]) { clearInterval(this[k+'_'+winId]); delete this[k+'_'+winId]; }
        });
        if(this['pongAnim_'+winId]) { cancelAnimationFrame(this['pongAnim_'+winId]); delete this['pongAnim_'+winId]; }
        const el=document.getElementById(winId);
        if(el){ el.style.animation='winClose 0.15s ease-in forwards'; setTimeout(()=>{ el.remove(); delete this.activeWindows[winId]; delete this.minimizedWindows[winId]; this.refreshTaskbar(); },150); }
    },

    minimizeWindow(winId) {
        const el=document.getElementById(winId);
        if(el){ el.classList.add('minimized'); this.minimizedWindows[winId]=true; this.refreshTaskbar(); }
    },

    restoreWindow(winId) {
        const el=document.getElementById(winId);
        if(el){ el.classList.remove('minimized'); el.style.zIndex=++this.zIndexCounter; delete this.minimizedWindows[winId]; this.refreshTaskbar(); }
    },

    toggleMaximize(winId) {
        const el=document.getElementById(winId); if(!el) return;
        if(el.classList.contains('maximized')){ el.classList.remove('maximized'); const s=el._savedRect; if(s){el.style.left=s.left;el.style.top=s.top;el.style.width=s.width;el.style.height=s.height;} }
        else{ el._savedRect={left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height}; el.classList.add('maximized'); }
    },

    refreshTaskbar() {
        const c=document.getElementById('taskbar-apps'); c.innerHTML='';
        Object.keys(this.activeWindows).forEach(id=>{
            const cfg=this.activeWindows[id], isMin=!!this.minimizedWindows[id];
            const btn=document.createElement('button');
            btn.className='taskbar-icon'+(isMin?'':' active');
            btn.title=cfg.title; btn.textContent=cfg.icon;
            btn.onclick=()=>{ if(isMin)this.restoreWindow(id); else{ const el=document.getElementById(id); if(el)el.style.zIndex=++this.zIndexCounter; } };
            c.appendChild(btn);
        });
    },

    // ── DRAG & RESIZE ─────────────────────────────────────────────
    initDrag(winId, event) {
        if(event.target.tagName==='BUTTON') return;
        const el=document.getElementById(winId);
        if(!el||el.classList.contains('maximized')) return;
        const rect=el.getBoundingClientRect();
        let sx=event.clientX-rect.left, sy=event.clientY-rect.top;
        el.style.zIndex=++this.zIndexCounter;
        const mv=(e)=>{
            let l=e.clientX-sx, t=e.clientY-sy;
            l=Math.max(0,Math.min(l,window.innerWidth-el.offsetWidth));
            t=Math.max(0,Math.min(t,window.innerHeight-48-el.offsetHeight));
            el.style.left=l+'px'; el.style.top=t+'px';
        };
        document.addEventListener('mousemove',mv);
        document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',mv),{once:true});
    },

    initResize(winId, event) {
        event.stopPropagation();
        const el=document.getElementById(winId);
        if(!el||el.classList.contains('maximized')) return;
        const sx=event.clientX, sy=event.clientY, sw=el.offsetWidth, sh=el.offsetHeight;
        const mv=(e)=>{ el.style.width=Math.max(300,sw+e.clientX-sx)+'px'; el.style.height=Math.max(200,sh+e.clientY-sy)+'px'; };
        document.addEventListener('mousemove',mv);
        document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',mv),{once:true});
    },

    // ── BROWSER ───────────────────────────────────────────────────
    initBrowserApp(winId) {
        const input = document.getElementById('url-'+winId);
        if(input) input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') this.browserGo(winId); });
    },

    browserOpen(winId, url) {
        document.getElementById('url-'+winId).value = url;
        this.browserGo(winId);
    },

    browserGo(winId) {
        let url = document.getElementById('url-'+winId).value.trim();
        if(!url) return;
        // Если не похоже на URL — поиск
        if(!url.includes('.') || url.includes(' ')) url = 'https://html.duckduckgo.com/html?q='+encodeURIComponent(url);
        else if(!url.startsWith('http')) url = 'https://'+url;

        const home = document.getElementById('brhome-'+winId);
        const frame = document.getElementById('frame-'+winId);
        // Пробуем открыть во фрейме, но предупреждаем
        try {
            frame.src = url;
            frame.style.display = 'block';
            if(home) home.style.display = 'none';
            frame.onerror = ()=>{ window.open(url,'_blank'); frame.style.display='none'; if(home)home.style.display='flex'; };
        } catch(e) { window.open(url,'_blank'); }
    },

    browserNav(winId, action) {
        const frame=document.getElementById('frame-'+winId); if(!frame) return;
        if(action==='back') try{frame.contentWindow.history.back();}catch(e){}
        if(action==='forward') try{frame.contentWindow.history.forward();}catch(e){}
        if(action==='reload') frame.src=frame.src;
    },

    // ── NOTEPAD ───────────────────────────────────────────────────
    initNotepad(winId) {
        const ta=document.getElementById('np-'+winId); if(!ta) return;
        ta.addEventListener('input',()=>{ const s=document.getElementById('np-status-'+winId); if(s)s.textContent='● Несохранено'; });
    },

    saveNote(winId) {
        const ta=document.getElementById('np-'+winId); if(!ta) return;
        this.notesDB['note_'+winId]=ta.value; this.saveNotes();
        const s=document.getElementById('np-status-'+winId);
        if(s){s.textContent='✔ Сохранено'; setTimeout(()=>{if(s)s.textContent='';},2000);}
        this.showNotification('Заметка сохранена','💾');
    },

    clearNote(winId) { const ta=document.getElementById('np-'+winId); if(ta)ta.value=''; },

    exportNote(winId) {
        const ta=document.getElementById('np-'+winId); if(!ta) return;
        const a=document.createElement('a');
        a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(ta.value);
        a.download='note.txt'; a.click();
    },

    // ── FILE MANAGER ──────────────────────────────────────────────
    fmCurrentPath: {},

    fmRender(winId, path) {
        this.fmCurrentPath[winId]=path;
        const pathEl=document.getElementById('fm-path-'+winId);
        const content=document.getElementById('fm-content-'+winId);
        const sidebar=document.getElementById('fm-sidebar-'+winId);
        if(!content) return;
        if(pathEl) pathEl.textContent='📁 '+(path||'Компьютер');
        if(sidebar) sidebar.innerHTML=Object.keys(this.fileSystem).map(f=>`
            <div class="fm-sidebar-item ${path===f?'active':''}" onclick="AdminOS.fmRender('${winId}','${f}')">📁 ${f}</div>`).join('');
        if(!path){
            content.innerHTML=Object.keys(this.fileSystem).map(f=>`
                <div class="fm-item" ondblclick="AdminOS.fmRender('${winId}','${f}')">
                    <div class="fm-item-icon">📁</div><div class="fm-item-name">${f}</div>
                </div>`).join('');
        } else {
            const files=Object.keys(this.fileSystem[path]||{});
            content.innerHTML=`
                <div class="fm-item" ondblclick="AdminOS.fmRender('${winId}','')"><div class="fm-item-icon">↩️</div><div class="fm-item-name">Назад</div></div>
                ${files.map(fn=>`
                <div class="fm-item">
                    <div class="fm-item-icon">${this.fmIcon(fn)}</div>
                    <div class="fm-item-name">${fn}</div>
                    <button class="fm-del-btn" onclick="AdminOS.fmDel('${winId}','${path}','${fn}')">✕</button>
                </div>`).join('')}
                ${!files.length?'<div class="fm-empty">Папка пуста</div>':''}`;
        }
    },

    fmIcon(n){ return n.match(/\.(jpg|jpeg|png|gif|webp)$/i)?'🖼️':n.match(/\.(mp3|wav|ogg)$/i)?'🎵':n.match(/\.(mp4|avi|mkv)$/i)?'🎬':'📄'; },

    fmNewFolder(winId){ const n=prompt('Имя папки:'); if(n?.trim()){ this.fileSystem[n.trim()]={};this.saveFileSystem();this.fmRender(winId,this.fmCurrentPath[winId]||''); } },
    fmNewFile(winId){ const p=this.fmCurrentPath[winId]; if(!p){this.showNotification('Выбери папку','⚠️');return;} const n=prompt('Имя файла:'); if(n?.trim()){ this.fileSystem[p][n.trim()]='';this.saveFileSystem();this.fmRender(winId,p); } },
    fmDel(winId,path,fname){ if(confirm(`Удалить "${fname}"?`)){ delete this.fileSystem[path][fname];this.saveFileSystem();this.fmRender(winId,path); } },

    // ── CALCULATOR ────────────────────────────────────────────────
    calcState: {},

    initCalculator(winId){ this.calcState[winId]={expr:'',result:'0',newNum:true}; },

    calcPress(winId, btn) {
        const s=this.calcState[winId]; if(!s) return;
        const re=document.getElementById('calc-res-'+winId), ex=document.getElementById('calc-expr-'+winId);
        if(btn==='AC'){s.expr='';s.result='0';s.newNum=true;}
        else if(btn==='='){
            try{ const r=String(eval(s.expr.replace(/÷/g,'/').replace(/×/g,'*'))); ex.textContent=s.expr+' ='; s.expr=r; s.result=r; s.newNum=true; }
            catch(e){ s.result='Ошибка'; s.expr=''; s.newNum=true; }
        } else if(btn==='+/-'){ if(s.result!=='0'){s.result=String(-parseFloat(s.result));s.expr=s.result;} }
        else if(btn==='%'){ s.result=String(parseFloat(s.result)/100); s.expr=s.result; }
        else if(['+','-','*','/'].includes(btn)){ s.expr=(s.newNum?s.result:s.expr)+btn; s.newNum=false; if(ex)ex.textContent=s.expr; }
        else{ if(s.newNum){s.expr=btn;s.newNum=false;}else s.expr+=btn; s.result=s.expr; }
        if(re) re.textContent=s.result.length>12?parseFloat(s.result).toExponential(4):s.result;
        if(ex&&btn!=='=') ex.textContent=s.expr;
    },

    // ── MEDIA PLAYER ──────────────────────────────────────────────
    mediaState: {},

    initMediaPlayer(winId) {
        this.mediaState[winId]={playlist:[],current:0,playing:false};
        const input=document.getElementById('media-input-'+winId);
        const audio=document.getElementById('media-audio-'+winId);
        const seek=document.getElementById('media-seek-'+winId);
        const vol=document.getElementById('media-vol-'+winId);
        if(!input||!audio) return;
        input.addEventListener('change',(e)=>{ const files=Array.from(e.target.files); this.mediaState[winId].playlist=files.map(f=>({name:f.name,url:URL.createObjectURL(f)})); this.mediaState[winId].current=0; this.mediaLoadTrack(winId); });
        audio.addEventListener('timeupdate',()=>{ if(audio.duration){ seek.value=(audio.currentTime/audio.duration)*100; document.getElementById('media-cur-'+winId).textContent=this.mediaFmt(audio.currentTime); } });
        audio.addEventListener('loadedmetadata',()=>{ document.getElementById('media-dur-'+winId).textContent=this.mediaFmt(audio.duration); });
        audio.addEventListener('ended',()=>this.mediaNext(winId));
        seek.addEventListener('input',()=>{ if(audio.duration)audio.currentTime=(seek.value/100)*audio.duration; });
        vol.addEventListener('input',()=>{ audio.volume=vol.value/100; });
        audio.volume=0.8;
    },

    mediaFmt(s){ const m=Math.floor(s/60); return m+':'+String(Math.floor(s%60)).padStart(2,'0'); },

    mediaLoadTrack(winId) {
        const st=this.mediaState[winId]; if(!st?.playlist.length) return;
        const t=st.playlist[st.current];
        const audio=document.getElementById('media-audio-'+winId); if(!audio) return;
        audio.src=t.url; audio.play(); st.playing=true;
        document.getElementById('media-play-'+winId).textContent='⏸';
        document.getElementById('media-title-'+winId).textContent=t.name.replace(/\.[^.]+$/,'');
        document.getElementById('media-artist-'+winId).textContent='Локальный файл';
    },

    mediaToggle(winId) {
        const audio=document.getElementById('media-audio-'+winId), st=this.mediaState[winId], btn=document.getElementById('media-play-'+winId);
        if(!audio||!st?.playlist.length){this.showNotification('Сначала загрузи файлы','⚠️');return;}
        if(st.playing){audio.pause();st.playing=false;btn.textContent='▶';}
        else{audio.play();st.playing=true;btn.textContent='⏸';}
    },

    mediaNext(winId){ const st=this.mediaState[winId]; if(!st?.playlist.length)return; st.current=(st.current+1)%st.playlist.length; this.mediaLoadTrack(winId); },
    mediaPrev(winId){ const st=this.mediaState[winId]; if(!st?.playlist.length)return; st.current=(st.current-1+st.playlist.length)%st.playlist.length; this.mediaLoadTrack(winId); },

    // ── PAINT ─────────────────────────────────────────────────────
    paintState: {},

    initPaint(winId) {
        const canvas=document.getElementById('paint-canvas-'+winId); if(!canvas) return;
        const body=document.getElementById('body-'+winId);
        canvas.width=body?body.clientWidth-2:760;
        canvas.height=body?body.clientHeight-50:480;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,canvas.width,canvas.height);
        this.paintState[winId]={tool:'brush',drawing:false,color:'#ffffff',size:5,startX:0,startY:0,snapshot:null};

        // Цветовая палитра
        const colors=['#ffffff','#ff4444','#ff8800','#ffdd00','#44ff44','#00ddff','#4444ff','#dd44ff','#000000','#888888'];
        const palette=document.getElementById('paint-colors-'+winId);
        if(palette) palette.innerHTML=colors.map(c=>`<div class="paint-color-swatch" style="background:${c}" onclick="document.getElementById('paint-color-${winId}').value='${c}';AdminOS.paintState['${winId}'].color='${c}'"></div>`).join('');

        const colorIn=document.getElementById('paint-color-'+winId);
        colorIn?.addEventListener('input',(e)=>{ this.paintState[winId].color=e.target.value; });
        document.getElementById('paint-size-'+winId)?.addEventListener('input',(e)=>{ this.paintState[winId].size=parseInt(e.target.value); });

        canvas.addEventListener('mousedown',(e)=>{ const s=this.paintState[winId]; s.drawing=true; const r=canvas.getBoundingClientRect(); s.startX=e.clientX-r.left; s.startY=e.clientY-r.top; s.snapshot=ctx.getImageData(0,0,canvas.width,canvas.height); if(s.tool==='brush'||s.tool==='eraser'){ ctx.beginPath(); ctx.moveTo(s.startX,s.startY); } });
        canvas.addEventListener('mousemove',(e)=>{ const s=this.paintState[winId]; if(!s.drawing) return; const r=canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top; if(s.tool==='brush'){ ctx.lineTo(x,y); ctx.strokeStyle=s.color; ctx.lineWidth=s.size; ctx.lineCap='round'; ctx.stroke(); } else if(s.tool==='eraser'){ ctx.lineTo(x,y); ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=s.size*3; ctx.lineCap='round'; ctx.stroke(); } else if(['line','rect','circle'].includes(s.tool)){ ctx.putImageData(s.snapshot,0,0); ctx.strokeStyle=s.color; ctx.lineWidth=s.size; ctx.beginPath(); if(s.tool==='line'){ctx.moveTo(s.startX,s.startY);ctx.lineTo(x,y);} else if(s.tool==='rect'){ctx.strokeRect(s.startX,s.startY,x-s.startX,y-s.startY);} else{ctx.arc(s.startX,s.startY,Math.hypot(x-s.startX,y-s.startY),0,Math.PI*2);} ctx.stroke(); } });
        canvas.addEventListener('mouseup',()=>{ this.paintState[winId].drawing=false; });
        canvas.addEventListener('mouseleave',()=>{ this.paintState[winId].drawing=false; });
    },

    paintTool(winId, tool) {
        this.paintState[winId].tool=tool;
        document.querySelectorAll(`[id^="pt-"][id$="-${winId}"]`).forEach(b=>b.classList.remove('active'));
        document.getElementById(`pt-${tool}-${winId}`)?.classList.add('active');
    },

    paintClear(winId) {
        const canvas=document.getElementById('paint-canvas-'+winId); if(!canvas) return;
        const ctx=canvas.getContext('2d'); ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,canvas.width,canvas.height);
    },

    paintSave(winId) {
        const canvas=document.getElementById('paint-canvas-'+winId); if(!canvas) return;
        const a=document.createElement('a'); a.href=canvas.toDataURL(); a.download='drawing.png'; a.click();
        this.showNotification('Изображение сохранено','💾');
    },

    // ── TERMINAL ──────────────────────────────────────────────────
    termHistory: {},
    termHistIdx: {},

    initTerminal(winId) {
        this.termHistory[winId]=[];
        this.termHistIdx[winId]=-1;
        this.termPrint(winId, '🖥️  AdminOS Terminal v1.0', 'term-info');
        this.termPrint(winId, 'Введи <b>help</b> для списка команд', 'term-info');
        const input=document.getElementById('term-in-'+winId); if(!input) return;
        input.addEventListener('keydown',(e)=>{
            if(e.key==='Enter'){ this.termExec(winId,input.value.trim()); this.termHistory[winId].unshift(input.value); this.termHistIdx[winId]=-1; input.value=''; }
            else if(e.key==='ArrowUp'){ const h=this.termHistory[winId]; if(this.termHistIdx[winId]<h.length-1){this.termHistIdx[winId]++;input.value=h[this.termHistIdx[winId]]||'';} e.preventDefault(); }
            else if(e.key==='ArrowDown'){ if(this.termHistIdx[winId]>0){this.termHistIdx[winId]--;input.value=this.termHistory[winId][this.termHistIdx[winId]]||'';}else{this.termHistIdx[winId]=-1;input.value='';} e.preventDefault(); }
        });
        document.getElementById('term-'+winId)?.addEventListener('click',()=>input.focus());
    },

    termPrint(winId, text, cls='') {
        const out=document.getElementById('term-out-'+winId); if(!out) return;
        const line=document.createElement('div'); line.className='term-line '+(cls||'');
        line.innerHTML=text; out.appendChild(line); out.scrollTop=out.scrollHeight;
    },

    termExec(winId, cmd) {
        if(!cmd) return;
        this.termPrint(winId,`<span class="term-prompt-echo">admin@os:~$</span> ${cmd}`);
        const parts=cmd.split(' '), c=parts[0].toLowerCase(), args=parts.slice(1);
        const cmds = {
            help:()=>this.termPrint(winId,'Команды: <b>help, clear, echo, date, ls, pwd, whoami, calc, sysinfo, neofetch, apps, open, exit</b>','term-info'),
            clear:()=>{ document.getElementById('term-out-'+winId).innerHTML=''; },
            echo:()=>this.termPrint(winId,args.join(' ')||''),
            date:()=>this.termPrint(winId,new Date().toLocaleString('ru-RU')),
            pwd:()=>this.termPrint(winId,'/home/admin'),
            whoami:()=>this.termPrint(winId,this.settings.username),
            ls:()=>this.termPrint(winId,'📁 Документы  📁 Изображения  📁 Загрузки'),
            calc:()=>{ try{ this.termPrint(winId,'= '+eval(args.join(' '))); }catch(e){this.termPrint(winId,'Ошибка вычисления','term-err');} },
            sysinfo:()=>this.termPrint(winId,`ОС: AdminOS Web 3.0<br>Браузер: ${navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+|Safari\/[\d.]+/)?.[0]||'Unknown'}<br>Разрешение: ${window.innerWidth}×${window.innerHeight}<br>Память: ${Math.round(performance?.memory?.usedJSHeapSize/1048576||0)} MB`,'term-info'),
            neofetch:()=>this.termPrint(winId,`<span style="color:var(--accent)">
      ___       __           ___  ____
     / _ |   _ / /_ _  (_)__/ _ \\/ __/
    / __ | _/ / //  ' \\/ / ' \\/ /_\\ \\  
   /_/ |_|___/_//_/_/_/_/_//_/\\____/  
</span>
OS: AdminOS Web 3.0<br>User: ${this.settings.username}<br>Resolution: ${window.innerWidth}×${window.innerHeight}<br>Theme: ${this.settings.theme}`),
            apps:()=>this.termPrint(winId,'🌐 browser  📝 notepad  🗂️ filemanager  🖩 calculator<br>🎵 mediaplayer  🎨 paint  💻 terminal  ✅ todo<br>📊 sysmonitor  🖼️ imageviewer  🐍 snake  🧱 tetris<br>💣 minesweeper  🏓 pong  ⚙️ settings','term-info'),
            open:()=>{ if(args[0]){ this.createWindow(args[0]); this.termPrint(winId,`Открываю ${args[0]}...`,'term-info'); }else this.termPrint(winId,'Использование: open <приложение>','term-err'); },
            exit:()=>{ const id=Object.keys(this.activeWindows).find(id=>this.activeWindows[id].type==='terminal'); if(id)this.destroyWindow(id); },
        };
        if(cmds[c]) cmds[c]();
        else this.termPrint(winId,`Команда не найдена: ${c}. Введи <b>help</b>`,'term-err');
    },

    // ── TO-DO ─────────────────────────────────────────────────────
    todoItems: {},
    todoFilterMode: {},

    initTodo(winId) {
        const saved=localStorage.getItem('adminos_todo'); if(saved) try{this.todoItems[winId]=JSON.parse(saved);}catch(e){}
        if(!this.todoItems[winId]) this.todoItems[winId]=[];
        this.todoFilterMode[winId]='all';
        this.todoRender(winId);
    },

    todoAdd(winId) {
        const inp=document.getElementById('todo-in-'+winId), pri=document.getElementById('todo-pri-'+winId);
        const text=inp?.value.trim(); if(!text) return;
        this.todoItems[winId].push({id:Date.now(),text,done:false,priority:pri?.value||'normal'});
        inp.value=''; this.todoSave(winId); this.todoRender(winId);
    },

    todoToggle(winId, id) {
        const item=this.todoItems[winId]?.find(i=>i.id===id); if(item){ item.done=!item.done; this.todoSave(winId); this.todoRender(winId); }
    },

    todoDelete(winId, id) {
        this.todoItems[winId]=this.todoItems[winId]?.filter(i=>i.id!==id)||[]; this.todoSave(winId); this.todoRender(winId);
    },

    todoFilter(winId, mode, btn) {
        this.todoFilterMode[winId]=mode;
        btn.closest('.todo-filters').querySelectorAll('.todo-filter').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this.todoRender(winId);
    },

    todoSave(winId) { localStorage.setItem('adminos_todo', JSON.stringify(this.todoItems[winId])); },

    todoRender(winId) {
        const list=document.getElementById('todo-list-'+winId); if(!list) return;
        const mode=this.todoFilterMode[winId]||'all';
        let items=this.todoItems[winId]||[];
        if(mode==='active') items=items.filter(i=>!i.done);
        if(mode==='done')   items=items.filter(i=>i.done);
        list.innerHTML=items.length?items.map(item=>`
            <div class="todo-item ${item.done?'done':''} pri-${item.priority}">
                <input type="checkbox" class="todo-check" ${item.done?'checked':''} onchange="AdminOS.todoToggle('${winId}',${item.id})">
                <span class="todo-text">${item.text}</span>
                <span class="todo-pri-badge">${item.priority==='high'?'🔴':item.priority==='low'?'🟢':''}</span>
                <button class="todo-del" onclick="AdminOS.todoDelete('${winId}',${item.id})">✕</button>
            </div>`).join(''):'<div class="todo-empty">Задач нет 🎉</div>';
        const footer=document.getElementById('todo-footer-'+winId);
        if(footer){ const total=this.todoItems[winId]?.length||0, done=this.todoItems[winId]?.filter(i=>i.done).length||0; footer.textContent=`${done} из ${total} выполнено`; }
    },

    // ── SYSTEM MONITOR ────────────────────────────────────────────
    sysmonData: {},

    initSysMonitor(winId) {
        this.sysmonData[winId]={ cpu:[], ram:[] };
        this.sysmonLoop_interval = null;
        this.sysmonRender(winId);
        this['sysmonLoop_'+winId]=setInterval(()=>this.sysmonRender(winId), 1500);
    },

    sysmonRender(winId) {
        const data=this.sysmonData[winId]; if(!data) return;
        // Симуляция
        const cpu=Math.round(20+Math.random()*60), ram=Math.round(30+Math.random()*40);
        data.cpu.push(cpu); data.ram.push(ram);
        if(data.cpu.length>30) data.cpu.shift();
        if(data.ram.length>30) data.ram.shift();

        const stats=document.getElementById('sysmon-stats-'+winId);
        if(stats) stats.innerHTML=`
            <div class="sysmon-stat"><div class="sysmon-stat-icon">💻</div><div class="sysmon-stat-label">CPU</div><div class="sysmon-stat-val">${cpu}%</div><div class="sysmon-bar"><div class="sysmon-bar-fill" style="width:${cpu}%;background:${cpu>80?'#e74c3c':cpu>50?'#f39c12':'var(--accent)'}"></div></div></div>
            <div class="sysmon-stat"><div class="sysmon-stat-icon">🧠</div><div class="sysmon-stat-label">RAM</div><div class="sysmon-stat-val">${ram}%</div><div class="sysmon-bar"><div class="sysmon-bar-fill" style="width:${ram}%;background:var(--accent)"></div></div></div>
            <div class="sysmon-stat"><div class="sysmon-stat-icon">🌐</div><div class="sysmon-stat-label">Сеть</div><div class="sysmon-stat-val">${Math.round(Math.random()*100)} KB/s</div></div>
            <div class="sysmon-stat"><div class="sysmon-stat-icon">📀</div><div class="sysmon-stat-label">Диск</div><div class="sysmon-stat-val">${Math.round(Math.random()*30)} MB/s</div></div>`;

        // Графики
        this.drawChart(document.getElementById('cpu-chart-'+winId), data.cpu, 'var(--accent)');
        this.drawChart(document.getElementById('ram-chart-'+winId), data.ram, '#2ecc71');

        const procs=document.getElementById('sysmon-procs-'+winId);
        if(procs) procs.innerHTML=`<div class="sysmon-proc-header"><span>Процесс</span><span>CPU</span><span>RAM</span></div>`+
            ['AdminOS Core','Window Manager','Taskbar','Desktop','Clock','Notifications'].map((p,i)=>`
            <div class="sysmon-proc-row"><span>${p}</span><span>${Math.round(Math.random()*15)}%</span><span>${Math.round(10+Math.random()*40)} MB</span></div>`).join('');
    },

    drawChart(canvas, data, color) {
        if(!canvas) return;
        const ctx=canvas.getContext('2d'), w=canvas.width=canvas.parentElement?.clientWidth||200, h=canvas.height;
        ctx.clearRect(0,0,w,h);
        ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(0,0,w,h);
        if(data.length<2) return;
        ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=2;
        data.forEach((v,i)=>{ const x=i*(w/(data.length-1)), y=h-(v/100)*h; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
        ctx.stroke();
        ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
        ctx.fillStyle=color+'33'; ctx.fill();
    },

    // ── IMAGE VIEWER ──────────────────────────────────────────────
    imgvState: {},

    initImageViewer(winId) {
        this.imgvState[winId]={images:[],current:0,zoom:1,rotation:0};
        const input=document.getElementById('imgv-input-'+winId); if(!input) return;
        input.addEventListener('change',(e)=>{
            const files=Array.from(e.target.files);
            const st=this.imgvState[winId];
            st.images=files.map(f=>URL.createObjectURL(f));
            st.current=0; st.zoom=1; st.rotation=0;
            this.imgvRender(winId);
        });
    },

    imgvRender(winId) {
        const st=this.imgvState[winId], stage=document.getElementById('imgv-stage-'+winId); if(!stage) return;
        const counter=document.getElementById('imgv-counter-'+winId);
        if(!st.images.length){ stage.innerHTML='<div class="imgv-placeholder">🖼️<br>Открой изображения</div>'; if(counter)counter.textContent='0 / 0'; return; }
        if(counter) counter.textContent=`${st.current+1} / ${st.images.length}`;
        stage.innerHTML=`<img src="${st.images[st.current]}" style="max-width:100%;max-height:100%;transform:scale(${st.zoom}) rotate(${st.rotation}deg);transition:transform 0.2s;object-fit:contain;">`;
    },

    imgvNext(winId){ const st=this.imgvState[winId]; if(!st?.images.length)return; st.current=(st.current+1)%st.images.length; st.zoom=1; st.rotation=0; this.imgvRender(winId); },
    imgvPrev(winId){ const st=this.imgvState[winId]; if(!st?.images.length)return; st.current=(st.current-1+st.images.length)%st.images.length; st.zoom=1; st.rotation=0; this.imgvRender(winId); },
    imgvZoom(winId,d){ const st=this.imgvState[winId]; if(!st)return; st.zoom=Math.max(0.2,Math.min(5,st.zoom+d)); this.imgvRender(winId); },
    imgvRotate(winId){ const st=this.imgvState[winId]; if(!st)return; st.rotation=(st.rotation+90)%360; this.imgvRender(winId); },
    imgvReset(winId){ const st=this.imgvState[winId]; if(!st)return; st.zoom=1; st.rotation=0; this.imgvRender(winId); },

    // ── SNAKE ─────────────────────────────────────────────────────
    snakeState: {},

    initSnake(winId) {
        this.snakeState[winId]=null;
        const canvas=document.getElementById('snake-canvas-'+winId); if(!canvas) return;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#0a0a15'; ctx.fillRect(0,0,360,360);
        ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='20px Rajdhani'; ctx.textAlign='center';
        ctx.fillText('Нажми Старт',180,185);

        const handler=(e)=>{ const st=this.snakeState[winId]; if(!st) return; const keys={ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',w:'UP',s:'DOWN',a:'LEFT',d:'RIGHT',W:'UP',S:'DOWN',A:'LEFT',D:'RIGHT'}; if(keys[e.key]){ e.preventDefault(); const opp={UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'}; if(keys[e.key]!==opp[st.dir]) st.nextDir=keys[e.key]; } };
        document.addEventListener('keydown',handler);
        this['snakeKeyHandler_'+winId]=handler;
    },

    snakeStart(winId) {
        if(this['snakeLoop_'+winId]) clearInterval(this['snakeLoop_'+winId]);
        const SIZE=20, COLS=18, ROWS=18;
        const st={ snake:[{x:9,y:9},{x:8,y:9},{x:7,y:9}], dir:'RIGHT', nextDir:'RIGHT', food:{x:14,y:9}, score:0, alive:true };
        this.snakeState[winId]=st;
        const canvas=document.getElementById('snake-canvas-'+winId); if(!canvas) return;
        const ctx=canvas.getContext('2d');

        const newFood=()=>{ st.food={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}; };
        const draw=()=>{
            ctx.fillStyle='#0a0a15'; ctx.fillRect(0,0,360,360);
            // Сетка
            ctx.strokeStyle='rgba(255,255,255,0.03)';
            for(let i=0;i<=COLS;i++){ ctx.beginPath();ctx.moveTo(i*SIZE,0);ctx.lineTo(i*SIZE,360);ctx.stroke(); }
            for(let i=0;i<=ROWS;i++){ ctx.beginPath();ctx.moveTo(0,i*SIZE);ctx.lineTo(360,i*SIZE);ctx.stroke(); }
            // Еда
            ctx.fillStyle='#e74c3c'; ctx.beginPath(); ctx.arc(st.food.x*SIZE+SIZE/2,st.food.y*SIZE+SIZE/2,SIZE/2-2,0,Math.PI*2); ctx.fill();
            // Змея
            st.snake.forEach((seg,i)=>{ const g=ctx.createRadialGradient(seg.x*SIZE+SIZE/2,seg.y*SIZE+SIZE/2,0,seg.x*SIZE+SIZE/2,seg.y*SIZE+SIZE/2,SIZE/2); g.addColorStop(0,i===0?'#00ff88':'#00cc66'); g.addColorStop(1,i===0?'#00cc66':'#009944'); ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(seg.x*SIZE+1,seg.y*SIZE+1,SIZE-2,SIZE-2,4); ctx.fill(); });
        };

        this['snakeLoop_'+winId]=setInterval(()=>{
            if(!st.alive) return;
            st.dir=st.nextDir;
            const head={...st.snake[0]};
            if(st.dir==='UP')head.y--; if(st.dir==='DOWN')head.y++; if(st.dir==='LEFT')head.x--; if(st.dir==='RIGHT')head.x++;
            if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||st.snake.some(s=>s.x===head.x&&s.y===head.y)){
                st.alive=false; ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,140,360,80);
                ctx.fillStyle='#e74c3c'; ctx.font='bold 28px Rajdhani'; ctx.textAlign='center'; ctx.fillText('GAME OVER — '+st.score+' очков',180,175);
                ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='16px Rajdhani'; ctx.fillText('Нажми Старт снова',180,200);
                this.showNotification('Змейка: '+st.score+' очков','🐍'); return;
            }
            st.snake.unshift(head);
            if(head.x===st.food.x&&head.y===st.food.y){ st.score+=10; newFood(); }
            else st.snake.pop();
            document.getElementById('snake-score-'+winId).textContent='Счёт: '+st.score;
            draw();
        },130);
        draw();
    },

    // ── TETRIS ────────────────────────────────────────────────────
    tetrisState: {},

    initTetris(winId) {
        this.tetrisState[winId]=null;
        const canvas=document.getElementById('tetris-canvas-'+winId); if(!canvas) return;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#0a0a15'; ctx.fillRect(0,0,240,480);
        ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='18px Rajdhani'; ctx.textAlign='center';
        ctx.fillText('Нажми Старт',120,245);

        const handler=(e)=>{ const st=this.tetrisState[winId]; if(!st||st.gameOver) return;
            if(e.key==='ArrowLeft'){e.preventDefault();this.tetrisMove(winId,-1,0);}
            else if(e.key==='ArrowRight'){e.preventDefault();this.tetrisMove(winId,1,0);}
            else if(e.key==='ArrowDown'){e.preventDefault();this.tetrisMove(winId,0,1);}
            else if(e.key==='ArrowUp'){e.preventDefault();this.tetrisRotate(winId);}
            else if(e.key===' '){e.preventDefault();this.tetrisDrop(winId);}
        };
        document.addEventListener('keydown',handler);
        this['tetrisKeyHandler_'+winId]=handler;
    },

    tetrisStart(winId) {
        if(this['tetrisLoop_'+winId]) clearInterval(this['tetrisLoop_'+winId]);
        const COLS=10, ROWS=20;
        const PIECES=[ [[1,1,1,1]], [[1,1],[1,1]], [[1,1,1],[0,1,0]], [[1,1,1],[1,0,0]], [[1,1,1],[0,0,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]] ];
        const COLORS=['#00f5ff','#ffdd00','#cc44ff','#ff8800','#0066ff','#ff4444','#44ff44'];
        const newPiece=()=>{ const i=Math.floor(Math.random()*PIECES.length); return {shape:PIECES[i],color:COLORS[i],x:3,y:0}; };
        const st={ board:Array.from({length:ROWS},()=>Array(COLS).fill(0)), cur:newPiece(), next:newPiece(), score:0, level:1, lines:0, gameOver:false };
        this.tetrisState[winId]=st;

        const canvas=document.getElementById('tetris-canvas-'+winId); const ctx=canvas?.getContext('2d');
        const S=24;
        const draw=()=>{
            if(!ctx) return;
            ctx.fillStyle='#0a0a15'; ctx.fillRect(0,0,240,480);
            // Сетка
            ctx.strokeStyle='rgba(255,255,255,0.04)';
            for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,480);ctx.stroke();}
            for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(240,y*S);ctx.stroke();}
            // Доска
            st.board.forEach((row,y)=>row.forEach((v,x)=>{ if(v){ctx.fillStyle=v;ctx.fillRect(x*S+1,y*S+1,S-2,S-2);ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.strokeRect(x*S+1,y*S+1,S-2,S-2);} }));
            // Текущая фигура
            st.cur.shape.forEach((row,dy)=>row.forEach((v,dx)=>{ if(v){ctx.fillStyle=st.cur.color;ctx.fillRect((st.cur.x+dx)*S+1,(st.cur.y+dy)*S+1,S-2,S-2);ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.strokeRect((st.cur.x+dx)*S+1,(st.cur.y+dy)*S+1,S-2,S-2);} }));
            if(st.gameOver){ ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,180,240,120); ctx.fillStyle='#e74c3c';ctx.font='bold 26px Rajdhani';ctx.textAlign='center';ctx.fillText('GAME OVER',120,220); ctx.fillStyle='#fff';ctx.font='16px Rajdhani';ctx.fillText('Счёт: '+st.score,120,248);ctx.fillText('Нажми Старт',120,272); }
        };
        const nc=document.getElementById('tetris-next-'+winId); const nc2=nc?.getContext('2d');
        const drawNext=()=>{ if(!nc2) return; nc2.fillStyle='#0a0a15';nc2.fillRect(0,0,100,100); const s=20; st.next.shape.forEach((row,dy)=>row.forEach((v,dx)=>{ if(v){nc2.fillStyle=st.next.color;nc2.fillRect(dx*s+10,dy*s+10,s-2,s-2);} })); };
        const valid=(piece,dx=0,dy=0,shape=piece.shape)=>{ return shape.every((row,r)=>row.every((v,c)=>{ if(!v)return true; const nx=piece.x+c+dx,ny=piece.y+r+dy; return nx>=0&&nx<COLS&&ny<ROWS&&(ny<0||!st.board[ny][nx]); })); };

        this.tetrisMove = (wid,dx,dy)=>{ if(wid!==winId)return; if(valid(st,dx,dy)){{st.cur.x+=dx;st.cur.y+=dy;} draw(); } };
        this.tetrisRotate=(wid)=>{ if(wid!==winId)return; const rot=st.cur.shape[0].map((_,i)=>st.cur.shape.map(r=>r[i]).reverse()); if(valid(st,0,0,rot)){st.cur.shape=rot;draw();} };
        this.tetrisDrop=(wid)=>{ if(wid!==winId)return; while(valid(st,0,1))st.cur.y++; this.tetrisTick(winId); };

        this['tetrisTick']=this['tetrisTick']||(()=>{});
        this['tetrisTick']=(wid)=>{
            if(wid!==winId)return;
            if(!valid(st,0,1)){
                st.cur.shape.forEach((row,dy)=>row.forEach((v,dx)=>{ if(v&&st.cur.y+dy>=0)st.board[st.cur.y+dy][st.cur.x+dx]=st.cur.color; }));
                let cleared=0; for(let y=ROWS-1;y>=0;y--){ if(st.board[y].every(v=>v)){st.board.splice(y,1);st.board.unshift(Array(COLS).fill(0));cleared++;y++;} }
                if(cleared){st.lines+=cleared;st.score+=cleared*100*st.level;st.level=Math.floor(st.lines/10)+1; document.getElementById('tetris-score-'+winId).textContent=st.score; document.getElementById('tetris-level-'+winId).textContent=st.level; document.getElementById('tetris-lines-'+winId).textContent=st.lines; }
                st.cur=st.next; st.next=newPiece(); drawNext();
                if(!valid(st,0,0)){st.gameOver=true;draw();clearInterval(this['tetrisLoop_'+winId]);this.showNotification('Тетрис: '+st.score+' очков','🧱');return;}
            } else st.cur.y++;
            draw();
        };

        this['tetrisLoop_'+winId]=setInterval(()=>this['tetrisTick'](winId), Math.max(100,500-st.level*40));
        draw(); drawNext();
    },

    // ── MINESWEEPER ───────────────────────────────────────────────
    msState: {},

    msStart(winId) {
        const diff=document.getElementById('ms-diff-'+winId)?.value||'medium';
        const cfg={easy:{cols:9,rows:9,mines:10},medium:{cols:16,rows:16,mines:40}};
        const {cols,rows,mines}=cfg[diff];
        const st={cols,rows,mines,board:[],revealed:[],flagged:[],gameOver:false,won:false,firstClick:true};
        st.board=Array.from({length:rows},()=>Array(cols).fill(0));
        st.revealed=Array.from({length:rows},()=>Array(cols).fill(false));
        st.flagged=Array.from({length:rows},()=>Array(cols).fill(false));
        this.msState[winId]=st;
        document.getElementById('ms-mines-'+winId).textContent='💣 '+mines;
        document.getElementById('ms-status-'+winId).textContent='ЛКМ — открыть, ПКМ — флаг';
        this.msRender(winId);
    },

    msPlaceMines(winId, safeX, safeY) {
        const st=this.msState[winId]; let placed=0;
        while(placed<st.mines){ const x=Math.floor(Math.random()*st.cols),y=Math.floor(Math.random()*st.rows); if(st.board[y][x]!=-1&&!(x===safeX&&y===safeY)){st.board[y][x]=-1;placed++;} }
        for(let y=0;y<st.rows;y++) for(let x=0;x<st.cols;x++) if(st.board[y][x]!==-1){ let c=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const ny=y+dy,nx=x+dx; if(ny>=0&&ny<st.rows&&nx>=0&&nx<st.cols&&st.board[ny][nx]===-1)c++; } st.board[y][x]=c; }
    },

    msReveal(winId, x, y) {
        const st=this.msState[winId]; if(!st||st.gameOver||st.revealed[y][x]||st.flagged[y][x]) return;
        if(st.firstClick){ this.msPlaceMines(winId,x,y); st.firstClick=false; }
        st.revealed[y][x]=true;
        if(st.board[y][x]===-1){ st.gameOver=true; for(let ry=0;ry<st.rows;ry++) for(let rx=0;rx<st.cols;rx++) if(st.board[ry][rx]===-1)st.revealed[ry][rx]=true; document.getElementById('ms-status-'+winId).textContent='💥 БУМ! Ты проиграл!'; this.showNotification('Сапёр: Подорвался!','💣'); }
        else if(st.board[y][x]===0){ for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const ny=y+dy,nx=x+dx; if(ny>=0&&ny<st.rows&&nx>=0&&nx<st.cols&&!st.revealed[ny][nx])this.msReveal(winId,nx,ny); } }
        const total=st.rows*st.cols, rev=st.revealed.flat().filter(Boolean).length;
        if(!st.gameOver&&rev===total-st.mines){ st.won=true; st.gameOver=true; document.getElementById('ms-status-'+winId).textContent='🎉 Победа!'; this.showNotification('Сапёр: Победа! 🎉','🏆'); }
        this.msRender(winId);
    },

    msFlag(winId, x, y, e) {
        e.preventDefault(); const st=this.msState[winId]; if(!st||st.gameOver||st.revealed[y][x]) return;
        st.flagged[y][x]=!st.flagged[y][x];
        const flags=st.flagged.flat().filter(Boolean).length;
        document.getElementById('ms-mines-'+winId).textContent='💣 '+(st.mines-flags);
        this.msRender(winId);
    },

    msRender(winId) {
        const st=this.msState[winId], board=document.getElementById('ms-board-'+winId); if(!board||!st) return;
        board.style.gridTemplateColumns=`repeat(${st.cols},1fr)`;
        board.innerHTML='';
        for(let y=0;y<st.rows;y++) for(let x=0;x<st.cols;x++){
            const cell=document.createElement('div'); cell.className='ms-cell';
            if(st.revealed[y][x]){ cell.classList.add('revealed'); const v=st.board[y][x]; if(v===-1)cell.textContent='💣'; else if(v>0){cell.textContent=v;cell.dataset.num=v;} }
            else if(st.flagged[y][x]){ cell.textContent='🚩'; }
            cell.onclick=()=>this.msReveal(winId,x,y);
            cell.oncontextmenu=(e)=>this.msFlag(winId,x,y,e);
            board.appendChild(cell);
        }
    },

    // ── PONG ──────────────────────────────────────────────────────
    pongState: {},

    pongStart(winId) {
        if(this['pongAnim_'+winId]) cancelAnimationFrame(this['pongAnim_'+winId]);
        const canvas=document.getElementById('pong-canvas-'+winId); if(!canvas) return;
        const ctx=canvas.getContext('2d'), W=560, H=360, PS=80, PW=10;
        const st={ p1:{y:H/2-PS/2,score:0,up:false,down:false}, p2:{y:H/2-PS/2,score:0,up:false,down:false}, ball:{x:W/2,y:H/2,dx:4,dy:3}, running:true };
        this.pongState[winId]=st;

        const kh=(e)=>{ const map={w:'p1u',s:'p1d',W:'p1u',S:'p1d',ArrowUp:'p2u',ArrowDown:'p2d'}; const a=map[e.key]; if(!a)return; e.preventDefault(); if(a==='p1u')st.p1.up=e.type==='keydown'; if(a==='p1d')st.p1.down=e.type==='keydown'; if(a==='p2u')st.p2.up=e.type==='keydown'; if(a==='p2d')st.p2.down=e.type==='keydown'; };
        document.addEventListener('keydown',kh); document.addEventListener('keyup',kh);
        this['pongKeyHandler_'+winId]=kh;

        const loop=()=>{
            if(!st.running) return;
            const spd=5;
            if(st.p1.up)  st.p1.y=Math.max(0,st.p1.y-spd);
            if(st.p1.down)st.p1.y=Math.min(H-PS,st.p1.y+spd);
            if(st.p2.up)  st.p2.y=Math.max(0,st.p2.y-spd);
            if(st.p2.down)st.p2.y=Math.min(H-PS,st.p2.y+spd);

            st.ball.x+=st.ball.dx; st.ball.y+=st.ball.dy;
            if(st.ball.y<=0||st.ball.y>=H) st.ball.dy*=-1;
            if(st.ball.x<=PW+10&&st.ball.y>=st.p1.y&&st.ball.y<=st.p1.y+PS) st.ball.dx=Math.abs(st.ball.dx)*1.05;
            if(st.ball.x>=W-PW-10&&st.ball.y>=st.p2.y&&st.ball.y<=st.p2.y+PS) st.ball.dx=-Math.abs(st.ball.dx)*1.05;
            if(st.ball.x<0){ st.p2.score++; st.ball={x:W/2,y:H/2,dx:4,dy:3}; document.getElementById('pong-score-'+winId).textContent=st.p1.score+' : '+st.p2.score; }
            if(st.ball.x>W){ st.p1.score++; st.ball={x:W/2,y:H/2,dx:-4,dy:3}; document.getElementById('pong-score-'+winId).textContent=st.p1.score+' : '+st.p2.score; }

            ctx.fillStyle='#0a0a15'; ctx.fillRect(0,0,W,H);
            ctx.setLineDash([10,10]); ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle='rgba(255,255,255,0.9)';
            ctx.fillRect(10,st.p1.y,PW,PS); ctx.fillRect(W-PW-10,st.p2.y,PW,PS);
            ctx.beginPath(); ctx.arc(st.ball.x,st.ball.y,7,0,Math.PI*2); ctx.fillStyle=this.settings.accentColor; ctx.fill();
            this['pongAnim_'+winId]=requestAnimationFrame(loop);
        };
        loop();
    },

    // ── SETTINGS ──────────────────────────────────────────────────
    initSettings(winId) { this.setShowTab(winId,'personalization'); },

    setTab(el, tab) {
        el.closest('.settings-sidebar').querySelectorAll('.set-nav-item').forEach(i=>i.classList.remove('active'));
        el.classList.add('active');
        this.setShowTab(el.closest('.window').id, tab);
    },

    setShowTab(winId, tab) {
        const c=document.getElementById('settings-content-'+winId); if(!c) return;
        if(tab==='personalization') c.innerHTML=`
            <div class="set-section">
                <h3 class="set-title">🖼️ Обои рабочего стола</h3>
                <div class="wallpaper-grid">${this.settings.wallpapers.map(wp=>`
                    <div class="wp-thumb ${this.settings.wallpaper===wp?'active':''}" style="background-image:url('${wp}')"
                        onclick="AdminOS.applyWallpaper('${wp}');AdminOS.initSettings('${winId}')"></div>`).join('')}
                </div>
            </div>
            <div class="set-section">
                <h3 class="set-title">✨ Живые обои (частицы)</h3>
                <label class="set-toggle">
                    <input type="checkbox" id="live-wp-toggle-${winId}" ${this.settings.liveWallpaper?'checked':''} onchange="AdminOS.toggleLiveWallpaper('${winId}',this.checked)">
                    <span class="set-toggle-label">Включить анимированный фон</span>
                </label>
            </div>
            <div class="set-section">
                <h3 class="set-title">🎨 Цвет акцента</h3>
                <div class="accent-grid">${['#0078d4','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e91e63','#ff5722'].map(c=>`
                    <div class="accent-swatch ${this.settings.accentColor===c?'active':''}" style="background:${c}"
                        onclick="AdminOS.applyAccentColor('${c}');AdminOS.initSettings('${winId}')"></div>`).join('')}
                </div>
            </div>
            <div class="set-section">
                <h3 class="set-title">🌙 Тема</h3>
                <div style="display:flex;gap:10px;">
                    <button class="set-btn ${this.settings.theme==='dark'?'':'set-btn-outline'}" onclick="AdminOS.applyTheme('dark');AdminOS.initSettings('${winId}')">🌑 Тёмная</button>
                    <button class="set-btn ${this.settings.theme==='light'?'':'set-btn-outline'}" onclick="AdminOS.applyTheme('light');AdminOS.initSettings('${winId}')">☀️ Светлая</button>
                </div>
            </div>`;
        else if(tab==='account') c.innerHTML=`
            <div class="set-section">
                <h3 class="set-title">👤 Имя пользователя</h3>
                <input class="set-input" id="set-uname-${winId}" type="text" value="${this.settings.username}">
                <button class="set-btn" onclick="AdminOS.setUsername('${winId}')">Сохранить</button>
            </div>`;
        else if(tab==='system') c.innerHTML=`
            <div class="set-section">
                <h3 class="set-title">💻 О системе</h3>
                <div class="set-info-row"><span>Система</span><span>AdminOS Web 3.0</span></div>
                <div class="set-info-row"><span>Разрешение</span><span>${window.innerWidth}×${window.innerHeight}</span></div>
                <div class="set-info-row"><span>Память JS</span><span>${Math.round(performance?.memory?.usedJSHeapSize/1048576||0)} MB</span></div>
                <div class="set-info-row"><span>Окон открыто</span><span>${Object.keys(this.activeWindows).length}</span></div>
                <div class="set-info-row"><span>Рабочий стол</span><span>${this.currentDesktop+1} из ${this.totalDesktops}</span></div>
            </div>
            <div class="set-section">
                <h3 class="set-title">🗑️ Сброс данных</h3>
                <button class="set-btn set-btn-danger" onclick="AdminOS.resetAll()">Сбросить всё</button>
            </div>`;
    },

    setUsername(winId) {
        const v=document.getElementById('set-uname-'+winId)?.value.trim();
        if(v){ this.settings.username=v; this.saveSettings(); this.showNotification('Имя: '+v,'👤'); }
    },

    toggleLiveWallpaper(winId, on) {
        if(on) this.startLiveWallpaper();
        else { this.stopLiveWallpaper(); this.applyWallpaper(this.settings.wallpaper); }
    },

    resetAll() { if(confirm('Сбросить все данные?')){ localStorage.clear(); location.reload(); } },
};

window.AdminOS = AdminOS;
document.addEventListener('DOMContentLoaded', () => AdminOS.init());