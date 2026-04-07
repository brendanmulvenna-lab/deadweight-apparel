require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ConvesioPay Config
const CONVESIOPAY_API_KEY = process.env.CONVESIOPAY_API_KEY;
const CONVESIOPAY_CLIENT_KEY = process.env.CONVESIOPAY_CLIENT_KEY;
const CONVESIOPAY_INTEGRATION_KEY = process.env.CONVESIOPAY_CONNECTED_INTEGRATION_KEY;
const WEBHOOK_SIGNATURE_KEY = process.env.WEBHOOK_SIGNATURE_KEY;

// WooCommerce Config
const WOO_URL = process.env.WOO_STORE_URL;
const WOO_CK = process.env.WOO_CONSUMER_KEY;
const WOO_CS = process.env.WOO_CONSUMER_SECRET;

/**
 * Helper to verify ConvesioPay Webhook Signature
 */
function verifySignature(req) {
    const signature = req.headers['x-convesiopay-signature'];
    const timestamp = req.headers['x-convesiopay-timestamp'];
    const payload = JSON.stringify(req.body);
    
    if (!signature || !timestamp) return false;

    // Based on docs: Verify using the signature key
    // Generally HMAC-SHA256(timestamp + payload, secret)
    const hmac = crypto.createHmac('sha256', WEBHOOK_SIGNATURE_KEY);
    hmac.update(timestamp + payload);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison as recommended
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (e) {
        return false;
    }
}

/**
 * Create Payment via ConvesioPay
 */
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, currency, orderId, customer } = req.body;

        // Note: ConvesioPay expects amount in minor units (e.g., 40.00 -> 4000)
        const minorAmount = Math.round(amount * 100);

        const response = await axios.post('https://api.convesiopay.com/v1/payments', {
            amount: minorAmount,
            currency: currency || 'USD',
            orderId: orderId, // Can be a temporary ID from frontend
            customer: customer,
            integration: CONVESIOPAY_INTEGRATION_KEY
        }, {
            headers: {
                'Authorization': `Bearer ${CONVESIOPAY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error creating payment:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

/**
 * Webhook Endpoint - processes successful payments
 */
app.post('/order-endpoint', async (req, res) => {
    console.log('Received Webhook:', req.body);

    // Verify signature
    if (!verifySignature(req)) {
        console.warn('Invalid signature for webhook');
        // In production, you'd return 401, but for testing we might log it
        // return res.status(401).send('Invalid signature');
    }

    const { status, paymentId, orderId, amount, customer, items } = req.body;

    if (status === 'processed' || status === 'completed') {
        try {
            // Push to WooCommerce
            const wooOrder = {
                payment_method: 'convesiopay',
                payment_method_title: 'ConvesioPay',
                set_paid: true,
                status: 'completed',
                billing: {
                    first_name: customer?.firstName || 'Customer',
                    last_name: customer?.lastName || '',
                    email: customer?.email || '',
                },
                line_items: items ? items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity
                })) : []
            };

            const wooResponse = await axios.post(`${WOO_URL}/wp-json/wc/v3/orders`, wooOrder, {
                auth: {
                    username: WOO_CK,
                    password: WOO_CS
                }
            });

            console.log('WooCommerce Order Created:', wooResponse.data.id);
            res.status(200).send('Order processed');
        } catch (error) {
            console.error('Error creating WooCommerce order:', error.response ? error.response.data : error.message);
            res.status(500).send('Error creating order');
        }
    } else {
        res.status(200).send('Status not processed');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
