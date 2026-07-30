import Link from "next/link";
import { ContextSelector } from "@/components/context-selector";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { PurchaseInvoiceForm } from "@/components/purchase-invoice-form";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function NewPurchasePage() { return <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100"><aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex"><div className="mb-10 flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div><div><p className="font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div></div><SidebarNavigation active="Operaciones" /></aside><section className="lg:pl-64"><header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-10"><div className="flex items-center gap-2"><Link className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden" href="/">PX</Link><ContextSelector mobile /><MobileSearch /><ContextSelector /></div><div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="hidden sm:block"><ThemeToggle /></div><UserMenu /></div></header><PurchaseInvoiceForm /></section></main>; }
