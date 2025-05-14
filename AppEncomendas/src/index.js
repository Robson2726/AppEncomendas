// --- src/index.js ---
// (Processo Principal do Electron)

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Para senhas

// --- Configuração da Conexão com o Banco (Usando .env) ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD, // SENHA VEM DO .env AGORA!
  port: parseInt(process.env.DB_PORT || '5432'),
});
// -----------------------------------------

// Variável para guardar a referência da janela principal
let mainWindow;

// --- Função para criar a Janela Principal ---
const createWindow = () => {
  // Cria a janela do navegador.
  mainWindow = new BrowserWindow({
    width: 1000, // Largura inicial
    height: 700, // Altura inicial
    webPreferences: {
      // Anexa o script de preload à janela
      preload: path.join(__dirname, 'preload.js'),
      // Medidas de segurança recomendadas:
      contextIsolation: true, // Isola o contexto do preload do renderer
      nodeIntegration: false // Desabilita acesso direto ao Node.js no renderer
    }
  });

  // Carrega o arquivo index.html da aplicação.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Opcional: Abrir Ferramentas de Desenvolvedor ao iniciar
  // mainWindow.webContents.openDevTools();

  // Limpa a referência da janela quando ela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};
// -------------------------------------------

// --- Funções de Acesso ao Banco de Dados ---

// Busca encomendas com status 'Recebida na portaria'
async function getPendingPackages() {
  console.log('[index.js] GET Pending Packages...');
  let client;
  try {
    client = await pool.connect();
    // Junta com Usuarios (correto agora!) para pegar o nome do porteiro que recebeu
    const result = await client.query(
      `SELECT E.id, M.nome AS morador_nome, U.nome_completo AS porteiro_nome, E.data_recebimento, E.quantidade, E.status, E.observacoes 
       FROM Encomendas E
       JOIN Moradores M ON E.morador_id = M.id
       LEFT JOIN Usuarios U ON E.porteiro_recebeu_id = U.id -- FK agora aponta para Usuarios
       WHERE E.status = 'Recebida na portaria'
       ORDER BY E.data_recebimento DESC`
    );
    console.log('[index.js] Found Pending Packages:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('[index.js] Error getPendingPackages:', error);
    return [];
  } finally {
      if(client) client.release();
  }
}

// Busca moradores por nome (para autocomplete)
async function searchResidents(searchTerm) {
  // Função espera apenas o termo de busca
  console.log(`[index.js] SEARCH Residents: "${searchTerm}"`);
  // A verificação .trim() aqui agora deve funcionar, pois o handler passa só a string
  if (!searchTerm?.trim()) return [];
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT id, nome FROM Moradores WHERE nome ILIKE $1 ORDER BY nome LIMIT 10',
      [`%${searchTerm}%`]
    );
    console.log(`[index.js] Found Residents for "${searchTerm}":`, result.rows.length);
    return result.rows;
  } catch (error) {
    console.error(`[index.js] Error searchResidents:`, error);
    return [];
  } finally {
      if(client) client.release();
  }
}

// Salva um novo morador no banco
async function saveResident(residentData) {
  console.log('[index.js] SAVE Resident:', residentData);
  const { nome, telefone, rua, numero, bloco, apartamento, observacoes } = residentData;
  if (!nome || !rua || !numero || !apartamento) {
      console.error('[index.js] Error saveResident: missing fields.');
      return { success: false, message: 'Nome, Rua, Número e AP/LT obrigatórios.' };
  }
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `INSERT INTO Moradores (nome, telefone, rua, numero, bloco, apartamento, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [nome, telefone || null, rua, numero, bloco || null, apartamento, observacoes || null]
    );
    const newId = result.rows[0]?.id;
    console.log('[index.js] Resident saved! ID:', newId);
    return { success: true, message: 'Morador salvo!', newId: newId };
  } catch (error) {
    console.error('[index.js] Error saveResident DB:', error);
    return { success: false, message: `Erro BD (${error.code || 'N/A'})` };
  } finally {
      if(client) client.release();
  }
}

// Busca todos os moradores cadastrados
async function getResidents() {
    console.log('[index.js] GET Residents...');
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, nome, apartamento, bloco, telefone FROM Moradores ORDER BY nome ASC`
        );
        console.log('[index.js] Found Residents:', result.rows.length);
        return result.rows;
    } catch (error) {
        console.error('[index.js] Error getResidents:', error);
        return [];
    } finally {
        if(client) client.release();
    }
}

