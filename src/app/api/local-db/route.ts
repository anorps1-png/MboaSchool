import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Path helpers
const getDbDir = () => {
  const dir = path.join(os.homedir(), '.mboaschool');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getDbPath = () => path.join(getDbDir(), 'local_db.json');
const getQueuePath = () => path.join(getDbDir(), 'sync_queue.json');

// Helper to read database
const readDb = (): Record<string, any[]> => {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return {};
  }
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
};

// Helper to write database
const writeDb = (db: Record<string, any[]>) => {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
};

// Helper to read sync queue
const readQueue = (): any[] => {
  const queuePath = getQueuePath();
  if (!fs.existsSync(queuePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(queuePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

// Helper to write sync queue
const writeQueue = (queue: any[]) => {
  const queuePath = getQueuePath();
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
};

// Resolve relations dynamically for nested selects
function resolveRelations(table: string, records: any[], db: Record<string, any[]>) {
  return records.map(record => {
    const copy = { ...record };
    
    if (table === 'eleves') {
      const paiements = db['paiements'] || [];
      copy.paiements = paiements.filter((p: any) => p.eleve_id === record.id);
      
      const notes = db['notes'] || [];
      copy.notes = notes.filter((n: any) => n.eleve_id === record.id);
    }
    
    if (table === 'ecritures_comptables') {
      const lignes = db['lignes_ecritures'] || [];
      copy.lignes_ecritures = lignes.filter((l: any) => l.ecriture_id === record.id);
    }
    
    if (table === 'classes') {
      const eleves = db['eleves'] || [];
      copy.eleves = eleves.filter((e: any) => e.classe_id === record.id);
    }

    if (table === 'membres_personnel') {
      const fb = db['formations_beneficiaires'] || [];
      copy.formations_beneficiaires = fb.filter((x: any) => x.personnel_id === record.id);
    }

    if (table === 'sections') {
      const niveaux = db['niveaux_classes'] || [];
      const classes = db['classes'] || [];
      copy.niveaux_classes = niveaux
        .filter((n: any) => n.section_id === record.id)
        .map((n: any) => ({
          ...n,
          classes: classes.filter((c: any) => c.niveau_id === n.id)
        }));
    }
    
    return copy;
  });
}

// GET handler
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. Get sync queue
    if (action === 'get-queue') {
      const queue = readQueue();
      return NextResponse.json({ queue, error: null });
    }

    // 2. Select query
    const table = searchParams.get('table');
    if (!table) {
      return NextResponse.json({ error: "Missing table parameter" }, { status: 400 });
    }

    const filtersStr = searchParams.get('filters');
    const isSingle = searchParams.get('isSingle') === 'true';

    const db = readDb();
    let records = db[table] || [];

    // Apply filters
    if (filtersStr) {
      const filters = JSON.parse(filtersStr) as { field: string; value: any }[];
      for (const filter of filters) {
        records = records.filter(item => item[filter.field] === filter.value);
      }
    }

    // Resolve nested relations
    records = resolveRelations(table, records, db);

    if (isSingle) {
      return NextResponse.json({ data: records[0] || null, error: null });
    }

    return NextResponse.json({ data: records, error: null });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: { message: e.message } }, { status: 500 });
  }
}

