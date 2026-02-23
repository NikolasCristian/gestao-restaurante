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
            window.location.href = 'cozinha.html';
            return;
        }

        const pedido = doc.data();

        // SEGURANÇA: Se o pedido for "apenas bebidas", essa tela se fecha sozinha
        const temComida = pedido.itens && pedido.itens.some(item => item.categoria !== 'bebidas');
        if (!temComida) {
            window.location.href = 'cozinha.html';
            return;
        }

        renderizarInterface(pedido);
    }, (error) => {
        console.error("Erro no Firebase:", error);
    });
}

/**
 * 2. RENDERIZAÇÃO DA INTERFACE (CORREÇÃO DE IMAGENS)
 */
function renderizarInterface(pedido) {
    const labelMesa = document.querySelector('.label-mesa');
    if (labelMesa) labelMesa.innerText = `Mesa ${mesaId.replace('mesa-', '')}`;

    const itensCozinha = pedido.itens.filter(item => item.categoria !== 'bebidas');
    const container = document.getElementById('lista-itens-cozinha');

    if (container) {
        container.innerHTML = itensCozinha.map(item => {
            
            // --- LÓGICA DE CORREÇÃO DA IMAGEM ---
            // 1. Tenta buscar no array global 'alimentos' (que vem do seu produtos.js)
            const dadosBase = (typeof alimentos !== 'undefined') 
                ? alimentos.find(a => a.nome === item.nome) 
                : null;
            
            // 2. Define a imagem final: Link do banco > Link do array alimentos > Placeholder
            const imgFinal = item.img || (dadosBase ? dadosBase.img : 'img/placeholder-bk.png');

            return `
                <div class="card-alimento" style="display:flex; align-items:center; background:#fff; margin:10px 0; padding:15px; border-radius:20px; gap:15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 8px solid #f1a933;">
                    <img src="${imgFinal}" 
                         style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover;" 
                         onerror="this.src='img/placeholder-bk.png'">
                    
                    <div class="info-alimento" style="flex:1;">
                        <h3 style="margin:0; font-family:'Arial Black', sans-serif; font-size:18px;">${item.nome}</h3>
                        <p style="margin:5px 0 0; color:#666; font-size:13px;">${item.observacao || item.descricao || ''}</p>
                    </div>
                    <div class="qtd-indicador" style="background:#f1a933; color: white; padding:10px 18px; border-radius:12px; font-weight:900; font-size:20px;">
                        ${item.quantidade}
                    </div>
                </div>
            `;
        }).join('');
    }

    // CONTROLE DOS BOTÕES DE STATUS
    const footerArea = document.querySelector('.opcoes');
    if (!footerArea) return;

    if (pedido.statusDoPedido === 'ENVIADO') {
        footerArea.innerHTML = `
            <button style="background-color: #f1a933; color:white; width: 100%; border: none; padding: 20px; border-radius: 40px; font-weight: bold; cursor: pointer; font-size:16px;" 
                onclick="atualizarStatusPedido('PREPARANDO')">
                COMEÇAR PREPARO
            </button>`;
    } 
    else if (pedido.statusDoPedido === 'PREPARANDO') {
        footerArea.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <div style="background: #fff9f0; color: #e67e22; padding: 12px; border-radius: 40px; text-align: center; font-weight: bold; border: 1px solid #f1a933; font-size: 13px;">
                    👨‍🍳 EM PREPARO POR: ${pedido.preparadoPor ? pedido.preparadoPor.toUpperCase() : 'COZINHEIRO'}
                </div>
                <button style="background-color: #2ecc71; color:white; width: 100%; border: none; padding: 20px; border-radius: 40px; font-weight: bold; cursor: pointer; font-size:16px;" 
                    onclick="finalizarPedidoCozinhaHibrido()">
                    FINALIZAR LANCHE
                </button>
            </div>`;
    } 
    else {
        footerArea.innerHTML = `<button disabled style="background-color: #ccc; width: 100%; padding: 20px; border-radius: 40px; color:white; border:none; font-weight:bold;">PEDIDO NAS MÃOS DO BARMAN</button>`;
    }
}

/**
 * 3. INICIAR PREPARO
 */
async function atualizarStatusPedido(novoStatus) {
    if (!confirm("Deseja iniciar o preparo agora?")) return;

    try {
        let dadosUpdate = { statusDoPedido: novoStatus };
        const user = firebase.auth().currentUser;
        if (user) {
            const userDoc = await database.collection("users").doc(user.uid).get();
            dadosUpdate.preparadoPor = userDoc.exists ? userDoc.data().nome : (user.displayName || "Cozinheiro");
        }
        await database.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId).update(dadosUpdate);
    } catch (error) {
        alert("Erro ao atualizar status.");
    }
}

/**
 * 4. FINALIZAR (LÓGICA HÍBRIDA)
 */
async function finalizarPedidoCozinhaHibrido() {
    if (!confirm("O lanche está pronto para sair?")) return;

    try {
        const docRef = database.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId);
        const doc = await docRef.get();
        const pedido = doc.data();

        const temBebida = pedido.itens && pedido.itens.some(item => item.categoria === 'bebidas');
        let dadosFinais = {};

        if (temBebida) {
            dadosFinais = { statusDoPedido: "FALTAoREFRI", StatusDaBebida: "EntregarAgora" };
            alert("🍔 Lanche pronto! Barman notificado.");
        } else {
            dadosFinais = { statusDoPedido: "PRONTO", StatusDaBebida: "Entregue" };
            alert("✅ Pedido finalizado!");
        }

        await docRef.update(dadosFinais);
        window.location.href = 'cozinha.html';
    } catch (error) {
        alert("Erro ao finalizar pedido.");
    }
}

document.addEventListener('DOMContentLoaded', iniciarMonitoramento);