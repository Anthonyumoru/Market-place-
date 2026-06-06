export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') return {statusCode: 200, headers, body: ''};
  
  const path = event.path.replace('/.netlify/functions/api', '');
  
  if (path === '/products' && event.httpMethod === 'GET') {
    return {
      statusCode: 200, headers,
      body: JSON.stringify([
        {id: 1, name: 'Airpods Pro Max', price: 85000, description: 'ANC + Spatial Audio', image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=400'},
        {id: 2, name: 'Power Bank 20000mAh', price: 12000, description: 'Fast charging', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'},
        {id: 3, name: 'Wireless Mouse', price: 6500, description: 'Ergonomic design', image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400'},
        {id: 4, name: 'USB-C Cable 2m', price: 2500, description: 'Fast charging cable', image: 'https://images.unsplash.com/photo-1583863788434-e91a977112f8?w=400'}
      ])
    };
  }
  
  if (path === '/test') {
    return {statusCode: 200, headers, body: JSON.stringify({status: 'API is live on Netlify'})};
  }
  
  if (path === '/signup' && event.httpMethod === 'POST') {
    return {statusCode: 200, headers, body: JSON.stringify({token: 'demo-token-123', message: 'Account created'})};
  }
  
  if (path === '/signin' && event.httpMethod === 'POST') {
    return {statusCode: 200, headers, body: JSON.stringify({token: 'demo-token-123', message: 'Welcome back'})};
  }
  
  if (path === '/orders' && event.httpMethod === 'POST') {
    return {statusCode: 200, headers, body: JSON.stringify({message: 'Order placed! We will contact you soon'})};
  }
  
  return {statusCode: 404, headers, body: JSON.stringify({error: 'Not found'})};
}
