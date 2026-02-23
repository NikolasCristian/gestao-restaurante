// Configurações globais
const database = db;
const urlParams = new URLSearchParams(window.location.search);
const mesaId = urlParams.get('mesa');
const pedidoId = urlParams.get('pedido');

/**
 * 1. INICIALIZAÇÃO E MONITORAMENTO
 */
function iniciarMonitoramento() {
    if (!mesaId || !pedidoId) {
        console.error("Parâmetros ausentes.");
        window.location.href = 'barman.html';
        return;
    }

    database.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId)
        .onSnapshot((doc) => {
            if (!doc.exists) {
                window.location.href = 'barman.html';
                return;
            }

            const pedido = doc.data();
            renderizarInterfaceBarman(pedido);
        });
}

/**
 * 2. INTERFACE EXCLUSIVA PARA BEBIDAS
 */
function renderizarInterfaceBarman(pedido) {
    const labelMesa = document.querySelector('.label-mesa');
    if (labelMesa) labelMesa.innerText = `Mesa ${mesaId.replace('mesa-', '')}`;

    // Filtra apenas categoria bebidas
    const itensBebidas = pedido.itens ? pedido.itens.filter(item => item.categoria === 'bebidas') : [];
    const container = document.getElementById('lista-itens-bar');

    if (!container) return;

    let htmlConteudo = '';

    if (itensBebidas.length > 0) {
        htmlConteudo += '<h3 style="margin: 20px 0 5px; font-family: Arial Black, sans-serif; color: #0066cc; text-align:center;">ITENS DO BAR</h3>';

        htmlConteudo += itensBebidas.map(item => {
            // Busca imagem no array global de alimentos (se existir)
            const produtoRef = (typeof alimentos !== 'undefined') ? alimentos.find(a => a.nome === item.nome) : null;
            const imgFinal = item.img || (produtoRef ? produtoRef.img : 'img/placeholder-bebida.png');

            return `
                <div class="card-bebida" style="display:flex; align-items:center; background:#fff; margin:10px 0; padding:15px; border-radius:20px; gap:15px; border-left: 8px solid #0066cc; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <img src="${imgFinal}" style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover;" onerror="this.src='img/placeholder-bebida.png'">
                    <div class="info-alimento" style="flex:1;">
                        <h3 style="margin:0; font-family:'Arial Black', sans-serif; font-size:18px;">${item.nome}</h3>
                        <p style="margin:5px 0 0; color:#666; font-size:13px;">${item.observacao || ''}</p>
                    </div>
                    <div class="qtd-indicador" style="background:#0066cc; color: white; padding:10px 18px; border-radius:12px; font-weight:900; font-size:20px;">
                        ${item.quantidade}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        htmlConteudo = '<p style="text-align:center; padding:20px;">Nenhuma bebida encontrada neste pedido.</p>';
    }

    container.innerHTML = htmlConteudo;

    // --- CONTROLE DO BOTÃO DE ENTREGA ---
    const footerArea = document.querySelector('.opcoes');
    if (!footerArea) return;

    // O botão só fica ativo se o status da bebida for 'EntregarAgora' (liberado pela cozinha ou automático)
    if (pedido.StatusDaBebida === 'EntregarAgora') {
        footerArea.innerHTML = `
            <button class="btn-entregar" style="background-color: #0066cc; color: white; width: 100%; border: none; padding: 20px; border-radius: 40px; font-weight: bold; font-size: 18px; cursor: pointer;" 
                onclick="entregarBebida()">
                ENTREGAR BEBIDAS
            </button>
        `;
    } else {
        footerArea.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <div style="background: #f0f7ff; color: #0066cc; padding: 12px; border-radius: 40px; text-align: center; font-weight: bold; border: 1px solid #0066cc; font-size: 14px;">
                    ${pedido.statusDoPedido === 'FALTAoREFRI' ? '⏳ AGUARDANDO COZINHA' : '✅ BEBIDA ENTREGUE'}
                </div>
                <button disabled style="background-color: #ccc; color: white; width: 100%; padding: 20px; border-radius: 40px; border: none; font-weight: bold;">
                    AGUARDANDO LIBERAÇÃO
                </button>
            </div>
        `;
    }
}

/**
 * 3. LÓGICA DE FINALIZAÇÃO DO BARMAN
 */
async function entregarBebida() {
    if (!confirm("Confirmar entrega das bebidas?")) return;
    
    try {
        // Ao entregar, o status final vai para PRONTO e a bebida para Entregue
        await database.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId).update({
            StatusDaBebida: "Entregue",
            statusDoPedido: "PRONTO"
        });

        alert("Pedido concluído e enviado para Prontos!");
        window.location.href = 'barman.html'; 
    } catch (error) {
        console.error("Erro ao entregar:", error);
        alert("Erro ao processar entrega.");
    }
}

document.addEventListener('DOMContentLoaded', iniciarMonitoramento);