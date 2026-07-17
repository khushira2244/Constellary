import { LoadingState } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <main className="centered-state">
      <LoadingState label="Opening your research workspace…" />
    </main>
  );
}
