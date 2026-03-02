'use client';

export default function CheckoutButton({ className = "" }: { className?: string }) {
    // Enlace real provisto por Jesús Terán
    const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/bJe00je1td2w2s53plaVa00";

    return (
        <a
            href={STRIPE_PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
        >
            🟢 ORDER NOW
        </a>
    );
}
