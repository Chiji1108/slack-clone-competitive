/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as authFunctions from "../authFunctions.js";
import type * as channelFunctions from "../channelFunctions.js";
import type * as http from "../http.js";
import type * as messageFunctions from "../messageFunctions.js";
import type * as myFunctions from "../myFunctions.js";
import type * as workspaceFunctions from "../workspaceFunctions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authFunctions: typeof authFunctions;
  channelFunctions: typeof channelFunctions;
  http: typeof http;
  messageFunctions: typeof messageFunctions;
  myFunctions: typeof myFunctions;
  workspaceFunctions: typeof workspaceFunctions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
