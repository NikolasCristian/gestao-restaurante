let abaAtual = 'ENVIADO';

function alternarAba(status) {
    abaAtual = status.toUpperCase();
    
    // 1. Limpa a classe active de todos os botões (Usando .aba-item que está no seu HTML)
    document.querySelectorAll('.aba-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 2. Mapeia o status para os IDs que você criou no seu HTML
    let idParaAtivar = '';
    if (abaAtual === 'PRONTO') {
        idParaAtivar = 'aba-preparo'; // ID do seu segundo botão
    } else {
        idParaAtivar = 'aba-novos';   // ID do seu primeiro botão
    }

    // 3. Aplica a classe active no botão correto
    const btnAtivo = document.getElementById(idParaAtivar);
    if (btnAtivo) {
        btnAtivo.classList.add('active');
    }
    carregarPedidos();
}

function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '<p class="msg-status">Buscando...</p>';

    db.collectionGroup('pedidos').onSnapshot(snapshot => {
        lista.innerHTML = '';

        let todosOsPedidos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ref: doc.ref
        }));

        let pedidosFiltrados;

        if (abaAtual === 'PRONTO') {
            pedidosFiltrados = todosOsPedidos.filter(p =>
                p.statusDoPedido === "PRONTO" &&
                p.StatusDaBebida === "Entregue"
            );
        } else {
            // Mostra os dois status na mesma aba de Pendentes
            pedidosFiltrados = todosOsPedidos.filter(p =>
                (p.statusDoPedido === "FALTAoREFRI") || (p.statusDoPedido === "ENVIADO") &&
                p.StatusDaBebida === "EntregarAgora"
            );
        }

        if (pedidosFiltrados.length === 0) {
            lista.innerHTML = `<h2 class="nenhum-pedido">NADA EM ${abaAtual === 'PRONTO' ? 'PRONTO' : 'PENDENTES'}</h2>`;
            return;
        }

        pedidosFiltrados.forEach(pedido => {
            const temBebida = pedido.itens && pedido.itens.some(item => item.categoria === 'bebidas');
            if (temBebida) {
                const mesaId = pedido.ref.parent.parent.id;
                renderizarLinhaPedido(mesaId, pedido, pedido.id);
            }
        });
    });
}

function renderizarLinhaPedido(mesaId, pedido, pedidoId) {
    const lista = document.getElementById('lista-pedidos');

    // Cor padrão: Azul para Pendentes, Verde para Pronto
    const corPadrao = (abaAtual === 'PRONTO') ? '#2ecc71' : '#3498db';
    const numeroMesa = mesaId.replace('mesa-', '');

    const itemHTML = `
        <div class="item-pedido-lista" id="ped-${pedidoId}" style="border-left: 6px solid ${corPadrao}; margin-bottom: 10px;">
            <div class="mesa-indicador" style="background:${corPadrao}; color:white;">
                ${numeroMesa}
            </div>
            <button class="btn-ver" onclick="abrirDetalhesBarman('${mesaId}', '${pedidoId}')">VER</button>
        </div>
    `;
    lista.innerHTML += itemHTML;
}

function abrirDetalhesBarman(mesaId, pedidoId) {
    window.location.href = `barman-pedidos.html?mesa=${mesaId}&pedido=${pedidoId}`;
}

carregarPedidos();