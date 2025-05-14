// --- src/renderer.js ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('Renderer: DOM Carregado.');

    // --- Seletores Globais ---
    const menuEncomendas = document.getElementById('menu-encomendas');
    const menuMoradores = document.getElementById('menu-moradores');
    const menuUsuarios = document.getElementById('menu-usuarios'); // ID do menu no HTML
    const menuRelatorios = document.getElementById('menu-relatorios');
    const menuAjustes = document.getElementById('menu-ajustes');
    const mainContent = document.querySelector('.main-content');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginErrorMessage = document.getElementById('login-error-message');
    const loggedUserInfo = document.getElementById('logged-user-info');
    const logoutButton = document.getElementById('logout-button');
    // Modais
    const modalCadastroEncomenda = document.getElementById('modal-cadastro-encomenda');
    const btnCancelarEncomendaModal = document.getElementById('btn-cancelar-encomenda-modal');
    const formCadastroEncomenda = document.getElementById('form-cadastro-encomenda');
    const modalCadastroMorador = document.getElementById('modal-cadastro-morador');
    const btnCancelarMoradorModal = document.getElementById('btn-cancelar-morador-modal');
    const formCadastroMorador = document.getElementById('form-cadastro-morador');
    const modalMoradorTitle = document.getElementById('modal-morador-title');
    const btnSalvarMorador = document.getElementById('btn-salvar-morador');
    const modalCadastroUsuario = document.getElementById('modal-cadastro-usuario');
    const btnCancelarUsuarioModal = document.getElementById('btn-cancelar-usuario-modal');
    const formCadastroUsuario = document.getElementById('form-cadastro-usuario');
    const modalUsuarioTitle = document.getElementById('modal-usuario-title');
    const btnSalvarUsuario = document.getElementById('btn-salvar-usuario');
    const usuarioStatusSelect = document.getElementById('usuario-status');
    const grupoStatusUsuario = document.getElementById('grupo-status');
    const modalEntregaEncomenda = document.getElementById('modal-entrega-encomenda');
