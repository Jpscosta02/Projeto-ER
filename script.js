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

let currentUser = null;
let isAdmin = false;
let confirmDialogResolver = null;
const NOTIF_STORAGE_PREFIX = "sige_notifications_";
let notificacoes = [];
let notificacoesVisiveis = false;

let currentView = "dashboard";
let celebracaoEditarId = null;
let celebracaoEditarOriginalData = null;
let celebracaoEditarOriginalHora = null;
let celebracaoEditarOriginalCelebranteId = null;
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
//  MENU LATERAL
// =============================
function setActiveMenu(element) {
    const items = document.querySelectorAll(".menu-item");
    items.forEach(i => i.classList.remove("active"));
    element.classList.add("active");

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
            div.className = "evento-card";
            const mostrarRemover = container.id === "celebracoes-container-gerir" && isAdmin;


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
                </div>
                
                <div class="evento-acoes">
                    <button type="button" class="btn-editar" onclick="abrirEditarCelebracao(${ev.id})" title="Editar">Editar &#9998;</button>
                    ${mostrarRemover ? `<button type="button" class="btn-remover" onclick="removerCelebracao(${ev.id})" title="Remover">Remover &#128465;</button>` : ""}
                </div>
            `;

            container.appendChild(div);
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


// =============================
//  NOTIFICAÇÕES
// =============================
function formatCelebracaoResumo(obj) {
    if (!obj) return "Celebracao";
    const tipo = obj.tipo || "Celebracao";
    const data = obj.data ? String(obj.data).slice(0, 10) : "";
    const hora = obj.hora || "";
    const local = obj.local || "";

    let partes = [tipo];
    if (data) partes.push(`em ${data}`);
    if (hora) partes.push(`as ${hora}`);
    if (local) partes.push(`(${local})`);

    return partes.join(" ");
}

function obterChaveNotificacoes() {
    if (!currentUser) return `${NOTIF_STORAGE_PREFIX}anon`;
    const id = currentUser.id || currentUser.email || "user";
    return `${NOTIF_STORAGE_PREFIX}${id}`;
}

function carregarNotificacoes() {
    try {
        const key = obterChaveNotificacoes();
        const stored = localStorage.getItem(key);
        notificacoes = stored ? JSON.parse(stored) : [];
    } catch {
        notificacoes = [];
    }
    renderizarNotificacoes();
}

function gravarNotificacoes() {
    try {
        const key = obterChaveNotificacoes();
        localStorage.setItem(key, JSON.stringify(notificacoes));
    } catch (err) {
        console.warn("NÆo foi poss¡vel guardar notifica‡äes:", err);
    }
}

function formatarDataNotificacao(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function renderizarNotificacoes() {
    const badge = document.getElementById("notif-badge");
    const listEl = document.getElementById("notif-list");
    const naoLidas = notificacoes.filter(n => !n.lida).length;

    if (badge) {
        if (naoLidas > 0) {
            badge.textContent = String(naoLidas);
            badge.classList.remove("hidden");
        } else {
            badge.textContent = "";
            badge.classList.add("hidden");
        }
    }

    if (!listEl) return;

    if (!notificacoes.length) {
        listEl.innerHTML = '<p class="notif-empty">Sem notificações.</p>';
        return;
    }

    listEl.innerHTML = notificacoes
        .map(n => `
            <div class="notif-item ${n.lida ? "lida" : ""}">
                <div class="notif-text">${n.mensagem}</div>
                <div class="notif-time">${formatarDataNotificacao(n.data)}</div>
            </div>
        `)
        .join("");
}

function adicionarNotificacao(mensagem) {
    const nova = {
        id: Date.now(),
        mensagem,
        data: new Date().toISOString(),
        lida: false
    };
    notificacoes = [nova, ...notificacoes].slice(0, 50);
    gravarNotificacoes();
    renderizarNotificacoes();
}

function marcarNotificacoesLidas() {
    notificacoes = notificacoes.map(n => ({ ...n, lida: true }));
    gravarNotificacoes();
    renderizarNotificacoes();
}

function abrirPainelNotificacoes() {
    const panel = document.getElementById("notif-panel");
    if (!panel) return;
    panel.classList.remove("hidden");
    notificacoesVisiveis = true;
    marcarNotificacoesLidas();
}

function fecharPainelNotificacoes() {
    const panel = document.getElementById("notif-panel");
    if (!panel) return;
    panel.classList.add("hidden");
    notificacoesVisiveis = false;
}

function togglePainelNotificacoes(event) {
    event?.stopPropagation();
    if (notificacoesVisiveis) {
        fecharPainelNotificacoes();
    } else {
        abrirPainelNotificacoes();
    }
}

function limparNotificacoes() {
    notificacoes = [];
    gravarNotificacoes();
    renderizarNotificacoes();
}

function fecharNotificacoesAoClicarFora(event) {
    const panel = document.getElementById("notif-panel");
    const toggle = document.getElementById("notif-toggle");
    if (!panel || !notificacoesVisiveis) return;

    if (!panel.contains(event.target) && (!toggle || !toggle.contains(event.target))) {
        fecharPainelNotificacoes();
    }
}


// =============================
//  DISPONIBILIDADE (CRIAR)
// =============================
function mostrarDisponibilidade(msg, estado) {
    const box = document.getElementById("disponibilidade-msg");
    if (!box) return;

    box.textContent = msg || "";
    box.className = "mensagens-disponibilidade";

    if (!msg) return;

    if (estado === "livre") {
        box.classList.add("livre");
    } else if (estado === "ocupado") {
        box.classList.add("ocupado");
    }
}

async function verificarDisponibilidadeDataHora() {
    const dataEl = document.getElementById("nova-celebracao-data");
    const horaEl = document.getElementById("nova-celebracao-hora");

    if (!dataEl || !horaEl) return;

    const data = dataEl.value;
    const hora = horaEl.value;

    if (!data || !hora) {
        mostrarDisponibilidade("", null);
        return;
    }

    try {
        const resp = await fetch(
            `${API_URL}/celebracoes/disponibilidade?data=${encodeURIComponent(data)}&hora=${encodeURIComponent(hora)}`
        );

        if (!resp.ok) {
            mostrarDisponibilidade("Não foi possível verificar a disponibilidade.", "ocupado");
            return;
        }

        const body = await resp.json();

        if (body.disponivel) {
            mostrarDisponibilidade("Data e hora livres.", "livre");
        } else if (body.celebracao) {
            const c = body.celebracao;
            const info =
                `${c.tipo || "Celebração"} às ${c.hora} em ${c.local || "local não definido"}` +
                (c.celebrante_nome ? ` (Celebrante: ${c.celebrante_nome})` : "");

            mostrarDisponibilidade(
                "Data e hora ocupadas. Já existe: " + info,
                "ocupado"
            );
        } else {
            mostrarDisponibilidade("Data e hora ocupadas.", "ocupado");
        }
    } catch (err) {
        console.error("Erro ao verificar disponibilidade:", err);
        mostrarDisponibilidade("Erro de comunicação ao verificar disponibilidade.", "ocupado");
    }
}


// =============================
//  CRIAR CELEBRAÇÃO
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

    const data = (document.getElementById("nova-celebracao-data") || {}).value;
    const hora = (document.getElementById("nova-celebracao-hora") || {}).value;
    const tipo = (document.getElementById("nova-celebracao-tipo") || {}).value;
    const celebranteId = (document.getElementById("nova-celebracao-celebrante") || {}).value;
    const local = (document.getElementById("nova-celebracao-local") || {}).value;

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
            const msg = (body && body.mensagem) || "Erro ao guardar celebração.";
            mostrarMensagemCelebracoes(msg, "erro");
            return;
        }

        mostrarMensagemCelebracoes("Celebração registada com sucesso!", "sucesso");
        adicionarNotificacao(`Celebracao criada: ${formatCelebracaoResumo({ tipo, data, hora, local })}`);

        const form = document.getElementById("form-nova-celebracao");
        if (form) form.reset();
        mostrarDisponibilidade("", null);

        await buscarCelebracoes();
        await buscarStats();
    } catch (err) {
        console.error("Erro ao criar celebração:", err);
        mostrarMensagemCelebracoes("Erro de comunicação com o servidor.", "erro");
    }
}


// =============================
//  EDITAR CELEBRAÇÃO
// =============================
function abrirEditarCelebracao(id) {
    const modal = document.getElementById("modal-editar");
    if (!modal) {
        console.warn("Modal de edição não existe no HTML.");
        return;
    }

    const celebracao = celebracoes.find(c => Number(c.id) === Number(id));
    if (!celebracao) {
        console.warn("Celebração não encontrada para edição:", id);
        return;
    }

    celebracaoEditarId = Number(id);

    const inputData = document.getElementById("edit-data");
    const inputHora = document.getElementById("edit-hora");
    const inputTipo = document.getElementById("edit-tipo");
    const inputLocal = document.getElementById("edit-local");

    if (inputData) {
        inputData.value = celebracao.data ? celebracao.data.substring(0, 10) : "";
    }
    if (inputHora) {
        inputHora.value = celebracao.hora || "";
    }
    if (inputTipo) inputTipo.value = celebracao.tipo || "";
    if (inputLocal) inputLocal.value = celebracao.local || "";

    celebracaoEditarOriginalData = inputData ? inputData.value : null;
    celebracaoEditarOriginalHora = inputHora ? inputHora.value : null;
    celebracaoEditarOriginalCelebranteId = celebracao.celebrante_id ?? celebracao.celebranteId ?? null;

    preencherSelectCelebrantes("edit-celebrante", celebracao.celebrante_id);

    const msgBox = document.getElementById("editar-disponibilidade-msg");
    if (msgBox) {
        msgBox.textContent = "";
        msgBox.className = "";
    }

    modal.classList.remove("hidden");
}

function fecharModalEditar() {
    const modal = document.getElementById("modal-editar");
    if (!modal) return;
    modal.classList.add("hidden");
    celebracaoEditarId = null;
    celebracaoEditarOriginalData = null;
    celebracaoEditarOriginalHora = null;
}

async function verificarDisponibilidadeEditar() {
    const dataEl = document.getElementById("edit-data");
    const horaEl = document.getElementById("edit-hora");
    const msgBox = document.getElementById("editar-disponibilidade-msg");

    if (!dataEl || !horaEl || !msgBox) return true;

    const data = dataEl.value;
    const hora = horaEl.value;

    if (!data || !hora) {
        msgBox.textContent = "";
        msgBox.className = "";
        return true;
    }

    if (data === celebracaoEditarOriginalData && hora === celebracaoEditarOriginalHora) {
        msgBox.textContent = "";
        msgBox.className = "";
        return true;
    }

    try {
        const resp = await fetch(
            `${API_URL}/celebracoes/disponibilidade?data=${encodeURIComponent(data)}&hora=${encodeURIComponent(hora)}`
        );

        if (!resp.ok) {
            msgBox.textContent = "Não foi possível verificar a disponibilidade.";
            msgBox.style.color = "red";
            return false;
        }

        const body = await resp.json();

        if (body.disponivel || (body.celebracao && Number(body.celebracao.id) === celebracaoEditarId)) {
            msgBox.textContent = "Data e hora disponíveis.";
            msgBox.style.color = "green";
            return true;
        }

        msgBox.textContent = "Data/hora já ocupadas por outra celebração.";
        msgBox.style.color = "red";
        return false;
    } catch (err) {
        console.error("Erro ao verificar disponibilidade (editar):", err);
        msgBox.textContent = "Erro ao verificar disponibilidade.";
        msgBox.style.color = "red";
        return false;
    }
}

async function submeterEdicaoCelebracao(event) {
    event.preventDefault();

    if (celebracaoEditarId == null) {
        alert("Nenhuma celebração selecionada para edição.");
        return;
    }

    const data = (document.getElementById("edit-data") || {}).value;
    const hora = (document.getElementById("edit-hora") || {}).value;
    const tipo = (document.getElementById("edit-tipo") || {}).value;
    const celebranteId = (document.getElementById("edit-celebrante") || {}).value;
    const local = (document.getElementById("edit-local") || {}).value;
    const celebranteEscolhido = celebranteId || celebracaoEditarOriginalCelebranteId;

    if (!data || !hora || !tipo || !celebranteEscolhido) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    const msgBox = document.getElementById("editar-disponibilidade-msg");

    try {
        const resp = await fetch(`${API_URL}/celebracoes/${celebracaoEditarId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, hora, tipo, celebranteId: celebranteEscolhido, local })
        });

        let body = null;
        try { body = await resp.json(); } catch {}

        if (!resp.ok) {
            // Se for conflito (409), mostra mensagem no formulário em vez de alert
            if (resp.status === 409 && msgBox) {
                msgBox.textContent = (body && body.mensagem) || "Data/hora já ocupadas por outra celebração.";
                msgBox.style.color = "red";
                return;
            }

            const msg = (body && body.mensagem) || "Erro ao atualizar celebração.";
            alert(msg);
            return;
        }

        adicionarNotificacao(`Celebracao atualizada: ${formatCelebracaoResumo({ tipo, data, hora, local })}`);
        fecharModalEditar();
        await buscarCelebracoes();
        await buscarStats();
    } catch (err) {
        console.error("Erro ao atualizar celebração:", err);
        alert("Erro de comunicação com o servidor.");
    }
}


