import { Link } from "react-router-dom";
import { Briefcase, Check, X, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="text-sm font-extrabold text-foreground tracking-tight">Job Intelligence</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/app">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to App
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm" className="text-xs">Sign In</Button></Link>
              <Link to="/register"><Button size="sm" className="text-xs glow-primary">Get Started</Button></Link>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-4xl mx-auto text-center pt-12 pb-10 px-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Start free and upgrade when you need more power. Cancel anytime.
        </p>
      </section>

      {/* Plan Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col shadow-sm hover:shadow-md transition-shadow",
                plan.popular && "border-primary shadow-md ring-1 ring-primary/20"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground gap-1 text-xs px-3">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-foreground">{plan.priceLabel}</span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {f.included ? (
                        <Check className="h-3.5 w-3.5 text-score-high shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={cn(f.included ? "text-foreground" : "text-muted-foreground/50")}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to={user ? "/app" : "/register"}>
                  <Button
                    className={cn(
                      "w-full text-sm font-semibold",
                      plan.popular && "glow-primary"
                    )}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">✓ No LinkedIn scraping</span>
          <span className="flex items-center gap-1.5">✓ GDPR-friendly</span>
          <span className="flex items-center gap-1.5">✓ Cancel anytime</span>
          <span className="flex items-center gap-1.5">✓ No credit card required</span>
        </div>
      </section>
    </div>
  );
}
