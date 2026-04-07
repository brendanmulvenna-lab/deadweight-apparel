var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-eAmFWS/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(HTML_CONTENT, { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/api/create-payment" && request.method === "POST") {
      try {
        const body = await request.json();
        const res = await fetch(`https://api.convesiopay.com/v1/payments?integration=${env.CONVESIOPAY_CONNECTED_INTEGRATION_KEY}`, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.CONVESIOPAY_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: Math.round(body.amount * 100),
            currency: "USD",
            customer: body.customer
          })
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: res.status,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }
    if (url.pathname === "/order-endpoint" && request.method === "POST") {
      const payload = await request.text();
      const data = JSON.parse(payload);
      if (data.status === "processed" || data.status === "completed") {
        await fetch(env.WOO_STORE_URL + "/wp-json/wc/v3/orders", {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(env.WOO_CONSUMER_KEY + ":" + env.WOO_CONSUMER_SECRET),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            payment_method: "convesiopay",
            set_paid: true,
            status: "completed",
            billing: { first_name: data.customer?.firstName, email: data.customer?.email },
            line_items: data.items?.map((i) => ({ product_id: i.productId, quantity: i.quantity }))
          })
        });
      }
      return new Response("OK");
    }
    return new Response("Not Found", { status: 404 });
  }
};
var HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DEADWEIGHT | Industrial Strength Gym Apparel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;900&display=swap" rel="stylesheet">
    <script src="https://js.convesiopay.com/v1/"><\/script>
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

        #cart-sidebar { 
            position: fixed; right: -450px; top: 0; width: 450px; height: 100vh; 
            background: #080808; border-left: 2px solid var(--neon); z-index: 2000; 
            padding: 3rem; transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1); 
            display: flex; flex-direction: column; 
        }
        #cart-sidebar.active { right: 0; }
        .sidebar-title { font-family: var(--font-impact); font-size: 3rem; border-bottom: 1px solid #333; padding-bottom: 1rem; }
        #cart-list { flex: 1; margin: 2rem 0; overflow-y: auto; }
        .total-row { font-size: 2.5rem; font-family: var(--font-impact); color: var(--neon); margin-bottom: 2rem; }
        .btn-checkout { width: 100%; padding: 1.5rem; background: var(--neon); border: none; font-family: var(--font-impact); font-size: 2rem; cursor: pointer; }

        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: none; align-items: center; justify-content: center; }
        .modal { background: #0A0A0A; border: 2px solid var(--neon); padding: 4rem; width: 95%; max-width: 550px; position: relative; }
        .billing-form { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem; }
        .billing-form input { background: #111; border: 1px solid #333; padding: 1.2rem; color: white; font-size: 1rem; }
        .billing-form input:focus { border-color: var(--neon); outline: none; }
        #close-modal { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 2rem; cursor: pointer; }

        @media (max-width: 768px) { #cart-sidebar { width: 100%; right: -100%; } .hero-title { font-size: 6rem; } }
    </style>
</head>
<body>
    <header>
        <div class="logo-text">DEADWEIGHT</div>
        <div class="cart-trigger" id="open-cart">CART (<span class="cart-count">0</span>)</div>
    </header>

    <main>
        <section class="hero">
            <div>
                <h1 class="hero-title">SURVIVE<br/>THE GRIND</h1>
                <a href="#shop" class="btn-add" style="display:inline-block; width:auto; padding: 1rem 3rem;">EQUIP NOW</a>
            </div>
        </section>

        <section id="shop" class="grid">
            <div class="card">
                <h3>GATOR SHIELD TEE</h3>
                <p class="price">$40.00</p>
                <button class="btn-add add-to-cart" data-id="GATOR01" data-name="GATOR SHIELD TEE" data-price="40.00">ADD TO ARSENAL</button>
            </div>
            <div class="card">
                <h3>PANTHER XX TEE</h3>
                <p class="price">$40.00</p>
                <button class="btn-add add-to-cart" data-id="PANTHER01" data-name="PANTHER XX TEE" data-price="40.00">ADD TO ARSENAL</button>
            </div>
            <div class="card">
                <h3>45LB PLATE TEE</h3>
                <p class="price">$40.00</p>
                <button class="btn-add add-to-cart" data-id="PLATE01" data-name="45LB PLATE TEE" data-price="40.00">ADD TO ARSENAL</button>
            </div>
        </section>
    </main>

    <div id="cart-sidebar">
        <h2 class="sidebar-title">ARSENAL</h2>
        <div id="cart-list"></div>
        <div class="total-row">TOTAL: <span id="cart-total">$0.00</span></div>
        <button class="btn-checkout" id="init-checkout">TRANSACT</button>
        <button style="background:none; border:none; color:#555; margin-top:1rem; cursor:pointer;" id="close-cart">CLOSE</button>
    </div>

    <div class="overlay" id="checkout-overlay">
        <div class="modal">
            <button id="close-modal">&times;</button>
            <h2 style="font-family:var(--font-impact); font-size:2.5rem;">BILLING INFO</h2>
            <div id="step-1">
                <form id="billing-form" class="billing-form">
                    <input type="text" name="firstName" placeholder="FIRST NAME" required>
                    <input type="email" name="email" placeholder="EMAIL ADDRESS" required>
                    <button type="submit" class="btn-checkout">CONNECT TO GATEWAY</button>
                </form>
            </div>
            <div id="step-2" style="display:none; margin-top:2rem;">
                <div id="cp-mount"></div>
            </div>
        </div>
    </div>

    <script>
        const cart = {
            items: JSON.parse(localStorage.getItem('dw_cart')) || [],
            save() { localStorage.setItem('dw_cart', JSON.stringify(this.items)); this.render(); },
            add(item) {
                const existing = this.items.find(i => i.id === item.id);
                if(existing) existing.qty++; else this.items.push({...item, qty: 1});
                this.save();
                this.open();
            },
            render() {
                const count = this.items.reduce((a, b) => a + b.qty, 0);
                document.querySelectorAll('.cart-count').forEach(c => c.textContent = count);
                document.getElementById('cart-list').innerHTML = this.items.map(i => \`
                    <div style="display:flex; justify-content:space-between; padding:1rem 0; border-bottom:1px solid #222;">
                        <div><strong>\${i.name}</strong><br/>$\${i.price.toFixed(2)} x \${i.qty}</div>
                        <div style="font-weight:900;">$\${(i.price * i.qty).toFixed(2)}</div>
                    </div>
                \`).join('');
                const total = this.items.reduce((a, b) => a + (i.price * i.qty), 0); // Wait, bug here!
                document.getElementById('cart-total').textContent = '$' + this.items.reduce((a,b) => a + (b.price*b.qty), 0).toFixed(2);
            },
            open() { document.getElementById('cart-sidebar').classList.add('active'); },
            close() { document.getElementById('cart-sidebar').classList.remove('active'); }
        };

        document.querySelectorAll('.add-to-cart').forEach(btn => btn.onclick = () => {
            cart.add({ id: btn.dataset.id, name: btn.dataset.name, price: parseFloat(btn.dataset.price) });
        });
        document.getElementById('open-cart').onclick = () => cart.open();
        document.getElementById('close-cart').onclick = () => cart.close();
        document.getElementById('close-modal').onclick = () => document.getElementById('checkout-overlay').style.display = 'none';

        document.getElementById('init-checkout').onclick = () => {
            if(cart.items.length === 0) return alert('Arsenal empty.');
            document.getElementById('checkout-overlay').style.display = 'flex';
            cart.close();
        };

        document.getElementById('billing-form').onsubmit = async (e) => {
            e.preventDefault();
            const customer = { firstName: e.target.firstName.value, email: e.target.email.value };
            const amount = cart.items.reduce((a,b) => a + (b.price*b.qty), 0);
            
            e.target.innerText = 'CONNECTING...';
            e.target.disabled = true;

            const res = await fetch('/api/create-payment', {
                method: 'POST',
                body: JSON.stringify({ amount, customer })
            });
            const data = await res.json();
            
            const cp = new ConvesioPay('pub.v2.SMJVRN9GMVCFMZ65.aHR0cHM6Ly9kZWFkd2VpZ2h0ZGFkZHkuY29t.VKG5_AsQIFV9Z5PYPH2H-pwobuvGzJOvTKec9qLt2p0');
            const checkout = cp.create('checkout', { paymentId: data.id, appearance: { theme: 'dark' } });
            
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
            checkout.mount('#cp-mount');

            checkout.on('payment_success', () => {
                alert('TRANSACTION SUCCESSFUL. ARSENAL RESTOCKED.');
                cart.items = []; cart.save(); window.location.reload();
            });
        };

        cart.render();
    <\/script>
</body>
</html>
`;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-eAmFWS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-eAmFWS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
