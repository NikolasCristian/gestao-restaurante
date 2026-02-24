// Objeto global para armazenar as quantidades selecionadas { id: quantidade }
const pedidoAtual = {};

document.addEventListener('DOMContentLoaded', () => {
    // Para SEM MESA, não pegamos mesa da URL
    // Mostramos um título diferente
    const headerMesa = document.getElementById('numero-mesa');
    if (headerMesa) {
        headerMesa.innerText = `Pedido Sem Mesa`;
    }

    // Renderiza os produtos na tela
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
    const modal = document.getElementById('modal-revisao');
    const listaRevisao = document.getElementById('lista-revisao');
    const totalModal = document.getElementById('total-modal');
    const mesaTitulo = document.getElementById('mesa-revisao-titulo');

    mesaTitulo.innerText = document.getElementById('numero-mesa').innerText;
    listaRevisao.innerHTML = '';

    let totalGeral = 0;
    let temItens = false;

    alimentos.forEach(produto => {
        const qtd = pedidoAtual[produto.id] || 0;
        if (qtd > 0) {
            temItens = true;
            const subtotal = produto.preco * qtd;
            totalGeral += subtotal;

            listaRevisao.innerHTML += `
                <div class="card-produto-revisao" style="display: flex; align-items: center; background: #fff; padding: 10px; border-radius: 12px; margin-bottom: 10px;">
                    <img src="${produto.img}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
                    <div style="flex: 1; margin-left: 15px;">
                        <h4 style="font-family: 'Arial Black'; font-size: 14px; margin: 0;">${produto.nome}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                            <span style="font-weight: 900;">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                            <span style="background: #000; color: #fff; padding: 2px 10px; border-radius: 20px; font-size: 12px;">${qtd}x</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    if (!temItens) {
        alert("Selecione pelo menos um item!");
        return;
    }

    totalModal.innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    modal.style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-revisao').style.display = 'none';
}

// --- FUNÇÃO PARA PEDIR NOME DO CLIENTE (NOVA) ---
function abrirModalNomeCliente() {
    const modal = document.getElementById('modal-nome-cliente');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        criarModalNomeCliente();
    }
}

function criarModalNomeCliente() {
    const modalHTML = `
        <div id="modal-nome-cliente" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: #e0e0e0; width: 90%; max-width: 350px; border-radius: 30px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <h3 style="font-family: 'Arial Black'; text-align: center; margin-bottom: 20px;">NOME DO CLIENTE</h3>
                <p style="text-align: center; color: #666; margin-bottom: 20px;">Digite o nome para o pedido sem mesa</p>
                <input type="text" id="input-nome-cliente" placeholder="Ex: João Silva" style="width: 100%; padding: 15px; border: none; border-radius: 15px; margin-bottom: 20px; font-size: 16px; box-sizing: border-box;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="confirmarNomeCliente()" style="flex: 2; background: #6eff9d; border: none; padding: 15px; border-radius: 15px; font-weight: 900; cursor: pointer;">CONFIRMAR</button>
                    <button onclick="fecharModalNomeCliente()" style="flex: 1; background: #000; color: #fff; border: none; padding: 15px; border-radius: 15px; font-weight: 900; cursor: pointer;">X</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharModalNomeCliente() {
    const modal = document.getElementById('modal-nome-cliente');
    if (modal) modal.remove();
}

function confirmarNomeCliente() {
    const inputNome = document.getElementById('input-nome-cliente');
    const nomeCliente = inputNome.value.trim();
    
    if (!nomeCliente) {
        alert("Por favor, digite o nome do cliente!");
        return;
    }
    
    // Salva o nome para usar no envio
    window.nomeClienteSemMesa = nomeCliente;
    fecharModalNomeCliente();
    
    // Agora chama a verificação de bebidas
    verificarBebidasAntesDeEnviar();
}

// --- LÓGICA DO MODAL DE BEBIDAS (ADAPTADA PARA SEM MESA) ---
function fecharModalBebida() {
    document.getElementById('modal-bebida').style.display = 'none';
}

async function verificarBebidasAntesDeEnviar() {
    // Verifica se é SEM MESA (pelo header)
    const mesaTexto = document.getElementById('numero-mesa').innerText;
    const isSemMesa = mesaTexto.includes('Sem Mesa');
    
    // Se for SEM MESA e não tiver nome ainda, pede o nome primeiro
    if (isSemMesa && !window.nomeClienteSemMesa) {
        abrirModalNomeCliente();
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

    // Se só tem bebida no carrinho atual, precisamos checar se o cliente JÁ TEM lanche sendo feito
    if (isSemMesa) {
        // Para SEM MESA: verificar se já existe pedido com comida para este cliente
        try {
            const mesaRef = db.collection("mesas").doc("sem-mesa");
            const pedidosRef = mesaRef.collection("pedidos");
            
            // Busca todos os pedidos deste cliente que ainda não foram finalizados
            const snapshot = await pedidosRef
                .where("nomeCliente", "==", window.nomeClienteSemMesa)
                .where("statusDoPedido", "in", ["ENVIADO", "PREPARANDO"])
                .get();

            let jaExisteLancheSendoFeito = false;

            snapshot.forEach(doc => {
                const dados = doc.data();
                // Verifica se dentro desse pedido antigo existe algum item que não é bebida
                if (dados.itens.some(item => item.categoria !== 'bebidas')) {
                    jaExisteLancheSendoFeito = true;
                }
            });

            if (jaExisteLancheSendoFeito) {
                // Se já tem um lanche lá, pergunta se quer mandar a bebida agora ou com ele
                document.getElementById('modal-bebida').style.display = 'flex';
            } else {
                // Se o cliente não tem comida sendo preparada, manda a bebida direto
                await enviarPedidoFirebase();
            }

        } catch (error) {
            console.error("Erro ao verificar histórico do cliente:", error);
            // Em caso de erro, mostra o modal por segurança
            document.getElementById('modal-bebida').style.display = 'flex';
        }
    } else {
        // Lógica original para mesas normais
        try {
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
}

async function confirmarPedidoComPreferencia() {
    const radioSelected = document.querySelector('input[name="pref-bebida"]:checked');
    window.statusEntregaBebida = radioSelected ? radioSelected.value : "EntregarComLanche";

    fecharModalBebida();
    await enviarPedidoFirebase();
}

// --- FUNÇÃO DE ENVIO PARA FIREBASE (ADAPTADA PARA SEM MESA) ---
// --- FUNÇÃO DE ENVIO PARA FIREBASE (SALVANDO EM mesas/sem-mesa/pedidos) ---
async function enviarPedidoFirebase() {
    const mesaTexto = document.getElementById('numero-mesa').innerText;
    const isSemMesa = mesaTexto.includes('Sem Mesa');
    
    // Referência para mesas/sem-mesa/pedidos
    const mesaRef = db.collection("mesas").doc("sem-mesa");
    const pedidosSemMesaRef = mesaRef.collection("pedidos");

    const itensNovos = alimentos
        .filter(produto => pedidoAtual[produto.id] > 0)
        .map(produto => ({
            nome: produto.nome,
            quantidade: pedidoAtual[produto.id],
            precoUnitario: produto.preco,
            subtotal: produto.preco * pedidoAtual[produto.id],
            categoria: produto.categoria
        }));

    if (itensNovos.length === 0) return;

    let statusFinalBebida = "Nao se aplica";
    const temBebida = itensNovos.some(i => i.categoria === 'bebidas');
    
    if (temBebida) {
        statusFinalBebida = window.statusEntregaBebida || "EntregarAgora";
    }

    try {
        // Primeiro, verifica se o documento "sem-mesa" existe, se não, cria
        const docMesa = await mesaRef.get();
        if (!docMesa.exists) {
            await mesaRef.set({
                nome: "Pedidos Sem Mesa",
                status: "ATIVO",
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Dados base do pedido
        const dadosBase = {
            horario: firebase.firestore.FieldValue.serverTimestamp(),
            statusDoPedido: 'ENVIADO',
            StatusDaBebida: statusFinalBebida,
            nomeCliente: window.nomeClienteSemMesa || "Cliente não identificado",
            tipoPedido: "sem_mesa"
        };

        if (statusFinalBebida === "EntregarAgora") {
            // SEPARA: Cria pedidos diferentes para comida e bebida
            const itensComida = itensNovos.filter(item => item.categoria !== 'bebidas');
            const itensBebida = itensNovos.filter(item => item.categoria === 'bebidas');

            // Se tem comida, cria pedido de comida
            if (itensComida.length > 0) {
                const totalComida = itensComida.reduce((acc, item) => acc + item.subtotal, 0);
                await pedidosSemMesaRef.add({
                    ...dadosBase,
                    itens: itensComida,
                    totalDoPedido: totalComida,
                    StatusDaBebida: "Nao se aplica",
                    tipo: "comida"
                });
            }

            // Se tem bebida, cria pedido de bebida separado
            if (itensBebida.length > 0) {
                const totalBebida = itensBebida.reduce((acc, item) => acc + item.subtotal, 0);
                await pedidosSemMesaRef.add({
                    ...dadosBase,
                    itens: itensBebida,
                    totalDoPedido: totalBebida,
                    StatusDaBebida: "EntregarAgora",
                    tipo: "bebida"
                });
            }
        } else {
            // TUDO JUNTO em um único pedido
            const totalPedido = itensNovos.reduce((acc, item) => acc + item.subtotal, 0);
            await pedidosSemMesaRef.add({
                ...dadosBase,
                itens: itensNovos,
                totalDoPedido: totalPedido,
                tipo: "completo"
            });
        }

        // Limpa variáveis globais
        window.statusEntregaBebida = null;
        window.nomeClienteSemMesa = null;
        
        // Limpa o carrinho atual
        Object.keys(pedidoAtual).forEach(key => pedidoAtual[key] = 0);
        
        alert("Pedido enviado com sucesso!");
        
        // Redireciona de volta para o cardápio sem mesa
        window.location.href = "cardapio-sem-mesa.html";

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro técnico: " + error.message);
    }
}