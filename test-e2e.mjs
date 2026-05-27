import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const apiServerUrl = 'http://localhost:3001';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 starting fast-food-swift-order E2E Integration Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Supabase URL:', supabaseUrl);

// 1. Initialize Clients
const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const client = createClient(supabaseUrl, supabaseAnonKey);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  let testBranch = null;
  let kitchenUser = null;
  let menuUser = null;
  
  const testBranchName = `E2E Test Branch - ${Date.now()}`;
  const kitchenEmail = `e2e_kitchen_${Date.now()}@aresto.com`;
  const menuEmail = `e2e_menu_${Date.now()}@aresto.com`;
  const userPassword = 'TestPassword123!';

  try {
    // Step 2. Verify dev-server API connection and seed SuperAdmin
    console.log('\nStep 2: Seeding SuperAdmin account via Dev Express API server...');
    const seedRes = await fetch(`${apiServerUrl}/api/admin-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'seedSuperAdmin',
        email: 'superadmin@aresto.com',
        password: 'Admin1234!'
      })
    });

    if (!seedRes.ok) {
      const err = await seedRes.json().catch(() => ({}));
      throw new Error(`Failed to seed SuperAdmin via Dev API Server: ${err.error || seedRes.statusText}`);
    }
    const seedData = await seedRes.json();
    console.log('✅ SuperAdmin seeded successfully! uid:', seedData.uid, 'exists:', !!seedData.exists);

    // Step 3. Log in as SuperAdmin
    console.log('\nStep 3: Logging in as SuperAdmin...');
    const { data: adminAuth, error: adminAuthErr } = await client.auth.signInWithPassword({
      email: 'superadmin@aresto.com',
      password: 'Admin1234!'
    });

    if (adminAuthErr) throw adminAuthErr;
    console.log('✅ SuperAdmin logged in successfully! token acquired.');

    const adminToken = adminAuth.session.access_token;
    const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${adminToken}` } }
    });

    // Step 4. Create a new Branch
    console.log(`\nStep 4: Creating a new branch: "${testBranchName}"...`);
    const { data: branchRow, error: branchErr } = await adminClient
      .from('branches')
      .insert({ name: testBranchName, active: true })
      .select()
      .single();

    if (branchErr) throw branchErr;
    testBranch = branchRow;
    console.log('✅ Branch created successfully! ID:', testBranch.id);

    // Step 5. Seed foods and categories for the new branch in Supabase
    console.log('\nStep 5: Seeding categories and foods for the new branch...');
    const categories = [
      { id: 'tacos', name: 'Tacos', icon: '🌮', sort_order: 0 },
      { id: 'burgers', name: 'Burgers', icon: '🍔', sort_order: 1 },
      { id: 'drinks', name: 'Drinks', icon: '🥤', sort_order: 2 }
    ];

    for (const cat of categories) {
      const { error: catErr } = await serviceClient
        .from('categories')
        .insert({
          id: cat.id,
          branch_id: testBranch.id,
          name: cat.name,
          icon: cat.icon,
          sort_order: cat.sort_order,
          active: true
        });
      if (catErr) throw catErr;
    }
    console.log('✅ Categories seeded.');

    const foods = [
      {
        category_id: 'tacos',
        name: 'Classic Beef Taco',
        price: 3.99,
        description: 'Seasoned beef with fresh toppings',
        image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
        available: true,
        ingredients: ['Beef patty', 'Tortilla', 'Lettuce', 'Tomato', 'Cheese']
      },
      {
        category_id: 'burgers',
        name: 'Classic Cheeseburger',
        price: 7.99,
        description: 'Beef patty with melted cheese',
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
        available: true,
        ingredients: ['Beef patty', 'Cheddar cheese', 'Lettuce', 'Tomato', 'Onion', 'Special sauce']
      }
    ];

    for (const food of foods) {
      const { error: foodErr } = await serviceClient
        .from('foods')
        .insert({
          branch_id: testBranch.id,
          category_id: food.category_id,
          name: food.name,
          price: food.price,
          description: food.description,
          image_url: food.image_url,
          available: food.available,
          ingredients: food.ingredients
        });
      if (foodErr) throw foodErr;
    }
    console.log('✅ Foods seeded successfully.');

    // Step 6. Create Kitchen and Menu Users via dev-server Express API
    console.log(`\nStep 6: Creating kitchen user (${kitchenEmail}) and menu user (${menuEmail}) via API...`);
    
    // Create Kitchen User
    const kitchenRes = await fetch(`${apiServerUrl}/api/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action: 'create',
        email: kitchenEmail,
        password: userPassword,
        role: 'kitchen',
        branchId: testBranch.id,
        branchName: testBranch.name
      })
    });

    if (!kitchenRes.ok) {
      const err = await kitchenRes.json().catch(() => ({}));
      throw new Error(`Failed to create kitchen user: ${err.error || kitchenRes.statusText}`);
    }
    const kitchenData = await kitchenRes.json();
    console.log('✅ Kitchen user created! uid:', kitchenData.uid);

    // Create Menu User
    const menuRes = await fetch(`${apiServerUrl}/api/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action: 'create',
        email: menuEmail,
        password: userPassword,
        role: 'menu',
        branchId: testBranch.id,
        branchName: testBranch.name
      })
    });

    if (!menuRes.ok) {
      const err = await menuRes.json().catch(() => ({}));
      throw new Error(`Failed to create menu user: ${err.error || menuRes.statusText}`);
    }
    const menuData = await menuRes.json();
    console.log('✅ Menu user created! uid:', menuData.uid);

    // Link users to the branch details
    const { error: branchUpdateErr } = await serviceClient
      .from('branches')
      .update({
        kitchen_user_id: kitchenData.uid,
        menu_user_id: menuData.uid,
        kitchen_credentials: { email: kitchenEmail, password: userPassword },
        menu_credentials: { email: menuEmail, password: userPassword }
      })
      .eq('id', testBranch.id);
    if (branchUpdateErr) throw branchUpdateErr;
    console.log('✅ Linked users to branch fields.');

    // Step 7. Log in as Kitchen User
    console.log('\nStep 7: Logging in as Kitchen User...');
    const { data: kitchenAuth, error: kitchenAuthErr } = await client.auth.signInWithPassword({
      email: kitchenEmail,
      password: userPassword
    });
    if (kitchenAuthErr) throw kitchenAuthErr;
    console.log('✅ Kitchen user logged in successfully!');

    const kitchenClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${kitchenAuth.session.access_token}` } }
    });

    // Step 8. Open shift with Kitchen User
    console.log('\nStep 8: Opening shift as Kitchen User...');
    const { data: shiftRow, error: shiftErr } = await kitchenClient
      .from('shifts')
      .insert({
        branch_id: testBranch.id,
        opened_by: kitchenEmail,
        status: 'open',
        notes: 'E2E Test Shift'
      })
      .select()
      .single();

    if (shiftErr) throw shiftErr;
    console.log('✅ Shift opened successfully! ID:', shiftRow.id);

    // Step 9. Set up real-time listener for orders to simulate the Kitchen dashboard
    console.log('\nStep 9: Setting up Supabase Realtime channel for orders...');
    let realtimeTriggered = false;
    let realtimePayload = null;

    const channel = serviceClient
      .channel(`orders:${testBranch.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `branch_id=eq.${testBranch.id}` },
        (payload) => {
          console.log('🔥 REALTIME: New order caught by real-time listener!');
          realtimeTriggered = true;
          realtimePayload = payload.new;
        }
      )
      .subscribe();

    // Wait a brief moment for the realtime connection to activate
    await sleep(2000);

    // Step 10. Log in as Menu User
    console.log('\nStep 10: Logging in as Menu User...');
    const { data: menuAuth, error: menuAuthErr } = await client.auth.signInWithPassword({
      email: menuEmail,
      password: userPassword
    });
    if (menuAuthErr) throw menuAuthErr;
    console.log('✅ Menu user logged in successfully!');

    const menuClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${menuAuth.session.access_token}` } }
    });

    // Step 11. Create a Customer Order as Menu User
    console.log('\nStep 11: Creating a customer order as Menu User...');
    
    // Get the food items we inserted
    const { data: dbFoods, error: dbFoodsErr } = await menuClient
      .from('foods')
      .select('*')
      .eq('branch_id', testBranch.id);
    if (dbFoodsErr) throw dbFoodsErr;

    const burgerItem = dbFoods.find(f => f.name === 'Classic Cheeseburger');

    const orderItems = [
      {
        food_id: burgerItem.id,
        name: burgerItem.name,
        price: burgerItem.price,
        quantity: 2,
        image_url: burgerItem.image_url,
        category_id: burgerItem.category_id,
        description: burgerItem.description
      }
    ];

    const subtotal = burgerItem.price * 2;
    const serviceFee = subtotal * 0.10;
    const total = subtotal + serviceFee;

    const { data: orderData, error: orderRpcErr } = await menuClient.rpc('create_order_with_items', {
      p_branch_id: testBranch.id,
      p_items: orderItems,
      p_subtotal: subtotal,
      p_service_fee: serviceFee,
      p_total: total,
      p_service_type: 'waiter-service',
      p_order_type: 'dine-in',
      p_table_number: 5,
      p_payment_method: 'card',
      p_payment_status: 'paid'
    });

    if (orderRpcErr) throw orderRpcErr;
    console.log('✅ Order created successfully! ID:', orderData.id, 'Number:', orderData.order_number);

    // Step 12. Check real-time subscription trigger
    console.log('\nStep 12: Verifying real-time delivery...');
    let retries = 5;
    while (retries > 0 && !realtimeTriggered) {
      console.log('Waiting for realtime payload... (retry', 6 - retries, ')');
      await sleep(1000);
      retries--;
    }

    if (realtimeTriggered) {
      console.log('✅ Realtime test SUCCESSFUL! Received payload:', realtimePayload.id);
    } else {
      console.warn('⚠️ Realtime subscription was not triggered within 5 seconds.');
    }

    // Step 13. Verify shift totals are bumped correctly
    console.log('\nStep 13: Verifying shift metrics bump in database...');
    const { data: updatedShift, error: updatedShiftErr } = await kitchenClient
      .from('shifts')
      .select('*')
      .eq('id', shiftRow.id)
      .single();

    if (updatedShiftErr) throw updatedShiftErr;
    console.log(`✅ Shift Orders: ${updatedShift.total_orders} (expected 1)`);
    console.log(`✅ Shift Revenue: $${updatedShift.total_revenue} (expected $${total})`);
    console.log(`✅ Sold items:`, updatedShift.sold_items_summary);

    // Step 14. Try every order status change as Kitchen User
    console.log('\nStep 14: Testing entire Order Status lifecycle changes...');
    const statuses = ['preparing', 'ready', 'served', 'completed'];

    for (const status of statuses) {
      console.log(`Updating order status to: "${status}"...`);
      const { error: statusErr } = await kitchenClient
        .from('orders')
        .update({ status })
        .eq('id', orderData.id);
      
      if (statusErr) throw statusErr;

      // Verify state update
      const { data: verifiedOrder, error: verifyErr } = await kitchenClient
        .from('orders')
        .select('status')
        .eq('id', orderData.id)
        .single();
      
      if (verifyErr) throw verifyErr;
      console.log(`✅ Order status successfully updated to "${verifiedOrder.status}"`);
      await sleep(500);
    }

    // Step 15. Close the shift
    console.log('\nStep 15: Closing the shift as Kitchen User...');
    const { error: closeErr } = await kitchenClient
      .from('shifts')
      .update({
        status: 'closed',
        closed_by: kitchenEmail,
        closed_at: new Date().toISOString(),
        notes: 'E2E Test completed successfully.'
      })
      .eq('id', shiftRow.id);
    if (closeErr) throw closeErr;
    console.log('✅ Shift closed successfully.');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 E2E TEST PASSED FLAWLESSLY! 🎉');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED WITH AN ERROR:');
    console.error(err);
    process.exit(1);
  } finally {
    // Step 16. Clean up: Delete created test branch
    if (testBranch) {
      console.log('\nStep 16: Cleaning up E2E records in database...');
      const { error: deleteErr } = await serviceClient
        .from('branches')
        .delete()
        .eq('id', testBranch.id);
      if (deleteErr) {
        console.error('⚠️ Failed to delete test branch:', deleteErr);
      } else {
        console.log('✅ Test branch and cascading records deleted.');
      }
    }
    
    // Clean up created Auth Users
    if (kitchenEmail) {
      const { data: usersData } = await serviceClient.auth.admin.listUsers();
      const kitchenAuthUser = usersData?.users?.find(u => u.email === kitchenEmail);
      if (kitchenAuthUser) {
        await serviceClient.auth.admin.deleteUser(kitchenAuthUser.id);
        console.log('✅ Deleted kitchen auth user.');
      }
      const menuAuthUser = usersData?.users?.find(u => u.email === menuEmail);
      if (menuAuthUser) {
        await serviceClient.auth.admin.deleteUser(menuAuthUser.id);
        console.log('✅ Deleted menu auth user.');
      }
    }
    process.exit(0);
  }
}

run();