const formEntregaEncomenda = document.getElementById('form-entrega-encomenda');
const entregaEncomendaIdInput = document.getElementById('entrega-encomenda-id'); // Hidden input
const entregaMoradorInfoInput = document.getElementById('entrega-morador-info'); // Campo readonly
const inputEntregaPorteiro = document.getElementById('entrega-porteiro'); // Input para nome do porteiro
const suggestionsEntregaPorteiroDiv = document.getElementById('entrega-porteiro-suggestions'); // Div para sugestões
const entregaDataInput = document.getElementById('entrega-data');
const entregaHoraInput = document.getElementById('entrega-hora');
const entregaRetiradoPorInput = document.getElementById('entrega-retirado-por');
const entregaObservacoesTextarea = document.getElementById('entrega-observacoes');
const btnCancelarEntregaModal = document.getElementById('btn-cancelar-entrega-modal');
//const btnConfirmarEntrega = document.getElementById('btn-confirmar-entrega');
    // Autocomplete (Modal Encomenda)
    const inputMorador = document.getElementById('morador');
    const suggestionsMoradorDiv = document.getElementById('morador-suggestions');
    const inputPorteiro = document.getElementById('porteiro');
    const suggestionsPorteiroDiv = document.getElementById('porteiro-suggestions');

    console.log('DEBUG Autocomplete: inputMorador element:', inputMorador);
    console.log('DEBUG Autocomplete: suggestionsMoradorDiv element:', suggestionsMoradorDiv);
    console.log('DEBUG Autocomplete: inputPorteiro element:', inputPorteiro);
    console.log('DEBUG Autocomplete: suggestionsPorteiroDiv element:', suggestionsPorteiroDiv);

    // Estado
    let selectedPorteiroUserId = null;
    let selectedMoradorId = null;
    let currentUser = null;
    let selectedEntregaPorteiroId = null; // Para o ID do porteiro selecionado no modal de entrega



    // --- Funções de UI (Login/Logout) ---
    function showLoginScreen() { console.log("Mostrando login."); if(loginScreen) loginScreen.classList.remove('hidden'); if(appContainer) appContainer.classList.add('hidden'); currentUser = null; if(loggedUserInfo) loggedUserInfo.textContent = 'Usuário: -'; if(menuUsuarios) menuUsuarios.style.display = 'none'; if(usernameInput) usernameInput.value = ''; if(passwordInput) passwordInput.value = ''; if(loginErrorMessage) loginErrorMessage.style.display = 'none'; }
    function showAppScreen() {
        console.log("Mostrando app.");
        if (!currentUser) { showLoginScreen(); return; }
        console.log('DEBUG: Usuario logado:', currentUser); // Para verificar o objeto currentUser

        if(loginScreen) loginScreen.classList.add('hidden');
        if(appContainer) appContainer.classList.remove('hidden');
        if(loggedUserInfo) loggedUserInfo.textContent = `Usuário: ${currentUser.name} (${currentUser.status || 'Status Desconhecido'})`;
        if(menuUsuarios) menuUsuarios.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        carregarConteudo('Dashboard Encomendas', true);
    }

    // --- Funções de Controle dos Modais ---
    function requestMainWindowFocus() { setTimeout(() => { try { if (window.electronAPI?.focusMainWindow) window.electronAPI.focusMainWindow(); } catch (error) { console.error('Erro focar janela:', error); } }, 50); }
    function abrirModalEncomenda(encomendaId = null, packageDataToEdit = null) { // Novo parâmetro
    console.log(`Abrindo Modal Encomenda. ID: ${encomendaId || 'N/A'}`);
    // ... (lógica para fechar outros modais - mantenha) ...
    if (modalCadastroMorador?.classList.contains('active')) fecharModalMorador();
    if (modalCadastroUsuario?.classList.contains('active')) fecharModalCadastroUsuario();
    if (modalCadastroMorador) { modalCadastroMorador.style.display = 'none'; /*...*/ }
    if (modalCadastroUsuario) { modalCadastroUsuario.style.display = 'none'; /*...*/ }

    if (modalCadastroEncomenda) {
        formCadastroEncomenda.reset(); // Limpa o formulário primeiro
        selectedMoradorId = null;
        selectedPorteiroUserId = null;
        if (inputMorador) inputMorador.value = '';
        if (inputPorteiro) inputPorteiro.value = '';
        if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible');
        if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible');

        const hiddenEncomendaIdInput = document.getElementById('encomenda-id');
        const title = document.getElementById('modal-encomenda-title');
        const btn = document.getElementById('btn-salvar-encomenda');
        const qtdInput = document.getElementById('quantidade');
        const dataInput = document.getElementById('data');
        const horaInput = document.getElementById('hora');
        const obsInput = document.getElementById('observacoes');
        // const codigoRastreioInput = document.getElementById('codigo-rastreio'); // Se você tiver esse campo no modal

        if (packageDataToEdit && encomendaId) { // Se estamos editando
            console.log("Populando modal para edição:", packageDataToEdit);
            if (title) title.textContent = 'Editar Encomenda';
            if (btn) btn.textContent = 'Salvar Alterações';
            if (hiddenEncomendaIdInput) hiddenEncomendaIdInput.value = encomendaId;

            // Popular campos
            if (inputMorador && packageDataToEdit.morador_nome) inputMorador.value = packageDataToEdit.morador_nome;
            selectedMoradorId = packageDataToEdit.morador_id; // Importante setar o ID

            if (inputPorteiro && packageDataToEdit.porteiro_nome) inputPorteiro.value = packageDataToEdit.porteiro_nome;
            selectedPorteiroUserId = packageDataToEdit.porteiro_recebeu_id; // Importante setar o ID

            if (qtdInput) qtdInput.value = packageDataToEdit.quantidade || 1;
            if (obsInput) obsInput.value = packageDataToEdit.observacoes || '';
            // if (codigoRastreioInput) codigoRastreioInput.value = packageDataToEdit.codigo_rastreio || '';

            // Popular data e hora (usando os campos formatados do backend)
            if (dataInput && packageDataToEdit.data_recebimento_date) dataInput.value = packageDataToEdit.data_recebimento_date;
            if (horaInput && packageDataToEdit.data_recebimento_time) horaInput.value = packageDataToEdit.data_recebimento_time;

        } else { // Se estamos cadastrando uma nova
            if (title) title.textContent = 'Cadastrar Nova Encomenda';
            if (btn) btn.textContent = 'Salvar Encomenda';
            if (hiddenEncomendaIdInput) hiddenEncomendaIdInput.value = ''; // Limpa ID
            preencherDataHoraAtual(); // Preenche data/hora atuais
        }

        modalCadastroEncomenda.style.display = 'flex';
        modalCadastroEncomenda.classList.add('active');
        setTimeout(() => inputMorador?.focus(), 200);
    } else {
        console.error('Falha abrir Modal Encomenda!');
    }
}
    function fecharModalEncomenda() { console.log('Fechando Modal Encomenda.'); if (modalCadastroEncomenda) { modalCadastroEncomenda.classList.remove('active'); modalCadastroEncomenda.style.display = 'none'; modalCadastroEncomenda.style.zIndex = ''; if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible'); if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible'); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); requestMainWindowFocus(); } }
    async function abrirModalMorador(residentId = null) { console.log(`Abrindo Modal Morador. ID: ${residentId}`); if (modalCadastroEncomenda?.classList.contains('active')) fecharModalEncomenda(); if (modalCadastroUsuario?.classList.contains('active')) fecharModalCadastroUsuario(); if (modalCadastroEncomenda) { modalCadastroEncomenda.style.display = 'none'; modalCadastroEncomenda.style.zIndex = ''; } if (modalCadastroUsuario) { modalCadastroUsuario.style.display = 'none'; modalCadastroUsuario.style.zIndex = ''; } if (modalCadastroMorador) { if (formCadastroMorador) formCadastroMorador.reset(); const mid = document.getElementById('morador-id'); if (mid) mid.value = ''; const statusMsg = document.getElementById('status-message'); if (statusMsg) { statusMsg.style.display = 'none'; } modalCadastroMorador.style.display = 'flex'; modalCadastroMorador.style.zIndex = '1001'; modalCadastroMorador.classList.add('active'); const nomeInput = document.getElementById('morador-nome'); if (residentId) { console.log("Modo Edição Morador"); if(modalMoradorTitle) modalMoradorTitle.textContent='Editar Morador'; if(btnSalvarMorador) btnSalvarMorador.textContent='Salvar Alterações'; try { if (!window.electronAPI?.getResidentById) throw new Error('API getResidentById indisponível'); const m = await window.electronAPI.getResidentById(residentId); if (m) { if (mid) mid.value = m.id; if (nomeInput) nomeInput.value = m.nome || ''; document.getElementById('morador-telefone').value = m.telefone || ''; document.getElementById('morador-rua').value = m.rua || ''; document.getElementById('morador-numero').value = m.numero || ''; document.getElementById('morador-bloco').value = m.bloco || ''; document.getElementById('morador-apartamento').value = m.apartamento || ''; document.getElementById('morador-observacoes').value = m.observacoes || ''; setTimeout(() => nomeInput?.focus(), 50); } else { showStatusMessage(`Erro: Morador ID ${residentId} não encontrado.`, 'error'); fecharModalMorador(); } } catch (error) { showStatusMessage(`Erro: ${error.message}`, 'error'); fecharModalMorador(); } } else { console.log("Modo Cadastro Morador."); if(modalMoradorTitle) modalMoradorTitle.textContent='Cadastrar Novo Morador'; if(btnSalvarMorador) btnSalvarMorador.textContent='Salvar Morador'; setTimeout(() => nomeInput?.focus(), 50); } } else { console.error('Falha abrir Modal Morador!'); } }
    function fecharModalMorador() { console.log('Fechando Modal Morador.'); if (modalCadastroMorador) { modalCadastroMorador.classList.remove('active'); modalCadastroMorador.style.display = 'none'; modalCadastroMorador.style.zIndex = ''; const mid = document.getElementById('morador-id'); if (mid) mid.value = ''; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); requestMainWindowFocus(); } }

    async function abrirModalCadastroUsuario(userId = null) {
        console.log(`DEBUG: Abrindo Modal Usuário. ID: ${userId || 'N/A'}`);
        if (modalCadastroEncomenda?.classList.contains('active')) fecharModalEncomenda();
        if (modalCadastroMorador?.classList.contains('active')) fecharModalMorador();
        if (modalCadastroEncomenda) { modalCadastroEncomenda.style.display = 'none'; modalCadastroEncomenda.style.zIndex = ''; }
        if (modalCadastroMorador) { modalCadastroMorador.style.display = 'none'; modalCadastroMorador.style.zIndex = ''; }

        if (modalCadastroUsuario) {
            if (formCadastroUsuario) formCadastroUsuario.reset();
            const usuarioIdInput = document.getElementById('usuario-id'); if (usuarioIdInput) usuarioIdInput.value = '';
            const statusMsgElement = document.getElementById('status-message'); if (statusMsgElement) statusMsgElement.style.display = 'none';

            modalCadastroUsuario.style.display = 'flex'; modalCadastroUsuario.style.zIndex = '1001'; modalCadastroUsuario.classList.add('active');

            const nomeCompletoInput = document.getElementById('usuario-nome-completo');
            const nomeUsuarioInput = document.getElementById('usuario-login');
            const emailInput = document.getElementById('usuario-email');
            const senhaInput = document.getElementById('usuario-senha');
            const senhaConfirmInput = document.getElementById('usuario-senha-confirm');
            const nivelAcessoSelect = document.getElementById('usuario-nivel-acesso');
            const statusSelect = usuarioStatusSelect;
            const nivelAcessoGroup = document.getElementById('grupo-nivel-acesso');
            const statusGroup = grupoStatusUsuario;

             if(senhaInput) senhaInput.placeholder = '';
             if(senhaConfirmInput) senhaConfirmInput.placeholder = '';

            if (userId) {
                console.log("Modo Edição Usuário - Buscando dados...");
                if(modalUsuarioTitle) modalUsuarioTitle.textContent = 'Editar Usuário';
                if(btnSalvarUsuario) btnSalvarUsuario.textContent = 'Salvar Alterações';
                if(usuarioIdInput) usuarioIdInput.value = userId;
                if(senhaInput) { senhaInput.required = false; senhaInput.placeholder = 'Deixe em branco para não alterar'; }
                if(senhaConfirmInput) { senhaConfirmInput.required = false; senhaConfirmInput.placeholder = 'Deixe em branco para não alterar';}

                 const isAdminEditing = currentUser?.role === 'admin';
                if(nivelAcessoGroup) nivelAcessoGroup.style.display = isAdminEditing ? 'block' : 'none';
                if(statusGroup) statusGroup.style.display = isAdminEditing ? 'block' : 'none';

                setTimeout(async () => {
                    try {
                        if (!window.electronAPI?.getUserById) throw new Error('API getUserById indisponível');
                        const userData = await window.electronAPI.getUserById(userId);
                        if (userData) {
                            if (nomeCompletoInput) nomeCompletoInput.value = userData.nome_completo || '';
                            if (nomeUsuarioInput) nomeUsuarioInput.value = userData.nome_usuario || '';
                            if (emailInput) emailInput.value = userData.email || '';
                            if (nivelAcessoSelect) nivelAcessoSelect.value = userData.nivel_acesso || 'porteiro';
                            if (statusSelect) statusSelect.value = userData.status || 'Ativo';
                            nomeCompletoInput?.focus();
                        } else {
                             showStatusMessage(`Erro: Usuário ID ${userId} não encontrado.`, 'error');
                             fecharModalCadastroUsuario();
                        }
                    } catch (error) {
                        showStatusMessage(`Erro ao buscar dados: ${error.message}`, 'error');
                        fecharModalCadastroUsuario();
                    }
                }, 50);

            } else {
                console.log("Modo Cadastro Usuário.");
                if(modalUsuarioTitle) modalUsuarioTitle.textContent = 'Cadastrar Novo Usuário';
                if(btnSalvarUsuario) btnSalvarUsuario.textContent = 'Salvar Usuário';
                if(senhaInput) senhaInput.required = true;
                if(senhaConfirmInput) senhaConfirmInput.required = true;
                if(nivelAcessoGroup) nivelAcessoGroup.style.display = 'none';
                if(statusGroup) statusGroup.style.display = 'none';
                setTimeout(() => nomeCompletoInput?.focus(), 50);
            }
        } else { console.error('Falha ao abrir Modal Usuário!'); }
    }
    function fecharModalCadastroUsuario() { console.log('DEBUG: Fechando Modal Usuário.'); if (modalCadastroUsuario) { modalCadastroUsuario.classList.remove('active'); modalCadastroUsuario.style.display = 'none'; modalCadastroUsuario.style.zIndex = ''; const uid = document.getElementById('usuario-id'); if (uid) uid.value = ''; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); requestMainWindowFocus(); } }


    // --- Funções Auxiliares e Autocomplete ---
    function preencherDataHoraAtual() { const agora = new Date(); const d = document.getElementById('data'); const h = document.getElementById('hora'); const a = agora.getFullYear(); const m = String(agora.getMonth() + 1).padStart(2, '0'); const dia = String(agora.getDate()).padStart(2, '0'); const df = `${a}-${m}-${dia}`; const hora = String(agora.getHours()).padStart(2, '0'); const min = String(agora.getMinutes()).padStart(2, '0'); const hf = `${hora}:${min}`; if (d) d.value = df; if (h) h.value = hf; }

    function displayMoradorSuggestions(suggestions) {
        if (!suggestionsMoradorDiv) {
            console.error("[DEBUG Autocomplete] Elemento suggestionsMoradorDiv não encontrado!");
            return;
        }
        console.log('[DEBUG Autocomplete] displayMoradorSuggestions received:', suggestions);
        suggestionsMoradorDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach(r => {
                try {
                    if (!r || typeof r.id === 'undefined' || typeof r.nome === 'undefined') {
                        console.warn("[DEBUG Autocomplete] Item de sugestão inválido recebido (Morador):", r);
                        return;
                    }
                    const div = document.createElement('div');
                    div.textContent = r.nome;
                    div.className = 'suggestion-item';
                    div.dataset.id = r.id;
                    div.dataset.name = r.nome;
                    div.addEventListener('click', () => {
                        const target = document.getElementById('morador');
                        if (target) target.value = r.nome;
                        selectedMoradorId = r.id;
                        console.log(`Morador selecionado: ${r.nome} (ID: ${r.id})`);
                        suggestionsMoradorDiv.classList.remove('visible');
                        suggestionsMoradorDiv.innerHTML = '';
                    });
                    suggestionsMoradorDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[DEBUG Autocomplete] Erro dentro do loop displayMoradorSuggestions:", loopError, "Item problemático:", r);
                }
            });

            if (suggestionsMoradorDiv.children.length > 0) {
                 suggestionsMoradorDiv.classList.add('visible');
                 console.log('[DEBUG Autocomplete] Morador suggestions displayed (com itens no DOM).');
            } else {
                 suggestionsMoradorDiv.classList.remove('visible');
                 console.log('[DEBUG Autocomplete] Nenhum item de sugestão de morador foi adicionado ao DOM, apesar de receber sugestões.');
            }
        } else {
            suggestionsMoradorDiv.classList.remove('visible');
            console.log('[DEBUG Autocomplete] No morador suggestions to display (array de sugestões vazio).');
        }
    }

    function displayPorterSuggestions(suggestions) {
        if (!suggestionsPorteiroDiv) {
             console.error("[DEBUG Autocomplete] Elemento suggestionsPorteiroDiv não encontrado!");
             return;
        }
        console.log('[DEBUG Autocomplete] displayPorterSuggestions received:', suggestions);
        suggestionsPorteiroDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach(p => {
                 try {
                     if (!p || typeof p.id === 'undefined' || typeof p.nome === 'undefined') {
                         console.warn("[DEBUG Autocomplete] Item de sugestão inválido recebido (Porteiro):", p);
                         return;
                     }
                    const div = document.createElement('div');
                    div.textContent = p.nome;
                    div.className = 'suggestion-item';
                    div.dataset.id = p.id;
                    div.dataset.name = p.nome;
                    div.addEventListener('click', () => {
                        const target = document.getElementById('porteiro');
                        if (target) target.value = p.nome;
                        selectedPorteiroUserId = p.id;
                        console.log(`Porteiro (Usuário) selecionado: ${p.nome} (User ID: ${p.id})`);
                        suggestionsPorteiroDiv.classList.remove('visible');
                        suggestionsPorteiroDiv.innerHTML = '';
                    });
                    suggestionsPorteiroDiv.appendChild(div);
                } catch (loopError) {
                     console.error("[DEBUG Autocomplete] Erro dentro do loop displayPorterSuggestions:", loopError, "Item problemático:", p);
                }
            });

            if (suggestionsPorteiroDiv.children.length > 0) {
                suggestionsPorteiroDiv.classList.add('visible');
                console.log('[DEBUG Autocomplete] Porter suggestions displayed (com itens no DOM).');
            } else {
                 suggestionsPorteiroDiv.classList.remove('visible');
                 console.log('[DEBUG Autocomplete] Nenhum item de sugestão de porteiro foi adicionado ao DOM, apesar de receber sugestões.');
            }
        } else {
            suggestionsPorteiroDiv.classList.remove('visible');
            console.log('[DEBUG Autocomplete] No porter suggestions to display (array de sugestões vazio).');
        }
    }

    async function handleMoradorInput() {
        const input = document.getElementById('morador');
        if (!input || !window.electronAPI?.searchResidents) return;
        const term = input.value;
        console.log(`[DEBUG Autocomplete] handleMoradorInput called. Term: "${term}"`);
        if (term?.length >= 1) {
            try {
                console.log('[DEBUG Autocomplete] Calling API searchResidents...');
                const res = await window.electronAPI.searchResidents(term);
                console.log('[DEBUG Autocomplete] API searchResidents response:', res);
                displayMoradorSuggestions(res);
            } catch (err) {
                console.error('[DEBUG Autocomplete] Error calling searchResidents:', err);
                suggestionsMoradorDiv?.classList.remove('visible');
            }
        } else {
            suggestionsMoradorDiv?.classList.remove('visible');
            selectedMoradorId = null;
        }
    }
    async function handlePorterInput() {
        const input = document.getElementById('porteiro');
        if (!input || !window.electronAPI?.searchActivePorters) return;
        const term = input.value;
         console.log(`[DEBUG Autocomplete] handlePorterInput called. Term: "${term}"`);
        if (term?.length >= 1) {
            try {
                 console.log('[DEBUG Autocomplete] Calling API searchActivePorters...');
                const res = await window.electronAPI.searchActivePorters(term);
                 console.log('[DEBUG Autocomplete] API searchActivePorters response:', res);
                displayPorterSuggestions(res);
            } catch (err) {
                 console.error('[DEBUG Autocomplete] Error calling searchActivePorters:', err);
                suggestionsPorteiroDiv?.classList.remove('visible');
            }
        } else {
            suggestionsPorteiroDiv?.classList.remove('visible');
            selectedPorteiroUserId = null;
        }
    }

    // --- Funções de Carregamento de Conteúdo e Listagem ---
