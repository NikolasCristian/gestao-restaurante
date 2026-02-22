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

function verificarBebidasAntesDeEnviar() {
    const temBebida = alimentos.some(p => pedidoAtual[p.id] > 0 && p.categoria === 'bebidas');

    if (temBebida) {
        document.getElementById('modal-bebida').style.display = 'flex';
    } else {
        enviarPedidoFirebase();
    }
}

async function confirmarPedidoComPreferencia() {
    const radioSelected = document.querySelector('input[name="pref-bebida"]:checked');
    window.preferenciaBebida = radioSelected ? radioSelected.value : "Não informado";

    fecharModalBebida();
    await enviarPedidoFirebase();
}

// --- FUNÇÃO DE ENVIO PARA FIREBASE ---

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
            categoria: produto.categoria,
            observacao: produto.categoria === 'bebidas' ? (window.preferenciaBebida || "") : ""
        }));

    if (itensNovos.length === 0) return;

    const totalPedidoAtual = itensNovos.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        const docMesa = await mesaRef.get();
        const mesaJaOcupada = docMesa.exists && docMesa.data().status === "OCUPADA";

        // 1. Salva na subcoleção de pedidos
        await subcolecaoPedidos.add({
            itens: itensNovos,
            totalDoPedido: totalPedidoAtual,
            horario: firebase.firestore.FieldValue.serverTimestamp(),
            statusDoPedido: 'ENVIADO'
        });

        // 2. Atualiza os dados da mesa
        const dadosUpdate = {
            valor: firebase.firestore.FieldValue.increment(totalPedidoAtual),
            status: "OCUPADA"
        };

        if (!mesaJaOcupada) {
            dadosUpdate.horario_inicio = firebase.firestore.FieldValue.serverTimestamp();
        }

        await mesaRef.update(dadosUpdate);

        // Limpa a variável global e o pedido
        window.preferenciaBebida = null;
        alert("Pedido enviado com sucesso!");
        
        fecharModal();
        window.location.href = "garcom.html";

    } catch (error) {
        console.error("Erro ao salvar pedido:", error);
        alert("Erro técnico ao salvar o pedido.");
    }
}