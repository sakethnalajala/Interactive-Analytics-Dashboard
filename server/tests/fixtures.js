/** Small, hand-written dataset with known totals for exact KPI assertions. */
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Product } from '../src/models/Product.js';
import { Order } from '../src/models/Order.js';
import { Session } from '../src/models/Session.js';
import { Setting } from '../src/models/Setting.js';

export const PASSWORD = 'Password123';
export const day = (n) => new Date(Date.UTC(2026, 0, n, 12)); // Jan n, 2026 12:00 UTC

export async function seedFixtures() {
  await Promise.all([User, Customer, Product, Order, Session, Setting].map((M) => M.deleteMany({})));
  const hash = await User.hashPassword(PASSWORD);
  const users = await User.insertMany([
    { name: 'Super', email: 'super@test.com', role: 'super_admin', passwordHash: hash },
    { name: 'Admin', email: 'admin@test.com', role: 'admin', passwordHash: hash },
    { name: 'Analyst', email: 'analyst@test.com', role: 'analyst', passwordHash: hash },
    { name: 'Viewer', email: 'viewer@test.com', role: 'viewer', passwordHash: hash },
    { name: 'Inactive', email: 'inactive@test.com', role: 'viewer', passwordHash: hash, isActive: false },
  ]);
  await Setting.create({ key: 'org', lowStockThreshold: 10 });

  const [alice, bob] = await Customer.insertMany([
    { name: 'Alice Smith', email: 'alice@test.com', country: 'United States', city: 'Austin', segment: 'vip', totalSpent: 300, orderCount: 2, createdAt: day(1) },
    { name: 'Bob Jones', email: 'bob@test.com', country: 'Germany', city: 'Berlin', segment: 'new', totalSpent: 0, orderCount: 0, createdAt: day(12) },
  ]);
  const [widget, gadget] = await Product.insertMany([
    { name: 'Widget', sku: 'WID-0001', category: 'Electronics', price: 100, cost: 60, stock: 5, rating: 4.5 },
    { name: 'Gadget', sku: 'GAD-0002', category: 'Apparel', price: 50, cost: 20, stock: 100, rating: 4.0 },
  ]);
  const item = (p, quantity) => ({ product: p._id, name: p.name, category: p.category, quantity, unitPrice: p.price, unitCost: p.cost });
  const base = (customer, extra) => ({ customer: customer._id, customerName: customer.name, customerEmail: customer.email, paymentMethod: 'card', channel: 'web', country: customer.country, discount: 0, tax: 0, shipping: 0, ...extra });

  // Period under test: Jan 10 – Jan 20. Revenue-counting orders: 100 + 200 = 300. Cancelled and refunded are excluded.
  await Order.insertMany([
    base(alice, { orderNumber: 'ORD-1', items: [item(widget, 1)], subtotal: 100, total: 100, status: 'delivered', createdAt: day(11) }),
    base(alice, { orderNumber: 'ORD-2', items: [item(gadget, 4)], subtotal: 200, total: 200, status: 'shipped', createdAt: day(15) }),
    base(bob, { orderNumber: 'ORD-3', items: [item(widget, 1)], subtotal: 100, total: 100, status: 'cancelled', createdAt: day(16) }),
    base(bob, { orderNumber: 'ORD-4', items: [item(gadget, 1)], subtotal: 50, total: 50, status: 'refunded', createdAt: day(18) }),
    base(alice, { orderNumber: 'ORD-5', items: [item(widget, 2)], subtotal: 200, total: 200, status: 'delivered', createdAt: day(3) }), // previous period
    base(bob, { orderNumber: 'ORD-6', items: [item(gadget, 1)], subtotal: 50, total: 50, status: 'pending', createdAt: day(25) }), // outside range
  ]);

  // 10 sessions in range: 2 purchases → 20% conversion; funnel visit 10 / product_view 6 / add_to_cart 4 / checkout 3 / purchase 2
  const stages = ['visit', 'visit', 'visit', 'visit', 'product_view', 'product_view', 'add_to_cart', 'checkout', 'purchase', 'purchase'];
  const idx = { visit: 0, product_view: 1, add_to_cart: 2, checkout: 3, purchase: 4 };
  await Session.insertMany(
    stages.map((stage, i) => ({
      customer: i % 2 ? alice._id : null,
      startedAt: day(10 + i),
      durationSec: 100,
      pageViews: 3,
      device: 'desktop',
      source: 'organic',
      funnelStage: stage,
      funnelIndex: idx[stage],
      country: 'United States',
    })),
  );
  return { users, alice, bob, widget, gadget };
}
