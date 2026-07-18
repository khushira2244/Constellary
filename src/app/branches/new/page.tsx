import { ErrorState } from "@/components/ui/feedback";
import { AuthenticatedHeader } from "@/components/layout/authenticated-header";

export default async function NewBranchPage() {
  return (
    <>
      <AuthenticatedHeader />
      <main className="centered-state">
        <ErrorState
          title="Use Create Branch"
          message="Branch drafts are created only by the explicit Create Branch action. Return Home to begin a fresh branch or resume a selected draft."
        />
      </main>
    </>
  );
}
