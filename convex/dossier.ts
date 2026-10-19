import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// List analyzed dossier docs
export const listDocs = query({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.username) {
      return await ctx.db
        .query('dossierDocs')
        .withIndex('by_username', (q) => q.eq('username', args.username))
        .order('desc')
        .collect();
    }
    return await ctx.db.query('dossierDocs').order('desc').collect();
  },
});

// Save an analyzed doc
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
    username: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('dossierDocs')
      .withIndex('by_docId', (q) => q.eq('docId', args.docId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        error: args.error,
        docType: args.docType,
        confidence: args.confidence,
        summary: args.summary,
        fields: args.fields,
        issues: args.issues,
        addedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('dossierDocs', {
      ...args,
      addedAt: now,
    });
  },
});

// Remove an analyzed doc
export const removeDoc = mutation({
  args: { docId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('dossierDocs')
      .withIndex('by_docId', (q) => q.eq('docId', args.docId))
      .first();

    if (doc) {
      if (doc.storageId) {
        await ctx.storage.delete(doc.storageId);
      }
      await ctx.db.delete(doc._id);
    }
  },
});

// Clear all docs for user
export const clearDocs = mutation({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const docs = args.username
      ? await ctx.db
          .query('dossierDocs')
          .withIndex('by_username', (q) => q.eq('username', args.username))
          .collect()
      : await ctx.db.query('dossierDocs').collect();

    for (const d of docs) {
      if (d.storageId) {
        await ctx.storage.delete(d.storageId);
      }
      await ctx.db.delete(d._id);
    }
  },
});
