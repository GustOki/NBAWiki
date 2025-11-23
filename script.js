const cardContainer = document.querySelector(".card-container");
const campoBusca = document.querySelector("header input");
const headerEl = document.querySelector("header");
let dados = [];
let isShuffling = false;

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
    <button id="btn-reset-filtros">✕ Limpar</button>
  `;
  
  const headerContent = headerEl.querySelector(".header-content") || headerEl;
  headerContent.appendChild(wrapper);
  
  ["filter-conferencia","filter-divisao","filter-titulos","filter-ordem"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", iniciarBusca);
  });
  
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
    
    card.innerHTML = `
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
  });
  
  cardContainer.appendChild(frag);
}
async function escolherTimeAleatorioAnimated() {
  if (isShuffling || !dados.length) return;
  isShuffling = true;
  
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