import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  // Tables internes de Convex Auth (authAccounts, authSessions, ...)
  ...authTables,

  // Remplace la table "users" par défaut : champs Convex Auth + profil BuildHub
  users: defineTable({
    // Champs attendus par Convex Auth (tous optionnels)
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Profil BuildHub
    username: v.string(),
    email: v.string(),
    avatarUrl: v.string(),
    localAiUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_username', ['username'])
    .index('by_email', ['email']),

  conversations: defineTable({
    conversationId: v.string(),
    title: v.string(),
    userId: v.optional(v.id('users')), // propriétaire (auth)
    username: v.optional(v.string()), // ancien champ, conservé pour les anciennes données
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_conversationId', ['conversationId'])
    .index('by_userId', ['userId'])
    .index('by_username', ['username']),

  messages: defineTable({
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
    createdAt: v.number(),
  })
    .index('by_conversationId', ['conversationId'])
    .index('by_messageId', ['messageId']),

  files: defineTable({
    storageId: v.id('_storage'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    url: v.optional(v.string()),
    username: v.optional(v.string()),
    category: v.optional(v.string()),
    docType: v.optional(v.string()),
    uploadedAt: v.number(),
    userId: v.optional(v.id('users')), // propriétaire (auth) ; "username" = anciennes données
  })
    .index('by_username', ['username'])
    .index('by_userId', ['userId'])
    .index('by_storageId', ['storageId']),

  dossierDocs: defineTable({
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
    addedAt: v.number(),
    userId: v.optional(v.id('users')), // propriétaire (auth) ; "username" = anciennes données
  })
    .index('by_username', ['username'])
    .index('by_userId', ['userId'])
    .index('by_docId', ['docId']),
});