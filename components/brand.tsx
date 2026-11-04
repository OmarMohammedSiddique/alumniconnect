import Image from "next/image";
import logoLight from "@/public/images/logo-light.png";
import logoDark from "@/public/images/logo-dark.png";
import logoWhite from "@/public/images/logo-white.png";
import { cn } from "@/lib/utils";

export interface BrandProps {
  className?: string;
  imageClassName?: string;
  tone?: "auto" | "light" | "dark" | "red";
}

export function Brand({ className, imageClassName, tone = "auto" }: BrandProps) {
  const imgClasses = cn("h-11 w-auto max-w-full object-contain", imageClassName);

  return (
    <span className={cn("inline-flex items-center whitespace-nowrap", className)}>
      {tone === "dark" && (
        <Image
          src={logoDark}
          alt=""
          priority
          className={imgClasses}
        />
      )}
      {tone === "light" && (
        <Image
          src={logoLight}
          alt=""
          priority
          className={imgClasses}
        />
      )}
      {tone === "red" && (
        <Image
          src={logoWhite}
          alt=""
          className={imgClasses}
        />
      )}
      {tone === "auto" && (
        <>
          <Image
            src={logoLight}
            alt=""
            priority
            className={cn(imgClasses, "dark:hidden")}
          />
          <Image
            src={logoDark}
            alt=""
            priority
            className={cn(imgClasses, "hidden dark:block")}
          />
        </>
      )}
      <span className="sr-only">AlumniKonneQt</span>
    </span>
  );
}

export function PrototypeNotice({ className }: { className?: string }) {
  return (
    <p className={cn("max-w-prose text-xs leading-relaxed text-muted-foreground", className)}>
      Independent academic prototype inspired by Kenya Airways. Not an official product or endorsed by the airline.
    </p>
  );
}
