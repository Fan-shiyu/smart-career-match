import { Link } from "react-router-dom";
import { Briefcase, Zap, Shield, Globe, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="text-sm font-extrabold text-foreground tracking-tight">Job Intelligence</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/pricing">
            <Button variant="ghost" size="sm" className="text-xs">Pricing</Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="text-xs glow-primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center pt-20 pb-16 px-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-xs text-accent-foreground font-medium mb-6">
          <Zap className="h-3.5 w-3.5" />
          AI-Powered Job Matching
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight mb-4">
          Find your perfect job match<br />
          <span className="text-primary">in the Netherlands</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Upload your CV, set your filters, and let AI match you with the best opportunities. 
          Get visa insights, commute times, and skill gap analysis — all in one platform.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register">
            <Button size="lg" className="glow-primary font-semibold gap-2">
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: "Smart Matching", desc: "AI analyzes your CV and matches skills, experience, and preferences against thousands of jobs." },
            { icon: Shield, title: "Visa & Sponsorship", desc: "Instantly see which companies are IND-registered sponsors and check visa sponsorship likelihood." },
            { icon: Globe, title: "Commute Intelligence", desc: "Calculate real commute times from your location to any job — by car, transit, or bike." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Job Intelligence. GDPR-friendly · No LinkedIn scraping · Cancel anytime</p>
      </footer>
    </div>
  );
}
