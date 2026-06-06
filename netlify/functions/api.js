import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lacmqfoqgifmigcrrlqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhY21xZm9xZ2lmbWlnY3JybHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NzM4MDIsImV4cCI6MjA5NjM0OTgwMn0.YjMOUYEwz_ne4D7wRJ9J0xoC6Cvbx7z0CcKuD9SxO18';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return {statusCode: 200, headers, body: ''};

  const path = event.path.replace('/.netlify/functions/api', '');
  const body = event.body? JSON.parse(event.body) : {};

  if (path === '/products' && event.httpMethod === 'GET') {
    const { data, error } = await supabase.from('products').select('*').order('created_at', {ascending: false});
    if(error) return {statusCode: 500, headers, body: JSON.stringify({error: error.message})};
    return {statusCode: 200, headers, body: JSON.stringify(data || [])};
  }

  if (path === '/seller/signup' && event.httpMethod === 'POST') {
    const { data, error } = await supabase.from('sellers').insert([{email: body.email, password: body.password}]).select();
    if(error) return {statusCode: 400, headers, body: JSON.stringify({error: error.message})};
    return {statusCode: 200, headers, body: JSON.stringify({token: data[0].id, message: 'Seller account created'})};
  }

  if (path === '/seller/signin' && event.httpMethod === 'POST') {
    const { data } = await supabase.from('sellers').select().eq('email', body.email).eq('password', body.password).single();
    if(!data) return {statusCode: 401, headers, body: JSON.stringify({error: 'Invalid login'})};
    return {statusCode: 200, headers, body: JSON.stringify({token: data.id})};
  }

  if (path === '/seller/products' && event.httpMethod === 'POST') {
    const token = event.headers.authorization?.replace('Bearer ', '');
    if(!token) return {statusCode: 401, headers, body: JSON.stringify({error: 'Login first'})};
    const { error } = await supabase.from('products').insert([{...body, seller_id: token}]);
    if(error) return {statusCode: 400, headers, body: JSON.stringify({error: error.message})};
    return {statusCode: 200, headers, body: JSON.stringify({message: 'Product added! Refresh buyer page'})};
  }

  if (path === '/test') {
    return {statusCode: 200, headers, body: JSON.stringify({status: 'API + Database connected'})};
  }

  return {statusCode: 404, headers, body: JSON.stringify({error: 'Not found'})};
}
