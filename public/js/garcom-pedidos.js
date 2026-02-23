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
 * 2. CARREGAMENTO DE PEDIDOS - VERSÃO COM AGRUPAMENTO PARA PRONTOS
 */
function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = `<p class="msg-status">Buscando ${abaAtual}...</p>`;

    if (abaAtual === 'PRONTO') {
        // Para PRONTOS, precisamos agrupar por mesa
        carregarPedidosProntosAgrupados();
    } else {
        // Para ENVIADO e PREPARANDO, mantém o comportamento original (um card por pedido)
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
}

/**
 * 2.1 CARREGAMENTO ESPECÍFICO PARA PRONTOS (AGRUPADO POR MESA)
 */
function carregarPedidosProntosAgrupados() {
    const lista = document.getElementById('lista-pedidos');

    // Primeiro snapshot: busca todos os pedidos PRONTOS
    db.collectionGroup('pedidos')
        .where("statusDoPedido", "==", "PRONTO")
        .onSnapshot(snapshot => {

            if (snapshot.empty) {
                lista.innerHTML = `<h2 class="nenhum-pedido">NADA EM PRONTOS</h2>`;
                return;
            }

            // Objeto para agrupar por mesa
            const pedidosPorMesa = {};

            snapshot.forEach(docPed => {
                const pedido = docPed.data();
                const pedidoId = docPed.id;

                // Pega o ID da mesa
                const mesaId = docPed.ref.parent.parent.id;
                const numeroMesa = mesaId.replace('mesa-', '');

                // Chave única para a mesa
                const chaveMesa = `${mesaId}|${numeroMesa}`;

                if (!pedidosPorMesa[chaveMesa]) {
                    pedidosPorMesa[chaveMesa] = {
                        mesaId: mesaId,
                        numeroMesa: numeroMesa,
                        pedidos: [],
                        totalItens: 0,
                        horarioMaisRecente: null
                    };
                }

                // Adiciona o pedido ao grupo
                pedidosPorMesa[chaveMesa].pedidos.push({
                    id: pedidoId,
                    dados: pedido
                });

                // Calcula total de itens deste pedido
                const itensPedido = pedido.itens || [];
                const totalItensPedido = itensPedido.reduce((acc, item) => acc + (item.quantidade || 1), 0);
                pedidosPorMesa[chaveMesa].totalItens += totalItensPedido;

                // Pega o horário mais recente
                if (pedido.horario) {
                    const horarioMillis = pedido.horario.toMillis();
                    if (!pedidosPorMesa[chaveMesa].horarioMaisRecente || horarioMillis > pedidosPorMesa[chaveMesa].horarioMaisRecente) {
                        pedidosPorMesa[chaveMesa].horarioMaisRecente = horarioMillis;
                    }
                }
            });

            // Renderiza a lista agrupada
            lista.innerHTML = '';

            Object.values(pedidosPorMesa).forEach(grupo => {
                const hora = grupo.horarioMaisRecente
                    ? new Date(grupo.horarioMaisRecente).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                const itemHTML = `
                <div class="item-pedido-lista" id="mesa-${grupo.mesaId}-prontos" style="border-left: 5px solid #2ecc71;">
                    <div class="mesa-indicador" style="background: #2ecc71; color: white; font-weight: bold;">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="info-pedido">
                        <strong>Mesa ${grupo.numeroMesa}</strong>
                        <span style="font-size: 0.9rem; color: #666;">${grupo.totalItens} itens prontos</span>
                        <span class="horario-pedido">${hora}</span>
                    </div>
                    <button class="btn-ver" onclick="abrirDetalhesProntos('${grupo.mesaId}', '${grupo.numeroMesa}')">VER</button>
                </div>
            `;

                lista.innerHTML += itemHTML;
            });
        });
}

/**
 * 3. RENDERIZAÇÃO DA LINHA (para ENVIADO e PREPARANDO)
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
 * 4. DETALHES DO PEDIDO (MODAL) - Versão original para pedidos individuais
 */
