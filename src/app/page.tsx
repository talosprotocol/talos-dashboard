import { redirect } from "next/navigation";

/**
 * Root page - redirects to /console
 * 
 * The main dashboard is now at /console inside the (shell) route group.
 */
export default function RootPage() {
  redirect("/console");
}
