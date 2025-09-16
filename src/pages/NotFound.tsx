import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center glass-effect p-8 rounded-3xl max-w-md">
        <h1 className="mb-4 text-4xl font-bold moon-glow">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Stran ni bila najdena</p>
        <a 
          href="/" 
          className="inline-block mt-4 text-primary hover:text-primary/80 underline font-semibold transition-colors"
        >
          Nazaj na začetno stran
        </a>
      </div>
    </div>
  );
};

export default NotFound;
