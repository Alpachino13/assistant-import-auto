import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

const MAX_CONVERSATIONS = 50;

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// Retourne la conversation si elle existe ; refuse si elle appartient à quelqu'un d'autre.
async function getOwnedConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: string,
  userId: Id<'users'>
) {
  const conv = await ctx.db
    .query('conversations')
    .withIndex('by_conversationId', (q) => q.eq('conversationId', conversationId))
    .first();
  if (conv && conv.userId !== userId) throw new Error('Forbidden');
  return conv;
}

// Conversations de l'utilisateur connecté, avec leurs messages (même forme que le type Conversation côté React)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const convs = await ctx.db
      .query('conversations')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(MAX_CONVERSATIONS);

    return await Promise.all(
      convs.map(async (c) => {
        const msgs = await ctx.db
          .query('messages')
          .withIndex('by_conversationId', (q) => q.eq('conversationId', c.conversationId))
          .order('asc')
          .collect();
        return {
          id: c.conversationId,
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messages: msgs.map((m) => ({
            id: m.messageId,
            role: m.role,
            text: m.text,
            error: m.error,
            attachments: m.attachments?.map((a) => ({ name: a.name })),
          })),
        };
      })
    );
  },
});

export const getMessages = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const conv = await getOwnedConversation(ctx, args.conversationId, userId);
    if (!conv) return [];
    return await ctx.db
      .query('messages')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();
  },
});

// Crée la conversation si besoin (le titre n'est défini qu'à la création), sinon met à jour la date
export const saveConversation = mutation({
  args: { conversationId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await getOwnedConversation(ctx, args.conversationId, userId);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert('conversations', {
      conversationId: args.conversationId,
      title: args.title,
      userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Ajoute un message ; crée la conversation si elle n'existe pas encore. Idempotent sur messageId.
export const addMessage = mutation({
  args: {
    messageId: v.string(),
    conversationId: v.string(),
    role: v.union(v.literal('user'), v.literal('ai')),
    text: v.string(),
    title: v.optional(v.string()),
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
    const userId = await requireUserId(ctx);
    const now = Date.now();

    const conv = await getOwnedConversation(ctx, args.conversationId, userId);
    if (conv) {
      await ctx.db.patch(conv._id, { updatedAt: now });
    } else {
      await ctx.db.insert('conversations', {
        conversationId: args.conversationId,
        title: args.title ?? 'Nouvelle conversation',
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const duplicate = await ctx.db
      .query('messages')
      .withIndex('by_messageId', (q) => q.eq('messageId', args.messageId))
      .first();
    if (duplicate) return;

    await ctx.db.insert('messages', {
      messageId: args.messageId,
      conversationId: args.conversationId,
      role: args.role,
      text: args.text,
      attachments: args.attachments,
      error: args.error,
      createdAt: now,
    });
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const conv = await getOwnedConversation(ctx, args.conversationId, userId);
    if (!conv) return;

    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', args.conversationId))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(conv._id);
  },
});

// Supprime toutes les conversations de l'utilisateur connecté (et seulement les siennes)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const convs = await ctx.db
      .query('conversations')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    for (const conv of convs) {
      const msgs = await ctx.db
        .query('messages')
        .withIndex('by_conversationId', (q) => q.eq('conversationId', conv.conversationId))
        .collect();
      for (const m of msgs) await ctx.db.delete(m._id);
      await ctx.db.delete(conv._id);
    }
  },
});
