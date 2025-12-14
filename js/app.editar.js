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
    celebracaoEditarEstadoConfirmacao = celebracao.estado_confirmacao || "pendente";
    celebracaoEditarIsEspecial = !!celebracao.is_especial;

    preencherSelectCelebrantes("edit-celebrante", celebracao.celebrante_id);

    atualizarPainelConfirmacao();

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
    celebracaoEditarEstadoConfirmacao = null;
    celebracaoEditarIsEspecial = false;
}

async function verificarDisponibilidadeEditar() {
    const dataEl = document.getElementById("edit-data");
    const horaEl = document.getElementById("edit-hora");
    const celebranteEl = document.getElementById("edit-celebrante");
    const msgBox = document.getElementById("editar-disponibilidade-msg");

    if (!dataEl || !horaEl || !msgBox) return true;

    const data = dataEl.value;
    const hora = horaEl.value;
    const celebranteId = (celebranteEl && celebranteEl.value) || celebracaoEditarOriginalCelebranteId;

    if (!data || !hora) {
        msgBox.textContent = "";
        msgBox.className = "";
        return true;
    }

    if (
        data === celebracaoEditarOriginalData &&
        hora === celebracaoEditarOriginalHora &&
        (!celebranteEl || celebranteId === celebracaoEditarOriginalCelebranteId)
    ) {
        msgBox.textContent = "";
        msgBox.className = "";
        return true;
    }

    try {
        const params = new URLSearchParams({ data, hora });
        if (celebranteId) params.append("celebranteId", celebranteId);

        const resp = await fetch(`${API_URL}/celebracoes/disponibilidade?${params.toString()}`);

        if (!resp.ok) {
            msgBox.textContent = "Nao foi possivel verificar a disponibilidade.";
            msgBox.style.color = "red";
            return false;
        }

        const body = await resp.json();
        const ehMesmaCelebracao = body.celebracao && Number(body.celebracao.id) === celebracaoEditarId;

        if (!body.disponivel && !ehMesmaCelebracao) {
            msgBox.textContent = "Data/hora ja ocupadas por outra celebracao.";
            msgBox.style.color = "red";
            return false;
        }

        if (body.celebranteEspecial && body.celebranteDisponivel === false && !ehMesmaCelebracao) {
            msgBox.textContent = "Celebrante especial indisponivel nesta data/hora.";
            msgBox.style.color = "red";
            return false;
        }

        msgBox.textContent = "Data e hora disponiveis.";
        msgBox.style.color = "green";
        return true;
    } catch (err) {
        console.error("Erro ao verificar disponibilidade (editar):", err);
        msgBox.textContent = "Erro ao verificar disponibilidade.";
        msgBox.style.color = "red";
        return false;
    }
}

function atualizarPainelConfirmacao() {
    const painel = document.getElementById("confirmacao-panel");
    const estadoEl = document.getElementById("confirmacao-estado-label");
    const msgEl = document.getElementById("confirmacao-msg");

    if (!painel) return;

    if (!celebracaoEditarIsEspecial) {
        painel.classList.add("hidden");
        if (msgEl) msgEl.textContent = "";
        return;
    }

    painel.classList.remove("hidden");
    if (estadoEl) estadoEl.textContent = formatarEstadoConfirmacao(celebracaoEditarEstadoConfirmacao);
    if (msgEl) {
        msgEl.textContent = "";
        msgEl.className = "mensagens-disponibilidade";
    }
}

async function pedirConfirmacaoCelebrante() {
    if (!celebracaoEditarId) return;
    const msgEl = document.getElementById("confirmacao-msg");

    try {
        const resp = await fetch(`${API_URL}/celebracoes/${celebracaoEditarId}/confirmacao/solicitar`, {
            method: "POST"
        });
        let body = null;
        try { body = await resp.json(); } catch {}

        if (!resp.ok) {
            const msg = (body && body.mensagem) || "Nao foi possivel pedir confirmacao.";
            if (msgEl) msgEl.textContent = msg;
            return;
        }

        celebracaoEditarEstadoConfirmacao = (body && body.estado_confirmacao) || "pendente";
        atualizarPainelConfirmacao();
        adicionarNotificacao("Pedido de confirmacao enviado ao celebrante especial.");
        await buscarCelebracoes();
    } catch (err) {
        console.error("Erro ao pedir confirmacao:", err);
        if (msgEl) msgEl.textContent = "Erro ao pedir confirmacao.";
    }
}

async function marcarConfirmacaoCelebrante(estado) {
    if (!celebracaoEditarId) return;
    const msgEl = document.getElementById("confirmacao-msg");
    const estadoValido = ["confirmado", "pendente", "recusado"].includes(estado);
    if (!estadoValido) return;

    try {
        const resp = await fetch(`${API_URL}/celebracoes/${celebracaoEditarId}/confirmacao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado })
        });
        let body = null;
        try { body = await resp.json(); } catch {}

        if (!resp.ok) {
            const msg = (body && body.mensagem) || "Nao foi possivel atualizar confirmacao.";
            if (msgEl) msgEl.textContent = msg;
            return;
        }

        celebracaoEditarEstadoConfirmacao = (body && body.estado_confirmacao) || estado;
        atualizarPainelConfirmacao();
        adicionarNotificacao(`Estado do celebrante definido: ${formatarEstadoConfirmacao(estado)}`);
        await buscarCelebracoes();
    } catch (err) {
        console.error("Erro ao atualizar confirmacao:", err);
        if (msgEl) msgEl.textContent = "Erro ao atualizar confirmacao.";
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
    atualizarUserInfoUI();
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

    const celebranteCriarEl = document.getElementById("nova-celebracao-celebrante");
    if (celebranteCriarEl) {
        celebranteCriarEl.addEventListener("change", verificarDisponibilidadeDataHora);
    }

    const formEditar = document.getElementById("form-editar-celebracao");
    if (formEditar) {
        formEditar.addEventListener("submit", submeterEdicaoCelebracao);
    }

    const editDataEl = document.getElementById("edit-data");
    const editHoraEl = document.getElementById("edit-hora");
    const editCelebranteEl = document.getElementById("edit-celebrante");
    if (editDataEl) editDataEl.addEventListener("change", verificarDisponibilidadeEditar);
    if (editHoraEl) editHoraEl.addEventListener("change", verificarDisponibilidadeEditar);
    if (editCelebranteEl) editCelebranteEl.addEventListener("change", verificarDisponibilidadeEditar);

    const btnConfirmOk = document.getElementById("confirm-dialog-ok");
    const btnConfirmCancel = document.getElementById("confirm-dialog-cancel");
    if (btnConfirmOk) btnConfirmOk.addEventListener("click", confirmarDialogoOk);
    if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", confirmarDialogoCancelar);

    const notifToggle = document.getElementById("notif-toggle");
    const notifClear = document.getElementById("notif-clear");
    if (notifToggle) notifToggle.addEventListener("click", togglePainelNotificacoes);
    if (notifClear) notifClear.addEventListener("click", limparNotificacoes);
    document.addEventListener("click", fecharNotificacoesAoClicarFora);

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
});
