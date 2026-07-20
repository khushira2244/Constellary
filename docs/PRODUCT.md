# Constellary Product

> **Grow ideas, share the work, collaborate with people and AI, and preserve proof of every contribution.**

## 1. Product Purpose

Constellary is a collaborative research-provenance workspace for researchers, students, professors, independent researchers, and research teams.

It allows people to create, connect, share, discuss, and continue research while preserving how the work evolved.

Constellary records more than the final paper, result, note, or conclusion. It preserves the path behind the work, including:

* where a research direction began;
* which previous work influenced it;
* how one direction grew from another;
* who contributed;
* what collaborators discussed;
* which sources were used;
* what changed over time;
* what AI contributed;
* and which content was reviewed and approved.

Provenance is not added manually after the research is complete.

It emerges from normal work inside Constellary: creating branches, linking earlier research, inviting collaborators, adding comments and material, using AI, reviewing contributions, and developing new directions.

## 2. Core Terminology

### Branch

A branch is the primary research record in Constellary.

It can contain:

* title;
* original idea;
* origin;
* short summary;
* full summary;
* visual summary;
* notes;
* voice notes;
* sources;
* files;
* linked branches;
* collaborators;
* comments;
* privacy;
* AI attribution;
* status;
* and continuing research activity.

### Idea

There is no separate `Idea` object, route, or database table.

An idea is the human-facing meaning of a branch.

A Featured Idea on the Dashboard is therefore a featured branch.

### Main branch

A main branch has no parent:

```text
parent_branch_id = null
```

It can represent the starting point of a research direction.

### Subbranch

A subbranch directly grows from another branch:

```text
parent_branch_id = another branch
```

A subbranch uses the same complete structure as a main branch.

### Parent branch

The parent branch represents direct research ancestry.

It identifies the branch from which a new direction directly grew.

### Linked branch

A linked branch represents earlier work used as inspiration, evidence, comparison, context, continuation, related research, or a prior attempt.

A linked branch is not automatically the parent branch.

### Draft

A draft is the editable creation state of a branch or subbranch before confirmation.

It is developed through the Creation Workspace.

### Confirmed branch

A confirmed branch is a permanent research record whose protected provenance fields can no longer be silently rewritten.

### Workspace

Workspace is the deeper creation and editing environment for branch content.

Creation Workspace is used before confirmation.

Editing Workspace is used after confirmation.

### Provenance

Provenance is the recorded history of how research originated and developed.

It may include ancestry, linked research, collaborators, comments, sources, Workspace activity, AI attribution, and approved content.

## 3. Main Branch and Subbranch Model

Constellary uses one complete model for main branches and subbranches.

A subbranch is not a smaller object, a note attached to another branch, or a reduced version of the parent.

It can contain the same complete research material and use the same:

* Branch Page structure;
* Workspace layout;
* collaboration model;
* privacy controls;
* linked-branch behavior;
* comment system;
* summary system;
* AI attribution;
* and content permissions.

The only structural distinction is ancestry:

```text
Main branch:
parent_branch_id = null

Subbranch:
parent_branch_id = another branch
```

This allows a complete research tree to grow without creating different product behavior for different levels of research.

When a confirmed research direction changes substantially, the new direction should become a subbranch.

The previous branch remains visible and traceable instead of being rewritten to match the new direction.

## 4. Parent Branch and Linked Branch

Parent branches and linked branches serve different purposes.

### Parent branch

A parent branch answers:

> Where did this research direction directly grow from?

A branch can have only one direct parent.

The parent relationship creates ancestry within the research tree.

### Linked branch

A linked branch answers:

> Which earlier research influenced, supported, compared with, or provided context for this branch?

A branch may have several linked branches.

Linked research may represent:

* inspiration;
* evidence;
* comparison;
* continuation;
* related work;
* background context;
* or a previous attempt.

### Why the distinction matters

Research can be influenced by many earlier works, but it usually grows directly from one recorded direction.

Treating every reference as a parent would make the research tree misleading.

Constellary therefore preserves:

```text
Parent relationship:
Direct ancestry

Linked relationship:
Broader intellectual influence
```

Links open the connected branch for reading without changing the branch’s ancestry.

## 5. Branch Creation Flow

A researcher can create either:

* a new main branch; or
* a subbranch from an existing branch.

The creation flow collects the initial branch context.

This may include:

* title;
* original idea;
* origin;
* short first paragraph or short summary;
* parent branch, when creating a subbranch;
* linked branches;
* collaborators;
* privacy;
* and intended AI assistance.

When an earlier branch is selected as linked research or origin, Constellary can use its approved summary as contextual material for the new branch.

The researcher then chooses between two paths:

