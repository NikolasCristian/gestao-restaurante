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

    // Mapeamento de IDs
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
 * 2. CARREGAMENTO DE PEDIDOS
 */
function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = `<p class="msg-status">Buscando ${abaAtual}...</p>`;

    if (abaAtual === 'PRONTO') {
        carregarPedidosProntosAgrupados();
    } else {
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

                    const mesaId = docPed.ref.parent.parent.id;

                    renderizarLinhaPedido(pedido, mesaId, pedidoId);
                });
            });
    }
}

/**
 * 2.1 CARREGAMENTO ESPECÍFICO PARA PRONTOS (AGRUPADO)
 */
function carregarPedidosProntosAgrupados() {
    const lista = document.getElementById('lista-pedidos');

    db.collectionGroup('pedidos')
        .where("statusDoPedido", "==", "PRONTO")
        .onSnapshot(snapshot => {

            if (snapshot.empty) {
                lista.innerHTML = `<h2 class="nenhum-pedido">NADA EM PRONTOS</h2>`;
                return;
            }

            const pedidosPorMesa = {};

            snapshot.forEach(docPed => {
                const pedido = docPed.data();
                const pedidoId = docPed.id;
                const mesaId = docPed.ref.parent.parent.id;

                // Verifica se é sem mesa
                const isSemMesa = mesaId === 'sem-mesa';

                // Para sem mesa, usa o nome do cliente como identificador
                const identificador = isSemMesa ? (pedido.nomeCliente || 'Cliente') : mesaId.replace('mesa-', '');
                const chaveMesa = isSemMesa ? `sem-mesa-${identificador}` : mesaId;

                if (!pedidosPorMesa[chaveMesa]) {
                    pedidosPorMesa[chaveMesa] = {
                        mesaId: mesaId,
                        identificador: identificador,
                        isSemMesa: isSemMesa,
                        pedidos: [],
                        totalItens: 0,
                        horarioMaisRecente: null,
                        nomeCliente: isSemMesa ? identificador : null
                    };
                }

                pedidosPorMesa[chaveMesa].pedidos.push({
                    id: pedidoId,
                    dados: pedido
                });

                const itensPedido = pedido.itens || [];
                const totalItensPedido = itensPedido.reduce((acc, item) => acc + (item.quantidade || 1), 0);
                pedidosPorMesa[chaveMesa].totalItens += totalItensPedido;

                if (pedido.horario) {
                    const horarioMillis = pedido.horario.toMillis();
                    if (!pedidosPorMesa[chaveMesa].horarioMaisRecente || horarioMillis > pedidosPorMesa[chaveMesa].horarioMaisRecente) {
                        pedidosPorMesa[chaveMesa].horarioMaisRecente = horarioMillis;
                    }
                }
            });

            lista.innerHTML = '';

            Object.values(pedidosPorMesa).forEach(grupo => {
                const hora = grupo.horarioMaisRecente
                    ? new Date(grupo.horarioMaisRecente).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                // Define o ícone baseado no tipo
                const iconeHTML = grupo.isSemMesa
                    ? '<i class="fas fa-concierge-bell"></i>'
                    : '<i class="fas fa-check"></i>';
                const itemHTML = `
                    <div class="item-pedido-lista" id="mesa-${grupo.mesaId}-prontos" style="border-left: 5px solid #2ecc71;">
                        <div class="mesa-indicador" style="background: #2ecc71; color: white; font-weight: bold;">
                            ${iconeHTML}
                        </div>
                         <button class="btn-ver" onclick="abrirDetalhesProntos('${grupo.mesaId}', '${grupo.identificador}', ${grupo.isSemMesa})">VER</button>
                        <div class="info-pedido">
                            <span class="horario-pedido">${hora}</span>
                        </div>
                    </div>
                `;

                lista.innerHTML += itemHTML;
            });
        });
}

/**
 * 3. RENDERIZAÇÃO DA LINHA (para ENVIADO e PREPARANDO)
 */
