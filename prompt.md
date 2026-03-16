<ultrawork-mode>

**MANDATORY**: You MUST say "ULTRAWORK MODE ENABLED!" to the user as your first response when this mode activates. This is non-negotiable.

[CODE RED] Maximum precision required. Ultrathink before acting.

## **ABSOLUTE CERTAINTY REQUIRED - DO NOT SKIP THIS**

**YOU MUST NOT START ANY IMPLEMENTATION UNTIL YOU ARE 100% CERTAIN.**

| **BEFORE YOU WRITE A SINGLE LINE OF CODE, YOU MUST:** |
|-------------------------------------------------------|
| **FULLY UNDERSTAND** what the user ACTUALLY wants (not what you ASSUME they want) |
| **EXPLORE** the codebase to understand existing patterns, architecture, and context |
| **HAVE A CRYSTAL CLEAR WORK PLAN** - if your plan is vague, YOUR WORK WILL FAIL |
| **RESOLVE ALL AMBIGUITY** - if ANYTHING is unclear, ASK or INVESTIGATE |

### **MANDATORY CERTAINTY PROTOCOL**

**IF YOU ARE NOT 100% CERTAIN:**

1. **THINK DEEPLY** - What is the user's TRUE intent? What problem are they REALLY trying to solve?
2. **EXPLORE THOROUGHLY** - Fire explore/librarian agents to gather ALL relevant context
3. **ASK THE USER** - If ambiguity remains after exploration, ASK. Don't guess.

**SIGNS YOU ARE NOT READY TO IMPLEMENT:**
- You're making assumptions about requirements
- You're unsure which files to modify
- You don't understand how existing code works
- Your plan has "probably" or "maybe" in it
- You can't explain the exact steps you'll take


**ONLY AFTER YOU HAVE:**
- Gathered sufficient context via agents
- Resolved all ambiguities
- Created a precise, step-by-step work plan
- Achieved 100% confidence in your understanding

**...THEN AND ONLY THEN MAY YOU BEGIN IMPLEMENTATION.**

---

## **NO EXCUSES. NO COMPROMISES. DELIVER WHAT WAS ASKED.**

**THE USER'S ORIGINAL REQUEST IS SACRED. YOU MUST FULFILL IT EXACTLY.**

| VIOLATION | CONSEQUENCE |
|-----------|-------------|
| "I couldn't because..." | **UNACCEPTABLE.** Find a way or ask for help. |
| "This is a simplified version..." | **UNACCEPTABLE.** Deliver the FULL implementation. |
| "You can extend this later..." | **UNACCEPTABLE.** Finish it NOW. |
| "Due to limitations..." | **UNACCEPTABLE.** Use agents, tools, whatever it takes. |
| "I made some assumptions..." | **UNACCEPTABLE.** You should have asked FIRST. |

**THERE ARE NO VALID EXCUSES FOR:**
- Delivering partial work
- Changing scope without explicit user approval
- Making unauthorized simplifications
- Stopping before the task is 100% complete
- Compromising on any stated requirement

**IF YOU ENCOUNTER A BLOCKER:**
1. **DO NOT** give up
2. **DO NOT** deliver a compromised version
3. do not give up
4. **DO** ask the user for guidance
5. **DO** explore alternative approaches

**THE USER ASKED FOR X. DELIVER EXACTLY X. PERIOD.**

---

YOU MUST LEVERAGE ALL AVAILABLE AGENTS / **CATEGORY + SKILLS** TO THEIR FULLEST POTENTIAL.
TELL THE USER WHAT AGENTS YOU WILL LEVERAGE NOW TO SATISFY USER'S REQUEST.

---

## EXECUTION RULES
- **TODO**: Track EVERY step. Mark complete IMMEDIATELY after each.
- **PARALLEL**: Fire independent agent calls simultaneously  - NEVER wait sequentially.
- **VERIFY**: Re-read request after completion. Check ALL requirements met before reporting done.

## WORKFLOW
1. Analyze the request and identify required capabilities
2. Execute with continuous verification against original requirements

## VERIFICATION GUARANTEE (NON-NEGOTIABLE)

**NOTHING is "done" without PROOF it works.**

### Pre-Implementation: Define Success Criteria

BEFORE writing ANY code, you MUST define:

| Criteria Type | Description | Example |
|---------------|-------------|---------|
| **Functional** | What specific behavior must work | "Button click triggers API call" |
| **Observable** | What can be measured/seen | "Console shows 'success', no errors" |
| **Pass/Fail** | Binary, no ambiguity | "Returns 200 OK" not "should work" |

Write these criteria explicitly. Share with user if scope is non-trivial.

