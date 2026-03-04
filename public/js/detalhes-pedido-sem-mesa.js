// js/detalhes-pedido-sem-mesa.js

// Configurações globais
const database = db;
const urlParams = new URLSearchParams(window.location.search);
const pedidoId = urlParams.get('pedido');
const nomeCliente = urlParams.get('nomeCliente');

/**
 * 1. INICIALIZAÇÃO E MONITORAMENTO EM TEMPO REAL
 */
function iniciarMonitoramento() {
    if (!pedidoId) {
        console.error("Parâmetros ausentes na URL.");
        window.location.href = 'cozinha.html';
        return;
    }

    database.collection('mesas').doc('sem-mesa').collection('pedidos').doc(pedidoId)
    .onSnapshot((doc) => {
        if (!doc.exists) {
            window.location.href = 'cozinha.html';
            return;
        }

        const pedido = doc.data();

        // SEGURANÇA: Se o pedido for "apenas bebidas", redireciona para o bar
        const temComida = pedido.itens && pedido.itens.some(item => item.categoria !== 'bebidas');
        const apenasBebidas = pedido.itens && pedido.itens.every(item => item.categoria === 'bebidas');
        
        if (apenasBebidas) {
            window.location.href = 'barman.html';
            return;
        }

        renderizarInterface(pedido);
    }, (error) => {
        console.error("Erro no Firebase:", error);
    });
}

/**
 * 2. RENDERIZAÇÃO DA INTERFACE
 */
function renderizarInterface(pedido) {
    const labelMesa = document.querySelector('.label-mesa');
    if (labelMesa) {
        // Mostra o nome do cliente em vez do número da mesa
        labelMesa.innerText = nomeCliente ? decodeURIComponent(nomeCliente) : (pedido.nomeCliente || 'Cliente');
    }

    // Filtra apenas itens que NÃO são bebidas (para a cozinha)
    const itensCozinha = pedido.itens.filter(item => item.categoria !== 'bebidas');
    const container = document.getElementById('lista-itens-cozinha');

    if (container) {
        if (itensCozinha.length === 0) {
            container.innerHTML = '<p class="msg-status">Nenhum item para a cozinha neste pedido</p>';
        } else {
            container.innerHTML = itensCozinha.map(item => {
                
                // Tenta buscar no array global 'alimentos'
                const dadosBase = (typeof alimentos !== 'undefined') 
                    ? alimentos.find(a => a.nome === item.nome) 
                    : null;
                
                // Define a imagem final
                const imgFinal = item.img || (dadosBase ? dadosBase.img : 'img/placeholder-bk.png');

                return `
                    <div class="card-alimento" style="display:flex; align-items:center; background:#fff; margin:15px; padding:15px; border-radius:20px; gap:15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 8px solid #f1a933;">
                        <img src="${imgFinal}" 
                             style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover;" 
                             onerror="this.src='img/placeholder-bk.png'">
                        
                        <div class="info-alimento" style="flex:1;">
                            <h3 style="margin:0; font-family:'Arial Black', sans-serif; font-size:18px;">${item.nome}</h3>
                            <p style="margin:5px 0 0; color:#666; font-size:13px;">${item.observacao || item.descricao || ''}</p>
                        </div>
                        <div class="qtd-indicador" style="background: #f1a933; color: white; padding:10px 18px; border-radius:12px; font-weight:900; font-size:20px;">
                            ${item.quantidade}
                        </div>
                    </div>
                `;
            }).join('');
        }
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
    else if (pedido.statusDoPedido === 'PRONTO') {
        footerArea.innerHTML = `
            <button disabled style="background-color: #2ecc71; opacity: 0.7; width: 100%; border: none; padding: 20px; border-radius: 40px; font-weight: bold; font-size:16px; color:white;">
                ✅ PEDIDO PRONTO
            </button>`;
    }
    else {
        footerArea.innerHTML = `<button disabled style="background-color: #ccc; width: 100%; padding: 20px; border-radius: 40px; color:white; border:none; font-weight:bold;">PEDIDO FINALIZADO</button>`;
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
        await database.collection('mesas').doc('sem-mesa').collection('pedidos').doc(pedidoId).update(dadosUpdate);
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao atualizar status.");
    }
}

/**
 * 4. FINALIZAR PEDIDO (LÓGICA HÍBRIDA)
 */
async function finalizarPedidoCozinhaHibrido() {
    if (!confirm("O lanche está pronto para sair?")) return;

    try {
        const docRef = database.collection('mesas').doc('sem-mesa').collection('pedidos').doc(pedidoId);
        const doc = await docRef.get();
        const pedido = doc.data();

        const temBebida = pedido.itens && pedido.itens.some(item => item.categoria === 'bebidas');
        let dadosFinais = {};

        if (temBebida) {
            // Se tem bebida, marca como aguardando bebida
            dadosFinais = { 
                statusDoPedido: "FALTAoREFRI", 
                StatusDaBebida: "EntregarAgora" 
            };
            alert("🍔 Lanche pronto! Aguardando bebidas.");
        } else {
            // Se não tem bebida, marca como pronto
            dadosFinais = { 
                statusDoPedido: "PRONTO", 
                StatusDaBebida: "Nao se aplica" 
            };
            alert("✅ Pedido finalizado!");
        }

        await docRef.update(dadosFinais);
        
        // Redireciona de volta para a cozinha
        setTimeout(() => {
            window.location.href = 'cozinha.html';
        }, 1500);
        
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao finalizar pedido.");
    }
}

/**
 * 5. FUNÇÃO PARA VOLTAR
 */
function voltarParaCozinha() {
    window.location.href = 'cozinha.html';
}

// Adiciona evento ao botão de fechar
document.addEventListener('DOMContentLoaded', () => {
    iniciarMonitoramento();
    
    const btnFechar = document.querySelector('a[title="Início"]');
    if (btnFechar) {
        btnFechar.addEventListener('click', (e) => {
            e.preventDefault();
            voltarParaCozinha();
        });
    }
});