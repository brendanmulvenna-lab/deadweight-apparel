export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Frontend: Main Entry
    if (url.pathname === '/') {
        return new Response(HTML_CONTENT, { headers: { 'Content-Type': 'text/html' } });
    }

    // API: Create Payment
    if (url.pathname === '/api/create-payment' && request.method === 'POST') {
        try {
            const body = await request.json();
            const res = await fetch(`https://api.convesiopay.com/v1/payments?integration=${env.CONVESIOPAY_CONNECTED_INTEGRATION_KEY}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + env.CONVESIOPAY_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: Math.round(body.amount * 100),
                    currency: 'USD',
                    customer: body.customer
                })
            });
            const data = await res.json();
            return new Response(JSON.stringify(data), { 
                status: res.status,
                headers: { 'Content-Type': 'application/json' } 
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    // API: Webhook (WooCommerce Sync)
    if (url.pathname === '/order-endpoint' && request.method === 'POST') {
        const payload = await request.text();
        const data = JSON.parse(payload);
        
        // Simple status check (In production, use signature verification)
        if (data.status === 'processed' || data.status === 'completed') {
            await fetch(env.WOO_STORE_URL + '/wp-json/wc/v3/orders', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(env.WOO_CONSUMER_KEY + ':' + env.WOO_CONSUMER_SECRET),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_method: 'convesiopay',
                    set_paid: true,
                    status: 'completed',
                    billing: { first_name: data.customer?.firstName, email: data.customer?.email },
                    line_items: data.items?.map(i => ({ product_id: i.productId, quantity: i.quantity }))
                })
            });
        }
        return new Response('OK');
    }

    return new Response('Not Found', { status: 404 });
  }
};

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DEADWEIGHT | Industrial Strength Gym Apparel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;900&display=swap" rel="stylesheet">

    <style>
        :root {
            --bg-black: #050505;
            --neon: #39FF14;
            --text: #ffffff;
            --font-impact: 'Anton', sans-serif;
            --font-base: 'Inter', sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-black); color: var(--text); font-family: var(--font-base); overflow-x: hidden; line-height: 1.6; }
        
        header { 
            padding: 1.5rem 3rem; 
            border-bottom: 2px solid var(--neon); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            background: rgba(0,0,0,0.9); 
            position: fixed; 
            width: 100%; 
            z-index: 1000;
            backdrop-filter: blur(10px);
        }
        .logo-text { font-family: var(--font-impact); font-size: 2rem; letter-spacing: 2px; }
        .cart-trigger { font-family: var(--font-impact); color: var(--neon); cursor: pointer; text-decoration: none; }
        
        .hero { 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            text-align: center; 
            background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('https://deadweightdaddy.com/assets/images/hero-bg.jpg') center/cover;
        }
        .hero-title { font-family: var(--font-impact); font-size: clamp(4rem, 15vw, 12rem); line-height: 0.85; text-shadow: 5px 5px 0px var(--neon); margin-bottom: 2rem; }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 3rem; padding: 10rem 2rem; max-width: 1200px; margin: 0 auto; }
        .card { background: #111; padding: 2.5rem; border: 1px solid #222; transition: transform 0.3s, border-color 0.3s; position: relative; }
        .card:hover { transform: translateY(-10px); border-color: var(--neon); box-shadow: 0 0 20px rgba(57, 255, 20, 0.2); }
        .card h3 { font-family: var(--font-impact); font-size: 1.8rem; margin-bottom: 1rem; }
        .price { color: var(--neon); font-size: 2rem; font-weight: 900; margin-bottom: 2rem; }
        .btn-add { width: 100%; padding: 1.2rem; background: none; border: 2px solid #333; color: white; font-family: var(--font-impact); font-size: 1.2rem; cursor: pointer; transition: 0.3s; }
        .btn-add:hover { background: var(--neon); color: black; border-color: var(--neon); transform: scale(1.02); }







        @media (max-width: 768px) { #cart-sidebar { width: 100%; right: -100%; } .hero-title { font-size: 6rem; } }
    </style>
</head>
<body>
    <header>
        <div class="logo-text">DEADWEIGHT</div>
    </header>

    <main>
        <section class="hero">
            <div>
                <h1 class="hero-title">SURVIVE<br/>THE GRIND</h1>
                <a href="#shop" class="btn-add" style="display:inline-block; width:auto; padding: 1rem 3rem;">EQUIP NOW</a>
            </div>
        </section>

        <section id="shop" class="grid">
            <!-- Product 1: NEON GATOR TEE -->
            <div class="card">
                <img src="https://store.deadweightdaddy.com/wp-content/uploads/2026/04/DW-NEON-GATOR.png" alt="Deadweight Apparel Neon Gator graphic tee" style="width:100%; margin-bottom:1.5rem;">
                <h3>NEON GATOR TEE</h3>
                <p class="product-desc" style="font-size:0.8rem; color:#666; margin-bottom:1rem;">Dripping fangs. X'd out eyes. Pure swamp aggression.</p>
                <p class="price">$45.00</p>
                
                <a href="https://store.deadweightdaddy.com/product/dw-neon-gator-tee/" class="btn-add">SHOP NOW</a>
            </div>

            <!-- Product 2: NEON PANTHER TEE -->
            <div class="card">
                <img src="https://store.deadweightdaddy.com/wp-content/uploads/2026/04/DW-NEON-PANTHER-1.png" alt="Deadweight Apparel Neon Panther graphic tee" style="width:100%; margin-bottom:1.5rem;">
                <h3>NEON PANTHER TEE</h3>
                <p class="product-desc" style="font-size:0.8rem; color:#666; margin-bottom:1rem;">X'd out eyes. Fangs bared. A dumbbell in its grip.</p>
                <p class="price">$45.00</p>

                <a href="https://store.deadweightdaddy.com/product/dw-neon-panther-tee/" class="btn-add">SHOP NOW</a>
            </div>

            <!-- Product 3: LIFT HEAVY SHIT TEE -->
            <div class="card">
                <img src="https://store.deadweightdaddy.com/wp-content/uploads/2026/04/DW-45lbs.png" alt="Deadweight Apparel Lift Heavy Shit graphic tee" style="width:100%; margin-bottom:1.5rem;">
                <h3>LIFT HEAVY SHIT TEE</h3>
                <p class="product-desc" style="font-size:0.8rem; color:#666; margin-bottom:1rem;">The only weight that matters. Wear the standard.</p>
                <p class="price">$45.00</p>

                <a href="https://store.deadweightdaddy.com/product/dw-lift-heavy-shit-tee/" class="btn-add">SHOP NOW</a>
            </div>
        </section>
    </main>



    <script>
    </script>
</body>
</html>
`;
