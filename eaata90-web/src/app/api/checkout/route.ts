import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fake', {
    // @ts-ignore: Bypass strict literal checks for api version
    apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
    try {
        const origin = req.headers.get('origin') || 'http://localhost:3000';

        // Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'EAATA 90 Advanced Diagnostic Machine',
                            description: 'Professional hardware with remote BCI/VCI support from Jesus Teran.',
                            images: ['https://eaata90.com/eaata90-3.jpeg'], // Fallback if domain is up
                        },
                        unit_amount: 160000, // $1600.00 in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/?success=true`,
            cancel_url: `${origin}/?canceled=true`,
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US'], // Free US Shipping
            }
        });

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (err: any) {
        console.error('Error creating checkout session:', err);
        return NextResponse.json(
            { error: { message: err.message } },
            { status: 500 }
        );
    }
}
