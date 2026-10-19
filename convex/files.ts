import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Generate an authorized upload URL for Convex file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save file record after upload to storage
export const saveFile = mutation({
  args: {
    storageId: v.id('_storage'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    username: v.optional(v.string()),
    category: v.optional(v.string()),
    docType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return await ctx.db.insert('files', {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      url: url ?? undefined,
      username: args.username,
      category: args.category || 'dossier',
      docType: args.docType,
      uploadedAt: Date.now(),
    });
  },
});

// List all stocked files (optionally filtered by user)
export const listFiles = query({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let files;
    if (args.username) {
      files = await ctx.db
        .query('files')
        .withIndex('by_username', (q) => q.eq('username', args.username))
        .order('desc')
        .collect();
    } else {
      files = await ctx.db.query('files').order('desc').collect();
    }

    // Refresh public storage URLs
    return await Promise.all(
      files.map(async (f) => ({
        ...f,
        url: (await ctx.storage.getUrl(f.storageId)) ?? f.url,
      }))
    );
  },
});

// Delete a stocked file from database and Convex storage
export const deleteFile = mutation({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (file) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(args.id);
    }
  },
});
