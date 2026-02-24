/**
 * ====================================================
 * PAGAMENTO.JS - SISTEMA DE GESTÃO DE PAGAMENTOS
 * ====================================================
 * 
 * Este arquivo gerencia a visualização e processamento de pagamentos
 * para mesas normais e pedidos sem mesa.
 * 
 * Funcionalidades:
 * - Abas de PENDENTES e PAGOS
 * - Agrupamento de pedidos por mesa ou cliente
 * - Modal de detalhes com todos os itens
 * - Confirmação de pagamento em lote
 * 
 * Autor: Sistema de Gestão de Restaurante
 * Data: 2024
 * ====================================================
 */

'use strict';

// ====================================================
// CONFIGURAÇÕES GLOBAIS
// ====================================================

/** @type {string} Aba atual (PENDENTES ou PAGOS) */
let abaAtual = 'PENDENTES';

/** @type {string|null} ID do grupo atualmente aberto no modal */
let grupoModalAberto = null;

/** @type {Object} Placeholder para imagens que não carregam */
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' font-size='12' text-anchor='middle' dy='.3em' fill='%23666' font-family='Arial'%3ESem%20Imagem%3C/text%3E%3C/svg%3E";

// ====================================================
// INICIALIZAÇÃO
// ====================================================

/**
 * Inicializa a página quando o DOM é carregado
 * @listens DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Inicializando página de pagamentos...');
    inicializarAbas();
    carregarPedidos();
});

/**
 * Configura o estado inicial das abas
 */
function inicializarAbas() {
    const abaPendentes = document.getElementById('aba-novos');
    const abaPagos = document.getElementById('aba-preparo');
    
    if (abaPendentes && abaPagos) {
        abaPendentes.classList.add('active');
        abaPagos.classList.remove('active');
    } else {
        console.error('❌ Elementos das abas não encontrados no DOM');
    }
}

// ====================================================
// GERENCIAMENTO DE ABAS
// ====================================================

/**
 * Alterna entre as abas de pendentes e pagos
 * @param {string} status - Status selecionado ('PENDENTES' ou 'PAGOS')
 */
function alternarAba(status) {
    const statusUpper = status.toUpperCase();
    
    // Define a aba atual
    abaAtual = statusUpper === 'PAGOS' ? 'PAGOS' : 'PENDENTES';

    // Atualiza visual das abas
    const abaPendentes = document.getElementById('aba-novos');
    const abaPagos = document.getElementById('aba-preparo');
    
    if (abaPendentes && abaPagos) {
        abaPendentes.classList.toggle('active', abaAtual === 'PENDENTES');
        abaPagos.classList.toggle('active', abaAtual === 'PAGOS');
    }

    // Recarrega os pedidos
    carregarPedidos();
}

// ====================================================
// CARREGAMENTO DE PEDIDOS
// ====================================================

/**
 * Carrega e agrupa todos os pedidos de acordo com a aba atual
 */