1. confirm the branch after reviewing the creation details; or
2. continue developing it inside the Creation Workspace.

Before confirmation, the branch remains a draft.

The researcher may return to the creation flow and change editable draft fields according to their permissions.

The creation process must not directly create incomplete confirmed branch records.

## 6. Creation Workspace

Creation Workspace is used while a branch or subbranch is still a draft.

It uses the shared Constellary Workspace layout:

```text
Left:
Branch context and path

Center:
Editor for the currently selected item

Right:
Complete list of creation items
```

The Creation Workspace includes:

* Title;
* Original Idea;
* Origin;
* Short Summary;
* Linked Branches;
* Collaborators;
* Privacy;
* AI Role;
* and Review.

When the researcher selects an item from the right panel, its editor opens in the center.

The left panel keeps the new branch connected to its relevant context and ancestry.

During creation:

* the original idea remains editable;
* the origin may be reviewed;
* linked research may be added or removed;
* collaborators may be prepared;
* privacy may be selected;
* and intended AI assistance may be recorded.

The Review item allows the researcher to inspect the branch before confirmation.

Creation Workspace is for developing the branch’s starting point. It is not the location for rewriting a branch after its provenance has been confirmed.

## 7. Confirmation and Provenance Locking

Confirmation converts an editable draft into a protected branch record.

The confirmation operation preserves the initial state together, including:

* branch identity;
* initial owner assignment;
* original idea;
* origin;
* direct ancestry;
* initial approved short summary;
* linked-branch relationships;
* initial collaboration configuration;
* privacy configuration;
* and AI attribution, when present.

Confirmation must be transactional.

Either the complete confirmed branch is created successfully, or no partial provenance record is created.

Confirmation is also idempotent.

Repeated clicks, network retries, or duplicate requests must not create duplicate branches, summaries, links, or invitations.

After confirmation:

* the original idea becomes locked;
* the origin is preserved;
* ancestry cannot be silently changed;
* the source draft becomes immutable;
* the initial approved summary remains part of the recorded provenance;
* and further work moves into the Editing Workspace.

Confirmation does not freeze the complete branch.

Researchers may continue adding and developing permitted content such as summaries, notes, sources, files, comments, linked research, collaborators, visual material, and status.

When the core research direction changes substantially, the researcher creates a new subbranch instead of replacing the confirmed original idea.


## 8. Editing Workspace

Editing Workspace is used after a branch or subbranch has been confirmed.

It keeps the same three-panel structure as Creation Workspace:

```text
Left:
Branch context and path

Center:
Editor for the currently selected item

Right:
Complete list of branch items
```

The Editing Workspace includes:

* Original Idea — locked;
* Origin — preserved;
* Full Summary;
* Visual Summary;
* Notes;
* Voice Notes;
* Sources;
* Files;
* Linked Branches;
* Collaborators;
* Comments;
* Privacy;
* AI Role;
* and Status.

The confirmed original idea cannot be rewritten.

The origin and direct ancestry also remain protected.

Researchers continue developing the branch through editable research material such as summaries, notes, sources, files, comments, visual material, collaboration, and linked work.

When the research changes into a substantially different direction, the researcher creates a new subbranch rather than replacing the confirmed branch history.

## 9. Branch Page

The Branch Page presents a branch and the subbranches that grow from it.

Every main branch and subbranch uses the same reusable branch box.

This keeps the research tree visually consistent and prevents subbranches from appearing as reduced or secondary records.

Each branch box contains four content tabs:

* Links;
* Notes;
* Summary;
* Comments.

Only one section opens below the branch box at a time.

The branch box also includes controls for:

* Privacy;
* Collaborators;
* AI Role;
* Edit or Workspace;
* and More.

Hovering over the complete branch box shows the short summary on the left.

This allows users to understand a branch quickly without opening its full content.

The Branch Page is designed for reading, navigating, sharing, and understanding the research path.

Deeper content creation and editing happens inside Workspace.

## 10. Links Section

The Links section shows research connected to the current branch.

It may include:

* the direct parent branch;
* linked research branches;
* related prior work;
* and connected branches used as evidence, context, comparison, continuation, or inspiration.

Selecting a linked branch opens that branch for reading.

Opening a linked branch does not change the ancestry of the current branch.

The Links section helps readers understand the wider research context while preserving the difference between direct lineage and broader influence.

When editing is permitted, the section action may support:

* quick link changes;
* opening linked-branch management in Workspace;
* or removing a link when allowed.

The system must prevent self-links, duplicates, and invalid branch relationships.

## 11. Notes Section

The Notes section contains research notes associated with the branch.

Notes may capture:

* observations;
* questions;
* partial reasoning;
* experiment thoughts;
* collaborator input;
* unresolved issues;
* and material that is not yet ready for a formal summary.

Notes support continuing research without changing the confirmed original idea.

A user with permission may:

* read notes;
* add new notes;
* edit supported notes;
* open deeper note editing in Workspace;
* or delete notes when permitted.

Notes remain connected to the exact branch where they were created.

They should not be silently moved across branches or used to rewrite protected provenance.

## 12. Summary Section

The Summary section presents the branch’s written explanation.

It helps readers understand:

* how the branch began;
* which earlier work influenced it;
* why the direction matters;
* how collaborators shaped it;
* what changed during development;
* where AI contributed;
* and why the current direction was added.

The Summary section may indicate when OpenAI helped draft, expand, restructure, or clarify the content.

AI assistance must remain attributed.

A permitted user may:

* read the summary;
* make a supported quick edit;
* open the summary inside Workspace;
* or delete editable summary content when allowed.

Protected provenance summaries cannot be silently replaced.

## 13. Comments Section

The Comments section supports discussion around the branch.

Comments allow researchers and permitted collaborators to:

* ask questions;
* provide feedback;
* challenge assumptions;
* clarify decisions;
* discuss references;
* and record collaboration around the research.

Comment access depends on branch privacy and collaborator permissions.

The product distinguishes between users who may:

* view;
* comment;
* edit branch content;
* or manage the branch.

A commenter does not automatically receive permission to edit Workspace content.

Comments remain attached to the relevant branch or supported branch item so that discussion stays connected to the work it influenced.

## 14. Summary System

Constellary uses three summary experiences for different levels of understanding.

### Short hover summary

The short summary is created during branch creation.

It appears when the user hovers over the full branch box.

Its purpose is to provide a quick explanation of the branch without opening a larger content view.

It can also support branch previews and linked-branch context.

### Full written summary

The full summary provides the deeper written explanation of the branch.

It can describe:

* the branch’s origin;
* previous research used;
* collaborator discussion;
* changes in direction;
* AI contribution;
* current reasoning;
* and the purpose of the branch.

The full summary may be developed manually or with attributed AI assistance.

### Visual summary

The visual summary is created only inside Workspace.

It may use:

* sticky notes;
* diagrams;
* uploaded images;
* research structures;
* visual relationships;
* and selected branch material.

The visual summary supports spatial understanding of the research.

These summary experiences do not represent separate ideas.

They are different ways of understanding the same branch and its research history.


## 15. Collaboration and Sharing

Constellary is designed for research that grows across people rather than remaining inside one private workspace.

A branch can be shared with collaborators so that research can be:

- reviewed;
- discussed;
- continued;
- expanded;
- compared;
- and developed by more than one person.

Collaboration is always connected to the exact branch or subbranch being shared.

This prevents a collaborator’s access to one branch from automatically granting access to unrelated private research.

The collaboration model supports distinct responsibilities:

- owner;
- editor;
- commenter;
- viewer.

The exact actions available to a collaborator depend on their assigned role and the branch’s privacy configuration.

Collaboration may include:

- accepting an invitation;
- reading the shared branch;
- opening permitted Workspace content;
- contributing comments;
- editing supported research content;
- reviewing linked work;
- participating in AI-assisted development;
- and continuing research through a new subbranch when permitted.

Sharing does not remove provenance.

Constellary preserves who contributed, what branch they worked on, and how their activity became part of the research history.

## 16. Privacy and Access Levels

Each branch has its own privacy and access configuration.

Privacy controls determine who may discover, open, or interact with the branch.

The supported product privacy model may include:

- private;
- shared;
- public;
- and secure-link access.

### Private

A private branch is available only to the owner and explicitly authorized collaborators.

### Shared

A shared branch is available to accepted collaborators according to their assigned roles.

### Public

A public branch may be read by permitted public users while protected actions remain restricted.

Public visibility does not grant editing, collaboration management, or ownership rights.

### Secure link

Secure-link privacy represents access granted through a controlled authenticated mechanism.

Possession of a visible URL alone should not bypass the required access validation.

### Access roles

Constellary distinguishes between:

#### Owner

The owner can manage the branch, privacy, collaborators, invitations, and other owner-only controls.

#### Editor

An editor may update supported branch and Workspace content but cannot automatically perform owner-only actions.

#### Commenter

A commenter may participate in supported discussions without receiving general editing authority.

#### Viewer

A viewer may read content available to them but cannot modify the branch.

Interface visibility alone does not grant access.

Permissions must remain enforced through authenticated services, validated collaboration records, and row-level security.

## 17. AI Role Inside the Product

GPT-5.6 acts as a contextual research companion inside Constellary.

