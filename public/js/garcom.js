// --- FUNÇÕES DE APOIO ---

/**
 * Calcula a diferença em minutos entre o início do pedido e o momento atual.
 * @param {Object|Number} timestampInicio - Timestamp do Firebase ou milissegundos.
 */
function calcularMinutos(timestampInicio) {
    if (!timestampInicio) return 0;

    // Converte timestamp do Firebase (seconds/nanoseconds) para milissegundos
    const inicio = timestampInicio.seconds ? timestampInicio.seconds * 1000 : timestampInicio;
    const agora = Date.now();
    const diferencaMs = agora - inicio;

    return Math.floor(diferencaMs / 60000);
}

// --- LÓGICA PRINCIPAL ---

document.addEventListener('DOMContentLoaded', () => {
    const containerMesas = document.getElementById('container-mesas');

    // Escuta a coleção de mesas em tempo real
    db.collection('mesas').orderBy('numero', 'asc').onSnapshot((snapshot) => {
        containerMesas.innerHTML = '';

        snapshot.forEach((doc) => {
            const mesa = doc.data();
            const divMesa = document.createElement('div');

            // Define a classe de status para o CSS
            const statusClasse = mesa.status === 'OCUPADA' ? 'ocupada' : 'livre';
            divMesa.className = `card-mesa ${statusClasse}`;

            // Redireciona para o cardápio passando o número da mesa na URL
            divMesa.onclick = () => {
                window.location.href = `cardapio.html?mesa=${mesa.numero}`;
            };

            if (mesa.status === 'LIVRE') {
                divMesa.innerHTML = `
                    <div class="info-mesa">
                        <h3>MESA ${mesa.numero}</h3>
                        <span class="status-texto livre">
                            <i class="fas fa-circle"></i> LIVRE
                        </span>
                    </div>
                    <div class="icon-area">
                        <i class="fas fa-utensils"></i>
                    </div>
                `;
            } else {
                // Calcula os minutos passados desde o primeiro pedido
                const minutosPassados = calcularMinutos(mesa.horario_inicio);

                // Formata o valor monetário
                const valorFormatado = mesa.valor ? mesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';

                divMesa.innerHTML = `
                    <div class="info-mesa">
                        <h3>MESA ${mesa.numero}</h3>
                        <span class="status-texto ocupada">
                            <i class="fas fa-circle"></i> OCUPADA
                        </span>
                        <div class="detalhes-ocupada">
                            <span class="tempo-contagem" data-inicio="${mesa.horario_inicio?.seconds ? mesa.horario_inicio.seconds * 1000 : mesa.horario_inicio}">
                                <i class="far fa-clock"></i> ${minutosPassados} Min
                            </span>
                            <span>
                                <i class="fas fa-dollar-sign"></i> ${valorFormatado}
                            </span>
                        </div>
                    </div>
                    <div class="icon-area">
                        <i class="fas fa-utensils" ></i>
                    </div>
                `;
            }

            containerMesas.appendChild(divMesa);
        });

        // Re-aplica o filtro de busca caso o usuário esteja digitando enquanto o Firebase atualiza
        filtrarMesas();
    });
});

/**
 * Filtra as mesas visualmente por número ou status (Livre/Ocupada)
 */
function filtrarMesas() {
    const busca = document.getElementById('buscaMesa')?.value.toUpperCase() || "";
    const filtroStatus = document.getElementById('filtroStatus')?.value || "TODAS";
    const cards = document.querySelectorAll('.card-mesa');

    cards.forEach(card => {
        const textoMesa = card.querySelector('h3').innerText.toUpperCase();
        const statusMesa = card.classList.contains('ocupada') ? 'OCUPADA' : 'LIVRE';

        const correspondeBusca = textoMesa.includes(busca);
        const correspondeStatus = filtroStatus === 'TODAS' || statusMesa === filtroStatus;

        card.style.display = (correspondeBusca && correspondeStatus) ? 'flex' : 'none';
    });
}

// --- ATUALIZAÇÃO AUTOMÁTICA DO TEMPO ---

/**
 * Atualiza o texto de minutos de todas as mesas ocupadas a cada 60 segundos
 * sem precisar recarregar a página ou buscar dados do Firebase novamente.
 */
setInterval(() => {
    const elementosTempo = document.querySelectorAll('.tempo-contagem');
    elementosTempo.forEach(el => {
        const inicioData = el.getAttribute('data-inicio');
        if (inicioData && inicioData !== "undefined") {
            const inicioMs = parseInt(inicioData);
            const minutos = calcularMinutos(inicioMs);
            el.innerHTML = `<i class="far fa-clock"></i> ${minutos} Min`;
        }
    });
}, 60000); // 60.000ms = 1 minuto
