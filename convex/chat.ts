import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// List conversations for a user
export const list = query({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query('conversations');
    if (args.username) {
      return await q
        .withIndex('by_username', (query) => query.eq('username', args.username))
        .order('desc')
        .collect();
    }
    return await q.order('desc').collect();
  },
});

// Get messages for a conversation
export const getMessages = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();
  },
});

// Save or update conversation metadata
export const saveConversation = mutation({
  args: {
    conversationId: v.string(),
    title: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('conversations', {
      conversationId: args.conversationId,
      title: args.title,
      username: args.username,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Add message to conversation
export const addMessage = mutation({
  args: {
    messageId: v.string(),
    conversationId: v.string(),
    role: v.union(v.literal('user'), v.literal('ai')),
    text: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          storageId: v.optional(v.id('_storage')),
          url: v.optional(v.string()),
        })
      )
    ),
    error: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert('messages', {
      messageId: args.messageId,
      conversationId: args.conversationId,
      role: args.role,
      text: args.text,
      attachments: args.attachments,
      error: args.error,
      createdAt: now,
    });

    const conv = await ctx.db
      .query('conversations')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .first();

    if (conv) {
      await ctx.db.patch(conv._id, { updatedAt: now });
    }
  },
});

// Delete conversation
export const deleteConversation = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db
      .query('conversations')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .first();

    if (conv) {
      await ctx.db.delete(conv._id);
    }

    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .collect();

    for (const msg of msgs) {
      await ctx.db.delete(msg._id);
    }
  },
});

// Clear all conversations for a user
export const clearAll = mutation({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const convs = args.username
      ? await ctx.db
          .query('conversations')
          .withIndex('by_username', (q) => q.eq('username', args.username))
          .collect()
      : await ctx.db.query('conversations').collect();

    for (const conv of convs) {
      const msgs = await ctx.db
        .query('messages')
        .withIndex('by_conversationId', (q) => q.eq('conversationId', conv.conversationId))
        .collect();
      for (const m of msgs) {
        await ctx.db.delete(m._id);
      }
      await ctx.db.delete(conv._id);
    }
  },
});
