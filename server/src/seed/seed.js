/**
 * Deterministic seed — 18 months of realistic e-commerce data ending today.
 *   npm run seed            (drops & recreates all collections)
 *
 * Generated volumes: ~57 products, ~2,500 customers, ~12,000 orders, ~200,000 sessions,
 * plus one dashboard user per role. Faker is seeded so output is reproducible.
 */
import { faker } from '@faker-js/faker';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Customer, SEGMENTS } from '../models/Customer.js';
import { Product, CATEGORIES } from '../models/Product.js';
import { Order, REVENUE_STATUSES, PAYMENT_METHODS, CHANNELS } from '../models/Order.js';
import { Session, FUNNEL_STAGES, DEVICES, SOURCES } from '../models/Session.js';
import { Setting } from '../models/Setting.js';
import { DEMO_ACCOUNTS, demoPasswordFor } from '../services/demoService.js';

faker.seed(42);

const DAY = 86400000;
const MONTHS = 18;
const TODAY = new Date();
TODAY.setUTCHours(12, 0, 0, 0);
const START = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - MONTHS + 1, 1));
const TOTAL_DAYS = Math.round((TODAY - START) / DAY);

const PALETTE = ['#4318FF', '#39B8FF', '#05CD99', '#FFB547', '#EE5D50', '#6C63FF', '#F97316', '#0EA5E9', '#A855F7', '#14B8A6'];
const COUNTRIES = [
  ['United States', 0.34], ['United Kingdom', 0.12], ['Germany', 0.1], ['India', 0.1], ['Canada', 0.08],
  ['Australia', 0.07], ['France', 0.06], ['Netherlands', 0.05], ['Brazil', 0.04], ['Japan', 0.04],
];

const pick = (arr) => arr[Math.floor(faker.number.float() * arr.length)];
const weighted = (pairs) => {
  const r = faker.number.float();
  let acc = 0;
  for (const [v, w] of pairs) {
    acc += w;
    if (r <= acc) return v;
  }
  return pairs[pairs.length - 1][0];
};
const money = (n) => Math.round(n * 100) / 100;
const color = () => pick(PALETTE);

/** Daily demand multiplier: growth trend × seasonality × weekday pattern × noise. */
function demandFactor(date) {
  const t = (date - START) / (TODAY - START); // 0..1
  const growth = 0.7 + 0.6 * t; // business grows ~85% over the period
  const m = date.getUTCMonth();
  const seasonal = [0.85, 0.8, 0.9, 0.95, 1.0, 1.0, 0.95, 1.0, 1.05, 1.1, 1.45, 1.55][m];
  const wd = date.getUTCDay();
  const weekday = [1.15, 0.9, 0.92, 0.95, 1.0, 1.1, 1.25][wd]; // Sun..Sat
  const noise = 0.8 + faker.number.float() * 0.4;
  return growth * seasonal * weekday * noise;
}

const PRODUCT_NAMES = {
  Electronics: ['Aurora Wireless Headphones', 'Pulse Smart Watch', 'Nimbus Bluetooth Speaker', 'Vector 4K Monitor', 'Orbit Mechanical Keyboard', 'Flux USB-C Hub', 'Halo Webcam Pro', 'Nova Power Bank 20K', 'Zen Noise-Cancelling Earbuds'],
  Apparel: ['Everyday Merino Tee', 'Coastal Linen Shirt', 'Summit Down Jacket', 'Drift Denim Jeans', 'Trail Running Shorts', 'Cloud Hoodie', 'Meridian Chinos', 'Arc Rain Shell'],
  'Home & Living': ['Lumen Desk Lamp', 'Terra Ceramic Planter', 'Haven Throw Blanket', 'Ember Scented Candle', 'Nest Storage Basket', 'Glow Salt Lamp', 'Alder Bookshelf', 'Serene Diffuser'],
  Beauty: ['Dew Hydrating Serum', 'Bloom Vitamin C Cream', 'Silk Hair Oil', 'Clarity Cleansing Gel', 'Velvet Lip Tint', 'Radiance SPF 50', 'Calm Night Mask'],
  Sports: ['Apex Yoga Mat', 'Stride Running Shoes', 'Grip Resistance Bands', 'Core Kettlebell 12kg', 'Hydra Water Bottle', 'Momentum Jump Rope', 'Balance Foam Roller'],
  Books: ['The Quiet Algorithm', 'Designing Data Products', 'Atlas of Small Habits', 'Notes on Leadership', 'The Analytics Handbook', 'Slow Mornings Cookbook'],
  Toys: ['Cosmo Building Blocks', 'Puzzle Planet 1000', 'Rover Remote Car', 'Melody Mini Piano', 'Dino Dig Kit', 'Skyline Kite'],
  Grocery: ['Single-Origin Coffee 1kg', 'Matcha Ceremonial Grade', 'Organic Honey 500g', 'Artisan Granola', 'Cold-Pressed Olive Oil', 'Dark Chocolate 85%'],
};
const PRICE_RANGE = { Electronics: [49, 399], Apparel: [25, 180], 'Home & Living': [18, 220], Beauty: [12, 80], Sports: [15, 120], Books: [12, 45], Toys: [15, 90], Grocery: [8, 40] };
const CATEGORY_WEIGHT = { Electronics: 0.22, Apparel: 0.2, 'Home & Living': 0.14, Beauty: 0.12, Sports: 0.1, Books: 0.08, Toys: 0.07, Grocery: 0.07 };

