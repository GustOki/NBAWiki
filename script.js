const cardContainer = document.querySelector(".card-container");
const campoBusca = document.querySelector("header input");
const headerEl = document.querySelector("header");
let dados = [];
let isShuffling = false;
let favoritos = JSON.parse(localStorage.getItem('nbawiki-favoritos')) || [];

function getTeamLogo(time) {
  if (typeof time === 'object' && time.logo) {
    return time.logo;
  }
  if (typeof time === 'string') {
    const found = dados.find(d => d.nome === time);
    if (found?.logo) return found.logo;
    return gerarPlaceholderDataURL(time);
  }
  return gerarPlaceholderDataURL(time?.nome || '?');
}

function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

document.addEventListener("DOMContentLoaded", async () => {
  reorganizarHeader();
  criarUIFiltros();
  criarBotaoAleatorio();
  await carregarDados();
  criarStatsBar();
  criarTimelineSection();
  criarQuizSection();
  renderCards(dados);
  
  campoBusca?.addEventListener("input", debounce(iniciarBusca, 200));
  campoBusca?.addEventListener("keydown", e => e.key === "Enter" && iniciarBusca());
  
  criarModal();
});

function reorganizarHeader() {
  if (!headerEl) return;
  
  const h1 = headerEl.querySelector("h1");
  const div = headerEl.querySelector("div");
  
  if (!headerEl.querySelector(".header-content")) {
    const content = document.createElement("div");
    content.className = "header-content";
    
    const top = document.createElement("div");
    top.className = "header-top";
    
    if (h1) top.appendChild(h1);
    if (div) {
      div.className = "search-box";
      top.appendChild(div);
    }
    
    content.appendChild(top);
    headerEl.innerHTML = "";
    headerEl.appendChild(content);
  }
}

function criarUIFiltros() {
  if (!headerEl || document.getElementById("filtros-wrapper")) return;
  
  const wrapper = document.createElement("div");
  wrapper.id = "filtros-wrapper";
  wrapper.innerHTML = `
    <select id="filter-conferencia" aria-label="Conferência">
      <option value="Todos">🏆 Todas Conferências</option>
    </select>
    <select id="filter-divisao" aria-label="Divisão">
      <option value="Todos">📍 Todas Divisões</option>
    </select>
    <select id="filter-titulos" aria-label="Títulos">
      <option value="Todos">🏅 Todos os títulos</option>
      <option value="0">Sem títulos</option>
      <option value="1">1 título</option>
      <option value="2-5">2-5 títulos</option>
      <option value="6-10">6-10 títulos</option>
      <option value=">10">10+ títulos</option>
    </select>
    <select id="filter-ordem" aria-label="Ordenar">
      <option value="nome">📝 A-Z</option>
      <option value="titulos-desc">🥇 Mais títulos</option>
      <option value="titulos-asc">📊 Menos títulos</option>
      <option value="fundacao">📅 Mais antigo</option>
    </select>
    <button id="btn-favoritos" title="Ver apenas favoritos">⭐ Favoritos (${favoritos.length})</button>
    <button id="btn-reset-filtros">✕ Limpar</button>
  `;
  
  const headerContent = headerEl.querySelector(".header-content") || headerEl;
  headerContent.appendChild(wrapper);
  
  ["filter-conferencia","filter-divisao","filter-titulos","filter-ordem"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", iniciarBusca);
  });
  
  document.getElementById("btn-favoritos")?.addEventListener("click", mostrarFavoritos);
  
  document.getElementById("btn-reset-filtros")?.addEventListener("click", () => {
    if (campoBusca) campoBusca.value = "";
    document.getElementById("filter-conferencia").value = "Todos";
    document.getElementById("filter-divisao").value = "Todos";
    document.getElementById("filter-titulos").value = "Todos";
    document.getElementById("filter-ordem").value = "nome";
    iniciarBusca();
  });
}

function criarBotaoAleatorio() {
  if (!headerEl || document.getElementById("btn-aleatorio")) return;
  
  const btn = document.createElement("button");
  btn.id = "btn-aleatorio";
  btn.innerHTML = "🎲 Procurando um time? Sorteie aqui!";
  
  const wrapper = document.getElementById("filtros-wrapper");
  if (wrapper) wrapper.appendChild(btn);
  else headerEl.appendChild(btn);
  
  btn.addEventListener("click", escolherTimeAleatorioAnimated);
}

