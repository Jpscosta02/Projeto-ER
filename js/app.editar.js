// =============================
//  EDITAR CELEBRACAO
// =============================
function abrirEditarCelebracao(id) {
    const modal = document.getElementById("modal-editar");
    if (!modal) return;

    const celebracao = celebracoes.find(c => Number(c.id) === Number(id));
    if (!celebracao) return;

    celebracaoEditarId = Number(id);

    const inputData = document.getElementById("edit-data");
    const inputHora = document.getElementById("edit-hora");
    const inputTipo = document.getElementById("edit-tipo");
    const inputLocal = document.getElementById("edit-local");

    if (inputData) inputData.value = celebracao.data ? celebracao.data.substring(0, 10) : "";
    if (inputHora) inputHora.value = celebracao.hora || "";
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
    celebracaoEditarOriginalCelebranteId = null;
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

        const body = await apiFetch(`${API_URL}/celebracoes/disponibilidade?${params.toString()}`);
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

async function submeterEdicaoCelebracao(event) {
    event.preventDefault();

    if (celebracaoEditarId == null) {
        alert("Nenhuma celebracao selecionada para edicao.");
        return;
    }

    const data = (document.getElementById("edit-data") || {}).value;
    const hora = (document.getElementById("edit-hora") || {}).value;
    const tipo = (document.getElementById("edit-tipo") || {}).value;
    const celebranteId = (document.getElementById("edit-celebrante") || {}).value;
    const local = (document.getElementById("edit-local") || {}).value;
    const celebranteEscolhido = celebranteId || celebracaoEditarOriginalCelebranteId;

    if (!data || !hora || !tipo || !celebranteEscolhido) {
        alert("Preencha todos os campos obrigatorios.");
        return;
    }

    const msgBox = document.getElementById("editar-disponibilidade-msg");

    try {
        await apiFetch(`${API_URL}/celebracoes/${celebracaoEditarId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, hora, tipo, celebranteId: celebranteEscolhido, local })
        });

        adicionarNotificacao(`Celebracao atualizada: ${formatCelebracaoResumo({ tipo, data, hora, local })}`);
        fecharModalEditar();
        await buscarCelebracoes();
        await buscarStats();
    } catch (err) {
        if (err.status === 409 && msgBox) {
            msgBox.textContent = (err.data && err.data.mensagem) || "Data/hora ja ocupadas por outra celebracao.";
            msgBox.style.color = "red";
            return;
        }

        console.error("Erro ao atualizar celebracao:", err);
        alert((err && err.message) || "Erro de comunicacao com o servidor.");
    }
}

async function removerCelebracao(id) {
    if (!isAdmin) {
        alert("Apenas administradores podem remover celebracoes.");
        return;
    }

    const celebracao = celebracoes.find(c => Number(c.id) === Number(id));
    const resumo = celebracao ? formatCelebracaoResumo(celebracao) : "esta celebracao";

    const confirmou = await abrirDialogConfirmacao(`Tem a certeza que deseja remover ${resumo}?`);
    if (!confirmou) return;

    let apagou = false;
    try {
        await apiFetch(`${API_URL}/celebracoes/${id}`, { method: "DELETE" });
        apagou = true;
    } catch (err) {
        console.error("Erro ao remover celebracao:", err);
        alert((err && err.message) || "Erro de comunicacao com o servidor.");
        return;
    }

    if (apagou) {
        adicionarNotificacao(`Celebracao removida: ${celebracao?.tipo || "Celebracao"}`);
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

// =============================
//  EDITAR SACRAMENTO
// =============================
let sacramentoEditarId = null;
let sacramentoEditarOriginalData = null;
let sacramentoEditarOriginalHora = null;
let sacramentoEditarOriginalCelebranteId = null;

function abrirEditarSacramento(id) {
    const modal = document.getElementById("modal-editor-sacramento");
    if (!modal) return;
    const sacramento = sacramentos.find(s => Number(s.id) === Number(id));
    if (!sacramento) return;
    sacramentoEditarId = Number(id);
    sacramentoEditarOriginalCelebranteId = sacramento.celebrante_id ?? sacramento.celebranteId ?? null;
    const inputData = document.getElementById("edit-sacramento-data");
    const inputHora = document.getElementById("edit-sacramento-hora");
    const inputTipo = document.getElementById("edit-sacramento-tipo");
    const inputLocal = document.getElementById("edit-sacramento-local");
    const selectCelebrante = document.getElementById("edit-sacramento-celebrante");

    if (inputData) inputData.value = sacramento.data ? String(sacramento.data).slice(0,10) : "";
    if (inputHora) inputHora.value = sacramento.hora || "";
    if (inputTipo) inputTipo.value = sacramento.tipo || "";
    if (inputLocal) inputLocal.value = sacramento.local || "";

    sacramentoEditarOriginalData = inputData ? inputData.value : null;
    sacramentoEditarOriginalHora = inputHora ? inputHora.value : null;
    preencherSelectCelebrantes("edit-sacramento-celebrante", sacramentoEditarOriginalCelebranteId);

    const msgBox = document.getElementById("editar-sacramento-disponibilidade-msg");
    if (msgBox) { msgBox.textContent = ""; msgBox.className = ""; }

    modal.classList.remove("hidden");
}

function fecharModalEditarSacramento() {
    const modal = document.getElementById("modal-editor-sacramento");
    if (modal) modal.classList.add("hidden");
    sacramentoEditarId = null;
    sacramentoEditarOriginalData = null;
    sacramentoEditarOriginalHora = null;
    sacramentoEditarOriginalCelebranteId = null;
}

async function verificarDisponibilidadeEditarSacramento() {
    const dataEl = document.getElementById("edit-sacramento-data");
    const horaEl = document.getElementById("edit-sacramento-hora");
    const msgBox = document.getElementById("editar-sacramento-disponibilidade-msg");
    if (!dataEl || !horaEl || !msgBox) return true;
    const data = dataEl.value;
    const hora = horaEl.value;
    if (!data || !hora) { msgBox.textContent = ""; msgBox.className = ""; return true; }
    if (data === sacramentoEditarOriginalData && hora === sacramentoEditarOriginalHora) {
        msgBox.textContent = ""; msgBox.className = ""; return true;
    }
    try {
        const params = new URLSearchParams({ data, hora });
        const body = await apiFetch(`${API_URL}/sacramentos/disponibilidade?${params.toString()}`);
        const ehMesmo = body.sacramento && Number(body.sacramento.id) === sacramentoEditarId;
        if (!body.disponivel && !ehMesmo) {
            msgBox.textContent = "Data/hora já ocupadas por outro sacramento.";
            msgBox.style.color = "red";
            return false;
        }
        msgBox.textContent = "Data e hora disponíveis.";
        msgBox.style.color = "green";
        return true;
    } catch (err) {
        console.error("Erro ao verificar disponibilidade (editar sacramento):", err);
        msgBox.textContent = "Erro ao verificar disponibilidade.";
        msgBox.style.color = "red";
        return false;
    }
}

async function submeterEdicaoSacramento(event) {
    event.preventDefault();
    if (sacramentoEditarId == null) { alert("Nenhum sacramento selecionado."); return; }
    const data = (document.getElementById("edit-sacramento-data") || {}).value;
    const hora = (document.getElementById("edit-sacramento-hora") || {}).value;
    const tipo = (document.getElementById("edit-sacramento-tipo") || {}).value;
    const celebranteId = (document.getElementById("edit-sacramento-celebrante") || {}).value || sacramentoEditarOriginalCelebranteId;
    const local = (document.getElementById("edit-sacramento-local") || {}).value;
    if (!data || !hora || !tipo || !celebranteId) { alert("Preencha todos os campos obrigatórios."); return; }
    const msgBox = document.getElementById("editar-sacramento-disponibilidade-msg");
    try {
        await apiFetch(`${API_URL}/sacramentos/${sacramentoEditarId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, hora, tipo, celebranteId, local })
        });
        adicionarNotificacao(`Sacramento atualizado: ${formatCelebracaoResumo({ tipo, data, hora, local })}`);
        fecharModalEditarSacramento();
        await buscarSacramentos();
        await buscarStats();
    } catch (err) {
        if (err.status === 409 && msgBox) {
            msgBox.textContent = (err.data && err.data.mensagem) || "Data/hora já ocupadas por outro sacramento.";
            msgBox.style.color = "red";
            return;
        }
        console.error("Erro ao atualizar sacramento:", err);
        alert((err && err.message) || "Erro de comunicação com o servidor.");
    }
}

