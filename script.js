// =============================
//  CONFIG
// =============================
const API_URL = "http://localhost:3001/api";

// Estado global
let paroquianos = [];
let aniversariantes = [];
let celebracoes = [];
let sacramentos = [];
let celebrantes = [];

let stats = {
    paroquianos: 0,
    celebracoes: 0,
    sacramentos: 0,
    celebrantes: 0
};

let currentView = "dashboard";


// =============================
//  ALTERAR VISTA (SPA)
// =============================
function mostrarVista(vista) {
    const dashboardView = document.getElementById("dashboard-view");
    const celebracoesView = document.getElementById("celebracoes-view");

    if (!dashboardView || !celebracoesView) return;

    if (vista === "celebracoes") {
        dashboardView.style.display = "none";
        celebracoesView.style.display = "block";
        currentView = "celebracoes";
    } else {
        dashboardView.style.display = "block";
        celebracoesView.style.display = "none";
        currentView = "dashboard";
    }
}


// =============================
//  MENU ATIVO
// =============================
function setActiveMenu(element) {
    const items = document.querySelectorAll(".menu-item");
    items.forEach(i => i.classList.remove("active"));
    element.classList.add("active");

    const label = element.querySelector("span").textContent.trim().toUpperCase();

    if (label === "CELEBRAÇÕES") mostrarVista("celebracoes");
    else mostrarVista("dashboard");
}


// =============================
//  BUSCAR DADOS INICIAIS
// =============================
async function buscarDadosBackend() {
    await Promise.all([
        buscarParoquianos(),
        buscarAniversariantes(),
        buscarCelebracoes(),
        buscarSacramentos(),
        buscarCelebrantes(),
        buscarStats()
    ]);
}


// =============================
//  PAROQUIANOS
// =============================
async function buscarParoquianos() {
    try {
        const response = await fetch(`${API_URL}/paroquianos`);
        if (response.ok) {
            paroquianos = await response.json();
            carregarParoquianos();
        }
    } catch (err) {
        console.error("Erro ao buscar paroquianos:", err);
    }
}

function carregarParoquianos() {
    const tbody = document.getElementById("table-paroquianos");
    if (!tbody) return;

    tbody.innerHTML = "";

    paroquianos.slice(0, 4).forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.telemovel || "—"}</td>
        `;
        tbody.appendChild(tr);
    });
}


// =============================
//  ANIVERSARIANTES
// =============================
async function buscarAniversariantes() {
    try {
        const response = await fetch(`${API_URL}/aniversariantes`);
        if (response.ok) {
            aniversariantes = await response.json();
            carregarAniversariantes();
        }
    } catch (err) {
        console.error("Erro ao buscar aniversariantes:", err);
    }
}

function carregarAniversariantes() {
    const tbody = document.getElementById("table-aniversariantes");
    if (!tbody) return;

    tbody.innerHTML = "";

    aniversariantes.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${a.dia}</td>
            <td>${a.nome}</td>
            <td>${a.idade}</td>
        `;
        tbody.appendChild(tr);
    });
}


// =============================
//  CELEBRAÇÕES
// =============================
async function buscarCelebracoes() {
    try {
        const response = await fetch(`${API_URL}/celebracoes`);
        if (response.ok) {
            celebracoes = await response.json();
            carregarCelebracoes();
        }
    } catch (err) {
        console.error("Erro ao buscar celebrações:", err);
    }
}