function renderizarLinhaPedido(pedido, mesaId, pedidoId) {
    const lista = document.getElementById('lista-pedidos');
    const hora = pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    const isSemMesa = mesaId === 'sem-mesa';

    // Definição de Cores e Ícones por Status
    let corStatus = '#bdc3c7';
    let icone = isSemMesa
        ? '<i class="fas fa-concierge-bell"></i>'
        : mesaId.replace('mesa-', '');

    if (pedido.statusDoPedido === 'PREPARANDO') {
        corStatus = '#f1a933';
    }

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}" style="border-left: 5px solid ${corStatus};">
            <div class="mesa-indicador" style="background: ${corStatus}; color: white; font-weight: bold;">
                ${icone}
            </div>
            <button class="btn-ver" onclick="abrirDetalhes('${mesaId}', '${pedidoId}', ${isSemMesa})">VER</button>
            <div class="info-pedido">
                <span class="horario-pedido">${hora}</span>
            </div>
        </div>
    `;

    if (!document.getElementById(`ped-${pedidoId}`)) {
        lista.innerHTML += itemHTML;
    }
}

/**
 * 4. DETALHES DO PEDIDO (MODAL) - Versão adaptada
 */
function abrirDetalhes(mesaId, pedidoId, isSemMesa) {
    const modal = document.getElementById('modal-detalhes');
    const listaContainer = document.getElementById('modal-lista-itens');

    if (isSemMesa) {
        document.getElementById('modal-mesa-titulo').innerHTML = `<i class="fas fa-bell-concierge"></i> PEDIDO SEM MESA`;
    } else {
        const numeroMesa = mesaId.replace('mesa-', '');
        document.getElementById('modal-mesa-titulo').innerText = `MESA ${numeroMesa}`;
    }

    modal.style.display = 'flex';
    listaContainer.innerHTML = '<p class="carregando">Lendo itens...</p>';

    if (monitoramentoModal) monitoramentoModal();

    monitoramentoModal = db.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId)
        .onSnapshot(doc => {
            if (!doc.exists) return fecharModal();

            const dados = doc.data();
            const itensPedido = dados.itens || [];

            let htmlModal = `
                <div class="status-container">
                    <div class="status-left">
                        <h3>DETALHES DO PEDIDO</h3>
                    </div>
                </div>
            `;

            if (isSemMesa && dados.nomeCliente) {
                htmlModal += `
                    <div style="background: #f8f9fa; color: #000; border-radius: 12px; padding: 12px; margin-bottom: 15px; border-left: 5px solid #2ecc71; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-concierge-bell" style="color: #2ecc71;"></i>
                        <div>
                            <small style="display: block; font-size: 10px; color: #666; font-weight: bold;">CLIENTE</small>
                            <strong style="text-transform: uppercase;">${dados.nomeCliente}</strong>
                        </div>
                    </div>
                `;
            }

            itensPedido.forEach(item => {
                // BUSCA A DESCRIÇÃO DIRETO DO ARRAY ALIMENTOS
                const info = alimentos.find(a => a.nome === item.nome);
                const imagem = info ? info.img : "https://via.placeholder.com/80";
                const descricaoProduto = info ? info.descricao : "Descrição não disponível";

                htmlModal += `
                    <div class="item-card-modal">
                        <div class="item-img-container">
                            <img src="${imagem}" onerror="this.src='https://via.placeholder.com/80'" alt="${item.nome}">
                        </div>
                        <div class="item-info">
                            <h4>${item.nome}</h4>
                            <div class="item-obs" style="color: #666; font-style: italic; font-size: 13px;">${descricaoProduto}</div>
                            <div class="item-price-row">
                                <span class="item-price">R$ ${item.precoUnitario ? item.precoUnitario.toFixed(2).replace('.', ',') : (item.preco ? item.preco.toFixed(2).replace('.', ',') : '0,00')}</span>
                                <span class="item-qtd-badge">${item.quantidade || 1}x</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            listaContainer.innerHTML = htmlModal;
        });
}

