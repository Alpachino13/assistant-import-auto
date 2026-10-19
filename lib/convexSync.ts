'use client';

import type { UserProfile } from '@/components/ProfileModal';
import type { AnalyzedDoc, Conversation, Message } from './types';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const isConvexActive = Boolean(convexUrl && /^https?:\/\//i.test(convexUrl));

/**
 * Upload a stock file (drawing, blueprint, document) to Convex storage
 */
export async function uploadStockFileToConvex(
  file: File,
  username?: string,
  category: string = 'stock_files'
): Promise<{ storageId?: string; url?: string; success: boolean }> {
  if (!isConvexActive || !convexUrl) {
    return { success: false };
  }

  try {
    // 1. Get upload URL from Convex
    const genUrlRes = await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'files:generateUploadUrl',
        args: {},
      }),
    });

    if (!genUrlRes.ok) return { success: false };
    const { value: uploadUrl } = await genUrlRes.json();

    // 2. Post file binary to Convex storage
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    if (!uploadRes.ok) return { success: false };
    const { storageId } = await uploadRes.json();

    // 3. Save file metadata to files table
    await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'files:saveFile',
        args: {
          storageId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          username: username || 'Alex',
          category,
        },
      }),
    });

    return { storageId, success: true };
  } catch (err) {
    console.warn('Convex file upload sync fallback:', err);
    return { success: false };
  }
}

/**
 * Sync user profile & login to Convex database
 */
export async function syncUserToConvex(profile: UserProfile): Promise<boolean> {
  if (!isConvexActive || !convexUrl) return false;
  try {
    await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'users:loginOrRegister',
        args: {
          username: profile.username,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          localAiUrl: profile.localAiUrl,
        },
      }),
    });
    return true;
  } catch (e) {
    console.warn('Convex user sync error:', e);
    return false;
  }
}

/**
 * Sync conversation to Convex
 */
export async function syncConversationToConvex(conv: Conversation, username?: string): Promise<boolean> {
  if (!isConvexActive || !convexUrl) return false;
  try {
    await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'conversations:saveConversation',
        args: {
          conversationId: conv.id,
          title: conv.title,
          username: username || 'Alex',
        },
      }),
    });
    return true;
  } catch (e) {
    console.warn('Convex conversation sync error:', e);
    return false;
  }
}

/**
 * Sync message to Convex
 */
export async function syncMessageToConvex(convId: string, msg: Message): Promise<boolean> {
  if (!isConvexActive || !convexUrl) return false;
  try {
    await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'conversations:addMessage',
        args: {
          messageId: msg.id,
          conversationId: convId,
          role: msg.role,
          text: msg.text,
          error: msg.error,
          attachments: msg.attachments?.map((a) => ({ name: a.name })),
        },
      }),
    });
    return true;
  } catch (e) {
    console.warn('Convex message sync error:', e);
    return false;
  }
}
