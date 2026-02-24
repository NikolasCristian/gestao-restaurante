// js/gerente-sem-mesa.js

// Referência para a coleção de pedidos sem mesa
const pedidosSemMesaRef = db.collection("mesas").doc("sem-mesa").collection("pedidos");

// Variável para controle do modal
let unsubscribeModal = null;

// Carregar pedidos ao iniciar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarPedidosSemMesa();
    criarModal(); // Cria o modal uma vez quando a página carrega
});

/**
 * 1. CARREGAR PEDIDOS SEM MESA (APENAS NOME, BOTÃO VER E HORÁRIO)
 */
function carregarPedidosSemMesa() {
    const grid = document.getElementById('grid-lista-mesas');
    grid.innerHTML = '<p class="carregando">Carregando pedidos...</p>';

    // Listen em tempo real
    pedidosSemMesaRef
        .orderBy("horario", "desc")
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                grid.innerHTML = `
                    <div class="nenhum-pedido" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                        <h3>Nenhum pedido sem mesa encontrado</h3>
                    </div>
                `;
                return;
            }

            grid.innerHTML = ''; // Limpa o grid

            snapshot.forEach(doc => {
                const pedido = doc.data();
                const pedidoId = doc.id;
                
                renderizarCardSimples(pedido, pedidoId);
            });
        });
}

/**
 * 2. RENDERIZAR CARD SIMPLES (SÓ NOME, BOTÃO VER E HORÁRIO)
 */
function renderizarCardSimples(pedido, pedidoId) {
    const grid = document.getElementById('grid-lista-mesas');
    
    // Formatar horário
    const horario = pedido.horario 
        ? new Date(pedido.horario.toMillis()).toLocaleString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          })
        : '--:--';

    // Criar card simples
    const card = document.createElement('div');
    card.className = 'card-pedido-simples';
    card.id = `pedido-${pedidoId}`;
    
    card.innerHTML = `
        <div class="pedido-info">
            <div class="pedido-nome">
                <i class="fas fa-user"></i>
                <strong class="nome">${pedido.nomeCliente || 'Cliente não identificado'}</strong>
            </div>
            <div class="pedido-horario">
                <i class="fas fa-clock"></i>
                ${horario}
            </div>
        </div>
        <button class="btn-ver-pedido" onclick="abrirModalPedido('${pedidoId}')">
            VER
        </button>
    `;

    grid.appendChild(card);
}

/**
 * 3. CRIAR MODAL (CHAMADO UMA VEZ NO CARREGAMENTO DA PÁGINA)
 */