async function removerSacramento(id) {
    if (!isAdmin) { alert("Apenas administradores podem remover sacramentos."); return; }
    const sacramento = sacramentos.find(s => Number(s.id) === Number(id));
    const resumo = sacramento ? `${sacramento.tipo || "Sacramento"} em ${String(sacramento.data).slice(0,10)} às ${sacramento.hora}` : "este sacramento";
    const confirmou = await abrirDialogoConfirmacaoSacramento(`Tem a certeza que deseja remover ${resumo}?`);
    if (!confirmou) return;
    try {
        await apiFetch(`${API_URL}/sacramentos/${id}`, { method: "DELETE" });
        adicionarNotificacao(`Sacramento removido: ${sacramento?.tipo || "Sacramento"}`);
        await buscarSacramentos();
        await buscarStats();
    } catch (err) {
        console.error("Erro ao remover sacramento:", err);
        alert((err && err.message) || "Erro de comunicação com o servidor.");
    }
}

function abrirDialogoConfirmacaoSacramento(msg) {
    return new Promise(resolve => {
        const modal = document.getElementById("confirm-sacramento-dialog");
        const texto = document.getElementById("confirm-sacramento-dialog-message");
        const btnOk = document.getElementById("confirm-sacramento-dialog-ok");
        const btnCancel = document.getElementById("confirm-sacramento-dialog-cancel");
        if (texto) texto.textContent = msg || "";
        if (modal) modal.classList.remove("hidden");
        const limpar = () => {
            if (modal) modal.classList.add("hidden");
            btnOk?.removeEventListener('click', onOk);
            btnCancel?.removeEventListener('click', onCancel);
        };
        const onOk = () => { limpar(); resolve(true); };
        const onCancel = () => { limpar(); resolve(false); };
        btnOk?.addEventListener('click', onOk);
        btnCancel?.addEventListener('click', onCancel);
    });
}

