import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Get user profile by username
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first();
  },
});

// Login or register user
export const loginOrRegister = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    localAiUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email || existing.email,
        avatarUrl: args.avatarUrl || existing.avatarUrl,
        localAiUrl: args.localAiUrl ?? existing.localAiUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      username: args.username,
      email: args.email || `${args.username.toLowerCase()}@buildhub.ai`,
      avatarUrl:
        args.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      localAiUrl: args.localAiUrl || 'http://100.85.73.32:11434',
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update profile details
export const updateProfile = mutation({
  args: {
    oldUsername: v.string(),
    newUsername: v.string(),
    email: v.string(),
    avatarUrl: v.string(),
    localAiUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.oldUsername))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.newUsername,
        email: args.email,
        avatarUrl: args.avatarUrl,
        localAiUrl: args.localAiUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      username: args.newUsername,
      email: args.email,
      avatarUrl: args.avatarUrl,
      localAiUrl: args.localAiUrl || 'http://100.85.73.32:11434',
      createdAt: now,
      updatedAt: now,
    });
  },
});
