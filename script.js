// ========== VARIÁVEIS ==========
let cadastros = [];
let aniversariantes = [];
let eventos = [];
let stats = {};

// ========== FUNÇÕES DE INICIALIZAÇÃO ==========
window.addEventListener('DOMContentLoaded', () => {
    buscarDadosBackend(); // carrega tudo da BD ao iniciar
});

// ========== SIDEBAR ==========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    
    sidebar.classList.toggle('collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        toggleIcon.innerHTML = `
            <line x1="3" y1="12" x2="21" y2="12"/>
            <polyline points="8 5 15 12 8 19"/>
        `;
    } else {
        toggleIcon.innerHTML = `
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        `;
    }
}

function setActiveMenu(element) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    element.classList.add('active');
}

// ========== ESTATÍSTICAS ==========
function carregarStats() {
    document.getElementById('stat-membros').textContent = stats.membros;
    document.getElementById('stat-congregados').textContent = stats.congregados;
    document.getElementById('stat-nao-batizados').textContent = stats.nao_batizados;
    document.getElementById('stat-batizados').textContent = stats.batizados;
}

// ========== CADASTROS ==========
function carregarCadastros() {
    const tbody = document.getElementById('table-cadastros');
    tbody.innerHTML = '';
    
    cadastros.forEach(pessoa => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pessoa.nome}</td>
            <td class="text-gray">${pessoa.contato}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function adicionarCadastro(nome, contato) {
    const response = await fetch(`${API_URL}/membros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, contato })
    });
    const novoCadastro = await response.json();
    cadastros.push(novoCadastro);
    carregarCadastros();
    carregarStats();
}

// ========== ANIVERSARIANTES ==========
function carregarAniversariantes() {
    const tbody = document.getElementById('table-aniversariantes');
    tbody.innerHTML = '';
    
    aniversariantes.sort((a, b) => a.dia - b.dia);
    
    aniversariantes.forEach(pessoa => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pessoa.dia}</td>
            <td>${pessoa.nome}</td>
            <td class="text-gray">${pessoa.idade}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function adicionarAniversariante(dia, nome, idade) {
    const response = await fetch(`${API_URL}/aniversariantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dia, nome, idade })
    });
    const novoAniversariante = await response.json();
    aniversariantes.push(novoAniversariante);
    carregarAniversariantes();
}

// ========== EVENTOS ==========
function carregarEventos() {
    const container = document.getElementById('eventos-container');
    container.innerHTML = '';
    
    eventos.forEach(evento => {
        const eventoDiv = document.createElement('div');
        eventoDiv.className = 'evento-card';
        eventoDiv.innerHTML = `
            <div class="evento-date">
                <div class="mes">${evento.mes}</div>
                <div class="dia">${evento.dia}</div>
            </div>
            <div class="evento-info">
                <h4>${evento.titulo}</h4>
                <p>${evento.hora}</p>
                <span class="evento-tag">${evento.tag}</span>
            </div>
        `;
        container.appendChild(eventoDiv);
    });
}

async function adicionarEvento(mes, dia, titulo, hora, tag) {
    const response = await fetch(`${API_URL}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            titulo,
            data_evento: `2025-${mes}-${dia}`, // ajustar formato conforme BD
            hora_evento: hora,
            tipo_nome: tag
        })
    });
    const novoEvento = await response.json();
    eventos.push({
        mes: new Date(novoEvento.data_evento).toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        dia: new Date(novoEvento.data_evento).getDate(),
        titulo: novoEvento.titulo,
        hora: novoEvento.hora_evento,
        tag: novoEvento.tipo_nome
    });
    carregarEventos();
}

// ========== INTEGRAÇÃO COM BACKEND ==========
const API_URL = 'http://localhost:3001/api';

async function buscarDadosBackend() {
    try {
        const statsResponse = await fetch(`${API_URL}/stats`);
        if (statsResponse.ok) {
            stats = await statsResponse.json();
            carregarStats();
        }
        
        const membrosResponse = await fetch(`${API_URL}/membros`);
        if (membrosResponse.ok) {
            cadastros = await membrosResponse.json();
            carregarCadastros();
        }
        
        const eventosResponse = await fetch(`${API_URL}/eventos`);
        if (eventosResponse.ok) {
            const eventosData = await eventosResponse.json();
            eventos = eventosData.map(e => ({
                mes: new Date(e.data_evento).toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
                dia: new Date(e.data_evento).getDate(),
                titulo: e.titulo,
                hora: e.hora_evento,
                tag: e.tipo_nome || 'Evento'
            }));
            carregarEventos();
        }
        
        const aniversariantesResponse = await fetch(`${API_URL}/aniversariantes`);
        if (aniversariantesResponse.ok) {
            aniversariantes = await aniversariantesResponse.json();
            carregarAniversariantes();
        }
    } catch (error) {
        console.error('Erro ao conectar ao backend:', error);
    }
}
