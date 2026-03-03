/**
 * ====================================================
 * PDV.JS - SISTEMA COMPLETO DE PONTO DE VENDA
 * ====================================================
 * 
 * Funcionalidades:
 * ✅ Cards de resumo (total vendas, pedidos, ticket médio, itens)
 * ✅ Gráfico de vendas por dia (últimos 7 dias)
 * ✅ Lista de produtos mais vendidos
 * ✅ Ranking de garçons do mês e histórico completo
 * ✅ Tabela de todos os garçons com total de pedidos (todos os anos)
 * ✅ Filtros por período (hoje, semana, mês, personalizado)
 * ✅ Exportação de dados para CSV e PDF com logo
 * ✅ Modal de detalhes por venda
 * 
 * Autor: Sistema de Gestão de Restaurante
 * Data: 2024
 * ====================================================
 */

'use strict';

// ====================================================
// CONFIGURAÇÕES GLOBAIS
// ====================================================

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' font-size='12' text-anchor='middle' dy='.3em' fill='%23666' font-family='Arial'%3ESem%20Imagem%3C/text%3E%3C/svg%3E";

const LOGO_URL = 'https://logodownload.org/wp-content/uploads/2016/10/burger-king-logo-1.png';
// Fallback local: 'img/burger-king-logo.png'

let filtroAtual = {
    periodo: 'hoje',
    dataInicio: null,
    dataFim: null
};

let vendasData = [];
let todasVendas = [];
let garconsData = {};

// ====================================================
// INICIALIZAÇÃO
// ====================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Inicializando PDV...');
    criarEstruturaVendas();
    carregarGarcons();
    carregarVendas();
});

// ====================================================
// CRIAÇÃO DA ESTRUTURA HTML
// ====================================================