// Exclui um morador pelo ID
async function deleteResident(residentId) {
    console.log(`[index.js] DELETE Resident ID: ${residentId}`);
    if (!residentId) return { success: false, message: 'ID não fornecido.' };
    let client;
    try {
        client = await pool.connect();
        const checkEncomendas = await client.query('SELECT 1 FROM Encomendas WHERE morador_id = $1 LIMIT 1', [residentId]);
        if (checkEncomendas.rows.length > 0) {
             return { success: false, message: 'Não é possível excluir: morador possui encomendas registradas.' };
        }

        const result = await client.query('DELETE FROM Moradores WHERE id = $1', [residentId]);
        if (result.rowCount > 0) {
            console.log(`[index.js] Resident ID ${residentId} deleted.`);
            return { success: true, message: 'Morador excluído!' };
        } else {
            console.warn(`[index.js] Delete Resident ID ${residentId}: not found.`);
            return { success: false, message: 'Morador não encontrado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error deleteResident ID ${residentId}:`, error);
        if (error.code === '23503') return { success: false, message: 'Não é possível excluir: registro referenciado em outra tabela.' };
        return { success: false, message: 'Erro interno ao excluir.' };
    } finally {
        if (client) client.release();
    }
}

// Busca dados de um morador específico por ID
async function getResidentById(residentId) {
    console.log(`[index.js] GET Resident ID: ${residentId}`);
    if (!residentId) { console.error('[index.js] Error: ID missing for getResidentById.'); return null; }
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, nome, telefone, rua, numero, bloco, apartamento, observacoes FROM Moradores WHERE id = $1`,
            [residentId]
        );
        if (result.rows.length > 0) {
            console.log(`[index.js] Found data for resident ID ${residentId}.`);
            return result.rows[0];
        } else {
            console.warn(`[index.js] Resident ID ${residentId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`[index.js] Error getResidentById (${residentId}):`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

// Atualiza os dados de um morador existente
async function updateResident(residentId, residentData) {
    console.log(`[index.js] UPDATE Resident ID: ${residentId}`, residentData);
    const { nome, telefone, rua, numero, bloco, apartamento, observacoes } = residentData;
    if (!residentId || !nome || !rua || !numero || !apartamento) { console.error('[index.js] Error updateResident: missing fields.'); return { success: false, message: 'ID, Nome, Rua, Número e AP/LT obrigatórios.' }; }
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `UPDATE Moradores SET nome = $1, telefone = $2, rua = $3, numero = $4, bloco = $5, apartamento = $6, observacoes = $7 WHERE id = $8`,
            [nome, telefone || null, rua, numero, bloco || null, apartamento, observacoes || null, residentId]
        );
        if (result.rowCount > 0) {
            console.log(`[index.js] Resident ID ${residentId} updated.`);
            return { success: true, message: 'Morador atualizado!' };
        } else {
            console.warn(`[index.js] Update Resident ID ${residentId}: not found.`);
            return { success: false, message: 'Morador não encontrado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error updateResident ID ${residentId}:`, error);
        return { success: false, message: `Erro interno update. (${error.code || 'N/A'})` };
    } finally {
        if (client) client.release();
    }
}


// Busca usuários ATIVOS com nivel_acesso 'porteiro' (para autocomplete no modal de encomenda)
async function searchActivePorters(searchTerm) {
  // Função espera apenas o termo de busca
  console.log(`[index.js] SEARCH Active Porters (Usuarios table): "${searchTerm}"`);
  // A verificação .trim() aqui agora deve funcionar
  if (!searchTerm?.trim()) return [];
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT id, nome_usuario, nome_completo FROM Usuarios
       WHERE (nome_completo ILIKE $1 OR nome_usuario ILIKE $1)
         AND nivel_acesso = 'porteiro'
         AND status = 'Ativo' -- Filtra apenas ativos (adicionado na versão anterior)
       ORDER BY nome_completo, nome_usuario LIMIT 10`,
      [`%${searchTerm}%`]
    );
    console.log(`[index.js] Found Active Porters (Usuarios):`, result.rows.length);
    return result.rows.map(user => ({
      id: user.id,
      nome: user.nome_completo || user.nome_usuario
    }));
  } catch (error) {
    console.error(`[index.js] Error searchActivePorters:`, error);
    return [];
  } finally {
    if (client) client.release();
  }
}


// Salva uma nova encomenda (agora usando usuarios.id corretamente)
async function savePackage(packageData) {
    console.log('[index.js] SAVE Package:', packageData);
    const { moradorId, porteiroUserId, quantidade, dataRecebimento, observacoes /*, codigo_rastreio */ } = packageData;

    if (!moradorId || !porteiroUserId || !quantidade || !dataRecebimento) { console.error('[index.js] Error savePackage: missing fields.'); return { success: false, message: 'Morador, ID Porteiro, Qtde e Data/Hora obrigatórios.' }; }

    let client;
    try {
        client = await pool.connect();
        const statusInicial = 'Recebida na portaria';
        const iResult = await client.query(
            `INSERT INTO Encomendas (morador_id, porteiro_recebeu_id, data_recebimento, quantidade, observacoes, status /*, codigo_rastreio */)
             VALUES ($1, $2, $3, $4, $5, $6 /*, $7 */) RETURNING id`,
            [moradorId, porteiroUserId, dataRecebimento, quantidade, observacoes || null, statusInicial /*, codigo_rastreio || null */]
        );
        const newId = iResult.rows[0]?.id;
        console.log('[index.js] Encomenda salva! ID:', newId);
        return { success: true, message: 'Encomenda salva!', newId: newId };

    } catch (error) {
        console.error('[index.js] Error savePackage:', error);
        if (error.code === '23503') {
             if (error.constraint?.includes('morador_id')) return { success: false, message: 'Erro: Morador inválido.' };
             if (error.constraint?.includes('usuario_recebeu_id')) return { success: false, message: 'Erro: Porteiro inválido ou inativo.' }; // Nome correto da FK
             return { success: false, message: 'Erro de referência ao salvar.' };
        }
        return { success: false, message: `Erro BD (${error.code || 'N/A'})` };
    } finally {
        if (client) client.release();
    }
}

// Função de Login (Usa tabela Usuarios, agora verifica status)
async function loginUser(username, password) {
    const tableName = 'Usuarios';
    const loginField = 'nome_usuario';
    console.log(`[index.js] LOGIN User: "${username}" na tabela "${tableName}"`);
    if (!username || !password) return { success: false, message: 'Nome de usuário e senha obrigatórios.' };
    let client;
    try {
        client = await pool.connect();
        // Adiciona logs de debug e verifica status
        const queryText = `SELECT id, nome_usuario, senha_hash, nome_completo, nivel_acesso, status FROM ${tableName} WHERE ${loginField} = $1`;
        console.log(`[DEBUG loginUser] Executando query for username: ${username}`);
        const result = await client.query(queryText, [username]);
        console.log(`[DEBUG loginUser] Query result row count: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.log(`[DEBUG loginUser] Usuário "${username}" NÃO encontrado.`);
            return { success: false, message: 'Usuário ou senha inválidos.' };
        }

        const user = result.rows[0];
        console.log(`[DEBUG loginUser] User found in DB: ID=${user.id}, Status=${user.status}`);

        if (user.status !== 'Ativo') {
            console.log(`[index.js] Login falhou: Usuário "${username}" está ${user.status || 'Indefinido'}.`);
             if (client) { client.release(); client = null; }
            return { success: false, message: 'Usuário inativo ou bloqueado.' };
        }

        console.log(`[DEBUG loginUser] Attempting bcrypt.compare for user ID: ${user.id}`);
        const match = await bcrypt.compare(password, user.senha_hash);
        console.log(`[DEBUG loginUser] bcrypt.compare result (match?): ${match}`);

        if (match) {
            const userRole = user.nivel_acesso;
            console.log(`[index.js] Login OK para "${username}". Role: ${userRole}, Status: ${user.status}`);
            return { success: true, user: { id: user.id, username: user.nome_usuario, name: user.nome_completo || user.nome_usuario, role: userRole, status: user.status }};
        } else {
            console.log(`[index.js] Login falhou: Senha incorreta.`);
            return { success: false, message: 'Usuário ou senha inválidos.' };
        }
    } catch (error) {
        console.error('[index.js] Erro login:', error);
        return { success: false, message: 'Erro interno login.' };
    } finally {
        if (client) { console.log('[DEBUG loginUser] Liberando cliente.'); client.release(); }
    }
}

// Busca todos os Usuários da tabela Usuarios (agora com status)
async function getUsers() {
    console.log('[index.js] GET Users...');
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, nome_usuario, nome_completo, email, nivel_acesso, status
             FROM Usuarios ORDER BY nome_completo, nome_usuario ASC`
        );
        console.log('[index.js] Found Users:', result.rows.length);
        return result.rows;
    } catch (error) {
        console.error('[index.js] Error getUsers:', error);
        return [];
    } finally {
        if (client) { console.log('[DEBUG getUsers] Releasing client.'); client.release(); }
    }
}

// Busca dados de um usuário por ID (Tabela Usuarios, agora com status)
async function getUserById(userId) {
    console.log(`[index.js] GET User ID: ${userId}`);
    if (!userId) { console.error('[index.js] Error: ID missing for getUserById.'); return null; }
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, nome_usuario, nome_completo, email, nivel_acesso, status
             FROM Usuarios WHERE id = $1`,
            [userId]
        );
        if (result.rows.length > 0) {
            console.log(`[index.js] Found data for user ID ${userId}.`);
            return result.rows[0];
        } else {
            console.warn(`[index.js] User ID ${userId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`[index.js] Error getUserById (${userId}):`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

// Atualiza dados de um usuário (Tabela Usuarios, agora com status)
async function updateUser(userId, userData) {
    console.log(`[index.js] UPDATE User ID: ${userId}`, userData);
    const { nomeUsuario, nomeCompleto, email, senha, nivelAcesso, status } = userData;
    const saltRounds = 10;

    if (!userId || !nomeUsuario || !nivelAcesso) return { success: false, message: 'ID, Nome de Usuário e Nível de Acesso obrigatórios para atualização.' };
    if (nivelAcesso !== 'admin' && nivelAcesso !== 'porteiro') return { success: false, message: 'Nível de acesso inválido.' };
    if (status && status !== 'Ativo' && status !== 'Inativo') return { success: false, message: 'Status inválido (deve ser Ativo ou Inativo).' };

    let client;
    try {
        client = await pool.connect();
        let queryFields = ['nome_usuario = $1', 'nivel_acesso = $2'];
        let queryParams = [nomeUsuario, nivelAcesso];
        let paramCounter = 3;

        if (nomeCompleto !== undefined) { queryFields.push(`nome_completo = $${paramCounter}`); queryParams.push(nomeCompleto); paramCounter++; }
        if (email !== undefined) { queryFields.push(`email = $${paramCounter}`); queryParams.push(email); paramCounter++; }
        if (status) { queryFields.push(`status = $${paramCounter}`); queryParams.push(status); paramCounter++; }

        if (senha && senha.length >= 6) {
             console.log(`[index.js] Updating user ID ${userId} WITH password.`);
             const novaSenhaHash = await bcrypt.hash(senha, saltRounds);
             queryFields.push(`senha_hash = $${paramCounter}`); queryParams.push(novaSenhaHash); paramCounter++;
        } else if (senha && senha.length > 0) {
             return { success: false, message: 'Nova senha mínima 6 caracteres.' };
        }

        queryParams.push(userId);
        const queryText = `UPDATE Usuarios SET ${queryFields.join(', ')} WHERE id = $${paramCounter}`;

        console.log(`[DEBUG updateUser] Query: ${queryText}`); console.log(`[DEBUG updateUser] Params:`, queryParams);
        const result = await client.query(queryText, queryParams);

        if (result.rowCount > 0) {
            console.log(`[index.js] User ID ${userId} updated.`);
            return { success: true, message: 'Usuário atualizado!' };
        } else {
            console.warn(`[index.js] Update User ID ${userId}: not found.`);
            return { success: false, message: 'Usuário não encontrado.' };
        }

    } catch (error) {
        console.error(`[index.js] Error updateUser ID ${userId}:`, error);
        if (error.code === '23505') {
            if (error.constraint?.includes('nome_usuario')) return { success: false, message: 'Erro: Nome de usuário já existe.' };
            if (error.constraint?.includes('email')) return { success: false, message: 'Erro: Email já cadastrado.' };
        }
        return { success: false, message: `Erro interno update. (${error.code || 'N/A'})` };
    } finally {
        if (client) client.release();
    }
}


// Exclui Usuário (Tabela Usuarios)
async function deleteUser(userId) {
    console.log(`[index.js] DELETE User ID: ${userId}`);
    if (!userId) return { success: false, message: 'ID não fornecido.' };
    let client;
    try {
        client = await pool.connect();
         const checkEncomendas = await client.query('SELECT 1 FROM Encomendas WHERE porteiro_recebeu_id = $1 OR porteiro_entregou_id = $1 LIMIT 1', [userId]);
         if (checkEncomendas.rows.length > 0) {
              return { success: false, message: 'Não é possível excluir: usuário possui encomendas associadas.' };
         }

        const result = await client.query('DELETE FROM Usuarios WHERE id = $1', [userId]);
        if (result.rowCount > 0) {
            console.log(`[index.js] User ID ${userId} deleted.`);
            return { success: true, message: 'Usuário excluído!' };
        } else {
            console.warn(`[index.js] Delete User ID ${userId}: not found.`);
            return { success: false, message: 'Usuário não encontrado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error deleteUser ID ${userId}:`, error);
         if (error.code === '23503') return { success: false, message: 'Não é possível excluir: usuário referenciado em outra tabela (ex: encomendas).' };
        return { success: false, message: 'Erro interno ao excluir.' };
    } finally {
        if (client) client.release();
    }
}

// Salva um novo usuário (Tabela Usuarios, agora com status padrão 'Ativo')
async function saveUser(userData) {
    console.log('[index.js] SAVE User:', userData);
    const { nomeUsuario, nomeCompleto, email, senha, nivelAcesso } = userData;
    const saltRounds = 10;
    const statusPadrao = 'Ativo';

    if (!nomeUsuario || !senha || !nivelAcesso) return { success: false, message: 'Nome de usuário, Senha e Nível de Acesso obrigatórios.' };
    if (nivelAcesso !== 'admin' && nivelAcesso !== 'porteiro') return { success: false, message: 'Nível de acesso inválido.' };
    if (senha.length < 6) return { success: false, message: 'Senha mínima 6 caracteres.' };

    let client;
    try {
        console.log('[index.js] Gerando hash senha...');
        const senhaHash = await bcrypt.hash(senha, saltRounds);
        console.log('[index.js] Hash gerado.');
        client = await pool.connect();
        const queryText = `INSERT INTO usuarios (nome_usuario, nome_completo, email, senha_hash, nivel_acesso, status)
                           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const queryParams = [nomeUsuario, nomeCompleto || null, email || null, senhaHash, nivelAcesso, statusPadrao];

        console.log(`[DEBUG saveUser] Query: ${queryText}`); console.log(`[DEBUG saveUser] Params:`, queryParams);
        const result = await client.query(queryText, queryParams);
        const newId = result.rows[0]?.id;
        console.log(`[index.js] Usuário (${nivelAcesso}, ${statusPadrao}) salvo! ID:`, newId);
        return { success: true, message: `Usuário (${nivelAcesso}) salvo!`, newId: newId };
    } catch (error) {
        console.error('[index.js] Error saveUser DB:', error);
        console.error(`[DEBUG saveUser] DB Error Code: ${error.code}, Constraint: ${error.constraint}`);
        if (error.code === '23505') {
            if (error.constraint?.includes('nome_usuario')) return { success: false, message: 'Erro: Nome de usuário já existe.' };
            if (error.constraint?.includes('email')) return { success: false, message: 'Erro: Email já cadastrado.' };
        }
        return { success: false, message: `Erro BD (${error.code || 'N/A'})` };
    } finally {
        if (client) { console.log('[DEBUG saveUser] Releasing client.'); client.release(); }
    }
}
// -------------------------------------------
async function getPackageById(packageId) {
    console.log(`[index.js] GET Package By ID: ${packageId}`);
    if (!packageId) {
        console.error('[index.js] Error: Package ID missing for getPackageById.');
        return { success: false, message: 'ID da encomenda não fornecido.', data: null };
    }
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT
                E.id, E.morador_id, M.nome AS morador_nome,
                E.porteiro_recebeu_id, U.nome_completo AS porteiro_nome,
                E.data_recebimento, E.quantidade, E.status, E.observacoes, E.codigo_rastreio,
                E.data_entrega, E.porteiro_entregou_id, U_entrega.nome_completo AS porteiro_entregou_nome
             FROM Encomendas E
             JOIN Moradores M ON E.morador_id = M.id
             LEFT JOIN Usuarios U ON E.porteiro_recebeu_id = U.id
             LEFT JOIN Usuarios U_entrega ON E.porteiro_entregou_id = U_entrega.id
             WHERE E.id = $1`,
            [packageId]
        );

        if (result.rows.length > 0) {
            console.log(`[index.js] Found package data for ID ${packageId}.`);
            // Formata a data_recebimento para YYYY-MM-DD e a hora para HH:MM
            const pkg = result.rows[0];
            if (pkg.data_recebimento) {
                const dataHora = new Date(pkg.data_recebimento);
                // Ajusta para o fuso horário local antes de formatar
                // (Este ajuste pode precisar de mais cuidado dependendo do seu fuso e como o timestamp é salvo)
                // Para simplificar, vamos assumir que o timestamp no banco já está "ok" para conversão direta.
                // Se as datas/horas ficarem erradas, precisaremos ajustar a conversão de fuso aqui.
                pkg.data_recebimento_date = dataHora.toISOString().split('T')[0]; // YYYY-MM-DD
                pkg.data_recebimento_time = dataHora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
            }
            return { success: true, data: pkg };
        } else {
            console.warn(`[index.js] Package ID ${packageId} not found.`);
            return { success: false, message: 'Encomenda não encontrada.', data: null };
        }
    } catch (error) {
        console.error(`[index.js] Error getPackageById (${packageId}):`, error);
        return { success: false, message: 'Erro ao buscar encomenda.', data: null, error: error.message };
    } finally {
        if (client) client.release();
    }
}
// Adicione esta função no seu index.js