/**
 * 4.1 DETALHES DO PEDIDO (MODAL) - Versão para prontos agrupados
 */
function abrirDetalhesProntos(mesaId, identificador, isSemMesa) {
    const modal = document.getElementById('modal-detalhes');
    const listaContainer = document.getElementById('modal-lista-itens');

    if (isSemMesa) {
        document.getElementById('modal-mesa-titulo').innerHTML = `<i class="fas fa-bell-concierge"></i> ${identificador} - PRONTOS`;
    } else {
        document.getElementById('modal-mesa-titulo').innerText = `MESA ${identificador} - PRONTOS`;
    }

    modal.style.display = 'flex';
    listaContainer.innerHTML = '<p class="carregando">Carregando itens prontos...</p>';

    if (monitoramentoModal) monitoramentoModal();

    let query = db.collection('mesas').doc(mesaId).collection('pedidos')
        .where("statusDoPedido", "==", "PRONTO");

    if (isSemMesa) {
        query = query.where("nomeCliente", "==", identificador);
    }

    monitoramentoModal = query.onSnapshot(snapshot => {
        if (snapshot.empty) {
            listaContainer.innerHTML = '<p class="nenhum-pedido">Nenhum item pronto</p>';
            return;
        }

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

        let htmlModal = `
            <div class="TOTAL-ITENS" style="margin-bottom: 15px;">
                <span class="status-badge-green" style="font-size: 1rem; padding: 8px 20px; display: flex; align-items: center; gap: 10px; justify-content: center;">
                    ${isSemMesa ? '<i class="fas fa-bell-concierge"></i>' : '<i class="fas fa-check-double"></i>'} 
                    Total: ${totalItens} itens prontos
                </span>
            </div>
        `;

        todosItens.forEach(item => {
            // BUSCA A DESCRIÇÃO DIRETO DO ARRAY ALIMENTOS
            const info = alimentos.find(a => a.nome === item.nome);
            const imagem = info ? info.img : "img/placeholder.png";
            const descricaoProduto = info ? info.descricao : "Produto não encontrado";

            htmlModal += `
                <div class="item-card-modal">
                    <div class="item-img-container">
                        <img src="${imagem}" alt="${item.nome}">
                    </div>
                    <div class="item-info">
                        <h4>${item.nome}</h4>
                        <div class="item-obs" style="color: #666; font-style: italic; font-size: 13px;">${descricaoProduto}</div>
                        <div class="item-price-row">
                            <span class="item-price">R$ ${item.precoUnitario ? item.precoUnitario.toFixed(2).replace('.', ',') : '0,00'}</span>
                            <span class="item-qtd-badge">${item.quantidade}x</span>
                        </div>
                    </div>
                </div>
            `;
        });

        htmlModal += `
            <div class="modal-footer">
                <button class="btn-entregar-modal" onclick="entregarTodosProntos('${mesaId}', ${isSemMesa}, '${identificador}')">
                    <i class="fas fa-check"></i> CONFIRMAR ENTREGA
                </button>
            </div>
        `;

        listaContainer.innerHTML = htmlModal;
    });
}

/**
 * 5. FUNÇÃO PARA ENTREGAR TODOS OS PEDIDOS PRONTOS
 */
function entregarTodosProntos(mesaId, isSemMesa, identificador) {
    let mensagem = isSemMesa
        ? `Confirmar entrega de todos os itens de ${identificador}?`
        : `Confirmar entrega de todos os itens prontos da Mesa ${identificador}?`;

    if (confirm(mensagem)) {
        let query = db.collection('mesas').doc(mesaId).collection('pedidos')
            .where("statusDoPedido", "==", "PRONTO");

        if (isSemMesa) {
            query = query.where("nomeCliente", "==", identificador);
        }

        query.get()
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
        monitoramentoModal();
        monitoramentoModal = null;
    }
}

// Inicia na aba de Novos
document.addEventListener('DOMContentLoaded', () => alternarAba('ENVIADO'));