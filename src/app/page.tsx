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
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900">
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
