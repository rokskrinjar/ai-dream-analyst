import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Brain } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

export const LandingHeader = () => {
  const { t } = useTranslation("index");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => scrollToSection("hero")}
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:opacity-80 transition-opacity"
          >
            <Brain className="w-8 h-8 text-primary" />
            <span>{t("header.appName")}</span>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("hero")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("header.nav.home")}
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("header.nav.howItWorks")}
            </button>
            <button
              onClick={() => scrollToSection("pricing-preview")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("header.nav.pricing")}
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("header.nav.contact")}
            </button>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="text-foreground/80 hover:text-foreground transition-colors hidden sm:block"
            >
              {t("header.auth.login")}
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("header.auth.signup")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