async function seedUsers() {
  // Passwords come from DEMO_PASSWORD_* env vars (dev fallback: Password123) — see services/demoService.js
  const docs = [];
  for (const [i, a] of DEMO_ACCOUNTS.entries()) {
    const password = demoPasswordFor(a.role);
    if (!password) throw new Error(`No password configured for demo role ${a.role} (set ${a.envKey})`);
    docs.push({ name: a.name, email: a.email, role: a.role, jobTitle: a.jobTitle, passwordHash: await User.hashPassword(password), avatarColor: PALETTE[i], lastLoginAt: new Date(TODAY - i * DAY) });
  }
  await User.insertMany(docs);
  return DEMO_ACCOUNTS.map((a) => [a.name, a.email, a.role]);
}

async function seedProducts() {
  const docs = [];
  let n = 1;
  for (const category of CATEGORIES) {
    for (const name of PRODUCT_NAMES[category]) {
      const [lo, hi] = PRICE_RANGE[category];
      const price = money(faker.number.float({ min: lo, max: hi }));
      docs.push({
        name,
        sku: `${category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}-${String(n++).padStart(4, '0')}`,
        category,
        price,
        cost: money(price * faker.number.float({ min: 0.42, max: 0.7 })),
        stock: faker.number.int({ min: 0, max: 320 }),
        rating: money(faker.number.float({ min: 3.4, max: 4.9 })),
        reviewCount: faker.number.int({ min: 4, max: 1200 }),
        description: faker.commerce.productDescription(),
        color: color(),
        isActive: faker.number.float() > 0.06,
        createdAt: new Date(START.getTime() - faker.number.int({ min: 0, max: 200 }) * DAY),
      });
    }
  }
  return Product.insertMany(docs);
}

async function seedCustomers(count) {
  const docs = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    // Signup date skewed toward recent months (growing business)
    const t = Math.pow(faker.number.float(), 0.75);
    const createdAt = new Date(START.getTime() + Math.floor(t * TOTAL_DAYS) * DAY + faker.number.int({ min: 0, max: DAY - 1 }));
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    let email = faker.internet.email({ firstName: first, lastName: last }).toLowerCase();
    while (used.has(email)) email = `${first}.${last}${faker.number.int(9999)}@example.com`.toLowerCase();
    used.add(email);
    docs.push({ name: `${first} ${last}`, email, country: weighted(COUNTRIES), city: faker.location.city(), avatarColor: color(), createdAt, lastActiveAt: createdAt, segment: 'new' });
  }
  return Customer.insertMany(docs);
}

