class Cart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('deadweight_cart')) || [];
        this.renderCount();
    }

    addItem(product) {
        // Use a composite key to distinguish between same product, different sizes
        const cartId = `${product.id}_${product.size}`;
        const existing = this.items.find(i => (i.cartId || `${i.id}_${i.size}`) === cartId);
        
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({ ...product, cartId, quantity: 1 });
        }
        this.save();
        this.render();
        this.renderCount();
        this.openCart();
    }

    removeItem(cartId) {
        this.items = this.items.filter(i => (i.cartId || `${i.id}_${i.size}`) !== cartId);
        this.save();
        this.render();
        this.renderCount();
    }

    updateQuantity(cartId, quantity) {
        const item = this.items.find(i => (i.cartId || `${i.id}_${i.size}`) === cartId);
        if (item) {
            item.quantity = Math.max(1, quantity);
            this.save();
            this.render();
            this.renderCount();
        }
    }

    save() {
        localStorage.setItem('deadweight_cart', JSON.stringify(this.items));
    }

    getTotal() {
        return this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }

    renderCount() {
        const counts = document.querySelectorAll('.cart-count');
        const totalItems = this.items.reduce((acc, item) => acc + item.quantity, 0);
        counts.forEach(c => c.textContent = totalItems);
    }

    render() {
        const list = document.getElementById('cart-items-list');
        if (!list) return;

        if (this.items.length === 0) {
            list.innerHTML = '<p class="empty-msg">Your arsenal is empty.</p>';
            document.getElementById('cart-total-price').textContent = '$0.00';
            return;
        }

        list.innerHTML = this.items.map(item => {
            const cartId = item.cartId || `${item.id}_${item.size}`;
            return `
            <div class="cart-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p class="item-size-display">SIZE: ${item.size || 'N/A'}</p>
                    <p>$${item.price.toFixed(2)}</p>
                </div>
                <div class="item-controls">
                    <button onclick="cart.updateQuantity('${cartId}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="cart.updateQuantity('${cartId}', ${item.quantity + 1})">+</button>
                    <button class="remove-btn" onclick="cart.removeItem('${cartId}')">REMOVE</button>
                </div>
            </div>
            `;
        }).join('');

        document.getElementById('cart-total-price').textContent = `$${this.getTotal().toFixed(2)}`;
    }

    openCart() {
        document.getElementById('cart-sidebar').classList.add('active');
        document.getElementById('cart-overlay').classList.add('active');
    }

    closeCart() {
        document.getElementById('cart-sidebar').classList.remove('active');
        document.getElementById('cart-overlay').classList.remove('active');
    }
}

const cart = new Cart();

document.addEventListener('DOMContentLoaded', () => {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const product = {
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: parseFloat(btn.dataset.price),
                size: btn.dataset.size || 'S' // Default to S if not set
            };
            cart.addItem(product);
        });
    });

    // Close cart triggers
    document.getElementById('close-cart')?.addEventListener('click', () => cart.closeCart());
    document.getElementById('cart-overlay')?.addEventListener('click', () => cart.closeCart());
});
