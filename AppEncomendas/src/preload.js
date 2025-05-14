// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Objeto que será exposto para o renderer process de forma segura
const electronAPI = {
  // Encomendas
  getPendingPackages: () => ipcRenderer.invoke('get-pending-packages'),
  savePackage: (packageData) => ipcRenderer.invoke('save-package', packageData),
  getPackageById: (packageId) => ipcRenderer.invoke('get-package-by-id', packageId),
 getPackageById: (packageId) => ipcRenderer.invoke('get-package-by-id', packageId), // Já adicionado
    updatePackage: (packageId, packageData) => ipcRenderer.invoke('update-package', { packageId, packageData }), // <<< ADICIONE ESTA LINHA
     deliverPackage: (packageId, deliveryData) => ipcRenderer.invoke('deliver-package', { packageId, deliveryData }),

  // Moradores
  searchResidents: (term) => ipcRenderer.invoke('search-residents', term),
  saveResident: (data) => ipcRenderer.invoke('save-resident', data),
  getResidents: () => ipcRenderer.invoke('get-residents'),
  deleteResident: (residentId) => ipcRenderer.invoke('delete-resident', residentId),
  getResidentById: (residentId) => ipcRenderer.invoke('get-resident-by-id', residentId),
  updateResident: (residentId, residentData) => ipcRenderer.invoke('update-resident', { residentId, residentData }),

  // Usuários (Admin/Porteiro) - Tabela Usuarios
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials), // Chama handler que busca em Usuarios
  searchActivePorters: (term) => ipcRenderer.invoke('search-porters', term), // Busca porteiros ativos em Usuarios
  saveUser: (userData) => ipcRenderer.invoke('save-user', userData), // Salva novo usuário (admin/porteiro)
  getUsers: () => ipcRenderer.invoke('get-users'), // Lista todos os usuários
  deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId), // Exclui usuário
  getUserById: (userId) => ipcRenderer.invoke('get-user-by-id', userId), // Busca usuário por ID
  updateUser: (userId, userData) => ipcRenderer.invoke('update-user', { userId, userData }), // Atualiza usuário
  // TODO: Adicionar updateUserStatus

  // Outros
  focusMainWindow: () => ipcRenderer.send('focus-main-window'), // Envia comando para focar janela
};

// Expõe o objeto 'electronAPI' de forma segura para o renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('[Preload] Script carregado e API exposta (Tabela Usuarios Unificada).');

// Log de verificação (opcional, mas útil para debug)
if (electronAPI.saveUser && electronAPI.getUsers && electronAPI.deleteUser && electronAPI.getUserById && electronAPI.updateUser) {
    console.log('[Preload] Funções CRUD de Usuário expostas.');
} else {
     console.error('[Preload] ERRO: Falha ao expor uma ou mais funções CRUD de Usuário!');
}
