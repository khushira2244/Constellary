# Constellary Design Decisions

This document records the major product decisions that define Constellary.

It explains why the final product model uses branches, protected provenance, shared research workspaces, collaboration, and transparent AI attribution.

The purpose is not to describe every screen or implementation detail. Those belong in `PRODUCT.md` and `ARCHITECTURE.md`.

## Decision 1: No Separate Idea Entity

Constellary does not use a separate `Idea` entity, route, or database table.

An idea is the human-facing meaning of a branch.

Creating separate Idea and Branch objects would introduce overlapping concepts and make it unclear where research content, provenance, collaboration, and status should belong.

The branch is therefore the complete research record.

It can contain:

* original idea
* origin
* summaries
* Workspace content
* linked research
* collaborators
* comments
* sources
* files
* AI attribution
* status and activity

A Featured Idea on the Dashboard is a featured branch.

## Decision 2: Main Branches and Subbranches Use One Model

A main branch and a subbranch use the same complete structure.

```text
Main branch:
parent_branch_id = null

Subbranch:
parent_branch_id = another branch
```

A subbranch is not a smaller or secondary object.

It may contain the same summaries, notes, sources, files, collaborators, comments, privacy settings, AI attribution, and Workspace material as a main branch.

This keeps product behavior and permissions consistent across the complete research tree.

## Decision 3: Parent Branches and Linked Branches Are Different

Constellary separates direct ancestry from broader research influence.

A parent branch answers:

> Which branch did this direction directly grow from?

A linked branch answers:

> Which earlier work influenced, supported, compared with, or provided context for this branch?

A branch may have one direct parent and several linked branches.

This prevents every reference from being incorrectly represented as direct ancestry.

## Decision 4: Branch Creation Begins as an Editable Draft

A new branch begins as a draft rather than as a permanent branch record.

The draft may contain:

* title
* original idea
* origin
* short summary
* parent branch
* linked branches
* collaborators
* privacy
* intended AI assistance

The researcher may continue editing these fields inside the Creation Workspace until confirmation.

This allows incomplete thinking to develop without producing multiple permanent research records.

## Decision 5: Confirmation Creates Protected Provenance

Confirmation converts the editable draft into a permanent branch record.

The operation preserves the branch’s:

* identity
* initial owner assignment
* original idea
* origin
* ancestry
* initial approved short summary
* initial linked research
* collaboration and privacy configuration
* AI attribution, when present

Confirmation is transactional and idempotent.

A failed confirmation must not leave partial branch records, and repeated requests must not create duplicates.

## Decision 6: The Original Idea Cannot Be Rewritten After Confirmation

After confirmation, the original idea becomes locked.

Allowing it to be replaced would erase the meaning of the branch’s recorded origin.

Researchers may continue refining summaries, notes, sources, files, comments, and other Workspace content.

When the research direction changes substantially, that change becomes a new subbranch rather than a rewrite of the original branch.

## Decision 7: Provenance Emerges From Normal Work

Researchers should not be required to reconstruct the history of their work manually at the end.

Constellary builds provenance through actions already happening inside the product:

* creating branches
* selecting parents
* linking earlier research
* adding collaborators
* commenting
* adding sources
* updating Workspace content
* requesting AI assistance
* reviewing AI contributions
* creating subbranches

The provenance record grows from the work itself.

## Decision 8: Creation and Editing Workspaces Share One Layout

Both Workspace modes use the same three-part structure:

```text
Left:
Branch context and path

Center:
Editor for the selected item

Right:
Complete list of branch items
```

The shared layout reduces unnecessary interface changes between branch creation and later research development.

The main difference is what may be edited.

In Creation Workspace, the original idea remains editable.

In Editing Workspace, the confirmed original idea and origin are preserved.

## Decision 9: The Branch Page Uses One Reusable Branch Box

Every main branch and subbranch uses the same reusable branch box.

Each box may expose:

* Links
* Notes
* Summary
* Comments

Only one section opens below the box at a time.

Branch-level controls include:

* Privacy
* Collaborators
* AI Role
* Edit or Workspace
* More

Using one branch component keeps the research tree visually and behaviorally consistent.

## Decision 10: Short, Full, and Visual Summaries Serve Different Purposes

Constellary uses three summary experiences.

### Short summary

Created during branch creation and shown during branch hover or preview.

### Full written summary

Explains how the branch began, which earlier research influenced it, what collaborators discussed, how the direction changed, and where AI contributed.

### Visual summary

Created inside Workspace using visual research material such as notes, diagrams, and uploaded assets.

These are not separate ideas. They are different views of the same branch.

## Decision 11: Collaboration Is a Core Product Function

Constellary is not designed only for one researcher recording personal history.

Research can be:

* shared
* discussed
* continued
* reviewed
* linked
* developed by multiple people

The collaboration model distinguishes between:

* owner
* editor
* commenter
* viewer

Access depends on validated collaboration records, privacy settings, invitations, and row-level security.

## Decision 12: AI Is a Visible Contributor, Not an Invisible Author

GPT-5.6 acts as a contextual research companion.

It may assist with:

* summary drafting
* linked-branch context
* research-direction suggestions
* missing-reference suggestions
* visual-summary structure
* provenance-gap clarification

AI output must remain:

* recorded
* attributed
* reviewable
* editable
* approved by a human before publication

Generation and publication are separate actions.

AI cannot silently overwrite confirmed research content.

## Decision 13: The Dashboard Is Derived From Branch Data

The Dashboard does not maintain a separate idea-management system.

It reads real branch data to show:

* researcher profile
* research focus
* branch-derived statistics
* Featured Ideas
* yearly Branch Archive
* collaborators
* shared branches
* recent Workspace continuation

A Featured Idea is a featured branch.

This prevents Dashboard content from becoming disconnected from the underlying research record.

## Decision 14: Database Rules Protect Product Meaning

Important product rules are enforced in PostgreSQL rather than only in the interface.

The database protects:

* branch ancestry
* original idea and origin
* confirmed drafts
* approved summaries
* linked-branch validity
* collaborator permissions
* invitation handling
* AI attribution states
* branch privacy
* direct insertion into confirmed branches

The interface may guide users, but database rules remain authoritative.

## Rejected Approaches

The following approaches were rejected because they conflicted with the product model:

* a separate Idea entity
* a reduced subbranch structure
* treating every linked branch as a parent
* allowing confirmed original ideas to be rewritten
* publishing AI output automatically
* relying only on frontend permission checks
* creating confirmed branches through independent client-side inserts
* storing provenance only as a final report
* maintaining Dashboard ideas separately from branches

## Final Product Principles

The current design is guided by these principles:

1. Research history is part of the research.
2. Provenance should emerge from normal work.
3. Main branches and subbranches should behave consistently.
4. Direct ancestry and broader influence should remain distinct.
5. Confirmed origins should not be silently rewritten.
6. Major changes should branch rather than overwrite.
7. Collaboration should remain attributable.
8. AI involvement should remain visible and human-controlled.
9. Permissions should be enforced beyond the interface.
10. Every visible idea should remain connected to its underlying branch record.
