const socket = io();

// ======== Status WhatsApp ========
socket.on('whatsapp:status', (s) => {
  document.getElementById('wa-status').textContent = s.state;
  if (s.state === 'qr' && s.qr) {
    document.getElementById('qr-container').innerHTML =
      `<img src="${s.qr}" alt="QR Code" />`;
  } else {
    document.getElementById('qr-container').innerHTML = '';
  }
});

// ======== Logs ========
function addLog(item) {
  const el = document.createElement('div');
  const dt = new Date(item.ts).toLocaleTimeString();
  el.textContent = `[${dt}] [${item.level}] ${item.msg}`;
  document.getElementById('logs').prepend(el);
}
socket.on('log:bulk', (arr) => arr.forEach(addLog));
socket.on('log:new', addLog);

// ======== Chart ========
let ctx = document.getElementById('chart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'bar',
  data: { labels: [], datasets: [{ label: 'Mensagens', data: [], backgroundColor: '#4cafef' }] },
  options: { scales: { y: { beginAtZero: true } }, animation: false }
});
socket.on('metrics:messages_per_hour', (arr) => {
  chart.data.labels = arr.map(x => new Date(x.tsStart).toLocaleTimeString([], {hour:'2-digit'}));
  chart.data.datasets[0].data = arr.map(x => x.total);
  chart.update();
});

// ======== Logics ========
function renderLogics(list) {
  const tbody = document.querySelector('#logics-table tbody');
  tbody.innerHTML = '';
  list.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${l.file}</td><td>${l.name}</td><td><button onclick="removeLogic('${l.file}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}
function removeLogic(f) {
  fetch('/api/logics/' + f, { method: 'DELETE' }).then(() => { refreshLogics(); refreshTrash(); });
}
function refreshLogics() {
  fetch('/api/logics').then(r=>r.json()).then(d=>renderLogics(d.items));
}
function renderTrash(list) {
  const ul = document.getElementById('trash-list'); ul.innerHTML='';
  if (!list.length) return ul.innerHTML='<li>(vazio)</li>';
  list.forEach(n=>{
    const li=document.createElement('li');
    li.innerHTML=`${n} <button onclick="restoreLogic('${n}')">♻️</button>`;
    ul.appendChild(li);
  });
}
function refreshTrash() {
  fetch('/api/logics/trash').then(r=>r.json()).then(d=>renderTrash(d.items));
}
function restoreLogic(n) {
  fetch('/api/logics/restore/' + n, { method: 'POST' }).then(()=>{ refreshLogics(); refreshTrash(); });
}
socket.on('logics:list', (list)=>{ renderLogics(list); refreshTrash(); });
refreshLogics(); refreshTrash();
