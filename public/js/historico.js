/**
 * ====================================================
 * HISTORICO.JS - HISTÓRICO DE PAGAMENTOS
 * ====================================================
 * 
 * Este arquivo gerencia a visualização do histórico de pagamentos
 * com funcionalidade de busca por nome do cliente ou horário.
 * 
 * Funcionalidades:
 * - Lista todos os pagamentos da coleção 'pagamentos'
 * - Busca em tempo real por nome do cliente
 * - Busca por horário (data ou hora)
 * - Modal de detalhes do pagamento
 * 
 * Autor: Sistema de Gestão de Restaurante
 * Data: 2024
 * ====================================================
 */

'use strict';

// ====================================================
// CONFIGURAÇÕES GLOBAIS
// ====================================================

/** @type {Object} Placeholder para imagens que não carregam */
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' font-size='12' text-anchor='middle' dy='.3em' fill='%23666' font-family='Arial'%3ESem%20Imagem%3C/text%3E%3C/svg%3E";

/** @type {string} Termo de busca atual */
let termoBuscaAtual = '';

/** @type {Function} Função para cancelar listener anterior */
let unsubscribePagamentos = null;

// ====================================================
// INICIALIZAÇÃO
// ====================================================

/**
 * Inicializa a página quando o DOM é carregado
 * @listens DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Inicializando página de histórico...');
    carregarPagamentos();
    configurarBusca();
});

// ====================================================
// CONFIGURAÇÃO DA BUSCA
// ====================================================

/**
 * Configura o campo de busca com debounce
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
                termoBuscaAtual = inputBusca.value.trim().toLowerCase();
                carregarPagamentos();
            }, 500); // Espera 500ms após parar de digitar
        });
    }
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Previne o reload da página
            const inputBusca = document.getElementById('num-mesa');
            termoBuscaAtual = inputBusca.value.trim().toLowerCase();
            carregarPagamentos();
        });
    }
}

// ====================================================
// CARREGAMENTO DE PAGAMENTOS
// ====================================================

/**
 * Carrega todos os pagamentos da coleção
 */
function carregarPagamentos() {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) {
        console.error('❌ Elemento lista-pedidos não encontrado');
        return;
    }

    lista.innerHTML = '<p class="msg-status">Carregando histórico...</p>';

    // Cancela listener anterior se existir
    if (unsubscribePagamentos) {
        unsubscribePagamentos();
    }

    // Cria novo listener
    unsubscribePagamentos = db.collection('pagamentos')
        .orderBy('dataPagamento', 'desc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                lista.innerHTML = '<h2 class="nenhum-pedido">NENHUM PAGAMENTO REGISTRADO</h2>';
                return;
            }

            const pagamentos = [];

            snapshot.forEach(doc => {
                const pagamento = {
                    id: doc.id,
                    ...doc.data()
                };
                pagamentos.push(pagamento);
            });

            // Aplica filtro de busca se houver termo
            const pagamentosFiltrados = filtrarPagamentos(pagamentos);
            
            if (pagamentosFiltrados.length === 0) {
                lista.innerHTML = `<h2 class="nenhum-pedido">NENHUM PAGAMENTO ENCONTRADO PARA "${termoBuscaAtual}"</h2>`;
                return;
            }

            renderizarLista(pagamentosFiltrados);
        }, error => {
            console.error('❌ Erro ao carregar pagamentos:', error);
            lista.innerHTML = '<p class="nenhum-pedido">Erro ao carregar histórico</p>';
        });
}

/**
 * Filtra pagamentos baseado no termo de busca
 * @param {Array} pagamentos - Lista de pagamentos
 * @returns {Array} Lista filtrada
 */
function filtrarPagamentos(pagamentos) {
    if (!termoBuscaAtual) return pagamentos;

    return pagamentos.filter(pagamento => {
        // Busca por nome do cliente
        if (pagamento.nomeCliente && 
            pagamento.nomeCliente.toLowerCase().includes(termoBuscaAtual)) {
            return true;
        }

        // Busca por número da mesa
        if (pagamento.numeroMesa && 
            pagamento.numeroMesa.toString().includes(termoBuscaAtual)) {
            return true;
        }

        // Busca por data/hora do pagamento
        if (pagamento.dataPagamento) {
            const data = new Date(pagamento.dataPagamento.toMillis());
            const dataStr = data.toLocaleString('pt-BR').toLowerCase();
            if (dataStr.includes(termoBuscaAtual)) {
                return true;
            }
        }

        // Busca por horário do pedido
        if (pagamento.horario) {
            const data = new Date(pagamento.horario.toMillis());
            const dataStr = data.toLocaleString('pt-BR').toLowerCase();
            if (dataStr.includes(termoBuscaAtual)) {
                return true;
            }
        }

        // Busca por nome do garçom
        if (pagamento.anotadoPor && 
            pagamento.anotadoPor.toLowerCase().includes(termoBuscaAtual)) {
            return true;
        }

        return false;
    });
}

