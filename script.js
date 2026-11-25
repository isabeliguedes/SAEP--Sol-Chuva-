// 1. Camada de configuração da aplicação (Regra 1.1)
const CONFIG = {
  nomePortal: 'Sol Chuva',
  logoPortal: 'solchuva.svg',
  pastaIcones: 'icones/',
  cidadesExemplo: [
    'São Paulo',
    'Rio de Janeiro',
    'Florianópolis',
    'Curitiba',
    'Belo Horizonte',
    'Salvador',
    'Brasília'
  ]
};

// 2. Tabela de apoio WMO (baseada no arquivo codigos_wmo.csv dos anexos)
const TABELA_WMO = {
  0: { descricao: 'Céu limpo', icone: 'sol.svg' },
  1: { descricao: 'Predominantemente limpo', icone: 'sol.svg' },
  2: { descricao: 'Parcialmente nublado', icone: 'parcialmente_nublado.svg' },
  3: { descricao: 'Nublado', icone: 'nublado.svg' },
  45: { descricao: 'Nevoeiro', icone: 'nevoeiro.svg' },
  48: { descricao: 'Nevoeiro com geada', icone: 'nevoeiro.svg' },
  51: { descricao: 'Garoa leve', icone: 'chuva.svg' },
  53: { descricao: 'Garoa moderada', icone: 'chuva.svg' },
  55: { descricao: 'Garoa intensa', icone: 'chuva.svg' },
  61: { descricao: 'Chuva fraca', icone: 'chuva.svg' },
  63: { descricao: 'Chuva moderada', icone: 'chuva.svg' },
  65: { descricao: 'Chuva forte', icone: 'chuva.svg' },
  80: { descricao: 'Pancadas de chuva leves', icone: 'chuva.svg' },
  81: { descricao: 'Pancadas de chuva', icone: 'chuva.svg' },
  82: { descricao: 'Pancadas de chuva fortes', icone: 'chuva.svg' },
  95: { descricao: 'Trovoada', icone: 'tempestade.svg' },
  96: { descricao: 'Trovoada com granizo', icone: 'tempestade.svg' },
  99: { descricao: 'Trovoada forte com granizo', icone: 'tempestade.svg' }
};

// 3. Pegando os elementos do HTML pelo ID
const inputCidade = document.getElementById('input-cidade');
const btnBuscar = document.getElementById('btn-buscar');
const listaCidadesDatalist = document.getElementById('lista-cidades');
const chipsContainer = document.getElementById('chips-cidades');
const indicadorCarregamento = document.getElementById('indicador-carregamento');
const mensagemErro = document.getElementById('mensagem-erro');
const painelResultados = document.getElementById('painel-resultados');

// 4. Preenche cabeçalho, datalist e botões chips ao abrir o site
function inicializarAplicacao() {
  document.getElementById('logo-portal').src = CONFIG.logoPortal;
  document.getElementById('nome-portal').textContent = CONFIG.nomePortal;

  CONFIG.cidadesExemplo.forEach((cidade) => {
    // Adiciona opção no <datalist>
    const option = document.createElement('option');
    option.value = cidade;
    listaCidadesDatalist.appendChild(option);

    // Cria o botão chip de acesso rápido
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = cidade;
    chip.addEventListener('click', () => {
      inputCidade.value = cidade;
      executarBusca(cidade);
    });
    chipsContainer.appendChild(chip);
  });
}

// 5. Traduz o weather_code com plano B caso o código não exista na tabela
function obterCondicaoTempo(codigo) {
  const registro = TABELA_WMO[codigo] || {
    descricao: 'Condição desconhecida',
    icone: 'nublado.svg'
  };

  return {
    descricao: registro.descricao,
    caminhoIcone: `${CONFIG.pastaIcones}${registro.icone}`
  };
}

// 6. Funções para controlar avisos de carregamento e erro na tela
function mostrarCarregamento(ativo) {
  indicadorCarregamento.classList.toggle('oculto', !ativo);
}

function mostrarErro(texto) {
  mensagemErro.textContent = texto;
  mensagemErro.classList.remove('oculto');
}

function limparErro() {
  mensagemErro.textContent = '';
  mensagemErro.classList.add('oculto');
}

