
import { Artifact, User } from '../types';

// Netlify 部署是纯静态前端环境，无法连接 server.js 的 Node 后端。
// 因此我们将 API 改写为纯 LocalStorage 模式，确保在 Netlify 上所有功能可用。

const STORAGE_KEYS = {
  ARTIFACTS: 'artifacts',
  USERS: 'archaeology_users', // Updated key
  CURRENT_USER: 'archaeology_current_user' // Updated key
};

// 模拟网络延迟，让体验更真实 (可选)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  async getArtifacts(): Promise<Artifact[]> {
    // 模拟从服务器获取
    const local = localStorage.getItem(STORAGE_KEYS.ARTIFACTS);
    return local ? JSON.parse(local) : [];
  },

  async getUsers(): Promise<User[]> {
    const local = localStorage.getItem(STORAGE_KEYS.USERS);
    return local ? JSON.parse(local) : [];
  },

  async syncData(users: User[], artifacts: Artifact[]) {
    // 在纯前端模式下，Sync 实际上就是保存到 LocalStorage
    localStorage.setItem(STORAGE_KEYS.ARTIFACTS, JSON.stringify(artifacts));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  async saveArtifact(artifact: Artifact) {
    const artifacts = await this.getArtifacts();
    
    const index = artifacts.findIndex((a: Artifact) => a.id === artifact.id);
    if (index >= 0) {
      artifacts[index] = artifact;
    } else {
      artifacts.unshift(artifact);
    }
    
    localStorage.setItem(STORAGE_KEYS.ARTIFACTS, JSON.stringify(artifacts));
    return artifact;
  },

  async deleteArtifact(id: string) {
    let artifacts = await this.getArtifacts();
    artifacts = artifacts.filter((a: Artifact) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ARTIFACTS, JSON.stringify(artifacts));
  },

  async updateProfile(updatedUser: Partial<User> & { username: string, newPassword?: string }) {
     const users = await this.getUsers();
     
     const index = users.findIndex((u: User) => u.username === updatedUser.username);
     
     if (index === -1) {
         // 如果是首次使用的管理员或未保存的用户，直接返回更新后的对象用于当前会话
         const fallbackUser = {
             ...updatedUser,
             displayName: updatedUser.displayName || updatedUser.username,
             avatarUrl: updatedUser.avatarUrl || ''
         } as User;
         return fallbackUser;
     }
     
     const currentUser = users[index];
     const newUser = { 
         ...currentUser, 
         displayName: updatedUser.displayName || currentUser.displayName,
         avatarUrl: updatedUser.avatarUrl || currentUser.avatarUrl 
     };
     
     if (updatedUser.newPassword) {
         newUser.password = updatedUser.newPassword;
     }
     
     users[index] = newUser;
     localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
     
     return newUser;
  }
};
