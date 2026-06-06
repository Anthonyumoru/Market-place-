import { sign, verify } from 'https://esm.sh/hono/jwt@3.4.1'

const JWT_SECRET = 'naija_marketplace_secret_change_this_in_production'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Test endpoint
      if (path === '/test') {
        return json({ status: 'API is live', version: '2.0.0' }, corsHeaders)
      }

      // Auth routes
      if (path === '/signup' && request.method === 'POST') {
        return await signup(request, env, corsHeaders)
      }
      if (path === '/signin' && request.method === 'POST') {
        return await signin(request, env, corsHeaders)
      }

      // Products/Listings CRUD
      if (path === '/products' && request.method === 'GET') {
        return await getProducts(request, env, corsHeaders)
      }
      if (path === '/products' && request.method === 'POST') {
        return await auth(request, env, async (user) => createProduct(request, env, user, corsHeaders))
      }
      if (path.startsWith('/products/') && request.method === 'DELETE') {
        return await auth(request, env, async (user) => deleteProduct(request, env, user, corsHeaders))
      }

      // Orders + Escrow
      if (path === '/orders' && request.method === 'POST') {
        return await auth(request, env, async (user) => createOrder(request, env, user, corsHeaders))
      }
      if (path === '/orders' && request.method === 'GET') {
        return await auth(request, env, async (user) => getOrders(request, env, user, corsHeaders))
      }

      // Image upload via R2
      if (path === '/upload' && request.method === 'POST') {
        return await auth(request, env, async (user) => uploadImage(request, env, corsHeaders))
      }

      return json({ error: 'Route not found' }, corsHeaders, 404)
    } catch (e) {
      return json({ error: e.message }, corsHeaders, 500)
    }
  }
}

// Helper: JSON response
function json(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}

// Auth middleware
async function auth(request, env, handler) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No token' }, {}, 401)
  
  const token = authHeader.replace('Bearer ', '')
  try {
    const payload = await verify(token, JWT_SECRET)
    return handler(payload)
  } catch {
    return json({ error: 'Invalid token' }, {}, 401)
  }
}

// Signup
async function signup(request, env, headers) {
  const { email, password, role = 'buyer' } = await request.json()
  const hashed = await hashPassword(password)
  
  try {
    await env.DB.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)')
      .bind(email, hashed, role).run()
    return json({ success: true, message: 'User created' }, headers)
  } catch {
    return json({ error: 'Email already exists' }, headers, 400)
  }
}

// Signin
async function signin(request, env, headers) {
  const { email, password } = await request.json()
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  
  if (!user || !await verifyPassword(password, user.password)) {
    return json({ error: 'Invalid credentials' }, headers, 401)
  }
  
  const token = await sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET)
  return json({ token, user: { id: user.id, email: user.email, role: user.role } }, headers)
}

// Get all products
async function getProducts(request, env, headers) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  
  let query = 'SELECT p.*, u.email as seller_email FROM products p JOIN users u ON p.seller_id = u.id'
  if (category) query += ' WHERE p.category = ?'
  query += ' ORDER BY p.created_at DESC LIMIT 50'
  
  const stmt = env.DB.prepare(query)
  const products = category ? await stmt.bind(category).all() : await stmt.all()
  
  return json({ products: products.results }, headers)
}

// Create product
async function createProduct(request, env, user, headers) {
  const { title, price, category, image_url } = await request.json()
  
  const result = await env.DB.prepare(
    'INSERT INTO products (seller_id, title, price, category, image_url) VALUES (?, ?, ?)'
  ).bind(user.id, title, price, category, image_url).run()
  
  return json({ success: true, id: result.meta.last_row_id }, headers)
}

// Delete product
async function deleteProduct(request, env, user, headers) {
  const id = request.url.split('/').pop()
  await env.DB.prepare('DELETE FROM products WHERE id = ? AND seller_id = ?').bind(id, user.id).run()
  return json({ success: true }, headers)
}

// Create order + escrow
async function createOrder(request, env, user, headers) {
  const { product_id } = await request.json()
  
  const result = await env.DB.prepare(
    'INSERT INTO orders (buyer_id, product_id, status) VALUES (?, ?, "escrow")'
  ).bind(user.id, product_id).run()
  
  return json({ success: true, order_id: result.meta.last_row_id, status: 'escrow' }, headers)
}

// Get orders
async function getOrders(request, env, user, headers) {
  const orders = await env.DB.prepare(
    'SELECT o.*, p.title, p.price FROM orders o JOIN products p ON o.product_id = p.id WHERE o.buyer_id = ? OR p.seller_id = ?'
  ).bind(user.id, user.id).all()
  
  return json({ orders: orders.results }, headers)
}

// Upload image to R2
async function uploadImage(request, env, headers) {
  const formData = await request.formData()
  const file = formData.get('image')
  
  const key = `${Date.now()}-${file.name}`
  await env.MARKETPLACE_IMAGES.put(key, file.stream())
  
  const url = `https://marketplace-images.your-account.workers.dev/${key}`
  return json({ url }, headers)
}

// Password hashing
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password, hash) {
  return await hashPassword(password) === hash
}