import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

declare global {
  interface PolicyFileBucket {
    put(key: string, value: ArrayBuffer): Promise<unknown>;
    get(key: string): Promise<{ body: ReadableStream } | null>;
    delete(key: string): Promise<void>;
  }
  var __POLICY_FILES__: PolicyFileBucket | undefined;
}

const localRoot = path.join(process.cwd(), ".data", "policy-files");

function localPath(key: string): string {
  const resolved = path.resolve(localRoot, key);
  if (!resolved.startsWith(path.resolve(localRoot) + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export async function putPolicyFile(key: string, bytes: ArrayBuffer): Promise<void> {
  const bucket = globalThis.__POLICY_FILES__;
  if (bucket) {
    await bucket.put(key, bytes);
    return;
  }
  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(bytes));
}

export async function getPolicyFile(key: string): Promise<BodyInit | null> {
  const bucket = globalThis.__POLICY_FILES__;
  if (bucket) return (await bucket.get(key))?.body ?? null;
  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

export async function deletePolicyFile(key: string): Promise<void> {
  const bucket = globalThis.__POLICY_FILES__;
  if (bucket) {
    await bucket.delete(key);
    return;
  }
  await rm(localPath(key), { force: true });
}
