'use client';

import type { Id } from '@/convex/_generated/dataModel';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const isConvexActive = Boolean(convexUrl && /^https?:\/\//i.test(convexUrl));

// Mutations Convex authentifiées (useMutation) passées par le composant appelant
export type UploadMutations = {
  generateUploadUrl: () => Promise<string>;
  saveFile: (args: {
    storageId: Id<'_storage'>;
    fileName: string;
    fileType: string;
    fileSize: number;
    category?: string;
    docType?: string;
  }) => Promise<unknown>;
};

/**
 * Envoie un fichier vers le stockage Convex puis enregistre sa fiche, au nom de l'utilisateur connecté.
 */
export async function uploadStockFileToConvex(
  file: File,
  mutations: UploadMutations,
  category: string = 'stock_files'
): Promise<{ storageId?: string; success: boolean }> {
  try {
    const uploadUrl = await mutations.generateUploadUrl();

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!uploadRes.ok) return { success: false };
    const { storageId } = (await uploadRes.json()) as { storageId: Id<'_storage'> };

    await mutations.saveFile({
      storageId,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      category,
    });

    return { storageId, success: true };
  } catch (err) {
    console.warn('Convex file upload failed:', err);
    return { success: false };
  }
}