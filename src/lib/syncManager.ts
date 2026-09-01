import { get, set, update } from 'idb-keyval';
import { createClient } from '@/lib/supabase/client';
import { captureError, captureMessage } from '@/lib/observability/logger';

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
      id: crypto.randomUUID(),
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
   * Chaque tâche réussie est retirée immédiatement de la queue stockée.
   * Retourne un résumé pour que l'appelant puisse informer l'utilisateur —
   * jusqu'ici cette méthode n'était appelée nulle part dans l'application,
   * la file restait donc en attente indéfiniment après un retour en ligne.
   */
  static async syncAll(): Promise<{ synced: number; failed: number; total: number }> {
    if (!navigator.onLine) return { synced: 0, failed: 0, total: 0 };

    const queue = await this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0, total: 0 };

    console.log(`[SyncManager] Démarrage de la synchronisation (${queue.length} tâches)...`);
    const supabase = createClient();
    let remainingQueue = [...queue];

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
        // Retirer immédiatement la tâche réussie de la queue persistée
        remainingQueue = remainingQueue.filter(t => t.id !== task.id);
        await set(SYNC_QUEUE_KEY, remainingQueue);
      } catch (err) {
        captureError(err, { layer: 'sync', taskId: task.id, table: task.table, action: task.action });
        // La tâche échouée reste dans remainingQueue
      }
    }

    if (remainingQueue.length === 0) {
      console.log('[SyncManager] Synchronisation terminée à 100%.');
    } else {
      captureMessage('[SyncManager] Tâches en échec restent en file d\'attente.', { failedCount: remainingQueue.length });
    }

    return {
      synced: queue.length - remainingQueue.length,
      failed: remainingQueue.length,
      total: queue.length,
    };
  }
}

export default SyncManager;
