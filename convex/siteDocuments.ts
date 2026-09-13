import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireSiteAccess,
  requireSiteDocumentManagementAccess,
} from "./lib/authorization";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
]);

function optional(value?: string) {
  return value?.trim() || undefined;
}

function validateFileName(fileName: string) {
  const cleanFileName = fileName.trim();
  const extension = cleanFileName.split(".").pop()?.toLowerCase();
  if (!cleanFileName || !extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Upload a PDF, Word, Excel, CSV or text document");
  }
  return cleanFileName;
}

export const list = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const documents = await ctx.db
      .query("siteDocuments")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(500);

    return {
      documents: await Promise.all(
        documents.map(async ({ storageId, ...document }) => ({
          ...document,
          url: await ctx.storage.getUrl(storageId),
        })),
      ),
      canManage:
        access.role === "SUPER_ADMIN" ||
        access.role === "AREA_MANAGER" ||
        access.role === "SITE_MANAGER",
    };
  },
});

export const generateUploadUrl = mutation({
  args: { siteId: v.id("sites") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireSiteDocumentManagementAccess(ctx, args.siteId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    siteId: v.id("sites"),
    storageId: v.id("_storage"),
    title: v.string(),
    description: v.optional(v.string()),
    fileName: v.string(),
  },
  returns: v.id("siteDocuments"),
  handler: async (ctx, args) => {
    const access = await requireSiteDocumentManagementAccess(ctx, args.siteId);
    const title = args.title.trim();
    const fileName = validateFileName(args.fileName);
    if (!title) throw new Error("Document title is required");

    const storedFile = await ctx.db.system.get("_storage", args.storageId);
    if (!storedFile) throw new Error("Uploaded file was not found");
    if (storedFile.size > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Documents must be 20 MB or smaller");
    }

    return await ctx.db.insert("siteDocuments", {
      companyId: access.site.companyId,
      siteId: args.siteId,
      title,
      description: optional(args.description),
      storageId: args.storageId,
      fileName,
      contentType: storedFile.contentType,
      fileSize: storedFile.size,
      uploadedBy: access.user._id,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { documentId: v.id("siteDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    await requireSiteDocumentManagementAccess(ctx, document.siteId);
    await ctx.storage.delete(document.storageId);
    await ctx.db.delete(document._id);
    return null;
  },
});
