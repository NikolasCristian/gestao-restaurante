// Controle de IDs para não repetir o alerta no Garçom
if (typeof pedidosProntosAlertados === 'undefined') {
    var pedidosProntosAlertados = new Set();
}

let cargaInicialGarcom = true;

function monitorarPedidosProntosGarcom() {
    console.log("Monitor do Garçom iniciado...");

    // Monitora todas as mesas para ver o que sai da cozinha
    db.collection('mesas').onSnapshot(snapshotMesas => {
        snapshotMesas.forEach(docMesa => {
            const numMesa = docMesa.data().numero;
            const mesaId = docMesa.id;

            // Monitora apenas pedidos que mudarem para "PRONTO"
            db.collection('mesas').doc(mesaId).collection('pedidos')
                .where("statusDoPedido", "==", "PRONTO")
                .onSnapshot(snapshot => {
                    
                    // Na primeira carga (quando abre a página), apenas memoriza o que já está pronto
                    if (cargaInicialGarcom) {
                        snapshot.forEach(doc => pedidosProntosAlertados.add(doc.id));
                        return;
                    }

                    snapshot.docChanges().forEach(change => {
                        // Detecta quando um pedido NOVO entra no status PRONTO
                        if (change.type === "added" || change.type === "modified") {
                            const pedidoId = change.doc.id;

                            if (!pedidosProntosAlertados.has(pedidoId)) {
                                alertarGarcomPedidoPronto(numMesa);
                                pedidosProntosAlertados.add(pedidoId);
                            }
                        }
                    });
                });
        });

        // Libera os alertas após 2 segundos para evitar o barulho ao carregar a página
        setTimeout(() => { cargaInicialGarcom = false; }, 2000);
    });
}

function alertarGarcomPedidoPronto(numeroMesa) {
    // 1. Som de Notificação (Diferente da cozinha para o garçom identificar pelo ouvido)
    const audioGarcom = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioGarcom.play().catch(e => console.log("Aguardando interação para tocar som."));

    // 2. Vibração (Essencial para o garçom que está com o celular no bolso)
    if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]); // Vibração tripla
    }

    // 3. Banner Visual (Verde para indicar sucesso/entrega)
    const bannerGarcom = document.createElement('div');
    bannerGarcom.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; 
        background: #2ecc71; color: #fff; padding: 25px;
        text-align: center; font-weight: 900; z-index: 10000;
        border-bottom: 5px solid #000; font-family: sans-serif;
        font-size: 1.3rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;
    bannerGarcom.innerHTML = `✅ MESA ${numeroMesa} PRONTA PARA ENTREGA!`;
    
    document.body.appendChild(bannerGarcom);

    // Remove após 8 segundos ou ao clicar
    bannerGarcom.onclick = () => bannerGarcom.remove();
    setTimeout(() => { if(bannerGarcom) bannerGarcom.remove(); }, 8000);
}

// Inicia o monitor do garçom
monitorarPedidosProntosGarcom();