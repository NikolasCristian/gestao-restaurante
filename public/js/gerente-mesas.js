const gridMesas = document.getElementById('grid-lista-mesas');

// Função para Adicionar Mesa
document.getElementById('form-add-mesa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const numero = document.getElementById('num-mesa').value;
    const docId = `mesa-${numero}`;

    try {
        await db.collection('mesas').doc(docId).set({
            numero: parseInt(numero),
            status: "LIVRE",
            valor: 0,
            tempo: ""
        });
        alert(`Mesa ${numero} criada com sucesso!`);
        e.target.reset();
    } catch (error) {
        alert("Erro ao criar mesa: " + error.message);
    }
});

// Função para Listar e Excluir Mesas (Tempo Real)
db.collection('mesas').orderBy('numero', 'asc').onSnapshot((snapshot) => {
    gridMesas.innerHTML = '';
    snapshot.forEach((doc) => {
        const mesa = doc.data();
        // Exemplo de como deve ser gerado o HTML da mesa no JS
        gridMesas.innerHTML += `
    <div class="stat-item-mesa">
        <button class="btn-excluir-mesa" onclick="excluirMesa('${doc.id}')">
            <i class="fas fa-times"></i>
        </button>
        <span class="num">${mesa.numero}</span>
    </div>
`;
    });
});

async function excluirMesa(id) {
    if (!confirm("Deseja remover esta mesa e todos os pedidos dela permanentemente?")) return;

    try {
        const batch = db.batch(); // Cria um lote de operações
        
        // 1. Referência da subcoleção
        const pedidosRef = db.collection('mesas').doc(id).collection('pedidos');
        const snapshotPedidos = await pedidosRef.get();

        // 2. Adiciona cada deleção de pedido ao lote
        snapshotPedidos.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 3. Adiciona a deleção da mesa ao lote
        const mesaRef = db.collection('mesas').doc(id);
        batch.delete(mesaRef);

        // 4. Executa tudo de uma vez
        await batch.commit();

        alert("Mesa removida com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir mesa:", error);
        alert("Erro técnico ao excluir: " + error.message);
    }
}