// =============================
//  CONFIG
// =============================
const API_URL = "http://localhost:3001/api";

// Pequeno helper para chamadas REST com JSON e tratamento padrao de erros.
async function apiFetch(url, options = {}) {
    const resp = await fetch(url, options);
    const hasBody = resp.status !== 204;
    let data = null;
    if (hasBody) {
        try {
            data = await resp.json();
        } catch {
            data = null;
        }
    }

    if (!resp.ok) {
        const err = new Error((data && (data.mensagem || data.message)) || "Erro ao comunicar com o servidor.");
        err.status = resp.status;
        err.data = data;
        throw err;
    }

    return data;
}
// Disponibiliza para outros ficheiros js/
window.apiFetch = apiFetch;

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

let currentUser = null;
let isAdmin = false;
let confirmDialogResolver = null;
const NOTIF_STORAGE_PREFIX = "sige_notifications_";
let notificacoes = [];
let notificacoesVisiveis = false;
let confirmacoesPendentes = [];

let currentView = "dashboard";
let celebracaoEditarId = null;
let celebracaoEditarOriginalData = null;
let celebracaoEditarOriginalHora = null;
let celebracaoEditarOriginalCelebranteId = null;
let celebracaoEditarEstadoConfirmacao = null;
let celebracaoEditarIsEspecial = false;
let modalParticipantesCelebracaoId = null;
const CELEBRACOES_POR_PAGINA = 3;
const paginaCelebracoes = {};
let filtroCelebranteId = "";
let filtroCelebracaoTipo = "";

// Valida sessão com base no bootId do servidor (força login após restart)
async function validarSessaoBoot() {
    try {
        const stored = localStorage.getItem("sige_user");
        if (!stored) {
            window.location.href = "login.html";
            return false;
        }

        const user = JSON.parse(stored);
        currentUser = user;
        isAdmin = (user.role === "admin");

        const resp = await fetch(`${API_URL}/auth/boot`);
        if (!resp.ok) throw new Error("boot check failed");
        const body = await resp.json();

        if (!body.bootId || user.bootId !== body.bootId) {
            localStorage.removeItem("sige_user");
            currentUser = null;
            isAdmin = false;
            window.location.href = "login.html";
            return false;
        }
        return true;
    } catch (err) {
        console.error("Falha ao validar sessão/bootId:", err);
        localStorage.removeItem("sige_user");
        currentUser = null;
        isAdmin = false;
        window.location.href = "login.html";
        return false;
    }
}


// =============================
//  VISTAS (DASHBOARD / CELEBRAÇÕES)
// =============================
function mostrarVista(vista) {
    const views = {
        dashboard: document.getElementById("dashboard-view"),
        celebracoes: document.getElementById("celebracoes-view"),
        intencoes: document.getElementById("intencoes-view")
    };

    Object.values(views).forEach(el => {
        if (el) el.style.display = "none";
    });

    const alvo = views[vista] || views.dashboard;
    if (alvo) alvo.style.display = "block";

    currentView = (views[vista] ? vista : "dashboard");
}


// =============================
//  UTILIZADOR / UI
// =============================
function obterIniciais(nome = "", email = "") {
    const alvo = nome || email || "";
    const partes = alvo.trim().split(" ").filter(Boolean);
    if (partes.length === 0) return "--";
    const iniciais = partes.slice(0, 2).map(p => p[0]).join("");
    return iniciais.toUpperCase();
}

function atualizarUserInfoUI() {
    const nameEl = document.getElementById("user-name");
    const avatarEl = document.getElementById("user-avatar");
    if (!currentUser) return;
    if (nameEl) nameEl.textContent = currentUser.nome || currentUser.email || "Utilizador";
    if (avatarEl) avatarEl.textContent = obterIniciais(currentUser.nome, currentUser.email);
}

function logout() {
    localStorage.removeItem("sige_user");
    window.location.href = "login.html";
}


// =============================
//  MENU LATERAL
// =============================
function setActiveMenu(element) {
    const items = document.querySelectorAll(".menu-item");
    items.forEach(i => i.classList.remove("active"));
    element.classList.add("active");

    const view = element?.dataset?.view;
    if (view) {
        mostrarVista(view);
        return;
    }

    const labelSpan = element.querySelector("span");
    const label = labelSpan ? labelSpan.textContent.trim().toUpperCase() : "";

    if (label === "CELEBRAÇÕES") {
        mostrarVista("celebracoes");
    } else {
        mostrarVista("dashboard");
    }
}


