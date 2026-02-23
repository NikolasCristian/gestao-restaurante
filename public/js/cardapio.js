// Objeto global para armazenar as quantidades selecionadas { id: quantidade }
const pedidoAtual = {};

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

// --- LÓGICA DO MODAL DE BEBIDAS ---

function fecharModalBebida() {
    document.getElementById('modal-bebida').style.display = 'none';
}

async function verificarBebidasAntesDeEnviar() {
    // 1. Verifica se há bebidas no pedido ATUAL que está sendo feito agora
    const temBebidaNoPedidoAtual = alimentos.some(p => pedidoAtual[p.id] > 0 && p.categoria === 'bebidas');

    // 2. Verifica se há comida (lanche/pizza) no pedido ATUAL
    const temComidaNoPedidoAtual = alimentos.some(p => pedidoAtual[p.id] > 0 && p.categoria !== 'bebidas');

    // Se não tem bebida nenhuma sendo pedida agora, envia direto (comida pura)
    if (!temBebidaNoPedidoAtual) {
        await enviarPedidoFirebase();
        return;
    }

    // Se tem bebida e TAMBÉM tem comida no mesmo carrinho, mostra o modal
    if (temComidaNoPedidoAtual) {
        document.getElementById('modal-bebida').style.display = 'flex';
        return;
    }

    // Se só tem bebida no carrinho atual, precisamos checar se a mesa JÁ TEM lanche sendo feito na cozinha
    try {
        const mesaTexto = document.getElementById('numero-mesa').innerText;
        const numeroMesa = mesaTexto.replace('Mesa ', '').trim();
        const mesaRef = db.collection("mesas").doc(`mesa-${numeroMesa}`);

        // Busca todos os pedidos dessa mesa que ainda não foram finalizados
        const snapshot = await mesaRef.collection("pedidos")
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
            // Se a mesa está vazia de comida, manda a bebida direto
            await enviarPedidoFirebase();
        }

    } catch (error) {
        console.error("Erro ao verificar histórico da mesa:", error);
        // Em caso de erro, por segurança, envia o pedido
        await enviarPedidoFirebase();
    }
}

async function confirmarPedidoComPreferencia() {
    const radioSelected = document.querySelector('input[name="pref-bebida"]:checked');

    // Captura o valor direto do HTML (EntregarComLanche ou EntregarAgora)
    window.statusEntregaBebida = radioSelected ? radioSelected.value : "EntregarComLanche";

    fecharModalBebida();
    await enviarPedidoFirebase();
}

// --- FUNÇÃO DE ENVIO PARA FIREBASE (MODIFICADA PARA SEPARAR PEDIDOS) ---

async function enviarPedidoFirebase() {
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

    if (itensNovos.length === 0) return;

    // Lógica automática para definir o StatusDaBebida caso o modal não tenha sido aberto
    let statusFinalBebida = "Nao se aplica";
    const temBebida = itensNovos.some(i => i.categoria === 'bebidas');
    
    if (temBebida) {
        // Se o garçom escolheu no modal, usa a escolha. Se não, e tem bebida, assume EntregarAgora
        statusFinalBebida = window.statusEntregaBebida || "EntregarAgora";
    }

    const totalPedidoAtual = itensNovos.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        const docMesa = await mesaRef.get();
        const mesaJaOcupada = docMesa.exists && docMesa.data().status === "OCUPADA";

        // LÓGICA CORRIGIDA: 
        // Se for "EntregarAgora" -> SEPARA os pedidos (bebida em um, comida em outro)
        // Se for "EntregarComLanche" -> JUNTA tudo no mesmo pedido
        if (statusFinalBebida === "EntregarAgora") {
            // SEPARA: Cria pedidos diferentes para comida e bebida
            const itensComida = itensNovos.filter(item => item.categoria !== 'bebidas');
            const itensBebida = itensNovos.filter(item => item.categoria === 'bebidas');

            // Se tem comida, cria pedido de comida (vai para a cozinha)
            if (itensComida.length > 0) {
                const totalComida = itensComida.reduce((acc, item) => acc + item.subtotal, 0);
                await subcolecaoPedidos.add({
                    itens: itensComida,
                    totalDoPedido: totalComida,
                    horario: firebase.firestore.FieldValue.serverTimestamp(),
                    statusDoPedido: 'ENVIADO',
                    StatusDaBebida: "Nao se aplica", // Comida não tem status de bebida
                    tipo: "comida"
                });
            }

            // Se tem bebida, cria pedido de bebida separado (vai para o bar)
            if (itensBebida.length > 0) {
                const totalBebida = itensBebida.reduce((acc, item) => acc + item.subtotal, 0);
                await subcolecaoPedidos.add({
                    itens: itensBebida,
                    totalDoPedido: totalBebida,
                    horario: firebase.firestore.FieldValue.serverTimestamp(),
                    statusDoPedido: 'ENVIADO',
                    StatusDaBebida: "EntregarAgora", // Bebida vai agora
                    tipo: "bebida"
                });
            }
        } else {
            // Comportamento para "EntregarComLanche": TUDO JUNTO em um único pedido
            await subcolecaoPedidos.add({
                itens: itensNovos,
                totalDoPedido: totalPedidoAtual,
                horario: firebase.firestore.FieldValue.serverTimestamp(),
                statusDoPedido: 'ENVIADO',
                StatusDaBebida: "EntregarComLanche", // Bebida vai junto com o lanche
                tipo: "completo"
            });
        }

        // Atualiza a mesa (valor total e status)
        const dadosUpdate = {
            valor: firebase.firestore.FieldValue.increment(totalPedidoAtual),
            status: "OCUPADA"
        };

        if (!mesaJaOcupada) {
            dadosUpdate.horario_inicio = firebase.firestore.FieldValue.serverTimestamp();
        }

        await mesaRef.update(dadosUpdate);

        // Limpa variáveis globais
        window.statusEntregaBebida = null;
        
        // Limpa o carrinho atual
        Object.keys(pedidoAtual).forEach(key => pedidoAtual[key] = 0);
        
        alert("Pedido(s) enviado(s) com sucesso!");
        window.location.href = "garcom.html";

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro técnico.");
    }
}