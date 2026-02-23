let abaAtual = 'ENVIADO'; 
let monitoramentoModal = null; 

/**
 * 1. GERENCIAMENTO DE ABAS
 */
function alternarAba(status) {
    const statusUpper = status.toUpperCase();
    
    // Normalização para o Banco de Dados
    if (statusUpper === 'PRONTOS' || statusUpper === 'PRONTO') {
        abaAtual = 'PRONTO';
    } else if (statusUpper === 'PREPARANDO') {
        abaAtual = 'PREPARANDO';
    } else {
        abaAtual = 'ENVIADO';
    }

    // Gerenciamento visual: Remove active de todos e coloca no atual
    document.querySelectorAll('.aba-item').forEach(btn => btn.classList.remove('active'));
    
    // Mapeamento de IDs (ajuste conforme seu HTML)
    const mapaBotoes = {
        'ENVIADO': 'aba-novos',
        'PREPARANDO': 'aba-preparo',
        'PRONTO': 'aba-prontos'
    };
    
    const btnAtivo = document.getElementById(mapaBotoes[abaAtual]);
    if (btnAtivo) btnAtivo.classList.add('active');

    carregarPedidos();
}

/**
 * 2. CARREGAMENTO DE PEDIDOS (VERSÃO LEVE)
 */
function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = `<p class="msg-status">Buscando ${abaAtual}...</p>`;

    // Usamos collectionGroup para ouvir todos os pedidos de todas as mesas de uma vez
    db.collectionGroup('pedidos')
      .where("statusDoPedido", "==", abaAtual)
      .onSnapshot(snapshot => {
        lista.innerHTML = '';

        if (snapshot.empty) {
            lista.innerHTML = `<h2 class="nenhum-pedido">NADA EM ${abaAtual}</h2>`;
            return;
        }

        snapshot.forEach(docPed => {
            const pedido = docPed.data();
            const pedidoId = docPed.id;
            
            // Pega o ID da mesa subindo na árvore do banco
            const mesaId = docPed.ref.parent.parent.id;
            const numeroMesa = mesaId.replace('mesa-', '');

            renderizarLinhaPedido(numeroMesa, pedido, mesaId, pedidoId);
        });
    });
}

/**
 * 3. RENDERIZAÇÃO DA LINHA
 */
function renderizarLinhaPedido(numeroMesa, pedido, mesaId, pedidoId) {
    const lista = document.getElementById('lista-pedidos');
    const hora = pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    // Definição de Cores e Ícones por Status
    let corStatus = '#bdc3c7'; // Cinza (Enviado)
    let icone = numeroMesa;

    if (pedido.statusDoPedido === 'PREPARANDO') {
        corStatus = '#f1a933'; // Laranja
    } else if (pedido.statusDoPedido === 'PRONTO') {
        corStatus = '#2ecc71'; // Verde
        icone = '<i class="fas fa-check"></i>';
    }

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}" style="border-left: 5px solid ${corStatus};">
            <div class="mesa-indicador" style="background: ${corStatus}; color: white; font-weight: bold;">
                ${icone}
            </div>
            <div class="info-pedido">
                <strong>Mesa ${numeroMesa}</strong>
                <span class="horario-pedido">${hora}</span>
            </div>
            <button class="btn-ver" onclick="abrirDetalhes('${mesaId}', '${pedidoId}', '${numeroMesa}')">VER</button>
        </div>
    `;

    if (!document.getElementById(`ped-${pedidoId}`)) {
        lista.innerHTML += itemHTML;
    }
}

/**
 * 4. DETALHES DO PEDIDO (MODAL)
 */
function abrirDetalhes(mesaId, pedidoId, numeroMesa) {
    const modal = document.getElementById('modal-detalhes');
    const listaContainer = document.getElementById('modal-lista-itens');
    document.getElementById('modal-mesa-titulo').innerText = `Pedido Mesa ${numeroMesa}`;

    modal.style.display = 'flex';
    listaContainer.innerHTML = '<p class="carregando">Lendo itens...</p>';

    // Limpa listener anterior para não gastar dados
    if (monitoramentoModal) monitoramentoModal();

    monitoramentoModal = db.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId)
        .onSnapshot(doc => {
            if (!doc.exists) return fecharModal();

            const dados = doc.data();
            const itensPedido = dados.itens || [];

            listaContainer.innerHTML = `
                <div class="status-badge-modal" style="background: #eee; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; margin-bottom: 15px; display: inline-block;">
                    Status: <strong>${dados.statusDoPedido}</strong>
                </div>
                ${itensPedido.map(item => {
                    // Busca no catálogo local alimentos.js
                    const info = alimentos.find(a => a.nome === item.nome);
                    const imagem = info ? info.img : "img/placeholder.png";

                    return `
                        <div class="item-card-modal">
                            <img src="${imagem}" onerror="this.src='img/placeholder.png'">
                            <div class="item-info">
                                <h4>${item.nome}</h4>
                                <p>${item.observacao || "Sem observações"}</p>
                                <div class="item-meta">
                                    <span>Qtd: <strong>${item.quantidade}</strong></span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            `;
        });
}

function fecharModal() {
    document.getElementById('modal-detalhes').style.display = 'none';
    if (monitoramentoModal) {
        monitoramentoModal(); // Unsubscribe
        monitoramentoModal = null;
    }
}

// Inicia na aba de Novos
document.addEventListener('DOMContentLoaded', () => alternarAba('ENVIADO'));