window.addEventListener("DOMContentLoaded", () => {
    const formEditar = document.getElementById("form-editar-sacramento");
    if (formEditar) formEditar.addEventListener("submit", submeterEdicaoSacramento);
    const editDataEl = document.getElementById("edit-sacramento-data");
    const editHoraEl = document.getElementById("edit-sacramento-hora");
    if (editDataEl) editDataEl.addEventListener("change", verificarDisponibilidadeEditarSacramento);
    if (editHoraEl) editHoraEl.addEventListener("change", verificarDisponibilidadeEditarSacramento);

    const novoDataEl = document.getElementById("novo-sacramento-data");
    const novoHoraEl = document.getElementById("novo-sacramento-hora");
    const formNovo = document.getElementById("form-novo-sacramento");
    if (novoDataEl) {
        novoDataEl.addEventListener("change", verificarDisponibilidadeDataHoraSacramento);
        novoDataEl.addEventListener("input", verificarDisponibilidadeDataHoraSacramento);
    }
    if (novoHoraEl) {
        novoHoraEl.addEventListener("change", verificarDisponibilidadeDataHoraSacramento);
        novoHoraEl.addEventListener("input", verificarDisponibilidadeDataHoraSacramento);
    }
    if (formNovo) {
        formNovo.addEventListener("submit", criarSacramento);
    }
});