function showStatusMessage(message, type = 'info', stickyError = false) {
    const el = document.getElementById('status-message');
    if (el) {
        el.textContent = message;
        el.className = `status-message status-${type}`;
        el.style.display = 'block';
        if (type === 'success' || (type === 'error' && !stickyError)) { // Só some se for sucesso ou erro não-fixo
            const delay = type === 'success' ? 3500 : 6000;
            setTimeout(() => { if (el.textContent === message) { el.style.display = 'none';}}, delay);
        }
    } else { /* ... */ }
}
    function carregarConteudo(titulo, carregaDados = false) {
        console.log(`Carregando: ${titulo}`);
        mainContent.innerHTML = '';
        const h1 = document.createElement('h1'); h1.textContent = titulo; h1.style.color = 'var(--cor-azul-principal)'; mainContent.appendChild(h1);
        const statusMsgElement = document.createElement('div'); statusMsgElement.id = 'status-message'; statusMsgElement.className = 'status-message'; statusMsgElement.style.display = 'none'; mainContent.appendChild(statusMsgElement);
        const sectionContent = document.createElement('div'); sectionContent.className = 'section-content-area'; mainContent.appendChild(sectionContent);

        if (titulo === 'Dashboard Encomendas') {
            const btn = document.createElement('button'); btn.textContent = 'Cadastrar Nova Encomenda'; btn.className = 'btn-add'; mainContent.insertBefore(btn, sectionContent);
            btn.addEventListener('click', () => abrirModalEncomenda());
            buscarEExibirEncomendas(sectionContent);
        } else if (titulo === 'Moradores') {
            const btn = document.createElement('button'); btn.textContent = 'Cadastrar Novo Morador'; btn.className = 'btn-add'; mainContent.insertBefore(btn, sectionContent);
            btn.addEventListener('click', () => abrirModalMorador());
            const div = document.createElement('div'); div.id = 'lista-moradores-container'; div.style.marginTop = '20px'; sectionContent.appendChild(div);
            buscarEExibirMoradores(div);
        } else if (titulo === 'Usuários' && currentUser?.role === 'admin') {
            const btn = document.createElement('button'); btn.textContent = 'Cadastrar Novo Usuário'; btn.className = 'btn-add'; mainContent.insertBefore(btn, sectionContent);
            btn.addEventListener('click', () => abrirModalCadastroUsuario());
            const div = document.createElement('div'); div.id = 'lista-usuarios-container'; div.style.marginTop = '20px'; sectionContent.appendChild(div);
            buscarEExibirUsuarios(div);
        } else if (titulo === 'Relatórios' || titulo === 'Ajustes') {
             const p = document.createElement('p'); p.textContent = `Conteúdo ${titulo} não implementado...`; sectionContent.appendChild(p);
        } else {
             const p = document.createElement('p'); p.textContent = `Conteúdo ${titulo}...`; sectionContent.appendChild(p);
        }
    }
    async function buscarEExibirEncomendas(container) {
    console.log('Buscando encomendas...');
    container.innerHTML = '<p>Carregando...</p>';
    try {
        if (!window.electronAPI?.getPendingPackages) throw new Error('API getPendingPackages indisponível');
        const pacotes = await window.electronAPI.getPendingPackages();
        container.innerHTML = '';
        if (Array.isArray(pacotes)) {
            if (pacotes.length > 0) {
                const title = document.createElement('h3');
                title.textContent = 'Aguardando Entrega:';
                title.style.marginTop = '0';
                container.appendChild(title);

                const ul = document.createElement('ul');
                ul.className = 'encomendas-list';
                pacotes.forEach(p => {
                    const li = document.createElement('li');
                    li.className = 'encomenda-item';
                    let dataReceb = 'Inválida';
                    try {
                        dataReceb = new Date(p.data_recebimento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                        if (dataReceb === 'Invalid Date') dataReceb = 'Inválida';
                    } catch (e) {
                        // dataReceb continua 'Inválida'
                    }
                    // Adiciona o data-id="${p.id}" ao botão de editar
                    li.innerHTML = `<div class="encomenda-info"><span><strong>Morador:</strong> ${p.morador_nome || 'N/A'}</span><span><strong>Recebido:</strong> ${dataReceb}</span><span><strong>Qtde:</strong> ${p.quantidade || 1}</span><span><strong>Porteiro Recebeu:</strong> ${p.porteiro_nome || 'N/A'}</span>
        ${p.observacoes ? `<span><strong>Obs:</strong> ${p.observacoes}</span>` : ''}</div><div class="encomenda-actions"><button class="btn-editar-encomenda" data-id="${p.id}">Editar</button><button class="btn-entregar-encomenda" data-id="${p.id}">Entregar</button></div>`;
        ul.appendChild(li);

                    const btnEditEnc = li.querySelector('.btn-editar-encomenda');
                    const btnDeliverEnc = li.querySelector('.btn-entregar-encomenda');
        

if (btnDeliverEnc) {
    btnDeliverEnc.addEventListener('click', async (e) => {
        const packageId = e.currentTarget.dataset.id;
        const moradorNome = p.morador_nome || 'N/A';
        abrirModalEntrega(packageId, moradorNome); // APENAS ABRE O MODAL
        

        if (!currentUser || !currentUser.id) {
            showStatusMessage("Erro: Usuário não identificado para realizar a entrega.", "error");
            return;
        }
        const porteiroEntregouId = currentUser.id;

        if (confirm(`Confirmar entrega da encomenda para ${moradorNome} (ID Encomenda: ${packageId})?`)) {
            try {
                if (!window.electronAPI?.deliverPackage) {
                    showStatusMessage('Funcionalidade de entrega indisponível.', 'error');
                    return;
                }
                console.log(`[Renderer] Tentando entregar encomenda ID: ${packageId} pelo usuário ID: ${porteiroEntregouId}`);
                const response = await window.electronAPI.deliverPackage(packageId, porteiroEntregouId);

                if (response.success) {
                    showStatusMessage(response.message || 'Encomenda entregue com sucesso!', 'success');
                    // Recarrega a lista de encomendas pendentes.
                    // 'container' é o elemento onde a lista é desenhada, passado como parâmetro para buscarEExibirEncomendas.
                    buscarEExibirEncomendas(container); 
                } else {
                    showStatusMessage(response.message || 'Falha ao marcar como entregue.', 'error');
                }
            } catch (error) {
                console.error('[Renderer] Erro ao chamar deliverPackage API:', error);
                showStatusMessage('Erro de comunicação ao entregar encomenda.', 'error');
            }
        }
    });
}

                    // ***** INÍCIO DA ALTERAÇÃO *****
                     if (btnEditEnc) {
                        btnEditEnc.addEventListener('click', (e) => {
                            const packageId = e.currentTarget.dataset.id; // Pega o ID do atributo data-id
                            if (packageId) {
                                iniciarEdicaoEncomenda(packageId); // Chama a nova função
                            } else {
                                console.error("ID da encomenda não encontrado no botão editar.");
                                showStatusMessage("Erro: ID da encomenda não encontrado.", "error");
                            }
                        });
                    }
                    // ***** FIM DA ALTERAÇÃO *****

                    if (btnDeliverEnc) {
                        btnDeliverEnc.addEventListener('click', () => {
                            console.warn("Entregar encomenda não implementado");
                            showStatusMessage("Função Entregar Encomenda não implementada.", "info");
                        });
                    }
                });
                container.appendChild(ul);
            } else {
                const msg = document.createElement('p');
                msg.textContent = 'Nenhuma encomenda pendente.';
                msg.className = 'empty-list-message';
                container.appendChild(msg);
            }
        } else {
            throw new Error('Resposta inesperada do backend (pacotes).');
        }
    } catch (error) {
        console.error('Erro ao buscar/exibir encomendas:', error);
        container.innerHTML = ''; // Limpa o "Carregando..."
        const err = document.createElement('p');
        err.textContent = `Erro ao carregar encomendas: ${error.message}`;
        err.className = 'error-message';
        container.appendChild(err);
    }
}
    async function buscarEExibirMoradores(container) { console.log('Buscando moradores...'); container.innerHTML = '<p>Carregando...</p>'; try { if (!window.electronAPI?.getResidents) throw new Error('API indisponível'); const moradores = await window.electronAPI.getResidents(); container.innerHTML = ''; if (Array.isArray(moradores)) { if (moradores.length > 0) { const table = document.createElement('table'); table.className = 'moradores-table'; const thead = table.createTHead(); const hr = thead.insertRow(); ['Nome', 'AP/LT', 'BL/QD', 'Telefone', 'Ações'].forEach(t => { const th = document.createElement('th'); th.textContent = t; hr.appendChild(th); }); const tbody = table.createTBody(); moradores.forEach(m => { const row = tbody.insertRow(); row.dataset.residentId = m.id; row.insertCell().textContent = m.nome || 'N/A'; row.insertCell().textContent = m.apartamento || 'N/A'; row.insertCell().textContent = m.bloco || 'N/A'; row.insertCell().textContent = m.telefone || 'N/A'; const actionsCell = row.insertCell(); actionsCell.className = 'morador-actions'; const btnEdit = document.createElement('button'); btnEdit.textContent = 'Editar'; btnEdit.className = 'btn-editar-morador'; btnEdit.dataset.id = m.id; btnEdit.addEventListener('click', () => abrirModalMorador(m.id)); actionsCell.appendChild(btnEdit); if (currentUser?.role === 'admin') { const btnDel = document.createElement('button'); btnDel.textContent = 'Excluir'; btnDel.className = 'btn-excluir-morador'; btnDel.dataset.id = m.id; btnDel.addEventListener('click', async () => { const mid = btnDel.dataset.id; const mNome = m.nome; if (confirm(`Excluir ${mNome}? Esta ação não pode ser desfeita.`)) { try { if (!window.electronAPI?.deleteResident) throw new Error('API indisponível'); const res = await window.electronAPI.deleteResident(mid); if (res?.success) { showStatusMessage(res.message || 'Excluído!', 'success'); container.querySelector(`tr[data-resident-id="${mid}"]`)?.remove(); } else { showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error'); } } catch (err) { showStatusMessage(`Erro: ${err.message}`, 'error'); } } }); actionsCell.appendChild(btnDel); } }); container.appendChild(table); } else { const msg = document.createElement('p'); msg.textContent = 'Nenhum morador cadastrado.'; msg.className = 'empty-list-message'; container.appendChild(msg); } } else { throw new Error('Resposta inesperada.'); } } catch (error) { console.error('Erro moradores:', error); container.innerHTML = ''; const err = document.createElement('p'); err.textContent = `Erro ao carregar moradores: ${error.message}`; err.className = 'error-message'; container.appendChild(err); } }

    async function buscarEExibirUsuarios(containerElement) {
        console.log('Renderer: Chamando electronAPI.getUsers()...');
        containerElement.innerHTML = '<p>Carregando usuários...</p>';
        try {
            if (!window.electronAPI?.getUsers) throw new Error('API getUsers indisponível.');
            const usuarios = await window.electronAPI.getUsers();
            containerElement.innerHTML = '';

            if (Array.isArray(usuarios)) {
                if (usuarios.length > 0) {
                    const table = document.createElement('table');
                    table.className = 'porteiros-table';
                    const thead = table.createTHead();
                    const headerRow = thead.insertRow();
                    const headers = ['Nome Completo', 'Usuário (Login)', 'Email', 'Nível', 'Status', 'Ações'];
                    headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

                    const tbody = table.createTBody();
                    usuarios.forEach(user => {
                        const row = tbody.insertRow();
                        row.dataset.userId = user.id;
                        row.insertCell().textContent = user.nome_completo || 'N/A';
                        row.insertCell().textContent = user.nome_usuario || 'N/A';
                        row.insertCell().textContent = user.email || 'N/A';
                        row.insertCell().textContent = user.nivel_acesso || 'N/A';
                        const statusCell = row.insertCell();
                        statusCell.textContent = user.status || 'N/A';
                        statusCell.className = `status-${(user.status || '').toLowerCase()}`;

                        const actionsCell = row.insertCell();
                        actionsCell.className = 'porteiro-actions';

                        const btnEditar = document.createElement('button');
                        btnEditar.textContent = 'Editar';
                        btnEditar.className = 'btn-editar-porteiro';
                        btnEditar.dataset.id = user.id;
                        btnEditar.addEventListener('click', () => {
                            abrirModalCadastroUsuario(user.id);
                        });
                        actionsCell.appendChild(btnEditar);

                        if (currentUser?.role === 'admin' && currentUser.id !== user.id) {
                            const btnStatus = document.createElement('button');
                            const isAtivo = user.status === 'Ativo';
                            const novoStatus = isAtivo ? 'Inativo' : 'Ativo';
                            btnStatus.textContent = isAtivo ? 'Inativar' : 'Ativar';
                            btnStatus.className = isAtivo ? 'btn-inativar-porteiro' : 'btn-ativar-porteiro';
                            btnStatus.dataset.id = user.id;
                            btnStatus.dataset.novoStatus = novoStatus;

                            btnStatus.addEventListener('click', async (e) => {
                                const targetButton = e.currentTarget;
                                const userIdToToggle = targetButton.dataset.id;
                                const statusToGo = targetButton.dataset.novoStatus;
                                const userName = user.nome_completo || user.nome_usuario;

                                if (confirm(`${isAtivo ? 'Inativar' : 'Ativar'} usuário ${userName}?`)) {
                                    targetButton.disabled = true; targetButton.textContent = 'Aguarde...';
                                    try {
                                        const currentUserDataFromDB = await window.electronAPI.getUserById(userIdToToggle);
                                        if (!currentUserDataFromDB) throw new Error("Usuário não encontrado para atualizar status.");

                                        const updateData = {
                                            nomeUsuario: currentUserDataFromDB.nome_usuario,
                                            nivelAcesso: currentUserDataFromDB.nivel_acesso,
                                            nomeCompleto: currentUserDataFromDB.nome_completo,
                                            email: currentUserDataFromDB.email,
                                            status: statusToGo
                                        };

                                        if (!window.electronAPI?.updateUser) throw new Error('API updateUser indisponível');
                                        const res = await window.electronAPI.updateUser(userIdToToggle, updateData);

                                        if (res?.success) {
                                            showStatusMessage(res.message || `Status atualizado!`, 'success');
                                            statusCell.textContent = statusToGo;
                                            statusCell.className = `status-${statusToGo.toLowerCase()}`;
                                            targetButton.textContent = isAtivo ? 'Ativar' : 'Inativar';
                                            targetButton.className = isAtivo ? 'btn-ativar-porteiro' : 'btn-inativar-porteiro';
                                            targetButton.dataset.novoStatus = isAtivo ? 'Ativo' : 'Inativo';
                                            user.status = statusToGo;
                                        } else {
                                            showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error');
                                        }
                                    } catch (err) {
                                        showStatusMessage(`Erro ao alterar status: ${err.message}`, 'error');
                                    } finally {
                                         targetButton.disabled = false;
                                         const currentIsAtivo = statusCell.textContent === 'Ativo';
                                         targetButton.textContent = currentIsAtivo ? 'Inativar' : 'Ativar';
                                    }
                                }
                            });
                            actionsCell.appendChild(btnStatus);
                        }

                        if (currentUser?.role === 'admin' && currentUser.id !== user.id ) {
                            const btnDel = document.createElement('button');
                            btnDel.textContent = 'Excluir';
                            btnDel.className = 'btn-excluir-porteiro';
                            btnDel.dataset.id = user.id;
                            btnDel.addEventListener('click', async (e) => {
                                const userIdToDelete = e.currentTarget.dataset.id;
                                const userName = user.nome_completo || user.nome_usuario;
                                if (confirm(`Excluir usuário ${userName}? Esta ação não pode ser desfeita.`)) {
                                    try {
                                        if (!window.electronAPI?.deleteUser) throw new Error('API deleteUser indisponível');
                                        const res = await window.electronAPI.deleteUser(userIdToDelete);
                                        if (res?.success) { showStatusMessage(res.message || 'Excluído!', 'success'); containerElement.querySelector(`tr[data-user-id="${userIdToDelete}"]`)?.remove(); }
                                        else { showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error'); }
                                    } catch (err) { showStatusMessage(`Erro: ${err.message}`, 'error'); }
                                }
                            });
                            actionsCell.appendChild(btnDel);
                        }
                    });
                    containerElement.appendChild(table);
                } else { const msg = document.createElement('p'); msg.textContent = 'Nenhum usuário cadastrado.'; msg.className = 'empty-list-message'; containerElement.appendChild(msg); }
            } else { throw new Error('Resposta inesperada (usuários).'); }
        } catch (error) { console.error('Erro buscar/exibir usuários:', error); containerElement.innerHTML = ''; const err = document.createElement('p'); err.textContent = `Erro ao carregar usuários: ${error.message}`; err.className = 'error-message'; containerElement.appendChild(err); }
    }
// Adicione esta nova função no seu renderer.js
async function iniciarEdicaoEncomenda(packageId) {
    console.log(`[Renderer] Iniciando edição para encomenda ID: ${packageId}`);
    try {
        if (!window.electronAPI?.getPackageById) {
            showStatusMessage('Funcionalidade de edição indisponível.', 'error');
            return;
        }
        const response = await window.electronAPI.getPackageById(packageId);
        if (response.success && response.data) {
            abrirModalEncomenda(packageId, response.data); // Passa ID e dados para popular
        } else {
            showStatusMessage(response.message || 'Erro ao buscar dados da encomenda.', 'error');
        }
    } catch (error) {
        console.error('Erro ao chamar getPackageById:', error);
        showStatusMessage('Erro de comunicação ao buscar encomenda.', 'error');
    }
}
// Adicione estas novas funções no renderer.js


function abrirModalEntrega(packageId, moradorNome) {
    console.log(`[Renderer] Abrindo modal de entrega para encomenda ID: ${packageId}, Morador: ${moradorNome}`);
    if (!modalEntregaEncomenda || !formEntregaEncomenda || !entregaEncomendaIdInput || !entregaMoradorInfoInput || !entregaDataInput || !entregaHoraInput || !inputEntregaPorteiro) {
        console.error("Elementos do modal de entrega não encontrados!");
        showStatusMessage("Erro ao abrir modal de entrega.", "error");
        return;
    }

    // Garante que outros modais estejam fechados (código mantido)
    if (modalCadastroEncomenda?.classList.contains('active')) fecharModalEncomenda();
    if (modalCadastroMorador?.classList.contains('active')) fecharModalMorador();
    if (modalCadastroUsuario?.classList.contains('active')) fecharModalCadastroUsuario();
    if (modalCadastroEncomenda) modalCadastroEncomenda.style.display = 'none';
    if (modalCadastroMorador) modalCadastroMorador.style.display = 'none';
    if (modalCadastroUsuario) modalCadastroUsuario.style.display = 'none';

    formEntregaEncomenda.reset(); 
    selectedEntregaPorteiroId = null; 
    if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');

    entregaEncomendaIdInput.value = packageId; 
    entregaMoradorInfoInput.value = moradorNome || 'N/A'; 

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    entregaDataInput.value = `${ano}-${mes}-${dia}`;
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    entregaHoraInput.value = `${hora}:${minuto}`;

    if (currentUser && inputEntregaPorteiro) {
        inputEntregaPorteiro.value = currentUser.name || '';
        selectedEntregaPorteiroId = currentUser.id;
    } else if (inputEntregaPorteiro) {
        inputEntregaPorteiro.value = ''; 
    }

    modalEntregaEncomenda.style.display = 'flex';
    modalEntregaEncomenda.classList.add('active');

    // ***** INÍCIO DA ALTERAÇÃO *****
    void modalEntregaEncomenda.offsetWidth; // Força o reflow do navegador
    // ***** FIM DA ALTERAÇÃO *****

    setTimeout(() => {
        inputEntregaPorteiro?.focus(); // Tenta focar no campo do porteiro
        console.log("[Renderer] Foco tentado no inputEntregaPorteiro");
    }, 75); 
}
function fecharModalEntrega() {
    if (modalEntregaEncomenda) {
        modalEntregaEncomenda.classList.remove('active');
        modalEntregaEncomenda.style.display = 'none';
        if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
        const statusMsg = document.getElementById('status-message'); // Pega msg de status global
        if (statusMsg) statusMsg.style.display = 'none'; // Esconde msg ao fechar modal
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        requestMainWindowFocus();
    }
}
async function handleEntregaPorterInput() {
    if (!inputEntregaPorteiro || !window.electronAPI?.searchActivePorters) return;
    const term = inputEntregaPorteiro.value;
    console.log(`[DEBUG Autocomplete Entrega] handleEntregaPorterInput called. Term: "${term}"`);
    if (term?.length >= 1) {
        try {
            console.log('[DEBUG Autocomplete Entrega] Calling API searchActivePorters...');
            const res = await window.electronAPI.searchActivePorters(term);
            console.log('[DEBUG Autocomplete Entrega] API searchActivePorters response:', res);
            displayEntregaPorterSuggestions(res);
        } catch (err) {
            console.error('[DEBUG Autocomplete Entrega] Error calling searchActivePorters:', err);
            if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
        }
    } else {
        if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
        selectedEntregaPorteiroId = null; // Limpa se o campo estiver vazio
    }
}

function displayEntregaPorterSuggestions(suggestions) {
    if (!suggestionsEntregaPorteiroDiv) {
        console.error("[DEBUG Autocomplete Entrega] Elemento suggestionsEntregaPorteiroDiv não encontrado!");
        return;
    }
    console.log('[DEBUG Autocomplete Entrega] displayEntregaPorterSuggestions received:', suggestions);
    suggestionsEntregaPorteiroDiv.innerHTML = '';

    if (suggestions?.length > 0) {
        suggestions.forEach(user => { // 'user' em vez de 'p' para clareza
            try {
                if (!user || typeof user.id === 'undefined' || typeof user.nome === 'undefined') {
                    console.warn("[DEBUG Autocomplete Entrega] Item de sugestão inválido recebido (Porteiro):", user);
                    return;
                }
                const div = document.createElement('div');
                div.textContent = user.nome;
                div.className = 'suggestion-item';
                div.dataset.id = user.id;
                div.dataset.name = user.nome;
                div.addEventListener('click', () => {
                    if (inputEntregaPorteiro) inputEntregaPorteiro.value = user.nome;
                    selectedEntregaPorteiroId = user.id;
                    console.log(`Porteiro da Entrega selecionado: ${user.nome} (User ID: ${user.id})`);
                    suggestionsEntregaPorteiroDiv.classList.remove('visible');
                    suggestionsEntregaPorteiroDiv.innerHTML = '';
                });
                suggestionsEntregaPorteiroDiv.appendChild(div);
            } catch (loopError) {
                console.error("[DEBUG Autocomplete Entrega] Erro dentro do loop displayEntregaPorterSuggestions:", loopError, "Item:", user);
            }
        });

        if (suggestionsEntregaPorteiroDiv.children.length > 0) {
            suggestionsEntregaPorteiroDiv.classList.add('visible');
            console.log('[DEBUG Autocomplete Entrega] Entrega Porter suggestions displayed (com itens no DOM).');
        } else {
            suggestionsEntregaPorteiroDiv.classList.remove('visible');
            console.log('[DEBUG Autocomplete Entrega] Nenhum item de sugestão de porteiro (entrega) foi adicionado ao DOM.');
        }
    } else {
        suggestionsEntregaPorteiroDiv.classList.remove('visible');
        console.log('[DEBUG Autocomplete Entrega] No Entrega Porter suggestions to display.');
    }
}

// Adicione estes listeners na seção "Ouvintes de Evento Globais",
// perto dos outros listeners de autocomplete
if (inputEntregaPorteiro) {
    inputEntregaPorteiro.addEventListener('input', handleEntregaPorterInput);
    inputEntregaPorteiro.addEventListener('blur', () => {
        setTimeout(() => {
            // Apenas esconde se o foco não foi para um item da própria lista.
            // A seleção do item já esconde a lista.
            const focusedElement = document.activeElement;
            if (!focusedElement || !focusedElement.closest('#entrega-porteiro-suggestions .suggestion-item')) {
                 if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
            }
        }, 200);
    });
}
    // --- Ouvintes de Evento Globais ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(loginErrorMessage) loginErrorMessage.style.display = 'none';
            const u = usernameInput.value.trim();
            const p = passwordInput.value;
            if (!u || !p) { showStatusMessage("Usuário e senha obrigatórios.", "error"); return; }

            console.log(`[DEBUG Renderer] Attempting login for user: ${u}`);
            try {
                if (!window.electronAPI?.loginUser) throw new Error('API login indisponível');
                const res = await window.electronAPI.loginUser({ username: u, password: p });
                console.log('[DEBUG Renderer] Login API response:', res);

                if (res.success) {
                    console.log('[DEBUG Renderer] Login successful, showing app screen.');
                    currentUser = res.user;
                    showAppScreen();
                } else {
                    console.error(`[DEBUG Renderer] Login failed. Message: ${res?.message}`);
                    if(loginErrorMessage) {
                        loginErrorMessage.textContent = res.message || 'Falha login.';
                        loginErrorMessage.style.display = 'block';
                    }
                    passwordInput.value = '';
                    usernameInput.select();
                }
            } catch (err) {
                 console.error('[DEBUG Renderer] Error calling login API:', err);
                if(loginErrorMessage) {
                    loginErrorMessage.textContent = `Erro ao tentar logar: ${err.message}`;
                    loginErrorMessage.style.display = 'block';
                }
            }
        });
    } else { console.error("Form login não encontrado!"); }

    if (logoutButton) { logoutButton.addEventListener('click', showLoginScreen); }
    if (menuEncomendas) menuEncomendas.addEventListener('click', () => carregarConteudo('Dashboard Encomendas', true));
    if (menuMoradores) menuMoradores.addEventListener('click', () => carregarConteudo('Moradores'));
    if (menuUsuarios) menuUsuarios.addEventListener('click', () => carregarConteudo('Usuários'));
    if (menuRelatorios) menuRelatorios.addEventListener('click', () => carregarConteudo('Relatórios'));
    if (menuAjustes) menuAjustes.addEventListener('click', () => carregarConteudo('Ajustes'));
    if (btnCancelarEncomendaModal) btnCancelarEncomendaModal.addEventListener('click', fecharModalEncomenda);
    if (modalCadastroEncomenda) modalCadastroEncomenda.addEventListener('click', (e) => { if(e.target === modalCadastroEncomenda) fecharModalEncomenda(); });
    if (btnCancelarMoradorModal) btnCancelarMoradorModal.addEventListener('click', fecharModalMorador);
    if (modalCadastroMorador) modalCadastroMorador.addEventListener('click', (e) => { if(e.target === modalCadastroMorador) fecharModalMorador(); });
    if (btnCancelarUsuarioModal) btnCancelarUsuarioModal.addEventListener('click', fecharModalCadastroUsuario);
    if (modalCadastroUsuario) modalCadastroUsuario.addEventListener('click', (e) => { if(e.target === modalCadastroUsuario) fecharModalCadastroUsuario(); });
    if (inputMorador) { inputMorador.addEventListener('input', handleMoradorInput); inputMorador.addEventListener('blur', () => setTimeout(() => { const focusedElement = document.activeElement; if (!focusedElement || !focusedElement.classList.contains('suggestion-item')) { if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible'); } }, 250)); }
    if (inputPorteiro) { inputPorteiro.addEventListener('input', handlePorterInput); inputPorteiro.addEventListener('blur', () => setTimeout(() => { const focusedElement = document.activeElement; if (!focusedElement || !focusedElement.classList.contains('suggestion-item')) { if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible'); } }, 250)); }

    if (formCadastroMorador) { formCadastroMorador.addEventListener('submit', async (e) => { e.preventDefault(); const statusMsg = document.getElementById('status-message'); if (statusMsg) statusMsg.style.display = 'none'; const idInput = document.getElementById('morador-id'); const nomeInput = document.getElementById('morador-nome'); const telInput = document.getElementById('morador-telefone'); const ruaInput = document.getElementById('morador-rua'); const numInput = document.getElementById('morador-numero'); const blocoInput = document.getElementById('morador-bloco'); const aptoInput = document.getElementById('morador-apartamento'); const obsInput = document.getElementById('morador-observacoes'); if (!idInput || !nomeInput || !ruaInput || !numInput || !aptoInput) { showStatusMessage("Erro interno.", 'error'); return; } const resId = idInput.value; const isEditing = !!resId; const data = { nome: nomeInput.value.trim(), telefone: telInput?.value.trim() || null, rua: ruaInput.value.trim(), numero: numInput.value.trim(), bloco: blocoInput?.value.trim() || null, apartamento: aptoInput.value.trim(), observacoes: obsInput?.value.trim() || null }; if (!data.nome || !data.rua || !data.numero || !data.apartamento) { showStatusMessage('Preencha: Nome, Rua, Número e AP/LT.', 'error'); return; } try { let res; if (isEditing) { if (!window.electronAPI?.updateResident) throw new Error('API update indisponível'); res = await window.electronAPI.updateResident(resId, data); } else { if (!window.electronAPI?.saveResident) throw new Error('API save indisponível'); res = await window.electronAPI.saveResident(data); } if (res?.success) { fecharModalMorador(); const listCont = mainContent.querySelector('#lista-moradores-container'); if (listCont) buscarEExibirMoradores(listCont); showStatusMessage(res.message || `Morador ${isEditing ? 'atualizado' : 'salvo'}!`, 'success'); } else { showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error'); } } catch (err) { showStatusMessage(`Erro: ${err.message}`, 'error'); } }); }

   if (btnCancelarEntregaModal) btnCancelarEntregaModal.addEventListener('click', fecharModalEntrega);
if (modalEntregaEncomenda) {
    modalEntregaEncomenda.addEventListener('click', (e) => {
        if (e.target === modalEntregaEncomenda) { // Se o clique foi no overlay do modal
            fecharModalEntrega();
        }
    });
}

if (formCadastroEncomenda) {
    formCadastroEncomenda.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previne o comportamento padrão do formulário
        console.log('Submit Encomenda!');
        const statusMsg = document.getElementById('status-message'); // Pega o elemento de mensagem de status
        if (statusMsg) statusMsg.style.display = 'none'; // Esconde mensagem anterior

        // Coleta os valores dos campos do formulário
        const qtdIn = document.getElementById('quantidade');
        const dataIn = document.getElementById('data');
        const horaIn = document.getElementById('hora');
        const obsIn = document.getElementById('observacoes');
        const encIdIn = document.getElementById('encomenda-id'); // Input escondido com o ID da encomenda (se editando)

        // Verifica se os inputs foram encontrados (apenas uma checagem de robustez)
        if (!qtdIn || !dataIn || !horaIn || !obsIn || !encIdIn) {
            console.error("Um ou mais campos do formulário de encomenda não foram encontrados no DOM!");
            showStatusMessage("Erro interno: campos do formulário não encontrados.", 'error');
            return;
        }

        const encId = encIdIn.value; // Pega o ID da encomenda (estará vazio se for cadastro novo)
        const isEditingEnc = !!encId; // Converte para booleano: true se encId tem valor, false se está vazio

        let dataIso = null;
        try {
            // Combina data e hora e converte para formato ISO string (UTC)
            if (dataIn.value && horaIn.value) {
                // Adiciona :00 para os segundos se não houver, para formar um timestamp completo
                let timeValue = horaIn.value;
                if (timeValue.split(':').length === 2) {
                    timeValue += ':00';
                }
                dataIso = new Date(`${dataIn.value}T${timeValue}`).toISOString();
            }
        } catch (err) {
            console.error("Erro ao converter data/hora:", err);
            showStatusMessage("Data ou Hora de recebimento inválida.", 'error');
            return;
        }

        // Monta o objeto com os dados da encomenda
        const pkgData = {
            moradorId: selectedMoradorId,         // ID do morador selecionado no autocomplete
            porteiroUserId: selectedPorteiroUserId, // ID do porteiro (usuário) selecionado no autocomplete
            quantidade: parseInt(qtdIn.value, 10),
            dataRecebimento: dataIso,
            observacoes: obsIn.value.trim() || null,
            // codigo_rastreio: document.getElementById('codigo-rastreio')?.value.trim() || null, // Se você adicionar este campo
        };

        // Validações comuns para cadastro e edição
        if (isNaN(pkgData.quantidade) || pkgData.quantidade < 1) {
            showStatusMessage('Quantidade inválida. Deve ser um número maior ou igual a 1.', 'error');
            return;
        }
        if (!pkgData.dataRecebimento) {
            showStatusMessage('Data e Hora de recebimento são obrigatórias.', 'error');
            return;
        }

        // Agora, a lógica para editar ou salvar uma nova encomenda
        if (isEditingEnc) { // Se estamos editando uma encomenda existente
            console.log(`Enviando UPDATE para encomenda ID: ${encId}`, pkgData);

            // Revalida IDs de morador e porteiro (essencial para update)
            if (!pkgData.moradorId) { showStatusMessage('Morador não selecionado para atualização.', 'error'); return; }
            if (!pkgData.porteiroUserId) { showStatusMessage('Porteiro não selecionado para atualização.', 'error'); return; }

            try {
                if (!window.electronAPI?.updatePackage) throw new Error('API updatePackage indisponível');
                const res = await window.electronAPI.updatePackage(encId, pkgData); // Chama a função de update

                if (res?.success) {
                    fecharModalEncomenda();
                    const listContainer = mainContent.querySelector('.section-content-area');
                    if (listContainer && mainContent.querySelector('h1')?.textContent === 'Dashboard Encomendas') {
                        buscarEExibirEncomendas(listContainer); // Atualiza a lista na tela
                    }
                    showStatusMessage(res.message || 'Encomenda atualizada!', 'success');
                } else {
                    showStatusMessage(`Erro ao atualizar: ${res?.message || 'Erro desconhecido.'}`, 'error');
                }
            } catch (err) {
                console.error("Erro ao chamar API de update de encomenda:", err);
                showStatusMessage(`Erro de comunicação ao atualizar: ${err.message}`, 'error');
            }

        } else { // Se estamos salvando uma NOVA encomenda
            console.log('SAVE Encomenda...', pkgData);

            // Validações para NOVA encomenda
            if (!pkgData.moradorId) { showStatusMessage('Selecione um morador válido.', 'error'); return; }
            if (!pkgData.porteiroUserId) { showStatusMessage('Selecione um porteiro válido.', 'error'); return; }

            if (!window.electronAPI?.savePackage) {
                console.error('API savePackage indisponível');
                showStatusMessage('Erro: Funcionalidade de salvar indisponível.', 'error');
                return;
            }

            try {
                const res = await window.electronAPI.savePackage(pkgData);
                if (res?.success) {
                    fecharModalEncomenda();
                    const listContainer = mainContent.querySelector('.section-content-area');
                    if (listContainer && mainContent.querySelector('h1')?.textContent === 'Dashboard Encomendas') {
                        buscarEExibirEncomendas(listContainer); // Atualiza a lista na tela
                    }
                    showStatusMessage(res.message || `Encomenda salva!`, 'success');
                } else {
                    showStatusMessage(`Erro ao salvar: ${res?.message || 'Erro desconhecido.'}`, 'error');
                }
            } catch (err) {
                console.error("Erro ao chamar API de salvar encomenda:", err);
                showStatusMessage(`Erro de comunicação ao salvar: ${err.message}`, 'error');
            }
        }
    });
} else {
    console.warn("Elemento do formulário 'formCadastroEncomenda' não encontrado.");
}
    if (formCadastroUsuario) {
        formCadastroUsuario.addEventListener('submit', async (event) => {
            event.preventDefault();
            const statusMsgElement = document.getElementById('status-message'); if (statusMsgElement) statusMsgElement.style.display = 'none';

            const usuarioIdInput = document.getElementById('usuario-id');
            const nomeCompletoInput = document.getElementById('usuario-nome-completo');
            const nomeUsuarioInput = document.getElementById('usuario-login');
            const emailInput = document.getElementById('usuario-email');
            const senhaInput = document.getElementById('usuario-senha');
            const senhaConfirmInput = document.getElementById('usuario-senha-confirm');
            const nivelAcessoSelect = document.getElementById('usuario-nivel-acesso');
            const statusSelect = usuarioStatusSelect;

            if (!usuarioIdInput || !nomeUsuarioInput || !nomeCompletoInput || !senhaInput || !senhaConfirmInput || !nivelAcessoSelect || !statusSelect ) { showStatusMessage("Erro interno.", 'error'); return; }

            const userId = usuarioIdInput.value; const isEditingUser = !!userId;
            const userData = {
                nomeUsuario: nomeUsuarioInput.value.trim(),
                nomeCompleto: nomeCompletoInput.value.trim(),
                email: emailInput?.value.trim() || null,
                senha: senhaInput.value,
                nivelAcesso: nivelAcessoSelect.style.display !== 'none' ? nivelAcessoSelect.value : 'porteiro',
                status: statusSelect.style.display !== 'none' ? statusSelect.value : 'Ativo'
            };
            const senhaConfirm = senhaConfirmInput.value;

            if (!userData.nomeUsuario) { showStatusMessage('Nome de usuário obrigatório.', 'error'); return; }

             if (!isEditingUser) {
                  if (!userData.senha) { showStatusMessage('Senha obrigatória no cadastro.', 'error'); return; }
                  if (userData.senha.length < 6) { showStatusMessage('Senha mínima 6 caracteres.', 'error'); return; }
                  if (userData.senha !== senhaConfirm) { showStatusMessage('As senhas não coincidem.', 'error'); return; }
             } else if (isEditingUser && userData.senha) {
                  if (userData.senha.length < 6) { showStatusMessage('Nova senha mínima 6 caracteres.', 'error'); return; }
                  if (userData.senha !== senhaConfirm) { showStatusMessage('As novas senhas não coincidem.', 'error'); return; }
             } else if (isEditingUser && !userData.senha) {
                  delete userData.senha;
             }

            try {
                let result;
                if (isEditingUser) {
                    if (!window.electronAPI?.updateUser) throw new Error('API updateUser indisponível');
                    result = await window.electronAPI.updateUser(userId, userData);
                } else {
                    userData.nivelAcesso = userData.nivelAcesso || 'porteiro';
                    userData.status = userData.status || 'Ativo';
                    if (!window.electronAPI?.saveUser) throw new Error('API saveUser indisponível');
                    result = await window.electronAPI.saveUser(userData);
                }
                if (result?.success) {
                    fecharModalCadastroUsuario();
                    const listaContainer = mainContent.querySelector('#lista-usuarios-container');
                    if (listaContainer) { buscarEExibirUsuarios(listaContainer); }
                    showStatusMessage(result.message || `Usuário ${isEditingUser ? 'atualizado' : 'salvo'}!`, 'success');
                } else { showStatusMessage(`Erro: ${result?.message || 'Erro desconhecido.'}`, 'error'); }
            } catch (error) { showStatusMessage(`Erro inesperado: ${error.message}`, 'error'); }
        });
    }
    // --- Inicialização ---
    showLoginScreen();
if (formEntregaEncomenda) {
    formEntregaEncomenda.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[Renderer] Submetendo formulário de entrega...');

        const packageId = entregaEncomendaIdInput.value;
        const porteiroEntregouId = selectedEntregaPorteiroId; // ID do porteiro selecionado no autocomplete
        const dataEntregaValue = entregaDataInput.value;
        const horaEntregaValue = entregaHoraInput.value;
        const retiradoPorNome = entregaRetiradoPorInput.value.trim();
        const observacoesEntrega = entregaObservacoesTextarea.value.trim();

        // Validações
        if (!packageId) {
            showStatusMessage("Erro: ID da encomenda não encontrado.", "error", true); // true para não sumir rápido
            return;
        }
        if (!porteiroEntregouId) {
            showStatusMessage("Selecione o porteiro que realizou a entrega.", "error", true);
            inputEntregaPorteiro?.focus();
            return;
        }
        if (!dataEntregaValue || !horaEntregaValue) {
            showStatusMessage("Data e Hora da entrega são obrigatórias.", "error", true);
            return;
        }

        let dataEntregaISO;
        try {
            let timeValue = horaEntregaValue;
            if (timeValue.split(':').length === 2) { timeValue += ':00'; } // Adiciona segundos se não houver
            dataEntregaISO = new Date(`${dataEntregaValue}T${timeValue}`).toISOString();
        } catch (dateErr) {
            console.error("Erro ao formatar data/hora da entrega:", dateErr);
            showStatusMessage("Formato de Data ou Hora da entrega inválido.", "error", true);
            return;
        }

    const deliveryData = {
    porteiroEntregouId: selectedEntregaPorteiroId, // Certifique-se que é ESTA variável
    dataEntrega: dataEntregaISO,
    retiradoPorNome: retiradoPorNome || null,
    observacoesEntrega: observacoesEntrega || null
};

        console.log(`[Renderer] Chamando API deliverPackage para ID: ${packageId} com dados:`, deliveryData);

        try {
            if (!window.electronAPI?.deliverPackage) {
                showStatusMessage("Funcionalidade de entrega indisponível (API).", "error", true);
                return;
            }
            const response = await window.electronAPI.deliverPackage(packageId, deliveryData);

            if (response.success) {
                showStatusMessage(response.message || 'Entrega registrada com sucesso!', 'success');
                fecharModalEntrega();
                // Atualiza a lista de encomendas pendentes
                const listContainer = mainContent.querySelector('.section-content-area');
                if (listContainer && mainContent.querySelector('h1')?.textContent === 'Dashboard Encomendas') {
                    buscarEExibirEncomendas(listContainer);
                }
            } else {
                showStatusMessage(response.message || 'Falha ao registrar entrega.', 'error', true);
            }
        } catch (error) {
            console.error('[Renderer] Erro ao chamar API deliverPackage:', error);
            showStatusMessage(`Erro de comunicação ao registrar entrega: ${error.message}`, 'error', true);
        }
    });
} else {
    console.warn("Elemento do formulário 'formEntregaEncomenda' não encontrado.");
}

}); // Fim do DOMContentLoaded