// =============================
//  BOTÕES "ADICIONAR" DO DASHBOARD
// =============================
function abrirModal(tipo) {
    if (tipo === "celebracao") {
        mostrarVista("celebracoes");
        const dataInput = document.getElementById("nova-celebracao-data");
        if (dataInput) dataInput.focus();
    } else if (tipo === "paroquiano") {
        console.log("Abrir modal de novo paroquiano (se quiseres implementar).");
    }
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

    await buscarConfirmacoesPendentesCelebrante();
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
        const dataStr = p.data_nascimento
            ? new Date(p.data_nascimento).toLocaleDateString("pt-PT")
            : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.nome}</td>
            <td>${dataStr}</td>
            <td>${p.contacto || "—"}</td>
        `;
        tbody.appendChild(tr);
    });

    const tbodyFull = document.getElementById("table-paroquianos-full");
    if (tbodyFull) {
        tbodyFull.innerHTML = "";
        paroquianos.forEach(p => {
            const dataStr = p.data_nascimento
                ? new Date(p.data_nascimento).toLocaleDateString("pt-PT")
                : "";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.nome}</td>
                <td>${dataStr}</td>
                <td>${p.contacto || "—"}</td>
            `;
            tbodyFull.appendChild(tr);
        });
    }
}

async function criarParoquiano(event) {
    event.preventDefault();

    const nome = (document.getElementById("novo-paroquiano-nome") || {}).value?.trim();
    const data_nascimento = (document.getElementById("novo-paroquiano-data") || {}).value;
    const contacto = (document.getElementById("novo-paroquiano-contacto") || {}).value?.trim();
    const morada = (document.getElementById("novo-paroquiano-morada") || {}).value?.trim();

    if (!nome || !data_nascimento) {
        alert("Nome e data de nascimento são obrigatórios.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/paroquianos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, data_nascimento, contacto, morada })
        });

        if (!response.ok) {
            alert("Erro ao criar paroquiano.");
            return;
        }

        const form = document.getElementById("form-novo-paroquiano");
        if (form) form.reset();

        await buscarParoquianos();
        await buscarStats();

    } catch (err) {
        console.error("Erro ao criar paroquiano:", err);
    }
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
        const dataStr = a.data_nascimento
            ? new Date(a.data_nascimento).toLocaleDateString("pt-PT")
            : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${dataStr}</td>
            <td>${a.nome}</td>
            <td>${a.idade || "—"}</td>
        `;
        tbody.appendChild(tr);
    });
}


// =============================
//  CELEBRAÇÕES
// =============================
function toggleFiltroCelebracoes(event) {
    const menu = document.getElementById("filtro-celebracoes-menu");
    if (!menu) return;

    event.stopPropagation();
    const isHidden = menu.classList.contains("hidden");

    if (isHidden) {
        menu.classList.remove("hidden");
        document.addEventListener("click", fecharFiltroCelebracoesAoClicarFora);
    } else {
        fecharFiltroCelebracoes();
    }
}

function fecharFiltroCelebracoes() {
    const menu = document.getElementById("filtro-celebracoes-menu");
    if (menu) {
        menu.classList.add("hidden");
    }
    document.removeEventListener("click", fecharFiltroCelebracoesAoClicarFora);
}

function fecharFiltroCelebracoesAoClicarFora(event) {
    const menu = document.getElementById("filtro-celebracoes-menu");
    const toggle = document.querySelector(".filter-toggle");
    if (!menu) return;

    if (!menu.contains(event.target) && (!toggle || !toggle.contains(event.target))) {
        fecharFiltroCelebracoes();
    }
}

function aplicarFiltroCelebracoes() {
    const selectCelebrante = document.getElementById("filtro-celebrante");
    const inputTipo = document.getElementById("filtro-tipo");

    filtroCelebranteId = selectCelebrante ? selectCelebrante.value : "";
    filtroCelebracaoTipo = inputTipo ? inputTipo.value.trim().toLowerCase() : "";

    carregarCelebracoes();
    fecharFiltroCelebracoes();
}

function limparFiltroCelebracoes() {
    const selectCelebrante = document.getElementById("filtro-celebrante");
    const inputTipo = document.getElementById("filtro-tipo");

    filtroCelebranteId = "";
    filtroCelebracaoTipo = "";

    if (selectCelebrante) selectCelebrante.value = "";
    if (inputTipo) inputTipo.value = "";

    carregarCelebracoes();
}

function filtrarCelebracoes(lista) {
    return lista.filter(ev => {
        const celebranteId = ev.celebrante_id ?? ev.celebranteId;

        if (filtroCelebranteId && String(celebranteId) !== String(filtroCelebranteId)) {
            return false;
        }

        if (filtroCelebracaoTipo) {
            const tipo = (ev.tipo || "").toLowerCase();
            if (!tipo.includes(filtroCelebracaoTipo)) {
                return false;
            }
        }

        return true;
    });
}

function obterPaginaAtual(containerId, totalPaginas) {
    if (!(containerId in paginaCelebracoes)) {
        paginaCelebracoes[containerId] = 0;
    }
    const pagina = Math.max(0, Math.min(paginaCelebracoes[containerId], Math.max(totalPaginas - 1, 0)));
    paginaCelebracoes[containerId] = pagina;
    return pagina;
}

function mudarPaginaCelebracoes(containerId, novaPagina) {
    paginaCelebracoes[containerId] = Math.max(0, novaPagina);
    carregarCelebracoes();
}

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

        const lista =
            container.id === "celebracoes-container-gerir"
                ? filtrarCelebracoes(celebracoes || [])
                : (celebracoes || []);

        if (!lista || lista.length === 0) {
            const temFiltros =
                container.id === "celebracoes-container-gerir" &&
                (filtroCelebranteId || filtroCelebracaoTipo);

            const mensagem = temFiltros
                ? "Nenhuma celebração encontrada para os filtros selecionados."
                : "Sem celebrações agendadas";

            container.innerHTML =
                `<p style="padding: 16px; text-align:center; color:#777;">${mensagem}</p>`;
            return;
        }

        const totalPaginas = Math.ceil(lista.length / CELEBRACOES_POR_PAGINA);
        const paginaAtual = obterPaginaAtual(container.id, totalPaginas);
        const inicio = paginaAtual * CELEBRACOES_POR_PAGINA;
        const listaPagina = lista.slice(inicio, inicio + CELEBRACOES_POR_PAGINA);

        listaPagina.forEach(ev => {
            const dataObj = ev.data ? new Date(ev.data) : null;
            let dia = "";
            let mes = "";

            if (dataObj && !isNaN(dataObj)) {
                dia = String(dataObj.getDate()).padStart(2, "0");
                mes = dataObj.toLocaleString("pt-PT", { month: "short" }).toUpperCase();
            } else if (ev.data && /^\d{4}-\d{2}-\d{2}$/.test(ev.data)) {
                const [y, m, d] = ev.data.split("-");
                dia = d;
                const dateTmp = new Date(Number(y), Number(m) - 1, Number(d));
                mes = dateTmp.toLocaleString("pt-PT", { month: "short" }).toUpperCase();
            }

            const div = document.createElement("div");
            const isEspecial = !!ev.is_especial;
            const badgeEspecial = isEspecial ? '<span class="evento-badge evento-badge-especial">Especial</span>' : "";
            div.className = "evento-card" + (isEspecial ? " evento-card-especial" : "");
            const mostrarRemover = container.id === "celebracoes-container-gerir" && isAdmin;
            const estadoSlug = String(ev.estado_confirmacao || "pendente").toLowerCase();
            const badgeEstado = isEspecial
                ? `<span class="evento-badge evento-badge-estado badge-${estadoSlug}">${formatarEstadoConfirmacao(ev.estado_confirmacao)}</span>`
                : "";

            div.innerHTML = `
                <div class="evento-date">
                    <div class="mes">${mes}</div>
                    <div class="dia">${dia}</div>
                </div>

                <div class="evento-info">
                    <h4 class="evento-titulo">
                        <span>${ev.tipo}</span>
                    </h4>
                    <p>${ev.hora} - ${ev.local || ""}</p>
                    <span class="evento-tag">${ev.celebrante_nome || "Celebrante"}</span>
                    <div class="evento-intencoes" data-intencoes="true" style="display:none;"></div>
                </div>

                <div class="evento-acoes-col">
                    <div class="evento-tags">
                        ${badgeEspecial}
                        ${badgeEstado}
                    </div>
                    <div class="evento-acoes">
                        <button type="button" class="btn-editar" onclick="abrirEditarCelebracao(${ev.id})" title="Editar">Editar &#9998;</button>
                        ${mostrarRemover ? `<button type="button" class="btn-remover" onclick="removerCelebracao(${ev.id})" title="Remover">Remover &#128465;</button>` : ""}
                    </div>
                </div>
            `;

            container.appendChild(div);

            const tipo = String(ev.tipo || "").toLowerCase();
            if (tipo.includes("missa")) {
                const box = div.querySelector('[data-intencoes="true"]');
                if (box) {
                    box.style.display = "block";
                    box.textContent = "A carregar intenções...";
                    box.addEventListener("click", (e) => e.stopPropagation());
                    carregarIntencoesDaCelebracao(ev.id, box);
                }
            }

            div.addEventListener('click', (e) => {
                const tag = e.target.tagName.toLowerCase();
                const isButton = tag === 'button' || e.target.closest('button');
                if (!isButton) abrirModalParticipantes(ev.id);
            });
        });

        // Controles de paginação
        container.querySelectorAll(".eventos-nav-btn").forEach(btn => btn.remove());

        if (totalPaginas > 1) {
            if (paginaAtual > 0) {
                const btnPrev = document.createElement("button");
                btnPrev.className = "eventos-nav-btn nav-prev";
                btnPrev.innerHTML = `
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M15 19l-7-7 7-7"
                        stroke="currentColor" stroke-width="2" fill="none"
                        stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                btnPrev.onclick = (e) => {
                    e.stopPropagation();
                    mudarPaginaCelebracoes(container.id, paginaAtual - 1);
                };
                container.appendChild(btnPrev);
            }

            if (paginaAtual < totalPaginas - 1) {
                const btnNext = document.createElement("button");
                btnNext.className = "eventos-nav-btn nav-next";
                btnNext.innerHTML = `
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M9 5l7 7-7 7"
                            stroke="currentColor" stroke-width="2" fill="none"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                btnNext.onclick = (e) => {
                    e.stopPropagation();
                    mudarPaginaCelebracoes(container.id, paginaAtual + 1);
                };
                container.appendChild(btnNext);
            }
        }

        // Guardar a maior altura já vista para manter os botões centrados mesmo com menos itens
        const baseHeightAttr = container.getAttribute("data-base-height");
        const baseHeight = baseHeightAttr ? Number(baseHeightAttr) : 0;
        const currentHeight = container.scrollHeight;
        const alturaFinal = Math.max(baseHeight || 240, currentHeight);
        container.setAttribute("data-base-height", String(alturaFinal));
        container.style.minHeight = `${alturaFinal}px`;
    });
}

async function carregarIntencoesDaCelebracao(celebracaoId, containerEl) {
    if (!celebracaoId || !containerEl) return;

    try {
        const lista = await apiFetch(`${API_URL}/celebracoes/${celebracaoId}/intencoes`);
        const itens = Array.isArray(lista) ? lista : [];

        if (!itens.length) {
            containerEl.textContent = "Sem intenções aprovadas.";
            return;
        }

        containerEl.innerHTML =
            `<div class="evento-intencoes-titulo">Intenções</div>` +
            `<ul class="evento-intencoes-lista">` +
            itens
                .map(i => `<li><strong>${i.nome || "Anon"}</strong>: ${i.intencao || ""}</li>`)
                .join("") +
            `</ul>`;
    } catch (err) {
        console.error("Erro ao carregar intenções da celebração:", err);
        containerEl.textContent = "Erro ao carregar intenções.";
    }
}

// =============================
//  SACRAMENTOS
// =============================
async function buscarSacramentos() {
    try {
        const response = await fetch(`${API_URL}/sacramentos`);
        if (response.ok) {
            sacramentos = await response.json();
            carregarSacramentos();
        }
    } catch (err) {
        console.error("Erro ao buscar sacramentos:", err);
    }
}

function carregarSacramentos() {
    const tbody = document.getElementById("table-sacramentos");
    if (!tbody) return;

    tbody.innerHTML = "";

    sacramentos.forEach(s => {
        const dataStr = s.data ? new Date(s.data).toLocaleDateString("pt-PT") : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${s.nome_paroquiano}</td>
            <td>${s.tipo}</td>
            <td>${dataStr}</td>
            <td>${s.local || ""}</td>
        `;
        tbody.appendChild(tr);
    });
}