It may help a researcher:

- develop a research direction;
- expand or refine a summary;
- analyse selected notes;
- explain links between branches;
- identify assumptions or missing questions;
- suggest possible next steps;
- suggest references or validation directions;
- structure visual research material;
- and clarify provenance gaps.

The researcher chooses the task and, where supported, the branch material included as context.

AI generation remains separate from approved research content.

The expected flow is:

Select branch context
→ request AI assistance
→ review generated output
→ edit, approve, reject, or leave unapplied
→ apply only approved content
→ preserve attribution

AI cannot independently:

- confirm a branch;
- rewrite a locked original idea;
- change ancestry;
- bypass permissions;
- invite collaborators;
- transfer ownership;
- change privacy;
- or publish its own output automatically.

Human review remains required.

AI contributions should remain visible as part of the provenance record rather than becoming indistinguishable from human-authored material.

## 18. Dashboard

The Dashboard presents a branch-derived overview of the researcher’s work.

It does not maintain a separate idea-management model.

The Dashboard may show:

- researcher profile;
- research focus;
- Constellary’s product statement;
- branch-derived statistics;
- Featured Ideas;
- yearly Branch Archive;
- collaborators;
- shared branches;
- and recent Workspace continuation.

A Featured Idea is a featured branch.

There is no separate Idea route or Idea database table.

Dashboard information should come from real branch, collaboration, and activity data.

The Dashboard helps the researcher:

- return to active work;
- understand how their research is growing;
- see shared and collaborative branches;
- review important branches;
- and navigate their broader research constellation.

## 19. Researcher Profile and Research Identity

A researcher profile provides the human context behind the branch constellation.

It may include:

- name;
- profile image;
- research focus;
- short biography;
- institution or independent-research identity;
- areas of interest;
- collaborators;
- featured branches;
- and visible research history.

Research identity in Constellary is not based only on a list of final publications.

It can also reflect:

- branches created;
- research directions continued;
- collaborations;
- linked work;
- visible contributions;
- and the development of research over time.

Profile visibility must respect branch privacy.

Private branches and restricted collaborator information must not become public merely because they contribute to internal profile statistics.

## 20. Status and Continuing Research

A branch may have a status that communicates its current research state.

Status helps distinguish between work that is:

- actively developing;
- paused;
- completed;
- archived;
- or otherwise represented by the implemented product states.

Changing status does not rewrite branch provenance.

A completed or paused branch may still:

- remain readable;
- be linked from future work;
- provide approved summary context;
- receive permitted comments;
- or become the parent of a new subbranch.

Research does not need to remain active to remain valuable.

Earlier attempts, paused directions, and completed work can continue contributing context to future branches.

When a researcher continues an existing direction without changing its core identity, work may continue inside the same branch.

When the core direction changes substantially, the new work should become a subbranch.

## 21. Product Rules That Must Not Change

The following rules define the meaning of Constellary and should not be changed accidentally during implementation.

### Branches are the core research object

There is no separate Idea entity.

An idea is the human-facing meaning of a branch.

### Main branches and subbranches use one complete model

A subbranch is not a reduced object.

It uses the same structure, Workspace behavior, collaboration model, and content capabilities as a main branch.

### Parent and linked branches remain different

A parent branch represents direct ancestry.

A linked branch represents broader influence, evidence, context, comparison, continuation, or prior work.

### Drafts remain editable before confirmation

The original idea and creation fields may be refined while the branch is still a draft.

### Confirmation creates protected provenance

After confirmation, branch identity, original idea, origin, ancestry, and protected initial provenance cannot be silently rewritten.

### Changed directions become subbranches

A substantially different direction must not replace the confirmed meaning of an existing branch.

### Branch Page remains readable

Branch Page is primarily for understanding, navigating, sharing, and discussing research.

Deeper editing belongs in Workspace.

### Creation and Editing Workspace share one structure

Both use branch context on the left, the selected editor in the center, and the branch item list on the right.

### Collaboration remains branch-specific and attributable

Access to one branch must not automatically expose unrelated research.

Contributions should remain connected to the people and branches involved.

### AI remains transparent and human-controlled

AI output must remain attributed, reviewable, editable, and subject to human approval.

AI cannot silently publish or overwrite protected provenance.

### Dashboard uses real branch data

Featured Ideas, statistics, archive entries, collaborators, and recent work should be derived from the actual branch system.

### Database rules remain authoritative

Important provenance, permission, collaboration, and access rules must not depend only on interface controls.

These principles protect Constellary from becoming a generic note-taking, document-sharing, or AI-writing application.

They preserve its central purpose:

> To help people and AI grow research together while keeping visible proof of how every contribution shaped the work.