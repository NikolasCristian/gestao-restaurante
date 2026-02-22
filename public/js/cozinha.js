let abaAtual = 'ENVIADO';

// Função para trocar entre as abas NOVOS e EM PREPARO
function alternarAba(status) {
    abaAtual = status.toUpperCase();

    document.getElementById('aba-novos').classList.toggle('active', abaAtual === 'ENVIADO');
    document.getElementById('aba-preparo').classList.toggle('active', abaAtual === 'PREPARANDO');

    carregarPedidos();
}

function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '<p class="msg-status">Carregando pedidos...</p>';

    // Escuta a coleção de mesas em tempo real
    db.collection('mesas').onSnapshot(snapshotMesas => {
        let totalExibido = 0;
        const pedidosParaMostrar = [];

        // Primeiro, limpamos a lista interna para processar os dados novos
        lista.innerHTML = '';

        // Se não houver mesas cadastradas
        if (snapshotMesas.empty) {
            lista.innerHTML = '<p class="msg-empty">Nenhum pedido encontrado.</p>';
            return;
        }

        snapshotMesas.forEach(docMesa => {
            const mesaDados = docMesa.data();
            const mesaId = docMesa.id;

            // Escuta os pedidos dentro de cada mesa
            db.collection('mesas').doc(mesaId).collection('pedidos')
                .onSnapshot(snapshotPedidos => {

                    snapshotPedidos.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;

                        // Filtra pelo status da aba
                        if (pedido.statusDoPedido === abaAtual) {
                            renderizarLinhaPedido(mesaDados.numero, pedido, mesaId, pedidoId);
                            totalExibido++;
                        }
                    });

                    // Verifica se após percorrer tudo a lista continua vazia
                    // Usamos um pequeno delay para garantir que todos os snapshots de subcoleções responderam
                    setTimeout(() => {
                        if (lista.innerHTML === '') {
                            lista.innerHTML = '<p class="msg-empty">Nenhum pedido nesta aba.</p>';
                        }
                    }, 500);
                });
        });
    });
}

function renderizarLinhaPedido(numeroMesa, pedido, mesaId, pedidoId) {
    const lista = document.getElementById('lista-pedidos');

    // Remove a mensagem de "vazio" se ela existir antes de adicionar um item
    const msgVazio = lista.querySelector('.msg-empty');
    if (msgVazio) msgVazio.remove();

    const hora = pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    let estiloMesa = '';
    if (pedido.statusDoPedido === 'PREPARANDO') {
        estiloMesa = 'background-color: #f1a933; color: #000;';
    } else if (pedido.statusDoPedido === 'ENVIADO') {
        estiloMesa = 'background-color: #e0e0e0; color: #666;';
    }

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}">
            <div class="mesa-indicador" style="${estiloMesa} font-weight: bold;">
                ${numeroMesa}
            </div>
            <button class="btn-ver" onclick="abrirDetalhes('${mesaId}', '${pedidoId}')">VER</button>
            <div class="horario-pedido">${hora}</div>
        </div>
    `;

    if (!document.getElementById(`ped-${pedidoId}`)) {
        lista.innerHTML += itemHTML;
    }
}

function abrirDetalhes(mesaId, pedidoId) {
    window.location.href = `detalhes-pedido.html?mesa=${mesaId}&pedido=${pedidoId}`;
}

// Inicializa a página
carregarPedidos();

function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');

    // Mostra um carregando inicial
    lista.innerHTML = '<p class="msg-status">Carregando...</p>';

    // Escuta a coleção de mesas
    db.collection('mesas').onSnapshot(snapshotMesas => {
        // Limpamos a lista para reconstruir do zero a cada mudança no banco
        lista.innerHTML = '';
        let encontrouPedidos = false;
        let totalMesasProcessadas = 0;

        if (snapshotMesas.empty) {
            lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PEDIDO</h2>';
            return;
        }

        snapshotMesas.forEach(docMesa => {
            const mesaDados = docMesa.data();
            const mesaId = docMesa.id;

            // Escuta os pedidos dentro de cada mesa
            db.collection('mesas').doc(mesaId).collection('pedidos')
                .onSnapshot(snapshotPedidos => {
                    totalMesasProcessadas++;

                    snapshotPedidos.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;

                        // Filtra pelo status da aba atual (ENVIADO ou PREPARANDO)
                        if (pedido.statusDoPedido === abaAtual) {
                            renderizarLinhaPedido(mesaDados.numero, pedido, mesaId, pedidoId);
                            encontrouPedidos = true;
                        }
                    });

                    // Após checar as mesas, se não houver nenhum item na lista, mostra a frase
                    // O timeout ajuda a esperar o retorno de todas as subcoleções
                    setTimeout(() => {
                        const temItens = lista.querySelector('.item-pedido-lista');
                        if (!temItens) {
                            lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PEDIDO</h2>';
                        }
                    }, 300);
                });
        });
    });
}

// Função ao clicar em VER - Agora redireciona para uma nova página
function abrirDetalhes(mesaId, pedidoId) {
    // Redireciona passando o ID da mesa e do pedido como parâmetros
    window.location.href = `detalhes-pedido.html?mesa=${mesaId}&pedido=${pedidoId}`;
}

async function mudarStatus(mesaId, pedidoId, novoStatus) {
    try {
        await db.collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId).update({
            statusDoPedido: novoStatus
        });
        fecharModalDetalhes();
        alert("Status atualizado!");
    } catch (e) {
        console.error(e);
    }
}

function fecharModalDetalhes() {
    document.getElementById('modal-detalhes').style.display = 'none';
}

function renderizarLinhaPedido(numeroMesa, pedido, mesaId, pedidoId) {
    const lista = document.getElementById('lista-pedidos');

    // Formata o horário (ex: 20:10)
    const hora = pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    // LÓGICA DE CORES DINÂMICAS:
    let estiloMesa = '';

    if (pedido.statusDoPedido === 'PREPARANDO') {
        // Amarelo Burger King para Em Preparo
        estiloMesa = 'background-color: #f1a933; color: #000;';
    } else if (pedido.statusDoPedido === 'ENVIADO') {
        // Cinza para Novos (Enviados)
        estiloMesa = 'background-color: #e0e0e0; color: #666;';
    }

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}">
            <div class="mesa-indicador" style="${estiloMesa} font-weight: bold;">
                ${numeroMesa}
            </div>
            <button class="btn-ver" onclick="abrirDetalhes('${mesaId}', '${pedidoId}')">VER</button>
            <div class="horario-pedido">${hora}</div>
        </div>
    `;

    // Evita duplicados na tela
    if (!document.getElementById(`ped-${pedidoId}`)) {
        lista.innerHTML += itemHTML;
    }
}
// Inicializa a página
carregarPedidos();