function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) {
        console.error('❌ Elemento lista-pedidos não encontrado');
        return;
    }
    
    lista.innerHTML = '<p class="msg-status">Carregando pedidos...</p>';

    let consultasFinalizadas = 0;
    let totalConsultas = 0;
    
    /** @type {Object} Armazena os grupos de pedidos (por mesa ou cliente) */
    const grupos = {};

    // 1. CARREGAR MESAS NORMAIS
    db.collection('mesas').onSnapshot(snapshotMesas => {
        lista.innerHTML = '';

        if (!snapshotMesas.empty) {
            totalConsultas += snapshotMesas.size;
            
            snapshotMesas.forEach(docMesa => {
                const mesaDados = docMesa.data();
                const mesaId = docMesa.id;

                // Ignora o documento "sem-mesa" (será tratado separadamente)
                if (mesaId === 'sem-mesa') {
                    consultasFinalizadas++;
                    verificarSeTerminou();
                    return;
                }

                const statusFiltro = abaAtual === 'PAGOS' ? 'PAGO' : 'ProcessoDePagamento';

                // Busca pedidos da mesa com o status correspondente
                db.collection('mesas').doc(mesaId).collection('pedidos')
                    .where("statusDoPedido", "==", statusFiltro)
                    .onSnapshot(snapshotPedidos => {
                        
                        snapshotPedidos.forEach(docPed => {
                            const pedido = docPed.data();
                            const pedidoId = docPed.id;
                            
                            // Agrupa por ID da mesa
                            const chaveGrupo = mesaId;
                            
                            if (!grupos[chaveGrupo]) {
                                grupos[chaveGrupo] = criarGrupoMesa(mesaId, mesaDados);
                            }
                            
                            adicionarPedidoAoGrupo(grupos[chaveGrupo], pedidoId, pedido);
                        });

                        consultasFinalizadas++;
                        verificarSeTerminou();
                    });
            });
        }

        // 2. CARREGAR PEDIDOS SEM MESA (agrupados por cliente)
        db.collection('mesas').doc('sem-mesa').collection('pedidos')
            .where("statusDoPedido", "==", abaAtual === 'PAGOS' ? 'PAGO' : 'ProcessoDePagamento')
            .onSnapshot(snapshotSemMesa => {
                
                if (!snapshotSemMesa.empty) {
                    snapshotSemMesa.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;
                        
                        // Agrupa por nome do cliente
                        const nomeCliente = pedido.nomeCliente || 'Cliente não identificado';
                        const chaveGrupo = `sem-mesa-${nomeCliente}`;
                        
                        if (!grupos[chaveGrupo]) {
                            grupos[chaveGrupo] = criarGrupoCliente(nomeCliente);
                        }
                        
                        adicionarPedidoAoGrupo(grupos[chaveGrupo], pedidoId, pedido);
                    });
                }

                consultasFinalizadas++;
                verificarSeTerminou();
            });

        // ====================================================
        // FUNÇÕES AUXILIARES DE AGRUPAMENTO
        // ====================================================
        
        /**
         * Verifica se todas as consultas foram finalizadas e renderiza
         */
        function verificarSeTerminou() {
            if (consultasFinalizadas >= totalConsultas + 1) { // +1 para sem-mesa
                renderizarGrupos(grupos);
            }
        }
    });
}

/**
 * Cria um novo grupo para uma mesa normal
 * @param {string} mesaId - ID da mesa
 * @param {Object} mesaDados - Dados da mesa
 * @returns {Object} Grupo da mesa
 */
function criarGrupoMesa(mesaId, mesaDados) {
    return {
        id: mesaId,
        tipo: 'mesa',
        identificador: mesaDados.numero || mesaId.replace('mesa-', ''),
        pedidos: [],
        totalItens: 0,
        totalValor: 0,
        horarioMaisRecente: null
    };
}

/**
 * Cria um novo grupo para um cliente (sem mesa)
 * @param {string} nomeCliente - Nome do cliente
 * @returns {Object} Grupo do cliente
 */
function criarGrupoCliente(nomeCliente) {
    return {
        id: `sem-mesa-${nomeCliente}`,
        tipo: 'sem-mesa',
        identificador: nomeCliente,
        pedidos: [],
        totalItens: 0,
        totalValor: 0,
        horarioMaisRecente: null
    };
}

/**
 * Adiciona um pedido a um grupo existente
 * @param {Object} grupo - Grupo alvo
 * @param {string} pedidoId - ID do pedido
 * @param {Object} pedido - Dados do pedido
 */
function adicionarPedidoAoGrupo(grupo, pedidoId, pedido) {
    grupo.pedidos.push({
        id: pedidoId,
        dados: pedido
    });
    
    const itensPedido = pedido.itens || [];
    const totalItensPedido = itensPedido.reduce((acc, item) => acc + (item.quantidade || 1), 0);
    
    grupo.totalItens += totalItensPedido;
    grupo.totalValor += pedido.totalDoPedido || 0;
    
    if (pedido.horario) {
        const horarioMillis = pedido.horario.toMillis();
        if (!grupo.horarioMaisRecente || horarioMillis > grupo.horarioMaisRecente) {
            grupo.horarioMaisRecente = horarioMillis;
        }
    }
}

