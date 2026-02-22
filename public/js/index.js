// js/index.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('error') === 'blocked') {
        alert("🚫 Sua conta foi desativada. Entre em contato com o gerente.");
    }

    if (urlParams.get('msg') === 'conta_excluida') {
        alert("✅ Sua conta e seus dados foram removidos com sucesso.");
    }
    
    if (urlParams.get('error') === 'reauth') {
        alert("⚠️ Por segurança, faça login novamente para confirmar a exclusão da conta.");
    }
});

async function login() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const btnEntrar = document.querySelector('button');

    if (!email || !senha) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "CARREGANDO...";

        // 1. Tenta o Login no Authentication
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;

        // 2. Busca o documento na coleção 'users'
        const doc = await db.collection('users').doc(user.uid).get();

        if (doc.exists) {
            const data = doc.data();
            
            // VERIFICAÇÃO DA ARMADILHA: Se ele logar e o status for deletar, 
            // não deixa ele entrar e deixa o auth.js agir.
            if (data.status === "DELETAR_CONTA") {
                alert("⚠️ Esta conta está sendo removida do sistema...");
                return; 
            }

            if (!data.type) {
                alert("Erro: Perfil sem cargo definido. Contate o gerente.");
                await auth.signOut();
                location.reload();
                return;
            }

            const tipoUsuario = data.type.toUpperCase();
            
            // 3. Define o destino baseado nas permissões do config.js
            if (permissoes && permissoes[tipoUsuario]) {
                const destino = permissoes[tipoUsuario][0];
                window.location.replace(destino);
            } else {
                alert("Cargo não reconhecido pelo sistema!");
                await auth.signOut();
                location.reload();
            }
            
        } else {
            // CASO ESPECIAL: O Doc não existe mas o Auth existe (Exclusão em andamento)
            alert("❌ Esta conta não existe mais no banco de dados.");
            
            // Tentativa de auto-limpeza do e-mail que sobrou
            try {
                await user.delete();
            } catch (e) {
                await auth.signOut();
            }
            location.reload();
        }

    } catch (error) {
        btnEntrar.disabled = false;
        btnEntrar.textContent = "ENTRAR";

        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            alert("E-mail ou senha incorretos!");
        } else if (error.code === 'auth/too-many-requests') {
            alert("Muitas tentativas falhas. Tente novamente mais tarde.");
        } else {
            alert("Erro ao entrar: Verifique sua conexão.");
        }
    }
}