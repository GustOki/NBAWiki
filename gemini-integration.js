class GeminiNBAAssistant {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
    this.teamsData = [];
    console.log('🤖 GeminiNBAAssistant criado com modelo gemini-1.5-flash');
  }

  loadTeamsData(teams) {
    this.teamsData = teams;
    console.log(`📊 ${teams.length} times carregados no assistente`);
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
    console.log('🔍 Consultando Gemini:', userQuestion);
    
    if (!this.teamsData || this.teamsData.length === 0) {
      console.warn('⚠️ Tentando consultar sem dados carregados, aguardando...');
      if (window.dados && window.dados.length > 0) {
        this.loadTeamsData(window.dados);
      } else {
        return {
          type: 'error',
          message: 'Os dados dos times ainda estão carregando. Aguarde um momento e tente novamente.'
        };
      }
    }
    
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

      console.log('📡 Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro da API:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Resposta recebida do Gemini');
      
      const answer = data.candidates[0].content.parts[0].text;
      console.log('💬 Resposta:', answer.substring(0, 100) + '...');
      
      return this.parseResponse(answer);
    } catch (error) {
      console.error('❌ Erro ao consultar Gemini:', error);
      return {
        type: 'error',
        message: `Erro ao consultar a IA. ${error.message.includes('404') ? 'Modelo não encontrado.' : 'Tente novamente.'}`
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
    console.log('🎨 GeminiChatUI inicializado');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initUI());
    } else {
      this.initUI();
    }
  }

  initUI() {
    console.log('🚀 Inicializando UI do chat...');
    
    const chatButton = document.getElementById('gemini-chat-button');
    const chatContainer = document.getElementById('gemini-chat-container');
    
    if (!chatButton || !chatContainer) {
      console.error('❌ Elementos do chat não encontrados no DOM');
      return;
    }

    chatButton.style.display = 'flex';
    console.log('✅ Botão do chat visível');

    this.attachEventListeners();
    this.renderSuggestions();
    
    console.log('✅ UI do chat inicializada!');
  }

  attachEventListeners() {
    const chatButton = document.getElementById('gemini-chat-button');
    const minimizeBtn = document.querySelector('.chat-minimize');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    if (chatButton) {
      chatButton.addEventListener('click', (e) => {
        console.log('🖱️ Botão clicado');
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });
    }
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });
    }
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
  }

  toggleChat() {
    const container = document.getElementById('gemini-chat-container');
    const button = document.getElementById('gemini-chat-button');
    
    if (!container || !button) return;
    
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      console.log('✅ Abrindo chat');
      container.classList.add('active');
      button.style.display = 'none';
      setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
      }, 300);
    } else {
      console.log('✅ Fechando chat');
      container.classList.remove('active');
      button.style.display = 'flex';
    }
  }

  renderSuggestions() {
    const container = document.getElementById('chat-suggestions');
    if (!container) return;
    
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
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = suggestion;
          this.sendMessage();
        }
      });
    });
    
    console.log('✅ Sugestões renderizadas');
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message) return;

    console.log('📤 Enviando:', message);
    
    this.addMessage(message, 'user');
    input.value = '';

    this.showTypingIndicator();

    try {
      const response = await this.assistant.query(message);
      console.log('📥 Resposta tipo:', response.type);
      
      this.hideTypingIndicator();
      
      if (response.type === 'filter' && response.teams && response.teams.length > 0) {
        this.addMessage(response.message || `Encontrei ${response.teams.length} time(s) para você!`, 'assistant');
        if (typeof window.renderCards === 'function') {
          window.renderCards(response.teams);
        }
        
        this.addActionButton('Ver todos os times', () => {
          if (typeof window.renderCards === 'function' && window.dados) {
            window.renderCards(window.dados);
          }
        });
        
      } else if (response.type === 'conversation') {
        this.addMessage(response.message, 'assistant');
      } else if (response.type === 'error') {
        this.addMessage(response.message, 'assistant error');
      }
      
    } catch (error) {
      console.error('❌ Erro:', error);
      this.hideTypingIndicator();
      this.addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'assistant error');
    }
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
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
    if (!messagesContainer) return;
    
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'chat-message assistant';
    buttonDiv.innerHTML = `
      <div class="message-content">
        <button class="action-button">${text}</button>
      </div>
    `;
    
    messagesContainer.appendChild(buttonDiv);
    const actionButton = buttonDiv.querySelector('.action-button');
    if (actionButton) {
      actionButton.addEventListener('click', onClick);
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
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
  console.log('🚀 Iniciando Gemini Assistant...');
  
  if (!apiKey) {
    console.error('❌ API Key não fornecida!');
    return null;
  }
  
  const assistant = new GeminiNBAAssistant(apiKey);
  
  if (window.dados && window.dados.length > 0) {
    assistant.loadTeamsData(window.dados);
    console.log('✅ Dados carregados imediatamente');
  } else {
    console.log('⏳ Aguardando dados dos times...');
    // Aguardar dados ficarem disponíveis
    const checkData = setInterval(() => {
      if (window.dados && window.dados.length > 0) {
        assistant.loadTeamsData(window.dados);
        console.log('✅ Dados carregados após aguardar');
        clearInterval(checkData);
      }
    }, 100);
    
    setTimeout(() => clearInterval(checkData), 5000);
  }
  
  const chatUI = new GeminiChatUI(assistant);
  
  console.log('✅ Assistente Gemini pronto!');
  return { assistant, chatUI };
};