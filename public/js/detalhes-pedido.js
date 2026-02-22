// Configurações globais
const database = db; 
const urlParams = new URLSearchParams(window.location.search);
const mesaId = urlParams.get('mesa');
const pedidoId = urlParams.get('pedido');

/**
 * 1. INICIALIZAÇÃO E MONITORAMENTO EM TEMPO REAL
 */
function iniciarMonitoramento() {
    if (!mesaId || !pedidoId) {
        console.error("Parâmetros ausentes na URL.");
        window.location.href = 'cozinha.html';
        return;
    }

    database.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId)
    .onSnapshot((doc) => {
        if (!doc.exists) {
            console.warn("Pedido não encontrado ou removido.");
            window.location.href = 'cozinha.html'; // Redireciona se o pedido sumir
            return;
        }

        const pedido = doc.data();

        // --- VERIFICAÇÃO DE SEGURANÇA ---
        // Se o pedido não tiver nenhum item que seja comida, volta para a cozinha
        const temComida = pedido.itens.some(item => item.categoria !== 'bebidas');
        if (!temComida) {
            console.log("Pedido contém apenas bebidas. Retornando...");
            window.location.href = 'cozinha.html';
            return;
        }

        renderizarInterface(pedido);
    }, (error) => {
        console.error("Erro no monitoramento:", error);
    });
}

/**
 * 2. RENDERIZAÇÃO DA INTERFACE (HTML DINÂMICO)
 */
function renderizarInterface(pedido) {
    const labelMesa = document.querySelector('.label-mesa');
    if (labelMesa) labelMesa.innerText = `Mesa ${mesaId.replace('mesa-', '')}`;

    // Filtra apenas itens de cozinha (Hambúrgueres, Pizzas, etc)
    const itensCozinha = pedido.itens.filter(item => item.categoria !== 'bebidas');
    const container = document.getElementById('lista-itens-cozinha');

    // Renderiza os cards dos itens
    container.innerHTML = itensCozinha.map(item => {
        const dadosBase = (typeof alimentos !== 'undefined') 
            ? alimentos.find(a => a.nome === item.nome || a.id == item.id) 
            : {};
        const imgFinal = item.img || dadosBase.img || 'img/placeholder-bk.png';

        return `
            <div class="card-alimento" style="display:flex; align-items:center; background:#fff; margin:10px 0; padding:15px; border-radius:20px; gap:15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <img src="${imgFinal}" style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover;" onerror="this.src='img/placeholder-bk.png'">
                <div class="info-alimento" style="flex:1;">
                    <h3 style="margin:0; font-family:'Arial Black', sans-serif; font-size:18px;">${item.nome}</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:13px;">${item.observacao || item.descricao || ''}</p>
                </div>
                <div class="qtd-indicador" style="background:#d9d9d9; padding:10px 18px; border-radius:12px; font-weight:900; font-size:20px;">
                    ${item.quantidade}
                </div>
            </div>
        `;
    }).join('');

    // CONTROLE DOS BOTÕES DE STATUS
    const footerArea = document.querySelector('.opcoes');
    if (!footerArea) return;

    if (pedido.statusDoPedido === 'ENVIADO') {
        footerArea.innerHTML = `
            <button class="btn-ok" style="background-color: #f1a933; width: 100%; border: none; padding: 15px; border-radius: 40px; font-weight: bold; cursor: pointer;" 
                onclick="atualizarStatusPedido('PREPARANDO')">
                COMEÇAR PREPARO
            </button>
        `;
    } 
    else if (pedido.statusDoPedido === 'PREPARANDO') {
        footerArea.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <div class="status-preparo-nome" style="background: white; color: #666; padding: 12px; border-radius: 40px; text-align: center; font-weight: bold; border: 2px solid #ddd; font-size: 14px;">
                    EM PREPARO POR: ${pedido.preparadoPor ? pedido.preparadoPor.toUpperCase() : 'COZINHEIRO'}
                </div>
                <button class="btn-ok" style="background-color: #f1a933; width: 100%; border: none; padding: 15px; border-radius: 40px; font-weight: bold; cursor: pointer;" 
                    onclick="atualizarStatusPedido('PRONTO')">
                    FINALIZAR PEDIDO
                </button>
            </div>
        `;
    } 
    else {
        footerArea.innerHTML = `<button class="btn-ok" disabled style="background-color: #ccc; width: 100%; padding: 15px; border-radius: 40px;">PEDIDO CONCLUÍDO</button>`;
    }
}

/**
 * 3. LÓGICA DE ATUALIZAÇÃO
 */
async function atualizarStatusPedido(novoStatus) {
    const mensagemConfirmacao = novoStatus === 'PREPARANDO' 
        ? "Deseja realmente iniciar o preparo deste pedido?" 
        : "O pedido está pronto para ser entregue?";

    if (!confirm(mensagemConfirmacao)) return;

    try {
        let dadosUpdate = { statusDoPedido: novoStatus };
        
        if (novoStatus === 'PREPARANDO') {
            const user = firebase.auth().currentUser;
            let nomeCozinheiro = "Cozinheiro";

            if (user) {
                const userDoc = await database.collection("users").doc(user.uid).get();
                nomeCozinheiro = userDoc.exists ? userDoc.data().nome : (user.displayName || "Cozinheiro");
            }
            dadosUpdate.preparadoPor = nomeCozinheiro;
        }

        await database.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId).update(dadosUpdate);
        
        if (novoStatus === 'PRONTO') {
            alert("Pedido finalizado com sucesso!");
            window.location.href = 'cozinha.html';
        }

    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar o pedido.");
    }
}

document.addEventListener('DOMContentLoaded', iniciarMonitoramento);