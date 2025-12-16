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
    const celebranteEl = document.getElementById("nova-celebracao-celebrante");

    if (!dataEl || !horaEl) return;

    const data = dataEl.value;
    const hora = horaEl.value;
    const celebranteId = celebranteEl ? celebranteEl.value : "";

    if (!data || !hora) {
        mostrarDisponibilidade("", null);
        return;
    }

    try {
        const params = new URLSearchParams({ data, hora });
        if (celebranteId) params.append("celebranteId", celebranteId);

        const body = await apiFetch(`${API_URL}/celebracoes/disponibilidade?${params.toString()}`);

        if (body.disponivel) {
            if (body.celebranteEspecial) {
                mostrarDisponibilidade(
                    body.celebranteDisponivel
                        ? "Celebrante especial disponivel nesta data/hora."
                        : "Celebrante especial indisponivel nesta data/hora.",
                    body.celebranteDisponivel ? "livre" : "ocupado"
                );
            } else {
                mostrarDisponibilidade("Data e hora livres.", "livre");
            }
        } else if (body.celebracao) {
            const c = body.celebracao;
            const info =
                `${c.tipo || "Celebracao"} as ${c.hora} em ${c.local || "local nao definido"}` +
                (c.celebrante_nome ? ` (Celebrante: ${c.celebrante_nome})` : "") +
                (c.is_especial ? " [especial]" : "");

            mostrarDisponibilidade("Data e hora ocupadas. Ja existe: " + info, "ocupado");
        } else {
            mostrarDisponibilidade("Data e hora ocupadas.", "ocupado");
        }
    } catch (err) {
        console.error("Erro ao verificar disponibilidade:", err);
        mostrarDisponibilidade("Erro de comunicacao ao verificar disponibilidade.", "ocupado");
    }
}


// =============================
//  CRIAR CELEBRACAO
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
        mostrarMensagemCelebracoes("Preencha todos os campos obrigatorios.", "erro");
        return;
    }

    try {
        await apiFetch(`${API_URL}/celebracoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, hora, tipo, celebranteId, local })
        });

        mostrarMensagemCelebracoes("Celebracao registada com sucesso!", "sucesso");
        adicionarNotificacao(`Celebracao criada: ${formatCelebracaoResumo({ tipo, data, hora, local })}`);

        const form = document.getElementById("form-nova-celebracao");
        if (form) form.reset();
        mostrarDisponibilidade("", null);

        await buscarCelebracoes();
        await buscarStats();
    } catch (err) {
        console.error("Erro ao criar celebracao:", err);
        mostrarMensagemCelebracoes((err && err.message) || "Erro de comunicacao com o servidor.", "erro");
    }
}

