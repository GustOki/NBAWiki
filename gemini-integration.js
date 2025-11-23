class GeminiNBAAssistant {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.teamsData = [];
    console.log('🤖 GeminiNBAAssistant criado com API Key:', this.apiKey ? '✅ Presente' : '❌ Ausente');
  }

  loadTeamsData(teams) {
    this.teamsData = teams;
    console.log(`📊 ${teams.length} times carregados`);
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
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Resposta recebida:', data);
      
      const answer = data.candidates[0].content.parts[0].text;
      console.log('💬 Resposta do Gemini:', answer);
      
      return this.parseResponse(answer);
    } catch (error) {
      console.error('❌ Erro ao consultar Gemini:', error);
      return {
        type: 'error',
        message: `Erro: ${error.message}. Verifique sua API Key.`
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
    
    console.log('🔍 Procurando elementos:', {
      botao: chatButton ? '✅ Encontrado' : '❌ Não encontrado',
      container: chatContainer ? '✅ Encontrado' : '❌ Não encontrado'
    });
    
    if (!chatButton || !chatContainer) {
      console.error('❌ Elementos do chat não encontrados no DOM');
      console.log('DOM atual:', document.body.innerHTML.substring(0, 500));
      return;
    }

    chatButton.style.display = 'flex';
    console.log('✅ Botão do chat configurado para display: flex');

    this.attachEventListeners();
    this.renderSuggestions();
    
    console.log('✅ UI do chat inicializada com sucesso!');
  }

  attachEventListeners() {
    console.log('🔗 Anexando event listeners...');
    
    const chatButton = document.getElementById('gemini-chat-button');
    const minimizeBtn = document.querySelector('.chat-minimize');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    if (chatButton) {
      chatButton.addEventListener('click', (e) => {
        console.log('🖱️ Botão do chat clicado!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });
      console.log('✅ Event listener do botão anexado');
    } else {
      console.error('❌ Botão do chat não encontrado para anexar listener');
    }
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        console.log('🖱️ Botão minimizar clicado!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });
      console.log('✅ Event listener do minimizar anexado');
    }
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        console.log('🖱️ Botão enviar clicado!');
        this.sendMessage();
      });
      console.log('✅ Event listener do enviar anexado');
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('⌨️ Enter pressionado!');
          this.sendMessage();
        }
      });
      console.log('✅ Event listener do input anexado');
    }
  }

  toggleChat() {
    console.log('🔄 Alternando chat. Estado atual:', this.isOpen ? 'Aberto' : 'Fechado');
    
    const container = document.getElementById('gemini-chat-container');
    const button = document.getElementById('gemini-chat-button');
    
    if (!container || !button) {
      console.error('❌ Elementos não encontrados no toggleChat');
      return;
    }
    
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      console.log('✅ Abrindo chat...');
      container.classList.add('active');
      button.style.display = 'none';
      const input = document.getElementById('chat-input');
      if (input) {
        setTimeout(() => input.focus(), 300);
      }
    } else {
      console.log('✅ Fechando chat...');
      container.classList.remove('active');
      button.style.display = 'flex';
    }
    
    console.log('✅ Chat alternado. Novo estado:', this.isOpen ? 'Aberto' : 'Fechado');
  }

  renderSuggestions() {
    const container = document.getElementById('chat-suggestions');
    if (!container) {
      console.warn('⚠️ Container de sugestões não encontrado');
      return;
    }
    
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
    console.log('📤 Enviando mensagem...');
    
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message) {
      console.warn('⚠️ Mensagem vazia, ignorando');
      return;
    }

    console.log('💬 Mensagem:', message);
    
    this.addMessage(message, 'user');
    input.value = '';

    this.showTypingIndicator();

    try {
      const response = await this.assistant.query(message);
      console.log('📥 Resposta recebida:', response);
      
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
      console.error('❌ Erro ao enviar mensagem:', error);
      this.hideTypingIndicator();
      this.addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'assistant error');
    }
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
      console.error('❌ Container de mensagens não encontrado');
      return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `
      <div class="message-content">
        ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    console.log('✅ Mensagem adicionada:', sender);
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
  console.log('📊 Dados disponíveis:', window.dados ? `✅ ${window.dados.length} times` : '❌ Não carregados');
  
  if (!apiKey) {
    console.error('❌ API Key não fornecida!');
    return null;
  }
  
  const assistant = new GeminiNBAAssistant(apiKey);
  
  if (window.dados) {
    assistant.loadTeamsData(window.dados);
  } else {
    console.warn('⚠️ Dados dos times ainda não carregados');
  }
  
  const chatUI = new GeminiChatUI(assistant);
  
  console.log('✅ Assistente Gemini inicializado com sucesso!');
  return { assistant, chatUI };
};