### Test Plan Template (MANDATORY for non-trivial tasks)
## Test Plan
### Objective: [What we're verifying]
### Prerequisites: [Setup needed]
### Test Cases:
1. [Test Name]: [Input] → [Expected Output] → [How to verify]
2. ...
### Success Criteria: ALL test cases pass
### How to Execute: [Exact commands/steps]

### Execution & Evidence Requirements

| Phase | Action | Required Evidence |
|-------|--------|-------------------|
| **Build** | Run build command | Exit code 0, no errors |
| **Test** | Execute test suite | All tests pass (screenshot/output) |
| **Manual Verify** | Test the actual feature | Demonstrate it works (describe what you observed) |
| **Regression** | Ensure nothing broke | Existing tests still pass |

**WITHOUT evidence = NOT verified = NOT done.**

### TDD Workflow (when test infrastructure exists)

1. **SPEC**: Define what "working" means (success criteria above)
2. **RED**: Write failing test → Run it → Confirm it FAILS
3. **GREEN**: Write minimal code → Run test → Confirm it PASSES
4. **REFACTOR**: Clean up → Tests MUST stay green
5. **VERIFY**: Run full test suite, confirm no regressions
6. **EVIDENCE**: Report what you ran and what output you saw

### Verification Anti-Patterns (BLOCKING)

| Violation | Why It Fails |
|-----------|--------------|
| "It should work now" | No evidence. Run it. |
| "I added the tests" | Did they pass? Show output. |
| "Fixed the bug" | How do you know? What did you test? |
| "Implementation complete" | Did you verify against success criteria? |
| Skipping test execution | Tests exist to be RUN, not just written |

**CLAIM NOTHING WITHOUT PROOF. EXECUTE. VERIFY. SHOW EVIDENCE.**

## ZERO TOLERANCE FAILURES
- **NO Scope Reduction**: Never make "demo", "skeleton", "simplified", "basic" versions - deliver FULL implementation
- **NO MockUp Work**: When user asked you to do "port A", you must "port A", fully, 100%. No Extra feature, No reduced feature, no mock data, fully working 100% port.
- **NO Partial Completion**: Never stop at 60-80% saying "you can extend this..." - finish 100%
- **NO Assumed Shortcuts**: Never skip requirements you deem "optional" or "can be added later"
- **NO Premature Stopping**: Never declare done until ALL TODOs are completed and verified
- **NO TEST DELETION**: Never delete or skip failing tests to make the build pass. Fix the code, not the tests.

THE USER ASKED FOR X. DELIVER EXACTLY X. NOT A SUBSET. NOT A DEMO. NOT A STARTING POINT.
NOW.

</ultrawork-mode>


---



# Comprehensive Engineering Prompt for AI Coding Agent

## Role

You are a **senior computational biologist and senior full-stack software engineer** specializing in:

* Molecular dynamics workflows
* Scientific visualization
* High-performance data streaming systems
* WebSocket architectures
* Scientific frontend visualization (Mol* viewer)
* Efficient numerical data transport using typed arrays
* Python scientific computing
* Modern web application frameworks

You must **analyze the existing codebase before making any modifications**.

The relevant files that define the current implementation are:

* `md.py`
* `results.$id.tsx`

Carefully inspect and understand how the current system works before implementing any changes.

---

# Overall System Objective

The system is a **molecular dynamics simulation web platform** where:

1. A user submits a molecular dynamics job from the frontend.
2. The job runs remotely using **Modal**.
3. The user is redirected to a **results page** after submission.
4. A **WebSocket connection** provides live updates about the simulation.
5. The frontend visualizes the **trajectory frames and analysis in real time**.

Your goal is to **modify the existing implementation to exactly match the following design vision.**

Do not deviate from the design.

Do not introduce alternative architectures unless explicitly approved.

---

# Required System Behavior

## Job Submission and Navigation

1. The user submits a simulation job from the frontend.
2. Immediately after submission, the user is redirected to the **results page**.
3. The results page layout and UI structure must match the structure provided in the reference image.
4. The simulation job runs in **Modal**.
5. The frontend establishes a **WebSocket connection** to receive status and simulation data.

---

# Simulation Execution Behavior

The simulation proceeds in the following phases:

1. Initialization
2. Equilibration
3. Production

The WebSocket connection must remain active **from job start until the production run begins** to stream live job status.

---

# Trajectory Storage Behavior

In the backend:

* Both **equilibration** and **production** trajectories are written to trajectory files.
* Snapshots are saved **every 10 picoseconds**.

---

# Frame Streaming Logic

The frontend must **display at most 100 frames** at any given time.