function carregarCelebracoes() {
    const containers = [
        document.getElementById("celebracoes-container"),
        document.getElementById("celebracoes-container-gerir")
    ].filter(c => c);

    containers.forEach(container => {
        container.innerHTML = "";

        if (celebracoes.length === 0) {
            container.innerHTML =
                '<p style="padding: 16px; text-align:center; color:#777;">Sem celebrações agendadas</p>';
            return;
        }

        celebracoes.forEach(ev => {
            const dataObj = new Date(ev.data);
            const dia = dataObj.getDate();
            const mes = dataObj.toLocaleString("pt-PT", { month: "short" }).toUpperCase();

            const div = document.createElement("div");
            div.className = "evento-card";

            div.innerHTML = `
                <div class="evento-date">
                    <div class="mes">${mes}</div>
                    <div class="dia">${dia}</div>
                </div>
                <div class="evento-info">
                    <h4>${ev.tipo}</h4>
                    <p>${ev.hora} - ${ev.local || ""}</p>
                    <span class="evento-tag">${ev.celebrante_nome || "Celebrante"}</span>
                </div>
            `;

            container.appendChild(div);
        });
    });
}


// =============================
//  SACRAMENTOS
// =============================
async function buscarSacramentos() {
    try {
        const response = await fetch(`${API_URL}/sacramentos`);
        if (response.ok) {
            sacramentos = await response.json();
        }
    } catch (err) {
        console.error("Erro ao buscar sacramentos:", err);
    }
}


// =============================
//  CELEBRANTES
// =============================
async function buscarCelebrantes() {
    try {
        const response = await fetch(`${API_URL}/celebrantes`);
        if (response.ok) {
            celebrantes = await response.json();
            preencherSelectCelebrantes();
        }
    } catch (err) {
        console.error("Erro ao buscar celebrantes:", err);
    }
}

function preencherSelectCelebrantes() {
    const select = document.getElementById("nova-celebracao-celebrante");
    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';

    celebrantes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nome;
        select.appendChild(opt);
    });
}


// =============================
//  STATS
// =============================
async function buscarStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (response.ok) {
            stats = await response.json();
            carregarStats();
        }
    } catch (err) {
        console.error("Erro ao buscar stats:", err);
    }
}

function carregarStats() {
    document.getElementById("stat-paroquianos").textContent = stats.paroquianos;
    document.getElementById("stat-celebracoes").textContent = stats.celebracoes;
    document.getElementById("stat-sacramentos").textContent = stats.sacramentos;
    document.getElementById("stat-celebrantes").textContent = stats.celebrantes;
}


// =============================
//  CRIAR CELEBRAÇÃO (REQ-01.1)
// =============================
function mostrarMensagemCelebracoes(msg, tipo = "erro") {
    const box = document.getElementById("celebracoes-mensagens");
    if (!box) return;

    box.textContent = msg;
    box.className = "mensagens-celebracoes";

    if (tipo === "erro") box.classList.add("erro");
    if (tipo === "sucesso") box.classList.add("sucesso");
}

async function criarCelebracao(event) {
    event.preventDefault();

    const data = document.getElementById("nova-celebracao-data").value;
    const hora = document.getElementById("nova-celebracao-hora").value;
    const tipo = document.getElementById("nova-celebracao-tipo").value;
    const celebranteId = document.getElementById("nova-celebracao-celebrante").value;
    const local = document.getElementById("nova-celebracao-local").value;

    if (!data || !hora || !tipo || !celebranteId) {
        mostrarMensagemCelebracoes("Preencha todos os campos obrigatórios.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/celebracoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, hora, tipo, celebranteId, local })
        });

        let body = null;
        try { body = await response.json(); } catch {}

        if (!response.ok) {
            const msg = body?.mensagem || "Erro ao guardar celebração.";
            mostrarMensagemCelebracoes(msg, "erro");
            return;
        }

        mostrarMensagemCelebracoes("Celebração registada com sucesso!", "sucesso");

        document.getElementById("form-nova-celebracao").reset();

        await buscarCelebracoes();
        await buscarStats();

    } catch (err) {
        console.error("Erro ao criar celebração:", err);
        mostrarMensagemCelebracoes("Erro de comunicação com o servidor.", "erro");
    }
}


// =============================
//  ON LOAD
// =============================
window.addEventListener("DOMContentLoaded", () => {
    mostrarVista("dashboard");
    buscarDadosBackend();
});
