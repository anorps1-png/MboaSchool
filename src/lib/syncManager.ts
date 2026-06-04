import { get, set, update } from 'idb-keyval';
import { createClient } from '@/lib/supabase/client';

export interface SyncTask {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'mboaschool_sync_queue';

class SyncManager {
  /**
   * Ajoute une action dans la file d'attente hors-ligne.
   */
  static async addToQueue(table: string, action: 'insert' | 'update' | 'delete', payload: any) {
    const task: SyncTask = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      table,
      action,
      payload,
      timestamp: Date.now()
    };

    await update(SYNC_QUEUE_KEY, (val) => {
      const queue = (val as SyncTask[]) || [];
      return [...queue, task];
    });

    console.log(`[SyncManager] Tâche ajoutée à la file d'attente (${table} ${action})`);
  }

  /**
   * Récupère la file d'attente actuelle.
   */
  static async getQueue(): Promise<SyncTask[]> {
    const queue = await get(SYNC_QUEUE_KEY);
    return (queue as SyncTask[]) || [];
  }

  /**
   * Tente de synchroniser toute la file d'attente avec Supabase.
   */
  static async syncAll() {
    if (!navigator.onLine) return;

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`[SyncManager] Démarrage de la synchronisation (${queue.length} tâches)...`);
    const supabase = createClient();
    const failedTasks: SyncTask[] = [];

    for (const task of queue) {
      try {
        if (task.action === 'insert') {
          const { error } = await supabase.from(task.table).insert([task.payload]);
          if (error) throw error;
        } else if (task.action === 'update') {
          const { error } = await supabase.from(task.table).update(task.payload).eq('id', task.payload.id);
          if (error) throw error;
        } else if (task.action === 'delete') {
          const { error } = await supabase.from(task.table).delete().eq('id', task.payload.id);
          if (error) throw error;
        }
        console.log(`[SyncManager] Tâche ${task.id} synchronisée avec succès.`);
      } catch (err) {
        console.error(`[SyncManager] Échec de la tâche ${task.id}:`, err);
        failedTasks.push(task); // On garde la tâche en cas d'erreur
      }
    }

    // Mettre à jour la file avec uniquement les tâches échouées
    await set(SYNC_QUEUE_KEY, failedTasks);

    if (failedTasks.length === 0) {
      console.log('[SyncManager] Synchronisation terminée à 100%.');
    } else {
      console.warn(`[SyncManager] ${failedTasks.length} tâches ont échoué et restent en file d'attente.`);
    }
  }
}

export default SyncManager;