async function removerCelebracao(id) {
    if (!isAdmin) {
        alert("Apenas administradores podem remover celebraçoes.");
        return;
    }

    const celebracao = celebracoes.find(c => Number(c.id) === Number(id));
    const resumo = celebracao ? formatCelebracaoResumo(celebracao) : "esta celebracao";

    const confirmou = await abrirDialogConfirmacao(`Tem a certeza que deseja remover ${resumo}?`);
    if (!confirmou) return;

    let apagou = false;
    try {
        const resp = await fetch(`${API_URL}/celebracoes/${id}`, { method: "DELETE" });
        let body = null;
        if (resp.status !== 204) {
            try { body = await resp.json(); } catch {}
        }

        const sucesso = resp.ok || resp.status === 204;
        if (!sucesso) {
            const msg = (body && body.mensagem) || "Erro ao remover celebraçao.";
            alert(msg);
            return;
        }
        apagou = true;
    } catch (err) {
        console.error("Erro ao remover celebraçao:", err);
        alert("Erro de comunicaçao com o servidor.");
        return;
    }

    if (apagou) {
        adicionarNotificacao(`Celebraçao removida: ${celebracao.tipo || "Celebracao"}`);
        try {
            await buscarCelebracoes();
            await buscarStats();
        } catch (err) {
            console.error("Erro ao atualizar dados apos remover:", err);
        }
    }
}

