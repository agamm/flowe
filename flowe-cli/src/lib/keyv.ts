import type { Process } from "@/types/types";
import { promises as fs } from "fs";
import path from "path";

// Define file path for persistent JSON storage
const filePath = path.resolve(process.cwd(), "kvstore.json");

// Flag to control whether to truncate the store on startup - default is true
// to avoid having to manually delete the kvstore.json file each time on startup
const truncateOnStart = true;

// Define interface for global store to avoid 'any'
interface GlobalWithKVStore {
  __kvStore?: Map<string, Process>;
  __kvStoreInitialized?: boolean;
}

// Use global to persist store across hot reloads
const globalStore = global as unknown as GlobalWithKVStore;
globalStore.__kvStoreInitialized = globalStore.__kvStoreInitialized || false;

// Create a shared in-memory Map instance that persists across hot reloads
if (!globalStore.__kvStore) {
  globalStore.__kvStore = new Map<string, Process>();
}
const memoryStore = globalStore.__kvStore;

// Helper: Load store from disk into memoryStore
async function loadStore() {
  try {
    // Only truncate on initial server start, not on hot reloads
    if (truncateOnStart && !globalStore.__kvStoreInitialized) {
      console.log("Truncating KV store on initial server startup.");
      memoryStore.clear();
      await saveStore();
      globalStore.__kvStoreInitialized = true;
      return;
    }
    
    // Skip loading if already initialized (for hot reloads)
    if (globalStore.__kvStoreInitialized) {
      console.log("KV store already loaded (skipping reload on hot module reload)");
      return;
    }

    const data = await fs.readFile(filePath, "utf-8");
    const records = JSON.parse(data) as Record<string, Process>;
    Object.entries(records).forEach(([key, value]) => {
      memoryStore.set(key, value);
    });
    console.log("KV store loaded from disk.");
    globalStore.__kvStoreInitialized = true;
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code !== "ENOENT") {
      console.error("Failed to load KV store from disk:", err);
    } else {
      console.log("KV store file not found, starting with empty store.");
      globalStore.__kvStoreInitialized = true;
    }
  }
}

// Helper: Save the current memoryStore to disk
async function saveStore() {
  try {
    const records = Object.fromEntries(memoryStore);
    await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf-8");
    console.log("KV store saved to disk.");
  } catch (err) {
    console.error("Failed to save KV store to disk:", err);
  }
}

// Immediately load store when module is imported
loadStore().catch((err) => {
  console.error("Error loading KV store:", err);
});

// Debug utility for listing all keys and flowIds
export async function listAllKeys() {
  const keys: Array<{ key: string, flowId?: string }> = [];
  try {
    for (const [key, value] of memoryStore.entries()) {
      keys.push({ key, flowId: value?.flowId });
    }
  } catch (err) {
    console.error("Failed to list KV store keys:", err);
  }
  return keys;
}

// Function to get all records from KV
export async function getAllRecords() {
  const records: Record<string, Process> = {};
  try {
    for (const [key, value] of memoryStore.entries()) {
      records[key] = value;
    }
  } catch (err) {
    console.error("Failed to list KV store records:", err);
  }
  return records;
}

// Function to get all processes for a flow from KV
export async function getAllProcessesForFlow(flowId: string): Promise<Process[]> {
  const processes: Process[] = [];
  const seenIds = new Set<string>();
  try {
    for (const [, value] of memoryStore.entries()) {
      if (value?.flowId === flowId && !seenIds.has(value.id)) {
        processes.push(value);
        seenIds.add(value.id);
      }
    }
  } catch (err) {
    console.error(`Error listing processes for flow ${flowId}:`, err);
  }
  return processes;
}

// Export a simple interface for the KV store with persistence
export const kv = {
  get: async (key: string) => {
    return memoryStore.get(key);
  },
  set: async (key: string, value: Process) => {
    memoryStore.set(key, value);
    await saveStore();
  },
  delete: async (key: string) => {
    const result = memoryStore.delete(key);
    await saveStore();
    return result;
  },
  clear: async () => {
    memoryStore.clear();
    await saveStore();
  },
  has: async (key: string) => {
    return memoryStore.has(key);
  },
  iterator: () => memoryStore.entries(),
  on: () => {}, 
  off: () => {} 
};
