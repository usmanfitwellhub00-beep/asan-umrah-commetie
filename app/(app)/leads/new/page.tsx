"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadForm } from "@/components/LeadForm";
import { PageInfo, RoleGate, useToast } from "@/components/ui";
import { useUser } from "@/components/UserContext";
import { api } from "@/lib/client";

export default function NewLeadPage() {
  return (
    <RoleGate roles={["SE"]} right="addLeads">
      <NewLead />
    </RoleGate>
  );
}

function NewLead() {
  const router = useRouter();
  const toast = useToast();
  const user = useUser();
  const [busy, setBusy] = useState(false);

  async function submit(payload: Record<string, any>) {
    setBusy(true);
    try {
      await api("/api/leads", { method: "POST", json: payload });
      toast.ok("Entry submitted — payment status is Pending until your SM verifies it");
      router.push("/leads");
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Could not save the entry");
      setBusy(false);
    }
  }

  return (
    <div>
      <PageInfo
        title="Add Entry"
        subtitle={`Record a new committee person under your ID (${user.userId}).`}
        structure={[
          "Personal details — name, father/husband name, CNIC, email, address and an optional picture.",
          "Contact — phone number and WhatsApp number (tick “Same as phone number” if they match).",
          "Payment — amount is auto-filled, pick the payment platform and upload the payment screenshot (stored on Cloudinary).",
          "After saving, the entry appears in My Entries with status “Pending” until your Sales Manager or the admin approves it.",
        ]}
      />
      <div className="glass p-4 sm:p-6">
        <LeadForm wide defaultAmount={user.leadAmount} submitLabel="Submit entry" busy={busy} onSubmit={submit} />
      </div>
    </div>
  );
}
