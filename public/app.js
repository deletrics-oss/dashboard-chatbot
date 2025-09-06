const socket = io();

// ======== Status WhatsApp ========
socket.on('whatsapp:status', (s) => {
  const el = document.getElementById('wa-status');
  el.textContent = s.state;
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

socket.on('log:bulk', (arr) => {
  arr.forEach(addLog);
});
socket.on('log:new', addLog);

// ======== Métrica mensagens por hora ========
let chartCtx = document.getElementById('chart').getContext('2d');
let chart = new Chart(chartCtx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Mensagens',
      data: [],
    }],
  },
  options: { scales: { y: { beginAtZero: true } } },
});

socket.on('metrics:messages_per_hour', (arr) => {
  chart.data.labels = arr.map(x =>
    new Date(x.tsStart).toLocaleTimeString([], {hour:'2-digit'})
  );
  chart.data.datasets[0].data = arr.map(x => x.total);
  chart.update();
});

// ======== Lógicas ========
function renderLogics(list) {
  const tbody = document.querySelector('#logics-table tbody');
  tbody.innerHTML = '';
  list.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.file}</td>
      <td>${l.name}</td>
      <td><button onclick="removeLogic('${l.file}')">🗑️ Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function removeLogic(filename) {
  fetch('/api/logics/' + filename, { method: 'DELETE' })
    .then(() => refreshLogics());
}

function refreshLogics() {
  fetch('/api/logics')
    .then(r => r.json())
    .then(data => renderLogics(data.items));
}

function refreshTrash() {
  fetch('/api/logics') // poderia ter endpoint próprio, mas simples aqui
    .then(() => {
      // lixeira está em /logics/.trash (pode expor endpoint se quiser)
      document.getElementById('trash-list').innerHTML =
        '<li>Carregar a lixeira via endpoint específico</li>';
    });
}

socket.on('logics:list', (list) => {
  renderLogics(list);
});

// inicial
refreshLogics();
refreshTrash();
