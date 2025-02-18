import React from 'react';
import Head from 'next/head';
import { NextPage } from 'next';

const PrivacyPolicy: NextPage = () => {
  return (
    <>
      <Head>
        <title>Soltrendio - Privacy Policy</title>
        <meta name="description" content="Privacy Policy - Learn how we protect and handle your data" />
      </Head>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">
          Privacy Policy
        </h1>
        
        <p className="text-base mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            1. Introduction
          </h2>
          <p className="text-base mb-4">
            We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we handle your personal data, your privacy rights, and how the law protects you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            2. Information We Collect
          </h2>
          <p className="text-base mb-4">
            We may collect, use, store, and transfer different kinds of personal data about you, including:
          </p>
          <ul className="list-disc pl-8 mb-4">
            <li>Identity Data (name, username)</li>
            <li>Contact Data (email address, phone number)</li>
            <li>Technical Data (IP address, browser type, device information)</li>
            <li>Usage Data (how you use our website)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            3. How We Use Your Information
          </h2>
          <p className="text-base mb-4">
            We use your personal data only when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-8 mb-4">
            <li>To provide and maintain our service</li>
            <li>To notify you about changes to our service</li>
            <li>To provide customer support</li>
            <li>To gather analytics to improve our service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            4. Data Security
          </h2>
          <p className="text-base mb-4">
            We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. We limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            5. Your Rights
          </h2>
          <p className="text-base mb-4">
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
          </p>
          <ul className="list-disc pl-8 mb-4">
            <li>Request access to your personal data</li>
            <li>Request correction of your personal data</li>
            <li>Request erasure of your personal data</li>
            <li>Object to processing of your personal data</li>
            <li>Request restriction of processing your personal data</li>
            <li>Request transfer of your personal data</li>
            <li>Right to withdraw consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            6. Cookies
          </h2>
          <p className="text-base mb-4">
            We use cookies and similar tracking technologies to track activity on our service and hold certain information. Cookies are files with a small amount of data which may include an anonymous &quot;unique identifier.&quot;
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            7. Changes to This Privacy Policy
          </h2>
          <p className="text-base mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date at the top of this Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            8. Contact Us
          </h2>
          <p className="text-base mb-4">
            If you have any questions about this Privacy Policy, you can contact us:
          </p>
          <p className="text-base mb-4">
            By email: privacy@example.com
          </p>
        </section>
      </div>
    </>
  );
};

export default PrivacyPolicy;
