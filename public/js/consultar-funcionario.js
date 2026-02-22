// js/consultar-funcionario.js

document.addEventListener('DOMContentLoaded', () => {
    const tabela = document.getElementById('tabela-funcionarios');
    const formEditar = document.getElementById('form-editar');

    // 1. LISTAGEM EM TEMPO REAL
    db.collection('users').onSnapshot((snapshot) => {
        tabela.innerHTML = '';
        let encontrouAlguem = false;

        snapshot.forEach((doc) => {
            const f = doc.data();

            // LÓGICA DE EXCLUSÃO: Se estiver marcado para DELETAR, não aparece na lista
            if (f.status === "DELETAR_CONTA") return;

            encontrouAlguem = true;
            const tr = document.createElement('tr');
            const cargo = f.type ? f.type.toUpperCase() : 'FUNC';

            // Define a cor da badge baseada no cargo
            let badgeClass = 'badge-garcom';
            if (cargo === 'GERENTE') badgeClass = 'badge-gerente';
            else if (cargo === 'BARMAN') badgeClass = 'badge-barman';
            else if (cargo === 'COZINHA') badgeClass = 'badge-cozinha';

            tr.innerHTML = `
                <td><strong>${f.nome}</strong></td>
                <td>${f.email}</td>
                <td><span class="badge ${badgeClass}">${cargo}</span></td>
                <td>
                    <div class="acoes-container">
                        <button class="btn-tabela-editar" title="Editar" onclick="abrirModalEditar('${doc.id}', '${f.nome}', '${f.type}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-tabela-excluir" title="Remover" onclick="excluirFunc('${doc.id}', '${f.nome}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            tabela.appendChild(tr);
        });

        if (!encontrouAlguem) {
            tabela.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum funcionário encontrado.</td></tr>';
        }
    });

    // 2. SALVAR EDIÇÃO
    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uid = document.getElementById('edit-uid').value;
            const novoNome = document.getElementById('edit-nome').value;
            const novoCargo = document.getElementById('edit-cargo').value;

            try {
                await db.collection('users').doc(uid).update({
                    nome: novoNome,
                    type: novoCargo
                });
                fecharModal();
                alert("✅ Dados atualizados com sucesso!");
            } catch (error) {
                console.error("Erro ao atualizar:", error);
                alert("❌ Erro ao atualizar funcionário.");
            }
        });
    }
});

// === FUNÇÕES GLOBAIS ===

window.excluirFunc = async (uid, nome) => {
    const confirma = confirm(`🚨 EXCLUSÃO PERMANENTE\n\nDeseja remover ${nome}?\nO acesso será bloqueado e a conta apagada.`);

    if (confirma) {
        try {
            // Apenas altera o status para o "Vigia" no auth.js detetar e apagar
            await db.collection('users').doc(uid).update({
                status: "DELETAR_CONTA"
            });
            alert("✅ Funcionário removido da lista!");
        } catch (error) {
            console.error("Erro ao remover:", error);
            alert("❌ Erro ao tentar remover.");
        }
    }
};

window.abrirModalEditar = (uid, nome, cargo) => {
    document.getElementById('edit-uid').value = uid;
    document.getElementById('edit-nome').value = nome;
    document.getElementById('edit-cargo').value = cargo;
    document.getElementById('modalEditar').style.display = 'block';
};

window.fecharModal = () => {
    document.getElementById('modalEditar').style.display = 'none';
};