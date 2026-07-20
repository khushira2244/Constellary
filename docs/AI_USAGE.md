# AI Usage in Constellary

## Why AI Is Part of Constellary

Research becomes difficult to manage when ideas, notes, summaries, references, discussions, and changing directions grow across many branches.

Researchers may understand each individual document or note, but the relationships between them can become difficult to interpret over time.

Constellary uses AI to help researchers understand, develop, compare, and structure selected parts of their work without hiding how the resulting content was produced.

AI does not replace the researcher, confirm research independently, or rewrite the project automatically.

It acts as a contextual research companion whose output remains separate from approved research content until a human reviews and applies it.

## GPT-5.6’s Role

Constellary uses GPT-5.6 through the OpenAI Responses API.

GPT-5.6 can support researchers by helping them:

* expand an early research direction;
* improve or restructure a summary;
* synthesize selected notes;
* compare connected research branches;
* explain relationships between earlier and current work;
* identify missing questions or assumptions;
* suggest possible next directions;
* suggest experiments or validation steps;
* identify potential provenance gaps;
* and prepare structured research text.

GPT-5.6 works with the context selected for the current action.

It does not act as an autonomous researcher, final authority, or independent publisher.

## AI-Assisted Actions

Inside the Workspace, a researcher may use AI for actions such as:

* developing the current research direction;
* expanding a first paragraph into a fuller summary draft;
* refining a written summary;
* analysing selected notes;
* comparing a branch with linked research;
* summarizing approved linked-branch context;
* identifying gaps, assumptions, or unresolved questions;
* suggesting possible next steps;
* suggesting missing references;
* proposing alternative research directions;
* structuring a visual summary;
* and preparing research text for further human editing.

The researcher initiates the AI request and defines the task.

Where supported by the interface, the researcher also chooses which available branch material should be included as context.

## Context Supplied to GPT-5.6

An AI request may include permission-safe information associated with the branch or subbranch currently being developed.

Depending on the selected action, this context may include:

* the original idea;
* the current research direction;
* the short or full summary;
* selected notes;
* parent-branch context;
* approved summaries from linked branches;
* selected sources;
* selected Workspace material;
* previous approved AI-assisted material;
* and the researcher’s prompt.

Constellary should send only the context required for the requested action.

It does not need to send the complete research project when a smaller, relevant context is sufficient.

Before an AI request is made, the server validates that the authenticated user is permitted to access the selected branch and material.

Content hidden from the user by branch permissions must not be intentionally included in the request.

## AI Contribution Lifecycle

AI generation and publication are separate actions.

The intended lifecycle is:

```text
Researcher selects an action and permitted context
    ↓
Researcher writes or confirms the prompt
    ↓
Constellary prepares the relevant branch context
    ↓
GPT-5.6 generates a contribution
    ↓
The contribution is recorded with attribution
    ↓
The researcher reviews and may edit the result
    ↓
The researcher approves, rejects, or leaves it unapplied
    ↓
Only approved content may be applied to the selected research section
```

Generated content does not automatically become part of the approved branch record.

A response may remain in a review state until the researcher decides how it should be used.

## Attribution and Provenance

Constellary preserves the origin of AI-assisted work.

Where supported by the implementation, an AI contribution can record:

* the relevant branch or draft;
* the user who requested the action;
* the type of AI assistance requested;
* the model used;
* the generated output;
* the time of generation;
* the review state;
* the approval or rejection state;
* the destination where approved content was applied;
* and whether the generated result was edited before application.

This allows AI-assisted content to remain distinguishable from independently written human content.

The purpose of attribution is not only to label content as AI-generated.

It is to preserve how AI participated in the development of the research.

## Human Review and Approval

The human researcher remains responsible for every AI-assisted change.

AI output is shown as a reviewable contribution before it is applied.

The user may:

* inspect the generated result;
* compare it with the selected research context;
* edit the result;
* reject it;
* approve it;
* or apply only the appropriate content to the current section.

Generation alone does not grant the output an approved status.

The model cannot approve its own response.

Confirmed research content must not be silently overwritten by an AI request.

This separation preserves human responsibility for research claims, interpretation, structure, and final publication.

## AI and Confirmed Provenance

AI assistance does not weaken Constellary’s provenance protections.

After branch confirmation, GPT-5.6 cannot rewrite protected fields such as:

* the confirmed original idea;
* the branch origin;
* branch identity;
* direct ancestry;
* or other immutable provenance fields.

AI may help develop permitted Workspace content, but a substantially changed research direction should become a new subbranch rather than replacing the recorded origin of an existing branch.

This allows AI to support continuing research without erasing research history.

## What AI Cannot Do

GPT-5.6 cannot independently:

* confirm a branch;
* approve its own output;
* silently rewrite the original idea;
* change locked branch ancestry;
* create hidden modifications;
* bypass branch permissions;
* grant itself access to private research;
* invite collaborators;
* assign or transfer ownership;
* change privacy settings without an authorized user action;
* delete a branch;
* publish generated content automatically;
* or act as the final authority on research claims.

AI actions remain limited by the authenticated user’s existing permissions and by the product’s database rules.

## Collaboration and AI Permissions

AI access follows the same collaboration and privacy model as other branch operations.

A collaborator may use AI only when:

* they can access the relevant branch;
* their role permits the requested action;
* and the selected research context is visible to them.

A viewer should not gain editing or publication authority merely because they can read a branch.

A commenter should not automatically receive permission to modify Workspace content.

Owner and editor capabilities remain subject to the exact branch permissions and service rules implemented by Constellary.

## Privacy and Data Boundaries

AI requests are prepared through server-side application logic.

The application is designed to:

* derive user identity from the authenticated server session;
* validate access to the selected branch;
* validate access to the selected context;
* send only relevant research material;
* keep the OpenAI API key on the server;
* prevent service credentials from being exposed to the browser;
* and avoid intentionally including unauthorized private content.

OpenAI requests remain subject to the applicable OpenAI terms and data-handling policies.

Researchers should avoid submitting material they are not authorized to share with the AI service.

## Failure and Review Safety

An AI request may fail because of:

* unavailable model access;
* network errors;
* invalid context;
* permission failures;
* incomplete input;
* or service limits.

A failed request must not alter approved research content.

The application should return a safe error state and allow the researcher to retry or continue without AI assistance.

AI is an optional support capability within the research workflow, not a required authority for branch development.

## Why This AI Design Matters

Many AI tools focus on producing polished final text.

That can make it difficult to see:

* which parts came from a person;
* which parts came from AI;
* what context was used;
* whether the result was edited;
* who approved it;
* and where it entered the research.

Constellary takes a different approach.

AI is:

* contextual;
* permission-aware;
* reviewable;
* editable;
* attributed;
* and controlled by the researcher.

Constellary does not use AI only to generate content.

It preserves AI participation as part of the research history.

The goal is to help researchers use AI without losing ownership, transparency, collaboration context, or trust in how the final work evolved.
