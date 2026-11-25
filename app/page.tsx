import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

async function Go(): Promise<null> {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Go />
    </Suspense>
  );
}
