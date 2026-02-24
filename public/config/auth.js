// config/auth.js

const firebaseConfig = {
    apiKey: "AIzaSyAyL-IOIAn0b9c57IbrAF2H_M_FmAohgDg",
    authDomain: "restaurante-bc6f4.firebaseapp.com",
    projectId: "restaurante-bc6f4",
    storageBucket: "restaurante-bc6f4.firebasestorage.app",
    messagingSenderId: "430254618723",
    appId: "1:430254618723:web:fffa89da1ef65c9d70a056",
    measurementId: "G-EQX2Y0EDKC"
};

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Variáveis Globais
const auth = firebase.auth();
const db = firebase.firestore();

// 1. CONFIGURAÇÃO DE PERMISSÕES
const permissoes = {
    'GERENTE': ['gerente.html', 'cadastrar-funcionario.html', 'consultar-funcionario.html', 'mesas.html', 'sem-mesas.html'],
    'GARCOM': ['garcom.html', 'cardapio.html', 'garcom-pedidos.html', 'cozinha.html', 'detalhes-pedido.html', 'barman.html', 'barman-pedidos.html', 'gerente.html', 'mesas.html', 'cardapio-sem-mesa.html', 'sem-mesas.html', 'detalhes-pedido-sem-mesa.html'],
    'COZINHA': ['cozinha.html', 'detalhes-pedido.html'],
    'BARMAN': ['barman.html', 'barman-pedidos.html']
};

// 2. VERIFICAÇÃO DE SESSÃO ATIVA (O "Vigia" Universal)
auth.onAuthStateChanged(async (user) => {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';

    if (!user) {
        // Se não houver usuário e não estiver na index, volta para o login
        if (paginaAtual !== 'index.html') {
            window.location.replace('index.html');
        }
    } else {
        try {
            // Referência do documento antes de qualquer ação
            const userRef = db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const dados = userDoc.data();

                // === A ARMADILHA: AUTO-EXCLUSÃO TOTAL ===
                // No seu ficheiro auth.js, dentro do onAuthStateChanged
                // === A ARMADILHA: AUTO-EXCLUSÃO TOTAL (CORRIGIDA) ===
                if (dados.status === "DELETAR_CONTA") {
                    console.warn("⚠️ Conta marcada para remoção definitiva...");

                    try {
                        // 1. APAGA NO FIRESTORE PRIMEIRO
                        // Enquanto o usuário ainda existe no Auth, ele tem permissão de apagar o próprio doc
                        await db.collection('users').doc(user.uid).delete();
                        console.log("✅ Firestore: Documento apagado.");

                        // 2. APAGA NO AUTHENTICATION DEPOIS
                        await user.delete();
                        console.log("✅ Auth: Usuário removido definitivamente.");

                        window.location.replace('index.html?msg=conta_excluida');
                        return;

                    } catch (error) {
                        console.error("Erro no processo de exclusão:", error);

                        // Caso de sessão antiga (Segurança do Firebase)
                        if (error.code === 'auth/requires-recent-login') {
                            alert("Por segurança, faça login novamente para confirmar a exclusão da sua conta.");
                        }

                        // Em qualquer erro, desloga para evitar loop infinito
                        await auth.signOut();
                        window.location.replace('index.html?error=reauth');
                        return;
                    }
                }

                // === BLOQUEIO SIMPLES (INATIVO) ===
                if (dados.status === "INATIVO") {
                    console.error("Usuário desativado!");
                    await auth.signOut();
                    window.location.replace('index.html?error=blocked');
                    return;
                }

                // === REDIRECIONAMENTO POR CARGO E PERMISSÕES ===
                const tipoUsuario = dados.type ? dados.type.toUpperCase() : null;
                const paginasAutorizadas = permissoes[tipoUsuario];

                if (!tipoUsuario || !paginasAutorizadas) {
                    await auth.signOut();
                    window.location.replace('index.html?error=no_role');
                    return;
                }

                const homeDoCargo = paginasAutorizadas[0];

                // Se estiver no login mas já estiver logado, vai para a home do cargo
                if (paginaAtual === 'index.html') {
                    window.location.replace(homeDoCargo);
                    return;
                }

                // Proteção de Rota: Se tentar acessar página não autorizada
                if (!paginasAutorizadas.includes(paginaAtual)) {
                    window.location.replace(homeDoCargo);
                }

            } else {
                // Se o documento não existe no Firestore (excluído manualmente), limpa a sessão
                console.warn("Usuário sem documento no banco. Deslogando...");
                await auth.signOut();
                window.location.replace('index.html');
            }
        } catch (error) {
            console.error("Erro na validação de segurança:", error);
        }
    }
});

// 3. FUNÇÃO DE LOGOUT
window.logout = async () => {
    try {
        await auth.signOut();
        window.location.replace('index.html');
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
};