# Constellary Architecture

Constellary is a collaborative research-provenance platform that preserves how research grows across prior work, people, changing directions, and AI-assisted activity.

Its central architectural rule is:

> Confirmed research history must remain traceable and must not be silently rewritten.

A branch remains editable while it is a draft. After confirmation, its original idea, origin, ancestry, and initial approved summary become protected provenance. Further development continues through Workspace content, collaboration, linked branches, comments, activity, and new subbranches.

## Architecture Overview

```text
Researcher
    ↓
Next.js application
    ↓
Server actions and application services
    ↓
Supabase Auth, PostgreSQL, and Storage
    ↓
OpenAI Responses API
```

Constellary uses five primary layers.

### Presentation

The user-facing application includes:

* Dashboard
* Branch Page
* Creation Workspace
* Editing Workspace
* collaboration and privacy controls
* comments
* AI review and approval interfaces

Main branches and subbranches use the same branch model and interface behavior.

### Application Services

The application layer coordinates product operations such as:

* draft creation and editing
* branch confirmation
* branch reading
* Workspace updates
* linked-branch management
* collaboration and invitations
* comments and activity
* file access
* AI contribution review

Application services use authenticated Supabase access and rely on database-enforced permissions and integrity rules.

### Database and Access Control

Supabase PostgreSQL is the authoritative source for:

* profiles
* drafts and confirmed branches
* parent and linked-branch relationships
* summaries and Workspace items
* sources and files
* collaborators and invitations
* comments
* AI contributions
* activity and access grants

Integrity is enforced through constraints, triggers, transactional functions, immutable fields, and row-level security.

### Storage

Supabase Storage holds private branch-related files, images, documents, and voice-note media.

Access is granted only through authenticated, permission-aware operations. Internal storage paths are not exposed in public branch responses.

### AI

The OpenAI Responses API provides attributed research assistance, including:

* summary drafting
* linked-branch context explanation
* next-direction suggestions
* reference suggestions
* visual-summary structure
* provenance-gap clarification

AI output is never published automatically. It remains reviewable, editable, attributed, and subject to human approval.

## Technology Stack

* **Next.js App Router** — rendering, routing, server actions, and protected views
* **TypeScript** — shared database, service, and interface types
* **Supabase PostgreSQL** — authoritative data and provenance rules
* **Supabase Auth** — identity and authenticated access
* **Supabase Storage** — private research files and media
* **OpenAI Responses API with GPT-5.6** — contextual AI assistance
* **Tailwind CSS** — interface styling
* **Vercel** — Next.js deployment

## Branch and Provenance Model

Constellary uses one complete branch model for both starting branches and subbranches.

There is no separate `Idea` entity.

An idea is the human-facing meaning of a branch.

A branch is the primary research record and may contain its original idea, origin, summaries, Workspace material, linked research, collaborators, comments, sources, files, activity, privacy settings, and AI attribution.

### Main Branch and Subbranch

A main branch has no parent:

```text
parent_branch_id = null
```

A subbranch directly grows from another branch:

```text
parent_branch_id = another branch
```

Main branches and subbranches use the same structure, permissions, content model, and Workspace behavior.

A subbranch is not a reduced record. It can contain the same complete research material as its parent.

### Parent Branch

The parent branch represents direct research ancestry.

It answers:

> Which branch did this direction directly grow from?

A branch may have only one direct parent.

This creates a clear lineage from an earlier direction to a new one without rewriting the earlier branch.

When research changes substantially, the new direction should become a subbranch rather than replacing the confirmed original idea.

### Linked Branches

Linked branches represent broader research influence.

They may be connected as:

* inspiration
* evidence
* comparison
* continuation
* context
* related research
* prior attempt

A linked branch is not automatically the parent branch.

A branch may have several linked branches because research may be influenced by multiple earlier directions.

### Parent and Linked Relationship Difference

The two relationships answer different questions:

```text
Parent branch:
Where did this branch directly grow from?

Linked branch:
Which earlier work influenced or supported this branch?
```

A parent relationship preserves ancestry.

A linked relationship preserves intellectual context.

Keeping them separate prevents the research graph from treating every reference as direct lineage.

### Draft Branch Record

Before confirmation, branch creation is stored as an editable draft.

The draft can contain:

* title
* original idea
* origin
* short summary
* parent branch
* linked branches
* collaborators
* privacy
* AI role

The researcher can continue changing these fields while the branch remains in the Creation Workspace.

A draft is not yet a permanent provenance record.

### Confirmed Branch Record

Confirmation converts the editable draft into a protected branch record.

The confirmation process preserves:

* branch identity
* creator ownership
* original idea
* origin
* ancestry
* initial approved short summary
* linked-branch relationships
* initial collaboration and privacy configuration

After confirmation, protected provenance fields cannot be silently rewritten.

