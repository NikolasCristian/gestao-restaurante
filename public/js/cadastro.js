document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastro');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Captura de Dados
        const nome = document.getElementById('nome')?.value.trim() || '';
        const cargo = document.getElementById('cargo')?.value.toUpperCase() || '';
        const email = document.getElementById('email')?.value.trim() || '';
        const senha = document.getElementById('senha')?.value || '';
        const confirmarSenha = document.getElementById('confirmar-senha')?.value || '';

        if (cargo === 'GARÇOM') {
            cargo = 'GARCOM';
        }
        
        // 2. Validações básicas
        if (senha !== confirmarSenha) {
            alert('⚠️ As senhas não coincidem!');
            return;
        }

        if (senha.length < 6) {
            alert('⚠️ A senha deve ter no mínimo 6 caracteres!');
            return;
        }

        const confirmacao = confirm(`Deseja realmente cadastrar ${nome} como ${cargo}?`);
        if (!confirmacao) return;

        const btnSubmit = form.querySelector('button[type="submit"]');
        let secondaryApp; // Variável para a instância secundária

        try {
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = '⏳ CADASTRANDO...';
            }

            // === O PULO DO GATO: INSTÂNCIA SECUNDÁRIA ===
            // Isso cria uma "bolha" para o novo cadastro sem afetar o login do Gerente
            const config = firebase.app().options;
            secondaryApp = firebase.initializeApp(config, "Secondary");

            // 3. Criação no Auth da instância secundária
            const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, senha);
            const user = userCredential.user;

            // 4. Salvar no Firestore (Usando a instância PRINCIPAL para ter permissão)
            // USE O DB PRINCIPAL (onde o gerente está logado)
            await db.collection('users').doc(user.uid).set({
                nome: nome,
                email: email.toLowerCase(),
                type: cargo,
                status: "ATIVO",
                uid: user.uid
            });

            // 5. Finalização
            alert('✅ FUNCIONÁRIO CADASTRADO COM SUCESSO!\n(Você continua logado como Gerente)');

            // Limpa a instância secundária da memória
            await secondaryApp.delete();

            window.location.replace('gerente.html');

        } catch (error) {
            // Se houver erro, deletamos a instância secundária se ela existir
            if (secondaryApp) await secondaryApp.delete();

            // Tratamento amigável de erros
            if (error.code === 'auth/email-already-in-use') {
                alert('❌ Este e-mail já está em uso!');
            } else if (error.code === 'auth/invalid-email') {
                alert('❌ Formato de e-mail inválido!');
            } else {
                alert('❌ Erro ao cadastrar: ' + error.message);
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'SALVAR CADASTRO';
            }
        }
    });
});