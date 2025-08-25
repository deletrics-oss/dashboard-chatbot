<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Chatbot Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f0f2f5; }
        .card { background-color: white; border-radius: 0.75rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1); }
        .device-link.active { background-color: #1e3a8a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .log-container::-webkit-scrollbar-track { background: #1e293b; }
        .log-container::-webkit-scrollbar-thumb { background: #475569; }
    </style>
</head>
<body class="text-slate-800">

    <!-- Ecrã de Login -->
    <div id="login-screen" class="flex items-center justify-center h-screen">
        <div class="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
            <h1 class="text-3xl font-bold text-center text-slate-900">Login</h1>
            <div id="login-error" class="hidden p-3 text-sm text-red-700 bg-red-100 rounded-lg">Utilizador ou palavra-passe inválidos.</div>
            <div>
                <label for="username" class="text-sm font-medium text-slate-700">Utilizador</label>
                <input id="username" type="text" class="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm" placeholder="ex: admin1">
            </div>
            <div>
                <label for="password" class="text-sm font-medium text-slate-700">Palavra-passe</label>
                <input id="password" type="password" class="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm" placeholder="ex: suporte@1">
            </div>
            <button id="login-btn" class="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Entrar</button>
        </div>
    </div>

    <!-- Dashboard Principal -->
    <div id="dashboard-screen" class="hidden flex h-screen">
        <aside class="w-80 bg-slate-900 text-slate-200 flex flex-col">
            <div class="p-4 border-b border-slate-700 flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xl">FA</div>
                <div><h1 class="text-lg font-bold text-white">Fight Arcade</h1><p id="logged-in-user" class="text-xs text-blue-300"></p></div>
            </div>
            <div class="p-4">
                <button id="add-device-btn" class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"><i data-lucide="plus-circle" class="w-5 h-5"></i> Adicionar Dispositivo</button>
            </div>
            <nav id="device-list" class="flex-1 p-4 space-y-2 overflow-y-auto"></nav>
            <div class="p-4 border-t border-slate-700">
                 <button id="logout-btn" class="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white font-semibold py-2 px-4 rounded-lg transition"><i data-lucide="log-out" class="w-5 h-5"></i> Sair</button>
            </div>
        </aside>

        <main id="main-content" class="flex-1 p-6 overflow-y-auto">
            <div id="welcome-screen" class="flex flex-col items-center justify-center h-full text-center">
                <i data-lucide="smartphone-charging" class="w-24 h-24 text-slate-400 mb-4"></i>
                <h2 class="text-3xl font-bold text-slate-700">Bem-vindo</h2>
                <p class="text-slate-500 mt-2">Selecione um dispositivo ou adicione um novo para começar.</p>
            </div>
            
            <div id="dashboard-view" class="hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold text-slate-800">Painel: <span id="device-name-header" class="text-blue-600"></span></h2>
                    <div class="flex items-center gap-4">
                        <div id="status-indicator" class="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold"></div>
                        <button id="delete-device-btn" title="Remover Dispositivo" class="p-2 text-slate-500 hover:text-red-500 hover:bg-red-100 rounded-full transition"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="card p-4 flex items-center gap-4"><div id="status-icon" class="w-12 h-12 rounded-full flex items-center justify-center"></div><div><p class="text-sm text-slate-500">Status da Conexão</p><p id="status-card-text" class="text-2xl font-bold"></p></div></div>
                    <div class="card p-4 flex items-center gap-4"><div class="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-600"><i data-lucide="message-square"></i></div><div><p class="text-sm text-slate-500">Mensagens Hoje</p><p id="messages-today" class="text-2xl font-bold">0</p></div></div>
                    <div class="card p-4 flex items-center gap-4"><div class="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-600"><i data-lucide="users"></i></div><div><p class="text-sm text-slate-500">Utilizadores Ativos</p><p id="active-users" class="text-2xl font-bold">0</p></div></div>
                    <div class="card p-4 flex items-center gap-4"><div class="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600"><i data-lucide="timer"></i></div><div><p class="text-sm text-slate-500">Tempo Ativo</p><p id="uptime" class="text-2xl font-bold">0s</p></div></div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="lg:col-span-1 card p-6 flex flex-col">
                         <h3 class="font-semibold text-lg mb-4">Autenticação WhatsApp</h3>
                        <div id="auth-container" class="flex-1 flex flex-col items-center justify-center min-h-[250px] bg-slate-50 rounded-lg p-4">
                            <div id="qr-code-container" class="text-center"></div>
                            <div id="connected-container" class="hidden text-center">
                                <i data-lucide="check-circle-2" class="w-20 h-20 text-green-500 mx-auto"></i>
                                <p class="font-semibold text-green-500 mt-2">Dispositivo conectado</p>
                            </div>
                        </div>
                    </div>
                    <div class="lg:col-span-1 card p-6 flex flex-col">
                        <h3 class="font-semibold text-lg mb-4">Logs do Sistema</h3>
                        <div id="logs-container" class="flex-1 h-96 log-container overflow-y-auto bg-slate-900 text-white font-mono text-xs p-4 rounded-lg"></div>
                    </div>
                </div>
                 <div class="card p-6 mt-6">
                    <h3 class="font-semibold text-lg mb-4">Mensagens Recentes</h3>
                    <div id="recent-messages-container" class="h-96 overflow-y-auto space-y-4 p-2"></div>
                </div>
            </div>
        </main>
    </div>

    <script>
        lucide.createIcons();
        const socket = io();
        let selectedDeviceId = null, loggedInUsername = null, uptimeInterval;

        const ui = {
            loginScreen: document.getElementById('login-screen'),
            dashboardScreen: document.getElementById('dashboard-screen'),
            loginBtn: document.getElementById('login-btn'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            loginError: document.getElementById('login-error'),
            deviceList: document.getElementById('device-list'),
            addDeviceBtn: document.getElementById('add-device-btn'),
            deleteDeviceBtn: document.getElementById('delete-device-btn'),
            welcomeScreen: document.getElementById('welcome-screen'),
            dashboardView: document.getElementById('dashboard-view'),
            deviceNameHeader: document.getElementById('device-name-header'),
            statusIndicator: document.getElementById('status-indicator'),
            statusCardText: document.getElementById('status-card-text'),
            statusIcon: document.getElementById('status-icon'),
            qrContainer: document.getElementById('qr-code-container'),
            connectedContainer: document.getElementById('connected-container'),
            logsContainer: document.getElementById('logs-container'),
            loggedInUserElem: document.getElementById('logged-in-user'),
            logoutBtn: document.getElementById('logout-btn'),
            messagesTodayElem: document.getElementById('messages-today'),
            activeUsersElem: document.getElementById('active-users'),
            uptimeElem: document.getElementById('uptime'),
            recentMessagesContainer: document.getElementById('recent-messages-container'),
        };

        const showDashboard = (data) => {
            loggedInUsername = data.username;
            ui.loggedInUserElem.textContent = `Utilizador: ${loggedInUsername}`;
            ui.loginScreen.classList.add('hidden');
            ui.dashboardScreen.classList.remove('hidden');
            ui.dashboardScreen.classList.add('flex');
        };

        const selectDevice = (deviceId) => {
            selectedDeviceId = deviceId;
            document.querySelectorAll('.device-link').forEach(el => el.classList.remove('active'));
            document.querySelector(`.device-link[data-id="${deviceId}"]`)?.classList.add('active');
            ui.welcomeScreen.classList.add('hidden');
            ui.dashboardView.classList.remove('hidden');
            ui.deviceNameHeader.textContent = deviceId;
            ['logsContainer', 'recentMessagesContainer'].forEach(c => ui[c].innerHTML = '');
            ui.qrContainer.innerHTML = '<button id="reconnect-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">Conectar / Gerar QR</button>';
            document.getElementById('reconnect-button').onclick = () => {
                socket.emit('reconnect_client', selectedDeviceId);
                ui.qrContainer.innerHTML = `<p class="text-slate-500">A inicializar...</p>`;
            };
            ui.connectedContainer.classList.add('hidden');
            updateStatus({ status: 'Desconectado' });
            socket.emit('request_device_data', deviceId);
        };
        
        const addMessageToUI = (msg) => {
            if (ui.recentMessagesContainer.querySelector('p')) ui.recentMessagesContainer.innerHTML = '';
            const isUser = msg.type === 'user';
            const messageDiv = document.createElement('div');
            messageDiv.className = `w-full flex ${isUser ? 'justify-start' : 'justify-end'}`;
            messageDiv.innerHTML = `<div class="max-w-xs md:max-w-md p-3 rounded-lg ${isUser ? 'bg-slate-200' : 'bg-blue-500 text-white'}"><p class="text-sm font-bold">${isUser ? msg.from : 'Bot'}</p><p class="text-sm">${msg.body}</p><p class="text-xs text-right opacity-75 mt-1">${new Date(msg.timestamp).toLocaleTimeString()}</p></div>`;
            ui.recentMessagesContainer.appendChild(messageDiv);
            ui.recentMessagesContainer.scrollTop = ui.recentMessagesContainer.scrollHeight;
        };

        const addLogToUI = (log) => {
            if (ui.logsContainer.querySelector('p')) ui.logsContainer.innerHTML = '';
            ui.logsContainer.innerHTML += `<p><span class="text-green-400">${new Date(log.timestamp).toLocaleTimeString()}:</span> ${log.message}</p>`;
            ui.logsContainer.scrollTop = ui.logsContainer.scrollHeight;
        };

        const populateDeviceData = (data) => {
            if (data.clientId !== selectedDeviceId) return;
            ui.logsContainer.innerHTML = data.logs.length ? '' : '<p class="text-slate-400">Nenhum log.</p>';
            data.logs.forEach(addLogToUI);
            ui.recentMessagesContainer.innerHTML = data.recentMessages.length ? '' : '<p class="text-center text-slate-500">Nenhuma mensagem.</p>';
            data.recentMessages.forEach(addMessageToUI);
            ui.messagesTodayElem.textContent = data.stats.messagesToday;
            ui.activeUsersElem.textContent = data.stats.activeUsers;
        };
        
        const renderDeviceList = (devices) => {
            ui.deviceList.innerHTML = devices.length > 0 ? '' : '<p class="text-center text-slate-400">Nenhum dispositivo.</p>';
            devices.forEach(device => addDeviceToList(device.id, device.status));
        };

        const addDeviceToList = (deviceId, status) => {
            if (ui.deviceList.querySelector('p')) ui.deviceList.innerHTML = '';
            if (document.querySelector(`.device-link[data-id="${deviceId}"]`)) return;

            const deviceDiv = document.createElement('a');
            deviceDiv.href = '#';
            deviceDiv.className = 'device-link flex items-center justify-between p-3 rounded-lg text-slate-200 hover:bg-slate-700';
            deviceDiv.dataset.id = deviceId;
            deviceDiv.innerHTML = `<div class="flex items-center gap-3"><i data-lucide="smartphone"></i><span class="font-bold">${deviceId}</span></div><div class="status-dot h-3 w-3 rounded-full"></div>`;
            deviceDiv.onclick = (e) => { e.preventDefault(); selectDevice(deviceId); };
            ui.deviceList.appendChild(deviceDiv);
            lucide.createIcons();
            updateDeviceStatusInList(deviceId, status);
        };

        const updateDeviceStatusInList = (deviceId, status) => {
            const dot = ui.deviceList.querySelector(`.device-link[data-id="${deviceId}"] .status-dot`);
            if (!dot) return;
            const statusClasses = {'Conectado': 'bg-green-500', 'Aguardando QR': 'bg-yellow-500 animate-pulse', 'Desconectado': 'bg-red-500', 'Falha': 'bg-red-700', 'A inicializar': 'bg-blue-500 animate-pulse', 'default': 'bg-slate-500'};
            dot.className = `status-dot h-3 w-3 rounded-full ${statusClasses[status] || statusClasses.default}`;
        };

        const updateStatus = (statusData) => {
            const { status } = statusData;
            ui.statusCardText.textContent = status;

            const statusClasses = {
                'Conectado': { text: 'Conectado', bg: 'bg-green-100', textClr: 'text-green-800', iconBg: 'bg-green-100', iconClr: 'text-green-600', icon: 'wifi' },
                'Aguardando QR': { text: 'Aguardando QR', bg: 'bg-yellow-100', textClr: 'text-yellow-800', iconBg: 'bg-yellow-100', iconClr: 'text-yellow-600', icon: 'qr-code' },
                'Desconectado': { text: 'Desconectado', bg: 'bg-red-100', textClr: 'text-red-800', iconBg: 'bg-red-100', iconClr: 'text-red-600', icon: 'wifi-off' },
                'default': { text: status, bg: 'bg-slate-100', textClr: 'text-slate-800', iconBg: 'bg-slate-100', iconClr: 'text-slate-600', icon: 'power-off' }
            };
            const currentStatus = statusClasses[status] || statusClasses.default;
            
            ui.statusIndicator.className = `flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${currentStatus.bg} ${currentStatus.textClr}`;
            ui.statusIndicator.innerHTML = `<span class="h-2 w-2 rounded-full ${currentStatus.bg.replace('100', '500')}"></span> ${currentStatus.text}`;
            
            ui.statusCardText.className = `text-2xl font-bold ${currentStatus.textClr}`;
            ui.statusIcon.className = `w-12 h-12 rounded-full flex items-center justify-center ${currentStatus.iconBg} ${currentStatus.iconClr}`;
            ui.statusIcon.innerHTML = `<i data-lucide="${currentStatus.icon}"></i>`;

            if (status === 'Conectado') {
                ui.qrContainer.classList.add('hidden');
                ui.connectedContainer.classList.remove('hidden');
                if (!uptimeInterval) {
                    let startTime = new Date();
                    uptimeInterval = setInterval(() => {
                         const diff = Math.floor((new Date() - startTime) / 1000);
                         const h = Math.floor(diff / 3600).toString().padStart(2, '0');
                         const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                         const s = (diff % 60).toString().padStart(2, '0');
                         ui.uptimeElem.textContent = `${h}:${m}:${s}`;
                    }, 1000);
                }
            } else {
                ui.qrContainer.classList.remove('hidden');
                ui.connectedContainer.classList.add('hidden');
                clearInterval(uptimeInterval);
                uptimeInterval = null;
                ui.uptimeElem.textContent = '0s';
            }
            lucide.createIcons();
        };

        // --- Eventos de Botões e Ações ---
        ui.loginBtn.addEventListener('click', () => socket.emit('authenticate', { username: ui.usernameInput.value, password: ui.passwordInput.value }));
        ui.logoutBtn.addEventListener('click', () => location.reload());
        ui.addDeviceBtn.addEventListener('click', () => {
            const deviceId = prompt("Digite um nome único para o novo dispositivo (ex: fight-arcade):");
            if (deviceId && deviceId.trim() !== '') socket.emit('add_client', deviceId.trim());
        });
        ui.deleteDeviceBtn.addEventListener('click', () => {
            if (selectedDeviceId && confirm(`Tem a certeza que deseja remover o dispositivo "${selectedDeviceId}"?`)) {
                socket.emit('delete_client', selectedDeviceId);
            }
        });

        // --- Listeners do Socket.IO ---
        socket.on('authenticated', showDashboard);
        socket.on('unauthorized', () => ui.loginError.classList.remove('hidden'));
        socket.on('client_list', (devices) => { if (loggedInUsername) renderDeviceList(devices); });
        socket.on('client_added', (data) => { if (data.username === loggedInUsername) addDeviceToList(data.id, data.status); });
        socket.on('client_removed', (data) => {
            if (data.username === loggedInUsername) {
                const el = document.querySelector(`.device-link[data-id="${data.id}"]`);
                if (el) el.remove();
                if (selectedDeviceId === data.id) {
                    ui.welcomeScreen.classList.remove('hidden');
                    ui.dashboardView.classList.add('hidden');
                }
                if (ui.deviceList.children.length === 0) ui.deviceList.innerHTML = '<p class="text-center text-slate-400">Nenhum dispositivo.</p>';
            }
        });
        socket.on('client_update', (data) => { if (data.username === loggedInUsername) updateDeviceStatusInList(data.id, data.status); });
        socket.on('status_change', (data) => {
            if (data.username === loggedInUsername) {
                if (data.clientId === selectedDeviceId) updateStatus(data);
                updateDeviceStatusInList(data.clientId, data.status);
            }
        });
        socket.on('qr_code', (data) => {
            if (data.username === loggedInUsername && data.clientId === selectedDeviceId) {
                ui.qrContainer.innerHTML = `<img src="${data.qrData}" alt="QR Code" class="w-56 h-56 mx-auto"><p class="mt-2 text-sm text-slate-500">Escaneie com o seu WhatsApp</p>`;
                updateStatus({ status: 'Aguardando QR' });
            }
        });
        socket.on('new_log', (data) => {
            if (data.username === loggedInUsername && data.clientId === selectedDeviceId) addLogToUI(data.log);
        });
        socket.on('new_message', (data) => {
            if (data.username === loggedInUsername && data.clientId === selectedDeviceId) addMessageToUI(data.message);
        });
        socket.on('stats_update', (data) => {
            if (data.username === loggedInUsername && data.clientId === selectedDeviceId) {
                ui.messagesTodayElem.textContent = data.messagesToday;
                ui.activeUsersElem.textContent = data.activeUsers;
            }
        });
    </script>
</body>
</html>