Further research development continues through:

* full summaries
* visual summaries
* notes
* voice notes
* sources
* files
* comments
* collaborators
* activity
* status
* version history
* new subbranches

### Provenance Protection

Constellary separates permanent provenance from continuing research content.

Protected provenance includes the branch’s confirmed origin and identity.

Continuing research content remains editable according to user permissions and content rules.

This allows researchers to refine and expand their work without erasing how the branch began.

### Relationship Validation

The database foundation validates branch relationships to prevent invalid provenance.

It includes protections against:

* a branch linking to itself
* duplicate linked-branch relationships
* invalid cross-branch Workspace parents
* unauthorized changes to ancestry
* direct replacement of confirmed branch identity
* direct insertion into confirmed branches outside the approved confirmation flow

These rules ensure that the visual research graph reflects valid branch history rather than only interface-level assumptions.

## Draft Confirmation Lifecycle

Constellary separates branch creation into two stages:

1. editable draft development
2. confirmed provenance creation

This separation allows researchers to refine a new direction before it becomes part of the permanent research record.

### Draft Stage

A new branch begins as a draft.

While the draft remains unconfirmed, the researcher may update:

* title
* original idea
* origin
* short summary
* parent branch
* linked branches
* collaborators
* privacy
* intended AI assistance

The draft is used by the Creation Workspace.

At this stage, the researcher may continue shaping the branch without creating multiple incomplete confirmed records.

### Confirmation Request

When the researcher approves the draft, the application requests branch confirmation.

The confirmation operation is handled as one database transaction rather than as several independent client-side writes.

The transaction validates that:

* the authenticated user is permitted to confirm the draft
* the draft has not already been confirmed
* required branch information is present
* the selected parent branch is valid
* linked branches are valid
* self-links and duplicate links are absent
* collaboration and privacy values are valid
* referenced records belong to permitted branch contexts

If validation fails, the transaction does not create a partial confirmed branch.

### Transactional Confirmation

A successful confirmation creates the initial protected branch state together.

This includes:

* the confirmed branch record
* initial owner assignment
* parent-branch ancestry
* linked-branch relationships
* the initial approved short summary
* initial collaboration settings
* privacy configuration
* AI attribution, when applicable
* invitation records, when collaborators are invited

The operation is transactional, so either the complete confirmation succeeds or no partial provenance record is created.

### Idempotent Behavior

The confirmation process is idempotent.

Repeating the same valid confirmation request must not create duplicate branches, duplicate summaries, duplicate links, or duplicate invitations.

Once a draft has been successfully confirmed, later confirmation attempts return or recognize the existing confirmed result rather than creating another branch from the same draft.

This protects the system from:

* repeated button clicks
* network retries
* duplicated server requests
* interrupted client responses
* accidental resubmission

### Initial Approved Short Summary

Confirmation creates the branch’s initial approved short summary.

This summary supports:

* the branch hover experience
* linked-branch context
* branch previews
* provenance reading
* future branch creation using earlier approved context

Because it forms part of the confirmed provenance record, its approved content cannot be silently replaced.

Later research development may add or update other summaries according to permissions and approval rules, but the initial approved summary remains part of the branch’s recorded origin.

### AI Attribution During Confirmation

AI assistance may be used before confirmation to help draft or expand branch content.

When AI contributes to confirmed material, the confirmation process preserves the relevant attribution.

The attribution may record:

* the branch or draft involved
* the type of AI assistance
* the generated contribution
* the requesting user
* the review state
* the approval state

AI output does not become confirmed content solely because it was generated.

The researcher must review and approve it before it is included in the confirmed branch record.

### Collaborator Invitations

When collaborators are added during creation, confirmation may create invitation records.

Invitation handling uses token hashes rather than storing reusable raw invitation tokens.

The raw token is returned only when needed for immediate delivery.

Invitation acceptance validates:

* token identity
* invitation state
* expiration
* intended recipient or access context
* branch access being granted

Expired invitations are rejected.

Any later cleanup process that marks expired records is operational maintenance and is separate from acceptance validation.

### Immutability After Confirmation

After confirmation, the draft becomes immutable and the protected branch fields cannot be rewritten through ordinary authenticated operations.

Protected fields include:

* confirmed branch identity
* original idea
* origin
* parent ancestry
* initial approved summary
* confirmation relationship to the source draft

This prevents later edits from changing the historical meaning of the branch.

### Continuing Research After Confirmation

Confirmation does not freeze the entire research process.

Researchers may continue developing the branch through permitted Workspace content, including:

* full summaries
* visual summaries
* notes
* voice notes
* sources
* files
* comments
* linked research
* collaborators
* activity
* status changes

A substantially different research direction should be recorded as a new subbranch.

This keeps the original branch traceable while allowing the research to continue evolving.

