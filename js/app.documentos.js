// =============================
//  DOCUMENTOS
// =============================
(function () {
    function el(id) {
        return document.getElementById(id);
    }

    function setMensagem(tipo, texto) {
        const box = el("docs-mensagens");
        if (!box) return;
        box.textContent = texto || "";
        box.className = "mensagens-form";
        if (!texto) {
            box.style.display = "none";
            return;
        }
        box.style.display = "block";
        if (tipo === "sucesso") box.classList.add("sucesso");
        if (tipo === "erro") box.classList.add("erro");
    }

    function limparMensagem() {
        setMensagem("", "");
    }

    function normalizarDataIso(valor) {
        if (!valor) return "";
        return String(valor).slice(0, 10);
    }

    function formatarDataPt(iso) {
        const base = normalizarDataIso(iso);
        if (!base) return "";
        const [y, m, d] = base.split("-");
        if (!y || !m || !d) return base;
        return `${d}/${m}/${y}`;
    }

    function formatarHora(valor) {
        if (!valor) return "";
        return String(valor).slice(0, 5);
    }

    function formatarCelebracaoLabel(c) {
        const dataStr = formatarDataPt(c.data);
        const horaStr = formatarHora(c.hora);
        const tipo = c.tipo || "Celebração";
        const local = c.local ? ` (${c.local})` : "";
        const when = [dataStr, horaStr].filter(Boolean).join(" ");
        return `${when} - ${tipo}${local}`.trim();
    }

    function ordenarCelebracoesPorDataHoraAsc(lista) {
        return (lista || []).slice().sort((a, b) => {
            const da = normalizarDataIso(a.data);
            const db = normalizarDataIso(b.data);
            if (da !== db) return da.localeCompare(db);
            return formatarHora(a.hora).localeCompare(formatarHora(b.hora));
        });
    }

    async function obterParticipantes(celebracaoId) {
        return await apiFetch(`${API_URL}/celebracoes/${celebracaoId}/participantes`);
    }

    function obterCelebracaoSelecionada() {
        const select = el("docs-celebracao-select");
        if (!select) return null;
        const id = select.value;
        if (!id) return null;
        return (celebracoes || []).find(c => String(c.id) === String(id)) || null;
    }

    function nomeFicheiroSeguro(nome) {
        const raw = String(nome || "documento");
        return raw
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120);
    }

    function downloadTexto(nomeFicheiro, conteudo, mime) {
        const blob = new Blob([conteudo], { type: mime || "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeFicheiro;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function construirCSVParticipantes(participantes) {
        const sep = ";";
        const bom = "\ufeff";
        const linhas = [];
        linhas.push(`sep=${sep}`);
        linhas.push(["Nome", "Contacto", "Data de Nascimento", "Inscrito em"].join(sep));
        (participantes || []).forEach(p => {
            const nome = p.nome || "";
            const contacto = p.contacto || "";
            const nasc = p.data_nascimento ? formatarDataPt(p.data_nascimento) : "";
            const criadoEm = p.criado_em ? formatarDataPt(p.criado_em) : "";
            const cols = [nome, contacto, nasc, criadoEm].map(v => `"${String(v).replace(/\"/g, '""')}"`);
            linhas.push(cols.join(sep));
        });
        return bom + linhas.join("\r\n");
    }

    async function atualizarPreview(celebracaoId) {
        const card = el("docs-preview-card");
        const container = el("docs-participantes-preview");
        if (!card || !container) return;

        if (!celebracaoId) {
            card.style.display = "none";
            container.innerHTML = "";
            return;
        }

        try {
            container.innerHTML = "<p style='padding:12px;color:#6b7280;'>A carregar...</p>";
            card.style.display = "block";
            const lista = await obterParticipantes(celebracaoId);
            const participantes = Array.isArray(lista) ? lista : [];
            if (!participantes.length) {
                card.style.display = "none";
                container.innerHTML = "";
                return;
            }

            const itens = participantes
                .slice(0, 12)
                .map(p => `<li>${p.nome || "—"}${p.contacto ? ` <span style="color:#6b7280;">(${p.contacto})</span>` : ""}</li>`)
                .join("");

            const mais = participantes.length > 12 ? `<p style="padding:0 12px 12px;color:#6b7280;">+ ${participantes.length - 12} restantes</p>` : "";
            container.innerHTML = `
                <p style="padding:12px 12px 0;"><strong>Total:</strong> ${participantes.length}</p>
                <ul style="padding:10px 28px; margin:0; display:flex; flex-direction:column; gap:4px;">${itens}</ul>
                ${mais}
            `;
        } catch (err) {
            card.style.display = "none";
            container.innerHTML = "";
        }
    }

    function atualizarEstadoBotoes() {
        const select = el("docs-celebracao-select");
        const btnExcel = el("docs-export-excel");
        const btnAtestado = el("docs-gerar-atestado");
        if (!select || !btnExcel || !btnAtestado) return;
        const has = !!select.value;
        btnExcel.disabled = !has;
        btnAtestado.disabled = !has;
    }

    async function exportarParticipantesExcel() {
        limparMensagem();
        const select = el("docs-celebracao-select");
        if (!select || !select.value) return;
        const celebracao = obterCelebracaoSelecionada();
        const celebracaoId = select.value;

        try {
            const lista = await obterParticipantes(celebracaoId);
            const participantes = Array.isArray(lista) ? lista : [];
            if (!participantes.length) {
                setMensagem("erro", "Esta celebração não tem participantes.");
                return;
            }

            const csv = construirCSVParticipantes(participantes);
            const tipo = celebracao ? celebracao.tipo : "celebracao";
            const dataStr = celebracao ? normalizarDataIso(celebracao.data) : "";
            const nome = nomeFicheiroSeguro(`participantes_${dataStr}_${tipo}.csv`);
            downloadTexto(nome, csv, "text/csv;charset=utf-8");
            setMensagem("sucesso", "Exportação concluída.");
        } catch (err) {
            console.error("Erro ao exportar participantes:", err);
            setMensagem("erro", "Não foi possível exportar participantes.");
        }
    }

    async function gerarAtestado() {
        limparMensagem();
        const select = el("docs-celebracao-select");
        if (!select || !select.value) return;
        const celebracao = obterCelebracaoSelecionada();
        const celebracaoId = select.value;

        try {
            const lista = await obterParticipantes(celebracaoId);
            const participantes = Array.isArray(lista) ? lista : [];
            if (!participantes.length) {
                setMensagem("erro", "Esta celebração não tem participantes.");
                return;
            }

            const titulo = "Atestado";
            const tipo = celebracao?.tipo || "Celebração";
            const dataStr = celebracao?.data ? formatarDataPt(celebracao.data) : "";
            const horaStr = celebracao?.hora ? formatarHora(celebracao.hora) : "";
            const local = celebracao?.local || "";
            const celebrante = celebracao?.celebrante_nome || "";
            const quando = [dataStr, horaStr].filter(Boolean).join(" ");

            const linhas = participantes
                .map((p, idx) => {
                    const nome = p.nome || "";
                    const contacto = p.contacto || "";
                    return `<tr><td style="padding:6px 8px; border-bottom:1px solid #e5e7eb;">${idx + 1}</td><td style="padding:6px 8px; border-bottom:1px solid #e5e7eb;">${nome}</td><td style="padding:6px 8px; border-bottom:1px solid #e5e7eb;">${contacto}</td></tr>`;
                })
                .join("");

            const html = `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color:#111827; }
    h1 { font-size: 20px; margin: 0 0 10px; }
    .meta { margin: 0 0 16px; color:#374151; }
    .meta div { margin: 2px 0; }
    .texto { margin: 16px 0; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #111827; font-size: 13px; }
    .assin { margin-top: 36px; display:flex; justify-content: space-between; gap: 16px; }
    .assin .box { width: 48%; }
    .linha { border-top: 1px solid #111827; margin-top: 28px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${titulo}</h1>
  <div class="meta">
    <div><strong>Celebração:</strong> ${tipo}</div>
    ${quando ? `<div><strong>Data/Hora:</strong> ${quando}</div>` : ""}
    ${local ? `<div><strong>Local:</strong> ${local}</div>` : ""}
    ${celebrante ? `<div><strong>Celebrante:</strong> ${celebrante}</div>` : ""}
  </div>

  <div class="texto">
    Atesta-se que os seguintes participantes constam na lista de participantes associada à celebração acima identificada.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Nome</th>
        <th style="width:180px;">Contacto</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>

  <div class="assin">
    <div class="box">
      <div class="linha"></div>
      <div style="margin-top:6px; color:#374151;">Assinatura</div>
    </div>
    <div class="box">
      <div class="linha"></div>
      <div style="margin-top:6px; color:#374151;">Data</div>
    </div>
  </div>

  <script>
    window.onload = () => { window.focus(); window.print(); };
  </script>
</body>
</html>`;

            const w = window.open("", "_blank");
            if (!w) {
                setMensagem("erro", "O navegador bloqueou a janela do atestado (pop-up).");
                return;
            }
            w.document.open();
            w.document.write(html);
            w.document.close();
        } catch (err) {
            console.error("Erro ao gerar atestado:", err);
            setMensagem("erro", "Não foi possível gerar o atestado.");
        }
    }

    function onChangeCelebracao() {
        limparMensagem();
        atualizarEstadoBotoes();
        const select = el("docs-celebracao-select");
        atualizarPreview(select ? select.value : "");
    }

    window.atualizarDocumentosCelebracoes = function atualizarDocumentosCelebracoes() {
        const select = el("docs-celebracao-select");
        if (!select) return;
        const atual = select.value;

        const lista = ordenarCelebracoesPorDataHoraAsc(celebracoes || []);
        select.innerHTML = '<option value="">Selecione uma celebração...</option>';
        lista.forEach(c => {
            if (!c || c.id == null) return;
            const opt = document.createElement("option");
            opt.value = String(c.id);
            opt.textContent = formatarCelebracaoLabel(c);
            select.appendChild(opt);
        });

        if (atual && lista.some(c => String(c.id) === String(atual))) {
            select.value = atual;
        } else {
            select.value = "";
        }

        atualizarEstadoBotoes();
    };

    window.addEventListener("DOMContentLoaded", () => {
        const select = el("docs-celebracao-select");
        const btnExcel = el("docs-export-excel");
        const btnAtestado = el("docs-gerar-atestado");

        if (select) select.addEventListener("change", onChangeCelebracao);
        if (btnExcel) btnExcel.addEventListener("click", exportarParticipantesExcel);
        if (btnAtestado) btnAtestado.addEventListener("click", gerarAtestado);

        limparMensagem();
        atualizarEstadoBotoes();
        if (typeof window.atualizarDocumentosCelebracoes === "function") {
            window.atualizarDocumentosCelebracoes();
        }
    });
})();
