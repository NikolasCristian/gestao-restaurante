// js/index.js

// ==================== VERIFICAÇÃO INICIAL ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Página carregada - inicializando...');
    
    // ===== RECUPERAR ESTADO DO COOLDOWN DO localStorage =====
    recuperarEstadoCooldown();
    
    // Verificar parâmetros da URL
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
    
    // Configurar eventos do modal
    configurarModal();
    
    // Verificar se já está logado
    verificarSessaoExistente();
});

// ==================== CONTROLE DE SPAM COM PERSISTÊNCIA ====================
let tentativasEnvio = 0;
const MAX_TENTATIVAS = 3;
const TEMPO_ESPERA = 30000; // 30 segundos
let ultimoEnvio = 0;
let cooldownAtivo = false;
let timerInterval = null;

// Recuperar estado do cooldown do localStorage
function recuperarEstadoCooldown() {
    const savedCooldown = localStorage.getItem('cooldownRecuperacao');
    
    if (savedCooldown) {
        const cooldownData = JSON.parse(savedCooldown);
        const agora = Date.now();
        const tempoPassado = agora - cooldownData.ultimoEnvio;
        
        if (tempoPassado < TEMPO_ESPERA) {
            // Cooldown ainda ativo
            ultimoEnvio = cooldownData.ultimoEnvio;
            tentativasEnvio = cooldownData.tentativas;
            cooldownAtivo = true;
            
            console.log(`🔄 Cooldown recuperado: ${Math.ceil((TEMPO_ESPERA - tempoPassado)/1000)}s restantes`);
        } else {
            // Cooldown expirado - limpar
            localStorage.removeItem('cooldownRecuperacao');
            console.log('✅ Cooldown expirado, resetado');
        }
    }
}

// Salvar estado do cooldown
function salvarEstadoCooldown() {
    const cooldownData = {
        ultimoEnvio: ultimoEnvio,
        tentativas: tentativasEnvio,
        timestamp: Date.now()
    };
    localStorage.setItem('cooldownRecuperacao', JSON.stringify(cooldownData));
}

// Limpar estado do cooldown
function limparEstadoCooldown() {
    localStorage.removeItem('cooldownRecuperacao');
    tentativasEnvio = 0;
    ultimoEnvio = 0;
    cooldownAtivo = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ==================== ELEMENTOS DO MODAL ====================
const modal = document.getElementById('forgotModal');
const closeBtn = document.querySelector('.close');
const forgotLink = document.getElementById('forgotPassword');
const resetBtn = document.getElementById('resetBtn');
const modalMessage = document.getElementById('modalMessage');
const resetEmail = document.getElementById('resetEmail');

// ==================== CONFIGURAÇÃO DO MODAL ====================
function configurarModal() {
    // Abrir modal
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModal();
        });
    }

    // Fechar modal
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            fecharModal();
        });
    }

    // Fechar ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            fecharModal();
        }
    });
}

function abrirModal() {
    if (!modal) return;
    
    modal.style.display = 'block';
    resetEmail.value = '';
    modalMessage.style.display = 'none';
    modalMessage.className = 'modal-message';
    resetBtn.classList.remove('loading');
    
    // Verificar cooldown ao abrir o modal
    verificarCooldown();
}

