// Variável global para evitar alertas duplicados na mesma sessão
if (typeof pedidosJaAlertados === 'undefined') {
    var pedidosJaAlertados = new Set();
}

function monitorarPedidosProntosGlobal() {
    console.log("Monitor de notificações iniciado...");

    db.collection('mesas').onSnapshot(snapshotMesas => {
        snapshotMesas.forEach(docMesa => {
            const numMesa = docMesa.data().numero;
            const mesaId = docMesa.id;

            // Monitora pedidos PRONTOS de cada mesa
            db.collection('mesas').doc(mesaId).collection('pedidos')
                .where("statusDoPedido", "==", "PRONTO")
                .onSnapshot(snapshotPedidos => {
                    snapshotPedidos.docChanges().forEach(change => {
                        // Detecta quando o status muda para PRONTO (novo na lista)
                        if (change.type === "added") {
                            const pedidoId = change.doc.id;

                            if (!pedidosJaAlertados.has(pedidoId)) {
                                dispararAlertaVisualESonoro(numMesa);
                                pedidosJaAlertados.add(pedidoId);
                            }
                        }
                    });
                });
        });
    });
}

function dispararAlertaVisualESonoro(numeroMesa) {
    // 1. Vibração
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);

    // 2. Som
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => console.log("Áudio aguardando interação do usuário."));

    // 3. Banner Visual (Burger King Style)
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; 
        background: #2ecc71; color: #000; padding: 20px;
        text-align: center; font-weight: 900; z-index: 10000;
        border-bottom: 5px solid #000; font-family: sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        animation: slideDown 0.4s ease-out;
    `;
    banner.innerHTML = `🔔 MESA ${numeroMesa} ESTÁ PRONTA! <br> <small>Clique para fechar</small>`;
    
    document.body.appendChild(banner);
    banner.onclick = () => banner.remove();
    setTimeout(() => banner.remove(), 8000);
}

// Inicia automaticamente ao carregar o script
monitorarPedidosProntosGlobal();