// 7. Função principal: valida, busca coordenadas e depois busca o clima
async function executarBusca(nomeLocalidade) {
  const termo = nomeLocalidade.trim();

  // Trava se o campo estiver vazio (Regra 3.1 e 1.4.1)
  if (!termo) {
    mostrarErro('Por favor, digite o nome de uma cidade antes de buscar.');
    return;
  }

  limparErro();
  mostrarCarregamento(true);

  try {
    // ETAPA 1: Geocodificação (Nome da cidade -> Latitude e Longitude)
    const urlGeo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(termo)}&count=1&language=pt&format=json`;
    const respGeo = await fetch(urlGeo);
    if (!respGeo.ok) throw new Error('Erro na API de geocodificação');

    const dadosGeo = await respGeo.json();

    // Verifica se a cidade existe
    if (!dadosGeo.results || dadosGeo.results.length === 0) {
      mostrarErro('Localidade não encontrada. Verifique o nome e tente novamente.');
      return;
    }

    const local = dadosGeo.results[0];

    // ETAPA 2: Previsão do Tempo (Latitude/Longitude -> Clima Atual + 10 Dias)
    const urlClima = `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&forecast_days=10`;
    const respClima = await fetch(urlClima);
    if (!respClima.ok) throw new Error('Erro na API de previsão');

    const dadosClima = await respClima.json();

    // Envia os dados prontos para desenhar na tela
    renderizarResultados(local, dadosClima);

  } catch (erro) {
    mostrarErro('Não foi possível carregar os dados do clima. Tente novamente.');
    console.error(erro);
  } finally {
    mostrarCarregamento(false);
  }
}

// 8. Preenche o Clima Atual e os 10 dias na tela (Itens 5, 6 e 1.4.4)
function renderizarResultados(local, dadosClima) {
  const atual = dadosClima.current;
  const diario = dadosClima.daily;
  const condicaoAtual = obterCondicaoTempo(atual.weather_code);

  // Nome da cidade e região/país
  document.getElementById('local-nome').textContent = local.name;
  const partesRegiao = [local.admin1, local.country].filter(Boolean);
  document.getElementById('local-regiao').textContent = partesRegiao.join(' - ');

  // Temperatura, ícone e descrição atuais
  document.getElementById('atual-icone').src = condicaoAtual.caminhoIcone;
  document.getElementById('atual-icone').alt = condicaoAtual.descricao;
  document.getElementById('atual-temperatura').textContent = `${Math.round(atual.temperature_2m)}°C`;
  document.getElementById('atual-descricao').textContent = condicaoAtual.descricao;

  // Os 7 indicadores detalhados (Item 5.3)
  document.getElementById('atual-sensacao').textContent = `${Math.round(atual.apparent_temperature)}°C`;
  document.getElementById('atual-umidade').textContent = `${atual.relative_humidity_2m}%`;
  document.getElementById('atual-vento').textContent = `${Math.round(atual.wind_speed_10m)} km/h`;
  document.getElementById('atual-precipitacao').textContent = `${atual.precipitation} mm`;
  document.getElementById('atual-uv').textContent = diario.uv_index_max[0];
  document.getElementById('atual-nascer').textContent = diario.sunrise[0].split('T')[1];
  document.getElementById('atual-por').textContent = diario.sunset[0].split('T')[1];

  // Limpa os dias da busca anterior para não duplicar (Item 1.4.4)
  const listaDias = document.getElementById('lista-previsao-dias');
  listaDias.innerHTML = '';

  // Loop para gerar os 10 dias (Item 6)
  for (let i = 0; i < diario.time.length; i++) {
    const dataIso = diario.time[i]; // Ex: "2026-11-24"
    const [, mes, dia] = dataIso.split('-');
    const dataFormatada = `${dia}/${mes}`;

    // Rótulo: Hoje, Amanhã ou dia da semana (Item 6.1)
    let rotuloDia = '';
    if (i === 0) {
      rotuloDia = 'Hoje';
    } else if (i === 1) {
      rotuloDia = 'Amanhã';
    } else {
      const dataObj = new Date(`${dataIso}T00:00:00`);
      rotuloDia = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    }

    const condicaoDia = obterCondicaoTempo(diario.weather_code[i]);
    const max = Math.round(diario.temperature_2m_max[i]);
    const min = Math.round(diario.temperature_2m_min[i]);
    const probChuva = diario.precipitation_probability_max[i] ?? 0;

    const card = document.createElement('div');
    card.className = 'dia-card';
    card.innerHTML = `
      <span class="dia-titulo">${rotuloDia}</span>
      <span class="dia-data">${dataFormatada}</span>
      <img src="${condicaoDia.caminhoIcone}" alt="${condicaoDia.descricao}">
      <span class="dia-desc">${condicaoDia.descricao}</span>
      <div class="dia-temps">
        <strong>${max}°</strong> / ${min}°
      </div>
      <span class="dia-chuva">Chuva: ${probChuva}%</span>
    `;
    listaDias.appendChild(card);
  }

  // Mostra o painel na tela
  painelResultados.classList.remove('oculto');
}

// 9. Eventos de clique no botão e tecla Enter no campo
btnBuscar.addEventListener('click', () => executarBusca(inputCidade.value));

inputCidade.addEventListener('keypress', (evento) => {
  if (evento.key === 'Enter') {
    executarBusca(inputCidade.value);
  }
});

// 10. Inicia a aplicação ao carregar a página
inicializarAplicacao();