// Controle de IDs para não repetir o alerta
if (typeof pedidosNovosAlertados === 'undefined') {
    var pedidosNovosAlertados = new Set();
}

let cargaInicialCozinha = true;

function monitorarPedidosNovosCozinha() {
    console.log("Monitor da Cozinha iniciado (Filtro: Apenas Comida)...");

    db.collection('mesas').onSnapshot(snapshotMesas => {
        snapshotMesas.forEach(docMesa => {
            const numMesa = docMesa.data().numero;

            db.collection('mesas').doc(docMesa.id).collection('pedidos')
                .where("statusDoPedido", "==", "ENVIADO")
                .onSnapshot(snapshot => {

                    if (cargaInicialCozinha) {
                        snapshot.forEach(doc => pedidosNovosAlertados.add(doc.id));
                        return;
                    }

                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added") {
                            const pedidoId = change.doc.id;
                            const dadosPedido = change.doc.data();
                            const itens = dadosPedido.itens || [];

                            // VERIFICAÇÃO: Existe algum item que NÃO seja bebida?
                            const temComida = itens.some(item =>
                                item.categoria && item.categoria.toUpperCase() !== "BEBIDAS" &&
                                item.categoria.toUpperCase() !== "BEBIDA"
                            );

                            if (!pedidosNovosAlertados.has(pedidoId)) {
                                // Só apita se houver comida no pedido
                                if (temComida) {
                                    alertarCozinhaNovoPedido(numMesa);
                                } else {
                                    console.log(`Pedido ${pedidoId} ignorado pela cozinha (apenas bebidas).`);
                                }
                                pedidosNovosAlertados.add(pedidoId);
                            }
                        }
                    });
                });
        });

        setTimeout(() => { cargaInicialCozinha = false; }, 2000);
    });
}

function alertarCozinhaNovoPedido(numeroMesa) {
    // 1. Som de "Campainha de Pedido" (Som diferente do garçom para não confundir)
    const audioCozinha = new Audio('https://assets.mixkit.co/active_storage/sfx/1052/1052-preview.mp3');
    audioCozinha.play().catch(e => console.log("Aguardando interação para som."));

    // 2. Banner Visual na tela da cozinha
    const bannerCozinha = document.createElement('div');
    bannerCozinha.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; 
        background: #e67e22; color: #fff; padding: 25px;
        text-align: center; font-weight: 900; z-index: 10000;
        border-bottom: 5px solid #000; font-family: sans-serif;
        font-size: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;
    bannerCozinha.innerHTML = `👨‍🍳 NOVO PEDIDO: MESA ${numeroMesa}!`;

    document.body.appendChild(bannerCozinha);

    // Remove após 10 segundos ou ao clicar
    bannerCozinha.onclick = () => bannerCozinha.remove();
    setTimeout(() => { if (bannerCozinha) bannerCozinha.remove(); }, 10000);
}

// Inicia o monitor
monitorarPedidosNovosCozinha();