// ====================================================
// RENDERIZAÇÃO DA LISTA
// ====================================================

/**
 * Renderiza os grupos de pedidos na lista principal
 * @param {Object} grupos - Objeto com todos os grupos
 */
function renderizarGrupos(grupos) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const gruposArray = Object.values(grupos);
    
    if (gruposArray.length === 0) {
        lista.innerHTML = `<h2 class="nenhum-pedido">NADA EM ${abaAtual}</h2>`;
        return;
    }
    
    gruposArray.forEach(grupo => {
        const hora = grupo.horarioMaisRecente
            ? new Date(grupo.horarioMaisRecente).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        
        const isSemMesa = grupo.tipo === 'sem-mesa';
        const iconeHTML = isSemMesa 
            ? '<i class="fas fa-concierge-bell"></i>' 
            : grupo.identificador;
        
        const corStatus = abaAtual === 'PAGOS' ? '#2ecc71' : '#f1a933';
        const textoStatus = abaAtual === 'PAGOS' ? 'PAGO' : 'PENDENTE';
        
        const itemHTML = `
            <div class="item-pedido-lista" id="grupo-${grupo.id}" style="border-left: 5px solid ${corStatus};" onclick="abrirModalPagamento('${grupo.id}')">
                <div class="mesa-indicador" style="background: ${corStatus}; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                    ${iconeHTML}
                </div>
                <div class="info-pedido" style="flex: 1; margin-left: 15px;">
                    <strong>${isSemMesa ? grupo.identificador : 'Mesa ' + grupo.identificador}</strong>
                    <span style="font-size: 0.8rem; color: #666; display: block;">
                        ${grupo.pedidos.length} pedido(s) · ${grupo.totalItens} itens · ${textoStatus}
                    </span>
                    <span style="font-size: 0.9rem; color: #000; font-weight: 900; display: block;">
                        R$ ${formatarMoeda(grupo.totalValor)}
                    </span>
                </div>
                <div class="horario-pedido">${hora}</div>
                ${abaAtual === 'PENDENTES' 
                    ? `<button class="btn-ver" onclick="event.stopPropagation(); abrirModalPagamento('${grupo.id}')">DETALHES</button>` 
                    : `<button class="btn-ver" style="background: #95a5a6; box-shadow: 0 4px 0 #7f8c8d;" disabled>PAGO</button>`
                }
            </div>
        `;
        
        lista.innerHTML += itemHTML;
    });
}

// ====================================================
// MODAL DE PAGAMENTO
// ====================================================

/**
 * Abre o modal com os detalhes do grupo selecionado
 * @param {string} grupoId - ID do grupo
 */
function abrirModalPagamento(grupoId) {
    grupoModalAberto = grupoId;
    
    let modal = document.getElementById('modal-pagamento');
    if (!modal) {
        modal = criarModalPagamento();
    }
    
    modal.style.display = 'flex';
    carregarDetalhesGrupo(grupoId);
}

/**
 * Cria o modal de pagamento se ele não existir
 * @returns {HTMLElement} Elemento do modal
 */
