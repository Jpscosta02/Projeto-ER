// =============================
//  INTENÇÕES DE MISSA (REQ-07.1)
// =============================
function mostrarMensagemIntencoes(msg, tipo = "erro") {
    const box = document.getElementById("intencoes-mensagens");
    if (!box) return;

    box.textContent = msg || "";
    box.className = "mensagens-form";
    if (!msg) return;

    if (tipo === "sucesso") box.classList.add("sucesso");
    if (tipo === "erro") box.classList.add("erro");
}

async function submeterIntencaoMissa(event) {
    event.preventDefault();

    const nome = (currentUser?.nome || currentUser?.email || "").trim();
    const dataPretendida = (document.getElementById("intencao-data") || {}).value;
    const intencao = (document.getElementById("intencao-texto") || {}).value?.trim();
    const solicitanteEmail = currentUser?.email || null;
    const celebracaoId = (document.getElementById("intencao-celebracao") || {}).value;

    if (!nome || !intencao) {
        mostrarMensagemIntencoes("Preencha todos os campos obrigatórios.", "erro");
        return;
    }

    if (!celebracaoId) {
        mostrarMensagemIntencoes("Selecione uma missa para a data pretendida.", "erro");
        return;
    }

    try {
        await apiFetch(`${API_URL}/intencoes-missa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, intencao, solicitanteEmail, celebracaoId })
        });

        mostrarMensagemIntencoes("Intenção submetida com sucesso (pendente de validação).", "sucesso");
        if (typeof adicionarNotificacao === "function") {
            adicionarNotificacao(`Intenção de missa submetida para ${dataPretendida} (pendente).`);
        }

        const form = document.getElementById("form-intencao-missa");
        if (form) form.reset();
    } catch (err) {
        console.error("Erro ao submeter intenção:", err);
        mostrarMensagemIntencoes((err && err.message) || "Erro ao submeter intenção.", "erro");
    }
}

function mostrarMensagemAdminIntencoes(msg, tipo = "erro") {
    const box = document.getElementById("intencoes-admin-mensagens");
    if (!box) return;
    box.textContent = msg || "";
    box.className = "mensagens-form";
    if (!msg) return;
    if (tipo === "sucesso") box.classList.add("sucesso");
    if (tipo === "erro") box.classList.add("erro");
}

function formatarDataIso(isoOuDate) {
    if (!isoOuDate) return "";
    return String(isoOuDate).slice(0, 10);
}

function definirEstadoDisponibilidadeMissas({ ok, mensagem }) {
    const btn = document.getElementById("btn-submeter-intencao");
    const select = document.getElementById("intencao-celebracao");
    if (btn) btn.disabled = !ok;
    if (select) select.disabled = !ok;
    if (mensagem) mostrarMensagemIntencoes(mensagem, ok ? "sucesso" : "erro");
}

function preencherSelectMissas(selectEl, missas = []) {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    if (!missas.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Sem missas disponíveis.";
        selectEl.appendChild(opt);
        return;
    }

    const optPlaceholder = document.createElement("option");
    optPlaceholder.value = "";
    optPlaceholder.textContent = missas.length > 1 ? "Selecione..." : "Missa disponivel";
    selectEl.appendChild(optPlaceholder);

    missas.forEach(m => {
        const data = formatarDataIso(m.data);
        const hora = (m.hora || "").slice(0, 5);
        const tipo = m.tipo || "Missa";
        const local = m.local || "local nao definido";
        const celebrante = m.celebrante_nome ? ` - ${m.celebrante_nome}` : "";
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${data} ${hora} - ${tipo} - ${local}${celebrante}`;
        selectEl.appendChild(opt);
    });

    if (missas.length === 1) {
        selectEl.value = String(missas[0].id);
    }
}

async function carregarMissasParaDataPretendida() {
    const selectEl = document.getElementById("intencao-celebracao");
    const dataEl = document.getElementById("intencao-data");
    if (!selectEl) return;

    try {
        const missas = await apiFetch(`${API_URL}/celebracoes/missas-disponiveis`);
        const lista = Array.isArray(missas) ? missas : [];

        preencherSelectMissas(selectEl, lista);

        if (!lista.length) {
            definirEstadoDisponibilidadeMissas({ ok: false, mensagem: "Nao ha missas disponiveis." });
            selectEl.disabled = true;
            if (dataEl) dataEl.value = "";
            return;
        }

        definirEstadoDisponibilidadeMissas({ ok: true, mensagem: "Selecione a missa pretendida." });
        selectEl.disabled = false;

        const syncData = () => {
            if (!dataEl) return;
            const id = Number(selectEl.value);
            const missa = lista.find(m => Number(m.id) === id);
            dataEl.value = missa ? formatarDataIso(missa.data) : "";
        };

        selectEl.onchange = syncData;
        syncData();
    } catch (err) {
        console.error("Erro ao carregar missas:", err);
        definirEstadoDisponibilidadeMissas({ ok: false, mensagem: (err && err.message) || "Erro ao carregar missas." });
        selectEl.disabled = true;
        if (dataEl) dataEl.value = "";
    }
}

