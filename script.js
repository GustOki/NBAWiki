const cardContainer = document.querySelector(".card-container");
const campoBusca = document.querySelector("header input");
let dados = [];

async function iniciarBusca(){
  if (dados.length === 0) {
    try{
        let resposta = await fetch("data.json");
        dados = await resposta.json();
    }catch (error){
        console.log("Falha ao buscar dados: ", error);
        return;
    }
  }
  
  const termoBusca = campoBusca.value.toLowerCase();
  const dadosFiltrados = dados.filter(dado => 
    dado.nome.toLowerCase().includes(termoBusca) ||
    dado.descricao.toLowerCase().includes(termoBusca)
  );

  renderCards(dadosFiltrados);
}

function renderCards(dados){
  cardContainer.innerHTML = "";
  for (let dado of dados){
    let article = document.createElement("article");
    article.classList.add("card");
    article.innerHTML = `
        <article class="card">
        <img src="${dado.logo}" alt="Logo do ${dado.nome}" class="logo-time">

        <h2>${dado.nome}</h2>

        <p><strong>Fundação:</strong> ${dado.fundacao}</p>

        <p><strong>Conferência:</strong> ${dado.conferencia}</p>
        <p><strong>Divisão:</strong> ${dado.divisao}</p>

        <p><strong>Títulos da NBA:</strong> ${dado.titulos}</p>
        <p><strong>Último título:</strong> ${dado.ultimo_titulo ?? "—"}</p>

        <p class="descricao">${dado.descricao}</p>

        <a href="${dado.link}" target="_blank" class="btn-link">
            Acompanhe o time!
        </a>
    `

    cardContainer.appendChild(article);
  }
}