function fecharModal() {
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==================== FUNÇÃO DE LOGIN ====================
async function login() {
    // Captura os elementos corretamente
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const btnEntrar = document.querySelector('button');

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    try {
        // Inicia estado de carregamento
        btnEntrar.disabled = true;
        btnEntrar.textContent = "CARREGANDO...";

        // USAR as variáveis globais do auth.js
        if (typeof auth === 'undefined') {
            throw new Error('auth não está definido');
        }

        // 1. Tenta o Login no Authentication
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;

        // 2. Busca o documento na coleção 'users'
        const doc = await db.collection('users').doc(user.uid).get();

        if (doc.exists) {
            const data = doc.data();

            // VERIFICAÇÃO DA ARMADILHA
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

            // 3. Redirecionamento baseado no cargo (config.js)
            if (typeof permissoes !== 'undefined' && permissoes[tipoUsuario]) {
                const destino = permissoes[tipoUsuario][0];
                window.location.replace(destino);
            } else {
                alert("Cargo não reconhecido ou permissões não carregadas!");
                await auth.signOut();
                location.reload();
            }

        } else {
            alert("❌ Esta conta não existe mais no banco de dados.");
            try {
                await user.delete();
            } catch (e) {
                await auth.signOut();
            }
            location.reload();
        }

    } catch (error) {
        // RESETAR BOTÃO EM CASO DE ERRO
        btnEntrar.disabled = false;
        btnEntrar.textContent = "ENTRAR";

        console.error("Erro detalhado:", error.code, error.message);

        // Tratamento de erros específicos do Firebase
        if (error.code === 'auth/wrong-password' || 
            error.code === 'auth/user-not-found' || 
            error.code === 'auth/invalid-credential' || 
            error.code === 'auth/invalid-email') {
            alert("E-mail ou senha incorretos!");
        } else if (error.code === 'auth/too-many-requests') {
            alert("Muitas tentativas falhas. Sua conta foi temporariamente bloqueada. Tente novamente mais tarde.");
        } else {
            alert("Erro ao entrar: " + error.message);
        }
    }
}

// ==================== FUNÇÃO DE RECUPERAÇÃO DE SENHA ====================
async function enviarRecuperacao() {
    if (!resetEmail) return;
    
    const email = resetEmail.value.trim();
    
    // ===== VALIDAÇÕES =====
    if (!email) {
        mostrarMensagem('❌ Digite seu e-mail', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensagem('❌ E-mail inválido', 'error');
        return;
    }
    
    // ===== VERIFICAR COOLDOWN =====
    if (cooldownAtivo) {
        const tempoRestante = Math.ceil((TEMPO_ESPERA - (Date.now() - ultimoEnvio)) / 1000);
        mostrarMensagem(`⏳ Aguarde ${tempoRestante}s`, 'info');
        return;
    }
    
    // ===== VERIFICAR NÚMERO DE TENTATIVAS =====
    if (tentativasEnvio >= MAX_TENTATIVAS) {
        mostrarMensagem('⚠️ Limite de tentativas atingido', 'error');
        resetBtn.disabled = true;
        return;
    }
    
    // ===== ATIVAR LOADING =====
    resetBtn.classList.add('loading');
    resetBtn.disabled = true;
    
    try {
        // ATUALIZAR CONTROLES DE SPAM
        tentativasEnvio++;
        ultimoEnvio = Date.now();
        cooldownAtivo = true;
        
        // Salvar no localStorage
        salvarEstadoCooldown();
        
        // VERIFICAR FIREBASE
        if (typeof auth === 'undefined') {
            throw new Error('Firebase não carregado');
        }
        
        // CONFIGURAÇÕES DO EMAIL
        const actionCodeSettings = {
            url: window.location.origin + '/index.html',
            handleCodeInApp: false
        };
        
        // ENVIAR EMAIL DE RECUPERAÇÃO
        await auth.sendPasswordResetEmail(email, actionCodeSettings);
        
        // SUCESSO
        mostrarMensagem(
            `✅ Link enviado para ${email}`,
            'success'
        );
        
        resetEmail.value = '';
        
        // INICIAR COOLDOWN
        iniciarCooldown();
        
    } catch (error) {
        console.error('❌ Erro na recuperação:', error.code, error.message);
        
        // TRATAR ERROS ESPECÍFICOS
        let mensagemErro = '';
        
        switch (error.code) {
            case 'auth/user-not-found':
                mensagemErro = '❌ E-mail não cadastrado';
                tentativasEnvio--; // Não conta como tentativa
                break;
            case 'auth/invalid-email':
                mensagemErro = '❌ E-mail inválido';
                tentativasEnvio--;
                break;
            case 'auth/too-many-requests':
                mensagemErro = '⚠️ Muitas tentativas. Aguarde alguns minutos';
                tentativasEnvio = MAX_TENTATIVAS; // Bloquear
                cooldownAtivo = true;
                ultimoEnvio = Date.now();
                salvarEstadoCooldown();
                iniciarCooldown();
                break;
            case 'auth/network-request-failed':
                mensagemErro = '❌ Erro de conexão. Verifique sua internet.';
                tentativasEnvio--;
                break;
            default:
                mensagemErro = '❌ Erro: ' + error.message;
                tentativasEnvio--;
        }
        
        mostrarMensagem(mensagemErro, 'error');
        
        resetBtn.classList.remove('loading');
        resetBtn.disabled = false;
        
        // Se houve erro e não ativamos cooldown, garantir que cooldown está falso
        if (!cooldownAtivo) {
            resetBtn.disabled = false;
        }
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

function mostrarMensagem(texto, tipo) {
    if (!modalMessage) return;
    
    modalMessage.textContent = texto;
    modalMessage.className = 'modal-message ' + tipo;
    modalMessage.style.display = 'block';
    
    // Auto-esconder mensagens de sucesso após 5 segundos
    if (tipo === 'success') {
        setTimeout(() => {
            if (modalMessage) {
                modalMessage.style.display = 'none';
            }
        }, 5000);
    }
}

function iniciarCooldown() {
    let segundosRestantes = 30;
    
    // Limpar timer anterior se existir
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Remover timer anterior do DOM
    const timerAnterior = document.getElementById('cooldownTimer');
    if (timerAnterior) {
        timerAnterior.remove();
    }
    
    // Criar novo timer
    const timerDiv = document.createElement('div');
    timerDiv.className = 'cooldown-timer';
    timerDiv.id = 'cooldownTimer';
    
    if (resetBtn && resetBtn.parentNode) {
        resetBtn.parentNode.appendChild(timerDiv);
    }
    
    timerInterval = setInterval(() => {
        segundosRestantes--;
        
        if (segundosRestantes <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (timerDiv) timerDiv.remove();
            
            // Cooldown acabou
            cooldownAtivo = false;
            
            // Salvar estado atualizado
            salvarEstadoCooldown();
            
            if (resetBtn) {
                resetBtn.disabled = false;
                resetBtn.classList.remove('loading');
            }
        } else {
            if (timerDiv) {
                timerDiv.textContent = `⏳ ${segundosRestantes}s`;
            }
            
            // Atualizar botão desabilitado
            if (resetBtn) {
                resetBtn.disabled = true;
            }
        }
    }, 1000);
}

function verificarCooldown() {
    if (cooldownAtivo) {
        const tempoRestante = Math.ceil((TEMPO_ESPERA - (Date.now() - ultimoEnvio)) / 1000);
        
        console.log(`⏳ Cooldown ativo: ${tempoRestante}s restantes`);
        
        if (tempoRestante > 0) {
            if (resetBtn) {
                resetBtn.disabled = true;
                
                // REMOVER TIMER ANTERIOR
                const timerAnterior = document.getElementById('cooldownTimer');
                if (timerAnterior) {
                    timerAnterior.remove();
                }
                
                // CRIAR NOVO TIMER COM O TEMPO CORRETO
                const timerDiv = document.createElement('div');
                timerDiv.className = 'cooldown-timer';
                timerDiv.id = 'cooldownTimer';
                
                if (resetBtn && resetBtn.parentNode) {
                    resetBtn.parentNode.appendChild(timerDiv);
                    timerDiv.textContent = `⏳ ${tempoRestante}s`;
                }
                
                // Se o timer não está rodando, iniciar
                if (!timerInterval) {
                    // Recriar o intervalo com o tempo correto
                    let segundosRestantes = tempoRestante;
                    
                    timerInterval = setInterval(() => {
                        segundosRestantes--;
                        
                        const timerAtual = document.getElementById('cooldownTimer');
                        
                        if (segundosRestantes <= 0) {
                            clearInterval(timerInterval);
                            timerInterval = null;
                            if (timerAtual) timerAtual.remove();
                            
                            cooldownAtivo = false;
                            salvarEstadoCooldown();
                            
                            if (resetBtn) {
                                resetBtn.disabled = false;
                                resetBtn.classList.remove('loading');
                            }
                        } else {
                            if (timerAtual) {
                                timerAtual.textContent = `⏳ ${segundosRestantes}s`;
                            }
                            
                            if (resetBtn) {
                                resetBtn.disabled = true;
                            }
                        }
                    }, 1000);
                }
            }
        } else {
            // Cooldown expirou
            cooldownAtivo = false;
            limparEstadoCooldown();
            
            if (resetBtn) {
                resetBtn.disabled = false;
            }
            
            // Remover timer
            const timer = document.getElementById('cooldownTimer');
            if (timer) timer.remove();
        }
    }
    
    if (tentativasEnvio >= MAX_TENTATIVAS && resetBtn) {
        resetBtn.disabled = true;
        mostrarMensagem('⚠️ Limite de tentativas atingido', 'error');
    }
}

// ==================== FUNÇÃO PARA ABRIR MODAL (CORRIGIDA) ====================
function abrirModal() {
    if (!modal) return;
    
    modal.style.display = 'block';
    resetEmail.value = '';
    modalMessage.style.display = 'none';
    modalMessage.className = 'modal-message';
    resetBtn.classList.remove('loading');
    
    // Verificar cooldown ao abrir o modal - AGORA VAI MOSTRAR O TIMER
    verificarCooldown();
    
    // SE COOLDOWN ESTIVER ATIVO, GARANTIR QUE O TIMER APAREÇA
    if (cooldownAtivo) {
        const tempoRestante = Math.ceil((TEMPO_ESPERA - (Date.now() - ultimoEnvio)) / 1000);
        
        if (tempoRestante > 0) {
            // Garantir que o timer aparece
            setTimeout(() => {
                const timerExistente = document.getElementById('cooldownTimer');
                if (!timerExistente && resetBtn && resetBtn.parentNode) {
                    const timerDiv = document.createElement('div');
                    timerDiv.className = 'cooldown-timer';
                    timerDiv.id = 'cooldownTimer';
                    timerDiv.textContent = `⏳ ${tempoRestante}s`;
                    resetBtn.parentNode.appendChild(timerDiv);
                }
            }, 100);
        }
    }
}

function iniciarCooldown() {
    let segundosRestantes = 30;
    
    // Limpar timer anterior se existir
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Remover timer anterior do DOM
    const timerAnterior = document.getElementById('cooldownTimer');
    if (timerAnterior) {
        timerAnterior.remove();
    }
    
    // Criar novo timer
    const timerDiv = document.createElement('div');
    timerDiv.className = 'cooldown-timer';
    timerDiv.id = 'cooldownTimer';
    
    if (resetBtn && resetBtn.parentNode) {
        resetBtn.parentNode.appendChild(timerDiv);
    }
    
    timerInterval = setInterval(() => {
        segundosRestantes--;
        
        if (segundosRestantes <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (timerDiv) timerDiv.remove();
            
            // Cooldown acabou
            cooldownAtivo = false;
            
            // Resetar tentativas após cooldown completo?
            // Se quiser resetar as tentativas após o cooldown:
            // tentativasEnvio = 0;
            
            // Salvar estado atualizado
            salvarEstadoCooldown();
            
            if (resetBtn) {
                resetBtn.disabled = false;
                resetBtn.classList.remove('loading');
            }
        } else {
            if (timerDiv) {
                timerDiv.textContent = `⏳ ${segundosRestantes}s`;
            }
            
            // Atualizar botão desabilitado
            if (resetBtn) {
                resetBtn.disabled = true;
            }
        }
    }, 1000);
}

function verificarCooldown() {
    if (cooldownAtivo) {
        const tempoRestante = Math.ceil((TEMPO_ESPERA - (Date.now() - ultimoEnvio)) / 1000);
        if (tempoRestante > 0) {
            if (resetBtn) {
                resetBtn.disabled = true;
                
                // Se o timer não está rodando, iniciar
                if (!timerInterval) {
                    iniciarCooldown();
                } else {
                    // Atualizar display do timer
                    const timerDiv = document.getElementById('cooldownTimer');
                    if (timerDiv) {
                        timerDiv.textContent = `⏳ ${tempoRestante}s`;
                    }
                }
            }
        } else {
            // Cooldown expirou
            cooldownAtivo = false;
            limparEstadoCooldown();
            
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        }
    }
    
    if (tentativasEnvio >= MAX_TENTATIVAS && resetBtn) {
        resetBtn.disabled = true;
        mostrarMensagem('⚠️ Limite de tentativas atingido', 'error');
    }
}

// ==================== VERIFICAÇÃO DE SESSÃO EXISTENTE ====================
function verificarSessaoExistente() {
    setTimeout(() => {
        if (typeof auth !== 'undefined' && auth.currentUser) {
            console.log('👤 Usuário já logado detectado:', auth.currentUser.email);
            
            // Buscar dados do usuário para redirecionar
            db.collection('users').doc(auth.currentUser.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data.type && typeof permissoes !== 'undefined') {
                            const tipoUsuario = data.type.toUpperCase();
                            if (permissoes[tipoUsuario]) {
                                const destino = permissoes[tipoUsuario][0];
                                window.location.replace(destino);
                            }
                        }
                    }
                })
                .catch(console.error);
        }
    }, 1000);
}

// ==================== ENTER PARA LOGIN ====================

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

// ==================== FUNÇÃO DE TOGGLE DA SENHA ====================
function toggleSenha(inputId, icon) {
    const input = document.getElementById(inputId);
    
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Tornar função global
window.toggleSenha = toggleSenha;

// ==================== EXPORTAR FUNÇÕES GLOBAIS ====================
window.login = login;
window.enviarRecuperacao = enviarRecuperacao;