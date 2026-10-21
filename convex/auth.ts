import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import { ConvexError } from 'convex/values';
import type { DataModel } from './_generated/dataModel';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // Appelé uniquement à l'inscription : définit les champs de la ligne "users".
      profile(params) {
        const email = String(params.email ?? '').trim().toLowerCase();
        if (!email.includes('@')) throw new ConvexError('Invalid email');

        const username = String(params.username ?? '').trim() || email.split('@')[0];
        const now = Date.now();

        return {
          email,
          username: username.slice(0, 40),
          avatarUrl: DEFAULT_AVATAR,
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
});
