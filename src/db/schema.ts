import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

// ── Users (Autentikasi) ───────────────────────────
// role: 'admin' | 'kasir'
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  username: text("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { length: 20 }).default("kasir").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Kategori Produk ───────────────────────────────
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  icon: text("icon", { length: 50 }).default("package"),
  color: text("color", { length: 20 }).default("#6366f1"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Produk ────────────────────────────────────────
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  barcode: text("barcode", { length: 50 }),
  categoryId: integer("category_id").references(() => categories.id),
  buyPrice: real("buy_price").notNull().default(0),
  sellPrice: real("sell_price").notNull(),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  unit: text("unit", { length: 20 }).default("pcs"),
  image: text("image"), // base64 data URL atau URL gambar produk
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Kategori Layanan BRILink ──────────────────────
export const serviceCategories = sqliteTable("service_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  icon: text("icon", { length: 50 }).default("credit-card"),
  color: text("color", { length: 20 }).default("#0ea5e9"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Layanan BRILink ───────────────────────────────
// cashEffect & bankEffect: 'in' = masuk, 'out' = keluar, 'none' = tidak ada efek
// flowType: 'cash_withdrawal' | 'cash_deposit' | 'transfer' | 'payment' | 'topup' | 'inquiry'
//   - Explicit flow type for UI/UX behavior (S-04). No longer inferred from name.
// defaultFeeMethod: 'cash' | 'deducted' | 'charged' — default fee method for this service
export const brilinkServices = sqliteTable("brilink_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  categoryId: integer("category_id").references(() => serviceCategories.id),
  icon: text("icon", { length: 50 }).default("credit-card"),
  adminFee: real("admin_fee").notNull().default(0),
  agentFee: real("agent_fee").notNull().default(0),
  useTieredFee: integer("use_tiered_fee", { mode: "boolean" }).default(false).notNull(),
  cashEffect: text("cash_effect", { length: 10 }).default("in").notNull(),
  bankEffect: text("bank_effect", { length: 10 }).default("out").notNull(),
  // S-04: explicit flow type (no longer inferred from name)
  flowType: text("flow_type", { length: 30 }).default("payment").notNull(),
  // S-04: default fee method for this service
  defaultFeeMethod: text("default_fee_method", { length: 20 }).default("cash").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Fee Tiers (Biaya Admin Berjenjang) ────────────
export const feeTiers = sqliteTable("fee_tiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").references(() => brilinkServices.id).notNull(),
  minAmount: real("min_amount").notNull(),
  maxAmount: real("max_amount"),
  adminFee: real("admin_fee").notNull(),
  agentFee: real("agent_fee").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Transaksi ─────────────────────────────────────
// S-05: Structured audit fields for financial integrity.
// flowType, feeMethod, cashReceived, cashDispensed stored explicitly
// (not in notes text). status tracks provider confirmation lifecycle.
// referenceNo for external provider reference.
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNo: text("invoice_no", { length: 50 }).notNull(),
  type: text("type", { length: 20 }).notNull(),
  subType: text("sub_type", { length: 50 }),
  customerName: text("customer_name", { length: 255 }),
  customerPhone: text("customer_phone", { length: 50 }),
  totalAmount: real("total_amount").notNull(),
  adminFee: real("admin_fee").default(0),
  profit: real("profit").default(0),
  paymentMethod: text("payment_method", { length: 30 }).default("cash"),
  notes: text("notes"),
  // S-05: Structured audit fields
  flowType: text("flow_type", { length: 30 }),
  feeMethod: text("fee_method", { length: 20 }),
  cashReceived: real("cash_received").default(0),
  cashDispensed: real("cash_dispensed").default(0),
  settlementAccountId: integer("settlement_account_id"),
  referenceNo: text("reference_no", { length: 100 }),
  // S-07: status tracks provider confirmation lifecycle
  // 'draft' = pencatatan awal, 'pending' = menunggu konfirmasi provider,
  // 'completed' = dikonfirmasi sukses, 'void' = dibatalkan, 'reversed' = di-reverse
  status: text("status", { length: 20 }).default("completed").notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
  confirmedByUserId: integer("confirmed_by_user_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Item Transaksi ────────────────────────────────
export const transactionItems = sqliteTable("transaction_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  subtotal: real("subtotal").notNull(),
});

// ── Denominasi Uang (S-05) ────────────────────────
// Untuk audit kas pada transaksi setor/terima tunai.
// Menyimpan pecahan uang fisik yang dihitung kasir.
export const transactionDenominations = sqliteTable("transaction_denominations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  // Nilai pecahan (mis. 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500)
  denomination: integer("denomination").notNull(),
  // Jumlah lembar/koin
  count: integer("count").notNull(),
  // Subtotal = denomination * count
  subtotal: integer("subtotal").notNull(),
});

// ── Akun Saldo (Multi-Account) ────────────────────
// Untuk tracking saldo kas tunai dan saldo mbanking secara terpisah
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code", { length: 20 }).notNull().unique(),
  name: text("name", { length: 100 }).notNull(),
  icon: text("icon", { length: 50 }).default("wallet"),
  color: text("color", { length: 20 }).default("#00875A"),
  balance: real("balance").notNull().default(0),
  minBalance: real("min_balance").default(100000),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Mutasi Saldo ──────────────────────────────────
export const accountMutations = sqliteTable("account_mutations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  type: text("type", { length: 30 }).notNull(),
  amount: real("amount").notNull(),
  balanceAfter: real("balance_after").notNull(),
  referenceId: integer("reference_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── Settings ──────────────────────────────────────
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

// ── LEGACY: Cash Balance (untuk backward compatibility) ──
export const cashBalance = sqliteTable("cash_balance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { length: 20 }).notNull(),
  amount: real("amount").notNull(),
  balanceAfter: real("balance_after").notNull(),
  notes: text("notes"),
  referenceId: integer("reference_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});