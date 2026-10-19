import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Users table (Login, customization & profile)
  users: defineTable({
    username: v.string(),
    email: v.string(),
    avatarUrl: v.string(),
    localAiUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_username', ['username'])
    .index('by_email', ['email']),

  // Conversations table (Chat history)
  conversations: defineTable({
    conversationId: v.string(),
    title: v.string(),
    username: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_conversationId', ['conversationId'])
    .index('by_username', ['username']),

  // Messages table
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

  // Files table (Stock files, drawings, documents, blueprints)
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
  })
    .index('by_username', ['username'])
    .index('by_storageId', ['storageId']),

  // Dossier Analyzed Docs table
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
  })
    .index('by_username', ['username'])
    .index('by_docId', ['docId']),
});
