// components/landing/FaqSection.tsx
"use client"; // Bu satır kritik! Burası bir Client Component.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

export function FaqSection() {
  const t = useTranslations("Landing");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: t("faq_1_q"), a: t("faq_1_a") },
    { q: t("faq_2_q"), a: t("faq_2_a") },
    { q: t("faq_3_q"), a: t("faq_3_a") },
    { q: t("faq_4_q"), a: t("faq_4_a") },
    { q: t("faq_5_q"), a: t("faq_5_a") },
  ];

  return (
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
                  openFaq === index
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6 text-muted-foreground">{faq.a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}