// =============================
//  CELEBRANTES
// =============================
async function buscarCelebrantes() {
    try {
        const response = await fetch(`${API_URL}/celebrantes`);
        if (response.ok) {
            celebrantes = await response.json();
            preencherSelectCelebrantes("nova-celebracao-celebrante");
            preencherSelectCelebrantes("filtro-celebrante", filtroCelebranteId);
        }
    } catch (err) {
        console.error("Erro ao buscar celebrantes:", err);
    }
}

function celebranteAtualEspecial() {
    if (!currentUser || !celebrantes || !celebrantes.length) return false;
    const encontrado = celebrantes.find(c => Number(c.id) === Number(currentUser.id));
    return !!(encontrado && encontrado.especial);
}

// -----------------------------
// PARTICIPANTES MODAL
// -----------------------------
function abrirModalParticipantes(celebracaoId) {
    modalParticipantesCelebracaoId = celebracaoId;
    const modal = document.getElementById("modal-participantes");
    if (modal) modal.classList.remove("hidden");
    carregarParoquianosSelect();
    listarParticipantesCelebracao();
}

function fecharModalParticipantes() {
    const modal = document.getElementById("modal-participantes");
    if (modal) modal.classList.add("hidden");
    modalParticipantesCelebracaoId = null;
}

async function carregarParoquianosSelect() {
    // reutiliza dados já carregados em paroquianos
    const select = document.getElementById("participantes-select-paroquiano");
    if (!select) return;
    select.innerHTML = '<option value="">Selecionar paroquiano...</option>';
    (paroquianos || []).forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nome || p.contacto || `Paroquiano ${p.id}`;
        select.appendChild(opt);
    });
}