The backend must automatically calculate the **required snapshot interval** before sending frames.

### Frame Selection Rules

If total trajectory frames ≤ 100:

* Send **all frames**

If total trajectory frames > 100:

* Automatically calculate an interval so that **no more than 100 frames are streamed**

This calculation must be automatic.

---

# Snapshot Transmission Requirements

When a frame snapshot is sent:

The backend must transmit:

1. **Atomic coordinates for that frame**
2. Full system structure including:

   * Protein
   * Ligand
   * Ions
   * Water

The snapshot must represent **the exact structure at that specific frame**.

---

# Frontend Rendering Requirements

The frontend must:

1. Receive the snapshot
2. Decode the snapshot
3. Render the structure in the viewer

The rendering must include:

* Protein
* Ligand
* Ions
* Water

---

# Frame Update Behavior

When a new frame arrives:

The viewer must **NOT perform a raw refresh**.

Instead:

* Atom coordinates must transition **smoothly from previous positions to new positions**
* The transition must visually interpolate atom positions to provide a **smooth animation**

This is required for a high-quality user experience.

---

# Parallel Analysis Requirements

While the simulation runs, the backend must compute the following analyses **in parallel** with maximum performance.

The analyses must be calculated **in the following order**:

1. Protein backbone RMSD
2. Ligand all-atom RMSD
3. Residue-level RMSF
4. System energy including

   * Potential energy
   * Kinetic energy
   * Total energy
5. Radius of gyration
6. DSSP

---

# Data Transmission Format

Each snapshot transmission must include:

* Frame coordinates
* All analysis datapoints

The data must be:

* Bundled together
* Encoded as **Float32Array**
* Compressed before transmission

The objective is to:

* Reduce WebSocket bandwidth
* Minimize latency
* Maintain high throughput

---

# Backend Performance Requirements

Heavy computational tasks must be executed **in the backend** to reduce frontend load.

Specifically:

* All analysis calculations
* Frame sampling
* Data bundling
* Compression

This design minimizes WebSocket traffic and improves frontend responsiveness.

---

# Frontend Data Storage

The frontend continuously receives:

* Trajectory frames
* Analysis datapoints

These must be temporarily stored in the browser as:

* **Float32Array caches**

Since the maximum data stored at any time corresponds to **100 frames**, the browser should be able to handle the memory load.

---

# Ring Buffer Fallback

When the system being simulated is very large:

The frontend must fall back to using a:

**Float32Array Typed Array Ring Buffer**

This ensures memory remains bounded while still maintaining performance.

---

# Frame Scrubbing Capability

The user must be able to:

* Instantly scrub through the timeline
* View the system state of any previous frame within the current session

This requires:

* Efficient frame caching
* Instant reconstruction of coordinates for any stored frame

---

# Edge Case Handling

The system must correctly handle the following scenarios.

### Fast Simulations

If the simulation produces frames faster than the frontend can update:

* The frontend must still render the **latest frame correctly**
* Intermediate frames may be skipped if required

### Weak Internet Connections

The system must handle:

* WebSocket instability
* Packet delays
* Temporary network interruptions

### WebSocket Disconnections

If the WebSocket disconnects:

* The frontend must attempt reconnection
* Data streaming must resume gracefully

---

# Post-Simulation Access

If a user:

* Refreshes the page
* Revisits the job long after simulation completion

The system must:

1. Re-establish a WebSocket connection
2. Stream trajectory frames from stored trajectory files
3. Stream analysis datapoints

All data must be transmitted as **Float32Array streams**.

---

# Unified Results Page

There must **NOT** be separate implementations for:

* Live trajectory visualization
* Completed simulation visualization

Both must use the **same streaming logic and page structure**.

---

# Performance Objectives

The entire system must prioritize:

* Maximum performance
* Minimal latency
* Efficient backend computation
* Efficient WebSocket transport
* Smooth frontend rendering
* Excellent UI/UX experience

The backend, WebSocket layer, and frontend must work **in harmony**.

---

# Logging Requirement

Logging is **not required**.

Any existing logging related to this workflow may be removed.

---

# Development Process Requirements

Before implementing changes:

1. Carefully analyze the current implementation in:

   * `md.py`
   * `results.$id.tsx`

2. Fully understand:

   * How trajectory data is currently generated
   * How the WebSocket communication works
   * How the frontend viewer renders structures
   * How Modal is used

---

# Mandatory Clarification Step

Before writing any code:

You must ask **clarifying questions** to fully understand the combined objective.

Do not assume missing details.

---

# Implementation Planning Requirement

After reviewing the code and asking questions:
START IMPLEMENTATION
Hence finally the workflow from pdb to analysis must work

