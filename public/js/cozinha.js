let abaAtual = 'ENVIADO';

// Função para trocar entre as abas
function alternarAba(status) {
    // Converte para maiúsculo para padronizar
    const statusUpper = status.toUpperCase();
    
    // Define a aba atual baseada no status recebido
    if (statusUpper === 'ENVIADO') {
        abaAtual = 'ENVIADO';
    } else if (statusUpper === 'PREPARANDO') {
        abaAtual = 'PREPARANDO';
    } else {
        abaAtual = statusUpper;
    }

    // Atualiza as abas (verifica se os elementos existem)
    const abaNovos = document.getElementById('aba-novos');
    const abaPreparo = document.getElementById('aba-preparo');
    
    if (abaNovos && abaPreparo) {
        abaNovos.classList.toggle('active', abaAtual === 'ENVIADO');
        abaPreparo.classList.toggle('active', abaAtual === 'PREPARANDO');
    } else {
        console.error('Elementos das abas não encontrados');
    }

    carregarPedidos();
}

function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) {
        console.error('Elemento lista-pedidos não encontrado');
        return;
    }
    
    lista.innerHTML = '<p class="msg-status">Carregando pedidos...</p>';

    // Array para controlar quantas consultas terminaram
    let consultasFinalizadas = 0;
    let totalConsultas = 0;

    // 1. CARREGAR MESAS NORMAIS
    db.collection('mesas').onSnapshot(snapshotMesas => {
        lista.innerHTML = ''; // Limpa a lista

        if (!snapshotMesas.empty) {
            totalConsultas += snapshotMesas.size;
            
            snapshotMesas.forEach(docMesa => {
                const mesaDados = docMesa.data();
                const mesaId = docMesa.id;

                // Ignora o documento "sem-mesa" aqui (vamos tratar separadamente)
                if (mesaId === 'sem-mesa') {
                    consultasFinalizadas++;
                    verificarSeTerminou();
                    return;
                }

                // Escuta os pedidos dentro de cada mesa
                db.collection('mesas').doc(mesaId).collection('pedidos')
                    .where("statusDoPedido", "==", abaAtual)
                    .onSnapshot(snapshotPedidos => {
                        
                        snapshotPedidos.forEach(docPed => {
                            const pedido = docPed.data();
                            const pedidoId = docPed.id;

                            // FILTRO: Mostra APENAS pedidos com comida
                            const temComida = pedido.itens?.some(item => item.categoria !== 'bebidas') || false;

                            if (temComida) {
                                renderizarLinhaPedido(
                                    mesaDados.numero || mesaId.replace('mesa-', ''),
                                    pedido,
                                    mesaId,
                                    pedidoId,
                                    false // isSemMesa
                                );
                            }
                        });

                        consultasFinalizadas++;
                        verificarSeTerminou();
                    });
            });
        }

        // 2. CARREGAR PEDIDOS SEM MESA
        db.collection('mesas').doc('sem-mesa').collection('pedidos')
            .where("statusDoPedido", "==", abaAtual)
            .onSnapshot(snapshotSemMesa => {
                
                if (!snapshotSemMesa.empty) {
                    snapshotSemMesa.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;

                        // FILTRO: Mostra APENAS pedidos com comida
                        const temComida = pedido.itens?.some(item => item.categoria !== 'bebidas') || false;

                        if (temComida) {
                            renderizarLinhaPedido(
                                pedido.nomeCliente || 'Cliente',
                                pedido,
                                'sem-mesa',
                                pedidoId,
                                true // isSemMesa
                            );
                        }
                    });
                }

                consultasFinalizadas++;
                verificarSeTerminou();
            });

        // Função para verificar se todas as consultas terminaram
        function verificarSeTerminou() {
            if (consultasFinalizadas >= totalConsultas + 1) { // +1 para sem-mesa
                setTimeout(() => {
                    if (lista.children.length === 0) {
                        lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PEDIDO NESTA ABA</h2>';
                    }
                }, 300);
            }
        }
    });
}

function renderizarLinhaPedido(identificador, pedido, mesaId, pedidoId, isSemMesa = false) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    // Remove a mensagem de "vazio" se ela existir
    const msgVazio = lista.querySelector('.nenhum-pedido');
    if (msgVazio) msgVazio.remove();

    // Formata o horário
    const hora = pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    // Filtra apenas itens de comida para contar
    const itensComida = pedido.itens?.filter(item => item.categoria !== 'bebidas') || [];
    const totalItensComida = itensComida.reduce((acc, item) => acc + (item.quantidade || 1), 0);

    // LÓGICA DE CORES DINÂMICAS
    let estiloMesa = '';
    let iconeHTML = '';

    if (pedido.statusDoPedido === 'PREPARANDO') {
        estiloMesa = 'background-color: #f1a933; color: #000;';
    } else if (pedido.statusDoPedido === 'ENVIADO') {
        estiloMesa = 'background-color: #e0e0e0; color: #666;';
    }

    // Define o ícone baseado no tipo de pedido
    if (isSemMesa) {
        iconeHTML = '<i class="fas fa-concierge-bell"></i>';
    } else {
        iconeHTML = identificador; // Número da mesa
    }

    // Pega o nome do cliente para passar na função
    const nomeCliente = isSemMesa ? (pedido.nomeCliente || 'Cliente') : '';

    // Verifica se já existe esse pedido na lista
    if (document.getElementById(`ped-${pedidoId}`)) {
        return; // Se já existe, não adiciona novamente
    }

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}">
            <div class="mesa-indicador" style="${estiloMesa} font-weight: bold; display: flex; align-items: center; justify-content: center;">
                ${iconeHTML}
            </div>
            <button class="btn-ver" onclick="abrirDetalhes('${mesaId}', '${pedidoId}', ${isSemMesa}, '${nomeCliente}')">VER</button>
            <div class="horario-pedido">${hora}</div>
        </div>
    `;

    lista.innerHTML += itemHTML;
}

// Função ao clicar em VER
function abrirDetalhes(mesaId, pedidoId, isSemMesa, nomeCliente = '') {
    if (isSemMesa) {
        window.location.href = `detalhes-pedido-sem-mesa.html?pedido=${pedidoId}&nomeCliente=${encodeURIComponent(nomeCliente)}`;
    } else {
        window.location.href = `detalhes-pedido.html?mesa=${mesaId}&pedido=${pedidoId}`;
    }
}

// Função de logout
function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Erro ao sair:', error);
        });
}

// Função do menu (se existir)
function toggleMenu() {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    
    if (sideMenu && overlay) {
        sideMenu.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, iniciando cozinha...');
    
    // Verifica se as abas existem
    const abaNovos = document.getElementById('aba-novos');
    const abaPreparo = document.getElementById('aba-preparo');
    
    if (abaNovos && abaPreparo) {
        // Garante que a aba correta está ativa
        abaNovos.classList.add('active');
        abaPreparo.classList.remove('active');
        
        // Carrega os pedidos
        carregarPedidos();
    } else {
        console.error('Elementos das abas não encontrados no DOMContentLoaded');
    }
});