async function listarParticipantesCelebracao() {
    if (!modalParticipantesCelebracaoId) return;
    const wrapperEl = document.getElementById("participantes-lista-wrapper");
    const listaEl = document.getElementById("participantes-lista");
    if (listaEl) listaEl.innerHTML = "A carregar...";
    if (wrapperEl) wrapperEl.classList.remove("participantes-list-wrapper");

    try {
        const lista = await apiFetch(`${API_URL}/celebracoes/${modalParticipantesCelebracaoId}/participantes`);

        if (!lista.length) {
            if (listaEl) listaEl.innerHTML = "<p style='padding:8px;color:#6b7280;'>Sem participantes.</p>";
            return;
        }

        if (listaEl) {
            listaEl.innerHTML = lista.map(p => `
                <div class="participante-item">
                    <div class="participante-info">
                        <div class="participante-nome">${p.nome || "Paroquiano"}</div>
                        <div class="participante-contacto">${p.contacto || ""}</div>
                    </div>
                    <button class="btn-secondary" onclick="removerParticipante(${p.paroquiano_id})">Remover</button>
                </div>
            `).join("");
        }

        if (wrapperEl) {
            const hasScroll = lista.length >= 6;
            wrapperEl.classList.toggle("participantes-list-wrapper", hasScroll);
        }
    } catch (err) {
        console.error("Erro ao listar participantes:", err);
        if (listaEl) listaEl.innerHTML = "<p style='padding:8px;color:red;'>Erro ao carregar participantes.</p>";
        if (wrapperEl) wrapperEl.classList.remove("participantes-list-wrapper");
    }
}

