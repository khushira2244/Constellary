# Building Constellary with GPT-5.6 and Codex

## Purpose

Constellary was built through a structured collaboration between the creator, GPT-5.6, and Codex.

The goal was not to ask AI to invent and build the entire product independently.

The process was designed so that:

* the creator defined the research problem and product direction;
* GPT-5.6 helped refine complex product decisions;
* Codex translated approved decisions into working code;
* and each implementation block was reviewed through code inspection, tests, and browser validation.

This collaboration made it possible to develop a deep product idea quickly without giving up control over the product model.

## Creator-Led Product Direction

The core idea, product philosophy, workflows, and design decisions came from the creator.

The creator decided:

* that research history should be preserved as part of the work;
* that research should be collaborative and shareable;
* that changed directions should become subbranches;
* that linked research should remain separate from direct ancestry;
* that confirmed provenance should not be silently rewritten;
* that main branches and subbranches should use the same complete model;
* that Branch View should remain readable, connected, and collaborative;
* that Workspace should support deeper creation and editing;
* that AI output must be reviewed before application;
* and that human and AI contributions should remain attributed.

The creator also reviewed the real interface and rejected flows that were technically valid but did not match the intended research experience.

This included correcting terminology, changing interaction behavior, simplifying confusing flows, preserving important product boundaries, and preventing implementation decisions from changing the meaning of Constellary.

## GPT-5.6’s Role in Product Reasoning

GPT-5.6 was used as a product-reasoning partner.

It helped refine:

* the research-provenance model;
* branch and subbranch behavior;
* parent and linked-branch relationships;
* collaboration rules;
* owner and collaborator permissions;
* AI contribution lifecycle;
* profile and research identity structure;
* sharing and privacy behavior;
* testing requirements;
* interface wording;
* documentation structure;
* and the order in which the product should be built.

GPT-5.6 also helped convert broad product ideas into precise implementation rules.

For example:

```text
Broad idea:
Collaborators should participate in the research.

Refined product rule:
Accepted collaborators can access the exact shared branch according to their
assigned role, while ownership, privacy management, invitation control,
and destructive actions remain restricted.
```

Another example:

```text
Broad idea:
A changed idea should keep its history.

Refined product rule:
After branch confirmation, the original idea and origin are protected.
A substantially changed direction becomes a new subbranch instead of
overwriting the existing branch.
```

This reasoning stage reduced ambiguity before implementation began.

## Codex’s Role in Implementation

Codex was used as the implementation partner.

It received narrowly scoped instructions based on already approved product decisions.

Codex supported work such as:

* inspecting the existing repository;
* implementing database migrations;
* building database constraints and functions;
* creating row-level security policies;
* generating TypeScript types;
* implementing application services;
* connecting server-side operations;
* building or refining interface components;
* fixing product-flow inconsistencies;
* validating code and migrations;
* running tests;
* checking browser behavior;
* and reporting unresolved limitations.

Codex was not asked to independently redefine the product.

When an implementation decision affected product meaning, the decision returned to the creator and GPT-5.6 for review.

## Major Implementation Blocks

The project was developed in controlled blocks rather than through one large generation request.

### Database foundation

Codex implemented the PostgreSQL and Supabase foundation through ordered migrations.

The database work included:

* profiles;
* editable branch drafts;
* confirmed branches;
* main branch and subbranch ancestry;
* separate linked-branch relationships;
* summaries and Workspace content;
* collaborators and invitations;
* comments and activity;
* AI attribution;
* content access grants;
* transactional confirmation;
* provenance locking;
* and row-level security.

The database model followed the approved rule that there is no separate `Idea` table.

### Draft and confirmation flow

Codex implemented the separation between editable branch creation and confirmed provenance.

The confirmation process was designed to:

* validate the draft;
* create the confirmed branch;
* preserve ancestry;
* create linked relationships;
* create the initial approved short summary;
* assign the initial owner;
* create invitations where needed;
* preserve AI attribution;
* and prevent duplicate confirmation.

The operation was kept transactional so that partial provenance records would not be created.

### Access control and collaboration

Codex implemented the approved collaboration model through:

* owner, editor, commenter, and viewer distinctions;
* invitation records;
* access grants;
* privacy-aware data access;
* permission-aware comments;
* and row-level security.

The product interface may guide the user, but the database remains responsible for enforcing access.

### Application services

Application services were built around product capabilities rather than exposing raw table operations directly.

These services coordinate areas such as:

* branch drafts;
* branch confirmation;
* branch reading;
* Workspace content;
* linked branches;
* collaboration;
* comments;
* files;
* privacy;
* and AI contributions.

