/**
 * ====================================================
 * PAGAMENTO.JS - SISTEMA DE GESTÃO DE PAGAMENTOS
 * ====================================================
 * 
 * Este arquivo gerencia a visualização e processamento de pagamentos
 * para mesas normais e pedidos sem mesa.
 * 
 * Funcionalidades:
 * - Abas de PENDENTES (lê de mesas) e PAGOS (lê de pagamentos)
 * - Agrupamento de pedidos por mesa ou cliente
 * - Modal de detalhes com todos os itens
 * - Confirmação de pagamento move para coleção pagamentos
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

    if (abaAtual === 'PAGOS') {
        // Na aba de PAGOS, carrega da coleção pagamentos
        carregarPagamentos();
    } else {
        // Na aba de PENDENTES, carrega das mesas
        carregarPendentes();
    }
}

/**
 * Carrega pedidos pendentes das mesas
 */
function carregarPendentes() {
    const lista = document.getElementById('lista-pedidos');
    
    let consultasFinalizadas = 0;
    let totalConsultas = 0;
    const grupos = {};

    // CARREGAR MESAS NORMAIS
    db.collection('mesas').onSnapshot(snapshotMesas => {
        lista.innerHTML = '';

        if (!snapshotMesas.empty) {
            totalConsultas += snapshotMesas.size;

            snapshotMesas.forEach(docMesa => {
                const mesaDados = docMesa.data();
                const mesaId = docMesa.id;

                if (mesaId === 'sem-mesa') {
                    consultasFinalizadas++;
                    verificarSeTerminou();
                    return;
                }

                db.collection('mesas').doc(mesaId).collection('pedidos')
                    .where("statusDoPedido", "==", "ProcessoDePagamento")
                    .onSnapshot(snapshotPedidos => {
                        snapshotPedidos.forEach(docPed => {
                            const pedido = docPed.data();
                            const pedidoId = docPed.id;
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

        // CARREGAR PEDIDOS SEM MESA
        db.collection('mesas').doc('sem-mesa').collection('pedidos')
            .where("statusDoPedido", "==", "ProcessoDePagamento")
            .onSnapshot(snapshotSemMesa => {
                if (!snapshotSemMesa.empty) {
                    snapshotSemMesa.forEach(docPed => {
                        const pedido = docPed.data();
                        const pedidoId = docPed.id;
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

        function verificarSeTerminou() {
            if (consultasFinalizadas >= totalConsultas + 1) {
                renderizarGruposPendentes(grupos);
            }
        }
    });
}

/**
 * Carrega pagamentos da coleção pagamentos (aba PAGOS)
 */
function carregarPagamentos() {
    const lista = document.getElementById('lista-pedidos');
    
    db.collection('pagamentos')
        .orderBy('dataPagamento', 'desc') // Mais recentes primeiro
        .onSnapshot(snapshot => {
            lista.innerHTML = '';

            if (snapshot.empty) {
                lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PAGAMENTO REGISTRADO</h2>';
                return;
            }

            // Agrupa pagamentos por mesa/cliente (opcional)
            const grupos = {};

            snapshot.forEach(doc => {
                const pagamento = doc.data();
                const pagamentoId = doc.id;
                
                // Define chave do grupo
                let chaveGrupo;
                if (pagamento.tipoPedido === 'sem_mesa') {
                    chaveGrupo = `sem-mesa-${pagamento.nomeCliente || 'Cliente'}`;
                } else {
                    chaveGrupo = pagamento.mesaId || `mesa-${pagamento.numeroMesa}`;
                }

                if (!grupos[chaveGrupo]) {
                    grupos[chaveGrupo] = {
                        id: chaveGrupo,
                        tipo: pagamento.tipoPedido === 'sem_mesa' ? 'sem-mesa' : 'mesa',
                        identificador: pagamento.tipoPedido === 'sem_mesa' 
                            ? (pagamento.nomeCliente || 'Cliente') 
                            : (pagamento.numeroMesa || chaveGrupo.replace('mesa-', '')),
                        pagamentos: [],
                        totalItens: 0,
                        totalValor: 0,
                        dataPagamentoMaisRecente: pagamento.dataPagamento?.toMillis() || 0
                    };
                }

                grupos[chaveGrupo].pagamentos.push({
                    id: pagamentoId,
                    dados: pagamento
                });

                // Soma itens
                const itens = pagamento.itens || [];
                const totalItensPagamento = itens.reduce((acc, item) => acc + (item.quantidade || 1), 0);
                grupos[chaveGrupo].totalItens += totalItensPagamento;
                grupos[chaveGrupo].totalValor += pagamento.totalDoPedido || 0;

                // Atualiza data mais recente
                const dataPag = pagamento.dataPagamento?.toMillis() || 0;
                if (dataPag > grupos[chaveGrupo].dataPagamentoMaisRecente) {
                    grupos[chaveGrupo].dataPagamentoMaisRecente = dataPag;
                }
            });

            renderizarGruposPagos(grupos);
        });
}

// ====================================================
// CRIAÇÃO DE GRUPOS
// ====================================================

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

function renderizarGruposPendentes(grupos) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    lista.innerHTML = '';

    const gruposArray = Object.values(grupos);

    if (gruposArray.length === 0) {
        lista.innerHTML = '<h2 class="nenhum-pedido">NADA EM PENDENTES</h2>';
        return;
    }

    // Ordena por mais recente
    gruposArray.sort((a, b) => (b.horarioMaisRecente || 0) - (a.horarioMaisRecente || 0));

    gruposArray.forEach(grupo => {
        const isSemMesa = grupo.tipo === 'sem-mesa';
        const iconeHTML = isSemMesa ? '<i class="fas fa-concierge-bell"></i>' : grupo.identificador;
        const corStatus = '#f1a933';
        
        const horaExibida = grupo.horarioMaisRecente
            ? new Date(grupo.horarioMaisRecente).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';

        const itemHTML = `
            <div class="item-pedido-lista" id="grupo-${grupo.id}" style="border-left: 5px solid ${corStatus};" onclick="abrirModalPagamento('${grupo.id}')">
                <div class="mesa-indicador" style="background: ${corStatus}; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                    ${iconeHTML}
                </div>
                <div style="text-align: center; margin-right: 10px;">
                    <span style="font-size: 0.7rem; color: #999; display: block;">Pedido às</span>
                    <div class="horario-pedido" style="margin-right: 0;">${horaExibida}</div>
                </div>
                <button class="btn-ver" onclick="event.stopPropagation(); abrirModalPagamento('${grupo.id}')">VER</button>
            </div>
        `;

        lista.innerHTML += itemHTML;
    });
}

function renderizarGruposPagos(grupos) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    lista.innerHTML = '';

    const gruposArray = Object.values(grupos);

    if (gruposArray.length === 0) {
        lista.innerHTML = '<h2 class="nenhum-pedido">NADA EM PAGOS</h2>';
        return;
    }

    // Ordena por data de pagamento mais recente
    gruposArray.sort((a, b) => (b.dataPagamentoMaisRecente || 0) - (a.dataPagamentoMaisRecente || 0));

    gruposArray.forEach(grupo => {
        const isSemMesa = grupo.tipo === 'sem-mesa';
        const iconeHTML = isSemMesa ? '<i class="fas fa-concierge-bell"></i>' : grupo.identificador;
        const corStatus = '#2ecc71';
        
        const dataExibida = grupo.dataPagamentoMaisRecente
            ? new Date(grupo.dataPagamentoMaisRecente).toLocaleString([], { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            : '--:--';

        const itemHTML = `
            <div class="item-pedido-lista" id="grupo-${grupo.id}" style="border-left: 5px solid ${corStatus};" onclick="abrirModalVisualizacao('${grupo.id}')">
                <div class="mesa-indicador" style="background: ${corStatus}; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                    ${iconeHTML}
                </div>
                <div style="text-align: center; margin-right: 10px;">
                    <span style="font-size: 0.7rem; color: #999; display: block;">Pago em</span>
                    <div class="horario-pedido" style="margin-right: 0;">${dataExibida}</div>
                </div>
                <button class="btn-ver" style="background: #3498db; box-shadow: 0 4px 0 #2980b9;" onclick="event.stopPropagation(); abrirModalVisualizacao('${grupo.id}')">VER</button>
            </div>
        `;

        lista.innerHTML += itemHTML;
    });
}

// ====================================================
// MODAL DE PAGAMENTO (REUTILIZADO)
// ====================================================

function abrirModalPagamento(grupoId) {
    grupoModalAberto = grupoId;

    let modal = document.getElementById('modal-pagamento');
    if (!modal) {
        modal = criarModalPagamento();
    }

    modal.style.display = 'flex';
    
    // Mostra o botão de confirmar pagamento
    const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
    if (btnConfirmar) {
        btnConfirmar.style.display = 'block';
    }
    
    carregarDetalhesPendentes(grupoId);
}

function abrirModalVisualizacao(grupoId) {
    grupoModalAberto = grupoId;

    let modal = document.getElementById('modal-pagamento');
    if (!modal) {
        modal = criarModalPagamento();
    }

    modal.style.display = 'flex';
    
    // Esconde o botão de confirmar pagamento
    const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
    if (btnConfirmar) {
        btnConfirmar.style.display = 'none';
    }
    
    carregarDetalhesPagos(grupoId);
}

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
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('modal-pagamento');
}

// ====================================================
// CARREGAR DETALHES PARA O MODAL
// ====================================================

function carregarDetalhesPendentes(grupoId) {
    const modalCorpo = document.getElementById('modal-corpo');
    const modalTitulo = document.getElementById('modal-titulo');

    if (!modalCorpo || !modalTitulo) return;

    modalCorpo.innerHTML = '<p style="text-align: center;">Carregando detalhes...</p>';

    const isSemMesa = grupoId.startsWith('sem-mesa-');
    
    if (isSemMesa) {
        const nomeCliente = grupoId.replace('sem-mesa-', '');
        modalTitulo.innerText = `Cliente: ${nomeCliente}`;

        // USANDO onSnapshot PARA ATUALIZAÇÃO EM TEMPO REAL
        db.collection('mesas').doc('sem-mesa').collection('pedidos')
            .where("nomeCliente", "==", nomeCliente)
            .where("statusDoPedido", "==", "ProcessoDePagamento")
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    modalCorpo.innerHTML = '<p class="nenhum-pedido">Nenhum pedido pendente</p>';
                    
                    // Se o modal estiver aberto e não houver mais pedidos, fecha após 1.5s
                    if (grupoModalAberto === grupoId) {
                        setTimeout(() => {
                            if (document.getElementById('modal-pagamento').style.display === 'flex') {
                                fecharModalPagamento();
                            }
                        }, 1500);
                    }
                    return;
                }
                renderizarDetalhesNoModal(snapshot, modalCorpo, 'pendente', grupoId);
            }, error => {
                console.error('❌ Erro:', error);
                modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
            });
    } else {
        const numeroMesa = grupoId.replace('mesa-', '');
        modalTitulo.innerText = `Mesa ${numeroMesa}`;

        // USANDO onSnapshot PARA ATUALIZAÇÃO EM TEMPO REAL
        db.collection('mesas').doc(grupoId).collection('pedidos')
            .where("statusDoPedido", "==", "ProcessoDePagamento")
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    modalCorpo.innerHTML = '<p class="nenhum-pedido">Nenhum pedido pendente</p>';
                    
                    // Se o modal estiver aberto e não houver mais pedidos, fecha após 1.5s
                    if (grupoModalAberto === grupoId) {
                        setTimeout(() => {
                            if (document.getElementById('modal-pagamento').style.display === 'flex') {
                                fecharModalPagamento();
                            }
                        }, 1500);
                    }
                    return;
                }
                renderizarDetalhesNoModal(snapshot, modalCorpo, 'pendente', grupoId);
            }, error => {
                console.error('❌ Erro:', error);
                modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
            });
    }
}

function carregarDetalhesPagos(grupoId) {
    const modalCorpo = document.getElementById('modal-corpo');
    const modalTitulo = document.getElementById('modal-titulo');

    if (!modalCorpo || !modalTitulo) return;

    modalCorpo.innerHTML = '<p style="text-align: center;">Carregando detalhes...</p>';

    const isSemMesa = grupoId.startsWith('sem-mesa-');
    
    if (isSemMesa) {
        // ===== PARA PEDIDOS SEM MESA =====
        const nomeCliente = grupoId.replace('sem-mesa-', '');
        modalTitulo.innerText = `Cliente: ${nomeCliente}`;
        
        db.collection('pagamentos')
            .where("nomeCliente", "==", nomeCliente)
            .orderBy('dataPagamento', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    modalCorpo.innerHTML = '<p class="nenhum-pedido">Nenhum pagamento encontrado</p>';
                    return;
                }
                renderizarDetalhesNoModal(snapshot, modalCorpo, 'pago');
            }, error => {
                console.error('❌ Erro:', error);
                modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
            });
    } else {
        // ===== PARA MESAS NORMAIS =====
        const numeroMesa = grupoId.replace('mesa-', '');
        modalTitulo.innerText = `Mesa ${numeroMesa}`;
        
        // Busca por originalMesaId (que é o ID da mesa)
        db.collection('pagamentos')
            .where("originalMesaId", "==", grupoId)
            .orderBy('dataPagamento', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    // Tenta buscar pelo campo mesaId (fallback)
                    db.collection('pagamentos')
                        .where("mesaId", "==", grupoId)
                        .orderBy('dataPagamento', 'desc')
                        .onSnapshot(snapshot2 => {
                            if (snapshot2.empty) {
                                modalCorpo.innerHTML = '<p class="nenhum-pedido">Nenhum pagamento encontrado para esta mesa</p>';
                                return;
                            }
                            renderizarDetalhesNoModal(snapshot2, modalCorpo, 'pago');
                        }, error => {
                            console.error('❌ Erro:', error);
                            modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
                        });
                    return;
                }
                renderizarDetalhesNoModal(snapshot, modalCorpo, 'pago');
            }, error => {
                console.error('❌ Erro:', error);
                modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
            });
    }
}

function renderizarDetalhesNoModal(snapshot, modalCorpo, tipo, grupoId = null) {
    if (snapshot.empty) {
        modalCorpo.innerHTML = '<p class="nenhum-pedido">Nenhum pedido encontrado</p>';
        return;
    }

    let html = '';
    let totalGeral = 0;

    snapshot.forEach(doc => {
        const pedido = doc.data();
        const itens = pedido.itens || [];
        const totalPedido = pedido.totalDoPedido || 0;
        totalGeral += totalPedido;

        // Info de pagamento (para itens pagos)
        let infoPagamento = '';
        if (tipo === 'pago' && pedido.dataPagamento) {
            const dataPag = new Date(pedido.dataPagamento.toMillis());
            infoPagamento = `
                <div style="background: #27ae60; color: white; padding: 5px 10px; border-radius: 8px; font-size: 0.8rem; margin: 10px 0; display: inline-block;">
                    ✅ Pago em ${dataPag.toLocaleDateString()} às ${dataPag.toLocaleTimeString()}
                </div>
            `;
        }

        // Info do garçom
        let infoGarcom = pedido.anotadoPor 
            ? `<span style="font-size: 0.7rem; color: #666; margin-left: 10px;">👨‍🍳 ${pedido.anotadoPor}</span>` 
            : '';

        // Cabeçalho
        html += `<div class="pedido-group">`;
        html += `
            <div class="pedido-header">
                <h4>Pedido #${doc.id.slice(-4).toUpperCase()} ${infoGarcom}</h4>
                <span>${pedido.horario ? new Date(pedido.horario.toMillis()).toLocaleTimeString() : '--:--'}</span>
            </div>
        `;
        
        html += infoPagamento;

        // Itens
        itens.forEach(item => {
            const dadosBase = (typeof alimentos !== 'undefined')
                ? alimentos.find(a => a.nome === item.nome)
                : null;
            const imagem = item.img || (dadosBase ? dadosBase.img : 'img/placeholder-bk.png');

            html += `
                <div class="item-row">
                    <div class="item-img">
                        <img src="${imagem}" alt="${item.nome}" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                    </div>
                    <div class="Conteudo-itensCard">
                        <div class="item-details">
                            <strong>${item.nome}</strong>
                        </div>
                        <div class="item-price">
                            R$ ${formatarMoeda(item.subtotal || 0)}
                            <div class="qtd"> ${item.quantidade}x</div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `<div class="pedido-subtotal">Subtotal: R$ ${formatarMoeda(totalPedido)}</div>`;
    });

    // Total
    html += `
        <div class="total-container">
            <span>${tipo === 'pendente' ? 'TOTAL A PAGAR' : 'TOTAL PAGO'}</span>
            <div>R$ ${formatarMoeda(totalGeral)}</div>
        </div>
    `;

    modalCorpo.innerHTML = html;

    // Salva grupoId no botão se for pendente
    if (tipo === 'pendente' && grupoId) {
        const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
        if (btnConfirmar) {
            btnConfirmar.setAttribute('data-grupo', grupoId);
        }
    }
}

// ====================================================
// CONFIRMAR PAGAMENTO (MOVER PARA COLEÇÃO PAGAMENTOS)
// ====================================================

async function confirmarPagamentoGrupo() {
    const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
    const grupoId = btnConfirmar?.getAttribute('data-grupo');

    if (!grupoId) {
        alert('❌ Erro: Grupo não identificado');
        return;
    }

    if (!confirm('💰 Confirmar pagamento de TODOS os pedidos deste grupo?')) {
        return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.style.opacity = '0.5';
    btnConfirmar.innerText = 'PROCESSANDO...';

    try {
        const isSemMesa = grupoId.startsWith('sem-mesa-');
        let pedidosPendentes = [];
        let mesaRef, nomeCliente, numeroMesa;

        if (isSemMesa) {
            nomeCliente = grupoId.replace('sem-mesa-', '');
            mesaRef = db.collection('mesas').doc('sem-mesa');
            
            const snapshot = await mesaRef.collection('pedidos')
                .where("nomeCliente", "==", nomeCliente)
                .where("statusDoPedido", "==", "ProcessoDePagamento")
                .get();
            
            pedidosPendentes = snapshot.docs;
        } else {
            numeroMesa = grupoId.replace('mesa-', '');
            mesaRef = db.collection('mesas').doc(grupoId);
            
            const snapshot = await mesaRef.collection('pedidos')
                .where("statusDoPedido", "==", "ProcessoDePagamento")
                .get();
            
            pedidosPendentes = snapshot.docs;
        }

        if (pedidosPendentes.length === 0) {
            alert('Nenhum pedido pendente encontrado');
            return;
        }

        const batch = db.batch();
        const dataPagamento = firebase.firestore.FieldValue.serverTimestamp();

        for (const docPed of pedidosPendentes) {
            const pedidoData = docPed.data();
            
            const pagamentoData = {
                ...pedidoData,
                originalPedidoId: docPed.id,
                originalMesaId: grupoId,
                dataPagamento: dataPagamento,
                statusDoPedido: 'PAGO',
                numeroMesa: numeroMesa || null,
                tipoPedido: isSemMesa ? 'sem_mesa' : 'mesa'
            };

            const pagamentoRef = db.collection('pagamentos').doc();
            batch.set(pagamentoRef, pagamentoData);
            batch.delete(docPed.ref);
        }

        // ===== NOVA LÓGICA: RESETAR A MESA (SE FOR MESA NORMAL) =====
        if (!isSemMesa) {
            // Reseta a mesa para o estado inicial
            batch.update(mesaRef, {
                status: "LIVRE",
                valor: 0,
                tempo: "",
                // Opcional: atualizar horário de fechamento
                horario_fechamento: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
        
        alert('✅ Pagamento confirmado!');
        fecharModalPagamento();
        
        // Recarrega a página
        window.location.reload();

    } catch (error) {
        console.error('❌ Erro ao confirmar pagamento:', error);
        alert('❌ Erro ao confirmar pagamento. Tente novamente.');

        btnConfirmar.disabled = false;
        btnConfirmar.style.opacity = '1';
        btnConfirmar.innerText = 'CONFIRMAR PAGAMENTO';
    }
}

// ====================================================
// FUNÇÕES UTILITÁRIAS
// ====================================================

function formatarMoeda(valor) {
    return valor.toFixed(2).replace('.', ',');
}

function fecharModalPagamento() {
    const modal = document.getElementById('modal-pagamento');
    if (modal) {
        modal.style.display = 'none';
    }
    grupoModalAberto = null;
    
    // Limpa o conteúdo do modal para evitar dados antigos
    const modalCorpo = document.getElementById('modal-corpo');
    if (modalCorpo) {
        modalCorpo.innerHTML = '';
    }
}

function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        firebase.auth().signOut()
            .then(() => window.location.href = 'index.html')
            .catch(error => {
                console.error('❌ Erro ao sair:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }
}

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
// EXPOSIÇÃO GLOBAL
// ====================================================

window.alternarAba = alternarAba;
window.abrirModalPagamento = abrirModalPagamento;
window.abrirModalVisualizacao = abrirModalVisualizacao;
window.confirmarPagamentoGrupo = confirmarPagamentoGrupo;
window.fecharModalPagamento = fecharModalPagamento;
window.logout = logout;
window.toggleMenu = toggleMenu;
