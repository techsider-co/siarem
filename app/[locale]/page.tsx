"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  ArrowRight,
  Play,
  Zap,
  Users,
  BarChart3,
  FileText,
  FolderKanban,
  Shield,
  TrendingUp,
  Check,
  Star,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useState } from "react";

export default function LandingPage() {
  const t = useTranslations("Landing");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = [
    {
      icon: Sparkles,
      title: t("feature_ai_title"),
      desc: t("feature_ai_desc"),
      gradient: "from-blue-500 to-cyan-400",
    },
    {
      icon: Users,
      title: t("feature_crm_title"),
      desc: t("feature_crm_desc"),
      gradient: "from-purple-500 to-pink-400",
    },
    {
      icon: BarChart3,
      title: t("feature_finance_title"),
      desc: t("feature_finance_desc"),
      gradient: "from-green-500 to-emerald-400",
    },
    {
      icon: FolderKanban,
      title: t("feature_projects_title"),
      desc: t("feature_projects_desc"),
      gradient: "from-orange-500 to-amber-400",
    },
    {
      icon: FileText,
      title: t("feature_contracts_title"),
      desc: t("feature_contracts_desc"),
      gradient: "from-red-500 to-rose-400",
    },
    {
      icon: TrendingUp,
      title: t("feature_analytics_title"),
      desc: t("feature_analytics_desc"),
      gradient: "from-indigo-500 to-violet-400",
    },
  ];

  const steps = [
    {
      number: "01",
      title: t("how_step1_title"),
      desc: t("how_step1_desc"),
    },
    {
      number: "02",
      title: t("how_step2_title"),
      desc: t("how_step2_desc"),
    },
    {
      number: "03",
      title: t("how_step3_title"),
      desc: t("how_step3_desc"),
    },
  ];

  const plans = [
    {
      name: t("plan_starter_name"),
      price: t("plan_starter_price"),
      desc: t("plan_starter_desc"),
      features: [
        t("plan_starter_f1"),
        t("plan_starter_f2"),
        t("plan_starter_f3"),
        t("plan_starter_f4"),
        t("plan_starter_f5"),
      ],
      popular: false,
    },
    {
      name: t("plan_pro_name"),
      price: t("plan_pro_price"),
      desc: t("plan_pro_desc"),
      features: [
        t("plan_pro_f1"),
        t("plan_pro_f2"),
        t("plan_pro_f3"),
        t("plan_pro_f4"),
        t("plan_pro_f5"),
        t("plan_pro_f6"),
      ],
      popular: true,
    },
    {
      name: t("plan_enterprise_name"),
      price: t("plan_enterprise_price"),
      desc: t("plan_enterprise_desc"),
      features: [
        t("plan_enterprise_f1"),
        t("plan_enterprise_f2"),
        t("plan_enterprise_f3"),
        t("plan_enterprise_f4"),
        t("plan_enterprise_f5"),
        t("plan_enterprise_f6"),
      ],
      popular: false,
      isEnterprise: true,
    },
  ];

  const testimonials = [
    {
      text: t("testimonial_1_text"),
      name: t("testimonial_1_name"),
      role: t("testimonial_1_role"),
      avatar: "AY",
    },
    {
      text: t("testimonial_2_text"),
      name: t("testimonial_2_name"),
      role: t("testimonial_2_role"),
      avatar: "ZK",
    },
    {
      text: t("testimonial_3_text"),
      name: t("testimonial_3_name"),
      role: t("testimonial_3_role"),
      avatar: "MD",
    },
  ];

  const faqs = [
    { q: t("faq_1_q"), a: t("faq_1_a") },
    { q: t("faq_2_q"), a: t("faq_2_a") },
    { q: t("faq_3_q"), a: t("faq_3_a") },
    { q: t("faq_4_q"), a: t("faq_4_a") },
    { q: t("faq_5_q"), a: t("faq_5_a") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-hidden">
      <LandingNavbar />

      {/* ========== HERO SECTION ========== */}
      <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] dark:bg-primary/10" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] dark:bg-secondary/10" />
          {/* Grid Pattern - Only visible in light mode */}
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {t("hero_badge")}
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-up stagger-1">
              {t("hero_title_1")}{" "}
              <span className="gradient-text">{t("hero_title_gradient")}</span>{" "}
              {t("hero_title_2")}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up stagger-2">
              {t("hero_subtitle")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up stagger-3">
              <Link href="/login">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  {t("cta_start")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full"
              >
                <Play className="mr-2 h-5 w-5" />
                {t("cta_demo")}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-up stagger-4">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <AnimatedCounter end={2500} duration={2000} suffix="+" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("hero_stats_customers")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <AnimatedCounter end={50} duration={2000} prefix="₺" suffix="M+" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("hero_stats_revenue")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <AnimatedCounter end={99.9} duration={2000} suffix="%" decimals={1} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("hero_stats_satisfaction")}
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-16 relative mx-auto max-w-5xl animate-scale-in stagger-5">
              <div className="relative rounded-2xl border border-border bg-card/50 dark:bg-slate-900/50 shadow-2xl overflow-hidden backdrop-blur-sm">
                {/* Top Bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 dark:bg-slate-800/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-muted dark:bg-slate-700 text-xs text-muted-foreground">
                      app.unalisi.com
                    </div>
                  </div>
                </div>
                {/* Preview Content */}
                <div className="aspect-[16/9] bg-gradient-to-br from-muted/50 to-muted dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-muted-foreground">Dashboard Preview</p>
                  </div>
                </div>
                {/* Glow Effect */}
                <div className="absolute -inset-px bg-gradient-to-r from-primary/50 via-transparent to-secondary/50 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TRUSTED BY / LOGOS ========== */}
      <section className="py-12 lg:py-16 border-y border-border bg-muted/30 dark:bg-slate-900/30">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-sm text-muted-foreground mb-8">
            {t("trusted_subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16 opacity-60">
            {["Quaflow", "TasarlatDNS", "Quaflow", "TasarlatDNS", "Quaflow"].map(
              (company) => (
                <div
                  key={company}
                  className="text-xl md:text-2xl font-bold text-muted-foreground/50"
                >
                  {company}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              {t("features_badge")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t("features_title")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("features_subtitle")}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-2xl border border-border bg-card hover:bg-accent/50 dark:hover:bg-slate-800/50 transition-all duration-300 feature-card"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
                {/* Hover Glow */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-20 lg:py-32 bg-muted/30 dark:bg-slate-900/30">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              {t("how_badge")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t("how_title")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("how_subtitle")}</p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {/* Number */}
                <div className="text-7xl lg:text-8xl font-black text-primary/10 dark:text-primary/5 mb-4">
                  {step.number}
                </div>
                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 -mt-10">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.desc}</p>
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              {t("pricing_badge")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t("pricing_title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("pricing_subtitle")}
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1 rounded-full bg-muted border border-border">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing_monthly")}
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === "yearly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing_yearly")}
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs">
                  {t("pricing_yearly_save")}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl border transition-all ${
                  plan.popular
                    ? "border-primary bg-primary/5 dark:bg-primary/10 pricing-popular shadow-xl"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {t("pricing_popular")}
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.desc}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {!plan.isEnterprise && (
                      <span className="text-lg text-muted-foreground">
                        {t("pricing_currency")}
                      </span>
                    )}
                    <span className="text-4xl lg:text-5xl font-bold">
                      {plan.price}
                    </span>
                    {!plan.isEnterprise && (
                      <span className="text-muted-foreground">
                        {t("pricing_period")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/login">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.isEnterprise
                      ? t("pricing_contact")
                      : t("pricing_cta")}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS SECTION ========== */}
      <section
        id="testimonials"
        className="py-20 lg:py-32 bg-muted/30 dark:bg-slate-900/30"
      >
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              {t("testimonials_badge")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t("testimonials_title")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("testimonials_subtitle")}
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border border-border bg-card testimonial-card"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-foreground/90 mb-6 leading-relaxed">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              {t("faq_badge")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t("faq_title")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("faq_subtitle")}</p>
          </div>

          {/* FAQ Accordion */}
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-border rounded-xl overflow-hidden bg-card"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-accent/50 transition-colors"
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-500 ease-out ${
                    openFaq === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 text-muted-foreground">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`,
                backgroundSize: "32px 32px",
              }}
            />

            {/* Content */}
            <div className="relative z-10 py-16 lg:py-24 px-8 lg:px-16 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                {t("cta_section_title")}
              </h2>
              <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
                {t("cta_section_subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full bg-white text-primary hover:bg-white/90 shadow-xl"
                  >
                    {t("cta_section_button")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-white/60">
                {t("cta_section_note")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