function criarModal() {
    // Verifica se o modal já existe
    if (document.getElementById('modal-pedido')) {
        return;
    }

    const modalHTML = `
        <div id="modal-pedido" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: #e0e0e0; width: 90%; max-width: 400px; border-radius: 30px; max-height: 85vh; overflow-y: auto;">
                
                <!-- Cabeçalho do Modal -->
                <div style="background: #000; color: #fff; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 20px 20px 0 0;">
                    <h2 style="color: #fff; margin: 0; font-family: 'Arial Black'; font-size: 1.2rem;" id="modal-titulo">DETALHES DO PEDIDO</h2>
                    <button onclick="fecharModal()" style="background: none; border: none; color: #fff; font-size: 28px; cursor: pointer;">&times;</button>
                </div>
                
                <!-- Corpo do Modal -->
                <div id="modal-conteudo" style="padding: 20px;">
                    <!-- Conteúdo será inserido aqui -->
                </div>
                
                <!-- Botões -->
                <div style="padding: 0 20px 20px 20px; display: flex; gap: 10px;">
                    <button id="btn-excluir-modal" class="btn-excluir-modal" style="flex: 1; background: #ff4444; color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 900; cursor: pointer;">
                        <i class="fas fa-trash"></i> EXCLUIR
                    </button>
                    <button onclick="fecharModal()" class="btn-voltar-modal" style="flex: 1; background: #000; color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 900; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> VOLTAR
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * 4. ABRIR MODAL COM DETALHES DO PEDIDO
 */
function abrirModalPedido(pedidoId) {
    // Limpar listener anterior se existir
    if (unsubscribeModal) unsubscribeModal();

    const modal = document.getElementById('modal-pedido');
    modal.style.display = 'flex';
    
    const conteudo = document.getElementById('modal-conteudo');
    conteudo.innerHTML = '<p class="carregando">Carregando detalhes...</p>';

    // Listener em tempo real para o pedido específico
    unsubscribeModal = pedidosSemMesaRef.doc(pedidoId)
        .onSnapshot(doc => {
            if (!doc.exists) {
                fecharModal();
                alert("Pedido não encontrado!");
                return;
            }

            const pedido = doc.data();
            renderizarDetalhesPedido(pedido, pedidoId);
        });
}

/**
 * 5. RENDERIZAR DETALHES DO PEDIDO NO MODAL
 */
function renderizarDetalhesPedido(pedido, pedidoId) {
    const conteudo = document.getElementById('modal-conteudo');
    document.getElementById('modal-titulo').innerText = `PEDIDO DE ${pedido.nomeCliente || 'CLIENTE'}`;
    
    // Formatar horário completo
    const horario = pedido.horario 
        ? new Date(pedido.horario.toMillis()).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        : 'Data não disponível';

    // Calcular totais
    const totalItens = pedido.itens?.reduce((acc, item) => acc + (item.quantidade || 1), 0) || 0;
    const totalPedido = pedido.totalDoPedido || 0;

    // Status com cor
    let corStatus = '#bdc3c7';
    const status = pedido.statusDoPedido || 'ENVIADO';
    if (status === 'PREPARANDO') corStatus = '#f1a933';
    if (status === 'PRONTO') corStatus = '#2ecc71';
    if (status === 'ENTREGUE') corStatus = '#95a5a6';

    let html = `
        <!-- INFORMAÇÕES DO CLIENTE -->
        <div style="background: #fff; border-radius: 15px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-user" style="font-size: 20px; background: #000; color: #fff; padding: 10px; border-radius: 50%;"></i>
                <div>
                    <div style="font-size: 0.8rem; color: #666;">Cliente</div>
                    <strong style="font-size: 1.1rem;  color: #000000;">${pedido.nomeCliente || 'Não identificado'}</strong>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-clock" style="font-size: 20px; background: #000; color: #fff; padding: 10px; border-radius: 50%;"></i>
                <div>
                    <div style="font-size: 0.8rem; color: #666;">Horário do Pedido</div>
                    <strong style="color: #000000;">${horario}</strong>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-tag" style="font-size: 20px; background: #000; color: #fff; padding: 10px; border-radius: 50%;"></i>
                <div>
                    <div style="font-size: 0.8rem; color: #666;">Status</div>
                    <span style="background: ${corStatus}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block;">
                        ${status}
                    </span>
                </div>
            </div>
        </div>

        <!-- RESUMO DO PEDIDO -->
        <div style="background: #fff; border-radius: 15px; padding: 15px; margin-bottom: 15px;">
            <h4 style="font-family: 'Arial Black'; margin: 0 0 15px 0; display: flex; justify-content: space-between; color: #000000;">
                ITENS DO PEDIDO
                <span style="background: #000; color: #fff; padding: 3px 10px; border-radius: 15px; font-size: 0.8rem;">
                    ${totalItens} itens
                </span>
            </h4>
            
            <div style="max-height: 200px; overflow-y: auto;">
    `;

    // Listar itens
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; color: #000000;">
                    <div>
                        <strong>${item.quantidade}x</strong> ${item.nome}
                    </div>
                    <div style="font-weight: 900;">
                        R$ ${(item.subtotal || 0).toFixed(2).replace('.', ',')}
                    </div>
                </div>
            `;
        });
    } else {
        html += `<p style="text-align: center; color: #666;">Nenhum item no pedido</p>`;
    }

    html += `
            </div>
        </div>

        <!-- TOTAL -->
        <div style="background: #000; color: #fff; border-radius: 15px; padding: 15px; text-align: center;">
            <div style="font-size: 0.9rem;">TOTAL DO PEDIDO</div>
            <div style="font-size: 1.8rem; font-weight: 900;">R$ ${totalPedido.toFixed(2).replace('.', ',')}</div>
        </div>
    `;

    conteudo.innerHTML = html;

    // Atualizar o botão de excluir com o ID correto
    const btnExcluir = document.getElementById('btn-excluir-modal');
    if (btnExcluir) {
        btnExcluir.setAttribute('onclick', `excluirPedido('${pedidoId}')`);
    }
}