function criarStatsBar() {
  if (document.getElementById("stats-bar")) return;
  
  const main = document.querySelector("main");
  const bar = document.createElement("div");
  bar.id = "stats-bar";
  
  const totalTitulos = dados.reduce((s, d) => s + (d.titulos || 0), 0);
  const timeMaisTitulos = dados.reduce((a, b) => (a.titulos || 0) > (b.titulos || 0) ? a : b, dados[0]);
  const timesMaisTitulos = dados.filter(d => (d.titulos || 0) > 10);
  
  bar.innerHTML = `
    <div class="stat-item">
      <span class="icon">🏀</span>
      <div>
        <div class="value">${dados.length}</div>
        <div class="label">Times</div>
      </div>
    </div>
    <div class="stat-item">
      <span class="icon">🏆</span>
      <div>
        <div class="value">${totalTitulos}</div>
        <div class="label">Títulos totais</div>
      </div>
    </div>
    <div class="stat-item">
      <span class="icon">👑</span>
      <div>
        <div class="value">${timeMaisTitulos?.titulos || 0}</div>
        <div class="label">${timeMaisTitulos?.nome || '-'}</div>
      </div>
    </div>
    <div class="stat-item">
      <span class="icon">⭐</span>
      <div>
        <div class="value">${timesMaisTitulos.length}</div>
        <div class="label">Dinastias (10+)</div>
      </div>
    </div>
  `;
  
  main?.parentNode.insertBefore(bar, main);
}

function criarModal() {
  if (document.getElementById("modal-overlay")) return;
  
  const modal = document.createElement("div");
  modal.id = "modal-overlay";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button class="modal-close" aria-label="Fechar">×</button>
        <img class="modal-logo" src="" alt="">
        <h2 class="modal-title"></h2>
        <p class="fundacao"></p>
      </div>
      <div class="modal-body">
        <div class="modal-stats"></div>
        <p class="modal-descricao"></p>
        <a href="#" target="_blank" rel="noopener" class="modal-link">🏀 Acompanhe o time na ESPN</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector(".modal-close").addEventListener("click", fecharModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });
}

