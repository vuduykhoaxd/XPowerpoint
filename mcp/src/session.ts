import { randomBytes } from "node:crypto";
import type { DeckSession, DeckSpec } from "./types.js";
import { defaultSpec } from "./tokens.js";
import { XPError } from "./errors.js";

const clone = (v: any) => JSON.parse(JSON.stringify(v));

export class SessionStore {
  decks = new Map<string, DeckSession>();
  latestId: string | null = null;

  create(spec?: Partial<DeckSpec>, title = "Untitled", brief?: any, style?: string): DeckSession {
    const id = "d_" + randomBytes(6).toString("hex");
    const now = new Date().toISOString();
    const deck = spec && spec.slides ? ({ ...(defaultSpec(title, brief, style)), ...spec } as DeckSpec) : defaultSpec(title, brief, style);
    deck.slides ??= [];
    const session: DeckSession = {
      id, spec: deck, undo: [], redo: [], dirty: true, createdAt: now, updatedAt: now, warnings: [],
    };
    this.decks.set(id, session);
    this.latestId = id;
    return session;
  }

  open(spec: DeckSpec, filePath?: string): DeckSession {
    const s = this.create(spec, spec.meta?.title);
    s.filePath = filePath;
    s.dirty = false;
    return s;
  }

  get(id?: string): DeckSession {
    const key = id || this.latestId;
    const deck = key ? this.decks.get(key) : undefined;
    if (!deck) throw new XPError("E_NOT_FOUND", id ? `deckId not found: ${id}` : "No active deck. Call deck_new first.");
    return deck;
  }

  list() {
    return [...this.decks.values()].map((s) => ({
      deckId: s.id, title: s.spec.meta?.title, slides: s.spec.slides.length,
      filePath: s.filePath, dirty: s.dirty, updatedAt: s.updatedAt,
    }));
  }

  snapshot(session: DeckSession) {
    session.undo.push(JSON.stringify(session.spec));
    if (session.undo.length > 50) session.undo.shift();
    session.redo = [];
  }

  touch(session: DeckSession) {
    session.dirty = true;
    session.updatedAt = new Date().toISOString();
    session.spec.updatedAt = session.updatedAt;
  }

  mutate<T>(session: DeckSession, fn: () => T): T {
    this.snapshot(session);
    const result = fn();
    this.touch(session);
    return result;
  }

  undo(session: DeckSession, steps = 1) {
    for (let i = 0; i < steps; i++) {
      const prev = session.undo.pop();
      if (!prev) throw new XPError("E_INVALID_INPUT", "Nothing to undo");
      session.redo.push(JSON.stringify(session.spec));
      session.spec = JSON.parse(prev);
    }
    this.touch(session);
    return session.spec;
  }

  redo(session: DeckSession, steps = 1) {
    for (let i = 0; i < steps; i++) {
      const next = session.redo.pop();
      if (!next) throw new XPError("E_INVALID_INPUT", "Nothing to redo");
      session.undo.push(JSON.stringify(session.spec));
      session.spec = JSON.parse(next);
    }
    this.touch(session);
    return session.spec;
  }

  close(id?: string) {
    const s = this.get(id);
    this.decks.delete(s.id);
    if (this.latestId === s.id) this.latestId = [...this.decks.keys()].pop() ?? null;
    return s;
  }

  cloneSpec(session: DeckSession) {
    return clone(session.spec);
  }
}

export const sessions = new SessionStore();
