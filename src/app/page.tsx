'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  HardHat,
  Target,
  Users,
  Calculator,
  Bot,
  Clock,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <span className="text-left font-semibold text-slate-100">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-primary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-slate-800/30">
          <p className="text-slate-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-28">
            <div className="flex items-center space-x-5">
              <Image
                src="/logo.png"
                alt="Boston Builders AI Logo"
                width={80}
                height={80}
                className="object-contain"
              />
              <span className="text-3xl font-bold text-white">Boston Builders AI</span>
            </div>
            <a
              href="#pricing"
              className="px-10 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors text-xl"
            >
              Apply Now
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-50"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Urgency Banner */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/30 rounded-full px-6 py-2 mb-8">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-primary font-semibold">Limited Availability</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Custom Software for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                Contractors
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              Built by someone who understands your business. Get a complete operating system
              tailored to your trade in 3 weeks.
            </p>

            {/* Spots Available */}
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300 font-semibold">Spots Available</span>
                  <span className="text-primary font-bold">3 of 5 Remaining</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-orange-400 h-full rounded-full transition-all duration-500"
                    style={{ width: '40%' }}
                  ></div>
                </div>
                <p className="text-sm text-slate-400 mt-3">
                  2 clients onboarded, 3 spots left
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a
                href="#pricing"
                className="px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors flex items-center space-x-2 text-lg"
              >
                <span>Get Started - $2,000/mo</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#video"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors border border-slate-700"
              >
                Watch Demo
              </a>
            </div>

            {/* Trades Served */}
            <div className="mt-12 pt-8 border-t border-slate-800">
              <p className="text-sm text-slate-400 mb-4 uppercase tracking-wider">
                Built for These Trades
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  'Spray Foam',
                  'Stucco',
                  'Roofing',
                  'Siding',
                  'Carpentry',
                  'Solar',
                  'General Contracting',
                  'Landscaping',
                ].map((trade) => (
                  <span
                    key={trade}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-full text-sm border border-slate-700"
                  >
                    {trade}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-slate-300">
              Watch how Boston Builders AI transforms your workflow
            </p>
          </div>
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
            <iframe
              src="YOUR_VIDEO_URL_HERE"
              title="Boston Builders AI Demo"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              A complete operating system built specifically for contractors
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Lead Hunter */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Lead Hunter</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Track building permits in your area with a custom interface. We teach you how to
                access city data sources, with optional scrapers available as add-ons.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Custom tracking dashboard</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Manual data entry workflow</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Automated scrapers available</span>
                </li>
              </ul>
            </div>

            {/* CRM */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">CRM</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Manage your leads, clients, and projects in one place. Built for the way
                contractors actually work.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Lead pipeline management</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Contact & project tracking</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Communication history</span>
                </li>
              </ul>
            </div>

            {/* Estimating Tools */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Estimating Tools</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Create accurate estimates quickly with tools built for your specific trade and
                pricing structure.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Custom pricing templates</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Material cost tracking</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Proposal generation</span>
                </li>
              </ul>
            </div>

            {/* AI Assistant */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Assistant</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Smart automation and insights to help you work faster and make better decisions.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Email drafting & responses</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Data analysis & insights</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Task automation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Journey to Custom Software
            </h2>
            <p className="text-xl text-slate-300">From discovery to launch in just 3 weeks</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Week 1 */}
            <div className="relative">
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-primary font-bold text-lg">Week 1</span>
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Discovery</h3>
                <p className="text-slate-300 leading-relaxed">
                  Deep dive into your business processes, pain points, and goals. We map out
                  exactly what you need.
                </p>
              </div>
            </div>

            {/* Week 2-3 */}
            <div className="relative md:col-span-2">
              <div className="bg-slate-900 rounded-xl p-6 border border-primary/50 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-primary font-bold text-lg">Week 2-3</span>
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Build</h3>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Rapid development of your custom software. Weekly check-ins to ensure we&apos;re
                  building exactly what you need.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Core features development</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Your feedback incorporated</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Testing & refinement</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Week 4 */}
            <div className="relative">
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-primary font-bold text-lg">Week 4+</span>
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Launch & Support</h3>
                <p className="text-slate-300 leading-relaxed">
                  Go live with your new system. Ongoing support and iterations included for the
                  duration of your commitment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Who This Is For</h2>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 md:p-12 border border-slate-700">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Contractors Doing $500k+ in Revenue
                  </h3>
                  <p className="text-slate-300">
                    You&apos;ve proven your business model, now it&apos;s time to scale with
                    proper systems.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Growing Teams That Need Better Organization
                  </h3>
                  <p className="text-slate-300">
                    Generic tools don&apos;t fit your trade. You need something built for how you
                    actually work.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Businesses Ready to Invest in Growth
                  </h3>
                  <p className="text-slate-300">
                    You understand that the right software is an investment, not an expense. You're
                    committed to improving your operations.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Leaders Who Value Quality Over Quick Fixes
                  </h3>
                  <p className="text-slate-300">
                    You want a long-term partner who understands construction, not a developer who
                    treats you like ticket #47.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-4">
              Case Study
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Solar Señorita: Complete System in 3 Days
            </h2>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 md:p-12 border border-primary/30">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">3 Days</div>
                <div className="text-slate-300">From Start to Launch</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">100%</div>
                <div className="text-slate-300">Custom Built</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">Solar</div>
                <div className="text-slate-300">Industry Vertical</div>
              </div>
            </div>

            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p>
                Solar Señorita needed a complete operating system to manage their growing solar
                installation business. Within just 3 days, we delivered a fully functional system
                including:
              </p>

              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    Custom lead tracking system integrated with local permit databases
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>Project management dashboard tailored to solar installations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>Automated estimating tools with solar-specific calculations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>Client portal for proposal reviews and approvals</span>
                </li>
              </ul>

              <p className="italic border-l-4 border-primary pl-4 py-2">
                &quot;Jorge understood our business from day one because he&apos;s been in
                construction. He didn&apos;t just build software—he built a system that thinks like
                a contractor.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Jorge */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built by Someone Who Gets It
            </h2>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 md:p-12 border border-slate-700">
            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p className="text-xl text-white font-semibold">
                Hi, I&apos;m Jorge Betancur. I spent 7 years in construction before I learned to
                code.
              </p>

              <p>
                I started as a laborer and worked my way up to General Manager, running crews and
                managing multimillion-dollar projects. I know what it&apos;s like to wake up at 5
                AM, juggle multiple job sites, chase down leads, and try to keep everything
                organized with spreadsheets and sticky notes.
              </p>

              <p>
                When I learned to code, everything changed. I realized I could build the exact
                tools I wished I had when I was running projects. Not generic software that tries
                to work for everyone and ends up working for no one. But custom systems built for
                the way contractors actually work.
              </p>

              <p>
                That&apos;s why I&apos;m only taking on 5 clients. I&apos;m not trying to scale
                this into a SaaS platform. I want to work directly with contractors who are serious
                about building better systems, just like I was serious about building better
                projects.
              </p>

              <div className="pt-6 border-t border-slate-700">
                <p className="text-lg text-white font-semibold mb-2">My Background:</p>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span>7 years in construction (laborer to GM)</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span>Self-taught developer specializing in business automation</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span>Built systems for spray foam, solar, and general contractors</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-300">
              Quality development takes time. That&apos;s why we work together for 3 months.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Main Pricing */}
            <div className="bg-gradient-to-br from-primary/10 to-slate-900 rounded-xl p-8 border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-white mb-2">$2,000</div>
                <div className="text-slate-300">per month</div>
                <div className="text-sm text-slate-400 mt-2">3-month commitment</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">
                    Complete custom operating system for your business
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">Lead Hunter, CRM, Estimating, AI Assistant</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">3-week delivery timeline</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">
                    Ongoing support & iterations for 3 months
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">Weekly check-ins & updates</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">Training & documentation included</span>
                </li>
              </ul>

              <a
                href="#contact"
                className="block w-full text-center px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors"
              >
                Apply Now
              </a>
            </div>

            {/* Add-ons */}
            <div className="bg-slate-900 rounded-xl p-8 border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-6">Optional Add-Ons</h3>

              <div className="space-y-6">
                <div className="pb-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">Plans Takeoff Service</h4>
                    <span className="text-primary font-bold">$80/plan</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Professional quantity takeoffs from construction plans. Get accurate material
                    counts for your estimates.
                  </p>
                </div>

                <div className="pb-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">Custom Scrapers</h4>
                    <span className="text-primary font-bold">Custom Quote</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Automated data collection from city permit databases and other sources. Pricing
                    based on complexity and data sources.
                  </p>
                </div>

                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">Additional Features</h4>
                    <span className="text-primary font-bold">Custom Quote</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Need something specific to your trade or workflow? Let&apos;s discuss custom
                    features and integrations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 text-sm">
              * 3-month minimum commitment. Month-to-month after initial period. Cancel anytime
              with 30 days notice.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="Why only 5 clients?"
              answer="Quality over quantity. Each client gets a completely custom system built specifically for their business. I work directly with you throughout the entire process, and I can only do that well with a limited number of clients. This isn't a template or SaaS product—it's custom software development with a partner who understands construction."
            />

            <FAQItem
              question="What if I need changes after the initial 3 weeks?"
              answer="That's exactly what the 3-month commitment is for. The first 3 weeks gets you up and running, but we continue iterating and improving based on how you actually use the system. Most clients discover features they need once they start using the software in their daily operations. All iterations and improvements are included during your commitment period."
            />

            <FAQItem
              question="Do I own the software?"
              answer="Yes. At the end of your commitment period, you own the code and can host it yourself or continue with our hosting and support services. There are no additional licensing fees for the core system we build together."
            />

            <FAQItem
              question="Can the Lead Hunter automatically pull permit data?"
              answer="The Lead Hunter provides the tracking interface and teaches you how to access city permit databases. Automated scrapers are available as add-ons because each city has different systems and data structures. We'll discuss your specific needs during discovery and provide a custom quote for automated data collection if needed."
            />

            <FAQItem
              question="What happens after the 3-month commitment?"
              answer="You can continue month-to-month for ongoing support, new features, and hosting. Or you can take the software and host it yourself. Many clients choose to continue because they want ongoing development and support as their business evolves. Cancel anytime with 30 days notice."
            />

            <FAQItem
              question="How is this different from other contractor software?"
              answer="Most contractor software is built by developers who have never swung a hammer. They create generic tools that try to serve everyone and end up serving no one well. I spent 7 years in construction before learning to code. I build software the way I wish someone had built it for me when I was running projects. Plus, this is completely custom—built for your trade, your workflow, your business."
            />

            <FAQItem
              question="What if my trade isn't listed?"
              answer="The trades listed are examples. If you're a contractor doing $500k+ in revenue with complex operations that need better systems, I want to talk to you. Every trade has unique workflows and pain points. That's why the software is custom-built rather than a one-size-fits-all solution. Schedule a call and let's discuss your specific needs."
            />
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50 border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Build Your System?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Let&apos;s talk about your business and how custom software can help you scale.
            </p>
            <a
              href="mailto:contact@bostonbuildersai.com"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors text-lg"
            >
              <Mail className="w-5 h-5" />
              <span>Schedule a Call</span>
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Email</h3>
              <p className="text-slate-300">contact@bostonbuildersai.com</p>
            </div>
            <div className="text-center">
              <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Phone</h3>
              <p className="text-slate-300">(XXX) XXX-XXXX</p>
            </div>
            <div className="text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Location</h3>
              <p className="text-slate-300">Boston, MA</p>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Boston Builders AI</span>
              </div>
              <p className="text-slate-400 text-sm">
                &copy; {new Date().getFullYear()} Boston Builders AI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