function abrirModal(time) {
  const modal = document.getElementById("modal-overlay");
  if (!modal || !time) return;
  
  const logo = getTeamLogo(time);
  
  modal.querySelector(".modal-logo").src = logo;
  modal.querySelector(".modal-logo").alt = time.nome;
  modal.querySelector(".modal-title").textContent = time.nome;
  modal.querySelector(".modal-header .fundacao").textContent = time.fundacao || "";
  
  modal.querySelector(".modal-stats").innerHTML = `
    <div class="modal-stat titulos">
      <div class="label">Títulos</div>
      <div class="value">🏆 ${time.titulos || 0}</div>
    </div>
    <div class="modal-stat">
      <div class="label">Último Título</div>
      <div class="value">${time.ultimo_titulo || "Nunca"}</div>
    </div>
    <div class="modal-stat">
      <div class="label">Conferência</div>
      <div class="value">${time.conferencia || "-"}</div>
    </div>
    <div class="modal-stat">
      <div class="label">Divisão</div>
      <div class="value">${time.divisao || "-"}</div>
    </div>
  `;
  
  modal.querySelector(".modal-descricao").textContent = time.descricao || "";
  modal.querySelector(".modal-link").href = time.link || "#";
  
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  const modal = document.getElementById("modal-overlay");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function toggleFavorito(nomeTime) {
  const index = favoritos.indexOf(nomeTime);
  if (index > -1) {
    favoritos.splice(index, 1);
  } else {
    favoritos.push(nomeTime);
  }
  localStorage.setItem('nbawiki-favoritos', JSON.stringify(favoritos));
  atualizarBotaoFavoritos();
  renderCards(dados.filter(d => campoBusca.value || filtrosAtivos() ? true : true));
}

function atualizarBotaoFavoritos() {
  const btn = document.getElementById("btn-favoritos");
  if (btn) btn.innerHTML = `⭐ Favoritos (${favoritos.length})`;
}

function mostrarFavoritos() {
  if (favoritos.length === 0) {
    alert("Você ainda não tem times favoritos! Clique no ❤️ nos cards para adicionar.");
    return;
  }
  const timesFavoritos = dados.filter(d => favoritos.includes(d.nome));
  renderCards(timesFavoritos);
  
  const btnVoltar = document.getElementById("btn-voltar-todos");
  if (!btnVoltar) criarBotaoVoltar();
}

function filtrosAtivos() {
  const conf = document.getElementById("filter-conferencia")?.value;
  const div = document.getElementById("filter-divisao")?.value;
  const tit = document.getElementById("filter-titulos")?.value;
  return conf !== "Todos" || div !== "Todos" || tit !== "Todos";
}

function criarTimelineSection() {
  if (document.getElementById("timeline-section")) return;
  
  const main = document.querySelector("main");
  if (!main) return;
  
  let featuresGrid = document.getElementById("features-grid");
  if (!featuresGrid) {
    featuresGrid = document.createElement("div");
    featuresGrid.id = "features-grid";
    featuresGrid.className = "features-grid";
    
    const cardContainer = main.querySelector(".card-container");
    if (cardContainer) {
      main.insertBefore(featuresGrid, cardContainer);
    } else {
      main.appendChild(featuresGrid);
    }
  }
  
  const section = document.createElement("section");
  section.id = "timeline-section";
  section.className = "feature-section";
  
  section.innerHTML = `
    <div class="section-header">
      <h3>📅 LINHA DO TEMPO DOS CAMPEÕES</h3>
      <p>Explore a história dos últimos 20 anos da NBA</p>
    </div>
    <div class="timeline-controls">
      <button id="timeline-prev">←</button>
      <div id="timeline-year" class="timeline-year">2024</div>
      <button id="timeline-next">→</button>
    </div>
    <div id="timeline-content" class="timeline-content"></div>
  `;
  
  featuresGrid.appendChild(section);
  
  let anoAtual = 2024;
  const campeoesPorAno = gerarCampeoesPorAno();
  
  function atualizarTimeline() {
    const campeao = campeoesPorAno[anoAtual];
    const content = document.getElementById("timeline-content");
    const yearEl = document.getElementById("timeline-year");
    
    if (yearEl) yearEl.textContent = anoAtual;
    
    if (content && campeao) {
      const time = dados.find(d => d.nome === campeao);
      if (time) {
        content.innerHTML = `
          <div class="timeline-champion" data-team="${time.nome.toLowerCase().replace(/\s+/g, '-')}">
            <img src="${getTeamLogo(time)}" alt="${time.nome}" class="timeline-logo">
            <h4>${time.nome}</h4>
            <p class="timeline-desc">${time.descricao}</p>
            <div class="timeline-stats">
              <span>🏆 ${time.titulos} títulos totais</span>
              <span>📍 ${time.conferencia} - ${time.divisao}</span>
            </div>
          </div>
        `;
      }
    }
  }
  
  document.getElementById("timeline-prev")?.addEventListener("click", () => {
    if (anoAtual > 2005) {
      anoAtual--;
      atualizarTimeline();
    }
  });
  
  document.getElementById("timeline-next")?.addEventListener("click", () => {
    if (anoAtual < 2024) {
      anoAtual++;
      atualizarTimeline();
    }
  });
  
  atualizarTimeline();
}

function gerarCampeoesPorAno() {
  return {
    2024: "Boston Celtics",
    2023: "Denver Nuggets",
    2022: "Golden State Warriors",
    2021: "Milwaukee Bucks",
    2020: "Los Angeles Lakers",
    2019: "Toronto Raptors",
    2018: "Golden State Warriors",
    2017: "Golden State Warriors",
    2016: "Cleveland Cavaliers",
    2015: "Golden State Warriors",
    2014: "San Antonio Spurs",
    2013: "Miami Heat",
    2012: "Miami Heat",
    2011: "Dallas Mavericks",
    2010: "Los Angeles Lakers",
    2009: "Los Angeles Lakers",
    2008: "Boston Celtics",
    2007: "San Antonio Spurs",
    2006: "Miami Heat",
    2005: "San Antonio Spurs"
  };
}

function criarQuizSection() {
  if (document.getElementById("quiz-section")) return;
  
  const main = document.querySelector("main");
  if (!main) return;
  
  let featuresGrid = document.getElementById("features-grid");
  if (!featuresGrid) {
    featuresGrid = document.createElement("div");
    featuresGrid.id = "features-grid";
    featuresGrid.className = "features-grid";
    
    const cardContainer = main.querySelector(".card-container");
    if (cardContainer) {
      main.insertBefore(featuresGrid, cardContainer);
    } else {
      main.appendChild(featuresGrid);
    }
  }
  
  const section = document.createElement("section");
  section.id = "quiz-section";
  section.className = "feature-section";
  
  section.innerHTML = `
    <div class="section-header">
      <h3>🎯 QUIZ: QUAL TIME COMBINA COM VOCÊ?</h3>
      <p>Responda 5 perguntas e descubra seu time ideal!</p>
    </div>
    <div id="quiz-container">
      <button id="btn-iniciar-quiz" class="btn-primary">🎮 Iniciar Quiz</button>
    </div>
  `;
  
  featuresGrid.appendChild(section);
  
  document.getElementById("btn-iniciar-quiz")?.addEventListener("click", iniciarQuiz);
}

function iniciarQuiz() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  
  const perguntas = [
    {
      q: "Qual estilo de jogo você prefere?",
      opcoes: [
        { texto: "🏃 Jogo rápido e corrido", peso: { conferencia: "Oeste", titulos: 5 } },
        { texto: "🛡️ Defesa forte e tática", peso: { conferencia: "Leste", titulos: 10 } },
        { texto: "⭐ Star power e espetáculo", peso: { conferencia: "Oeste", divisao: "Pacific" } },
        { texto: "🤝 Trabalho em equipe", peso: { conferencia: "Leste", divisao: "Central" } }
      ]
    },
    {
      q: "Que tipo de história te atrai?",
      opcoes: [
        { texto: "👑 Dinastia vitoriosa", peso: { titulos: 15 } },
        { texto: "📈 Time em ascensão", peso: { titulos: 3 } },
        { texto: "💔 Azarão buscando glória", peso: { titulos: 0 } },
        { texto: "🔄 Tradição consistente", peso: { titulos: 8 } }
      ]
    },
    {
      q: "Qual região dos EUA te agrada?",
      opcoes: [
        { texto: "🌴 Costa Oeste", peso: { conferencia: "Oeste", divisao: "Pacific" } },
        { texto: "🏙️ Costa Leste", peso: { conferencia: "Leste", divisao: "Atlantic" } },
        { texto: "🌾 Centro-Oeste", peso: { divisao: "Central" } },
        { texto: "🤠 Sul", peso: { divisao: "Southwest" } }
      ]
    },
    {
      q: "O que mais importa em um time?",
      opcoes: [
        { texto: "🏆 Quantidade de títulos", peso: { titulos: 12 } },
        { texto: "🎨 Cores e identidade visual", peso: {} },
        { texto: "🌆 Cidade/Cultura local", peso: {} },
        { texto: "📊 Desempenho recente", peso: { titulos: 5 } }
      ]
    },
    {
      q: "Seu estilo de torcedor:",
      opcoes: [
        { texto: "🔥 Fanático apaixonado", peso: { titulos: 8 } },
        { texto: "🧠 Analista técnico", peso: { conferencia: "Leste" } },
        { texto: "🎉 Curtidor casual", peso: { divisao: "Pacific" } },
        { texto: "💪 Fiel na derrota", peso: { titulos: 2 } }
      ]
    }
  ];
  
  let respostas = [];
  let perguntaAtual = 0;
  
  function mostrarPergunta() {
    const p = perguntas[perguntaAtual];
    container.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-bar" style="width: ${((perguntaAtual + 1) / perguntas.length) * 100}%"></div>
      </div>
      <div class="quiz-question">
        <h4>Pergunta ${perguntaAtual + 1}/${perguntas.length}</h4>
        <p>${p.q}</p>
        <div class="quiz-options">
          ${p.opcoes.map((op, i) => `
            <button class="quiz-option" data-index="${i}">${op.texto}</button>
          `).join('')}
        </div>
      </div>
    `;
    
    container.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.index);
        respostas.push(p.opcoes[idx].peso);
        perguntaAtual++;
        
        if (perguntaAtual < perguntas.length) {
          mostrarPergunta();
        } else {
          mostrarResultado();
        }
      });
    });
  }
  
  function mostrarResultado() {
    const timeRecomendado = calcularTimeRecomendado(respostas);
    const cardId = `card-${timeRecomendado.nome.replace(/\s+/g, '-')}`;
    
    container.innerHTML = `
      <div class="quiz-result">
        <h4>🎊 Seu Time Ideal É:</h4>
        <div class="quiz-result-team">
          <img src="${getTeamLogo(timeRecomendado)}" alt="${timeRecomendado.nome}" class="quiz-result-logo">
          <h3>${timeRecomendado.nome}</h3>
          <p>${timeRecomendado.descricao}</p>
          <div class="quiz-result-stats">
            <span>🏆 ${timeRecomendado.titulos} títulos</span>
            <span>📍 ${timeRecomendado.conferencia} - ${timeRecomendado.divisao}</span>
          </div>
          <div class="quiz-result-actions">
            <button class="btn-primary" id="btn-ver-time">Ver Time</button>
            <button class="btn-secondary" id="btn-refazer-quiz">Refazer Quiz</button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById("btn-ver-time")?.addEventListener("click", () => {
      const card = document.getElementById(cardId);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.boxShadow = '0 0 50px rgba(200,16,46,0.6)';
        setTimeout(() => {
          card.style.boxShadow = '';
        }, 2000);
      }
    });
    
    document.getElementById("btn-refazer-quiz")?.addEventListener("click", () => {
      respostas = [];
      perguntaAtual = 0;
      mostrarPergunta();
    });
  }
  
  mostrarPergunta();
}

