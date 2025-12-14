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

function formatarEstadoConfirmacao(estado) {
    const mapa = {
        confirmado: "Confirmado",
        pendente: "Pendente",
        recusado: "Recusado"
    };
    return mapa[String(estado || "").toLowerCase()] || "Pendente";
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
        .map(n => {
            if (n.tipo === "confirmacao" && !n.resolvido) {
                return `
            <div class="notif-item ${n.lida ? "lida" : ""}">
                <div class="notif-text">${n.mensagem}</div>
                <div class="notif-actions">
                    <button class="notif-btn success" onclick="responderConfirmacaoNotificacao('${n.id}', ${n.celebracaoId}, 'confirmado')">✓</button>
                    <button class="notif-btn danger" onclick="responderConfirmacaoNotificacao('${n.id}', ${n.celebracaoId}, 'recusado')">✕</button>
                </div>
                <div class="notif-time">${formatarDataNotificacao(n.data)}</div>
            </div>
                `;
            }

            return `
            <div class="notif-item ${n.lida ? "lida" : ""}">
                <div class="notif-text">${n.mensagem}</div>
                <div class="notif-time">${formatarDataNotificacao(n.data)}</div>
            </div>
            `;
        })
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

function adicionarNotificacaoConfirmacao(celebracao) {
    if (!celebracao || !celebracao.id) return;
    const existe = notificacoes.some(
        n => n.tipo === "confirmacao" && n.celebracaoId === celebracao.id && !n.resolvido
    );
    if (existe) return;

    const nova = {
        id: `confirm-${celebracao.id}-${Date.now()}`,
        tipo: "confirmacao",
        celebracaoId: celebracao.id,
        mensagem: `Confirmar presenca em ${formatCelebracaoResumo(celebracao)}?`,
        data: new Date().toISOString(),
        lida: false,
        resolvido: false
    };
    notificacoes = [nova, ...notificacoes].slice(0, 50);
    gravarNotificacoes();
    renderizarNotificacoes();
}

function marcarNotificacaoResolvida(id) {
    notificacoes = notificacoes.map(n =>
        n.id === id ? { ...n, lida: true, resolvido: true } : n
    );
    gravarNotificacoes();
}

async function responderConfirmacaoNotificacao(notifId, celebracaoId, estado) {
    try {
        const ok = await responderConfirmacao(celebracaoId, estado);
        if (ok) {
            marcarNotificacaoResolvida(notifId);
            renderizarNotificacoes();
        }
    } catch (err) {
        console.error("Erro ao responder confirmacao via notificacao:", err);
    }
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
