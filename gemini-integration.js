class GeminiNBAAssistant {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.teamsData = [];
  }

  loadTeamsData(teams) {
    this.teamsData = teams;
  }

  prepareContext() {
    const context = `Você é um assistente especializado em times da NBA. Aqui estão todos os times disponíveis:

${this.teamsData.map(team => `
- ${team.nome}
  * Fundação: ${team.fundacao}
  * Títulos: ${team.titulos}
  * Último título: ${team.ultimo_titulo || 'Nunca'}
  * Conferência: ${team.conferencia}
  * Divisão: ${team.divisao}
  * Descrição: ${team.descricao}
`).join('\n')}

Responda de forma concisa, amigável e precisa. Se a pergunta for sobre buscar times específicos, retorne APENAS os nomes dos times no formato: TEAMS: [nome1, nome2, nome3]
Para perguntas gerais ou comparações, responda normalmente de forma conversacional.`;
    
    return context;
  }

  async query(userQuestion) {
    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${this.prepareContext()}\n\nPergunta do usuário: ${userQuestion}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.candidates[0].content.parts[0].text;
      
      return this.parseResponse(answer);
    } catch (error) {
      console.error('Erro ao consultar Gemini:', error);
      return {
        type: 'error',
        message: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.'
      };
    }
  }

  parseResponse(answer) {
    if (answer.includes('TEAMS:')) {
      const teamsMatch = answer.match(/TEAMS:\s*\[(.*?)\]/);
      if (teamsMatch) {
        const teamNames = teamsMatch[1]
          .split(',')
          .map(name => name.trim().replace(/['"]/g, ''));
        
        const teams = teamNames
          .map(name => this.teamsData.find(t => 
            t.nome.toLowerCase().includes(name.toLowerCase())
          ))
          .filter(Boolean);

        return {
          type: 'filter',
          teams: teams,
          message: answer.replace(/TEAMS:.*?\]/, '').trim()
        };
      }
    }

    return {
      type: 'conversation',
      message: answer
    };
  }

  getSuggestions() {
    return [
      "🏆 Quais times têm mais de 5 títulos?",
      "📍 Me mostre times da Califórnia",
      "⭐ Sugira um time para começar a torcer",
      "📊 Compare Lakers e Celtics",
      "🎯 Times que nunca ganharam título",
      "🔥 Qual time está em alta recentemente?",
      "💜 Times com uniforme roxo",
      "🏀 História dos Chicago Bulls",
    ];
  }
}

class GeminiChatUI {
  constructor(assistant) {
    this.assistant = assistant;
    this.isOpen = false;
    this.createUI();
  }

  createUI() {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'gemini-chat-container';
    chatContainer.className = 'gemini-chat-container';
    chatContainer.innerHTML = `
      <div class="chat-header">
        <div class="chat-title">
          <span class="ai-icon">🤖</span>
          <span>Assistente NBA</span>
          <span class="powered-by">Powered by Gemini</span>
        </div>
        <button class="chat-minimize" aria-label="Minimizar">−</button>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-message assistant">
          <div class="message-content">
            <p>👋 Olá! Sou seu assistente inteligente de NBA! Posso ajudar você a:</p>
            <ul>
              <li>Encontrar times por características</li>
              <li>Comparar estatísticas</li>
              <li>Recomendar times para torcer</li>
              <li>Responder curiosidades</li>
            </ul>
            <p>Experimente perguntar algo!</p>
          </div>
        </div>
        <div class="suggestions" id="chat-suggestions"></div>
      </div>
      <div class="chat-input-container">
        <input 
          type="text" 
          id="chat-input" 
          placeholder="Pergunte sobre times da NBA..."
          aria-label="Campo de pergunta"
        />
        <button id="chat-send" aria-label="Enviar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(chatContainer);

    const chatButton = document.createElement('button');
    chatButton.id = 'gemini-chat-button';
    chatButton.className = 'gemini-chat-button';
    chatButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.68-.29-3.86-.82l-.28-.13-2.76.47.47-2.76-.13-.28C4.29 14.68 4 13.38 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
        <circle cx="9" cy="12" r="1"/>
        <circle cx="12" cy="12" r="1"/>
        <circle cx="15" cy="12" r="1"/>
      </svg>
      <span class="notification-badge">AI</span>
    `;
    chatButton.setAttribute('aria-label', 'Abrir chat do assistente');
    document.body.appendChild(chatButton);

    this.attachEventListeners();
    this.renderSuggestions();
  }

  attachEventListeners() {
    const chatButton = document.getElementById('gemini-chat-button');
    const chatContainer = document.getElementById('gemini-chat-container');
    const minimizeBtn = document.querySelector('.chat-minimize');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    chatButton.addEventListener('click', () => this.toggleChat());
    minimizeBtn.addEventListener('click', () => this.toggleChat());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  toggleChat() {
    const container = document.getElementById('gemini-chat-container');
    const button = document.getElementById('gemini-chat-button');
    
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      container.classList.add('active');
      button.style.display = 'none';
      document.getElementById('chat-input').focus();
    } else {
      container.classList.remove('active');
      button.style.display = 'flex';
    }
  }

  renderSuggestions() {
    const container = document.getElementById('chat-suggestions');
    const suggestions = this.assistant.getSuggestions();
    
    container.innerHTML = `
      <div class="suggestions-title">💡 Sugestões:</div>
      ${suggestions.map(suggestion => `
        <button class="suggestion-chip" data-suggestion="${suggestion}">
          ${suggestion}
        </button>
      `).join('')}
    `;

    container.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const suggestion = chip.getAttribute('data-suggestion');
        document.getElementById('chat-input').value = suggestion;
        this.sendMessage();
      });
    });
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage(message, 'user');
    input.value = '';

    this.showTypingIndicator();

    try {
      const response = await this.assistant.query(message);
      
      this.hideTypingIndicator();
      
      if (response.type === 'filter' && response.teams.length > 0) {
        this.addMessage(response.message || `Encontrei ${response.teams.length} time(s) para você!`, 'assistant');
        window.renderCards(response.teams);
        
        this.addActionButton('Ver todos os times', () => {
          window.renderCards(window.dados);
        });
        
      } else if (response.type === 'conversation') {
        this.addMessage(response.message, 'assistant');
      } else if (response.type === 'error') {
        this.addMessage(response.message, 'assistant error');
      }
      
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'assistant error');
    }
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `
      <div class="message-content">
        ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addActionButton(text, onClick) {
    const messagesContainer = document.getElementById('chat-messages');
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'chat-message assistant';
    buttonDiv.innerHTML = `
      <div class="message-content">
        <button class="action-button">${text}</button>
      </div>
    `;
    
    messagesContainer.appendChild(buttonDiv);
    buttonDiv.querySelector('.action-button').addEventListener('click', onClick);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'chat-message assistant';
    indicator.innerHTML = `
      <div class="message-content typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }
}

window.GeminiNBAAssistant = GeminiNBAAssistant;
window.GeminiChatUI = GeminiChatUI;

window.initGeminiAssistant = function(apiKey) {
  const assistant = new GeminiNBAAssistant(apiKey);
  assistant.loadTeamsData(window.dados);
  
  const chatUI = new GeminiChatUI(assistant);
  
  console.log('✅ Assistente Gemini inicializado com sucesso!');
  return { assistant, chatUI };
};