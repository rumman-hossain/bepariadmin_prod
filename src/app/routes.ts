/**
 * Central route/menu registry — the single source of truth for navigation.
 *
 * Two things changed here beyond adding types.
 *
 * **Grouping.** Nineteen destinations sat in one flat list, ordered by no
 * principle anyone could name: Rewards, Coupons and Referrals were adjacent to
 * Manufacturing, and Payments was four items away from Accounting. A flat list
 * of nineteen is a directory, not navigation. They are now five groups.
 *
 * **Honesty about what exists.** Not every destination is built. The unbuilt
 * ones used to render a placeholder that looked like a real page, so the only
 * way to learn a section did nothing was to click it. `status` states it in the
 * nav itself:
 *
 *   - `live`    — built and connected.
 *   - `planned` — no screen. Nothing to show yet.
 *   - `inert`   — the backend has the tables and the endpoints, but nothing
 *                 invokes the logic behind them. This is the dangerous one: a
 *                 fraud screen showing zero flags reads as "no fraud detected"
 *                 when the truth is "detection is not running".
 *
 * Nothing is `inert` today — Reward Settings was the last one, and its points
 * are now actually awarded on delivery. The status is kept because the
 * condition recurs: any screen whose backend responds but whose logic nothing
 * invokes belongs here rather than in `live`.
 */

import type { StaffRole } from "@/src/auth/roles";
import { ADMIN_STAFF, ANY_STAFF, FINANCE, LOGISTICS, SUPPLIER_DESK } from "@/src/auth/roles";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Truck,
  FileText,
  Settings,
  DollarSign,
  Factory,
  Gift,
  Tag,
  Share2,
  MessageSquare,
  BarChart2,
  Brain,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export type RouteStatus = "live" | "planned" | "inert";

export interface Route {
  id: string;
  label: string;
  icon: LucideIcon;
  status: RouteStatus;
  /**
   * A destination that is REACHABLE but not listed in the rail.
   *
   * This concept was missing, and its absence was a bug rather than a gap:
   * `RouteGuard` resolves the first path segment against this registry and
   * shows "There is nothing here" when it finds nothing. So the registry is not
   * only the nav — it is the list of addresses that exist at all, and a screen
   * left out of it is unreachable however carefully it is wired into the
   * router.
   *
   * /profile is the case that found this. It belongs behind your name in the
   * header, not as a nineteenth entry in a rail of work; without a way to say
   * that, the choice was between cluttering the nav and a page nobody can open.
   */
  hidden?: boolean;
  /** Shown on the placeholder. Says what is missing, not merely that it is. */
  note?: string;
  /**
   * Who sees this in the nav. REQUIRED — there is no default.
   *
   * It used to be optional, and optional meant "everyone". That is fail-OPEN,
   * and it stops being harmless the moment a role exists that must see exactly
   * one destination: every screen built afterwards would be visible to the
   * shipping department unless somebody remembered to restrict it, and nobody
   * remembers forever.
   *
   * Required means a new entry cannot be added without saying who it is for.
   * `ADMIN_STAFF` is the answer for almost all of them; the department screens
   * say `LOGISTICS`. A test asserts every entry declares this, so the model
   * cannot quietly revert.
   *
   * This is NOT the security boundary — the backend middleware is, and this
   * file runs on the user's machine. What it buys is that nobody is shown a
   * destination that answers 403 the moment they arrive.
   */
  roles: readonly StaffRole[];
}

export interface RouteGroup {
  id: string;
  /** Omitted for a single flat list — a lone heading labels nothing. */
  label?: string;
  routes: Route[];
}

export const ROUTE_GROUPS: RouteGroup[] = [
  {
    id: "main",
    routes: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "retailers",
        label: "Retailers",
        icon: Users,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "wholesalers",
        label: "Suppliers",
        icon: ShoppingBag,
        status: "live",
        roles: SUPPLIER_DESK,
      },
      {
        id: "products",
        label: "Products",
        icon: ShoppingCart,
        status: "live",
        roles: SUPPLIER_DESK,
      },
      {
        id: "orders",
        label: "Orders",
        icon: FileText,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "messages",
        label: "Messages",
        icon: MessageSquare,
        status: "live",
        note: "The support queue is built. Message bodies live in Firestore and that connection is not wired yet.",
        roles: ADMIN_STAFF,
      },
      {
        id: "rewards",
        label: "Reward Settings",
        icon: Gift,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "coupons",
        label: "Coupon Settings",
        icon: Tag,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "referrals",
        label: "Referral Settings",
        icon: Share2,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "manufacturing",
        label: "Manufacturing",
        icon: Factory,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "payments",
        label: "Payments",
        icon: CreditCard,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "accounting",
        label: "Accounting",
        icon: DollarSign,
        status: "live",
        // Every /accounting endpoint is FinanceOnly on the server: the ledger
        // exposes margin, salaries and supplier terms, so reading it is as
        // restricted as writing it. `admin` is deliberately not on this list.
        roles: FINANCE,
      },
      {
        id: "logistics",
        label: "Logistics",
        icon: Truck,
        status: "live",
        // The one entry the shipping department can see. Everything else in
        // this registry is ADMIN_STAFF, so a `logistics` account finds exactly
        // one destination in the rail.
        roles: LOGISTICS,
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: BarChart2,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        status: "live",
        roles: ADMIN_STAFF,
      },
      {
        id: "sales-brain",
        label: "Sales Brain",
        icon: Brain,
        status: "live",
        note: 'Segments are computed from delivered orders. "Browsing not buying" is absent — nothing records product views.',
        roles: ADMIN_STAFF,
      },
    ],
  },

  /*
   * REACHABLE, BUT NOT IN THE RAIL.
   *
   * A group of its own rather than an entry tacked onto another, so nothing
   * about it can be mistaken for navigation. Every route here is `hidden`, and
   * the Sidebar drops them.
   *
   * They still have to be REGISTERED, because RouteGuard treats this file as
   * the list of addresses that exist — a screen missing from it answers "There
   * is nothing here" no matter how it is wired into the router. That is exactly
   * what /profile did on dev before this group existed.
   */
  {
    id: "personal",
    label: "Personal",
    routes: [
      {
        id: "profile",
        label: "Your profile",
        icon: UserCircle,
        status: "live",
        hidden: true,
        /*
         * ANY_STAFF, not ADMIN_STAFF. Every signed-in person has a profile,
         * including the two department roles that can see almost nothing else —
         * and a logistics account being unable to open its own details, or
         * change its own password, would be a strange thing to ship.
         */
        roles: ANY_STAFF,
      },
    ],
  },
];

/** Flat list, for the router and anything that iterates every route. */
export const ROUTES: Route[] = ROUTE_GROUPS.flatMap((group) => group.routes);

export function findRoute(id: string): Route | undefined {
  return ROUTES.find((route) => route.id === id);
}
