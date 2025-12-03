// ========== CONFIGURAÇÃO DA API ==========
const API_URL = 'http://localhost:3001/api';

// ========== DADOS LOCAIS ==========
let paroquianos = [];
let celebracoes = [];
let sacramentos = [];
let celebrantes = [];
let aniversariantes = [];

let stats = {
    paroquianos: 0,
    celebracoes: 0,
    sacramentos: 0,
    celebrantes: 0
};

// ========== INICIALIZAÇÃO ==========
window.addEventListener('DOMContentLoaded', () => {
    buscarDadosBackend();
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
    document.getElementById('stat-paroquianos').textContent = stats.paroquianos;
    document.getElementById('stat-celebracoes').textContent = stats.celebracoes;
    document.getElementById('stat-sacramentos').textContent = stats.sacramentos;
    document.getElementById('stat-celebrantes').textContent = stats.celebrantes;
}

// ========== PAROQUIANOS ==========
function carregarParoquianos() {
    const tbody = document.getElementById('table-paroquianos');
    tbody.innerHTML = '';
    const paroquianosRecentes = paroquianos.slice(-5).reverse();
    paroquianosRecentes.forEach(pessoa => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pessoa.nome}</td>
            <td class="text-gray">${pessoa.contacto || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ========== ANIVERSARIANTES ==========
function carregarAniversariantes() {
    const tbody = document.getElementById('table-aniversariantes');
    tbody.innerHTML = '';
    if (aniversariantes.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" style="text-align: center; color: #6b7280;">Sem aniversariantes este mês</td>`;
        tbody.appendChild(tr);
        return;
    }
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

// ========== CELEBRAÇÕES ==========
function carregarCelebracoes() {
    const container = document.getElementById('celebracoes-container');
    container.innerHTML = '';
    if (celebracoes.length === 0) {
        container.innerHTML = '<p style="padding: 16px; text-align: center; color: #6b7280;">Sem celebrações agendadas</p>';
        return;
    }
    celebracoes.forEach(celebracao => {
        const data = new Date(celebracao.data);
        const mes = data.toLocaleString('pt-PT', { month: 'short' }).toUpperCase();
        const dia = data.getDate();
        const celebracaoDiv = document.createElement('div');
        celebracaoDiv.className = 'evento-card';
        celebracaoDiv.innerHTML = `
            <div class="evento-date">
                <div class="mes">${mes}</div>
                <div class="dia">${dia}</div>
            </div>
            <div class="evento-info">
                <h4>${celebracao.tipo}</h4>
                <p>${celebracao.hora} - ${celebracao.local}</p>
                <span class="evento-tag">${celebracao.celebrante_nome || 'Celebrante não definido'}</span>
            </div>
        `;
        container.appendChild(celebracaoDiv);
    });
}

// ========== INTEGRAÇÃO COM BACKEND ==========
async function buscarDadosBackend() {
    try {
        await buscarStats();
        await buscarParoquianos();
        await buscarCelebracoes();
        await buscarAniversariantes();
        await buscarCelebrantes();
        await buscarSacramentos();
        console.log('Dados carregados com sucesso do backend!');
    } catch (error) {
        console.error('Erro ao conectar ao backend:', error);
        alert('Não foi possível conectar ao servidor. Verifique se o backend está a correr.');
    }
}

async function buscarStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (response.ok) {
            stats = await response.json();
            carregarStats();
        }
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
    }
}

async function buscarParoquianos() {
    try {
        const response = await fetch(`${API_URL}/paroquianos`);
        if (response.ok) {
            paroquianos = await response.json();
            carregarParoquianos();
        }
    } catch (error) {
        console.error('Erro ao buscar paroquianos:', error);
    }
}

async function buscarCelebracoes() {
    try {
        const response = await fetch(`${API_URL}/celebracoes`);
        if (response.ok) {
            celebracoes = await response.json();
            carregarCelebracoes();
        }
    } catch (error) {
        console.error('Erro ao buscar celebrações:', error);
    }
}

async function buscarAniversariantes() {
    try {
        const mesAtual = new Date().getMonth() + 1;
        const response = await fetch(`${API_URL}/aniversariantes/${mesAtual}`);
        if (response.ok) {
            aniversariantes = await response.json();
            carregarAniversariantes();
        }
    } catch (error) {
        console.error('Erro ao buscar aniversariantes:', error);
    }
}

async function buscarCelebrantes() {
    try {
        const response = await fetch(`${API_URL}/celebrantes`);
        if (response.ok) {
            celebrantes = await response.json();
        }
    } catch (error) {
        console.error('Erro ao buscar celebrantes:', error);
    }
}

async function buscarSacramentos() {
    try {
        const response = await fetch(`${API_URL}/sacramentos`);
        if (response.ok) {
            sacramentos = await response.json();
        }
    } catch (error) {
        console.error('Erro ao buscar sacramentos:', error);
    }
}

// ========== ATUALIZAÇÃO AUTOMÁTICA ==========
setInterval(() => {
    buscarDadosBackend();
}, 300000);
