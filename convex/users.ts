import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

// Profil de l'utilisateur connecté (null si non connecté)
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      localAiUrl: user.localAiUrl,
    };
  },
});

// Met à jour le profil de l'utilisateur connecté (l'e-mail est l'identifiant de connexion : non modifiable ici)
export const updateProfile = mutation({
  args: {
    username: v.string(),
    avatarUrl: v.string(),
    localAiUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const username = args.username.trim();
    if (username.length < 1 || username.length > 40) throw new Error('Invalid username');
    if (!/^https?:\/\//i.test(args.avatarUrl)) throw new Error('Invalid avatar URL');

    await ctx.db.patch(userId, {
      username,
      avatarUrl: args.avatarUrl,
      ...(args.localAiUrl !== undefined ? { localAiUrl: args.localAiUrl } : {}),
      updatedAt: Date.now(),
    });
  },
});