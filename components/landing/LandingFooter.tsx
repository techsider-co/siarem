"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Zap, Github, Twitter, Linkedin, Youtube } from "lucide-react";

export function LandingFooter() {
  const t = useTranslations("Landing");
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: t("footer_features"), href: "#features" },
      { label: t("footer_pricing"), href: "#pricing" },
      { label: t("footer_integrations"), href: "#" },
      { label: t("footer_changelog"), href: "#" },
    ],
    company: [
      { label: t("footer_about"), href: "#" },
      { label: t("footer_careers"), href: "#" },
      { label: t("footer_blog"), href: "#" },
      { label: t("footer_press"), href: "#" },
    ],
    resources: [
      { label: t("footer_docs"), href: "#" },
      { label: t("footer_help"), href: "#" },
      { label: t("footer_community"), href: "#" },
      { label: t("footer_contact"), href: "#" },
    ],
    legal: [
      { label: t("footer_privacy"), href: "#" },
      { label: t("footer_terms"), href: "#" },
      { label: t("footer_cookies"), href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="relative bg-muted/30 dark:bg-slate-950/50 border-t border-border">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/50 dark:to-slate-950/80 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Main Footer Content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  unalisi<span className="text-primary">.os</span>
                </span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-6">
                {t("footer_desc")}
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-9 h-9 rounded-lg bg-muted dark:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-700 transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">
                {t("footer_product")}
              </h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">
                {t("footer_company")}
              </h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">
                {t("footer_resources")}
              </h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">
                {t("footer_legal")}
              </h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Unalisi OS. {t("footer_copyright")}
            </p>
            {/*<div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                All systems operational
              </span>
            </div>*/}
          </div>
        </div>
      </div>
    </footer>
  );
}