/**
 * 6. EXCLUIR PEDIDO
 */
function excluirPedido(pedidoId) {
    if (confirm("Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita!")) {
        pedidosSemMesaRef.doc(pedidoId).delete()
        .then(() => {
            alert("Pedido excluído com sucesso!");
            fecharModal();
        })
        .catch(error => {
            console.error("Erro ao excluir pedido:", error);
            alert("Erro ao excluir pedido");
        });
    }
}

/**
 * 7. FECHAR MODAL
 */
function fecharModal() {
    const modal = document.getElementById('modal-pedido');
    if (modal) {
        modal.style.display = 'none';
    }
    if (unsubscribeModal) {
        unsubscribeModal();
        unsubscribeModal = null;
    }
}
/**
 * 8. FUNÇÃO DE BUSCAR PEDIDOS POR NOME OU HORÁRIO
 */
function buscarPedidos() {
    const termoBusca = document.getElementById('num-mesa').value.trim().toLowerCase();
    const grid = document.getElementById('grid-lista-mesas');
    
    grid.innerHTML = '<p class="carregando">Buscando pedidos...</p>';

    // Se o campo estiver vazio, carrega todos os pedidos
    if (termoBusca === '') {
        carregarPedidosSemMesa();
        return;
    }

    // Busca em tempo real com filtro
    pedidosSemMesaRef
        .orderBy("horario", "desc")
        .onSnapshot(snapshot => {
            const pedidosFiltrados = [];
            
            snapshot.forEach(doc => {
                const pedido = doc.data();
                const pedidoId = doc.id;
                
                // Formatar horário para comparação
                let horarioFormatado = '';
                if (pedido.horario) {
                    const data = new Date(pedido.horario.toMillis());
                    horarioFormatado = data.toLocaleString('pt-BR').toLowerCase();
                }
                
                // Verificar se o termo de busca está no nome do cliente OU no horário
                const nomeCliente = (pedido.nomeCliente || '').toLowerCase();
                const horario = horarioFormatado;
                
                if (nomeCliente.includes(termoBusca) || horario.includes(termoBusca)) {
                    pedidosFiltrados.push({ pedido, pedidoId });
                }
            });

            if (pedidosFiltrados.length === 0) {
                grid.innerHTML = `
                    <div class="nenhum-pedido" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                        <h3>Nenhum pedido encontrado para "${termoBusca}"</h3>
                    </div>
                `;
                return;
            }

            grid.innerHTML = ''; // Limpa o grid

            pedidosFiltrados.forEach(({ pedido, pedidoId }) => {
                renderizarCardSimples(pedido, pedidoId);
            });
        });
}

/**
 * 9. CONFIGURAR EVENTO DE BUSCA
 */
function configurarBusca() {
    const inputBusca = document.getElementById('num-mesa');
    const form = document.getElementById('form-add-mesa');
    
    if (inputBusca) {
        // Busca enquanto digita (com debounce para não sobrecarregar)
        let timeoutId;
        inputBusca.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                buscarPedidos();
            }, 500); // Espera 500ms após parar de digitar
        });
    }
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Previne o reload da página
            buscarPedidos();
        });
    }
}

// Chamar a configuração da busca quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    carregarPedidosSemMesa();
    criarModal();
    configurarBusca(); // Adiciona esta linha
});