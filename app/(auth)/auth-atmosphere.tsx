"use client";

import { usePathname } from "next/navigation";
import styles from "./login/login-sky.module.css";

export function AuthAtmosphere() {
  const pathname = usePathname();
  if (!["/forgot-password", "/verify-email", "/login/code"].includes(pathname)) return null;
  return <div data-sky-account className={styles.sky} aria-hidden="true" />;
}
