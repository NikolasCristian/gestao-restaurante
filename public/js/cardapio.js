// Objeto global para armazenar as quantidades selecionadas { id: quantidade }
const pedidoAtual = {};

// Flag para controlar processamento
let processandoPedido = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Captura o número da mesa vindo da URL
    const urlParams = new URLSearchParams(window.location.search);
    const mesa = urlParams.get('mesa');

    if (mesa) {
        document.getElementById('numero-mesa').innerText = `Mesa ${mesa}`;
    }

    // 2. Renderiza os produtos na tela
    renderizarProdutos();

    // Configura o botão de avançar para a revisão
    const btnOk = document.querySelector('.btn-ok');
    if (btnOk) {
        btnOk.addEventListener('click', irParaRevisao);
    }
});

function renderizarProdutos() {
    const containerHamburguers = document.querySelector('.hamburguers');
    const containerPizzas = document.querySelector('.pizzas');
    const containerBebidas = document.querySelector('.bebidas');

    if (containerHamburguers) containerHamburguers.innerHTML = '';
    if (containerPizzas) containerPizzas.innerHTML = '';
    if (containerBebidas) containerBebidas.innerHTML = '';

    alimentos.forEach(produto => {
        const cardHTML = `
            <div class="card-produto">
                <img src="${produto.img}" alt="${produto.nome}" class="img-produto" onerror="this.src='img/placeholder.png'">
                <div class="detalhes-produto">
                    <h4>${produto.nome}</h4>
                    <p>${produto.descricao || ''}</p>
                    <div class="preco-controle">
                        <span class="preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</span>
                        <div class="contador">
                            <button class="btn-menos" onclick="alterarQtd(${produto.id}, -1)">-</button>
                            <span class="qtd" id="qtd-${produto.id}">0</span>
                            <button class="btn-mais" onclick="alterarQtd(${produto.id}, 1)">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (produto.categoria === 'hamburgueres' && containerHamburguers) containerHamburguers.innerHTML += cardHTML;
        else if (produto.categoria === 'pizzas' && containerPizzas) containerPizzas.innerHTML += cardHTML;
        else if (produto.categoria === 'bebidas' && containerBebidas) containerBebidas.innerHTML += cardHTML;
    });
}

function alterarQtd(id, delta) {
    if (!pedidoAtual[id]) pedidoAtual[id] = 0;
    pedidoAtual[id] += delta;
    if (pedidoAtual[id] < 0) pedidoAtual[id] = 0;

    const spanQtd = document.getElementById(`qtd-${id}`);
    if (spanQtd) spanQtd.innerText = pedidoAtual[id];

    atualizarTotal();
}

function atualizarTotal() {
    let total = 0;
    alimentos.forEach(produto => {
        const quantidade = pedidoAtual[produto.id] || 0;
        total += produto.preco * quantidade;
    });
    const campoTotal = document.getElementById('valor-total');
    if (campoTotal) campoTotal.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function irParaRevisao() {
    // Verifica se já está processando
    if (processandoPedido) return;
    
    // Verifica se tem itens no pedido
    const temItens = Object.values(pedidoAtual).some(qtd => qtd > 0);
    
    if (!temItens) {
        alert("❌ Selecione pelo menos um item!");
        return;
    }

    const modal = document.getElementById('modal-revisao');
    const listaRevisao = document.getElementById('lista-revisao');
    const totalModal = document.getElementById('total-modal');
    const mesaTitulo = document.getElementById('mesa-revisao-titulo');

    mesaTitulo.innerText = document.getElementById('numero-mesa').innerText;
    listaRevisao.innerHTML = '';

    let totalGeral = 0;

    alimentos.forEach(produto => {
        const qtd = pedidoAtual[produto.id] || 0;
        if (qtd > 0) {
            const subtotal = produto.preco * qtd;
            totalGeral += subtotal;

            listaRevisao.innerHTML += `
                <div class="card-produto-revisao" style="display: flex; align-items: center; background: #ffffff; padding: 10px; border-radius: 12px; margin-bottom: 10px;">
                    <img src="${produto.img}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
                    <div style="flex: 1; margin-left: 15px;">
                        <h4 style="font-family: 'Arial Black'; font-size: 14px; margin: 0;">${produto.nome}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                            <span style="font-weight: 900;">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                            <span style="background: #d6d6d6; color: #000000; padding: 2px 10px; border-radius: 20px; font-size: 12px;">${qtd}x</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    totalModal.innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    modal.style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-revisao').style.display = 'none';
}

// --- LÓGICA DO MODAL DE BEBIDAS ---

function fecharModalBebida() {
    document.getElementById('modal-bebida').style.display = 'none';
}

async function verificarBebidasAntesDeEnviar() {
    // Verifica se já está processando
    if (processandoPedido) return;
    
    // Verifica se tem itens no pedido
    const temItens = Object.values(pedidoAtual).some(qtd => qtd > 0);
    
    if (!temItens) {
        alert("❌ Selecione pelo menos um item!");
        return;
    }
    
    // 1. Verifica se há bebidas no pedido ATUAL
    const temBebidaNoPedidoAtual = alimentos.some(p => pedidoAtual[p.id] > 0 && p.categoria === 'bebidas');

    // 2. Verifica se há comida no pedido ATUAL
    const temComidaNoPedidoAtual = alimentos.some(p => pedidoAtual[p.id] > 0 && p.categoria !== 'bebidas');

    // Se não tem bebida, envia direto
    if (!temBebidaNoPedidoAtual) {
        await enviarPedidoFirebase();
        return;
    }

    // Se tem bebida e TAMBÉM tem comida no mesmo carrinho, mostra o modal
    if (temComidaNoPedidoAtual) {
        document.getElementById('modal-bebida').style.display = 'flex';
        return;
    }

    // Se só tem bebida no carrinho atual, verifica se a mesa já tem lanche
    try {
        const mesaTexto = document.getElementById('numero-mesa').innerText;
        const numeroMesa = mesaTexto.replace('Mesa ', '').trim();
        const mesaRef = db.collection("mesas").doc(`mesa-${numeroMesa}`);

        const snapshot = await mesaRef.collection("pedidos")
            .where("statusDoPedido", "in", ["ENVIADO", "PREPARANDO"])
            .get();

        let jaExisteLancheSendoFeito = false;

        snapshot.forEach(doc => {
            const dados = doc.data();
            if (dados.itens.some(item => item.categoria !== 'bebidas')) {
                jaExisteLancheSendoFeito = true;
            }
        });

        if (jaExisteLancheSendoFeito) {
            document.getElementById('modal-bebida').style.display = 'flex';
        } else {
            await enviarPedidoFirebase();
        }

    } catch (error) {
        console.error("Erro ao verificar histórico da mesa:", error);
        await enviarPedidoFirebase();
    }
}

async function confirmarPedidoComPreferencia() {
    // Verifica se já está processando
    if (processandoPedido) return;
    
    // Confirma a escolha da bebida
    const radioSelected = document.querySelector('input[name="pref-bebida"]:checked');
    const escolha = radioSelected ? radioSelected.value : "EntregarComLanche";
    
    let mensagem = "";
    if (escolha === "EntregarComLanche") {
        mensagem = "🥤 Deseja enviar a bebida JUNTO com a comida?";
    } else {
        mensagem = "🥤 Deseja enviar a bebida AGORA (separado da comida)?";
    }
    
    if (!confirm(mensagem)) {
        return;
    }
    
    window.statusEntregaBebida = escolha;

    fecharModalBebida();
    await enviarPedidoFirebase();
}

// --- FUNÇÃO DE ENVIO PARA FIREBASE COM CONFIRMAÇÃO FINAL ---
async function enviarPedidoFirebase() {
    // Se já estiver processando, não faz nada
    if (processandoPedido) {
        console.log("Pedido já está sendo processado...");
        return;
    }
    
    // Confirmação final antes de enviar
    const totalItens = Object.values(pedidoAtual).reduce((acc, qtd) => acc + qtd, 0);
    if (!confirm(`✅ Confirma o envio deste pedido com ${totalItens} item(ns)?`)) {
        return;
    }
    
    // Marca como processando
    processandoPedido = true;
    
    // Desabilita todos os botões de confirmação
    desabilitarBotoesConfirmacao();
    
    const mesaTexto = document.getElementById('numero-mesa').innerText;
    const numeroMesa = mesaTexto.replace('Mesa ', '').trim();
    const mesaRef = db.collection("mesas").doc(`mesa-${numeroMesa}`);
    const subcolecaoPedidos = mesaRef.collection("pedidos");

    const itensNovos = alimentos
        .filter(produto => pedidoAtual[produto.id] > 0)
        .map(produto => ({
            nome: produto.nome,
            quantidade: pedidoAtual[produto.id],
            precoUnitario: produto.preco,
            subtotal: produto.preco * pedidoAtual[produto.id],
            categoria: produto.categoria
        }));

    if (itensNovos.length === 0) {
        processandoPedido = false;
        return;
    }

    let statusFinalBebida = "Nao se aplica";
    const temBebida = itensNovos.some(i => i.categoria === 'bebidas');
    
    if (temBebida) {
        statusFinalBebida = window.statusEntregaBebida || "EntregarAgora";
    }

    const totalPedidoAtual = itensNovos.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        const docMesa = await mesaRef.get();
        const mesaJaOcupada = docMesa.exists && docMesa.data().status === "OCUPADA";

        if (statusFinalBebida === "EntregarAgora") {
            const itensComida = itensNovos.filter(item => item.categoria !== 'bebidas');
            const itensBebida = itensNovos.filter(item => item.categoria === 'bebidas');

            if (itensComida.length > 0) {
                const totalComida = itensComida.reduce((acc, item) => acc + item.subtotal, 0);
                await subcolecaoPedidos.add({
                    itens: itensComida,
                    totalDoPedido: totalComida,
                    horario: firebase.firestore.FieldValue.serverTimestamp(),
                    statusDoPedido: 'ENVIADO',
                    StatusDaBebida: "Nao se aplica",
                    tipo: "comida"
                });
            }

            if (itensBebida.length > 0) {
                const totalBebida = itensBebida.reduce((acc, item) => acc + item.subtotal, 0);
                await subcolecaoPedidos.add({
                    itens: itensBebida,
                    totalDoPedido: totalBebida,
                    horario: firebase.firestore.FieldValue.serverTimestamp(),
                    statusDoPedido: 'ENVIADO',
                    StatusDaBebida: "EntregarAgora",
                    tipo: "bebida"
                });
            }
        } else {
            await subcolecaoPedidos.add({
                itens: itensNovos,
                totalDoPedido: totalPedidoAtual,
                horario: firebase.firestore.FieldValue.serverTimestamp(),
                statusDoPedido: 'ENVIADO',
                StatusDaBebida: "EntregarComLanche",
                tipo: "completo"
            });
        }

        const dadosUpdate = {
            valor: firebase.firestore.FieldValue.increment(totalPedidoAtual),
            status: "OCUPADA"
        };

        if (!mesaJaOcupada) {
            dadosUpdate.horario_inicio = firebase.firestore.FieldValue.serverTimestamp();
        }

        await mesaRef.update(dadosUpdate);

        window.statusEntregaBebida = null;
        Object.keys(pedidoAtual).forEach(key => pedidoAtual[key] = 0);
        
        alert("✅ Pedido enviado com sucesso!");
        window.location.href = "garcom.html";

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("❌ Erro técnico: " + error.message);
        
        // Libera a flag em caso de erro
        processandoPedido = false;
        reabilitarBotoesConfirmacao();
    }
}

// Funções auxiliares para controle visual dos botões
function desabilitarBotoesConfirmacao() {
    const botoes = document.querySelectorAll('.btn-finalizar, button[onclick*="confirmar"], button[onclick*="enviar"]');
    botoes.forEach(botao => {
        if (botao) {
            botao.disabled = true;
            botao.style.opacity = '0.5';
            botao.style.cursor = 'not-allowed';
        }
    });
}

function reabilitarBotoesConfirmacao() {
    const botoes = document.querySelectorAll('.btn-finalizar, button[onclick*="confirmar"], button[onclick*="enviar"]');
    botoes.forEach(botao => {
        if (botao) {
            botao.disabled = false;
            botao.style.opacity = '1';
            botao.style.cursor = 'pointer';
        }
    });
}