# Judge Testing Guide

## Live Application

https://constellary.vercel.app

## Demo Account

## Demo Account

**Email:** `khushira2244@gmail.com`  
**Password:** Please use the password provided in the private Devpost judging instructions.

This account contains prepared research branches and is intended only for hackathon evaluation.

## Videos

- [Product Demo](https://www.youtube.com/watch?v=BZaiwaqXcGA)
- [Constellary as the Solution](https://www.youtube.com/watch?v=iomn6d2tFxM)
- [How Codex Eased the Work](https://www.youtube.com/watch?v=W-VDt359nxc)

## Suggested Test Flow

1. Open the live application.
2. Sign in with the demo account.
3. View the researcher profile and featured research branches.
4. Open the main research branch.
5. Explore its subbranches and linked research.
6. Open Summary, Notes, Comments, Collaborators, and AI Role.
7. Use the `W` button to open Workspace.
8. Add **Full Summary** to the selected AI context.
9. Ask GPT-5.6 a research question.
10. Review the generated contribution.
11. Approve and apply it to Full Summary.
12. Return to Branch View and verify that:
    - the approved content appears in Full Summary;
    - the AI contribution remains visibly attributed;
    - the original branch provenance remains unchanged.

## What to Notice

While testing, please notice that:

- research grows through full branches and subbranches;
- parent branches represent direct ancestry;
- linked branches represent influence, evidence, comparison, or prior work;
- collaborators receive access only to the exact shared branch;
- GPT-5.6 receives only the context selected by the researcher;
- generated AI content remains separate until human approval;
- approved AI contributions remain attributed;
- confirmed branch origin and ancestry cannot be silently rewritten.

## Collaboration

Constellary supports invited collaborators who can:

- view the shared branch;
- read and add comments;
- contribute to editable research content;
- and open Workspace for the exact shared branch.

Ownership, privacy, invitation management, deletion, and locked provenance remain owner-controlled.

## Important Notes

- The demo account contains prepared research data.
- GPT-5.6 access is limited to configured demo accounts.
- AI output is never applied automatically.
- The original idea, confirmed title, ancestry, and provenance remain locked.
- Some actions may take a few seconds while the deployed application communicates with Supabase and the OpenAI API.