async function seedOrders(products, customers) {
  const active = products;
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, active.filter((p) => p.category === c)]));
  const customersByDay = customers.slice().sort((a, b) => a.createdAt - b.createdAt);
  const orders = [];
  let seq = 1;
  const stats = new Map(); // customerId -> {spent, count, last}

  for (let d = 0; d <= TOTAL_DAYS; d++) {
    const day = new Date(START.getTime() + d * DAY);
    const eligible = customersByDay.filter((c) => c.createdAt <= new Date(day.getTime() + DAY));
    if (!eligible.length) continue;
    const count = Math.round(21 * demandFactor(day));
    for (let i = 0; i < count; i++) {
      // Repeat buyers: 35% of orders come from the top-spending third of customers
      const customer = faker.number.float() < 0.35 && eligible.length > 30 ? eligible[faker.number.int({ min: 0, max: Math.floor(eligible.length / 3) })] : pick(eligible);
      const createdAt = new Date(Math.max(day.getTime() + faker.number.int({ min: 0, max: DAY - 1 }), customer.createdAt.getTime()));
      if (createdAt > TODAY) continue;
      const itemCount = weighted([[1, 0.55], [2, 0.27], [3, 0.12], [4, 0.06]]);
      const items = [];
      const chosen = new Set();
      for (let k = 0; k < itemCount; k++) {
        const category = weighted(Object.entries(CATEGORY_WEIGHT));
        const product = pick(byCategory[category]);
        if (chosen.has(String(product._id))) continue;
        chosen.add(String(product._id));
        items.push({ product: product._id, name: product.name, category: product.category, quantity: weighted([[1, 0.7], [2, 0.22], [3, 0.08]]), unitPrice: product.price, unitCost: product.cost });
      }
      const subtotal = money(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0));
      const discount = faker.number.float() < 0.18 ? money(subtotal * weighted([[0.1, 0.6], [0.15, 0.3], [0.25, 0.1]])) : 0;
      const shipping = subtotal - discount > 75 ? 0 : 6.99;
      const tax = money((subtotal - discount) * 0.08);
      const total = money(subtotal - discount + tax + shipping);
      const ageDays = (TODAY - createdAt) / DAY;
      // Older orders are settled; recent ones are still moving through fulfilment
      const status =
        ageDays < 2 ? weighted([['pending', 0.55], ['processing', 0.4], ['cancelled', 0.05]])
        : ageDays < 6 ? weighted([['processing', 0.45], ['shipped', 0.45], ['cancelled', 0.1]])
        : ageDays < 12 ? weighted([['shipped', 0.35], ['delivered', 0.55], ['cancelled', 0.07], ['refunded', 0.03]])
        : weighted([['delivered', 0.88], ['cancelled', 0.07], ['refunded', 0.05]]);
      orders.push({
        orderNumber: `ORD-${String(seq++).padStart(6, '0')}`,
        customer: customer._id,
        customerName: customer.name,
        customerEmail: customer.email,
        items, subtotal, discount, tax, shipping, total, status,
        paymentMethod: weighted([['card', 0.58], ['paypal', 0.18], ['wallet', 0.12], ['bank_transfer', 0.07], ['cod', 0.05]]),
        channel: weighted([['web', 0.58], ['mobile_app', 0.32], ['marketplace', 0.1]]),
        country: customer.country,
        createdAt,
        updatedAt: createdAt,
      });
      if (REVENUE_STATUSES.includes(status)) {
        const s = stats.get(String(customer._id)) || { spent: 0, count: 0, last: null };
        s.spent += total;
        s.count += 1;
        s.last = s.last && s.last > createdAt ? s.last : createdAt;
        stats.set(String(customer._id), s);
      }
    }
  }
  for (let i = 0; i < orders.length; i += 2000) await Order.insertMany(orders.slice(i, i + 2000), { ordered: false });

  // Denormalised customer stats + segment assignment
  const ops = customers.map((c) => {
    const s = stats.get(String(c._id)) || { spent: 0, count: 0, last: null };
    const daysSinceLast = s.last ? (TODAY - s.last) / DAY : Infinity;
    const segment = s.spent > 1200 && s.count >= 4 ? 'vip' : s.count >= 2 && daysSinceLast < 120 ? 'regular' : s.count === 0 || daysSinceLast > 180 ? (s.count === 0 && (TODAY - c.createdAt) / DAY < 60 ? 'new' : 'inactive') : 'new';
    return { updateOne: { filter: { _id: c._id }, update: { $set: { totalSpent: money(s.spent), orderCount: s.count, lastOrderAt: s.last, lastActiveAt: s.last || c.createdAt, segment } } } };
  });
  await Customer.bulkWrite(ops, { ordered: false });
  return orders;
}