// ====================================================
// RENDERIZAÇÃO DA LISTA
// ====================================================

/**
 * Renderiza a lista de pagamentos
 * @param {Array} pagamentos - Lista de pagamentos
 */
function renderizarLista(pagamentos) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    lista.innerHTML = '';

    pagamentos.forEach(pagamento => {
        const isSemMesa = pagamento.tipoPedido === 'sem_mesa';
        
        // Formata data do pagamento
        let dataPagamento = '--/--/--';
        if (pagamento.dataPagamento) {
            const data = new Date(pagamento.dataPagamento.toMillis());
            dataPagamento = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Define identificador
        let identificador = '';
        let iconeHTML = '';
        
        if (isSemMesa) {
            identificador = pagamento.nomeCliente || 'Cliente não identificado';
            iconeHTML = '<i class="fas fa-concierge-bell"></i>';
        } else {
            identificador = `Mesa ${pagamento.numeroMesa || pagamento.originalMesaId?.replace('mesa-', '') || 'N/A'}`;
            iconeHTML = pagamento.numeroMesa || pagamento.originalMesaId?.replace('mesa-', '') || '?';
        }

        // Calcula total de itens
        const totalItens = pagamento.itens?.reduce((acc, item) => acc + (item.quantidade || 1), 0) || 0;

        const itemHTML = `
            <div class="item-pedido-lista" id="pag-${pagamento.id}" style="border-left: 5px solid #2ecc71; cursor: pointer;" onclick="abrirDetalhesPagamento('${pagamento.id}')">
                <div class="mesa-indicador" style="background: #2ecc71; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                    ${iconeHTML}
                </div>
                <div class="info-pedido" style="flex: 1; margin-left: 15px;">
                    <strong style="color: #000">${identificador}</strong>
                    <span style="font-size: 0.8rem; color: #666; display: block;">
                        ${totalItens} itens · 👨‍🍳 ${pagamento.anotadoPor || 'N/A'}
                    </span>
                    <span style="font-size: 0.9rem; color: #000; font-weight: 900; display: block;">
                        R$ ${formatarMoeda(pagamento.totalDoPedido || 0)}
                    </span>
                </div>
                <button class="btn-ver" style="background: #00ff6a; box-shadow: 0 4px 0 #00c700;" onclick="event.stopPropagation(); abrirDetalhesPagamento('${pagamento.id}')">VER</button>
            </div>
        `;

        lista.innerHTML += itemHTML;
    });
}

// ====================================================
// MODAL DE DETALHES
// ====================================================

/**
 * Abre o modal com detalhes do pagamento
 * @param {string} pagamentoId - ID do pagamento
 */
function abrirDetalhesPagamento(pagamentoId) {
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
    
    carregarDetalhesPagamento(pagamentoId);
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
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('modal-pagamento');
}

/**
 * Carrega os detalhes do pagamento no modal
 * @param {string} pagamentoId - ID do pagamento
 */
function carregarDetalhesPagamento(pagamentoId) {
    const modalCorpo = document.getElementById('modal-corpo');
    const modalTitulo = document.getElementById('modal-titulo');

    if (!modalCorpo || !modalTitulo) return;

    modalCorpo.innerHTML = '<p style="text-align: center;">Carregando detalhes...</p>';

    db.collection('pagamentos').doc(pagamentoId).get()
        .then(doc => {
            if (!doc.exists) {
                modalCorpo.innerHTML = '<p class="nenhum-pedido">Pagamento não encontrado</p>';
                return;
            }

            const pagamento = doc.data();
            renderizarDetalhesNoModal(pagamento, doc.id, modalCorpo, modalTitulo);
        })
        .catch(error => {
            console.error('❌ Erro ao carregar detalhes:', error);
            modalCorpo.innerHTML = '<p class="nenhum-pedido">Erro ao carregar detalhes</p>';
        });
}

