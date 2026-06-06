// For now - demo mode. Products save in memory, disappear on refresh
// Next step: Connect Supabase for permanent storage

let products = [
  {id: 1, name: 'Airpods Pro Max', price: 85000, description: 'ANC + Spatial Audio', image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=400', seller_id: 'demo'}
];
let sellers = [];

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') return {statusCode: 200, headers, body: ''};
  
  const path = event.path.replace('/.netlify/functions/api', '');
  const body = event.body ? JSON.parse(event.body) : {};
  
  // Get products for buyers
  if (path === '/products' && event.httpMethod === 'GET') {
    return {statusCode: 200, headers, body: JSON.stringify(products)};
  }
  
  // Seller signup
  if (path === '/seller/signup' && event.httpMethod === 'POST') {
    const token = 'seller-' + Date.now();
    sellers.push({email: body.email, token, type: 'seller'});
    return {statusCode: 200, headers, body: JSON.stringify({token, message: 'Seller account created'})};
  }
  
  // Seller signin  
  if (path === '/seller/signin' && event.httpMethod === 'POST') {
    const seller = sellers.find(s => s.email === body.email);
    if(seller) return {statusCode: 200, headers, body: JSON.stringify({token: seller.token})};
    return {statusCode: 401, headers, body: JSON.stringify({error: 'Invalid login'})};
  }
  
  // Add product
  if (path === '/seller/products' && event.httpMethod === 'POST') {
    const token = event.headers.authorization?.replace('Bearer ', '');
    if(!token) return {statusCode: 401, headers, body: JSON.stringify({error: 'Login first'})};
    
    const newProduct = {
      id: Date.now(),
      ...body,
      seller_id: token
    };
    products.push(newProduct);
    return {statusCode: 200, headers, body: JSON.stringify({message: 'Product added! Refresh buyer page to see it'})};
  }
  
  if (path === '/test') {
    return {statusCode: 200, headers, body: JSON.stringify({status: 'API is live on Netlify'})};
  }
  
  return {statusCode: 404, headers, body: JSON.stringify({error: 'Not found'})};
}