// POST handler (Insert / Update / Delete / Init)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, table, payload, filters, taskId } = body;

    // 1. Init Database with seed data if empty
    if (action === 'init') {
      const db = readDb();
      let initializedCount = 0;
      for (const key of Object.keys(payload)) {
        if (!db[key] || db[key].length === 0) {
          db[key] = payload[key];
          initializedCount++;
        }
      }
      if (initializedCount > 0) {
        writeDb(db);
      }
      return NextResponse.json({ success: true, initializedCount });
    }

    if (!table || !action) {
      return NextResponse.json({ error: "Missing table or action parameter" }, { status: 400 });
    }

    const db = readDb();
    if (!db[table]) {
      db[table] = [];
    }

    let resultData: any = null;

    // A. INSERT
    if (action === 'insert') {
      const payloadArray = Array.isArray(payload) ? payload : [payload];
      for (const item of payloadArray) {
        if (!item.id) {
          item.id = `local_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        }
        db[table].push(item);
        
        // Add to local sync queue
        const queue = readQueue();
        queue.push({
          id: `task_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          table,
          action: 'insert',
          payload: item,
          timestamp: Date.now()
        });
        writeQueue(queue);
      }
      writeDb(db);
      resultData = Array.isArray(payload) ? payloadArray : payloadArray[0];
    }

    // B. UPDATE
    else if (action === 'update') {
      if (!filters || !Array.isArray(filters)) {
        return NextResponse.json({ error: "Missing filters for update" }, { status: 400 });
      }

      const updatedItems: any[] = [];
      db[table] = db[table].map((item: any) => {
        let match = true;
        for (const filter of filters) {
          if (item[filter.field] !== filter.value) {
            match = false;
            break;
          }
        }
        if (match) {
          const updated = { ...item, ...payload };
          updatedItems.push(updated);
          return updated;
        }
        return item;
      });

      if (updatedItems.length > 0) {
        writeDb(db);
        
        // Add to local sync queue
        const queue = readQueue();
        for (const item of updatedItems) {
          queue.push({
            id: `task_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            table,
            action: 'update',
            payload: item,
            filters,
            timestamp: Date.now()
          });
        }
        writeQueue(queue);
      }
      resultData = updatedItems;
    }

    // D. UPSERT
    else if (action === 'upsert') {
      const payloadArray = Array.isArray(payload) ? payload : [payload];
      const { upsertOptions } = body;
      const onConflictOpt = upsertOptions?.onConflict;
      const conflictKeys = onConflictOpt ? onConflictOpt.split(',').map((k: string) => k.trim()) : ['id'];

      const insertedItems: any[] = [];
      const updatedItems: any[] = [];

      for (const item of payloadArray) {
        const conflictIndex = db[table].findIndex((existingItem: any) => {
          return conflictKeys.every((key: string) => existingItem[key] !== undefined && existingItem[key] === item[key]);
        });

        if (conflictIndex !== -1) {
          const updated = { ...db[table][conflictIndex], ...item };
          db[table][conflictIndex] = updated;
          updatedItems.push(updated);
        } else {
          if (!item.id) {
            item.id = `local_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
          }
          db[table].push(item);
          insertedItems.push(item);
        }
      }

      writeDb(db);

      const queue = readQueue();
      for (const item of updatedItems) {
        queue.push({
          id: `task_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          table,
          action: 'update',
          payload: item,
          filters: conflictKeys.map(k => ({ field: k, value: item[k] })),
          timestamp: Date.now()
        });
      }
      for (const item of insertedItems) {
        queue.push({
          id: `task_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          table,
          action: 'insert',
          payload: item,
          timestamp: Date.now()
        });
      }
      writeQueue(queue);

      resultData = Array.isArray(payload) ? [...updatedItems, ...insertedItems] : (updatedItems[0] || insertedItems[0]);
    }


    // C. DELETE
    else if (action === 'delete') {
      if (!filters || !Array.isArray(filters)) {
        return NextResponse.json({ error: "Missing filters for delete" }, { status: 400 });
      }

      const deletedItems: any[] = [];
      const keptItems = db[table].filter((item: any) => {
        let match = true;
        for (const filter of filters) {
          if (item[filter.field] !== filter.value) {
            match = false;
            break;
          }
        }
        if (match) {
          deletedItems.push(item);
          return false;
        }
        return true;
      });

      if (deletedItems.length > 0) {
        db[table] = keptItems;
        writeDb(db);

        // Add to local sync queue
        const queue = readQueue();
        for (const item of deletedItems) {
          queue.push({
            id: `task_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            table,
            action: 'delete',
            payload: item,
            filters,
            timestamp: Date.now()
          });
        }
        writeQueue(queue);
      }
      resultData = deletedItems;
    }

    return NextResponse.json({ data: resultData, error: null });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: { message: e.message } }, { status: 500 });
  }
}

// DELETE handler (Acknowledge task from queue)
export async function DELETE(req: NextRequest) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const queue = readQueue();
    const filtered = queue.filter(item => item.id !== taskId);
    writeQueue(filtered);

    return NextResponse.json({ success: true, remaining: filtered.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
