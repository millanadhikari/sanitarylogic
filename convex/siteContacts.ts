import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireSiteAccess,
  requireSiteContactManagementAccess,
} from "./lib/authorization";

const contactFields = {
  name: v.string(),
  jobTitle: v.optional(v.string()),
  organisation: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  notes: v.optional(v.string()),
};

const optional = (value?: string) => value?.trim() || undefined;

function cleanContact(args: {
  name: string;
  jobTitle?: string;
  organisation?: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  const name = args.name.trim();
  const email = optional(args.email)?.toLowerCase();
  if (!name) throw new Error("Contact name is required");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  return {
    name,
    jobTitle: optional(args.jobTitle),
    organisation: optional(args.organisation),
    email,
    phone: optional(args.phone),
    notes: optional(args.notes),
  };
}

export const list = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const contacts = await ctx.db
      .query("siteContacts")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .take(500);
    return {
      contacts: contacts
        .filter((contact) => !contact.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name)),
      canManage:
        access.role === "SUPER_ADMIN" ||
        access.role === "AREA_MANAGER" ||
        access.role === "SITE_MANAGER",
    };
  },
});

export const create = mutation({
  args: { siteId: v.id("sites"), ...contactFields },
  returns: v.id("siteContacts"),
  handler: async (ctx, args) => {
    const access = await requireSiteContactManagementAccess(ctx, args.siteId);
    const { siteId, ...input } = args;
    const now = Date.now();
    return await ctx.db.insert("siteContacts", {
      companyId: access.site.companyId,
      siteId,
      ...cleanContact(input),
      createdBy: access.user._id,
      updatedBy: access.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { contactId: v.id("siteContacts"), ...contactFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.deletedAt) throw new Error("Contact not found");
    const access = await requireSiteContactManagementAccess(ctx, contact.siteId);
    const { contactId, ...input } = args;
    await ctx.db.patch(contactId, {
      ...cleanContact(input),
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { contactId: v.id("siteContacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.deletedAt) throw new Error("Contact not found");
    const access = await requireSiteContactManagementAccess(ctx, contact.siteId);
    const now = Date.now();
    await ctx.db.patch(contact._id, {
      deletedAt: now,
      updatedBy: access.user._id,
      updatedAt: now,
    });
    return null;
  },
});
