
import { Artifact, User } from '../types';

const API_BASE = '/api';

export const api = {
  async getArtifacts(): Promise<Artifact[]> {
    try {
      const res = await fetch(`${API_BASE}/data`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return data.artifacts || [];
    } catch (error) {
      console.warn("API unavailable, falling back to local storage:", error);
      const local = localStorage.getItem('artifacts');
      return local ? JSON.parse(local) : [];
    }
  },

  async getUsers(): Promise<User[]> {
    try {
        const res = await fetch(`${API_BASE}/data`);
        const data = await res.json();
        return data.users || [];
    } catch (e) {
        // Fallback to local storage
        const local = localStorage.getItem('archaeo_users');
        return local ? JSON.parse(local) : [];
    }
  },

  async syncData(users: User[], artifacts: Artifact[]) {
    try {
        await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, artifacts })
        });
    } catch (e) {
        console.error("Sync failed", e);
        // Backup to local storage if server fails
        localStorage.setItem('artifacts', JSON.stringify(artifacts));
        localStorage.setItem('archaeo_users', JSON.stringify(users));
    }
  },

  // Helper to emulate granular save by doing Read-Modify-Write
  async saveArtifact(artifact: Artifact) {
    try {
        const res = await fetch(`${API_BASE}/data`);
        let data = { users: [], artifacts: [] };
        if (res.ok) {
            data = await res.json();
        } else {
             const localArts = localStorage.getItem('artifacts');
             if(localArts) data.artifacts = JSON.parse(localArts);
        }

        let artifacts = (data.artifacts || []) as Artifact[];
        
        const index = artifacts.findIndex((a: Artifact) => a.id === artifact.id);
        if (index >= 0) {
        artifacts[index] = artifact;
        } else {
        artifacts.unshift(artifact);
        }
        
        await this.syncData(data.users || [], artifacts);
        return artifact;
    } catch (e) {
        // Offline save
        console.warn("Saving offline");
        const local = localStorage.getItem('artifacts');
        const artifacts = local ? JSON.parse(local) : [];
        const index = artifacts.findIndex((a: Artifact) => a.id === artifact.id);
        if (index >= 0) artifacts[index] = artifact;
        else artifacts.unshift(artifact);
        localStorage.setItem('artifacts', JSON.stringify(artifacts));
        return artifact;
    }
  },

  async deleteArtifact(id: string) {
    try {
        const res = await fetch(`${API_BASE}/data`);
        let data = { users: [], artifacts: [] };
        if (res.ok) data = await res.json();
        
        const artifacts = (data.artifacts || []).filter((a: Artifact) => a.id !== id);
        await this.syncData(data.users || [], artifacts);
    } catch (e) {
        const local = localStorage.getItem('artifacts');
        if (local) {
            const artifacts = JSON.parse(local).filter((a: Artifact) => a.id !== id);
            localStorage.setItem('artifacts', JSON.stringify(artifacts));
        }
    }
  },

  async updateProfile(updatedUser: Partial<User> & { username: string, newPassword?: string }) {
     let users: User[] = [];
     let artifacts: Artifact[] = [];
     let isOffline = false;
     
     // 1. Try to get latest data from server
     try {
        const res = await fetch(`${API_BASE}/data`);
        if(res.ok) {
            const data = await res.json();
            users = data.users || [];
            artifacts = data.artifacts || [];
        } else {
            throw new Error("Server error");
        }
     } catch (e) {
         isOffline = true;
         // Fallback to local
         const localUsers = localStorage.getItem('archaeo_users');
         users = localUsers ? JSON.parse(localUsers) : [];
         
         // If artifacts are needed for sync, grab them too
         const localArtifacts = localStorage.getItem('artifacts');
         artifacts = localArtifacts ? JSON.parse(localArtifacts) : [];
     }
     
     const index = users.findIndex((u: User) => u.username === updatedUser.username);
     
     if (index === -1) {
         // If user doesn't exist in the list (rare, maybe first run admin), just return the updated partial as is
         // so at least current session works. But ideally we should throw.
         throw new Error("User record not found in database");
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

     if (isOffline) {
         localStorage.setItem('archaeo_users', JSON.stringify(users));
     } else {
         await this.syncData(users, artifacts);
     }
     
     return newUser;
  }
};
