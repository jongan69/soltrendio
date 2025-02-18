import React from 'react';
import Head from 'next/head';
import { NextPage } from 'next';

const SupportPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Soltrendio - Support</title>
        <meta name="description" content="Get help and support for Soltrendio - We're here to help you succeed" />
      </Head>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">
          Support Center
        </h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Need Help?
          </h2>
          <p className="text-base mb-6">
            We&apos;re here to help you with any questions or issues you might have. Browse through our resources below or contact our support team directly.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Email Support</h3>
              <p className="mb-3">For detailed inquiries and personal assistance</p>
              <a href="mailto:support@soltrendio.com" className="text-blue-600 hover:text-blue-800">
                support@soltrendio.com
              </a>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Discord Community</h3>
              <p className="mb-3">Join our community for real-time support</p>
              <a href="https://t.me/soltrendioportal" className="text-blue-600 hover:text-blue-800">
                Join Telegram
              </a>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">How do I get started with Soltrendio?</h3>
              <p className="text-base">
                Getting started is easy! Simply connect your Solana wallet, deposit funds, and you can begin trading. Check out our detailed guide for more information.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">What are the trading fees?</h3>
              <p className="text-base">
                We maintain competitive trading fees starting at 0.1%. Volume-based discounts are available for active traders.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">How secure is Soltrendio?</h3>
              <p className="text-base">
                Security is our top priority. We implement industry-standard security measures and regular audits to ensure your assets are safe.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">How can I recover my account?</h3>
              <p className="text-base">
                Your account is linked to your Solana wallet. Simply connect your wallet to regain access to your account.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Resources
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <a href="/docs" className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Documentation</h3>
              <p className="text-base">Detailed guides and API documentation</p>
            </a>
            <a href="/tutorials" className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Tutorials</h3>
              <p className="text-base">Step-by-step guides and video tutorials</p>
            </a>
            <a href="/blog" className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Blog</h3>
              <p className="text-base">Latest updates and trading tips</p>
            </a>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Still Need Help?
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-base mb-4">
              Can&apos;t find what you&apos;re looking for? Our support team is available 24/7 to help you with any questions or concerns.
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Contact Support
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default SupportPage;
