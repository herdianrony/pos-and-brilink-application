import { vi } from "vitest";

// ── Mock Data ────────────────────────────────────
export const mockUsers = [
  { id: 1, name: "Admin", username: "admin", passwordHash: "$2a$10$mockhash", role: "admin", isActive: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: "Kasir", username: "kasir", passwordHash: "$2a$10$mockhash", role: "kasir", isActive: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() },
];

export const mockProducts = [
  { id: 1, name: "Indomie Goreng", barcode: "899001", categoryId: 1, buyPrice: "2500", sellPrice: "3500", stock: 50, minStock: 10, unit: "pcs", image: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: "Aqua 600ml", barcode: "761100", categoryId: 2, buyPrice: "2800", sellPrice: "4000", stock: 200, minStock: 30, unit: "botol", image: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

export const mockAccounts = [
  { id: 1, code: "cash", name: "Kas Tunai", icon: "banknote", color: "#22c55e", balance: 500000, minBalance: 200000, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, code: "bank_bri", name: "M-Banking BRI", icon: "bri", color: "#00529B", balance: 2000000, minBalance: 500000, isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

export const mockCategories = [
  { id: 1, name: "Makanan", icon: "utensils", color: "#ef4444", isActive: true, createdAt: new Date(), productCount: 1 },
  { id: 2, name: "Minuman", icon: "cup-soda", color: "#3b82f6", isActive: true, createdAt: new Date(), productCount: 1 },
];

export const mockTransactions = [
  { id: 1, invoiceNo: "POS2401151030001", type: "pos", subType: null, customerName: null, customerPhone: null, totalAmount: "3500", adminFee: "0", profit: "1000", paymentMethod: "cash", notes: null, createdAt: new Date(), items: [] },
];

export const mockSettings: Record<string, string> = {
  app_name: "POS & Agen Bisnis",
  business_type: "Agen Bisnis",
  services_label: "Layanan Agen",
  store_name: "Toko Maju Jaya",
  store_address: "Jl. Raya No.123",
  phone: "081234567890",
  agent_id: "",
  owner_name: "Ahmad Surya",
  opening_balance: "500000",
};

// ── Mock DB ──────────────────────────────────────
export function createMockDb(data: {
  users?: any[];
  products?: any[];
  accounts?: any[];
  categories?: any[];
  transactions?: any[];
  settings?: Record<string, string>;
  accountMutations?: any[];
}) {
  const db = {
    users: [...(data.users || mockUsers)],
    products: [...(data.products || mockProducts)],
    accounts: [...(data.accounts || mockAccounts)],
    categories: [...(data.categories || mockCategories)],
    transactions: [...(data.transactions || mockTransactions)],
    settings: { ...(data.settings || mockSettings) },
    accountMutations: [...(data.accountMutations || [])],
  };

  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn(),
    _data: db,
  };
}

// ── Mock Auth ────────────────────────────────────
export function mockAuth(user: any | null) {
  return {
    requireAuth: vi.fn().mockResolvedValue(
      user ? { ok: true, user } : { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) }
    ),
    requireAdmin: vi.fn().mockResolvedValue(
      user?.role === "admin"
        ? { ok: true, user }
        : { ok: false, response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) }
    ),
    getCurrentUser: vi.fn().mockResolvedValue(user),
    getSession: vi.fn().mockResolvedValue(user ? { sub: String(user.id), username: user.username, name: user.name, role: user.role } : null),
    hashPassword: vi.fn().mockResolvedValue("$2a$10$mockhash"),
    verifyPassword: vi.fn().mockResolvedValue(true),
    signToken: vi.fn().mockResolvedValue("mock.jwt.token"),
    verifyToken: vi.fn().mockResolvedValue(user ? { sub: String(user.id), username: user.username, name: user.name, role: user.role } : null),
    hasUsers: vi.fn().mockResolvedValue(true),
    setSessionCookie: vi.fn(),
    clearSessionCookie: vi.fn(),
    getSessionCookie: vi.fn().mockResolvedValue(user ? "mock.jwt.token" : undefined),
  };
}

// ── Mock NextRequest ─────────────────────────────
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    cookies?: Record<string, string>;
  } = {}
) {
  const { method = "GET", body, cookies = {} } = options;
  const req = {
    method,
    url,
    nextUrl: new URL(url, "http://localhost:3000"),
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      set: vi.fn(),
      delete: vi.fn(),
    },
    headers: new Headers(),
    json: async () => body || {},
    text: async () => JSON.stringify(body || {}),
  };
  return req;
}

// ── Mock Response ────────────────────────────────
export function createMockResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  };
}

// ── Mock fetch ───────────────────────────────────
export function mockFetch(responses: Record<string, any>) {
  const mockFn = vi.fn(async (url: string, options?: any) => {
    const key = options?.method ? `${options.method}:${url}` : `GET:${url}`;
    const response = responses[key] || responses[url];
    if (response) {
      return createMockResponse(response.data || response, response.status || 200);
    }
    return createMockResponse({ error: "Not found" }, 404);
  });
  global.fetch = mockFn as any;
  return mockFn;
}