async function seedSessions(orders, customers) {
  const docs = [];
  const stageIdx = Object.fromEntries(FUNNEL_STAGES.map((s, i) => [s, i]));
  const push = (o) => docs.push({ ...o, funnelIndex: stageIdx[o.funnelStage] });
  const device = () => weighted([['desktop', 0.47], ['mobile', 0.44], ['tablet', 0.09]]);
  const source = () => weighted([['organic', 0.34], ['direct', 0.2], ['paid', 0.18], ['social', 0.14], ['email', 0.08], ['referral', 0.06]]);
  const hourOffset = () => {
    // Traffic peaks 10-13h and 19-22h UTC
    const h = weighted([[9, 0.05], [10, 0.08], [11, 0.09], [12, 0.09], [13, 0.07], [14, 0.06], [15, 0.06], [16, 0.05], [17, 0.05], [18, 0.06], [19, 0.08], [20, 0.09], [21, 0.08], [22, 0.05], [23, 0.02], [0, 0.01], [7, 0.01]]);
    return h * 3600000 + faker.number.int({ min: 0, max: 3599999 });
  };

  // 1) One purchase session per order — keeps conversion math consistent with orders
  for (const o of orders) {
    if (o.status === 'cancelled' && faker.number.float() < 0.5) continue;
    push({ customer: o.customer, startedAt: new Date(o.createdAt.getTime() - faker.number.int({ min: 60, max: 1800 }) * 1000), durationSec: faker.number.int({ min: 240, max: 1500 }), pageViews: faker.number.int({ min: 5, max: 18 }), device: device(), source: source(), funnelStage: 'purchase', country: o.country });
  }
  // 2) Non-converting traffic, ~14× the order volume, following the same demand curve
  for (let d = 0; d <= TOTAL_DAYS; d++) {
    const day = new Date(START.getTime() + d * DAY);
    const n = Math.round(300 * demandFactor(day));
    for (let i = 0; i < n; i++) {
      const stage = weighted([['visit', 0.45], ['product_view', 0.33], ['add_to_cart', 0.15], ['checkout', 0.07]]);
      const known = faker.number.float() < 0.3 ? pick(customers) : null;
      const durBase = { visit: [10, 120], product_view: [40, 400], add_to_cart: [120, 700], checkout: [200, 900] }[stage];
      push({ customer: known?._id ?? null, startedAt: new Date(day.getTime() + hourOffset()), durationSec: faker.number.int({ min: durBase[0], max: durBase[1] }), pageViews: { visit: faker.number.int({ min: 1, max: 2 }), product_view: faker.number.int({ min: 2, max: 6 }), add_to_cart: faker.number.int({ min: 4, max: 10 }), checkout: faker.number.int({ min: 6, max: 12 }) }[stage], device: device(), source: source(), funnelStage: stage, country: known?.country ?? weighted(COUNTRIES) });
    }
  }
  for (let i = 0; i < docs.length; i += 5000) await Session.insertMany(docs.slice(i, i + 5000), { ordered: false });
  return docs.length;
}

export async function runSeed({ log = console.log } = {}) {
  const t0 = Date.now();
  await Promise.all([User, Customer, Product, Order, Session, Setting].map((M) => M.deleteMany({})));
  log('• cleared collections');
  await Setting.create({ key: 'org', orgName: 'Nova Commerce' });
  const users = await seedUsers();
  log(`• ${users.length} dashboard users`);
  const products = await seedProducts();
  log(`• ${products.length} products`);
  const customers = await seedCustomers(2500);
  log(`• ${customers.length} customers`);
  const orders = await seedOrders(products, customers);
  log(`• ${orders.length} orders`);
  const sessions = await seedSessions(orders, customers);
  log(`• ${sessions} sessions`);
  await Promise.all([User, Customer, Product, Order, Session].map((M) => M.syncIndexes()));
  log(`✔ seed complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return { users, products: products.length, customers: customers.length, orders: orders.length, sessions };
}

const isDirect = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isDirect) {
  connectDB()
    .then(() => runSeed())
    .then(({ users }) => {
      console.log('\nDemo accounts (password: Password123):');
      for (const [name, email, role] of users) console.log(`  ${role.padEnd(12)} ${email}  (${name})`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => disconnectDB());
}