function criarModalPagamento() {
    const modalHTML = `
        <div id="modal-pagamento" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="header-modal" style="background: #000; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 id="modal-titulo" style="color: #fff; font-family: 'Arial Black'; margin: 0;">DETALHES DO PAGAMENTO</h3>
                    <button onclick="fecharModalPagamento()" style="background: none; border: none; color: #fff; font-size: 28px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" id="modal-corpo" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                    Carregando...
                </div>
                <div class="modal-footer" style="padding: 20px; display: flex; gap: 10px;">
                    <button id="btn-confirmar-pagamento" class="btn-finalizar" style="flex: 2;" onclick="confirmarPagamentoGrupo()">CONFIRMAR PAGAMENTO</button>
                    <button class="btn-voltar-modal" style="flex: 1;" onclick="fecharModalPagamento()">FECHAR</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('modal-pagamento');
}

/**
 * Carrega os detalhes do grupo no modal
 * @param {string} grupoId - ID do grupo
 */
function carregarDetalhesGrupo(grupoId) {
    const modalCorpo = document.getElementById('modal-corpo');
    const modalTitulo = document.getElementById('modal-titulo');
    
    if (!modalCorpo || !modalTitulo) return;
    
    modalCorpo.innerHTML = '<p style="text-align: center;">Carregando detalhes...</p>';
    
    const isSemMesa = grupoId.startsWith('sem-mesa-');
    let query;
    
    if (isSemMesa) {
        const nomeCliente = grupoId.replace('sem-mesa-', '');
        modalTitulo.innerText = `Cliente: ${nomeCliente}`;
        
        query = db.collection('mesas').doc('sem-mesa').collection('pedidos')
            .where("nomeCliente", "==", nomeCliente)
            .where("statusDoPedido", "==", "ProcessoDePagamento");
    } else {
        const numeroMesa = grupoId.replace('mesa-', '');
        modalTitulo.innerText = `Mesa ${numeroMesa}`;
        
        query = db.collection('mesas').doc(grupoId).collection('pedidos')
            .where("statusDoPedido", "==", "ProcessoDePagamento");
    }
    
    query.get()
        .then(snapshot => processarDetalhesGrupo(snapshot, modalCorpo, grupoId))
        .catch(error => {
            console.error('❌ Erro ao carregar detalhes:', error);
            modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
        });
}

/**
 * Processa e renderiza os detalhes do grupo no modal
 * @param {QuerySnapshot} snapshot - Snapshot do Firestore
 * @param {HTMLElement} modalCorpo - Elemento do corpo do modal
 * @param {string} grupoId - ID do grupo
 */
function processarDetalhesGrupo(snapshot, modalCorpo, grupoId) {
    if (snapshot.empty) {
        modalCorpo.innerHTML = '<p class="nenhum-pedido">Nenhum pedido pendente</p>';
        return;
    }
    
    let html = '';
    let totalGeral = 0;
    
    snapshot.forEach(doc => {
        const pedido = doc.data();
        const itens = pedido.itens || [];
        const totalPedido = pedido.totalDoPedido || 0;
        totalGeral += totalPedido;
        
        // Cabeçalho do pedido
        html += `<div class="pedido-group">`;
        html += `
            <div class="pedido-header">
                <h4>Pedido #${doc.id.slice(-4).toUpperCase()}</h4>
                <span>${new Date(pedido.horario?.toMillis()).toLocaleTimeString()}</span>
            </div>
        `;
        
        // Itens do pedido
        itens.forEach(item => {
            const info = window.alimentos ? alimentos.find(a => a.nome === item.nome) : null;
            const imagem = info ? info.img : PLACEHOLDER_IMAGE;
            
            html += `
                <div class="item-row">
                    <div class="item-img">
                        <img src="${imagem}" alt="${item.nome}" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                    </div>
                    <div class="item-details">
                        <strong>${item.quantidade}x ${item.nome}</strong>
                        <div class="item-obs">${item.observacao || 'Sem observações'}</div>
                    </div>
                    <div class="item-price">R$ ${formatarMoeda(item.subtotal || 0)}</div>
                </div>
            `;
        });
        
        // Subtotal do pedido
        html += `<div class="pedido-subtotal">Subtotal: R$ ${formatarMoeda(totalPedido)}</div>`;
        html += `</div>`; // Fecha pedido-group
    });
    
    // Total geral
    html += `
        <div class="total-container">
            <span>TOTAL A PAGAR</span>
            <div>R$ ${formatarMoeda(totalGeral)}</div>
        </div>
    `;
    
    modalCorpo.innerHTML = html;
    
    // Guarda o ID do grupo no botão de confirmação
    const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
    if (btnConfirmar) {
        btnConfirmar.setAttribute('data-grupo', grupoId);
    }
}

// ====================================================
// AÇÕES DE PAGAMENTO
// ====================================================

/**
 * Confirma o pagamento de todos os pedidos do grupo
 */
function confirmarPagamentoGrupo() {
    const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
    const grupoId = btnConfirmar?.getAttribute('data-grupo');
    
    if (!grupoId) {
        alert('❌ Erro: Grupo não identificado');
        return;
    }
    
    if (!confirm('💰 Confirmar pagamento de TODOS os pedados deste grupo?')) {
        return;
    }
    
    const isSemMesa = grupoId.startsWith('sem-mesa-');
    let query;
    
    if (isSemMesa) {
        const nomeCliente = grupoId.replace('sem-mesa-', '');
        query = db.collection('mesas').doc('sem-mesa').collection('pedidos')
            .where("nomeCliente", "==", nomeCliente)
            .where("statusDoPedido", "==", "ProcessoDePagamento");
    } else {
        query = db.collection('mesas').doc(grupoId).collection('pedidos')
            .where("statusDoPedido", "==", "ProcessoDePagamento");
    }
    
    // Desabilita o botão para evitar duplo clique
    btnConfirmar.disabled = true;
    btnConfirmar.style.opacity = '0.5';
    btnConfirmar.innerText = 'PROCESSANDO...';
    
    query.get()
        .then(snapshot => {
            if (snapshot.empty) {
                alert('Nenhum pedido pendente encontrado');
                return;
            }
            
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, {
                    statusDoPedido: 'PAGO',
                    horaPagamento: firebase.firestore.FieldValue.serverTimestamp(),
                    pagoPor: firebase.auth().currentUser?.email || 'Sistema'
                });
            });
            
            return batch.commit();
        })
        .then(() => {
            alert('✅ Pagamento confirmado com sucesso!');
            fecharModalPagamento();
        })
        .catch(error => {
            console.error('❌ Erro ao confirmar pagamento:', error);
            alert('❌ Erro ao confirmar pagamento. Tente novamente.');
            
            // Reabilita o botão
            btnConfirmar.disabled = false;
            btnConfirmar.style.opacity = '1';
            btnConfirmar.innerText = 'CONFIRMAR PAGAMENTO';
        });
}

/**
 * Fecha o modal de pagamento
 */
function fecharModalPagamento() {
    const modal = document.getElementById('modal-pagamento');
    if (modal) {
        modal.style.display = 'none';
    }
    grupoModalAberto = null;
}

// ====================================================
// FUNÇÕES UTILITÁRIAS
// ====================================================

/**
 * Formata um valor para moeda brasileira
 * @param {number} valor - Valor a ser formatado
 * @returns {string} Valor formatado (ex: 1.234,56)
 */
function formatarMoeda(valor) {
    return valor.toFixed(2).replace('.', ',');
}

/**
 * Função de logout do sistema
 */
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        firebase.auth().signOut()
            .then(() => {
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('❌ Erro ao sair:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }
}

/**
 * Função do menu toggle (chamada pelo HTML)
 */
function toggleMenu() {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    
    if (sideMenu && overlay) {
        sideMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    }
}

// ====================================================
// EXPOSIÇÃO DE FUNÇÕES PARA O ESCOPO GLOBAL
// ====================================================

// Funções chamadas diretamente pelo HTML
window.alternarAba = alternarAba;
window.abrirModalPagamento = abrirModalPagamento;
window.confirmarPagamentoGrupo = confirmarPagamentoGrupo;
window.fecharModalPagamento = fecharModalPagamento;
window.logout = logout;
window.toggleMenu = toggleMenu;