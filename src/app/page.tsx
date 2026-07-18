import React from 'react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import ProblemSolution from '@/components/landing/ProblemSolution';
import Features from '@/components/landing/Features';
import TargetAudience from '@/components/landing/TargetAudience';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent/20 selection:text-accent">
      {/* Bande kenté signature */}
      <div className="kente-band sticky top-0 z-50" />
      <Navbar />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <TargetAudience />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