The service layer uses authenticated server-side access and relies on database rules for final enforcement.

### Product interface

Codex also supported implementation and refinement of the product interface.

This included work across:

* Branch View;
* Creation Workspace;
* Editing Workspace;
* collaboration controls;
* branch summaries;
* linked research;
* comments;
* privacy behavior;
* profile views;
* and Dashboard experiences.

The creator reviewed the actual interface repeatedly and requested corrections when the implemented flow did not match the intended product.

## How Decisions Were Controlled

The development process followed a controlled sequence:

```text
Creator defines the product need
    ↓
GPT-5.6 helps refine the rule
    ↓
The rule is reviewed and approved
    ↓
Codex receives a narrow implementation task
    ↓
Codex implements and reports changes
    ↓
The creator reviews the code and interface
    ↓
Problems are corrected before the next block
```

This prevented the implementation from drifting away from the product vision.

Large product decisions were not left implicit inside code-generation prompts.

They were discussed and locked before implementation.

## Review and Validation Process

Codex output was not accepted only because the code compiled.

Implementation blocks were reviewed through combinations of:

* repository inspection;
* TypeScript validation;
* linting;
* production builds;
* migration checks;
* database tests;
* row-level security tests;
* browser testing;
* route testing;
* permission testing;
* and manual product review.

The creator also checked whether the product still communicated the intended research model.

A technically working interface was changed when it:

* confused parent and linked branches;
* weakened collaboration;
* exposed the wrong controls;
* hid provenance;
* treated AI as an invisible author;
* or made Branch View and Workspace behave inconsistently.

## Examples of Human Direction

The creator provided detailed product direction rather than general requests such as “build a research app.”

Examples of creator-led rules included:

### Branch identity

```text
A main branch and a subbranch use the same complete structure.
There is no separate Idea object.
```

### Research ancestry

```text
A parent branch represents direct ancestry.
A linked branch represents influence, evidence, comparison, or prior work.
These relationships must remain separate.
```

### Provenance protection

```text
The original idea remains editable during creation.
After confirmation, it becomes protected.
A changed direction becomes a new subbranch.
```

### Workspace behavior

```text
Creation and Editing Workspace share the same three-panel structure.
The selected item opens in the center.
The complete item list remains on the right.
```

### AI behavior

```text
AI output must be recorded, attributed, reviewable, editable,
and approved before it becomes published research content.
```

### Collaboration

```text
Research must be shareable and collaborative.
Permissions must be tied to the exact branch and enforced beyond the interface.
```

These constraints shaped both the database and the user experience.

## What Was Not Delegated

The following responsibilities were not delegated to Codex:

* defining the original research problem;
* deciding the product’s purpose;
* choosing the branch-based provenance model;
* deciding that there would be no separate Idea entity;
* defining parent and linked-branch meaning;
* deciding what becomes immutable;
* deciding how changed research directions should continue;
* approving the Workspace model;
* defining human and AI attribution principles;
* deciding collaboration boundaries;
* accepting or rejecting interface behavior;
* and determining the final product direction.

Codex implemented approved work, but it did not own the product decisions.

## Failures and Corrections

The collaboration process included incorrect assumptions, incomplete implementations, and visual or product mismatches.

These were treated as part of the development process rather than hidden.

When a result was wrong, the process was:

1. identify the mismatch;
2. explain the intended product behavior;
3. narrow the correction;
4. ask Codex to change only the affected area;
5. validate the result again.

This was especially important for Constellary because small technical changes could alter the meaning of provenance, ownership, collaboration, or AI attribution.

## Why This Collaboration Model Matters

Constellary demonstrates a form of AI-assisted product development in which different responsibilities remain clear.

The creator provides:

* the research problem;
* product vision;
* judgment;
* product constraints;
* review;
* and final decisions.

GPT-5.6 supports:

* reasoning;
* product refinement;
* structured decision-making;
* documentation;
* and translation of product intent into precise technical instructions.

Codex supports:

* implementation;
* code navigation;
* technical validation;
* debugging;
* and repeated correction.

This is not a one-prompt generation process.

It is an iterative collaboration in which AI increases development capacity while the creator retains control over the meaning, quality, and direction of the product.

## Final Principle

Constellary was built with AI, but it was not built without human authorship.

The product exists because the creator defined the problem, protected the core decisions, reviewed the implementation, and continued refining the system until the code matched the intended research experience.

GPT-5.6 and Codex helped make that vision executable.

They did not replace the vision itself.
