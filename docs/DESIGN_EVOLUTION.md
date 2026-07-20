# Constellary Design Evolution

Constellary did not begin as a fixed set of screens or database tables.

It developed through repeated product reasoning about how research actually grows, how collaboration changes an idea, how previous work influences new directions, and how AI participation can remain visible instead of disappearing behind the final result.

This document records the major decisions that shaped Constellary.

It explains not only what the current product model is, but why earlier approaches were changed, rejected, or combined into the final direction.

## Purpose of This Document

`DESIGN_EVOLUTION.md` preserves the reasoning behind Constellary’s product and technical design.

The current system architecture explains how Constellary works now. This document explains how and why it became that system.

It records the development of decisions related to:

* research provenance
* branches and subbranches
* parent and linked research relationships
* editable creation and confirmed history
* collaboration and sharing
* Branch Page behavior
* Creation and Editing Workspaces
* summaries and visual research material
* AI attribution and human approval
* Dashboard structure
* database and access-control principles

This document is not a changelog of every code modification.

It focuses on the decisions that changed the meaning, structure, or long-term direction of the product.

These decisions are important because Constellary is not designed only as a hackathon interface. It is also part of a broader research direction concerned with how digital systems can preserve the development of knowledge.

## Original Research Problem

Research is usually presented through its final visible result:

* a paper
* a thesis
* an experiment
* a prototype
* a dataset
* a report
* a conclusion

However, the final result does not show the complete process that produced it.

Research develops through earlier work, unfinished attempts, changing questions, discussions, references, observations, collaborator feedback, visual thinking, rejected paths, and AI-assisted exploration.

Much of this history becomes fragmented across:

* documents
* folders
* notebooks
* emails
* chat messages
* reference managers
* comments
* meeting discussions
* uploaded files
* AI conversations
* separate collaboration tools

The work may remain, but its relationships often disappear.

A reader may see the final result without being able to understand:

* where the original direction came from
* which earlier research influenced it
* why one path was continued
* why another path was paused or rejected
* who contributed to a particular change
* what collaborators discussed
* which sources shaped the work
* how one direction became another
* what AI contributed
* which AI-assisted content was reviewed or approved
* how the final result evolved over time

This creates several problems.

### Provenance is reconstructed too late

Researchers are often expected to explain the history of their work only after the work is complete.

At that stage, important details may already be forgotten, scattered, or impossible to verify.

### Collaboration becomes difficult to attribute

A final document may list contributors, but it may not show which discussion, comment, reference, or decision shaped a specific research direction.

### Failed and paused work disappears

Attempts that did not produce the final result may still be valuable.

They can explain why a later decision was made, prevent repeated mistakes, or inspire another researcher. Most systems do not preserve them as part of the visible research path.

### AI contribution becomes invisible

AI may help summarize, structure, compare, suggest, or clarify research material.

When this contribution is copied into a final document without attribution, readers cannot distinguish between original human writing, AI-assisted drafting, later human editing, and approved final content.

### Research becomes a collection of isolated outputs

Documents, notes, files, and references may all exist, but the relationships between them are often missing.

The central problem that led to Constellary was therefore not simply how to store more research material.

It was:

> How can a digital workspace preserve how research grows through previous work, people, changing directions, and AI—without forcing researchers to reconstruct that history afterward?

Constellary evolved as an answer to this problem.

Instead of treating provenance as a separate report created at the end, the product is designed so that provenance emerges from the normal work of creating branches, linking research, sharing material, collaborating, commenting, reviewing AI contributions, and continuing new directions.

## From Final Outputs to Research Provenance

The earliest version of the Constellary problem focused on a simple gap: research tools preserve results, but they rarely preserve how those results came into existence.

At first, this could have been approached as a richer note-taking or research-management system.

Such a system might have stored:

* papers
* notes
* summaries
* files
* references
* comments
* collaborators

But storing more material would not have solved the deeper problem.

The missing element was not only content.

It was the relationship between pieces of content over time.

A summary is more useful when a reader can see which earlier branch informed it.

A comment is more meaningful when it remains connected to the decision it influenced.

A source matters differently when it served as evidence, comparison, continuation, or inspiration.

A failed attempt may become valuable when a later branch grows from it.

An AI-generated draft should not appear identical to independently written and approved human content.

This shifted Constellary from a research-storage idea toward a research-provenance system.

### Provenance as Part of the Product

In Constellary, provenance is not treated as a separate audit document added after the work is complete.

It is created through ordinary product actions:

* creating a branch
* selecting a parent branch
* linking earlier research
* inviting collaborators
* adding comments
* recording sources
* developing Workspace material
* using AI assistance
* reviewing AI output
* confirming a branch
* creating a new subbranch when the direction changes

Each action contributes context to the research record.

The product therefore preserves not only what exists, but also:

* where it came from
* how it relates to earlier work
* who influenced it
* which decisions changed it
* what remained unfinished
* where AI participated
* which material was reviewed and approved

### From Archive to Living Research Record

A traditional archive mainly answers:

> What material was saved?

Constellary is designed to answer additional questions:

> How did this direction begin?

> Which previous work shaped it?

> Who contributed to its development?

> Why did it change?

> What was added by AI?

> Which contribution became part of the approved research record?

This means a branch is not only a container for content.

It is a living research record that combines:

* current material
* historical origin
* direct ancestry
* broader influence
* collaboration
* decisions
* attribution
* continuing development

### Provenance Should Emerge Automatically

An early design risk was requiring researchers to manually document every provenance detail.

That would create additional administrative work and make adoption difficult.

The product direction therefore changed toward automatic provenance capture.

Researchers should perform normal work:

* create
* share
* link
* comment
* revise
* review
* approve
* continue

Constellary should preserve the relationships generated by those actions.

This does not mean that every activity becomes public or permanent.

Privacy, permissions, approval states, and content rules still control what is visible and what becomes part of the confirmed research record.

The important principle is that provenance should emerge from the work itself rather than depend entirely on manual reconstruction.

### The Final Output Remains Important

Constellary does not reject final papers, summaries, conclusions, or completed results.

Instead, it gives them context.

The final output becomes one visible point in a larger research constellation.

A reader can understand both:

* what the current result says
* how the work reached that result

This became one of the central design principles of Constellary:

> The result matters, but the path behind the result is also part of the research.


## Major Design Decisions

Constellary’s final structure emerged through a series of product decisions about how research history, collaboration, and AI attribution should be represented.

Each decision below changed the product model in a meaningful way.

### No Separate Idea Entity

An early design risk was treating an idea as a separate object from a research branch.

That would have created two overlapping concepts:

* an Idea
* a Branch containing the research work

This separation was rejected.

In Constellary, an idea is the human-facing meaning of a branch.

The branch itself stores the complete research record, including:

* original idea
* origin
* summaries
* linked research
* Workspace content
* collaborators
* comments
* sources
* AI attribution
* continuing research activity

This keeps the product model consistent.

A Featured Idea is therefore a featured branch, and the Dashboard reads real branch data instead of using a separate Idea route or table.
