const CONVESIOPAY_CLIENT_KEY = 'pub.v2.SMJVRN9GMVCFMZ65.aHR0cHM6Ly9kZWFkd2VpZ2h0ZGFkZHkuY29t.VKG5_AsQIFV9Z5PYPH2H-pwobuvGzJOvTKec9qLt2p0';
const BACKEND_URL = ''; // Leave empty if same origin, or specify your backend URL

async function initiateCheckout() {
    const checkoutContainer = document.getElementById('checkout-step-2');
    const billingForm = document.getElementById('billing-form');
    
    // 1. Get Customer Info
    const formData = new FormData(billingForm);
    const customer = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email')
    };

    if (!customer.email || !customer.firstName) {
        alert('Please fill in your billing details.');
        return;
    }

    // 2. Hide billing, show loading
    document.getElementById('checkout-step-1').style.display = 'none';
    document.getElementById('checkout-loading').style.display = 'block';

    try {
        // 3. Create Payment Intent via Backend
        const response = await fetch(`${BACKEND_URL}/api/create-payment`, {
            method: 'POST',
            header: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: cart.getTotal(),
                currency: 'USD',
                customer: customer,
                items: cart.items.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    name: item.name
                }))
            })
        });

        const paymentData = await response.json();
        if (paymentData.error) throw new Error(paymentData.error);

        // 4. Initialize ConvesioPay
        const cp = new ConvesioPay(CONVESIOPAY_CLIENT_KEY);
        
        // 5. Create Component
        const checkout = cp.create('checkout', {
            paymentId: paymentData.id, // ID from ConvesioPay API
            appearance: {
                theme: 'dark',
                variables: {
                    colorPrimary: '#FFFFFF',
                    colorBackground: '#1A1A1A',
                    colorText: '#FFFFFF',
                    borderRadius: '0px' // Industrial/Aggressive look
                }
            }
        });

        // 6. Mount
        document.getElementById('checkout-loading').style.display = 'none';
        checkoutContainer.style.display = 'block';
        checkout.mount('#convesiopay-checkout-mount');

        // 7. Handle Events
        checkout.on('payment_success', (event) => {
            console.log('Payment Successful:', event);
            cart.items = [];
            cart.save();
            cart.renderCount();
            window.location.href = '/success.html'; // Or show success message
        });

        checkout.on('payment_error', (event) => {
            console.error('Payment Error:', event);
            alert('Payment failed. Please try again.');
        });

    } catch (error) {
        console.error('Checkout Error:', error);
        alert('Failed to initialize checkout. Please check the console.');
        document.getElementById('checkout-step-1').style.display = 'block';
        document.getElementById('checkout-loading').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkoutBtn = document.getElementById('start-checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            document.getElementById('checkout-overlay').classList.add('active');
            cart.closeCart();
        });
    }

    const nextStepBtn = document.getElementById('next-to-payment');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', (e) => {
            e.preventDefault();
            initiateCheckout();
        });
    }

    document.getElementById('close-checkout')?.addEventListener('click', () => {
        document.getElementById('checkout-overlay').classList.remove('active');
    });
});
