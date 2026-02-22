// js/gerente.js

document.addEventListener('DOMContentLoaded', () => {
    const elTotal = document.getElementById('total-geral');
    const elGarcom = document.getElementById('total-garcom');
    const elCozinha = document.getElementById('total-cozinha');
    const elBarman = document.getElementById('total-barman');

    // Escuta a coleção de usuários em tempo real
    db.collection('users').onSnapshot((snapshot) => {
        let contadores = {
            TOTAL: -1,
            GARCOM: 0,
            COZINHA: 0,
            BARMAN: 0
        };

        snapshot.forEach((doc) => {
            const f = doc.data();

            // Ignora usuários marcados para exclusão
            if (f.status === "DELETAR_CONTA") return;

            contadores.TOTAL++;

            // Normaliza o cargo para contagem (sem espaços e em maiúsculo)
            const cargo = f.type ? f.type.toUpperCase().trim() : '';

            if (cargo === 'GARCOM' || cargo === 'GARÇOM') contadores.GARCOM++;
            if (cargo === 'COZINHA' || cargo === 'COZINHEIRO') contadores.COZINHA++;
            if (cargo === 'BARMAN') contadores.BARMAN++;
        });

        // Atualiza o HTML com os novos valores
        elTotal.textContent = contadores.TOTAL;
        elGarcom.textContent = contadores.GARCOM;
        elCozinha.textContent = contadores.COZINHA;
        elBarman.textContent = contadores.BARMAN;
    });
});