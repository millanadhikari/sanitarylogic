/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as areas from "../areas.js";
import type * as assets from "../assets.js";
import type * as authTest from "../authTest.js";
import type * as companies from "../companies.js";
import type * as complaintComments from "../complaintComments.js";
import type * as complaints from "../complaints.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lib_assetDueDates from "../lib/assetDueDates.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_periodicPlanner from "../lib/periodicPlanner.js";
import type * as lib_specialTenancyScope from "../lib/specialTenancyScope.js";
import type * as lib_standardTenancyScope from "../lib/standardTenancyScope.js";
import type * as myAccess from "../myAccess.js";
import type * as periodicPlanner from "../periodicPlanner.js";
import type * as siteScope from "../siteScope.js";
import type * as sites from "../sites.js";
import type * as sitesAssignments from "../sitesAssignments.js";
import type * as specialTenancyScope from "../specialTenancyScope.js";
import type * as team from "../team.js";
import type * as tenancies from "../tenancies.js";
import type * as users from "../users.js";
import type * as workOrders from "../workOrders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  areas: typeof areas;
  assets: typeof assets;
  authTest: typeof authTest;
  companies: typeof companies;
  complaintComments: typeof complaintComments;
  complaints: typeof complaints;
  dashboard: typeof dashboard;
  http: typeof http;
  invitations: typeof invitations;
  "lib/assetDueDates": typeof lib_assetDueDates;
  "lib/auth": typeof lib_auth;
  "lib/authorization": typeof lib_authorization;
  "lib/periodicPlanner": typeof lib_periodicPlanner;
  "lib/specialTenancyScope": typeof lib_specialTenancyScope;
  "lib/standardTenancyScope": typeof lib_standardTenancyScope;
  myAccess: typeof myAccess;
  periodicPlanner: typeof periodicPlanner;
  siteScope: typeof siteScope;
  sites: typeof sites;
  sitesAssignments: typeof sitesAssignments;
  specialTenancyScope: typeof specialTenancyScope;
  team: typeof team;
  tenancies: typeof tenancies;
  users: typeof users;
  workOrders: typeof workOrders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