// Permite refresh quando o utilizador abre a vista "Intenções".
window.atualizarIntencoesMissasDisponiveis = carregarMissasParaDataPretendida;

function renderIntencoesPendentesAdmin(lista = []) {
    const card = document.getElementById("intencoes-admin-card");
    const container = document.getElementById("intencoes-admin-lista");
    if (!card || !container) return;

    if (!isAdmin) {
        card.style.display = "none";
        return;
    }

    card.style.display = "block";

    if (!lista.length) {
        container.innerHTML = '<p style="padding: 12px; text-align:center; color:#6b7280;">Sem intenções pendentes.</p>';
        return;
    }

    container.innerHTML = lista.map(item => {
        const id = item.id;
        const data = formatarDataIso(item.data_pretendida || item.dataPretendida);
        const nome = item.nome || "";
        const intencao = item.intencao || "";
        const email = item.solicitante_email || "";
        return `
            <div class="intencao-item">
                <div class="intencao-meta">
                    <div class="intencao-titulo">#${id} — ${nome} (${data})</div>
                    ${email ? `<div class="intencao-detalhe">Solicitante: ${email}</div>` : ""}
                    <div class="intencao-detalhe">${intencao}</div>
                </div>
                <div class="intencao-acoes">
                    <button type="button" class="btn-primary" onclick="decidirIntencaoMissa(${id}, 'aprovada')">Aprovar</button>
                    <button type="button" class="btn-secondary" onclick="decidirIntencaoMissa(${id}, 'rejeitada')">Rejeitar</button>
                    <textarea id="intencao-motivo-${id}" rows="2" placeholder="Motivo (opcional)"></textarea>
                </div>
            </div>
        `;
    }).join("");
}

async function carregarIntencoesPendentesAdmin() {
    if (!isAdmin) return;
    try {
        const lista = await apiFetch(`${API_URL}/intencoes-missa?estado=pendente`);
        renderIntencoesPendentesAdmin(Array.isArray(lista) ? lista : []);
    } catch (err) {
        console.error("Erro ao carregar pendentes:", err);
        mostrarMensagemAdminIntencoes((err && err.message) || "Erro ao carregar intenções pendentes.", "erro");
    }
}

async function decidirIntencaoMissa(id, estado) {
    if (!id || !estado) return;
    const motivoEl = document.getElementById(`intencao-motivo-${id}`);
    const motivo = motivoEl ? motivoEl.value?.trim() : "";

    try {
        await apiFetch(`${API_URL}/intencoes-missa/${id}/decisao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado, motivo })
        });

        mostrarMensagemAdminIntencoes(`Intenção #${id} ${estado === "aprovada" ? "aprovada" : "rejeitada"} com sucesso.`, "sucesso");
        await carregarIntencoesPendentesAdmin();

        if (typeof buscarCelebracoes === "function") {
            await buscarCelebracoes();
        } else if (typeof carregarCelebracoes === "function") {
            carregarCelebracoes();
        }
    } catch (err) {
        console.error("Erro ao decidir intenção:", err);
        mostrarMensagemAdminIntencoes((err && err.message) || "Erro ao decidir intenção.", "erro");
    }
}

async function verificarDecisoesENotificarSolicitante() {
    const email = currentUser?.email;
    if (!email) return;

    try {
        const lista = await apiFetch(`${API_URL}/intencoes-missa/minhas?email=${encodeURIComponent(email)}`);
        if (!Array.isArray(lista) || !lista.length) return;

        for (const item of lista) {
            const estado = String(item.estado || "").toLowerCase();
            const data = formatarDataIso(item.data_pretendida || item.dataPretendida);
            const base = `Intenção de missa (${data})`;
            const msg =
                estado === "aprovada"
                    ? `${base}: aprovada.`
                    : `${base}: rejeitada.${item.decisao_motivo ? ` Motivo: ${item.decisao_motivo}` : ""}`;

            if (typeof adicionarNotificacao === "function") adicionarNotificacao(msg);
            await apiFetch(`${API_URL}/intencoes-missa/${item.id}/notificado`, { method: "POST" });
        }
    } catch (err) {
        console.error("Erro ao verificar decisões:", err);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const nomeEl = document.getElementById("intencao-nome");
    if (!nomeEl) return;
    const nome = (currentUser?.nome || currentUser?.email || "").trim();
    nomeEl.value = nome;
    nomeEl.readOnly = true;
});

window.addEventListener("DOMContentLoaded", () => {
    if (isAdmin) carregarIntencoesPendentesAdmin();
    verificarDecisoesENotificarSolicitante();
});

window.addEventListener("DOMContentLoaded", () => {
    carregarMissasParaDataPretendida();
});
