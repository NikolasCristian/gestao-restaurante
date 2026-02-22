let abaAtual = 'ENVIADO';
let monitoramentoModal = null; // Armazena o listener ativo do modal

function alternarAba(status) {
    if (status.toUpperCase() === 'PRONTOS') {
        abaAtual = 'PRONTO';
    } else {
        abaAtual = status.toUpperCase();
    }

    document.getElementById('aba-novos').classList.toggle('active', abaAtual === 'ENVIADO');
    document.getElementById('aba-preparo').classList.toggle('active', abaAtual === 'PREPARANDO');
    document.getElementById('aba-prontos').classList.toggle('active', abaAtual === 'PRONTO');

    carregarPedidos();
}

function alternarAba(status) {
    // Normaliza os nomes para o padrão do Banco de Dados
    if (status.toUpperCase() === 'PRONTOS' || status.toUpperCase() === 'PRONTO') {
        abaAtual = 'PRONTO';
    } else if (status.toUpperCase() === 'PREPARANDO') {
        abaAtual = 'PREPARANDO';
    } else {
        abaAtual = 'ENVIADO';
    }

    // Gerenciamento visual: Remove 'active' de todos e coloca só no clicado
    document.querySelectorAll('.aba-item').forEach(btn => btn.classList.remove('active'));

    // Procura o botão correto para ativar (baseado no texto ou ID corrigido)
    if (abaAtual === 'ENVIADO') document.getElementById('aba-novos').classList.add('active');
    if (abaAtual === 'PREPARANDO') document.getElementById('aba-preparo').classList.add('active');
    if (abaAtual === 'PRONTO') document.getElementById('aba-prontos').classList.add('active');

    console.log("Mudando para aba:", abaAtual);
    carregarPedidos(); // Recarrega a lista filtrando pelo novo abaAtual
}

function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '<p class="msg-status">Buscando ' + abaAtual + '...</p>';

    // snapshotMesas mantém a escuta nas mesas
    db.collection('mesas').onSnapshot(snapshotMesas => {
        // Importante: Não limpamos a lista aqui dentro se houver múltiplos onSnapshots ativos
        // Mas como filtramos por status, vamos gerenciar o conteúdo:
        let temPedidoNestaAba = false;

        // Criar um container temporário ou gerenciar IDs para não duplicar
        lista.innerHTML = '';

        snapshotMesas.forEach(docMesa => {
            const mesaDados = docMesa.data();
            const mesaId = docMesa.id;

            db.collection('mesas').doc(mesaId).collection('pedidos')
                .where("statusDoPedido", "==", abaAtual) // Filtro direto do Firebase (mais rápido)
                .onSnapshot(snapshotPedidos => {

                    snapshotPedidos.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;
                        renderizarLinhaPedido(mesaDados.numero, pedido, mesaId, pedidoId);
                        temPedidoNestaAba = true;
                    });

                    // Se após percorrer tudo não achar nada
                    setTimeout(() => {
                        if (!lista.querySelector('.item-pedido-lista')) {
                            lista.innerHTML = `<h2 class="nenhum-pedido">NÃO HÁ PEDIDOS ${abaAtual}</h2>`;
                        }
                    }, 500);
                });
        });
    });
}

function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '<p class="msg-status">Carregando pedidos...</p>';

    db.collection('mesas').onSnapshot(snapshotMesas => {
        lista.innerHTML = '';
        if (snapshotMesas.empty) {
            lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PEDIDO</h2>';
            return;
        }

        snapshotMesas.forEach(docMesa => {
            const mesaDados = docMesa.data();
            const mesaId = docMesa.id;

            db.collection('mesas').doc(mesaId).collection('pedidos')
                .onSnapshot(snapshotPedidos => {
                    snapshotPedidos.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;

                        if (pedido.statusDoPedido === abaAtual) {
                            renderizarLinhaPedido(mesaDados.numero, pedido, mesaId, pedidoId);
                        }
                    });

                    setTimeout(() => {
                        if (!lista.querySelector('.item-pedido-lista')) {
                            lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PEDIDO</h2>';
                        }
                    }, 300);
                });
        });
    });
}

function renderizarLinhaPedido(numeroMesa, pedido, mesaId, pedidoId) {
    const lista = document.getElementById('lista-pedidos');
    const hora = pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    let estiloMesa = '';
    let iconeEspecial = numeroMesa;

    if (pedido.statusDoPedido === 'PREPARANDO') {
        estiloMesa = 'background-color: #f1a933; color: #000;';
    } else if (pedido.statusDoPedido === 'ENVIADO') {
        estiloMesa = 'background-color: #e0e0e0; color: #666;';
    } else if (pedido.statusDoPedido === 'PRONTO') {
        estiloMesa = 'background-color: #2ecc71; color: #fff;';
        iconeEspecial = '<i class="fas fa-bell"></i>';
    }

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}">
            <div class="mesa-indicador" style="${estiloMesa} font-weight: bold; display: flex; align-items: center; justify-content: center;">
                ${iconeEspecial}
            </div>
            <button class="btn-ver" onclick="abrirDetalhes('${mesaId}', '${pedidoId}', '${numeroMesa}')">VER</button>
            <div class="horario-pedido">${hora}</div>
        </div>
    `;

    if (!document.getElementById(`ped-${pedidoId}`)) {
        lista.innerHTML += itemHTML;
    }
}

/**
 * LÓGICA DO MODAL (VISUALIZAÇÃO EM TEMPO REAL)
 */
function abrirDetalhes(mesaId, pedidoId, numeroMesa) {
    const modal = document.getElementById('modal-detalhes');
    const listaContainer = document.getElementById('modal-lista-itens');
    document.getElementById('modal-mesa-titulo').innerText = `Mesa ${numeroMesa}`;

    modal.style.display = 'flex';
    listaContainer.innerHTML = '<p class="carregando">Carregando itens...</p>';

    if (monitoramentoModal) monitoramentoModal();

    monitoramentoModal = db.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId)
        .onSnapshot(doc => {
            if (!doc.exists) return fecharModal();

            const itensPedido = doc.data().itens || [];

            // Mapeia os itens para garantir que temos todas as informações (Preço, Descrição, Imagem)
            listaContainer.innerHTML = `
                <h3 style="margin: 0 0 15px 5px; font-weight: 900; font-size: 1.1rem;">PEDIDOS</h3>
                ${itensPedido.map(itemPedido => {
                // Busca os dados completos no seu array local 'alimentos' pelo nome ou id
                const infoCompleta = alimentos.find(a => a.nome === itemPedido.nome);

                const preco = infoCompleta ? infoCompleta.preco.toFixed(2) : "0.00";
                const descricao = infoCompleta ? infoCompleta.descricao : (itemPedido.observacao || "Sem descrição");
                const imagem = infoCompleta ? infoCompleta.img : "img/placeholder.png";

                return `
                        <div class="item-card-modal">
                            <div class="item-img-container">
                                <img src="${imagem}" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=Lanche';">
                            </div>
                            <div class="item-info">
                                <h4>${itemPedido.nome}</h4>
                                <p class="item-obs">${descricao}</p>
                                <div class="item-price-row">
                                    <span class="item-price">R$ ${preco}</span>
                                    <span class="item-qtd-badge">${itemPedido.quantidade}</span>
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
        monitoramentoModal(); // Para de gastar dados do Firebase ao fechar
        monitoramentoModal = null;
    }
}
// Inicia
carregarPedidos();