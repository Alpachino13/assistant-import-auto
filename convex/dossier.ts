import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export const listDocs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query('dossierDocs')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});

export const saveDoc = mutation({
  args: {
    docId: v.string(),
    fileName: v.string(),
    status: v.union(v.literal('ok'), v.literal('error')),
    error: v.optional(v.string()),
    docType: v.string(),
    confidence: v.string(),
    summary: v.string(),
    fields: v.any(),
    issues: v.array(v.string()),
    storageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Le fichier lié doit appartenir à l'utilisateur
    if (args.storageId) {
      const storageId = args.storageId;
      const file = await ctx.db
        .query('files')
        .withIndex('by_storageId', (q) => q.eq('storageId', storageId))
        .first();
      if (!file || file.userId !== userId) throw new Error('Forbidden');
    }

    const existing = await ctx.db
      .query('dossierDocs')
      .withIndex('by_docId', (q) => q.eq('docId', args.docId))
      .first();
    if (existing && existing.userId !== userId) throw new Error('Forbidden');

    const now = Date.now();
    const data = {
      fileName: args.fileName,
      status: args.status,
      error: args.error,
      docType: args.docType,
      confidence: args.confidence,
      summary: args.summary,
      fields: args.fields,
      issues: args.issues,
      storageId: args.storageId,
      addedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert('dossierDocs', { ...data, docId: args.docId, userId });
  },
});

export const removeDoc = mutation({
  args: { docId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db
      .query('dossierDocs')
      .withIndex('by_docId', (q) => q.eq('docId', args.docId))
      .first();
    if (!doc) return;
    if (doc.userId !== userId) throw new Error('Forbidden');

    if (doc.storageId) await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(doc._id);
  },
});

export const clearDocs = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const docs = await ctx.db
      .query('dossierDocs')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    for (const d of docs) {
      if (d.storageId) await ctx.storage.delete(d.storageId);
      await ctx.db.delete(d._id);
    }
  },
});