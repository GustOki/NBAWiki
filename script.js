let container = document.querySelector(".card-container");
let dados = [];

async function iniciarBusca(){
    let resposta = await fetch("data.json");
    dados = await resposta.json();
    renderCards(dados);
}

function renderCards(dados){
    
}