function abrirDetalhes(mesaId, pedidoId, numeroMesa) {
    const modal = document.getElementById('modal-detalhes');
    const listaContainer = document.getElementById('modal-lista-itens');
    document.getElementById('modal-mesa-titulo').innerText = `MESA ${numeroMesa}`; // Mudado para "MESA" igual à foto

    modal.style.display = 'flex';
    listaContainer.innerHTML = '<p class="carregando">Lendo itens...</p>';

    // Limpa listener anterior para não gastar dados
    if (monitoramentoModal) monitoramentoModal();

    monitoramentoModal = db.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId)
        .onSnapshot(doc => {
            if (!doc.exists) return fecharModal();

            const dados = doc.data();
            const itensPedido = dados.itens || [];
            
            // Calcula total de itens para o badge
            const totalItens = itensPedido.reduce((acc, item) => acc + (item.quantidade || 1), 0);

            // HTML com a estrutura exata da foto
            let htmlModal = `
                <!-- STATUS ENVIADOS igual à foto -->
                <div class="status-container">
                    <div class="status-left">
                        <h3>PEDIDOS</h3>
                    </div>
                </div>
            `;

            // ITENS DO PEDIDO - com a estrutura exata da foto
            itensPedido.forEach(item => {
                const info = alimentos ? alimentos.find(a => a.nome === item.nome) : null;
                const imagem = info ? info.img : "https://via.placeholder.com/80x80/cccccc/666666?text=Produto";

                htmlModal += `
                    <div class="item-card-modal">
                        <div class="item-img-container">
                            <img src="${imagem}" onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=Erro'" alt="${item.nome}">
                        </div>
                        <div class="item-info">
                            <h4>${item.nome}</h4>
                            <div class="item-obs">${item.observacao || "Pão brioche, carne, molho e alface."}</div>
                            <div class="item-price-row">
                                <span class="item-price">R$ ${item.preco ? item.preco.toFixed(2).replace('.', ',') : '20,99'}</span>
                                <span class="item-qtd-badge">${item.quantidade || 1}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            listaContainer.innerHTML = htmlModal;
        });
}

/**
 /**
 * 4.1 DETALHES DO PEDIDO (MODAL) - Versão para prontos agrupados
 */
function abrirDetalhesProntos(mesaId, numeroMesa) {
    const modal = document.getElementById('modal-detalhes');
    const listaContainer = document.getElementById('modal-lista-itens');
    document.getElementById('modal-mesa-titulo').innerText = `MESA ${numeroMesa} - PRONTOS`; // CORRIGIDO: numeroMesa (minúsculo)

    modal.style.display = 'flex';
    listaContainer.innerHTML = '<p class="carregando">Carregando itens prontos...</p>';

    // Limpa listener anterior
    if (monitoramentoModal) monitoramentoModal();

    // Busca TODOS os pedidos PRONTOS desta mesa
    monitoramentoModal = db.collection('mesas').doc(mesaId).collection('pedidos')
        .where("statusDoPedido", "==", "PRONTO")
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                listaContainer.innerHTML = '<p class="nenhum-pedido">Nenhum item pronto nesta mesa</p>';
                return;
            }

            // Array para armazenar todos os itens (para possível agregação futura)
            const todosItens = [];
            let totalItens = 0;

            snapshot.forEach(doc => {
                const pedido = doc.data();
                if (pedido.itens && Array.isArray(pedido.itens)) {
                    pedido.itens.forEach(item => {
                        const quantidade = item.quantidade || 1;
                        todosItens.push({
                            ...item,
                            quantidade: quantidade,
                            pedidoId: doc.id
                        });
                        totalItens += quantidade;
                    });
                }
            });

            // Monta o HTML do modal
            let htmlModal = `
                <div style="margin-bottom: 15px;">
                    <span class="status-badge-green" style="font-size: 1rem; padding: 8px 20px;">Total: ${totalItens} itens</span>
                </div>
            `;

            // Lista todos os itens (você pode optar por agregar itens iguais se preferir)
            todosItens.forEach(item => {
                const info = alimentos ? alimentos.find(a => a.nome === item.nome) : null;
                const imagem = info ? info.img : "img/placeholder.png";

                htmlModal += `
                    <div class="item-card-modal">
                        <div class="item-img-container">
                            <img src="${imagem}" onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=Erro'" alt="${item.nome}">
                        </div>
                        <div class="item-info">
                            <h4>${item.nome}</h4>
                            <div class="item-obs">${item.observacao || "Pão brioche, carne, molho e alface."}</div>
                            <div class="item-price-row">
                                <span class="item-price">R$ ${item.preco ? item.preco.toFixed(2).replace('.', ',') : '20,99'}</span>
                                <span class="item-qtd-badge">${item.quantidade || 1}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            // Botões inferiores
            htmlModal += `
                <div class="modal-footer">
                    <button class="btn-entregar-modal" onclick="entregarTodosProntos('${mesaId}')">ENTREGAR TUDO</button>
                </div>
            `;

            listaContainer.innerHTML = htmlModal;
        });
}

/**
 * 5. FUNÇÃO PARA ENTREGAR TODOS OS PEDIDOS PRONTOS DE UMA MESA
 */
function entregarTodosProntos(mesaId) {
    if (confirm('Confirmar entrega de todos os itens prontos desta mesa?')) {
        db.collection('mesas').doc(mesaId).collection('pedidos')
            .where("statusDoPedido", "==", "PRONTO")
            .get()
            .then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.update(doc.ref, {
                        statusDoPedido: 'ProcessoDePagamento',
                        horaEntrega: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                return batch.commit();
            })
            .then(() => {
                fecharModal();
            })
            .catch(error => {
                console.error('Erro ao entregar pedidos:', error);
                alert('Erro ao entregar pedidos');
            });
    }
}

/**
 * 6. FUNÇÃO PARA FECHAR MODAL
 */
function fecharModal() {
    document.getElementById('modal-detalhes').style.display = 'none';
    if (monitoramentoModal) {
        monitoramentoModal(); // Unsubscribe
        monitoramentoModal = null;
    }
}

// Inicia na aba de Novos
document.addEventListener('DOMContentLoaded', () => alternarAba('ENVIADO'));