async function adicionarParticipante() {
    if (!modalParticipantesCelebracaoId) return;
    const select = document.getElementById("participantes-select-paroquiano");
    const paroquianoId = select ? select.value : "";
    if (!paroquianoId) {
        alert("Selecione um paroquiano.");
        return;
    }

    try {
        await apiFetch(`${API_URL}/celebracoes/${modalParticipantesCelebracaoId}/participantes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paroquianoId })
        });
        listarParticipantesCelebracao();
    } catch (err) {
        console.error("Erro ao adicionar participante:", err);
        alert((err && err.message) || "Erro ao adicionar participante.");
    }
}

async function removerParticipante(paroquianoId) {
    if (!modalParticipantesCelebracaoId || !paroquianoId) return;
    try {
        await apiFetch(`${API_URL}/celebracoes/${modalParticipantesCelebracaoId}/participantes/${paroquianoId}`, {
            method: "DELETE"
        });
        listarParticipantesCelebracao();
    } catch (err) {
        console.error("Erro ao remover participante:", err);
        alert((err && err.message) || "Erro ao remover participante.");
    }
}

function preencherSelectCelebrantes(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';

    celebrantes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nome;
        if (selectedId && Number(selectedId) === Number(c.id)) {
            opt.selected = true;
        }
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
    const sp = document.getElementById("stat-paroquianos");
    const sc = document.getElementById("stat-celebracoes");
    const ss = document.getElementById("stat-sacramentos");
    const sceb = document.getElementById("stat-celebrantes");

    if (sp) sp.textContent = stats.paroquianos ?? 0;
    if (sc) sc.textContent = stats.celebracoes ?? 0;
    if (ss) ss.textContent = stats.sacramentos ?? 0;
    if (sceb) sceb.textContent = stats.celebrantes ?? 0;
}

// -----------------------------
// CONFIRMACOES PENDENTES (Celebrante especial)
// -----------------------------
async function buscarConfirmacoesPendentesCelebrante() {
    if (!currentUser) return;
    if (!celebranteAtualEspecial()) {
        renderConfirmacoesPendentes([]);
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/celebrantes/${currentUser.id}/confirmacoes-pendentes`);
        if (!resp.ok) throw new Error("fail");
        confirmacoesPendentes = await resp.json();
        (confirmacoesPendentes || []).forEach(adicionarNotificacaoConfirmacao);
        renderConfirmacoesPendentes(confirmacoesPendentes);
    } catch (err) {
        console.error("Erro ao buscar confirmacoes pendentes:", err);
    }
}