function abrirDialogConfirmacao(msg) {
    return new Promise(resolve => {
        confirmDialogResolver = resolve;
        const modal = document.getElementById("confirm-dialog");
        const texto = document.getElementById("confirm-dialog-message");
        if (texto) texto.textContent = msg || "";
        if (modal) modal.classList.remove("hidden");
    });
}

function fecharDialogConfirmacao() {
    const modal = document.getElementById("confirm-dialog");
    if (modal) modal.classList.add("hidden");
    confirmDialogResolver = null;
}

function confirmarDialogoOk() {
    if (confirmDialogResolver) confirmDialogResolver(true);
    fecharDialogConfirmacao();
}

function confirmarDialogoCancelar() {
    if (confirmDialogResolver) confirmDialogResolver(false);
    fecharDialogConfirmacao();
}

// =============================
//  ON LOAD
// =============================
window.addEventListener("DOMContentLoaded", async () => {
    const sessaoValida = await validarSessaoBoot();
    if (!sessaoValida) return;
    mostrarVista("dashboard");
    carregarNotificacoes();
    buscarDadosBackend();

    const dataEl = document.getElementById("nova-celebracao-data");
    const horaEl = document.getElementById("nova-celebracao-hora");
    if (dataEl) {
        dataEl.addEventListener("change", verificarDisponibilidadeDataHora);
        dataEl.addEventListener("input", verificarDisponibilidadeDataHora);
    }
    if (horaEl) {
        horaEl.addEventListener("change", verificarDisponibilidadeDataHora);
        horaEl.addEventListener("input", verificarDisponibilidadeDataHora);
    }

    const formEditar = document.getElementById("form-editar-celebracao");
    if (formEditar) {
        formEditar.addEventListener("submit", submeterEdicaoCelebracao);
    }

    const editDataEl = document.getElementById("edit-data");
    const editHoraEl = document.getElementById("edit-hora");
    if (editDataEl) editDataEl.addEventListener("change", verificarDisponibilidadeEditar);
    if (editHoraEl) editHoraEl.addEventListener("change", verificarDisponibilidadeEditar);

    const btnConfirmOk = document.getElementById("confirm-dialog-ok");
    const btnConfirmCancel = document.getElementById("confirm-dialog-cancel");
    if (btnConfirmOk) btnConfirmOk.addEventListener("click", confirmarDialogoOk);
    if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", confirmarDialogoCancelar);

    const notifToggle = document.getElementById("notif-toggle");
    const notifClear = document.getElementById("notif-clear");
    if (notifToggle) notifToggle.addEventListener("click", togglePainelNotificacoes);
    if (notifClear) notifClear.addEventListener("click", limparNotificacoes);
    document.addEventListener("click", fecharNotificacoesAoClicarFora);
});