async function updatePackage(packageId, packageData) {
    console.log(`[index.js] UPDATE Package ID: ${packageId}`, packageData);

    // Extrai os dados esperados. A dataRecebimento já deve vir no formato ISO string do frontend.
    const {
        moradorId,
        porteiroUserId, // Este é o ID do usuário que recebeu (porteiro_recebeu_id)
        quantidade,
        dataRecebimento, // Espera-se uma string ISO (ex: "2025-05-11T12:30:00.000Z")
        observacoes
        // codigo_rastreio - se você adicionar este campo ao modal de edição
    } = packageData;

    // Validação básica (pode expandir conforme necessidade)
    if (!packageId) return { success: false, message: 'ID da encomenda não fornecido para atualização.' };
    if (!moradorId || !porteiroUserId || !quantidade || !dataRecebimento) {
        return { success: false, message: 'Campos obrigatórios (Morador, Porteiro, Quantidade, Data/Hora) não preenchidos.' };
    }

    let client;
    try {
        client = await pool.connect();
        const queryText = `
            UPDATE Encomendas
            SET morador_id = $1,
                porteiro_recebeu_id = $2,
                quantidade = $3,
                data_recebimento = $4,
                observacoes = $5
                -- , codigo_rastreio = $6 -- Adicionar se for editar
            WHERE id = $6; -- O ID da encomenda é o último parâmetro
        `;
        const queryParams = [
            moradorId,
            porteiroUserId,
            parseInt(quantidade, 10),
            dataRecebimento, // Deve ser uma string de timestamp válida para o PostgreSQL
            observacoes || null,
            // codigo_rastreio || null, // Adicionar se for editar
            packageId
        ];

        const result = await client.query(queryText, queryParams);

        if (result.rowCount > 0) {
            console.log(`[index.js] Package ID ${packageId} updated successfully.`);
            return { success: true, message: 'Encomenda atualizada com sucesso!' };
        } else {
            console.warn(`[index.js] Update Package ID ${packageId}: not found or no changes made.`);
            return { success: false, message: 'Encomenda não encontrada para atualização ou nenhum dado foi alterado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error updating package ID ${packageId}:`, error);
        if (error.code === '23503') { // Foreign Key violation
             if (error.constraint?.includes('morador_id')) return { success: false, message: 'Erro: Morador inválido.' };
             if (error.constraint?.includes('usuario_recebeu_id')) return { success: false, message: 'Erro: Porteiro inválido.' };
             return { success: false, message: 'Erro de referência ao atualizar.' };
        }
        return { success: false, message: `Erro interno ao atualizar encomenda (${error.code || 'N/A'}).` };
    } finally {
        if (client) client.release();
    }
}
// Adicione esta função no seu index.js

async function deliverPackage(packageId, deliveryData) {
    console.log(`[index.js] ATTEMPTING Deliver Package ID: ${packageId} with data:`, deliveryData);
     console.log('[index.js DEBUG] Função deliverPackage chamada com packageId:', packageId, 'E deliveryData:', deliveryData);


    const {
        porteiroEntregouId, // ID do usuário que está registrando a entrega
        dataEntrega,         // String ISO da data/hora da entrega (ex: "2025-05-11T14:30:00.000Z")
        retiradoPorNome,     // Nome de quem retirou
        observacoesEntrega   // Observações específicas da entrega
    } = deliveryData;

    if (!packageId || !porteiroEntregouId || !dataEntrega) {
        return { success: false, message: 'ID da encomenda, ID do porteiro ou Data/Hora da entrega não fornecidos.' };
    }

    let client;
    try {
        client = await pool.connect();
        const newStatus = 'Entregue';

        // Atualiza a encomenda com os novos dados
        const queryText = `
            UPDATE Encomendas
            SET status = $1,
                data_entrega = $2,       -- Data/hora fornecida pelo modal
                porteiro_entregou_id = $3, -- Porteiro selecionado no modal
                retirado_por_nome = $4,  -- Nome de quem retirou
                observacoes = $5         -- Atualiza as observações da encomenda com as da entrega
                                         -- (Ou crie uma nova coluna 'observacoes_entrega' se preferir)
            WHERE id = $6 AND status != $1; -- Só atualiza se o status ainda não for 'Entregue'
        `;
        const queryParams = [
            newStatus,
            dataEntrega, // Deve ser um timestamp válido
            porteiroEntregouId,
            retiradoPorNome || null, // Permite nulo se não preenchido
            observacoesEntrega || null, // Permite nulo se não preenchido
            packageId
        ];

        const result = await client.query(queryText, queryParams);

        if (result.rowCount > 0) {
            console.log(`[index.js] Package ID ${packageId} marked as delivered by User ID ${porteiroEntregouId}.`);
            return { success: true, message: 'Encomenda marcada como entregue com sucesso!' };
        } else {
            const checkPkg = await client.query("SELECT status FROM Encomendas WHERE id = $1", [packageId]);
            if (checkPkg.rows.length === 0) {
                return { success: false, message: 'Encomenda não encontrada.' };
            }
            if (checkPkg.rows[0].status === newStatus) {
                return { success: false, message: 'Esta encomenda já foi marcada como entregue anteriormente.' };
            }
            console.warn(`[index.js] Deliver Package ID ${packageId}: No rows updated. Possible race condition or wrong ID.`);
            return { success: false, message: 'Não foi possível atualizar a encomenda (nenhuma linha afetada).' };
        }
    } catch (error) {
        console.error(`[index.js] Error delivering package ID ${packageId}:`, error);
        if (error.code === '23503' && error.constraint?.includes('porteiro_entregou_id')) {
             return { success: false, message: 'Erro: Porteiro que entregou inválido.' };
        }
        return { success: false, message: `Erro interno ao registrar entrega (${error.message || error.code || 'N/A'}).` };
    } finally {
        if (client) client.release();
    }
}
// --- Configuração do Ciclo de Vida do Electron ---
app.whenReady().then(() => {
  console.log('[index.js] App pronto. Configurando IPC e criando janela...');

  // --- REGISTRO DOS HANDLERS IPC (COM CORREÇÃO) ---
  ipcMain.handle('get-pending-packages', getPendingPackages);
  // CORRIGIDO: Usar wrapper para passar apenas o termo
  ipcMain.handle('search-porters', (event, searchTerm) => searchActivePorters(searchTerm));
  // CORRIGIDO: Usar wrapper para passar apenas o termo
  ipcMain.handle('search-residents', (event, searchTerm) => searchResidents(searchTerm));
  ipcMain.handle('save-resident', (event, residentData) => saveResident(residentData));
  ipcMain.handle('get-residents', getResidents);
  ipcMain.handle('delete-resident', (event, residentId) => deleteResident(residentId));
  ipcMain.handle('get-resident-by-id', (event, residentId) => getResidentById(residentId));
  ipcMain.handle('update-resident', (event, { residentId, residentData }) => updateResident(residentId, residentData));
  ipcMain.handle('login-user', (event, credentials) => loginUser(credentials.username, credentials.password));
  ipcMain.handle('save-package', (event, packageData) => savePackage(packageData));
  ipcMain.handle('save-user', (event, userData) => saveUser(userData));
  ipcMain.handle('get-users', getUsers);
  ipcMain.handle('delete-user', (event, userId) => deleteUser(userId));
  ipcMain.handle('get-user-by-id', (event, userId) => getUserById(userId));
  ipcMain.handle('update-user', (event, { userId, userData }) => updateUser(userId, userData));
ipcMain.handle('get-package-by-id', (event, packageId) => getPackageById(packageId));
ipcMain.handle('update-package', (event, { packageId, packageData }) => updatePackage(packageId, packageData));
ipcMain.handle('deliver-package', (event, { packageId, deliveryData }) => deliverPackage(packageId, deliveryData));

  // Listener para focar a janela principal
  ipcMain.on('focus-main-window', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          // Adicionado foco no webContents também, pode ajudar em alguns casos
          mainWindow.webContents.focus();
          console.log('[Main Process] Foco aplicado.');
      } else {
           console.error('[Main Process] mainWindow não encontrada para aplicar foco.');
      }
  });
  // --- FIM DO REGISTRO IPC ---

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') { console.log('[index.js] App encerrado.'); app.quit(); } });

console.log('[index.js] Script principal carregado.');