function renderConfirmacoesPendentes(lista = []) {
    const card = document.getElementById("confirmacoes-pendentes-card");
    const container = document.getElementById("confirmacoes-pendentes-container");
    if (!card || !container) return;

    if (!celebranteAtualEspecial()) {
        card.style.display = "none";
        return;
    }

    card.style.display = "block";

    if (!lista.length) {
        container.innerHTML = '<p style="padding: 16px; text-align:center; color:#777;">Sem pedidos pendentes.</p>';
        return;
    }

    container.innerHTML = lista
        .map(item => {
            const dataStr = item.data ? String(item.data).slice(0, 10) : "";
            const horaStr = item.hora || "";
            const resumo = `${item.tipo || "Celebracao"} em ${dataStr} às ${horaStr}`;
            return `
                <div class="confirmacao-item">
                    <div>
                        <div class="confirmacao-titulo">${resumo}</div>
                        <div class="confirmacao-local">${item.local || ""}</div>
                    </div>
                    <div class="confirmacao-btns">
                        <button class="btn-primary" onclick="responderConfirmacao(${item.id}, 'confirmado')">Confirmar</button>
                        <button class="btn-secondary" onclick="responderConfirmacao(${item.id}, 'recusado')">Recusar</button>
                    </div>
                </div>
            `;
        })
        .join("");
}

async function responderConfirmacao(celebracaoId, estado) {
    if (!celebracaoId || !estado) return false;
    try {
        const resp = await fetch(`${API_URL}/celebracoes/${celebracaoId}/confirmacao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado })
        });
        let body = null;
        try { body = await resp.json(); } catch {}

        if (!resp.ok) {
            const msg = (body && body.mensagem) || "Nao foi possivel atualizar confirmacao.";
            alert(msg);
            return false;
        }

        adicionarNotificacao(`Estado atualizado: ${formatarEstadoConfirmacao(estado)}`);
        await buscarConfirmacoesPendentesCelebrante();
        await buscarCelebracoes();
        return true;
    } catch (err) {
        console.error("Erro ao responder confirmacao:", err);
        alert("Erro ao responder confirmacao.");
        return false;
    }
}