/**
 * Renderiza os detalhes do pagamento no modal
 * @param {Object} pagamento - Dados do pagamento
 * @param {string} pagamentoId - ID do pagamento
 * @param {HTMLElement} modalCorpo - Elemento do corpo
 * @param {HTMLElement} modalTitulo - Elemento do título
 */
function renderizarDetalhesNoModal(pagamento, pagamentoId, modalCorpo, modalTitulo) {
    const isSemMesa = pagamento.tipoPedido === 'sem_mesa';
    
    // Define título
    if (isSemMesa) {
        modalTitulo.innerText = `Cliente: ${pagamento.nomeCliente || 'Não identificado'}`;
    } else {
        const numeroMesa = pagamento.numeroMesa || pagamento.originalMesaId?.replace('mesa-', '') || 'N/A';
        modalTitulo.innerText = `Mesa ${numeroMesa}`;
    }

    const itens = pagamento.itens || [];
    const totalPedido = pagamento.totalDoPedido || 0;

    // Formata data do pagamento
    let dataPagamento = '--/--/---- --:--';
    if (pagamento.dataPagamento) {
        const data = new Date(pagamento.dataPagamento.toMillis());
        dataPagamento = data.toLocaleString('pt-BR');
    }

    // Formata data do pedido
    let dataPedido = '--/--/---- --:--';
    if (pagamento.horario) {
        const data = new Date(pagamento.horario.toMillis());
        dataPedido = data.toLocaleString('pt-BR');
    }

    let html = `
        <!-- Informações do Pagamento -->
        <div style="background: #fff; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-calendar-check" style="color: #27ae60; font-size: 20px;"></i>
                <div>
                    <div style="font-size: 0.8rem; color: #666;">Data do Pagamento</div>
                    <strong style="color: #000">${dataPagamento}</strong>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-clock" style="color: #f1a933; font-size: 20px;"></i>
                <div>
                    <div style="font-size: 0.8rem; color: #666;">Data do Pedido</div>
                    <strong style="color: #000">${dataPedido}</strong>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user-tie" style="color: #3498db; font-size: 20px;"></i>
                <div>
                    <div style="font-size: 0.8rem; color: #666;">Garçom</div>
                    <strong style="color: #000">${pagamento.anotadoPor || 'Não identificado'}</strong>
                </div>
            </div>
        </div>
    `;

    // Itens do pedido
    html += `<h4 style="font-family: 'Arial Black'; margin: 15px 0 10px 0; color: #000">ITENS DO PEDIDO</h4>`;

    itens.forEach(item => {
        const dadosBase = (typeof alimentos !== 'undefined')
            ? alimentos.find(a => a.nome === item.nome)
            : null;
        const imagem = item.img || (dadosBase ? dadosBase.img : 'img/placeholder-bk.png');

        html += `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; background: #fff; padding: 10px; border-radius: 10px;">
                <div style="width: 45px; height: 45px; min-width: 45px; border-radius: 8px; overflow: hidden;">
                    <img src="${imagem}" alt="${item.nome}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="font-size: 0.9rem; color: #000">${item.nome}</strong>
                        <span style="font-weight: 900; color: #27ae60;">R$ ${formatarMoeda(item.subtotal || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666;">
                        <span>${item.quantidade || 1}x</span>
                    </div>
                </div>
            </div>
        `;
    });

    // Total
    html += `
        <div style="background: #000; color: #fff; padding: 15px; border-radius: 12px; text-align: center; margin-top: 15px;">
            <span style="font-size: 0.9rem; opacity: 0.9;">TOTAL PAGO</span>
            <div style="font-size: 1.8rem; font-weight: 900;">R$ ${formatarMoeda(totalPedido)}</div>
        </div>
    `;

    modalCorpo.innerHTML = html;
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
 * Fecha o modal de pagamento
 */
function fecharModalPagamento() {
    const modal = document.getElementById('modal-pagamento');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Função de logout do sistema
 */
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
// EXPOSIÇÃO GLOBAL
// ====================================================

window.abrirDetalhesPagamento = abrirDetalhesPagamento;
window.fecharModalPagamento = fecharModalPagamento;
window.logout = logout;
window.toggleMenu = toggleMenu;