function calcularTimeRecomendado(respostas) {
  const scores = {};
  
  dados.forEach(time => {
    let score = 0;
    
    respostas.forEach(resp => {
      if (resp.conferencia && time.conferencia === resp.conferencia) {
        score += 10;
      }
      
      if (resp.divisao && time.divisao === resp.divisao) {
        score += 8;
      }
      
      if (resp.titulos !== undefined) {
        const diff = Math.abs(time.titulos - resp.titulos);
        score += Math.max(0, 7 - diff);
      }
    });
    
    score += Math.random() * 0.5;
    
    scores[time.nome] = score;
  });
  
  const melhorTime = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  return dados.find(d => d.nome === melhorTime);
}

async function carregarDados() {
  if (dados.length) return;
  
  try {
    const res = await fetch("data.json");
    dados = await res.json();
    
    dados.forEach(d => {
      d.titulos = typeof d.titulos === "number" ? d.titulos : parseInt(d.titulos) || 0;
    });
    
    dados.sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
    preencherFiltrosDinamicos();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    cardContainer.innerHTML = `<article class="card empty"><p>Erro ao carregar dados.</p></article>`;
  }
}

function preencherFiltrosDinamicos() {
  const confs = [...new Set(dados.map(d => d.conferencia).filter(Boolean))].sort();
  const divs = [...new Set(dados.map(d => d.divisao).filter(Boolean))].sort();
  
  const confSel = document.getElementById("filter-conferencia");
  const divSel = document.getElementById("filter-divisao");
  
  confs.forEach(c => confSel?.insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`));
  divs.forEach(d => divSel?.insertAdjacentHTML("beforeend", `<option value="${d}">${d}</option>`));
}

async function iniciarBusca() {
  await carregarDados();
  
  const termo = (campoBusca?.value || "").trim().toLowerCase();
  const conf = document.getElementById("filter-conferencia")?.value || "Todos";
  const div = document.getElementById("filter-divisao")?.value || "Todos";
  const tit = document.getElementById("filter-titulos")?.value || "Todos";
  const ordem = document.getElementById("filter-ordem")?.value || "nome";
  
  let resultado = dados.filter(d => {
    const searchable = [d.nome, d.descricao, d.conferencia, d.divisao].join(" ").toLowerCase();
    const matchTexto = !termo || searchable.includes(termo);
    const matchConf = conf === "Todos" || d.conferencia?.toLowerCase() === conf.toLowerCase();
    const matchDiv = div === "Todos" || d.divisao?.toLowerCase() === div.toLowerCase();
    
    let matchTit = true;
    const t = d.titulos || 0;
    if (tit === "0") matchTit = t === 0;
    else if (tit === "1") matchTit = t === 1;
    else if (tit === "2-5") matchTit = t >= 2 && t <= 5;
    else if (tit === "6-10") matchTit = t >= 6 && t <= 10;
    else if (tit === ">10") matchTit = t > 10;
    
    return matchTexto && matchConf && matchDiv && matchTit;
  });
  
  const extrairAno = str => parseInt((str || "").match(/\d{4}/)?.[0]) || 9999;
  
  resultado.sort((a, b) => {
    switch (ordem) {
      case "titulos-desc": return (b.titulos || 0) - (a.titulos || 0);
      case "titulos-asc": return (a.titulos || 0) - (b.titulos || 0);
      case "fundacao": return extrairAno(a.fundacao) - extrairAno(b.fundacao);
      default: return a.nome.localeCompare(b.nome, "pt");
    }
  });
  
  renderCards(resultado);
}

function renderCards(lista) {
  cardContainer.innerHTML = "";
  
  if (!lista?.length) {
    cardContainer.innerHTML = `<article class="card empty"><p>🔍 Nenhum time encontrado. Tente outros filtros.</p></article>`;
    return;
  }
  
  const frag = document.createDocumentFragment();
  
  lista.forEach((d, i) => {
    const card = document.createElement("article");
    card.className = "card";
    card.id = `card-${d.nome.replace(/\s+/g, '-')}`;
    card.style.animationDelay = `${Math.min(i * 0.05, 0.3)}s`;
    
    const teamSlug = d.nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    card.setAttribute("data-team", teamSlug);
    
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      abrirModal(d);
    });
    
    const titulosBadge = d.titulos > 0
      ? `<span class="titulos-badge">🏆 ${d.titulos}</span>`
      : `<span class="titulos-badge zero">0 títulos</span>`;
    
    const logoUrl = getTeamLogo(d);
    const isFavorito = favoritos.includes(d.nome);
    
    card.innerHTML = `
      <button class="btn-favorito ${isFavorito ? 'active' : ''}" data-time="${d.nome}" title="Adicionar aos favoritos">
        ${isFavorito ? '❤️' : '🤍'}
      </button>
      <img class="logo-time" src="${logoUrl}" alt="${d.nome}" width="80" height="80" loading="lazy"
           onerror="this.onerror=null;this.src='${gerarPlaceholderDataURL(d.nome)}'">
      <div class="card-content">
        <div class="card-head">
          <h2>${d.nome} ${titulosBadge}</h2>
          <p class="fundacao">${d.fundacao || ''}</p>
        </div>
        <div class="meta">
          <span>📍 ${d.conferencia || '-'}</span>
          <span>🏟️ ${d.divisao || '-'}</span>
          <span>🏅 Último título: ${d.ultimo_titulo || 'Nunca'}</span>
        </div>
        <p class="descricao">${d.descricao || ''}</p>
        <a href="${d.link || '#'}" target="_blank" rel="noopener" class="btn-link">Acompanhe o time</a>
      </div>
    `;
    
    frag.appendChild(card);
    
    const btnFav = card.querySelector(".btn-favorito");
    btnFav?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorito(d.nome);
      btnFav.classList.toggle('active');
      btnFav.textContent = favoritos.includes(d.nome) ? '❤️' : '🤍';
    });
  });
  
  cardContainer.appendChild(frag);
}

async function escolherTimeAleatorioAnimated() {
  if (isShuffling || !dados.length) return;
  isShuffling = true;
  
  // Remove botão voltar se existir
  document.getElementById("btn-voltar-todos")?.remove();
  
  const steps = 20;
  const minDelay = 50;
  const maxDelay = 350;
  
  const delays = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    delays.push(Math.round(minDelay + (maxDelay - minDelay) * (t * t)));
  }
  
  let cumulative = 0;
  let winner = null;
  
  for (let i = 0; i < steps; i++) {
    cumulative += delays[i];
    
    const step = i;
    setTimeout(() => {
      const randIndex = Math.floor(Math.random() * dados.length);
      const time = dados[randIndex];
      
      renderCards([time]);
      
      const card = cardContainer.querySelector(".card");
      if (card) {
        card.classList.add("shuffle-highlight");
        setTimeout(() => card.classList.remove("shuffle-highlight"), 200);
      }
      
      if (step === steps - 1) {
        winner = time;
        
        setTimeout(() => {
          renderCards([winner]);
          const winnerCard = cardContainer.querySelector(".card");
          if (winnerCard) {
            winnerCard.classList.add("shuffle-winner");
            setTimeout(() => winnerCard.classList.remove("shuffle-winner"), 1500);
          }
          criarBotaoVoltar();
          isShuffling = false;
        }, 150);
      }
    }, cumulative);
  }
}

function criarBotaoVoltar() {
  if (document.getElementById("btn-voltar-todos")) return;
  
  const btn = document.createElement("button");
  btn.id = "btn-voltar-todos";
  btn.textContent = "← Ver todos os times";
  
  const wrapper = document.getElementById("filtros-wrapper");
  if (wrapper) wrapper.appendChild(btn);
  
  btn.addEventListener("click", () => {
    renderCards(dados);
    btn.remove();
  });
}

function gerarPlaceholderDataURL(nome) {
  const initials = pegarIniciais(nome);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='%23C8102E'/>
        <stop offset='100%' stop-color='%231D428A'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(%23g)' rx='20'/>
    <text x='50%' y='50%' font-family='Arial' font-size='70' font-weight='bold' fill='white' dy='.35em' text-anchor='middle'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function pegarIniciais(nome) {
  if (!nome) return "?";
  const parts = nome.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

window.iniciarBusca = iniciarBusca;