import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// URL d'upload : réservée aux utilisateurs connectés
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Enregistre le fichier envoyé, rattaché à l'utilisateur connecté
export const saveFile = mutation({
  args: {
    storageId: v.id('_storage'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    category: v.optional(v.string()),
    docType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Empêche de "réclamer" un fichier déjà enregistré par quelqu'un d'autre
    const already = await ctx.db
      .query('files')
      .withIndex('by_storageId', (q) => q.eq('storageId', args.storageId))
      .first();
    if (already) {
      if (already.userId !== userId) throw new Error('Forbidden');
      return already._id;
    }

    const url = await ctx.storage.getUrl(args.storageId);
    return await ctx.db.insert('files', {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      url: url ?? undefined,
      userId,
      category: args.category || 'dossier',
      docType: args.docType,
      uploadedAt: Date.now(),
    });
  },
});

// Fichiers de l'utilisateur connecté uniquement
export const listFiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const files = await ctx.db
      .query('files')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();

    return await Promise.all(
      files.map(async (f) => ({
        ...f,
        url: (await ctx.storage.getUrl(f.storageId)) ?? f.url,
      }))
    );
  },
});

export const deleteFile = mutation({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const file = await ctx.db.get(args.id);
    if (!file) return;
    if (file.userId !== userId) throw new Error('Forbidden');

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.id);
  },
});