import { Award, Mail, RotateCcw, ShieldCheck } from 'lucide-react';
import { InstitutionalPageShell } from '../components/InstitutionalPageShell';

export function ReturnsWarrantyPage() {
  return (
    <InstitutionalPageShell
      breadcrumbLabel="Returns & Warranty"
      sectionLabel="Guarantee & Protection"
      title="30-Day Money-Back Guarantee & Returns"
      subtitle="Shop with complete confidence. Every ZampaClub product is backed by our 30-day return guarantee and durable craftsmanship promise."
    >
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <article className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-7 space-y-3">
          <div className="w-11 h-11 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <h2 className="font-display text-xl font-bold text-[#1C1917]">
            30-Day Hassle-Free Returns
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            If you or your pup aren&apos;t 100% satisfied, return it within 30 days for a full
            refund.
          </p>
        </article>

        <article className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-7 space-y-3">
          <div className="w-11 h-11 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center text-[#0F766E]">
            <Award className="w-5 h-5" />
          </div>
          <h2 className="font-display text-xl font-bold text-[#1C1917]">
            Lifetime Quality Guarantee
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            Built to last with scratchproof, heavy-duty materials.
          </p>
        </article>
      </section>

      <section className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C] shrink-0 mt-0.5">
            <Mail className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-[#1C1917]">
              How to Start a Return
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
              Email{' '}
              <a
                href="mailto:hello@zampaclub.it"
                className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
              >
                hello@zampaclub.it
              </a>{' '}
              with your order number.
            </p>
          </div>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <li className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-4 space-y-1.5">
            <span className="text-xs font-bold text-[#C2410C] tabular-nums">STEP 01</span>
            <h3 className="font-display text-sm font-bold text-[#1C1917]">
              Send Your Request
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Write to hello@zampaclub.it with your order number and the reason for your return or warranty claim.
            </p>
          </li>

          <li className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-4 space-y-1.5">
            <span className="text-xs font-bold text-[#C2410C] tabular-nums">STEP 02</span>
            <h3 className="font-display text-sm font-bold text-[#1C1917]">
              Receive Instructions
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Our support specialists reply within 1 business day with return shipping instructions or replacement options.
            </p>
          </li>

          <li className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-4 space-y-1.5">
            <span className="text-xs font-bold text-[#C2410C] tabular-nums">STEP 03</span>
            <h3 className="font-display text-sm font-bold text-[#1C1917]">
              Full Refund Issued
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Once received and inspected, refunds are returned to your original payment method within 3-5 business days.
            </p>
          </li>
        </ol>

        <div className="flex items-start gap-2.5 pt-2 text-xs text-[#57534E]">
          <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
          <span>
            If an item arrives defective or damaged, please include a quick photo with your order
            number so we can expedite a free replacement immediately.
          </span>
        </div>
      </section>
    </InstitutionalPageShell>
  );
}
