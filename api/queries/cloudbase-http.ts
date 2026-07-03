/**
 * CloudBase HTTP API Client - API Key Authentication
 * Uses CloudBase Server API Key (long-term valid, admin permission)
 * Zero SDK, zero signature calculation - just Bearer token
 */

import { env } from "../lib/env";

// ─── EJSON Helpers ───

/** Serialize JS value to EJSON for CloudBase */
function toEJSON(value: unknown): unknown {
  if (value instanceof Date) {
    return { $date: { $numberLong: value.getTime().toString() } };
  }
  if (Array.isArray(value)) return value.map(toEJSON);
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = toEJSON(v);
    }
    return result;
  }
  return value;
}

/** Parse EJSON response from CloudBase */
function fromEJSON(data: unknown): unknown {
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(fromEJSON);

  const obj = data as Record<string, unknown>;

  // Date: { $date: { $numberLong: "..." } }
  if (obj.$date && typeof obj.$date === "object") {
    const dateObj = obj.$date as Record<string, string>;
    if (dateObj.$numberLong) {
      return new Date(parseInt(dateObj.$numberLong, 10));
    }
  }
  // ObjectId: { $oid: "..." }
  if (obj.$oid && typeof obj.$oid === "string") {
    return obj.$oid;
  }
  // NumberInt
  if (obj.$numberInt && typeof obj.$numberInt === "string") {
    return parseInt(obj.$numberInt, 10);
  }
  // NumberLong
  if (obj.$numberLong && typeof obj.$numberLong === "string") {
    return parseInt(obj.$numberLong, 10);
  }

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = fromEJSON(v);
  }
  return result;
}

// ─── HTTP Client ───

function getBaseUrl(): string {
  return `https://${env.cloudbaseEnvId}.api.tcloudbasegateway.com`;
}

function getCollectionPath(collection: string): string {
  return `/v1/database/instances/(default)/databases/(default)/collections/${collection}`;
}

async function httpRequest<T>(
  method: string,
  path: string,
  payload: string,
  queryString = ""
): Promise<T> {
  if (!env.cloudbaseEnvId || !env.cloudbaseApiKey) {
    throw new Error(
      "CloudBase not configured. Set CLOUDBASE_ENV_ID and CLOUDBASE_API_KEY."
    );
  }

  const url = `${getBaseUrl()}${path}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.cloudbaseApiKey}`,
      "Content-Type": "application/json",
    },
    body: method !== "GET" ? payload : undefined,
  });

  const responseData = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorMsg =
      (responseData.message as string) ||
      (responseData.error as string) ||
      `HTTP ${response.status}`;
    throw new Error(`CloudBase API error: ${errorMsg}`);
  }

  return fromEJSON(responseData) as T;
}

// ─── Collection Management ───

export async function createCollection(collection: string): Promise<void> {
  const path = "/v1/database/instances/(default)/databases/(default)/collections";
  const payload = JSON.stringify({ collectionName: collection });

  try {
    await httpRequest<Record<string, unknown>>("POST", path, payload);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("DATABASE_COLLECTION_ALREADY_EXIST") || msg.includes("already exist")) {
      return;
    }
    throw err;
  }
}

// ─── Public Database API ───

export interface CloudBaseDoc {
  _id?: string;
  [key: string]: unknown;
}

export interface QueryResult {
  list: CloudBaseDoc[];
  offset: number;
  limit: number;
}

/** Query documents with optional filters */
export async function queryDocuments(
  collection: string,
  query: Record<string, unknown> = {},
  options: { offset?: number; limit?: number; order?: string; projection?: string } = {}
): Promise<CloudBaseDoc[]> {
  const path = `${getCollectionPath(collection)}/documents`;

  const params = new URLSearchParams();
  params.set("query", JSON.stringify(toEJSON(query)));
  if (options.offset !== undefined) params.set("offset", options.offset.toString());
  if (options.limit !== undefined) params.set("limit", options.limit.toString());
  if (options.order) params.set("order", options.order);
  if (options.projection) params.set("projection", options.projection);

  const result = await httpRequest<QueryResult>("GET", path, "", params.toString());
  return result.list || [];
}

/** Insert one or more documents */
export async function insertDocuments(
  collection: string,
  documents: Record<string, unknown>[]
): Promise<{ insertedIds: string[] }> {
  const path = `${getCollectionPath(collection)}/documents`;

  const payload = JSON.stringify({
    data: documents.map((d) => toEJSON(d)),
  });

  try {
    const result = await httpRequest<{ insertedIds?: string[] }>("POST", path, payload);
    return {
      insertedIds: (result.insertedIds || []) as string[],
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("DATABASE_COLLECTION_NOT_EXIST") || msg.includes("not exist")) {
      await createCollection(collection);
      const result = await httpRequest<{ insertedIds?: string[] }>("POST", path, payload);
      return {
        insertedIds: (result.insertedIds || []) as string[],
      };
    }
    throw err;
  }
}

/** Update documents matching query */
export async function updateDocuments(
  collection: string,
  query: Record<string, unknown>,
  update: Record<string, unknown>
): Promise<{ modified: number }> {
  const path = `${getCollectionPath(collection)}/documents`;

  const payload = JSON.stringify({
    query: toEJSON(query),
    data: toEJSON(update),
    multi: true,
  });

  const result = await httpRequest<{ updated?: number; matched?: number }>(
    "PATCH", path, payload
  );

  return { modified: result.updated ?? result.matched ?? 0 };
}

/** Get a single document by _id */
export async function getDocumentById(
  collection: string,
  id: string
): Promise<CloudBaseDoc | null> {
  const path = `${getCollectionPath(collection)}/documents/${id}`;

  try {
    const result = await httpRequest<CloudBaseDoc>("GET", path, "");
    return result;
  } catch (err) {
    if ((err as Error).message.includes("404") || (err as Error).message.includes("NOT_FOUND")) {
      return null;
    }
    throw err;
  }
}

/** Update a single document by _id */
export async function updateDocumentById(
  collection: string,
  id: string,
  update: Record<string, unknown>
): Promise<void> {
  const path = `${getCollectionPath(collection)}/documents/${id}`;

  const payload = JSON.stringify({ data: toEJSON(update) });

  await httpRequest<Record<string, unknown>>("PATCH", path, payload);
}