function criarEstruturaVendas() {
    const main = document.querySelector('.conteudo-principal');
    if (!main) return;

    const html = `
        <!-- Filtros -->
        <div class="filtros-vendas">
            <div class="filtros-container">
                <div class="filtros-botoes">
                    <button class="filtro-btn active" onclick="aplicarFiltro('hoje')" id="filtro-hoje">Hoje</button>
                    <button class="filtro-btn" onclick="aplicarFiltro('semana')" id="filtro-semana">Esta Semana</button>
                    <button class="filtro-btn" onclick="aplicarFiltro('mes')" id="filtro-mes">Este Mês</button>
                    <button class="filtro-btn" onclick="aplicarFiltro('ano')" id="filtro-ano">Este Ano</button>
                    <button class="filtro-btn" onclick="abrirFiltroPersonalizado()" id="filtro-personalizado">Personalizado</button>
                </div>
                <div class="filtros-exportar">
                    <button class="btn-exportar" onclick="exportarDados()">
                        <i class="fas fa-download"></i> CSV
                    </button>
                    <button class="btn-exportar" onclick="exportarPDF()" style="background: #e74c3c;">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
            
            <!-- Filtro personalizado -->
            <div id="filtro-personalizado-container" class="filtro-personalizado">
                <div class="filtro-personalizado-inputs">
                    <div>
                        <label>Data Início</label>
                        <input type="date" id="data-inicio" class="filtro-input">
                    </div>
                    <div>
                        <label>Data Fim</label>
                        <input type="date" id="data-fim" class="filtro-input">
                    </div>
                    <button class="btn-aplicar" onclick="aplicarFiltroPersonalizado()">Aplicar</button>
                </div>
            </div>
        </div>

        <!-- Cards de Resumo -->
        <div class="cards-resumo">
            <div class="card-resumo card-vendas">
                <div class="card-conteudo">
                    <div class="card-label">VENDAS TOTAIS</div>
                    <div class="card-valor" id="total-vendas">R$ 0,00</div>
                </div>
                <i class="fas fa-dollar-sign card-icone"></i>
            </div>
            
            <div class="card-resumo card-pedidos">
                <div class="card-conteudo">
                    <div class="card-label">TOTAL DE PEDIDOS</div>
                    <div class="card-valor" id="total-pedidos">0</div>
                </div>
                <i class="fas fa-receipt card-icone"></i>
            </div>
            
            <div class="card-resumo card-ticket">
                <div class="card-conteudo">
                    <div class="card-label">TICKET MÉDIO</div>
                    <div class="card-valor" id="ticket-medio">R$ 0,00</div>
                </div>
                <i class="fas fa-chart-line card-icone"></i>
            </div>
            
            <div class="card-resumo card-itens">
                <div class="card-conteudo">
                    <div class="card-label">ITENS VENDIDOS</div>
                    <div class="card-valor" id="total-itens">0</div>
                </div>
                <i class="fas fa-utensils card-icone"></i>
            </div>
        </div>

        <!-- Gráfico e Produtos -->
        <div class="grafico-produtos-container">
            <!-- Gráfico de Vendas -->
            <div class="grafico-container">
                <h3>VENDAS NOS ÚLTIMOS 7 DIAS</h3>
                <div id="grafico-vendas" class="grafico"></div>
            </div>

            <!-- Produtos Mais Vendidos -->
            <div class="produtos-container">
                <h3>PRODUTOS MAIS VENDIDOS</h3>
                <div id="lista-produtos" class="lista-produtos"></div>
            </div>
        </div>

        <!-- Ranking de Garçons -->
        <div class="ranking-container">
            <h3><i class="fas fa-trophy" style="color: #f1c40f;"></i> RANKING DE GARÇONS </h3>
            <div id="ranking-garcons-mes" class="ranking-grid"></div>
        </div>

        <!-- Tabela de Garçons -->
        <div class="tabela-container">
            <h3><i class="fas fa-users"></i> HISTÓRICO COMPLETO DE GARÇONS</h3>
            <div class="tabela-wrapper">
                <table class="tabela-garcons">
                    <thead>
                        <tr>
                            <th>Posição</th>
                            <th>Garçom</th>
                            <th>Total de Pedidos</th>
                            <th>Total Vendido</th>
                            <th>Ticket Médio</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-garcons-body">
                        <tr>
                            <td colspan="5" class="tabela-vazia">Carregando dados dos garçons...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tabela de Vendas -->
        <div class="tabela-container">
            <h3>VENDAS DETALHADAS</h3>
            <div class="tabela-wrapper">
                <table class="tabela-vendas">
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Cliente/Mesa</th>
                            <th>Itens</th>
                            <th>Garçom</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-vendas-body">
                        <tr>
                            <td colspan="5" class="tabela-vazia">Carregando vendas...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    main.insertAdjacentHTML('beforeend', html);
    adicionarEstilosCSS();
}

// ====================================================
// ESTILOS CSS
// ====================================================

function adicionarEstilosCSS() {
    const style = document.createElement('style');
    style.textContent = `
        /* Container principal */
        .conteudo-principal {
            padding: 20px;
            background: #f5f5f5;
            min-height: 100vh;
        }

        /* Filtros */
        .filtros-vendas {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .filtros-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }

        .filtros-botoes {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .filtro-btn {
            background: #f0f0f0;
            border: 1px solid #ddd;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            color: #333;
        }

        .filtro-btn:hover {
            background: #e0e0e0;
            transform: translateY(-2px);
        }

        .filtro-btn.active {
            background: #000;
            color: #fff;
            border-color: #000;
        }

        .btn-exportar {
            background: #27ae60;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: 10px;
        }

        .btn-exportar:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .filtro-personalizado {
            display: none;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }

        .filtro-personalizado-inputs {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: flex-end;
        }

        .filtro-personalizado-inputs label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }

        .filtro-input {
            padding: 8px 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
        }

        .btn-aplicar {
            background: #000;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
        }

        /* Cards de Resumo */
        .cards-resumo {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .card-resumo {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }

        .card-resumo:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        }

        .card-vendas { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card-pedidos { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .card-ticket { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .card-itens { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

        .card-conteudo {
            color: #fff;
        }

        .card-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
        }

        .card-valor {
            font-size: 28px;
            font-weight: 900;
        }

        .card-icone {
            font-size: 48px;
            opacity: 0.3;
            color: #fff;
        }

        /* Gráfico e Produtos */
        .grafico-produtos-container {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .grafico-container, .produtos-container {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .grafico-container h3, .produtos-container h3 {
            margin: 0 0 20px 0;
            font-size: 18px;
            color: #333;
        }

        .grafico {
            height: 300px;
            display: flex;
            align-items: flex-end;
            gap: 10px;
            padding: 20px 10px 10px;
            background: #fafafa;
            border-radius: 8px;
        }

        /* Ranking */
        .ranking-container {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .ranking-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .card-garcom {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-left: 4px solid #000;
            transition: transform 0.2s;
        }

        .card-garcom:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .card-garcom-avatar {
            width: 50px;
            height: 50px;
            background: #000;
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        /* Tabelas */
        .tabela-container {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .tabela-wrapper {
            overflow-x: auto;
            margin-top: 15px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 600px;
        }

        th {
            background: #000;
            color: #fff;
            padding: 12px;
            font-weight: 600;
            white-space: nowrap;
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            color: #333;
        }

        tbody tr:hover {
            background: #f5f5f5;
            cursor: pointer;
        }

        .tabela-vazia {
            text-align: center;
            color: #999;
            padding: 40px;
        }

        /* Responsividade */
        @media (max-width: 768px) {
            .grafico-produtos-container {
                grid-template-columns: 1fr;
            }
            
            .filtros-container {
                flex-direction: column;
                align-items: stretch;
            }
            
            .filtros-botoes {
                justify-content: center;
            }
            
            .filtros-exportar {
                display: flex;
                justify-content: center;
                gap: 10px;
            }
            
            .btn-exportar {
                margin: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ====================================================
// CARREGAMENTO DE GARÇONS
// ====================================================

function carregarGarcons() {
    db.collection('users').get()
        .then(snapshot => {
            garconsData = {};
            snapshot.forEach(doc => {
                const user = doc.data();
                if (user.tipo === 'garcom') {
                    garconsData[doc.id] = {
                        id: doc.id,
                        nome: user.nome || user.displayName || 'Garçom',
                        email: user.email,
                        totalPedidos: 0,
                        totalVendas: 0
                    };
                }
            });
        })
        .catch(error => {
            console.error('❌ Erro ao carregar garçons:', error);
        });
}

// ====================================================
// FILTROS
// ====================================================

function aplicarFiltro(periodo) {
    filtroAtual.periodo = periodo;

    document.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`filtro-${periodo}`).classList.add('active');

    document.getElementById('filtro-personalizado-container').style.display = 'none';
    aplicarFiltroVendas();
}

function abrirFiltroPersonalizado() {
    document.getElementById('filtro-personalizado-container').style.display = 'block';

    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    document.getElementById('data-inicio').value = formatarDataInput(trintaDiasAtras);
    document.getElementById('data-fim').value = formatarDataInput(hoje);
}

function aplicarFiltroPersonalizado() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;

    if (!dataInicio || !dataFim) {
        alert('Selecione as datas de início e fim');
        return;
    }

    filtroAtual.periodo = 'personalizado';
    filtroAtual.dataInicio = new Date(dataInicio);
    filtroAtual.dataFim = new Date(dataFim);
    filtroAtual.dataFim.setHours(23, 59, 59);

    document.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filtro-personalizado').classList.add('active');

    aplicarFiltroVendas();
}

function formatarDataInput(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// ====================================================
// CARREGAMENTO DE VENDAS
// ====================================================

function carregarVendas() {
    db.collection('pagamentos').orderBy('dataPagamento', 'desc').get()
        .then(snapshot => {
            todasVendas = [];
            snapshot.forEach(doc => {
                todasVendas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            aplicarFiltroVendas();
        })
        .catch(error => {
            console.error('❌ Erro ao carregar vendas:', error);
        });
}

function aplicarFiltroVendas() {
    let query = db.collection('pagamentos').orderBy('dataPagamento', 'desc');

    const datas = getDatasFiltro();

    if (datas.inicio && datas.fim) {
        query = query
            .where('dataPagamento', '>=', datas.inicio)
            .where('dataPagamento', '<=', datas.fim);
    }

    query.get()
        .then(snapshot => {
            vendasData = [];
            snapshot.forEach(doc => {
                vendasData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            atualizarResumos();
            atualizarGrafico();
            atualizarProdutosMaisVendidos();
            atualizarRankingGarcons();
            atualizarTabelaGarcons();
            atualizarTabelaVendas();
        })
        .catch(error => {
            console.error('❌ Erro ao aplicar filtro:', error);
        });
}

function getDatasFiltro() {
    const agora = new Date();
    let inicio = new Date();
    let fim = new Date();

    switch (filtroAtual.periodo) {
        case 'hoje':
            inicio.setHours(0, 0, 0, 0);
            fim.setHours(23, 59, 59, 999);
            break;

        case 'semana':
            inicio.setDate(agora.getDate() - agora.getDay());
            inicio.setHours(0, 0, 0, 0);
            fim.setHours(23, 59, 59, 999);
            break;

        case 'mes':
            inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
            fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
            fim.setHours(23, 59, 59, 999);
            break;

        case 'ano':
            inicio = new Date(agora.getFullYear(), 0, 1);
            fim = new Date(agora.getFullYear(), 11, 31);
            fim.setHours(23, 59, 59, 999);
            break;

        case 'personalizado':
            if (filtroAtual.dataInicio && filtroAtual.dataFim) {
                return {
                    inicio: firebase.firestore.Timestamp.fromDate(filtroAtual.dataInicio),
                    fim: firebase.firestore.Timestamp.fromDate(filtroAtual.dataFim)
                };
            }
            return { inicio: null, fim: null };
    }

    return {
        inicio: firebase.firestore.Timestamp.fromDate(inicio),
        fim: firebase.firestore.Timestamp.fromDate(fim)
    };
}

// ====================================================
// ATUALIZAÇÃO DOS COMPONENTES
// ====================================================

function atualizarResumos() {
    let totalVendas = 0;
    let totalPedidos = vendasData.length;
    let totalItens = 0;

    vendasData.forEach(venda => {
        totalVendas += venda.totalDoPedido || 0;

        const itens = venda.itens || [];
        itens.forEach(item => {
            totalItens += item.quantidade || 1;
        });
    });

    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

    document.getElementById('total-vendas').textContent = `R$ ${formatarMoeda(totalVendas)}`;
    document.getElementById('total-pedidos').textContent = totalPedidos;
    document.getElementById('ticket-medio').textContent = `R$ ${formatarMoeda(ticketMedio)}`;
    document.getElementById('total-itens').textContent = totalItens;
}

function atualizarGrafico() {
    const grafico = document.getElementById('grafico-vendas');
    if (!grafico) return;

    grafico.innerHTML = '';

    const vendasPorDia = {};
    const diasDaSemana = [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Gera os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);

        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const chave = `${dia}/${mes}/${ano}`;

        const nomeDia = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toLowerCase();
        const diaMes = `${dia}/${mes}`;

        diasDaSemana.push({
            chave, nomeDia, diaMes, data,
            label: `${nomeDia}\n${diaMes}`
        });

        vendasPorDia[chave] = 0;
    }

    // Soma as vendas (use todasVendas ou vendasData conforme necessário)
    todasVendas.forEach(venda => {
        if (venda.dataPagamento) {
            try {
                const dataVenda = venda.dataPagamento.toDate ?
                    venda.dataPagamento.toDate() :
                    new Date(venda.dataPagamento.seconds * 1000);

                dataVenda.setHours(0, 0, 0, 0);

                const dia = String(dataVenda.getDate()).padStart(2, '0');
                const mes = String(dataVenda.getMonth() + 1).padStart(2, '0');
                const ano = dataVenda.getFullYear();
                const chaveVenda = `${dia}/${mes}/${ano}`;

                if (vendasPorDia[chaveVenda] !== undefined) {
                    vendasPorDia[chaveVenda] += venda.totalDoPedido || 0;
                }
            } catch (error) {
                console.warn('Erro ao processar data:', error);
            }
        }
    });

    const valores = Object.values(vendasPorDia);
    const maxVenda = Math.max(...valores, 1);
    const alturaMaxima = 250;

    // Cria as barras do gráfico
    diasDaSemana.forEach((dia, index) => {
        const valor = vendasPorDia[dia.chave] || 0;
        const altura = (valor / maxVenda) * alturaMaxima;

        const container = document.createElement('div');
        container.className = 'grafico-barra-container';

        const valorLabel = document.createElement('div');
        valorLabel.className = 'grafico-valor';
        valorLabel.textContent = `R$ ${formatarMoeda(valor)}`;

        const barra = document.createElement('div');
        barra.className = 'grafico-barra';
        barra.style.height = `${Math.max(altura, 4)}px`;

        // Adiciona evento de clique para mostrar detalhes
        barra.addEventListener('click', () => mostrarDetalhesDia(dia.chave, valor));

        const labelDia = document.createElement('div');
        labelDia.className = `grafico-dia ${index === 6 ? 'hoje' : ''}`;
        labelDia.innerHTML = `${dia.nomeDia}<br>${dia.diaMes}`;

        container.appendChild(valorLabel);
        container.appendChild(barra);
        container.appendChild(labelDia);

        grafico.appendChild(container);
    });
}

function mostrarDetalhesDia(dia, total) {
    const vendasDoDia = todasVendas.filter(venda => {
        if (venda.dataPagamento) {
            try {
                const dataVenda = venda.dataPagamento.toDate ?
                    venda.dataPagamento.toDate() :
                    new Date(venda.dataPagamento.seconds * 1000);

                dataVenda.setHours(0, 0, 0, 0);

                const diaVenda = String(dataVenda.getDate()).padStart(2, '0');
                const mesVenda = String(dataVenda.getMonth() + 1).padStart(2, '0');
                const anoVenda = dataVenda.getFullYear();
                const chaveVenda = `${diaVenda}/${mesVenda}/${anoVenda}`;

                return chaveVenda === dia;
            } catch (error) {
                return false;
            }
        }
        return false;
    });

    const quantidadeVendas = vendasDoDia.length;

    const [diaNum, mesNum, anoNum] = dia.split('/');
    const dataExibicao = new Date(anoNum, mesNum - 1, diaNum);
    const nomeDia = dataExibicao.toLocaleDateString('pt-BR', { weekday: 'long' });

    let mensagem = `📊 VENDAS DO DIA ${dia}\n`;
    mensagem += `📅 ${nomeDia}\n`;
    mensagem += `💰 Total: R$ ${formatarMoeda(total)}\n`;
    mensagem += `📦 Pedidos: ${quantidadeVendas}\n\n`;

    if (quantidadeVendas > 0) {
        mensagem += `🛒 DETALHES:\n`;
        vendasDoDia.slice(0, 10).forEach((venda, index) => {
            const cliente = venda.tipoPedido === 'sem_mesa'
                ? (venda.nomeCliente || 'Cliente')
                : `Mesa ${venda.numeroMesa || venda.originalMesaId?.replace('mesa-', '') || 'N/A'}`;

            const hora = venda.dataPagamento ?
                new Date(venda.dataPagamento.toMillis()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) :
                '--:--';

            mensagem += `${index + 1}. ${hora} - ${cliente} - R$ ${formatarMoeda(venda.totalDoPedido || 0)}\n`;
        });

        if (vendasDoDia.length > 10) {
            mensagem += `... e mais ${vendasDoDia.length - 10} venda(s)`;
        }
    }

    alert(mensagem);
}

function atualizarProdutosMaisVendidos() {
    const produtos = {};

    vendasData.forEach(venda => {
        const itens = venda.itens || [];
        itens.forEach(item => {
            if (!produtos[item.nome]) {
                produtos[item.nome] = {
                    nome: item.nome,
                    quantidade: 0,
                    total: 0,
                    categoria: item.categoria
                };
            }
            produtos[item.nome].quantidade += item.quantidade || 1;
            produtos[item.nome].total += item.subtotal || 0;
        });
    });

    const produtosArray = Object.values(produtos);
    produtosArray.sort((a, b) => b.quantidade - a.quantidade);

    const topProdutos = produtosArray.slice(0, 10);

    const lista = document.getElementById('lista-produtos');
    lista.innerHTML = '';

    if (topProdutos.length === 0) {
        lista.innerHTML = '<p class="vazio">Nenhum produto vendido</p>';
        return;
    }

    topProdutos.forEach((produto, index) => {
        const item = document.createElement('div');
        item.className = 'produto-item';
        item.innerHTML = `
            <div class="produto-rank">${index + 1}</div>
            <div class="produto-info">
                <div class="produto-nome">${produto.nome}</div>
                <div class="produto-categoria">${produto.categoria || 'Produto'}</div>
            </div>
            <div class="produto-valores">
                <div class="produto-quantidade">${produto.quantidade}x</div>
                <div class="produto-total">R$ ${formatarMoeda(produto.total)}</div>
            </div>
        `;
        lista.appendChild(item);
    });
}

function atualizarRankingGarcons() {
    const ranking = {};
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);

    const inicioMesTimestamp = firebase.firestore.Timestamp.fromDate(inicioMes);
    const fimMesTimestamp = firebase.firestore.Timestamp.fromDate(fimMes);

    vendasData.forEach(venda => {
        if (venda.dataPagamento &&
            venda.dataPagamento >= inicioMesTimestamp &&
            venda.dataPagamento <= fimMesTimestamp) {

            const garcom = venda.anotadoPor || 'Não identificado';
            if (!ranking[garcom]) {
                ranking[garcom] = {
                    nome: garcom,
                    pedidos: 0,
                    total: 0
                };
            }
            ranking[garcom].pedidos++;
            ranking[garcom].total += venda.totalDoPedido || 0;
        }
    });

    const rankingArray = Object.values(ranking);
    rankingArray.sort((a, b) => b.total - a.total);

    const container = document.getElementById('ranking-garcons-mes');
    container.innerHTML = '';

    if (rankingArray.length === 0) {
        container.innerHTML = '<p class="vazio">Nenhuma venda no mês atual</p>';
        return;
    }

    rankingArray.slice(0, 5).forEach((garcom, index) => {
        const posicao = index + 1;
        const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : '📋';

        const card = document.createElement('div');
        card.className = `card-garcom`;
        card.innerHTML = `
            <div class="card-garcom-avatar">${medalha}</div>
            <div style="flex: 1;">
                <div style="font-weight: 900; color: #000">${garcom.nome}</div>
                <div style="font-size: 13px; color: #666;">
                    ${garcom.pedidos} pedidos · R$ ${formatarMoeda(garcom.total)}
                </div>
            </div>
            <div style="font-size: 20px; font-weight: 900; opacity: 0.3;">#${posicao}</div>
        `;
        container.appendChild(card);
    });
}

function atualizarTabelaGarcons() {
    const stats = {};

    vendasData.forEach(venda => {
        const garcom = venda.anotadoPor || 'Não identificado';
        if (!stats[garcom]) {
            stats[garcom] = {
                nome: garcom,
                pedidos: 0,
                total: 0
            };
        }
        stats[garcom].pedidos++;
        stats[garcom].total += venda.totalDoPedido || 0;
    });

    const statsArray = Object.values(stats);
    statsArray.sort((a, b) => b.total - a.total);

    const tbody = document.getElementById('tabela-garcons-body');
    tbody.innerHTML = '';

    if (statsArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhum dado de garçom encontrado</td></tr>';
        return;
    }

    statsArray.forEach((garcom, index) => {
        const ticketMedio = garcom.pedidos > 0 ? garcom.total / garcom.pedidos : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td>${garcom.nome}</td>
            <td style="text-align: center;">${garcom.pedidos}</td>
            <td style="text-align: right; font-weight: 900;">R$ ${formatarMoeda(garcom.total)}</td>
            <td style="text-align: right;">R$ ${formatarMoeda(ticketMedio)}</td>
        `;
        tbody.appendChild(row);
    });
}

function atualizarTabelaVendas() {
    const tbody = document.getElementById('tabela-vendas-body');
    tbody.innerHTML = '';

    if (vendasData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhuma venda encontrada</td></tr>';
        return;
    }

    vendasData.slice(0, 50).forEach(venda => {
        const dataPagamento = venda.dataPagamento
            ? new Date(venda.dataPagamento.toMillis()).toLocaleString('pt-BR')
            : '--/--/---- --:--';

        const isSemMesa = venda.tipoPedido === 'sem_mesa';
        const identificador = isSemMesa
            ? (venda.nomeCliente || 'Cliente')
            : `Mesa ${venda.numeroMesa || venda.originalMesaId?.replace('mesa-', '') || 'N/A'}`;

        const itensResumo = venda.itens
            ? venda.itens.map(item => `${item.quantidade}x ${item.nome}`).join(', ')
            : 'Sem itens';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dataPagamento}</td>
            <td>${identificador}</td>
            <td>${itensResumo.substring(0, 50)}${itensResumo.length > 50 ? '...' : ''}</td>
            <td>${venda.anotadoPor || 'N/A'}</td>
            <td style="text-align: right; font-weight: 900;">R$ ${formatarMoeda(venda.totalDoPedido || 0)}</td>
        `;

        row.addEventListener('click', () => abrirDetalhesVenda(venda.id));
        tbody.appendChild(row);
    });
}

// ====================================================
// MODAL DE DETALHES
// ====================================================

function abrirDetalhesVenda(vendaId) {
    let modal = document.getElementById('modal-pagamento');
    if (!modal) {
        modal = criarModalPagamento();
    }

    modal.style.display = 'flex';

    const btnConfirmar = document.getElementById('btn-confirmar-pagamento');
    if (btnConfirmar) {
        btnConfirmar.style.display = 'none';
    }

    carregarDetalhesVenda(vendaId);
}

function criarModalPagamento() {
    const modalHTML = `
        <div id="modal-pagamento" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-titulo">DETALHES DA VENDA</h3>
                    <button onclick="fecharModalPagamento()">&times;</button>
                </div>
                <div class="modal-body" id="modal-corpo">
                    Carregando...
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('modal-pagamento');
}

function carregarDetalhesVenda(vendaId) {
    const modalCorpo = document.getElementById('modal-corpo');
    const modalTitulo = document.getElementById('modal-titulo');

    if (!modalCorpo || !modalTitulo) return;

    modalCorpo.innerHTML = '<p class="carregando">Carregando detalhes...</p>';

    db.collection('pagamentos').doc(vendaId).get()
        .then(doc => {
            if (!doc.exists) {
                modalCorpo.innerHTML = '<p class="vazio">Venda não encontrada</p>';
                return;
            }

            const venda = doc.data();
            renderizarDetalhesVenda(venda, doc.id, modalCorpo, modalTitulo);
        })
        .catch(error => {
            console.error('❌ Erro ao carregar detalhes:', error);
            modalCorpo.innerHTML = '<p class="vazio">Erro ao carregar detalhes</p>';
        });
}

function renderizarDetalhesVenda(venda, vendaId, modalCorpo, modalTitulo) {
    const isSemMesa = venda.tipoPedido === 'sem_mesa';

    if (isSemMesa) {
        modalTitulo.textContent = `Cliente: ${venda.nomeCliente || 'Não identificado'}`;
    } else {
        const numeroMesa = venda.numeroMesa || venda.originalMesaId?.replace('mesa-', '') || 'N/A';
        modalTitulo.textContent = `Mesa ${numeroMesa}`;
    }

    const itens = venda.itens || [];
    const totalPedido = venda.totalDoPedido || 0;

    let dataPagamento = '--/--/---- --:--';
    if (venda.dataPagamento) {
        const data = new Date(venda.dataPagamento.toMillis());
        dataPagamento = data.toLocaleString('pt-BR');
    }

    let dataPedido = '--/--/---- --:--';
    if (venda.horario) {
        const data = new Date(venda.horario.toMillis());
        dataPedido = data.toLocaleString('pt-BR');
    }

    let html = `
        <div class="venda-info">
            <div class="info-item">
                <i class="fas fa-calendar-check" style="color: #27ae60;"></i>
                <div>
                    <div class="info-label">Data do Pagamento</div>
                    <strong style="color: #000;">${dataPagamento}</strong>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-clock" style="color: #f1a933;"></i>
                <div>
                    <div class="info-label">Data do Pedido</div>
                    <strong style="color: #000;">${dataPedido}</strong>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-user-tie" style="color: #3498db;"></i>
                <div>
                    <div class="info-label">Garçom</div>
                    <strong style="color: #000;">${venda.anotadoPor || 'Não identificado'}</strong>
                </div>
            </div>
        </div>
    `;

    html += `<h4 class="itens-titulo">ITENS DO PEDIDO</h4>`;

    itens.forEach(item => {
        const dadosBase = (typeof alimentos !== 'undefined')
            ? alimentos.find(a => a.nome === item.nome)
            : null;
        const imagem = item.img || (dadosBase ? dadosBase.img : 'img/placeholder-bk.png');

        html += `
            <div class="item-pedido">
                <img src="${imagem}" alt="${item.nome}" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                <div class="item-detalhes">
                    <div class="item-nome">${item.nome}</div>
                    <div class="item-obs">${item.observacao || 'Sem observações'}</div>
                </div>
                <div class="item-valores">
                    <div class="item-preco">R$ ${formatarMoeda(item.subtotal || 0)}</div>
                    <div class="item-qtd">${item.quantidade || 1}x</div>
                </div>
            </div>
        `;
    });

    html += `
        <div class="venda-total">
            <span>TOTAL DA VENDA</span>
            <div>R$ ${formatarMoeda(totalPedido)}</div>
        </div>
    `;

    modalCorpo.innerHTML = html;
}

// ====================================================
// EXPORTAÇÃO CSV
// ====================================================

function exportarDados() {
    if (vendasData.length === 0) {
        alert('Nenhum dado para exportar');
        return;
    }

    let csv = 'Data,Hora,Cliente/Mesa,Garçom,Itens,Total\n';

    vendasData.forEach(venda => {
        const data = venda.dataPagamento ? new Date(venda.dataPagamento.toMillis()) : new Date();
        const dataStr = data.toLocaleDateString('pt-BR');
        const horaStr = data.toLocaleTimeString('pt-BR');

        const isSemMesa = venda.tipoPedido === 'sem_mesa';
        const cliente = isSemMesa
            ? (venda.nomeCliente || 'Cliente')
            : `Mesa ${venda.numeroMesa || venda.originalMesaId?.replace('mesa-', '') || 'N/A'}`;

        const itens = venda.itens
            ? venda.itens.map(item => `${item.quantidade}x ${item.nome}`).join('; ')
            : '';

        const linha = `"${dataStr}","${horaStr}","${cliente}","${venda.anotadoPor || 'N/A'}","${itens}","${formatarMoeda(venda.totalDoPedido || 0)}"`;
        csv += linha + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================================
// EXPORTAÇÃO PDF
// ====================================================

function exportarPDF() {
    if (vendasData.length === 0) {
        alert('Nenhum dado para exportar');
        return;
    }

    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        carregarBibliotecasPDF();
        return;
    }

    gerarPDF();
}

function carregarBibliotecasPDF() {
    const scriptJsPDF = document.createElement('script');
    scriptJsPDF.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    scriptJsPDF.onload = () => {
        const scriptAutoTable = document.createElement('script');
        scriptAutoTable.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
        scriptAutoTable.onload = () => gerarPDF();
        document.head.appendChild(scriptAutoTable);
    };
    document.head.appendChild(scriptJsPDF);
}

function gerarPDF() {
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Logo
    const logoUrl = 'img/Burger_King_2020.svg'; // Caminho relativo

    try {
        doc.addImage(logoUrl, 'PNG', 10, 5, 30, 15);
    } catch (error) {
        doc.setFillColor(0, 0, 0);
        doc.roundedRect(10, 5, 30, 15, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text('BK', 18, 15);
    }

    // Título
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATORIO DE VENDAS', 50, 15);

    // Período
    let periodoTexto = '';
    switch (filtroAtual.periodo) {
        case 'hoje': periodoTexto = 'Hoje'; break;
        case 'semana': periodoTexto = 'Esta Semana'; break;
        case 'mes': periodoTexto = 'Este Mês'; break;
        case 'ano': periodoTexto = 'Este Ano'; break;
        case 'personalizado':
            const inicio = filtroAtual.dataInicio.toLocaleDateString('pt-BR');
            const fim = filtroAtual.dataFim.toLocaleDateString('pt-BR');
            periodoTexto = `${inicio} a ${fim}`;
            break;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodoTexto}`, 50, 22);

    const dataEmissao = new Date().toLocaleString('pt-BR');
    doc.setFontSize(9);
    doc.text(`Emissão: ${dataEmissao}`, 280, 10, { align: 'right' });

    // Cards de Resumo
    let totalVendas = 0, totalPedidos = vendasData.length, totalItens = 0;
    vendasData.forEach(v => {
        totalVendas += v.totalDoPedido || 0;
        (v.itens || []).forEach(i => totalItens += i.quantidade || 1);
    });
    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

    const cards = [
        { label: 'VENDAS TOTAIS', value: `R$ ${formatarMoeda(totalVendas)}`, color: [102, 126, 234] },
        { label: 'PEDIDOS', value: totalPedidos.toString(), color: [240, 147, 251] },
        { label: 'TICKET MEDIO', value: `R$ ${formatarMoeda(ticketMedio)}`, color: [79, 172, 254] },
        { label: 'ITENS', value: totalItens.toString(), color: [67, 233, 123] }
    ];

    let x = 15;
    cards.forEach(card => {
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.roundedRect(x, 30, 65, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(card.label, x + 3, 37);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(card.value, x + 3, 46);
        x += 70;
    });

    // Ranking Garçons
    const ranking = {};
    vendasData.forEach(v => {
        const g = v.anotadoPor || 'Nao identificado';
        if (!ranking[g]) ranking[g] = { nome: g, pedidos: 0, total: 0 };
        ranking[g].pedidos++;
        ranking[g].total += v.totalDoPedido || 0;
    });

    const rankingArray = Object.values(ranking).sort((a, b) => b.total - a.total).slice(0, 5);

    doc.autoTable({
        startY: 60,
        head: [['Posicao', 'Garcom', 'Pedidos', 'Total Vendido']],
        body: rankingArray.map((g, i) => [`#${i + 1}`, g.nome, g.pedidos, `R$ ${formatarMoeda(g.total)}`]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] }
    });

    // Produtos
    const produtos = {};
    vendasData.forEach(v => (v.itens || []).forEach(i => {
        if (!produtos[i.nome]) produtos[i.nome] = { nome: i.nome, qtd: 0, total: 0, cat: i.categoria };
        produtos[i.nome].qtd += i.quantidade || 1;
        produtos[i.nome].total += i.subtotal || 0;
    }));

    const prodArray = Object.values(produtos).sort((a, b) => b.qtd - a.qtd).slice(0, 10);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['#', 'Produto', 'Categoria', 'Qtd', 'Total']],
        body: prodArray.map((p, i) => [i + 1, p.nome, p.cat || 'Produto', p.qtd, `R$ ${formatarMoeda(p.total)}`]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] }
    });

    // Tabela Vendas
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Data/Hora', 'Cliente/Mesa', 'Itens', 'Garcom', 'Total']],
        body: vendasData.slice(0, 30).map(v => {
            const data = v.dataPagamento ? new Date(v.dataPagamento.toMillis()) : new Date();
            const isSemMesa = v.tipoPedido === 'sem_mesa';
            const cliente = isSemMesa ? (v.nomeCliente || 'Cliente') : `Mesa ${v.numeroMesa || 'N/A'}`;
            const itens = (v.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', ').substring(0, 40);
            return [
                data.toLocaleString('pt-BR'),
                cliente,
                itens + (itens.length > 39 ? '...' : ''),
                v.anotadoPor || 'N/A',
                `R$ ${formatarMoeda(v.totalDoPedido || 0)}`
            ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] }
    });

    // Salvar
    const nomeArquivo = `relatorio_vendas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}.pdf`;
    doc.save(nomeArquivo);
}

// ====================================================
// FUNÇÕES UTILITÁRIAS
// ====================================================

function formatarMoeda(valor) {
    return valor.toFixed(2).replace('.', ',');
}

function fecharModalPagamento() {
    const modal = document.getElementById('modal-pagamento');
    if (modal) modal.style.display = 'none';
}

function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        firebase.auth().signOut()
            .then(() => window.location.href = 'index.html')
            .catch(error => {
                console.error('❌ Erro ao sair:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }
}

function toggleMenu() {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    if (sideMenu && overlay) {
        sideMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    }
}

// ====================================================
// EXPOSIÇÃO GLOBAL
// ====================================================

window.aplicarFiltro = aplicarFiltro;
window.abrirFiltroPersonalizado = abrirFiltroPersonalizado;
window.aplicarFiltroPersonalizado = aplicarFiltroPersonalizado;
window.exportarDados = exportarDados;
window.exportarPDF = exportarPDF;
window.abrirDetalhesVenda = abrirDetalhesVenda;
window.fecharModalPagamento = fecharModalPagamento;
window.logout = logout;
window.toggleMenu = toggleMenu;