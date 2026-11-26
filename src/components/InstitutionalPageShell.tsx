import { ArrowLeft, ChevronRight, Mail } from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface InstitutionalPageShellProps {
  breadcrumbLabel: string;
  sectionLabel: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function InstitutionalPageShell({
  breadcrumbLabel,
  sectionLabel,
  title,
  subtitle,
  lastUpdated,
  children,
}: InstitutionalPageShellProps) {
  return (
    <div className="bg-[#FAFAF9]">
      <section className="border-b border-[#E7E5E4] bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-[#78716C] mb-5"
          >
            <Link
              to="/"
              className="hover:text-[#C2410C] transition-colors py-1"
            >
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="text-[#1C1917] font-semibold">{breadcrumbLabel}</span>
          </nav>

          <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E] mb-2">
            {sectionLabel}
            {lastUpdated ? ` · Updated ${lastUpdated}` : ''}
          </p>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1C1917] leading-[1.12]">
            {title}
          </h1>

          <p className="mt-3 text-base sm:text-lg text-[#57534E] leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {children}

        <div className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-bold text-[#1C1917]">
              Need direct assistance from our team?
            </h2>
            <p className="text-sm text-[#57534E]">
              Reach our customer care specialists anytime at{' '}
              <a
                href="mailto:hello@zampaclub.it"
                className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
              >
                hello@zampaclub.it
              </a>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="mailto:hello@zampaclub.it"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] hover:border-[#C2410C] hover:text-[#C2410C] text-sm font-semibold text-[#1C1917] transition-colors"
            >
              <Mail className="w-4 h-4 text-[#0F766E]" />
              <span>Email Support</span>
            </a>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Shop</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
